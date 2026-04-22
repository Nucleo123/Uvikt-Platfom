import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export type SessionData = {
  userId?: string;
  activeOrgId?: string;
};

const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET || "change-me-change-me-change-me-change-me",
  cookieName: "uvikt_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Resolve the current user + active organization + role.
 * Returns null when unauthenticated. Throws when session references stale ids.
 */
export async function getCurrentContext() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { memberships: { include: { organization: { include: { brandingProfile: true } } } } },
  });
  if (!user) return null;

  const membership =
    user.memberships.find((m) => m.organizationId === session.activeOrgId) ??
    user.memberships[0];
  if (!membership) return { user, membership: null, organization: null, role: null };

  // Auto-pin the active org if not set
  if (session.activeOrgId !== membership.organizationId) {
    session.activeOrgId = membership.organizationId;
    await session.save();
  }

  return {
    user,
    membership,
    organization: membership.organization,
    role: membership.role as "admin" | "broker" | "investor",
  };
}

export async function requireContext() {
  const ctx = await getCurrentContext();
  if (!ctx || !ctx.organization) {
    const err = new Error("UNAUTHENTICATED");
    (err as { status?: number }).status = 401;
    throw err;
  }
  return ctx as NonNullable<typeof ctx> & { organization: NonNullable<typeof ctx.organization> };
}
