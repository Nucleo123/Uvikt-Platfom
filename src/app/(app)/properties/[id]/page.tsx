import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatNumber, radiusLabel, formatDate } from "@/lib/utils";
import MapView from "@/components/MapView";
import PropertyActions from "@/components/PropertyActions";
import StageChanger from "@/components/StageChanger";
import { ACQUISITION_STAGES } from "@/lib/stages";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireContext();

  const p = await prisma.property.findFirst({
    where: { id: params.id, organizationId: ctx.organization.id },
    include: {
      addresses: true,
      locations: { orderBy: { createdAt: "desc" } },
      media: true,
      sourceRecords: { orderBy: { fetchedAt: "desc" } },
      enrichmentJobs: { orderBy: { scheduledAt: "desc" } },
      demographics: { orderBy: { radiusMeters: "asc" } },
      commercialCtx: { orderBy: { radiusMeters: "asc" } },
      documents: true,
      reports: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!p) notFound();

  const responsableInterno = p.responsableInternoId
    ? await prisma.user.findUnique({ where: { id: p.responsableInternoId }, select: { name: true, email: true } })
    : null;

  const stageMeta = ACQUISITION_STAGES.find((s) => s.key === p.acquisitionStage) ?? ACQUISITION_STAGES[0];

  const hero = p.media.find((m) => m.kind === "hero") ?? p.media[0];
  const loc = p.locations.find((l) => l.kind === "corrected") ?? p.locations.find((l) => l.kind === "original") ?? p.locations[0];
  const primaryAddr = p.addresses.find((a) => a.isPrimary) ?? p.addresses[0];
  const validatedAddr = p.addresses.find((a) => a.source === "sepomex" && a.validated);

  const radiiWithDemo = p.demographics.map((d) => d.radiusMeters);
  const commercialByRadius = new Map<number, typeof p.commercialCtx>();
  for (const c of p.commercialCtx) {
    const arr = commercialByRadius.get(c.radiusMeters) ?? [];
    arr.push(c);
    commercialByRadius.set(c.radiusMeters, arr);
  }

  return (
    <div className="p-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/properties" className="hover:underline">Propiedades</Link> <span className="mx-2">/</span>
        <span className="text-slate-700">{p.title ?? primaryAddr?.line1 ?? p.id}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {p.ticketNumber && <span className="badge-muted font-mono">#{p.ticketNumber}</span>}
            <span className="badge" style={{ background: stageMeta.bg, color: stageMeta.color }}>{stageMeta.label}</span>
            {p.propertyType && <span className="badge-info capitalize">{p.propertyType}</span>}
            {p.occupancyStatus && <span className={p.occupancyStatus === "rented" ? "badge-warning" : "badge-success"}>{p.occupancyStatus === "rented" ? "Rentado" : "Vacío"}</span>}
            {p.landUse && <span className="badge-success">Uso: {p.landUse}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{p.title ?? "(sin título)"}</h1>
          <p className="text-slate-600">
            {primaryAddr?.line1}
            {primaryAddr?.neighborhood && `, ${primaryAddr.neighborhood}`}
            {primaryAddr?.municipality && ` · ${primaryAddr.municipality}`}
            {primaryAddr?.state && `, ${primaryAddr.state}`} {primaryAddr?.postalCode}
          </p>
          {validatedAddr && validatedAddr.postalCode !== primaryAddr?.postalCode && (
            <p className="mt-1 text-xs text-emerald-700">SEPOMEX: {validatedAddr.postalCode} · {validatedAddr.neighborhood}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 items-end min-w-[320px]">
          <PropertyActions propertyId={p.id} status={p.status} />
          <div className="card w-full p-4">
            <StageChanger propertyId={p.id} current={p.acquisitionStage} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {hero && (
            <div className="card p-0 overflow-hidden">
              <img src={hero.url} alt="" className="h-80 w-full object-cover" />
            </div>
          )}

          {loc && (
            <div className="card p-0 overflow-hidden">
              <MapView
                center={loc}
                markers={[{ lat: loc.lat, lng: loc.lng, label: primaryAddr?.line1 }]}
                circles={radiiWithDemo.map((r) => ({ lat: loc.lat, lng: loc.lng, radiusMeters: r, color: "#E4B43C" }))}
                polygonGeoJson={p.polygonGeoJson}
                className="h-96 w-full"
              />
            </div>
          )}

          <section className="card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Ficha del inmueble</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Fact label="Precio de venta" value={p.priceAmount ? formatCurrency(p.priceAmount, p.priceCurrency ?? "MXN") : "—"} />
              <Fact label="Superficie" value={p.surfaceM2 ? `${formatNumber(p.surfaceM2)} m²` : "—"} />
              <Fact label="Tipo" value={p.propertyType ?? "—"} />
              <Fact label="Condición" value={p.occupancyStatus === "rented" ? "Rentado" : p.occupancyStatus === "vacant" ? "Vacío" : "—"} />
              {p.occupancyStatus === "rented" && <Fact label="Inquilino actual" value={p.currentTenant ?? "—"} />}
              {p.occupancyStatus === "rented" && <Fact label="Renta mensual" value={p.currentRent ? formatCurrency(p.currentRent) : "—"} />}
              {p.occupancyStatus === "vacant" && <Fact label="Inquilino potencial" value={p.potentialTenant ?? "—"} />}
              <Fact label="Uso de suelo (SEDUVI)" value={p.landUse ?? "—"} />
              <Fact label="Frente × fondo" value={p.frontageM && p.depthM ? `${p.frontageM} × ${p.depthM} m` : "—"} />
              <Fact label="Niveles" value={p.levels ?? "—"} />
            </div>
            {p.description && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{p.description}</p>}
          </section>

          <section className="card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Responsables</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Fact label="Interno" value={responsableInterno ? (responsableInterno.name ?? responsableInterno.email) : "—"} />
              <Fact
                label="Externo (broker)"
                value={
                  p.responsableExternoName
                    ? (
                      <>
                        {p.responsableExternoName}
                        {p.responsableExternoEmail && <><br/><span className="text-xs text-slate-500">{p.responsableExternoEmail}</span></>}
                        {p.responsableExternoPhone && <><br/><span className="text-xs text-slate-500">{p.responsableExternoPhone}</span></>}
                      </>
                    )
                    : "—"
                }
              />
            </div>
          </section>

          {p.demographics.length > 0 && (
            <section className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Demografía INEGI</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {p.demographics.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs uppercase tracking-wide text-brand-accent">{radiusLabel(d.radiusMeters)}</div>
                    <div className="mt-1 text-2xl font-semibold">{formatNumber(d.population)}</div>
                    <div className="text-xs text-slate-500">habitantes</div>
                    <div className="mt-2 text-xs text-slate-600">
                      Hogares: {formatNumber(d.households)}<br/>
                      Ingreso hogar: {formatCurrency(d.avgHouseholdIncome, "MXN")}
                    </div>
                    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <span className="bg-emerald-500" style={{ width: `${d.socioeconomicAbc1Pct ?? 0}%` }} />
                      <span className="bg-sky-500"    style={{ width: `${d.socioeconomicC2Pct  ?? 0}%` }} />
                      <span className="bg-amber-500"  style={{ width: `${d.socioeconomicCPct   ?? 0}%` }} />
                      <span className="bg-rose-500"   style={{ width: `${d.socioeconomicDPct   ?? 0}%` }} />
                      <span className="bg-slate-400"  style={{ width: `${d.socioeconomicEPct   ?? 0}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">ABC1 {d.socioeconomicAbc1Pct}% · C+ {d.socioeconomicC2Pct}% · C {d.socioeconomicCPct}% · D {d.socioeconomicDPct}% · E {d.socioeconomicEPct}%</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.commercialCtx.length > 0 && (
            <section className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Presencia comercial</h2>
              {Array.from(commercialByRadius.entries()).map(([r, cats]) => (
                <div key={r} className="mb-4 last:mb-0">
                  <div className="mb-2 text-xs uppercase tracking-wide text-brand-accent">{radiusLabel(r)}</div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {cats.map((c) => (
                      <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm capitalize">{c.category}</span>
                          <span className="text-lg font-semibold">{c.count}</span>
                        </div>
                        {c.notableBrands && <div className="text-xs text-slate-500">{c.notableBrands}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Documentos</h2>
            <ul className="space-y-2 text-sm">
              {p.seduviFichaUrl && (
                <li><a className="text-ink underline" href={p.seduviFichaUrl} target="_blank" rel="noreferrer">Ficha SEDUVI (PDF)</a></li>
              )}
              <li><a className="text-ink underline" href={`/api/properties/${p.id}/kmz`}>Descargar KMZ</a></li>
              {p.documents.map((d) => (
                <li key={d.id}><a className="text-ink underline" href={d.url} target="_blank" rel="noreferrer">{d.label ?? d.kind}</a></li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Enriquecimiento</h2>
            <ul className="space-y-2 text-xs">
              {p.enrichmentJobs.slice(0, 8).map((j) => (
                <li key={j.id} className="flex items-center justify-between">
                  <span>{j.source}</span>
                  <span className={j.status === "success" ? "badge-success" : j.status === "failed" ? "badge-danger" : "badge-muted"}>{j.status}</span>
                </li>
              ))}
              {p.enrichmentJobs.length === 0 && <li className="text-slate-500">Aún no hay ejecuciones.</li>}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Reportes generados</h2>
            <ul className="space-y-2 text-sm">
              {p.reports.length === 0 && <li className="text-slate-500">Sin reportes aún.</li>}
              {p.reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <Link className="text-ink underline" href={`/r/${r.shareToken}`} target="_blank">Reporte v{r.version}</Link>
                  <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
