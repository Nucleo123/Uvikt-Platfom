import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import PortfolioMap from "@/components/PortfolioMap";
import { ACQUISITION_STAGES } from "@/lib/stages";

export default async function PropertiesPage({ searchParams }: { searchParams: { view?: string; stage?: string; type?: string; q?: string } }) {
  const ctx = await requireContext();
  const view = searchParams.view === "map" ? "map" : "table";

  const properties = await prisma.property.findMany({
    where: {
      organizationId: ctx.organization.id,
      acquisitionStage: searchParams.stage || undefined,
      propertyType: searchParams.type || undefined,
      OR: searchParams.q ? [
        { title: { contains: searchParams.q, mode: "insensitive" } },
        { description: { contains: searchParams.q, mode: "insensitive" } },
        { ticketNumber: { contains: searchParams.q, mode: "insensitive" } },
        { addresses: { some: { line1: { contains: searchParams.q, mode: "insensitive" } } } },
      ] : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      addresses: { where: { isPrimary: true }, take: 1 },
      locations: { orderBy: { createdAt: "desc" }, take: 1 },
      media: { where: { kind: "hero" }, take: 1 },
    },
    take: 200,
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Propiedades</h1>
          <p className="text-sm text-slate-500">{properties.length} registradas</p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nueva</Link>
      </header>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Buscar</label>
          <input name="q" defaultValue={searchParams.q ?? ""} className="input w-56" placeholder="Ticket, título, dirección…" />
        </div>
        <div>
          <label className="label">Etapa</label>
          <select name="stage" defaultValue={searchParams.stage ?? ""} className="input w-44">
            <option value="">Todas</option>
            {ACQUISITION_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="type" defaultValue={searchParams.type ?? ""} className="input w-36">
            <option value="">Todos</option>
            <option value="terreno">Terreno</option>
            <option value="local">Local</option>
            <option value="bodega">Bodega</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <button className="btn-secondary" type="submit">Filtrar</button>
        <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <Link href={{ pathname: "/properties", query: { ...searchParams, view: "table" } }} className={`rounded px-3 py-1 text-sm ${view === "table" ? "bg-ink text-white" : ""}`}>Tabla</Link>
          <Link href={{ pathname: "/properties", query: { ...searchParams, view: "map" } }} className={`rounded px-3 py-1 text-sm ${view === "map" ? "bg-ink text-white" : ""}`}>Mapa</Link>
        </div>
      </form>

      {view === "map" ? (
        <div className="card p-0 overflow-hidden">
          <PortfolioMap
            points={properties
              .map((p) => {
                const loc = p.locations[0];
                if (!loc) return null;
                return { id: p.id, lat: loc.lat, lng: loc.lng, label: p.title ?? p.addresses[0]?.line1 ?? "Propiedad" };
              })
              .filter(Boolean) as Array<{ id: string; lat: number; lng: number; label: string }>}
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Inmueble</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No hay inmuebles con esos filtros.</td></tr>
              )}
              {properties.map((p) => {
                const stage = ACQUISITION_STAGES.find((s) => s.key === p.acquisitionStage) ?? ACQUISITION_STAGES[0];
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.ticketNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 overflow-hidden rounded bg-slate-100">
                          {p.media[0] && <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <Link href={`/properties/${p.id}`} className="font-medium hover:underline">{p.title ?? "(sin título)"}</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.addresses[0]?.line1 ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{p.propertyType ?? "—"}</td>
                    <td className="px-4 py-3">{formatCurrency(p.priceAmount, p.priceCurrency ?? "MXN")}</td>
                    <td className="px-4 py-3">
                      <span className="badge" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/properties/${p.id}`} className="text-ink hover:underline">Abrir →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "badge-muted",
    validated: "badge-info",
    enriched: "badge-success",
    report_ready: "badge-success",
    archived: "badge-muted",
  };
  const label: Record<string, string> = {
    draft: "Borrador", validated: "Validada", enriched: "Enriquecida", report_ready: "Reporte listo", archived: "Archivada",
  };
  return <span className={map[status] ?? "badge-muted"}>{label[status] ?? status}</span>;
}
