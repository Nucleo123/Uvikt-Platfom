"use client";

import MapView from "./MapView";
import { formatCurrency, formatNumber, radiusLabel } from "@/lib/utils";

/**
 * Read-only, tokenized public view of a frozen Ficha de Mercado snapshot.
 * Mirrors MarketSheetView but without the radius slider or auth-only actions.
 */

type Snapshot = {
  propertyId: string;
  ticketNumber: string | null;
  title: string | null;
  address: { line1: string; neighborhood?: string | null; municipality?: string | null; state?: string | null; postalCode?: string | null } | null;
  location: { lat: number; lng: number } | null;
  polygonGeoJson: string | null;
  landUse: string | null;
  seduviFichaUrl: string | null;
  propertyType: string | null;
  surfaceM2: number | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  radiusMeters: number;
  demographics: {
    population?: number | null;
    households?: number | null;
    avgHouseholdIncome?: number | null;
    socioeconomic?: { abc1Pct?: number | null; c2Pct?: number | null; cPct?: number | null; dPct?: number | null; ePct?: number | null };
  } | null;
  commercial: { byCategory: Record<string, { count: number; brands: string[] }> } | null;
  sources: {
    inegi: { status: string; municipality?: string; state?: string; municipioPopulation?: number; densityHabKm2?: number };
    commercial: { status: string; provider?: string };
  };
  branding: { companyName: string; logoUrl: string | null; primaryColor: string; accentColor: string; contactEmail?: string | null; contactPhone?: string | null };
  photoUrl: string | null;
  generatedAt: string;
};

export default function PublicMarketSheet({ snapshot: s }: { snapshot: Snapshot }) {
  const primary = s.branding.primaryColor;
  const accent = s.branding.accentColor;
  const radius = s.radiusMeters;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl bg-white shadow-card overflow-hidden print:shadow-none print:rounded-none">
        <div className="p-6" style={{ background: primary, color: "#fff" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
                <span>●</span> Ficha de Mercado
              </div>
              <h1 className="mt-1 text-2xl font-semibold">{s.title ?? "(sin título)"}</h1>
              <div className="mt-1 text-sm text-white/80">
                {s.address?.line1}
                {s.address?.neighborhood && <>, {s.address.neighborhood}</>}
                {s.address?.municipality && <> · {s.address.municipality}</>}
                {s.address?.postalCode && <>, {s.address.postalCode}</>}
              </div>
              {s.ticketNumber && <div className="mt-1 text-xs font-mono text-white/60">{s.ticketNumber}</div>}
            </div>
            <div className="flex h-14 min-w-32 items-center justify-center rounded-lg border border-white/25 px-4">
              {s.branding.logoUrl ? (
                <img src={s.branding.logoUrl} alt="" className="max-h-10 max-w-28 object-contain" />
              ) : (
                <div className="text-sm font-semibold">{s.branding.companyName}</div>
              )}
            </div>
          </div>
          <div className="mt-4 h-1 w-full" style={{ background: accent }} />
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-3" style={{ background: primary }}>
          <div className="col-span-2 bg-white p-6">
            {s.location && (
              <MapView
                center={s.location}
                markers={[s.location]}
                circles={[{ lat: s.location.lat, lng: s.location.lng, radiusMeters: radius, color: accent }]}
                polygonGeoJson={s.polygonGeoJson}
                className="h-80 w-full rounded-xl overflow-hidden"
              />
            )}
            <div className="mt-3 text-xs text-slate-500">
              <span className="inline-block h-2 w-4" style={{ background: accent }} /> Área de influencia · {radiusLabel(radius)}
            </div>
          </div>

          <div className="bg-white p-6 border-l border-slate-100">
            <h3 className="text-xs uppercase tracking-widest text-slate-500">Ficha técnica</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Tipo" v={s.propertyType ?? "—"} />
              <Row k="Superficie" v={s.surfaceM2 ? `${formatNumber(s.surfaceM2)} m²` : "—"} />
              <Row k="Precio" v={s.priceAmount ? formatCurrency(s.priceAmount, s.priceCurrency ?? "MXN") : "—"} />
              <Row k="Uso de suelo" v={s.landUse ?? "—"} />
              {s.seduviFichaUrl && <Row k="SEDUVI" v={<a className="underline" href={s.seduviFichaUrl} target="_blank" rel="noreferrer">Ver ficha ↗</a>} />}
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-3 text-xs uppercase tracking-widest text-slate-500">Demografía INEGI · {radiusLabel(radius)}</h3>
            {s.sources.inegi.municipality && (
              <div className="mb-3 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                📍 <b>{s.sources.inegi.municipality}</b>, {s.sources.inegi.state} ·{" "}
                población municipal {s.sources.inegi.municipioPopulation?.toLocaleString()} · densidad{" "}
                {s.sources.inegi.densityHabKm2 ? Math.round(s.sources.inegi.densityHabKm2).toLocaleString() : "—"} hab/km²
              </div>
            )}
            {s.demographics && (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold">{formatNumber(s.demographics.population ?? 0)}</span>
                  <span className="text-xs text-slate-500">habitantes</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatNumber(s.demographics.households ?? 0)} hogares · ingreso promedio {formatCurrency(s.demographics.avgHouseholdIncome ?? 0, "MXN")}
                </div>
                <div className="mt-4">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="bg-emerald-500" style={{ width: `${s.demographics.socioeconomic?.abc1Pct ?? 0}%` }} />
                    <span className="bg-sky-500"    style={{ width: `${s.demographics.socioeconomic?.c2Pct  ?? 0}%` }} />
                    <span className="bg-amber-500"  style={{ width: `${s.demographics.socioeconomic?.cPct   ?? 0}%` }} />
                    <span className="bg-rose-500"   style={{ width: `${s.demographics.socioeconomic?.dPct   ?? 0}%` }} />
                    <span className="bg-slate-400"  style={{ width: `${s.demographics.socioeconomic?.ePct   ?? 0}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    ABC1 {s.demographics.socioeconomic?.abc1Pct ?? 0}% · C+ {s.demographics.socioeconomic?.c2Pct ?? 0}% · C {s.demographics.socioeconomic?.cPct ?? 0}% · D {s.demographics.socioeconomic?.dPct ?? 0}% · E {s.demographics.socioeconomic?.ePct ?? 0}%
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-3 text-xs uppercase tracking-widest text-slate-500">Presencia comercial · {radiusLabel(radius)}</h3>
            {s.commercial && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(s.commercial.byCategory).map(([cat, info]) => (
                  <div key={cat} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs capitalize text-slate-600">{labelForCategory(cat)}</span>
                      <span className="text-lg font-semibold">{info.count}</span>
                    </div>
                    {info.brands.length > 0 && <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{info.brands.join(" · ")}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <div>{s.branding.companyName} {s.branding.contactEmail && ` · ${s.branding.contactEmail}`} {s.branding.contactPhone && ` · ${s.branding.contactPhone}`}</div>
          <div>{new Date(s.generatedAt).toLocaleDateString("es-MX")} · Generado con UVIKT</div>
        </footer>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1 last:border-0">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function labelForCategory(k: string) {
  const map: Record<string, string> = {
    retail: "Retail", banking: "Bancos", food: "Alimentos", automotive: "Automotriz", education: "Educación", healthcare: "Salud",
  };
  return map[k] ?? k;
}
