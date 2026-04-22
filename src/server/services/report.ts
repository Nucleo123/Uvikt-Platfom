import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { logAudit } from "./audit";

export type ReportSnapshot = {
  property: {
    id: string;
    title?: string | null;
    description?: string | null;
    transactionType: string;
    priceAmount?: number | null;
    priceCurrency?: string | null;
    surfaceM2?: number | null;
    frontageM?: number | null;
    depthM?: number | null;
    propertyUse?: string | null;
    isCorner: boolean;
    levels?: number | null;
    localUnits?: number | null;
    notableBrands?: string | null;
    landUse?: string | null;
    seduviFichaUrl?: string | null;
    kmzUrl?: string | null;
    polygonGeoJson?: string | null;
  };
  address: {
    line1: string;
    line2?: string | null;
    neighborhood?: string | null;
    municipality?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
  location: { lat: number; lng: number } | null;
  heroPhotoUrl: string | null;
  branding: {
    companyName?: string | null;
    logoUrl?: string | null;
    primaryColor: string;
    accentColor: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    footerNote?: string | null;
  };
  demographics: Array<{
    radiusMeters: number;
    population?: number | null;
    households?: number | null;
    avgAge?: number | null;
    avgHouseholdIncome?: number | null;
    abc1Pct?: number | null;
    c2Pct?: number | null;
    cPct?: number | null;
    dPct?: number | null;
    ePct?: number | null;
  }>;
  commercial: Array<{
    radiusMeters: number;
    byCategory: Record<string, { count: number; brands: string[] }>;
  }>;
  sectionsFilled: {
    address: boolean;
    photo: boolean;
    landUse: boolean;
    demographics: boolean;
    commercial: boolean;
    polygon: boolean;
  };
  generatedAt: string;
};

export async function buildSnapshot(propertyId: string): Promise<ReportSnapshot> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      organization: { include: { brandingProfile: true } },
      addresses: true,
      locations: true,
      media: true,
      demographics: true,
      commercialCtx: true,
    },
  });
  if (!property) throw new Error(`Property ${propertyId} not found`);

  const primaryAddr =
    property.addresses.find((a) => a.isPrimary) ??
    property.addresses.find((a) => a.source === "sepomex" && a.validated) ??
    property.addresses[0] ?? null;

  const loc =
    property.locations.find((l) => l.kind === "corrected") ??
    property.locations.find((l) => l.kind === "original") ??
    property.locations.find((l) => l.kind === "geocoded") ?? null;

  const hero = property.media.find((m) => m.kind === "hero") ?? property.media[0] ?? null;

  const commercialByRadius = new Map<number, { radiusMeters: number; byCategory: Record<string, { count: number; brands: string[] }> }>();
  for (const c of property.commercialCtx) {
    const band = commercialByRadius.get(c.radiusMeters) ?? { radiusMeters: c.radiusMeters, byCategory: {} };
    band.byCategory[c.category] = {
      count: c.count,
      brands: (c.notableBrands ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    };
    commercialByRadius.set(c.radiusMeters, band);
  }

  const branding = property.organization.brandingProfile;

  return {
    property: {
      id: property.id,
      title: property.title,
      description: property.description,
      transactionType: property.transactionType,
      priceAmount: property.priceAmount,
      priceCurrency: property.priceCurrency,
      surfaceM2: property.surfaceM2,
      frontageM: property.frontageM,
      depthM: property.depthM,
      propertyUse: property.propertyUse,
      isCorner: property.isCorner,
      levels: property.levels,
      localUnits: property.localUnits,
      notableBrands: property.notableBrands,
      landUse: property.landUse,
      seduviFichaUrl: property.seduviFichaUrl,
      kmzUrl: property.kmzUrl,
      polygonGeoJson: property.polygonGeoJson,
    },
    address: primaryAddr
      ? {
          line1: primaryAddr.line1,
          line2: primaryAddr.line2,
          neighborhood: primaryAddr.neighborhood,
          municipality: primaryAddr.municipality,
          state: primaryAddr.state,
          postalCode: primaryAddr.postalCode,
        }
      : null,
    location: loc ? { lat: loc.lat, lng: loc.lng } : null,
    heroPhotoUrl: hero?.url ?? null,
    branding: {
      companyName: branding?.companyName ?? property.organization.name,
      logoUrl: branding?.logoUrl ?? null,
      primaryColor: branding?.primaryColor ?? "#0E2A35",
      accentColor: branding?.accentColor ?? "#E4B43C",
      contactEmail: branding?.contactEmail,
      contactPhone: branding?.contactPhone,
      footerNote: branding?.footerNote,
    },
    demographics: property.demographics.map((d) => ({
      radiusMeters: d.radiusMeters,
      population: d.population,
      households: d.households,
      avgAge: d.avgAge,
      avgHouseholdIncome: d.avgHouseholdIncome,
      abc1Pct: d.socioeconomicAbc1Pct,
      c2Pct: d.socioeconomicC2Pct,
      cPct: d.socioeconomicCPct,
      dPct: d.socioeconomicDPct,
      ePct: d.socioeconomicEPct,
    })).sort((a, b) => a.radiusMeters - b.radiusMeters),
    commercial: Array.from(commercialByRadius.values()).sort((a, b) => a.radiusMeters - b.radiusMeters),
    sectionsFilled: {
      address: !!primaryAddr,
      photo: !!hero,
      landUse: !!property.landUse,
      demographics: property.demographics.length > 0,
      commercial: property.commercialCtx.length > 0,
      polygon: !!property.polygonGeoJson,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function generateReport(opts: {
  organizationId: string;
  propertyId: string;
  createdById: string;
  allowPublic?: boolean;
  expiresInDays?: number;
}) {
  const snapshot = await buildSnapshot(opts.propertyId);
  const shareToken = nanoid(24);
  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const report = await prisma.generatedReport.create({
    data: {
      propertyId: opts.propertyId,
      shareToken,
      shareExpiresAt: expiresAt,
      publicAllowed: opts.allowPublic ?? true,
      snapshotJson: JSON.stringify(snapshot),
      createdById: opts.createdById,
    },
  });

  await prisma.property.update({
    where: { id: opts.propertyId },
    data: { status: "report_ready", reportReadyAt: new Date() },
  });

  await logAudit({
    organizationId: opts.organizationId,
    actorId: opts.createdById,
    action: "report.generate",
    targetType: "report",
    targetId: report.id,
  });

  return report;
}
