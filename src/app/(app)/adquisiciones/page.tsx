import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ACQUISITION_STAGES } from "@/lib/stages";

export default async function AdquisicionesPage() {
  const ctx = await requireContext();

  const properties = await prisma.property.findMany({
    where: { organizationId: ctx.organization.id, transactionType: "acquisition" },
    include: { addresses: { where: { isPrimary: true }, take: 1 }, media: { where: { kind: "hero" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const byStage = new Map<string, typeof properties>();
  for (const p of properties) {
    const list = byStage.get(p.acquisitionStage) ?? [];
    list.push(p);
    byStage.set(p.acquisitionStage, list);
  }

  const total = properties.length;
  const valor = properties.reduce((sum, p) => sum + (p.priceAmount ?? 0), 0);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline de adquisiciones</h1>
          <p className="text-sm text-slate-500">{total} inmuebles · valor agregado {formatCurrency(valor)}</p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nuevo inmueble</Link>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        {ACQUISITION_STAGES.map((s) => {
          const list = byStage.get(s.key) ?? [];
          const sum = list.reduce((acc, p) => acc + (p.priceAmount ?? 0), 0);
          return (
            <div key={s.key} className="rounded-xl bg-white p-3 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: s.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.color }}>{s.label}</span>
                </div>
                <span className="text-xs text-slate-500">{list.length}</span>
              </div>
              <div className="mb-3 text-xs text-slate-500">{sum > 0 ? formatCurrency(sum) : "—"}</div>
              <ul className="space-y-2">
                {list.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-2 hover:border-slate-300">
                    <Link className="block text-sm font-medium hover:underline" href={`/properties/${p.id}`}>
                      {p.title ?? p.addresses[0]?.line1 ?? p.id}
                    </Link>
                    <div className="mt-1 flex items-baseline justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{p.ticketNumber ?? ""}</span>
                      <span>{p.priceAmount ? formatCurrency(p.priceAmount) : "—"}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{p.propertyType} · {formatDate(p.createdAt)}</div>
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
