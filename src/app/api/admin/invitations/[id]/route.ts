import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");
  await prisma.invitation.deleteMany({
    where: { id: params.id, organizationId: ctx.organization.id },
  });
  return NextResponse.json({ ok: true });
}
