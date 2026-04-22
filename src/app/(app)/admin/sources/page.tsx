import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";

const SOURCES = [
  { key: "sepomex",    name: "SEPOMEX",    desc: "Validación de domicilio y CP." },
  { key: "seduvi",     name: "SEDUVI",     desc: "Uso de suelo, polígono catastral, ficha PDF." },
  { key: "inegi",      name: "INEGI",      desc: "Datos sociodemográficos por radio." },
  { key: "commercial", name: "Comerciales", desc: "Bases comerciales, bancarias, automotrices." },
] as const;

export default async function SourcesAdminPage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.sources");

  const configs = await prisma.adminSourceConfig.findMany({ where: { organizationId: ctx.organization.id } });
  const byKey = new Map(configs.map((c) => [c.source, c]));

  // Aggregate recent job health
  const recent = await prisma.propertyEnrichmentJob.groupBy({
    by: ["source", "status"],
    _count: { _all: true },
    where: { property: { organizationId: ctx.organization.id } },
  });
  const health = new Map<string, { success: number; failed: number; total: number }>();
  for (const r of recent) {
    const h = health.get(r.source) ?? { success: 0, failed: 0, total: 0 };
    h.total += r._count._all;
    if (r.status === "success") h.success += r._count._all;
    if (r.status === "failed")  h.failed += r._count._all;
    health.set(r.source, h);
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Fuentes de datos</h1>
        <p className="text-sm text-slate-500">Estado de conectores y configuración de credenciales.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => {
          const cfg = byKey.get(s.key);
          const h = health.get(s.key) ?? { success: 0, failed: 0, total: 0 };
          return (
            <div key={s.key} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{s.name}</h3>
                  <p className="text-sm text-slate-500">{s.desc}</p>
                </div>
                <span className={cfg?.enabled !== false ? "badge-success" : "badge-muted"}>{cfg?.enabled !== false ? "activo" : "inactivo"}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="text-lg font-semibold">{h.total}</div><div className="text-slate-500">ejecuciones</div></div>
                <div><div className="text-lg font-semibold text-emerald-600">{h.success}</div><div className="text-slate-500">exitosas</div></div>
                <div><div className="text-lg font-semibold text-red-600">{h.failed}</div><div className="text-slate-500">fallidas</div></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Configurar credenciales vía variables de entorno: <code>{s.key.toUpperCase()}_API_URL</code> y <code>{s.key.toUpperCase()}_API_KEY</code>.
                Si no hay credenciales, se usa el conector stub con datos de desarrollo.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
