import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/tenant";
import { inegiConnector, commercialConnector } from "@/server/connectors";
import { logAudit } from "@/server/services/audit";

export const runtime = "nodejs";

/**
 * Freeze a Ficha de Mercado snapshot at the requested radius and return a
 * tokenized public URL. Unlike the live /api/.../market-sheet endpoint
 * (auth-required), the shared snapshot can be opened by anyone with the link.
 */
const schema = z.object({
  radiusMeters: z.number().int().min(100).max(10000).default(1000),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  await assertOwnsProperty(ctx.organization.id, params.id);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { radiusMeters, expiresInDays } = parsed.data;

  const p = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      addresses: true, locations: true, media: true,
      organization: { include: { brandingProfile: true } },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const loc = p.locations.find((l) => l.kind === "corrected") ?? p.locations.find((l) => l.kind === "original") ?? p.locations[0];
  if (!loc) return NextResponse.json({ error: "Property has no coordinates" }, { status: 400 });
  const primaryAddr = p.addresses.find((a) => a.isPrimary) ?? p.addresses[0];

  const [demo, commercial] = await Promise.all([
    inegiConnector.fetchDemographics({ lat: loc.lat, lng: loc.lng }, [radiusMeters]),
    commercialConnector.fetchCommercialContext({ lat: loc.lat, lng: loc.lng }, [radiusMeters]),
  ]);

  const inegiMatch = (demo.raw as { match?: { nomMunicipio?: string; nomEstado?: string }; municipio?: { pob?: number; areaKm2?: number; densidadHabKm2?: number } } | undefined);

  const snapshot = {
    propertyId: p.id,
    ticketNumber: p.ticketNumber,
    title: p.title,
    address: primaryAddr ? {
      line1: primaryAddr.line1, neighborhood: primaryAddr.neighborhood,
      municipality: primaryAddr.municipality, state: primaryAddr.state, postalCode: primaryAddr.postalCode,
    } : null,
    location: { lat: loc.lat, lng: loc.lng },
    polygonGeoJson: p.polygonGeoJson,
    landUse: p.landUse,
    seduviFichaUrl: p.seduviFichaUrl,
    propertyType: p.propertyType,
    surfaceM2: p.surfaceM2,
    priceAmount: p.priceAmount,
    priceCurrency: p.priceCurrency,
    radiusMeters,
    demographics: demo.normalized.bands[0] ?? null,
    commercial: commercial.normalized.bands[0] ?? null,
    sources: {
      inegi: {
        status: demo.status, confidence: demo.confidence,
        municipality: inegiMatch?.match?.nomMunicipio, state: inegiMatch?.match?.nomEstado,
        municipioPopulation: inegiMatch?.municipio?.pob, municipioAreaKm2: inegiMatch?.municipio?.areaKm2,
        densityHabKm2: inegiMatch?.municipio?.densidadHabKm2,
      },
      commercial: { status: commercial.status, provider: (commercial.raw as { provider?: string } | undefined)?.provider },
    },
    branding: {
      companyName: p.organization.brandingProfile?.companyName ?? p.organization.name,
      logoUrl: p.organization.brandingProfile?.logoUrl ?? null,
      primaryColor: p.organization.brandingProfile?.primaryColor ?? "#0E2A35",
      accentColor: p.organization.brandingProfile?.accentColor ?? "#E4B43C",
      contactEmail: p.organization.brandingProfile?.contactEmail ?? null,
      contactPhone: p.organization.brandingProfile?.contactPhone ?? null,
    },
    photoUrl: p.media.find((m) => m.kind === "hero")?.url ?? null,
    generatedAt: new Date().toISOString(),
  };

  const shareToken = nanoid(24);
  const share = await prisma.marketSheetShare.create({
    data: {
      propertyId: p.id,
      organizationId: ctx.organization.id,
      shareToken,
      radiusMeters,
      shareExpiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
      snapshotJson: JSON.stringify(snapshot),
      createdById: ctx.user.id,
    },
  });

  await logAudit({
    organizationId: ctx.organization.id,
    actorId: ctx.user.id,
    action: "market_sheet.share",
    targetType: "property",
    targetId: p.id,
    metadata: { radiusMeters, shareToken },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json({
    shareId: share.id,
    shareToken,
    shareUrl: `${base}/m/${shareToken}`,
    pdfUrl: `${base}/m/${shareToken}/pdf`,
    expiresAt: share.shareExpiresAt,
  });
}
