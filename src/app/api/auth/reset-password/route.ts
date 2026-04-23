import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });
  if (!reset) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  if (reset.usedAt) return NextResponse.json({ error: "Token ya utilizado" }, { status: 410 });
  if (reset.expiresAt < new Date()) return NextResponse.json({ error: "Token expirado" }, { status: 410 });

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    // Invalidate all other live tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: reset.userId, id: { not: reset.id }, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  // Auto-login
  const membership = await prisma.organizationMembership.findFirst({ where: { userId: reset.userId }, orderBy: { createdAt: "asc" } });
  const session = await getSession();
  session.userId = reset.userId;
  session.activeOrgId = membership?.organizationId;
  await session.save();

  return NextResponse.json({ ok: true });
}
