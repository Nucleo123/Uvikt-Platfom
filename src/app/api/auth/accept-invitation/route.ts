import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).optional(),  // required for new users only
  name: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const inv = await prisma.invitation.findUnique({ where: { token: parsed.data.token } });
  if (!inv) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  if (inv.acceptedAt) return NextResponse.json({ error: "Ya fue aceptada" }, { status: 410 });
  if (inv.expiresAt < new Date()) return NextResponse.json({ error: "Expirada" }, { status: 410 });

  const email = inv.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!parsed.data.password) return NextResponse.json({ error: "Se requiere contraseña para usuario nuevo" }, { status: 400 });
    const passwordHash = await hashPassword(parsed.data.password);
    user = await prisma.user.create({ data: { email, passwordHash, name: parsed.data.name ?? email.split("@")[0] } });
  } else if (parsed.data.password) {
    // Returning user — verify password
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: inv.organizationId } },
    create: { userId: user.id, organizationId: inv.organizationId, role: inv.role },
    update: { role: inv.role },
  });

  await prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });

  const session = await getSession();
  session.userId = user.id;
  session.activeOrgId = inv.organizationId;
  await session.save();

  return NextResponse.json({ ok: true, userId: user.id, organizationId: inv.organizationId });
}
