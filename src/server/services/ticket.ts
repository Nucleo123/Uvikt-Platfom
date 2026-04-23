import { prisma } from "@/lib/db";
export { ACQUISITION_STAGES, type AcquisitionStage } from "@/lib/stages";

/**
 * Allocate the next ticket number for an organization.
 * Format: UVK-0001, UVK-0002, ... (zero-padded to 4 digits)
 * Uses an upsert + atomic increment to avoid races.
 */
export async function allocateTicketNumber(organizationId: string): Promise<string> {
  const row = await prisma.organizationCounter.upsert({
    where: { organizationId },
    create: { organizationId, lastTicketNum: 1 },
    update: { lastTicketNum: { increment: 1 } },
  });
  const n = row.lastTicketNum;
  return `UVK-${n.toString().padStart(4, "0")}`;
}
