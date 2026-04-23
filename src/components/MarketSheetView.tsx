"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MapView from "./MapView";
import { formatCurrency, formatNumber, radiusLabel } from "@/lib/utils";

type Sheet = {
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
    avgAge?: number | null;
    avgHouseholdIncome?: number | null;
    socioeconomic?: { abc1Pct?: number | null; c2Pct?: number | null; cPct?: number | null; dPct?: number | null; ePct?: number | null };
  } | null;
  commercial: {
    byCategory: Record<string, { count: number; brands: string[] }>;
  } | null;
  sources: {
    inegi: {
      status: string;
      confidence?: number;
      error?: string;
      municipality?: string;
      state?: string;
      municipioPopulation?: number;
      municipioAreaKm2?: number;
      densityHabKm2?: number;
      method?: string;
    };
    commercial: { status: string; confidence?: number; error?: string; provider?: string };
  };
  branding: { companyName: string; logoUrl: string | null; primaryColor: string; accentColor: string };
  photoUrl: string | null;
  generatedAt: string;
};

export default function MarketSheetView({ propertyId }: { propertyId: string }) {
  const [radius, setRadius] = useState(1000);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [share, setShare] = useState<{ shareUrl: string; pdfUrl: string } | null>(null);

  async function generateShare() {
    setSharing(true);
    const res = await fetch(`/api/properties/${propertyId}/market-sheet/share`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radiusMeters: radius, expiresInDays: 30 }),
    });
    setSharing(false);
    if (res.ok) {
      const data = await res.json();
      setShare({ shareUrl: data.shareUrl, pdfUrl: data.pdfUrl });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    fetch(`/api/properties/${propertyId}/market-sheet?radius=${radius}`)
      .then((r) => r.ok ? r.json() : r.json().then((d) => { throw new Error(d.error ?? "Error"); }))
      .then((d) => { if (!cancelled) { setSheet(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setErr(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [propertyId, radius]);

  if (loading && !sheet) return <div className="p-10 text-center text-slate-500">Generando ficha de mercado…</div>;
  if (err) return <div className="p-10 text-center text-red-700">{err}</div>;
  if (!sheet) return null;

  const primary = sheet.branding.primaryColor;
  const accent = sheet.branding.accentColor;

  return (
    <div className="mx-auto max-w-6xl">
      <nav className="mb-4 flex items-center justify-between text-sm">
        <Link href={`/properties/${propertyId}`} className="text-slate-500 hover:underline">← Regresar al inmueble</Link>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Radio (RTZ):</span>
            <select value={radius} onChange={(e) => setRadius(parseInt(e.target.value, 10))} className="input py-1 w-32">
              <option value={250}>250 m</option>
              <option value={500}>500 m</option>
              <option value={1000}>1 km</option>
              <option value={2500}>2.5 km</option>
              <option value={5000}>5 km</option>
            </select>
          </label>
          <button onClick={() => window.print()} className="btn-secondary">🖨 Imprimir</button>
          <button onClick={generateShare} disabled={sharing} className="btn-primary">{sharing ? "Generando…" : "🔗 Compartir link"}</button>
        </div>
      </nav>
      {share && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="font-medium text-emerald-800">✓ Link público generado (expira en 30 días)</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <a href={share.shareUrl} target="_blank" rel="noreferrer" className="rounded bg-white px-2 py-1 font-mono text-emerald-900 underline">{share.shareUrl}</a>
            <a href={share.pdfUrl} target="_blank" rel="noreferrer" className="rounded bg-white px-2 py-1 underline">📄 PDF</a>
            <button onClick={() => navigator.clipboard.writeText(share.shareUrl)} className="rounded bg-white px-2 py-1 underline">Copiar</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-card overflow-hidden print:shadow-none">
        {/* HEADER */}
        <div className="p-6" style={{ background: primary, color: "#fff" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: accent }}>
                <span>●</span> Ficha de Mercado · Etapa 2
              </div>
              <h1 className="mt-1 text-2xl font-semibold">{sheet.title ?? "(sin título)"}</h1>
              <div className="mt-1 text-sm text-white/80">
                {sheet.address?.line1}
                {sheet.address?.neighborhood && <>, {sheet.address.neighborhood}</>}
                {sheet.address?.municipality && <> · {sheet.address.municipality}</>}
                {sheet.address?.postalCode && <>, {sheet.address.postalCode}</>}
              </div>
              {sheet.ticketNumber && <div className="mt-1 text-xs font-mono text-white/60">{sheet.ticketNumber}</div>}
            </div>
            <div className="flex h-14 min-w-32 items-center justify-center rounded-lg border border-white/25 px-4">
              {sheet.branding.logoUrl ? (
                <img src={sheet.branding.logoUrl} alt="" className="max-h-10 max-w-28 object-contain" />
              ) : (
                <div className="text-sm font-semibold">{sheet.branding.companyName}</div>
              )}
            </div>
          </div>
          <div className="mt-4 h-1 w-full" style={{ background: accent }} />
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-3" style={{ background: primary }}>
          {/* MAP + RTZ */}
          <div className="col-span-2 bg-white p-6">
            {sheet.location && (
              <MapView
                key={`${sheet.location.lat},${sheet.location.lng},${radius}`}
                center={sheet.location}
                markers={[sheet.location]}
                circles={[{ lat: sheet.location.lat, lng: sheet.location.lng, radiusMeters: radius, color: accent }]}
                polygonGeoJson={sheet.polygonGeoJson}
                className="h-80 w-full rounded-xl overflow-hidden"
              />
            )}
            <div className="mt-3 text-xs text-slate-500">
              <span className="inline-block h-2 w-4" style={{ background: accent }} /> Área de influencia / RTZ · {radiusLabel(radius)}
              {sheet.polygonGeoJson && <> · <span style={{ color: accent }}>━</span> Polígono del predio</>}
            </div>
          </div>

          {/* FACTS */}
          <div className="bg-white p-6 border-l border-slate-100">
            <h3 className="text-xs uppercase tracking-widest text-slate-500">Ficha técnica</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Tipo" v={sheet.propertyType ?? "—"} />
              <Row k="Superficie" v={sheet.surfaceM2 ? `${formatNumber(sheet.surfaceM2)} m²` : "—"} />
              <Row k="Precio" v={sheet.priceAmount ? formatCurrency(sheet.priceAmount, sheet.priceCurrency ?? "MXN") : "—"} />
              <Row k="Uso de suelo" v={sheet.landUse ?? "—"} />
              {sheet.seduviFichaUrl && (
                <Row k="SEDUVI" v={<a className="underline" href={sheet.seduviFichaUrl} target="_blank" rel="noreferrer">Ver ficha ↗</a>} />
              )}
            </dl>
          </div>
        </div>

        {/* DEMOGRAPHICS */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xs uppercase tracking-widest text-slate-500">Demografía INEGI · {radiusLabel(radius)}</h3>
              <SourceDot status={sheet.sources.inegi.status} />
            </div>
            {sheet.sources.inegi.municipality && (
              <div className="mb-3 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                📍 <b>{sheet.sources.inegi.municipality}</b>, {sheet.sources.inegi.state} ·{" "}
                población municipal {sheet.sources.inegi.municipioPopulation?.toLocaleString()} · densidad{" "}
                {sheet.sources.inegi.densityHabKm2 ? Math.round(sheet.sources.inegi.densityHabKm2).toLocaleString() : "—"} hab/km²
                <div className="mt-1 text-[10px] text-slate-400">Fuente: INEGI Censo 2020 (wscatgeo) — estimación por radio vía densidad municipal</div>
              </div>
            )}
            {sheet.demographics ? (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold">{formatNumber(sheet.demographics.population ?? 0)}</span>
                  <span className="text-xs text-slate-500">habitantes</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatNumber(sheet.demographics.households ?? 0)} hogares · ingreso promedio {formatCurrency(sheet.demographics.avgHouseholdIncome ?? 0, "MXN")}
                </div>
                <div className="mt-4">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="bg-emerald-500" style={{ width: `${sheet.demographics.socioeconomic?.abc1Pct ?? 0}%` }} />
                    <span className="bg-sky-500"    style={{ width: `${sheet.demographics.socioeconomic?.c2Pct  ?? 0}%` }} />
                    <span className="bg-amber-500"  style={{ width: `${sheet.demographics.socioeconomic?.cPct   ?? 0}%` }} />
                    <span className="bg-rose-500"   style={{ width: `${sheet.demographics.socioeconomic?.dPct   ?? 0}%` }} />
                    <span className="bg-slate-400"  style={{ width: `${sheet.demographics.socioeconomic?.ePct   ?? 0}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    ABC1 {sheet.demographics.socioeconomic?.abc1Pct ?? 0}% · C+ {sheet.demographics.socioeconomic?.c2Pct ?? 0}% · C {sheet.demographics.socioeconomic?.cPct ?? 0}% · D {sheet.demographics.socioeconomic?.dPct ?? 0}% · E {sheet.demographics.socioeconomic?.ePct ?? 0}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Sin datos.</div>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xs uppercase tracking-widest text-slate-500">Presencia comercial (OSM) · {radiusLabel(radius)}</h3>
              <SourceDot status={sheet.sources.commercial.status} />
            </div>
            {sheet.commercial ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(sheet.commercial.byCategory).map(([cat, info]) => (
                  <div key={cat} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs capitalize text-slate-600">{labelForCategory(cat)}</span>
                      <span className="text-lg font-semibold">{info.count}</span>
                    </div>
                    {info.brands.length > 0 && (
                      <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{info.brands.join(" · ")}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Sin datos.</div>
            )}
            {sheet.sources.commercial.error && (
              <div className="mt-3 text-[11px] text-amber-700">{sheet.sources.commercial.error}</div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <div>{sheet.branding.companyName} · Generado con UVIKT · {new Date(sheet.generatedAt).toLocaleString("es-MX")}</div>
          <div>Radio: {radiusLabel(radius)}</div>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          nav, button, select { display: none !important; }
        }
      `}</style>
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

function SourceDot({ status }: { status: string }) {
  const color = status === "success" ? "#10B981" : status === "partial" ? "#F59E0B" : "#EF4444";
  const label = status === "success" ? "live" : status === "partial" ? "parcial" : "offline";
  return (
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function labelForCategory(k: string) {
  const map: Record<string, string> = {
    retail: "Retail", banking: "Bancos", food: "Alimentos", automotive: "Automotriz", education: "Educación", healthcare: "Salud",
  };
  return map[k] ?? k;
}
