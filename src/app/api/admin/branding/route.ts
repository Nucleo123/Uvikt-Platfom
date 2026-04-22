import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";

const schema = z.object({
  companyName: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  footerNote: z.string().nullable().optional(),
  demographicRadiiMeters: z.string().regex(/^\d+(,\d+)*$/).optional(),
});

function normalizeColor(c?: string) { return c ? (c.startsWith("#") ? c : `#${c}`) : undefined; }

export async function PATCH(req: Request) {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.branding");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { demographicRadiiMeters, ...brandingData } = parsed.data;

  await prisma.brandingProfile.upsert({
    where: { organizationId: ctx.organization.id },
    create: {
      organizationId: ctx.organization.id,
      companyName: brandingData.companyName ?? ctx.organization.name,
      primaryColor: normalizeColor(brandingData.primaryColor) ?? "#0E2A35",
      accentColor: normalizeColor(brandingData.accentColor) ?? "#E4B43C",
      logoUrl: brandingData.logoUrl ?? null,
      contactEmail: brandingData.contactEmail ?? null,
      contactPhone: brandingData.contactPhone ?? null,
      footerNote: brandingData.footerNote ?? null,
    },
    update: {
      companyName: brandingData.companyName,
      primaryColor: normalizeColor(brandingData.primaryColor),
      accentColor: normalizeColor(brandingData.accentColor),
      logoUrl: brandingData.logoUrl,
      contactEmail: brandingData.contactEmail,
      contactPhone: brandingData.contactPhone,
      footerNote: brandingData.footerNote,
    },
  });

  if (demographicRadiiMeters) {
    await prisma.organization.update({
      where: { id: ctx.organization.id },
      data: { demographicRadiiMeters },
    });
  }

  return NextResponse.json({ ok: true });
}
