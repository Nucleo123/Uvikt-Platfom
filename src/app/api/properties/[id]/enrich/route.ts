import { NextResponse } from "next/server";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { assertOwnsProperty } from "@/lib/tenant";
import { enqueue } from "@/server/jobs/queue";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "property.enrich");
  await assertOwnsProperty(ctx.organization.id, params.id);

  await enqueue("enrich_property", { propertyId: params.id });
  return NextResponse.json({ ok: true, enqueued: true });
}
