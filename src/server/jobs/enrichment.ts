import { prisma } from "@/lib/db";
import { orgRadii } from "@/lib/tenant";
import {
  sepomexConnector,
  seduviConnector,
  inegiConnector,
  commercialConnector,
} from "@/server/connectors";
import type { ConnectorResult } from "@/server/connectors";
import { logAudit } from "@/server/services/audit";

type SourceName = "sepomex" | "seduvi" | "inegi" | "commercial";

/**
 * Run full enrichment for a property. Each source is attempted independently;
 * failures in one source do not block the others. Writes a PropertySourceRecord
 * for every attempt and updates per-source PropertyEnrichmentJob status.
 */
export async function enrichProperty(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      organization: true,
      addresses: { where: { isPrimary: true }, take: 1 },
      locations: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!property) throw new Error(`Property ${propertyId} not found`);

  const address = property.addresses[0];
  const location =
    property.locations.find((l) => l.kind === "corrected") ??
    property.locations.find((l) => l.kind === "original") ??
    property.locations.find((l) => l.kind === "geocoded");

  if (!location) throw new Error("No coordinates on property — cannot enrich");

  const radii = await orgRadii(property.organizationId);

  const runs: Array<[SourceName, () => Promise<ConnectorResult<unknown>>]> = [
    ["sepomex", () => sepomexConnector.validateAddress({
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? undefined,
      neighborhood: address?.neighborhood ?? undefined,
      municipality: address?.municipality ?? undefined,
      state: address?.state ?? undefined,
      postalCode: address?.postalCode ?? undefined,
      country: address?.country ?? "MX",
    })],
    ["seduvi", () => seduviConnector.fetchLandUseAndPolygon(
      { lat: location.lat, lng: location.lng },
      address ? {
        line1: address.line1,
        neighborhood: address.neighborhood ?? undefined,
        municipality: address.municipality ?? undefined,
        state: address.state ?? undefined,
        postalCode: address.postalCode ?? "",
        country: address.country,
      } : undefined,
    )],
    ["inegi", () => inegiConnector.fetchDemographics({ lat: location.lat, lng: location.lng }, radii)],
    ["commercial", () => commercialConnector.fetchCommercialContext({ lat: location.lat, lng: location.lng }, radii)],
  ];

  for (const [source, runner] of runs) {
    const job = await prisma.propertyEnrichmentJob.create({
      data: { propertyId, source, status: "running", startedAt: new Date(), attempt: 1 },
    });
    try {
      const result = await runner();
      await persistSourceResult(propertyId, source, result);
      await prisma.propertyEnrichmentJob.update({
        where: { id: job.id },
        data: { status: result.status === "failed" ? "failed" : result.status, finishedAt: new Date(), lastError: result.error ?? null },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.propertySourceRecord.create({
        data: { propertyId, source, status: "failed", errorMessage: msg },
      });
      await prisma.propertyEnrichmentJob.update({
        where: { id: job.id },
        data: { status: "failed", finishedAt: new Date(), lastError: msg },
      });
    }
  }

  // Promote property status if we have at least the validated address + land use summary
  const updated = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { sourceRecords: true },
  });
  const hasValidated = updated?.sourceRecords.some((r) => r.source === "sepomex" && (r.status === "success" || r.status === "partial"));
  const hasLandUse = updated?.sourceRecords.some((r) => r.source === "seduvi" && r.status !== "failed");
  const hasDemographics = updated?.sourceRecords.some((r) => r.source === "inegi" && r.status !== "failed");

  let status: string = property.status;
  if (hasValidated && hasLandUse && hasDemographics) status = "enriched";
  else if (hasValidated) status = "validated";

  await prisma.property.update({ where: { id: propertyId }, data: { status } });

  await logAudit({
    organizationId: property.organizationId,
    action: "property.enrich",
    targetType: "property",
    targetId: propertyId,
    metadata: { status },
  });
}

