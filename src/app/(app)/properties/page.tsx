import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import PortfolioMap from "@/components/PortfolioMap";

export default async function PropertiesPage({ searchParams }: { searchParams: { view?: string; status?: string; tx?: string; q?: string } }) {
  const ctx = await requireContext();
  const view = searchParams.view === "map" ? "map" : "table";

  const properties = await prisma.property.findMany({
    where: {
      organizationId: ctx.organization.id,
      status: searchParams.status || undefined,
      transactionType: searchParams.tx || undefined,
      OR: searchParams.q ? [
        { title: { contains: searchParams.q } },
        { description: { contains: searchParams.q } },
        { addresses: { some: { line1: { contains: searchParams.q } } } },
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
          <input name="q" defaultValue={searchParams.q ?? ""} className="input w-56" placeholder="Dirección, título…" />
        </div>
        <div>
          <label className="label">Estado</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input w-40">
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="validated">Validada</option>
            <option value="enriched">Enriquecida</option>
            <option value="report_ready">Reporte listo</option>
            <option value="archived">Archivada</option>
          </select>
        </div>
        <div>
          <label className="label">Operación</label>
          <select name="tx" defaultValue={searchParams.tx ?? ""} className="input w-32">
            <option value="">Todas</option>
            <option value="sale">Venta</option>
            <option value="rent">Renta</option>
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
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Operación</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No hay propiedades con esos filtros.</td></tr>
              )}
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 overflow-hidden rounded bg-slate-100">
                        {p.media[0] && <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <Link href={`/properties/${p.id}`} className="font-medium hover:underline">{p.title ?? "(sin título)"}</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.addresses[0]?.line1 ?? "—"}</td>
                  <td className="px-4 py-3">{p.transactionType === "sale" ? "Venta" : "Renta"}</td>
                  <td className="px-4 py-3">{formatCurrency(p.priceAmount, p.priceCurrency ?? "MXN")}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/properties/${p.id}`} className="text-ink hover:underline">Abrir →</Link></td>
                </tr>
              ))}
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
