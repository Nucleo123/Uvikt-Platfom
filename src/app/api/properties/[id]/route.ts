import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { assertOwnsProperty } from "@/lib/tenant";
import { correctPin } from "@/server/services/property";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.read");
  await assertOwnsProperty(ctx.organization.id, params.id);

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      addresses: true, locations: true, media: true, sourceRecords: true,
      enrichmentJobs: { orderBy: { scheduledAt: "desc" } },
      demographics: true, commercialCtx: true, documents: true,
      reports: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      tags: true,
    },
  });
  return NextResponse.json({ property });
}

const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priceAmount: z.number().nullable().optional(),
  priceCurrency: z.string().optional(),
  transactionType: z.enum(["sale", "rent"]).optional(),
  surfaceM2: z.number().nullable().optional(),
  frontageM: z.number().nullable().optional(),
  depthM: z.number().nullable().optional(),
  propertyUse: z.string().nullable().optional(),
  isCorner: z.boolean().optional(),
  levels: z.number().int().nullable().optional(),
  localUnits: z.number().int().nullable().optional(),
  notableBrands: z.string().nullable().optional(),
  pin: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.update");
  await assertOwnsProperty(ctx.organization.id, params.id);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { pin, ...rest } = parsed.data;
  if (pin) await correctPin(ctx.organization.id, params.id, pin.lat, pin.lng, ctx.user.id);

  const property = await prisma.property.update({ where: { id: params.id }, data: rest });
  return NextResponse.json({ property });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.delete");
  await assertOwnsProperty(ctx.organization.id, params.id);
  await prisma.property.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
