export type Role = "admin" | "broker" | "investor";

export const ROLES: Role[] = ["admin", "broker", "investor"];

type Action =
  | "property.read"
  | "property.create"
  | "property.update"
  | "property.delete"
  | "property.enrich"
  | "report.generate"
  | "report.share"
  | "pipeline.manage"
  | "admin.branding"
  | "admin.sources"
  | "admin.users"
  | "admin.market";

const MATRIX: Record<Role, Action[]> = {
  admin: [
    "property.read", "property.create", "property.update", "property.delete",
    "property.enrich", "report.generate", "report.share",
    "pipeline.manage",
    "admin.branding", "admin.sources", "admin.users", "admin.market",
  ],
  broker: [
    "property.read", "property.create", "property.update",
    "property.enrich", "report.generate", "report.share",
  ],
  investor: [
    "property.read", "property.create",
    "report.generate", "report.share",
    "pipeline.manage",
  ],
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}

export function assertCan(role: Role | null | undefined, action: Action) {
  if (!can(role, action)) {
    const err = new Error(`FORBIDDEN: ${action} requires a role with permission (current: ${role ?? "none"})`);
    (err as { status?: number }).status = 403;
    throw err;
  }
}
