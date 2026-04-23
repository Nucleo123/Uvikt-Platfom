"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PropertyActions({ propertyId, status }: { propertyId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [share, setShare] = useState<{ shareUrl: string; pdfUrl: string } | null>(null);

  async function enrich() {
    setBusy("enrich");
    await fetch(`/api/properties/${propertyId}/enrich`, { method: "POST" });
    setBusy(null);
    // Give the inline queue ~1.5s, then refresh
    setTimeout(() => router.refresh(), 1500);
  }

  async function generate() {
    setBusy("report");
    const res = await fetch(`/api/properties/${propertyId}/report`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowPublic: true, expiresInDays: 30 }),
    });
    const data = await res.json();
    setBusy(null);
    if (res.ok) {
      setShare({ shareUrl: data.shareUrl, pdfUrl: data.pdfUrl });
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end">
        <a href={`/properties/${propertyId}/ficha-mercado`} className="btn-secondary">📊 Ficha de mercado</a>
        <button disabled={!!busy} onClick={enrich} className="btn-secondary">{busy === "enrich" ? "Enriqueciendo…" : "Re-enriquecer"}</button>
        <button disabled={!!busy} onClick={generate} className="btn-primary">{busy === "report" ? "Generando…" : "Reporte comercial"}</button>
      </div>
      {share && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-card">
          <div className="mb-1 font-medium text-ink">Reporte generado</div>
          <div><a className="underline" href={share.shareUrl} target="_blank" rel="noreferrer">Abrir enlace público</a></div>
          <div><a className="underline" href={share.pdfUrl} target="_blank" rel="noreferrer">Descargar PDF</a></div>
          <button
            className="mt-1 text-[11px] underline"
            onClick={() => { navigator.clipboard.writeText(share.shareUrl); }}
          >Copiar enlace</button>
        </div>
      )}
    </div>
  );
}
