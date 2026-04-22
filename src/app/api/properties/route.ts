import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { createProperty } from "@/server/services/property";

const createSchema = z.object({
  inputMethod: z.enum(["mobile_photo", "desktop_address"]),
  transactionType: z.enum(["sale", "rent"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priceAmount: z.number().optional(),
  priceCurrency: z.string().optional(),
  surfaceM2: z.number().optional(),
  frontageM: z.number().optional(),
  depthM: z.number().optional(),
  propertyUse: z.string().optional(),
  isCorner: z.boolean().optional(),
  levels: z.number().int().optional(),
  localUnits: z.number().int().optional(),
  notableBrands: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    neighborhood: z.string().optional(),
    municipality: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  location: z.object({
    lat: z.number(), lng: z.number(),
    accuracyMeters: z.number().optional(),
    source: z.string(),
    kind: z.enum(["original", "corrected", "geocoded"]).optional(),
  }).optional(),
  photoUrl: z.string().url().optional(),
  photoStorageKey: z.string().optional(),
});

export async function GET(req: Request) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.read");

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.toLowerCase();
  const status = url.searchParams.get("status") ?? undefined;
  const transactionType = url.searchParams.get("transactionType") ?? undefined;

  const properties = await prisma.property.findMany({
    where: {
      organizationId: ctx.organization.id,
      status: status || undefined,
      transactionType: transactionType || undefined,
      OR: q ? [
        { title: { contains: q } },
        { description: { contains: q } },
        { addresses: { some: { line1: { contains: q } } } },
      ] : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      addresses: { where: { isPrimary: true }, take: 1 },
      locations: { take: 1, orderBy: { createdAt: "desc" } },
      media: { where: { kind: "hero" }, take: 1 },
    },
    take: 200,
  });

  return NextResponse.json({ properties });
}

export async function POST(req: Request) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.create");

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const property = await createProperty({
    organizationId: ctx.organization.id,
    createdById: ctx.user.id,
    ...parsed.data,
  });

  return NextResponse.json({ property }, { status: 201 });
}
