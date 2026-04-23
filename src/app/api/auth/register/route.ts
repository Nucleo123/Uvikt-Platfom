import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1),
  role: z.enum(["admin", "broker", "investor"]).default("admin"),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "register"), { limit: 5, windowMs: 60 * 60_000 }); // 5/hour per IP
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiados registros. Intenta más tarde." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);

  // Create org + branding + user + membership in a single transaction.
  let slug = slugify(parsed.data.organizationName) || `org-${Date.now()}`;
  const slugTaken = await prisma.organization.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;

  const { user, org } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: parsed.data.organizationName,
        slug,
        brandingProfile: {
          create: { companyName: parsed.data.organizationName, primaryColor: "#0E2A35", accentColor: "#E4B43C" },
        },
      },
    });
    const user = await tx.user.create({
      data: { email, passwordHash, name: parsed.data.name },
    });
    await tx.organizationMembership.create({
      data: { userId: user.id, organizationId: org.id, role: parsed.data.role },
    });
    return { user, org };
  });

  const session = await getSession();
  session.userId = user.id;
  session.activeOrgId = org.id;
  await session.save();

  return NextResponse.json({ ok: true, userId: user.id, organizationId: org.id });
}
