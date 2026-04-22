import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const [total, byStatus, recent] = await Promise.all([
    prisma.property.count({ where: { organizationId: ctx.organization.id } }),
    prisma.property.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { organizationId: ctx.organization.id },
    }),
    prisma.property.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { addresses: { where: { isPrimary: true }, take: 1 } },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen de actividad</p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nueva propiedad</Link>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Stat label="Propiedades" value={total} />
        <Stat label="Borradores" value={statusMap["draft"] ?? 0} />
        <Stat label="Enriquecidas" value={(statusMap["enriched"] ?? 0) + (statusMap["report_ready"] ?? 0)} />
        <Stat label="Listas para reporte" value={statusMap["report_ready"] ?? 0} />
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Actividad reciente</h2>
        <ul className="divide-y divide-slate-100">
          {recent.length === 0 && <li className="py-6 text-sm text-slate-500">Aún no tienes propiedades. <Link href="/properties/new" className="underline">Crea la primera</Link>.</li>}
          {recent.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/properties/${p.id}`} className="font-medium hover:underline">{p.title ?? p.addresses[0]?.line1 ?? "(sin dirección)"}</Link>
                <div className="text-xs text-slate-500">{formatDate(p.createdAt)} · {p.transactionType === "sale" ? "Venta" : "Renta"} · {p.status}</div>
              </div>
              <Link href={`/properties/${p.id}`} className="btn-secondary text-xs">Ver</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
