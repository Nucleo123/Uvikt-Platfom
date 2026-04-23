import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { safeJSONParse } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "property.create":       "Propiedad creada",
  "property.update":       "Propiedad editada",
  "property.enrich":       "Enriquecimiento ejecutado",
  "property.pin_corrected":"Pin corregido",
  "property.stage_change": "Etapa cambiada",
  "report.generate":       "Reporte generado",
  "market_sheet.share":    "Ficha de mercado compartida",
  "invitation.create":     "Invitación enviada",
};

export default async function AuditLogPage({ searchParams }: { searchParams: { action?: string; actor?: string } }) {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.users");

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: ctx.organization.id,
      action: searchParams.action || undefined,
      actorId: searchParams.actor || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true },
  });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Registro de actividad</h1>
        <p className="text-sm text-slate-500">Últimas {logs.length} acciones en tu organización</p>
      </header>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Acción</label>
          <select name="action" defaultValue={searchParams.action ?? ""} className="input w-64">
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Objetivo</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Sin registros aún.</td></tr>}
            {logs.map((l) => {
              const meta = safeJSONParse<Record<string, unknown>>(l.metadataJson, {});
              return (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(l.createdAt)} <span className="text-slate-400">{new Date(l.createdAt).toLocaleTimeString("es-MX")}</span></td>
                  <td className="px-4 py-3">{l.actor?.name ?? l.actor?.email ?? "—"}</td>
                  <td className="px-4 py-3"><span className="badge-info">{ACTION_LABELS[l.action] ?? l.action}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.targetType}/{l.targetId ? l.targetId.slice(0, 8) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {Object.entries(meta).slice(0, 4).map(([k, v]) => (
                      <div key={k}><b>{k}:</b> {typeof v === "string" ? v : JSON.stringify(v)}</div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
