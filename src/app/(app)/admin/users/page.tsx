import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function UsersAdminPage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");

  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-slate-500">{memberships.length} miembros en {ctx.organization.name}</p>
      </header>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Alta</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {memberships.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">{m.user.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.user.email}</td>
                <td className="px-4 py-3"><span className="badge-info capitalize">{m.role}</span></td>
                <td className="px-4 py-3 text-slate-500">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">Invitaciones y gestión SCIM se agregan en Fase 2.</p>
    </div>
  );
}
