"use client";

import MapView from "./MapView";
import type { ReportSnapshot } from "@/server/services/report";
import { formatCurrency, formatNumber, radiusLabel } from "@/lib/utils";

export default function ReportView({ snapshot, printable = false }: { snapshot: ReportSnapshot; printable?: boolean }) {
  const s = snapshot;
  const primary = s.branding.primaryColor;
  const accent = s.branding.accentColor;

  return (
    <div className={printable ? "mx-auto w-[1100px] bg-white" : "mx-auto max-w-5xl"}>
      {/* Hero header — mirrors the presentation mock */}
      <div className="p-8" style={{ background: primary, color: "#fff" }}>
        <div className="flex items-start justify-between gap-6">
          <div className="inline-flex items-center gap-3 rounded-xl border border-white/25 px-6 py-3 text-3xl font-semibold uppercase tracking-wide">
            {s.property.transactionType === "sale" ? "Venta" : "Renta"}
          </div>

          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/70">
              <span style={{ color: accent }}>●</span> Ficha Comercial
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{s.address?.line1 ?? "Dirección pendiente"}</h1>
            <div className="text-white/80">
              {s.address?.neighborhood && <>{s.address.neighborhood}, </>}
              {s.address?.municipality}
              {s.address?.postalCode && <>, {s.address.postalCode}</>}
              {s.address?.state && <> · {s.address.state}</>}
            </div>
          </div>

          <div className="flex h-16 min-w-32 items-center justify-center rounded-xl border border-white/25 px-4">
            {s.branding.logoUrl ? (
              <img src={s.branding.logoUrl} alt="logo" className="max-h-12 max-w-32 object-contain" />
            ) : (
              <div className="text-sm font-semibold">{s.branding.companyName ?? "LOGO"}</div>
            )}
          </div>
        </div>
        <div className="mt-4 h-1 w-full" style={{ background: accent }} />
      </div>

      {/* Three-panel body (photo / demographics / land use) */}
      <div className="grid gap-6 p-8 md:grid-cols-3" style={{ background: primary }}>
        <Panel>
          {s.heroPhotoUrl ? (
            <img src={s.heroPhotoUrl} alt="" className="h-56 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-lg bg-slate-200 text-sm text-slate-500">Sin foto</div>
          )}
          <FactTable>
            <Row k="Superficie" v={s.property.surfaceM2 ? `${s.property.surfaceM2} m²` : "—"} />
            <Row k="Frente × fondo" v={s.property.frontageM && s.property.depthM ? `${s.property.frontageM} × ${s.property.depthM} m` : "—"} />
            <Row k="Giro" v={s.property.propertyUse ?? "—"} />
            <Row k="Esquina" v={s.property.isCorner ? "Sí" : "No"} />
            <Row k="Niveles" v={s.property.levels ?? "—"} />
            <Row k="Locales" v={s.property.localUnits ?? "—"} />
            <Row k={s.property.transactionType === "sale" ? "Precio de venta" : "Renta mensual"} v={s.property.priceAmount ? formatCurrency(s.property.priceAmount, s.property.priceCurrency ?? "MXN") : "—"} />
            <Row k="Marcas notables" v={s.property.notableBrands ?? "—"} />
          </FactTable>
          {s.property.description && <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-slate-700">{s.property.description}</p>}
        </Panel>

        <Panel>
          <div className="h-56 w-full overflow-hidden rounded-lg bg-slate-200">
            {s.location && !printable && (
              <MapView
                center={s.location}
                markers={[{ lat: s.location.lat, lng: s.location.lng }]}
                circles={s.demographics.map((d) => ({ lat: s.location!.lat, lng: s.location!.lng, radiusMeters: d.radiusMeters, color: accent }))}
                className="h-56 w-full"
              />
            )}
            {s.location && printable && (
              <img
                alt="map"
                className="h-full w-full object-cover"
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${s.location.lat},${s.location.lng}&zoom=15&size=520x220&markers=${s.location.lat},${s.location.lng},red-pushpin`}
              />
            )}
          </div>
          <div className="mt-3">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-slate-500">Demografía INEGI</div>
            {s.demographics.length === 0 && <div className="text-xs text-slate-400">Pendiente</div>}
            {s.demographics.map((d) => (
              <div key={d.radiusMeters} className="mb-2 border-l-2 pl-2" style={{ borderColor: accent }}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{radiusLabel(d.radiusMeters)}</span>
                  <span>{formatNumber(d.population)} hab.</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Hogares {formatNumber(d.households)} · Ingreso {formatCurrency(d.avgHouseholdIncome, "MXN")}
                </div>
                <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <span style={{ width: `${d.abc1Pct ?? 0}%`, background: "#10b981" }} />
                  <span style={{ width: `${d.c2Pct ?? 0}%`,   background: "#0ea5e9" }} />
                  <span style={{ width: `${d.cPct ?? 0}%`,    background: "#f59e0b" }} />
                  <span style={{ width: `${d.dPct ?? 0}%`,    background: "#ef4444" }} />
                  <span style={{ width: `${d.ePct ?? 0}%`,    background: "#64748b" }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="h-56 w-full overflow-hidden rounded-lg bg-slate-100">
            {s.location && !printable && (
              <MapView
                center={s.location}
                markers={[{ lat: s.location.lat, lng: s.location.lng }]}
                polygonGeoJson={s.property.polygonGeoJson}
                zoom={17}
                className="h-56 w-full"
              />
            )}
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Uso de suelo (SEDUVI)</div>
            <div className="text-base font-semibold">{s.property.landUse ?? "Pendiente"}</div>
            {s.commercial.length > 0 && (
              <>
                <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">Presencia comercial</div>
                {s.commercial.map((band) => (
                  <div key={band.radiusMeters} className="mt-1 text-[11px]">
                    <div className="text-slate-500">{radiusLabel(band.radiusMeters)}</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(band.byCategory).slice(0, 6).map(([cat, info]) => (
                        <span key={cat} className="rounded bg-slate-100 px-1.5 py-0.5 capitalize">{cat} {info.count}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
            {s.property.seduviFichaUrl && (
              <a href={s.property.seduviFichaUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline" style={{ color: primary }}>
                Abrir ficha SEDUVI ↗
              </a>
            )}
          </div>
        </Panel>
      </div>

      <div className="flex items-center justify-between px-8 py-4 text-xs" style={{ background: primary, color: "#fff" }}>
        <div>{s.branding.companyName} {s.branding.contactEmail && ` · ${s.branding.contactEmail}`} {s.branding.contactPhone && ` · ${s.branding.contactPhone}`}</div>
        <div className="text-white/60">{new Date(s.generatedAt).toLocaleDateString("es-MX")} · Generado con UVIKT</div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 text-ink shadow-card">{children}</div>;
}

function FactTable({ children }: { children: React.ReactNode }) {
  return <table className="mt-3 w-full text-[12px]"><tbody>{children}</tbody></table>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-1.5 pr-2 text-slate-500">{k}</td>
      <td className="py-1.5 text-right font-medium">{v}</td>
    </tr>
  );
}
