import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  enriched:     { label: "Enriquecido", color: "#0E2A35", bg: "#D1FAE5" },
  report_ready: { label: "Reporte listo", color: "#065F46", bg: "#A7F3D0" },
  validated:    { label: "Sólo validado", color: "#92400E", bg: "#FEF3C7" },
  draft:        { label: "Pendiente", color: "#6B7280", bg: "#F3F4F6" },
};

export default async function EstudioDeMercadoPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const ctx = await requireContext();

  const properties = await prisma.property.findMany({
    where: {
      organizationId: ctx.organization.id,
      status: searchParams.status
        ? searchParams.status
        : { in: ["enriched", "report_ready"] },
      OR: searchParams.q ? [
        { title: { contains: searchParams.q, mode: "insensitive" } },
        { ticketNumber: { contains: searchParams.q, mode: "insensitive" } },
        { addresses: { some: { line1: { contains: searchParams.q, mode: "insensitive" } } } },
      ] : undefined,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      addresses: { where: { isPrimary: true }, take: 1 },
      media: { where: { kind: "hero" }, take: 1 },
      demographics: { take: 1 },
      commercialCtx: { take: 1 },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 200,
  });

  const enrichedCount = properties.filter((p) => p.status === "enriched" || p.status === "report_ready").length;
  const reportCount = properties.filter((p) => p.reports.length > 0).length;

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estudio de mercado</h1>
          <p className="text-sm text-slate-500">
            Propiedades con datos de SEDUVI, INEGI y contexto comercial. {reportCount} con reporte generado.
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nuevo inmueble</Link>
      </header>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Stat label="Con estudio de mercado" value={enrichedCount} />
        <Stat label="Reportes generados" value={reportCount} />
        <Stat label="Total inmuebles" value={properties.length} />
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Buscar</label>
          <input name="q" defaultValue={searchParams.q ?? ""} className="input w-56" placeholder="Ticket, título, dirección…" />
        </div>
        <div>
          <label className="label">Estado</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input w-44">
            <option value="">Enriquecidos y listos</option>
            <option value="enriched">Sólo enriquecidos</option>
            <option value="report_ready">Sólo con reporte listo</option>
            <option value="validated">Sólo validados</option>
            <option value="draft">Pendientes</option>
          </select>
        </div>
        <button className="btn-secondary" type="submit">Filtrar</button>
      </form>

      {properties.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          <p className="mb-3">Aún no tienes inmuebles con estudio de mercado.</p>
          <p className="text-xs">
            Carga un inmueble desde <Link href="/properties/new" className="underline">+ Nuevo inmueble</Link> y el sistema enriquecerá los datos automáticamente con SEPOMEX, SEDUVI e INEGI.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
            const hasDemographics = p.demographics.length > 0;
            const hasCommercial = p.commercialCtx.length > 0;
            const hasReport = p.reports.length > 0;
            const hero = p.media[0]?.url;
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-lg"
              >
                <div className="relative h-36 bg-slate-100">
                  {hero ? (
                    <img src={hero} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin foto</div>
                  )}
                  <span className="absolute right-2 top-2 badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium leading-tight group-hover:underline">
                      {p.title ?? p.addresses[0]?.line1 ?? "(sin título)"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.ticketNumber && <span className="font-mono">{p.ticketNumber} · </span>}
                    {p.addresses[0]?.line1 ?? "—"}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {p.landUse && <Pill label={`SEDUVI · ${p.landUse}`} ok />}
                    {hasDemographics && <Pill label="INEGI" ok />}
                    {hasCommercial && <Pill label="Comercial" ok />}
                    {hasReport && <Pill label="Reporte listo" ok />}
                    {!p.landUse && !hasDemographics && !hasCommercial && <Pill label="Procesando…" />}
                  </div>
                  <div className="text-[11px] text-slate-400">Actualizado {formatDate(p.updatedAt)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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

function Pill({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}
