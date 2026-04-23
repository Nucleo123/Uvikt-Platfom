import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/server/services/audit";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "broker", "investor"]),
  expiresInDays: z.number().int().min(1).max(90).default(14),
});

export async function GET() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ invitations });
}

export async function POST(req: Request) {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86400000);

  const inv = await prisma.invitation.create({
    data: {
      organizationId: ctx.organization.id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token,
      invitedById: ctx.user.id,
      expiresAt,
    },
  });

  await logAudit({
    organizationId: ctx.organization.id, actorId: ctx.user.id,
    action: "invitation.create", targetType: "invitation", targetId: inv.id,
    metadata: { email: inv.email, role: inv.role },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json({
    invitation: inv,
    inviteUrl: `${base}/join/${token}`,
  }, { status: 201 });
}
