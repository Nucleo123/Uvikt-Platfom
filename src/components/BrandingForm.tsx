"use client";
import { useState } from "react";

type Fields = {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  footerNote: string;
  demographicRadiiMeters: string;
};

export default function BrandingForm({ initial }: { initial: Fields }) {
  const [f, setF] = useState<Fields>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof Fields>(k: K, v: Fields[K]) { setF((s) => ({ ...s, [k]: v })); }

  async function uploadLogo(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) return;
    const data = await res.json();
    set("logoUrl", data.url);
  }

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/branding", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        logoUrl: f.logoUrl || null,
        contactEmail: f.contactEmail || null,
        contactPhone: f.contactPhone || null,
        footerNote: f.footerNote || null,
      }),
    });
    setBusy(false);
    setMsg(res.ok ? "Guardado ✓" : "Error al guardar");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card space-y-3">
        <div>
          <label className="label">Nombre de la empresa</label>
          <input className="input" value={f.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </div>
        <div>
          <label className="label">Logotipo</label>
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogo(file); }} className="input" />
          {f.logoUrl && <img src={f.logoUrl} alt="logo" className="mt-2 h-16 rounded" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Color primario</label>
            <input type="color" value={f.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-10 w-full rounded border border-slate-200" />
          </div>
          <div>
            <label className="label">Color de acento</label>
            <input type="color" value={f.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-10 w-full rounded border border-slate-200" />
          </div>
        </div>
        <div>
          <label className="label">Email de contacto</label>
          <input className="input" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
        </div>
        <div>
          <label className="label">Nota de pie</label>
          <input className="input" value={f.footerNote} onChange={(e) => set("footerNote", e.target.value)} />
        </div>
        <div>
          <label className="label">Radios demográficos (metros, CSV)</label>
          <input className="input" value={f.demographicRadiiMeters} onChange={(e) => set("demographicRadiiMeters", e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">Ej. 250,500 para el mock original · 500,1000,5000 para la descripción completa.</p>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? "Guardando…" : "Guardar"}</button>
        {msg && <div className="text-sm">{msg}</div>}
      </section>

      <section className="card">
        <div className="mb-3 text-xs uppercase tracking-widest text-slate-500">Vista previa</div>
        <div className="rounded-xl p-6 text-white" style={{ background: f.primaryColor }}>
          <div className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: f.accentColor }}>Ficha comercial</div>
          <div className="text-xl font-semibold">{f.companyName || "Tu empresa"}</div>
          <div className="mt-1 text-sm text-white/70">{f.contactEmail} {f.contactPhone && ` · ${f.contactPhone}`}</div>
          <div className="mt-4 h-1 w-full" style={{ background: f.accentColor }} />
          {f.logoUrl && <img src={f.logoUrl} alt="" className="mt-4 h-10 rounded bg-white/10 p-1" />}
        </div>
      </section>
    </div>
  );
}
