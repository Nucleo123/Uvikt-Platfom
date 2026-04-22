import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { assertOwnsProperty } from "@/lib/tenant";
import { generateReport } from "@/server/services/report";

const schema = z.object({
  allowPublic: z.boolean().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "report.generate");
  await assertOwnsProperty(ctx.organization.id, params.id);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const report = await generateReport({
    organizationId: ctx.organization.id,
    propertyId: params.id,
    createdById: ctx.user.id,
    allowPublic: parsed.data.allowPublic ?? true,
    expiresInDays: parsed.data.expiresInDays,
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    report,
    shareUrl: `${base}/r/${report.shareToken}`,
    pdfUrl: `${base}/r/${report.shareToken}/pdf`,
  });
}
