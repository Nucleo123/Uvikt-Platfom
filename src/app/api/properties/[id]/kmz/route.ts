import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/tenant";
import { buildKml } from "@/server/services/kmz";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  await assertOwnsProperty(ctx.organization.id, params.id);

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: { addresses: { where: { isPrimary: true }, take: 1 }, locations: true },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const loc =
    property.locations.find((l) => l.kind === "corrected") ??
    property.locations.find((l) => l.kind === "original") ??
    property.locations[0];
  if (!loc) return NextResponse.json({ error: "Property has no coordinates" }, { status: 400 });

  const kml = buildKml({
    title: property.title ?? property.addresses[0]?.line1 ?? "UVIKT Property",
    description: property.description ?? undefined,
    lat: loc.lat,
    lng: loc.lng,
    polygonGeoJson: property.polygonGeoJson,
  });

  return new NextResponse(kml, {
    headers: {
      "Content-Type": "application/vnd.google-earth.kml+xml",
      "Content-Disposition": `attachment; filename="uvikt-${property.id}.kml"`,
    },
  });
}