async function persistSourceResult(propertyId: string, source: SourceName, result: ConnectorResult<unknown>) {
  // Always store the raw record for auditability
  await prisma.propertySourceRecord.create({
    data: {
      propertyId,
      source,
      status: result.status,
      confidence: result.confidence,
      rawPayload: safe(result.raw),
      normalizedPayload: safe(result.normalized),
      errorMessage: result.error,
    },
  });

  // Materialize to typed tables where applicable
  if (source === "sepomex" && result.status !== "failed") {
    const n = result.normalized as { line1: string; line2?: string; neighborhood?: string; municipality?: string; state?: string; postalCode: string; country: string; };
    // Store alongside existing addresses; keep the user-entered one, add source-derived
    await prisma.propertyAddress.create({
      data: {
        propertyId,
        source: "sepomex",
        isPrimary: false,
        line1: n.line1,
        line2: n.line2,
        neighborhood: n.neighborhood,
        municipality: n.municipality,
        state: n.state,
        postalCode: n.postalCode,
        country: n.country,
        validated: result.status === "success",
        validatedAt: result.status === "success" ? new Date() : null,
        confidence: result.confidence,
      },
    });
  }

  if (source === "seduvi" && result.status !== "failed") {
    const n = result.normalized as { landUseCode?: string; polygonGeoJson?: string; fichaUrl?: string; sourceName?: string; surfaceM2?: number; frontageM?: number; depthM?: number; };
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        landUse: n.landUseCode,
        polygonGeoJson: n.polygonGeoJson,
        seduviFichaUrl: n.fichaUrl,
        // Only fill physical attrs if the broker hasn't filled them
        surfaceM2: await preferBrokerValue(propertyId, "surfaceM2", n.surfaceM2),
        frontageM: await preferBrokerValue(propertyId, "frontageM", n.frontageM),
        depthM: await preferBrokerValue(propertyId, "depthM", n.depthM),
      },
    });
    if (n.fichaUrl) {
      await prisma.propertyDocument.upsert({
        where: { id: `${propertyId}_seduvi_ficha` },
        create: { id: `${propertyId}_seduvi_ficha`, propertyId, kind: "seduvi_ficha", url: n.fichaUrl, label: "Ficha SEDUVI" },
        update: { url: n.fichaUrl },
      });
    }
  }

  if (source === "inegi" && result.status !== "failed") {
    const n = result.normalized as { bands: Array<{ radiusMeters: number; population?: number; households?: number; avgAge?: number; avgHouseholdIncome?: number; socioeconomic?: { abc1Pct?: number; c2Pct?: number; cPct?: number; dPct?: number; ePct?: number } }> };
    for (const b of n.bands) {
      await prisma.propertyDemographics.upsert({
        where: { propertyId_radiusMeters: { propertyId, radiusMeters: b.radiusMeters } },
        create: {
          propertyId,
          radiusMeters: b.radiusMeters,
          population: b.population,
          households: b.households,
          avgAge: b.avgAge,
          avgHouseholdIncome: b.avgHouseholdIncome,
          socioeconomicAbc1Pct: b.socioeconomic?.abc1Pct,
          socioeconomicC2Pct: b.socioeconomic?.c2Pct,
          socioeconomicCPct: b.socioeconomic?.cPct,
          socioeconomicDPct: b.socioeconomic?.dPct,
          socioeconomicEPct: b.socioeconomic?.ePct,
          payloadJson: JSON.stringify(b),
        },
        update: {
          population: b.population,
          households: b.households,
          avgAge: b.avgAge,
          avgHouseholdIncome: b.avgHouseholdIncome,
          socioeconomicAbc1Pct: b.socioeconomic?.abc1Pct,
          socioeconomicC2Pct: b.socioeconomic?.c2Pct,
          socioeconomicCPct: b.socioeconomic?.cPct,
          socioeconomicDPct: b.socioeconomic?.dPct,
          socioeconomicEPct: b.socioeconomic?.ePct,
          payloadJson: JSON.stringify(b),
        },
      });
    }
  }

  if (source === "commercial" && result.status !== "failed") {
    const n = result.normalized as { bands: Array<{ radiusMeters: number; byCategory: Record<string, { count: number; brands: string[] }> }> };
    for (const b of n.bands) {
      for (const [cat, info] of Object.entries(b.byCategory)) {
        await prisma.propertyCommercialContext.upsert({
          where: { propertyId_radiusMeters_category: { propertyId, radiusMeters: b.radiusMeters, category: cat } },
          create: {
            propertyId,
            radiusMeters: b.radiusMeters,
            category: cat,
            count: info.count,
            notableBrands: info.brands.join(", "),
            payloadJson: JSON.stringify(info),
          },
          update: {
            count: info.count,
            notableBrands: info.brands.join(", "),
            payloadJson: JSON.stringify(info),
          },
        });
      }
    }
  }
}

async function preferBrokerValue<K extends "surfaceM2" | "frontageM" | "depthM">(
  propertyId: string, field: K, sourceValue: number | undefined,
): Promise<number | null | undefined> {
  const current = await prisma.property.findUnique({ where: { id: propertyId }, select: { [field]: true } as Record<K, true> });
  const existing = current?.[field] as number | null | undefined;
  return existing ?? sourceValue ?? null;
}

function safe(v: unknown): string | null {
  try { return JSON.stringify(v); } catch { return null; }
}
