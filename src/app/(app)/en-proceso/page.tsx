import Link from "next/link";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ACQUISITION_STAGES } from "@/lib/stages";
import OnboardingTour from "@/components/OnboardingTour";
import PortfolioMap from "@/components/PortfolioMap";

type View = "resumen" | "kanban" | "lista" | "mapa";

export default async function EnProcesoPage({
  searchParams,
}: {
  searchParams: { view?: string; stage?: string; type?: string; q?: string };
}) {
  const ctx = await requireContext();
  const view: View = ((): View => {
    switch (searchParams.view) {
      case "kanban": return "kanban";
      case "lista": return "lista";
      case "mapa": return "mapa";
      default: return "resumen";
    }
  })();

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

  const total = properties.length;
  const totalValue = properties.reduce((sum, p) => sum + (p.priceAmount ?? 0), 0);
  const stageMap: Record<string, { count: number; sum: number }> = {};
  for (const p of properties) {
    const k = p.acquisitionStage;
    if (!stageMap[k]) stageMap[k] = { count: 0, sum: 0 };
    stageMap[k].count += 1;
    stageMap[k].sum += p.priceAmount ?? 0;
  }

  return (
    <div className="p-8">
      <OnboardingTour userName={ctx.user.name ?? ctx.user.email} />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">En proceso</h1>
          <p className="text-sm text-slate-500">{total} inmuebles · valor agregado {formatCurrency(totalValue)}</p>
        </div>
        <Link href="/properties/new" className="btn-primary">+ Nuevo inmueble</Link>
      </header>

      <ViewTabs view={view} searchParams={searchParams} />

      {view === "resumen" && <ResumenView stageMap={stageMap} properties={properties.slice(0, 10)} />}
      {view === "kanban" && <KanbanView properties={properties} />}
      {view === "lista" && <ListaView properties={properties} searchParams={searchParams} />}
      {view === "mapa" && <MapaView properties={properties} />}
    </div>
  );
}

function ViewTabs({
  view,
  searchParams,
}: {
  view: View;
  searchParams: { view?: string; stage?: string; type?: string; q?: string };
}) {
  const items: Array<{ key: View; label: string }> = [
    { key: "resumen", label: "Resumen" },
    { key: "kanban", label: "Semáforos" },
    { key: "lista", label: "Lista" },
    { key: "mapa", label: "Mapa" },
  ];
  const baseQuery = { ...searchParams };
  delete baseQuery.view;
  return (
    <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={{ pathname: "/en-proceso", query: { ...baseQuery, view: i.key } }}
          className={`rounded px-3 py-1.5 text-sm ${view === i.key ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

function ResumenView({
  stageMap,
  properties,
}: {
  stageMap: Record<string, { count: number; sum: number }>;
  properties: Awaited<ReturnType<typeof prisma.property.findMany>> & {
    addresses: Array<{ line1: string }>;
    media: Array<{ url: string; kind: string }>;
  }[];
}) {
  return (
    <>
      <div className="mb-5 grid gap-3 md:grid-cols-5">
        {ACQUISITION_STAGES.map((s) => {
          const info = stageMap[s.key] ?? { count: 0, sum: 0 };
          return (
            <Link
              key={s.key}
              href={`/en-proceso?view=lista&stage=${s.key}`}
              className="rounded-xl p-4 text-sm transition hover:shadow-card"
              style={{ background: s.bg }}
            >
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
          {properties.length === 0 && (
            <li className="py-6 text-sm text-slate-500">
              Aún no tienes inmuebles. <Link href="/properties/new" className="underline">Carga el primero</Link>.
            </li>
          )}
          {(properties as any[]).map((p) => {
            const stage = ACQUISITION_STAGES.find((s) => s.key === p.acquisitionStage) ?? ACQUISITION_STAGES[0];
            return (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    {p.ticketNumber && <span className="font-mono text-[11px] text-slate-500">{p.ticketNumber}</span>}
                    <Link href={`/properties/${p.id}`} className="font-medium hover:underline">
                      {p.title ?? p.addresses[0]?.line1 ?? "(sin dirección)"}
                    </Link>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(p.createdAt)} · {p.propertyType ?? "—"} · <span style={{ color: stage.color }}>{stage.label}</span>
                  </div>
                </div>
                <Link href={`/properties/${p.id}`} className="btn-secondary text-xs">Ver</Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function KanbanView({ properties }: { properties: any[] }) {
  const byStage = new Map<string, any[]>();
  for (const p of properties) {
    const list = byStage.get(p.acquisitionStage) ?? [];
    list.push(p);
    byStage.set(p.acquisitionStage, list);
  }

  return (
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
  );
}

function ListaView({
  properties,
  searchParams,
}: {
  properties: any[];
  searchParams: { view?: string; stage?: string; type?: string; q?: string };
}) {
  return (
    <>
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value="lista" />
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
      </form>

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
    </>
  );
}

function MapaView({ properties }: { properties: any[] }) {
  const points = properties
    .map((p) => {
      const loc = p.locations[0];
      if (!loc) return null;
      return { id: p.id, lat: loc.lat, lng: loc.lng, label: p.title ?? p.addresses[0]?.line1 ?? "Propiedad" };
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; label: string }>;

  return (
    <div className="card p-0 overflow-hidden">
      <PortfolioMap points={points} />
    </div>
  );
}
