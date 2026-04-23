import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import InviteForm from "@/components/InviteForm";
import LinkCopyButton from "@/components/LinkCopyButton";

export default async function UsersAdminPage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");

  const [memberships, invitations] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId: ctx.organization.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: ctx.organization.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-slate-500">{memberships.length} miembros · {invitations.length} invitaciones pendientes</p>
      </header>

      <div className="mb-6">
        <InviteForm />
      </div>

      {invitations.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Invitaciones pendientes</h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Expira</th><th className="px-4 py-3">Link</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">{i.email}</td>
                    <td className="px-4 py-3"><span className="badge-info capitalize">{i.role}</span></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(i.expiresAt)}</td>
                    <td className="px-4 py-3"><LinkCopyButton token={i.token} id={i.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Miembros activos</h2>
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
      </section>
    </div>
  );
}
