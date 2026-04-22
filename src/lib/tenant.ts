import { prisma } from "./db";
import { parseRadii } from "./utils";

/**
 * Tenant-scoped DB helpers. Always pass through these instead of calling prisma
 * directly from API handlers — keeps organizationId enforcement centralized.
 */

export async function orgRadii(organizationId: string): Promise<number[]> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  return parseRadii(org?.demographicRadiiMeters ?? "500,1000,5000");
}

export async function assertOwnsProperty(organizationId: string, propertyId: string) {
  const p = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true },
  });
  if (!p) {
    const err = new Error("NOT_FOUND");
    (err as { status?: number }).status = 404;
    throw err;
  }
}
