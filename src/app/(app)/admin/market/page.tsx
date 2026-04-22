import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function MarketAdminPage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.market");

  const [byState, byUse, priceStats] = await Promise.all([
    prisma.propertyAddress.groupBy({
      by: ["state"], where: { isPrimary: true, property: { organizationId: ctx.organization.id } },
      _count: { _all: true },
    }),
    prisma.property.groupBy({
      by: ["propertyUse"], where: { organizationId: ctx.organization.id },
      _count: { _all: true },
    }),
    prisma.property.aggregate({
      where: { organizationId: ctx.organization.id, priceAmount: { not: null } },
      _avg: { priceAmount: true },
      _min: { priceAmount: true },
      _max: { priceAmount: true },
      _count: { priceAmount: true },
    }),
  ]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Mercado agregado</h1>
        <p className="text-sm text-slate-500">
          Vista preliminar. Los datos nacionales agregados consolidados entre organizaciones llegan en Fase 2.
        </p>
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Propiedades con precio" value={formatNumber(priceStats._count.priceAmount)} />
        <Stat label="Precio promedio" value={formatCurrency(priceStats._avg.priceAmount)} />
        <Stat label="Mínimo"  value={formatCurrency(priceStats._min.priceAmount)} />
        <Stat label="Máximo"  value={formatCurrency(priceStats._max.priceAmount)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Por estado</h3>
          <ul className="divide-y divide-slate-100">
            {byState.map((s) => (
              <li key={s.state ?? "—"} className="flex justify-between py-2 text-sm">
                <span>{s.state ?? "(sin estado)"}</span><span>{s._count._all}</span>
              </li>
            ))}
            {byState.length === 0 && <li className="py-4 text-sm text-slate-500">Sin datos aún.</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Por giro</h3>
          <ul className="divide-y divide-slate-100">
            {byUse.map((u) => (
              <li key={u.propertyUse ?? "—"} className="flex justify-between py-2 text-sm">
                <span className="capitalize">{u.propertyUse ?? "(sin giro)"}</span><span>{u._count._all}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}
