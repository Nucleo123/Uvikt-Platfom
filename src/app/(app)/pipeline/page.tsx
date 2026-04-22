import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

const STAGES = [
  { key: "prospect",    label: "Prospecto" },
  { key: "reviewing",   label: "En análisis" },
  { key: "negotiating", label: "En negociación" },
  { key: "closed",      label: "Cerrado" },
  { key: "archived",    label: "Archivado" },
];

export default async function PipelinePage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "pipeline.manage");

  const entries = await prisma.investorPipelineEntry.findMany({
    where: { property: { organizationId: ctx.organization.id } },
    include: { property: { include: { addresses: { where: { isPrimary: true }, take: 1 } } } },
  });

  const byStage = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byStage.get(e.stage) ?? [];
    list.push(e);
    byStage.set(e.stage, list);
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Pipeline inversionista</h1>
        <p className="text-sm text-slate-500">Organiza tu portafolio por etapa. RTZ (área de influencia) configurable por propiedad.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        {STAGES.map((s) => {
          const list = byStage.get(s.key) ?? [];
          return (
            <div key={s.key} className="rounded-xl bg-white p-3 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
                <span className="badge-muted">{list.length}</span>
              </div>
              <ul className="space-y-2">
                {list.map((e) => (
                  <li key={e.id} className="rounded-lg border border-slate-200 p-2">
                    <Link className="text-sm font-medium hover:underline" href={`/properties/${e.propertyId}`}>
                      {e.property.addresses[0]?.line1 ?? e.propertyId}
                    </Link>
                    <div className="text-[11px] text-slate-500">{e.estimatedValue ? formatCurrency(e.estimatedValue) : ""} · RTZ {e.rtzRadiusMeters ?? 1000}m</div>
                  </li>
                ))}
                {list.length === 0 && <li className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Vacío</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
