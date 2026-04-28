import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ACQUISITION_STAGES } from "@/lib/stages";
import OnboardingTour from "@/components/OnboardingTour";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const [total, byStage, recent, totalValue] = await Promise.all([
    prisma.property.count({ where: { organizationId: ctx.organization.id } }),
    prisma.property.groupBy({
      by: ["acquisitionStage"],
      _count: { _all: true },
      _sum: { priceAmount: true },
      where: { organizationId: ctx.organization.id },
    }),
    prisma.property.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { addresses: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.property.aggregate({
      where: { organizationId: ctx.organization.id },
      _sum: { priceAmount: true },
    }),
  ]);

  const stageMap = Object.fromEntries(byStage.map((s) => [s.acquisitionStage, { count: s._count._all, sum: s._sum.priceAmount ?? 0 }]));

  return (
    <div className="p-8">
      <OnboardingTour userName={ctx.user.name ?? ctx.user.email} />
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen de adquisiciones</p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nuevo inmueble</Link>
      </header>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Inmuebles totales" value={total} />
        <Stat label="Analizando" value={stageMap["analyzing"]?.count ?? 0} />
        <Stat label="Firmados" value={stageMap["signed"]?.count ?? 0} />
        <Stat label="Valor agregado" value={formatCurrency(totalValue._sum.priceAmount ?? 0)} />
      </div>

      <div className="mb-6 grid gap-2 md:grid-cols-5">
        {ACQUISITION_STAGES.map((s) => {
          const info = stageMap[s.key] ?? { count: 0, sum: 0 };
          return (
            <Link key={s.key} href={`/properties?stage=${s.key}`} className="rounded-xl p-4 text-sm transition hover:shadow-card" style={{ background: s.bg }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: s.color }}>{info.count}</div>
              <div className="text-[11px]" style={{ color: s.color, opacity: 0.8 }}>{info.sum > 0 ? formatCurrency(info.sum) : ""}</div>
            </Link>
          );
        })}
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Actividad reciente</h2>
        <ul className="divide-y divide-slate-100">
          {recent.length === 0 && <li className="py-6 text-sm text-slate-500">Aún no tienes inmuebles. <Link href="/properties/new" className="underline">Carga el primero</Link>.</li>}
          {recent.map((p) => {
            const stage = ACQUISITION_STAGES.find((s) => s.key === p.acquisitionStage) ?? ACQUISITION_STAGES[0];
            return (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    {p.ticketNumber && <span className="font-mono text-[11px] text-slate-500">{p.ticketNumber}</span>}
                    <Link href={`/properties/${p.id}`} className="font-medium hover:underline">{p.title ?? p.addresses[0]?.line1 ?? "(sin dirección)"}</Link>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(p.createdAt)} · {p.propertyType ?? "—"} · <span style={{ color: stage.color }}>{stage.label}</span></div>
                </div>
                <Link href={`/properties/${p.id}`} className="btn-secondary text-xs">Ver</Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
