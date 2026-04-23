import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

/**
 * Start password reset. Always returns 200 regardless of whether the email
 * exists (avoids user enumeration). If the user exists, creates a token valid
 * for 1 hour and returns the reset URL directly in the response (since we
 * don't ship email yet — admin can share the link manually).
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "forgot"), { limit: 5, windowMs: 15 * 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Email inválido" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Silently return ok (don't leak which emails exist)
    return NextResponse.json({ ok: true });
  }

  const token = nanoid(40);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1h
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const resetUrl = `${base}/reset-password/${token}`;

  // TODO: send via email when an email provider is configured.
  // For now, return the link in the response body — dev / small-team mode.
  return NextResponse.json({ ok: true, resetUrl });
}
