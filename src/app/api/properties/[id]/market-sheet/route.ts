import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/tenant";
import { inegiConnector, commercialConnector } from "@/server/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate a "Ficha de mercado" (Etapa 2) on demand for a given property and radius.
 * Crosses INEGI demographics + real OSM commercial context + stored SEDUVI land-use info.
 * Returns everything the one-pager view needs to render.
 */
const schema = z.object({
  radiusMeters: z.number().int().min(100).max(10000).default(1000),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  await assertOwnsProperty(ctx.organization.id, params.id);

  const url = new URL(req.url);
  const radiusMeters = parseInt(url.searchParams.get("radius") ?? "1000", 10);
  const parsed = schema.safeParse({ radiusMeters });
  if (!parsed.success) return NextResponse.json({ error: "Invalid radius" }, { status: 400 });
  const radius = parsed.data.radiusMeters;

  const p = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      addresses: true, locations: true, media: true, documents: true,
      organization: { include: { brandingProfile: true } },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const loc = p.locations.find((l) => l.kind === "corrected")
    ?? p.locations.find((l) => l.kind === "original")
    ?? p.locations[0];
  if (!loc) return NextResponse.json({ error: "Property has no coordinates" }, { status: 400 });

  const primaryAddr = p.addresses.find((a) => a.isPrimary) ?? p.addresses[0];

  // Fetch demographics + commercial in parallel
  const [demo, commercial] = await Promise.all([
    inegiConnector.fetchDemographics({ lat: loc.lat, lng: loc.lng }, [radius]),
    commercialConnector.fetchCommercialContext({ lat: loc.lat, lng: loc.lng }, [radius]),
  ]);

  // Extract municipality metadata from INEGI raw payload for display
  const inegiMatch = (demo.raw as { match?: { nomMunicipio?: string; nomEstado?: string; cveGeo?: string }; municipio?: { pob?: number; areaKm2?: number; densidadHabKm2?: number }; method?: string } | undefined);

  return NextResponse.json({
    propertyId: p.id,
    ticketNumber: p.ticketNumber,
    title: p.title,
    address: primaryAddr ? {
      line1: primaryAddr.line1,
      neighborhood: primaryAddr.neighborhood,
      municipality: primaryAddr.municipality,
      state: primaryAddr.state,
      postalCode: primaryAddr.postalCode,
    } : null,
    location: { lat: loc.lat, lng: loc.lng },
    polygonGeoJson: p.polygonGeoJson,
    landUse: p.landUse,
    seduviFichaUrl: p.seduviFichaUrl,
    propertyType: p.propertyType,
    surfaceM2: p.surfaceM2,
    priceAmount: p.priceAmount,
    priceCurrency: p.priceCurrency,
    radiusMeters: radius,
    demographics: demo.normalized.bands[0] ?? null,
    commercial: commercial.normalized.bands[0] ?? null,
    sources: {
      inegi: {
        status: demo.status,
        confidence: demo.confidence,
        error: demo.error,
        municipality: inegiMatch?.match?.nomMunicipio,
        state: inegiMatch?.match?.nomEstado,
        municipioPopulation: inegiMatch?.municipio?.pob,
        municipioAreaKm2: inegiMatch?.municipio?.areaKm2,
        densityHabKm2: inegiMatch?.municipio?.densidadHabKm2,
        method: inegiMatch?.method ?? "fallback",
      },
      commercial: {
        status: commercial.status,
        confidence: commercial.confidence,
        error: commercial.error,
        provider: (commercial.raw as { provider?: string } | undefined)?.provider,
      },
    },
    branding: {
      companyName: p.organization.brandingProfile?.companyName ?? p.organization.name,
      logoUrl: p.organization.brandingProfile?.logoUrl ?? null,
      primaryColor: p.organization.brandingProfile?.primaryColor ?? "#0E2A35",
      accentColor: p.organization.brandingProfile?.accentColor ?? "#E4B43C",
    },
    photoUrl: p.media.find((m) => m.kind === "hero")?.url ?? null,
    generatedAt: new Date().toISOString(),
  });
}
