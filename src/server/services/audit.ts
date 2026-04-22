import { prisma } from "@/lib/db";

export async function logAudit(params: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Audit logging must never break the request flow
    console.error("[audit] failed:", err);
  }
}
