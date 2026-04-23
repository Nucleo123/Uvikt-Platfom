import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { assertOwnsProperty } from "@/lib/tenant";
import { changeAcquisitionStage } from "@/server/services/property";

const schema = z.object({
  stage: z.enum(["analyzing", "authorized", "canceled", "signing", "signed"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.update");
  await assertOwnsProperty(ctx.organization.id, params.id);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  await changeAcquisitionStage(ctx.organization.id, params.id, parsed.data.stage, ctx.user.id);
  return NextResponse.json({ ok: true });
}
