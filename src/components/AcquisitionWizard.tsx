"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MapView from "./MapView";

type Step = "basics" | "people" | "occupancy" | "docs" | "confirm";

type OrgMember = { id: string; name: string | null; email: string };

type Form = {
  title: string;
  propertyType: "terreno" | "local" | "bodega" | "otro";
  surfaceM2: string;
  priceAmount: string;
  description: string;
  address: { line1: string; line2: string; neighborhood: string; municipality: string; state: string; postalCode: string };
  location: { lat: number; lng: number } | null;
  responsableInternoId: string;
  responsableExterno: { name: string; email: string; phone: string };
  occupancyStatus: "rented" | "vacant";
  currentTenant: string;
  currentRent: string;
  potentialTenant: string;
  photo: { url: string; storageKey: string } | null;
  seduviFicha: {
    url: string;
    storageKey: string;
    extracted?: {
      cuentaCatastral?: string;
      usoSueloCodigo?: string;
      usoSueloTexto?: string;
      superficiePredioM2?: number;
      frenteM?: number;
      colonia?: string;
      alcaldia?: string;
      codigoPostal?: string;
    } | null;
    parseError?: string | null;
  } | null;
  kmz: { url: string; storageKey: string; polygonGeoJson?: string | null; centroid?: { lat: number; lng: number } | null } | null;
};

const empty: Form = {
  title: "",
  propertyType: "local",
  surfaceM2: "",
  priceAmount: "",
  description: "",
  address: { line1: "", line2: "", neighborhood: "", municipality: "", state: "", postalCode: "" },
  location: null,
  responsableInternoId: "",
  responsableExterno: { name: "", email: "", phone: "" },
  occupancyStatus: "vacant",
  currentTenant: "",
  currentRent: "",
  potentialTenant: "",
  photo: null,
  seduviFicha: null,
  kmz: null,
};

export default function AcquisitionWizard({ members }: { members: OrgMember[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function upload(file: File, kind: "photo" | "seduvi" | "kmz") {
    const body = new FormData();
    body.append("file", file);
    const endpoint = kind === "kmz" ? "/api/upload/kmz" : kind === "seduvi" ? "/api/upload/seduvi" : "/api/upload";
    const res = await fetch(endpoint, { method: "POST", body });
    if (!res.ok) { setErr("Error al subir archivo"); return; }
    const data = await res.json();
    if (kind === "photo") set("photo", { url: data.url, storageKey: data.key });
    if (kind === "seduvi") {
      set("seduviFicha", { url: data.url, storageKey: data.key, extracted: data.extracted, parseError: data.parseError });
      // Auto-fill surface + postal code from parsed SEDUVI data if broker hasn't filled them
      if (data.extracted?.superficiePredioM2 && !form.surfaceM2) set("surfaceM2", String(data.extracted.superficiePredioM2));
      if (data.extracted?.codigoPostal && !form.address.postalCode) set("address", { ...form.address, postalCode: data.extracted.codigoPostal });
      if (data.extracted?.colonia && !form.address.neighborhood) set("address", { ...form.address, neighborhood: data.extracted.colonia });
      if (data.extracted?.alcaldia && !form.address.municipality) set("address", { ...form.address, municipality: data.extracted.alcaldia });
    }
    if (kind === "kmz") {
      set("kmz", { url: data.url, storageKey: data.key, polygonGeoJson: data.polygonGeoJson, centroid: data.centroid });
      if (data.centroid && !form.location) set("location", data.centroid);
    }
  }

  async function geocodeIfNeeded() {
    if (form.location) return;
    const q = [form.address.line1, form.address.neighborhood, form.address.municipality, form.address.state, form.address.postalCode, "México"].filter(Boolean).join(", ");
    if (!q) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.coords) set("location", data.coords);
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const payload = {
        inputMethod: "manual",
        transactionType: "acquisition",
        acquisitionStage: "analyzing",
        propertyType: form.propertyType,
        title: form.title || undefined,
        description: form.description || undefined,
        priceAmount: form.priceAmount ? parseFloat(form.priceAmount) : undefined,
        surfaceM2: form.surfaceM2 ? parseFloat(form.surfaceM2) : undefined,
        address: form.address,
        location: form.location ? { ...form.location, kind: "geocoded" as const, source: form.kmz?.centroid ? "kmz" : "user" } : undefined,
        photoUrl: form.photo?.url,
        photoStorageKey: form.photo?.storageKey,
        seduviFichaUploadedUrl: form.seduviFicha?.url,
        seduviExtracted: form.seduviFicha?.extracted ?? undefined,
        kmzUploadedUrl: form.kmz?.url,
        kmzPolygonGeoJson: form.kmz?.polygonGeoJson ?? undefined,
        responsableInternoId: form.responsableInternoId || undefined,
        responsableExternoName: form.responsableExterno.name || undefined,
        responsableExternoEmail: form.responsableExterno.email || undefined,
        responsableExternoPhone: form.responsableExterno.phone || undefined,
        occupancyStatus: form.occupancyStatus,
        currentTenant: form.occupancyStatus === "rented" ? form.currentTenant || undefined : undefined,
        currentRent: form.occupancyStatus === "rented" && form.currentRent ? parseFloat(form.currentRent) : undefined,
        potentialTenant: form.occupancyStatus === "vacant" ? form.potentialTenant || undefined : undefined,
      };
      const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al crear propiedad");
      }
      const data = await res.json();
      router.push(`/properties/${data.property.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const stepLabel: Record<Step, string> = { basics: "Básicos", people: "Responsables", occupancy: "Ocupación", docs: "Documentos", confirm: "Confirmar" };

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-6 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        {(["basics", "people", "occupancy", "docs", "confirm"] as Step[]).map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${step === s ? "text-ink font-medium" : ""}`}>
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${step === s ? "border-ink bg-ink text-white" : "border-slate-300"}`}>{i + 1}</span>
            {stepLabel[s]}
            {i < 4 && <span className="mx-1 text-slate-300">/</span>}
          </li>
        ))}
      </ol>

      <div className="card">
        {step === "basics" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Inmueble</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título / referencia interna" span={2}>
                <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Local esquina Insurgentes" />
              </Field>
              <Field label="Tipo de inmueble">
                <select className="input" value={form.propertyType} onChange={(e) => set("propertyType", e.target.value as Form["propertyType"])}>
                  <option value="terreno">Terreno</option>
                  <option value="local">Local</option>
                  <option value="bodega">Bodega</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
              <Field label="Superficie (m²)"><input className="input" type="number" value={form.surfaceM2} onChange={(e) => set("surfaceM2", e.target.value)} /></Field>
              <Field label="Precio de venta (MXN)" span={2}><input className="input" type="number" value={form.priceAmount} onChange={(e) => set("priceAmount", e.target.value)} /></Field>

              <Field label="Calle y número" span={2}><input className="input" value={form.address.line1} onChange={(e) => set("address", { ...form.address, line1: e.target.value })} /></Field>
              <Field label="Colonia"><input className="input" value={form.address.neighborhood} onChange={(e) => set("address", { ...form.address, neighborhood: e.target.value })} /></Field>
              <Field label="Alcaldía / Municipio"><input className="input" value={form.address.municipality} onChange={(e) => set("address", { ...form.address, municipality: e.target.value })} /></Field>
              <Field label="Estado"><input className="input" value={form.address.state} onChange={(e) => set("address", { ...form.address, state: e.target.value })} /></Field>
              <Field label="CP"><input className="input" value={form.address.postalCode} onChange={(e) => set("address", { ...form.address, postalCode: e.target.value })} /></Field>
            </div>
            <Nav next={() => setStep("people")} nextDisabled={!form.address.line1 || !form.title} />
          </div>
        )}

        {step === "people" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Responsables</h2>
            <div className="space-y-4">
              <Field label="Responsable interno">
                <select className="input" value={form.responsableInternoId} onChange={(e) => set("responsableInternoId", e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                </select>
              </Field>

              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Responsable externo (broker)</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Nombre"><input className="input" value={form.responsableExterno.name} onChange={(e) => set("responsableExterno", { ...form.responsableExterno, name: e.target.value })} /></Field>
                  <Field label="Email"><input className="input" type="email" value={form.responsableExterno.email} onChange={(e) => set("responsableExterno", { ...form.responsableExterno, email: e.target.value })} /></Field>
                  <Field label="Teléfono"><input className="input" value={form.responsableExterno.phone} onChange={(e) => set("responsableExterno", { ...form.responsableExterno, phone: e.target.value })} /></Field>
                </div>
              </div>
            </div>
            <Nav back={() => setStep("basics")} next={() => setStep("occupancy")} />
          </div>
        )}

        {step === "occupancy" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Condición actual</h2>
            <div className="flex gap-3">
              <OccCard label="Rentado"    selected={form.occupancyStatus === "rented"} onClick={() => set("occupancyStatus", "rented")} />
              <OccCard label="Vacío"      selected={form.occupancyStatus === "vacant"} onClick={() => set("occupancyStatus", "vacant")} />
            </div>

            {form.occupancyStatus === "rented" && (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Inquilino actual"><input className="input" value={form.currentTenant} onChange={(e) => set("currentTenant", e.target.value)} placeholder="Ej. Starbucks" /></Field>
                <Field label="Renta mensual (MXN)"><input className="input" type="number" value={form.currentRent} onChange={(e) => set("currentRent", e.target.value)} /></Field>
              </div>
            )}

            {form.occupancyStatus === "vacant" && (
              <Field label="Inquilino potencial (marca / tenant objetivo)">
                <input className="input" value={form.potentialTenant} onChange={(e) => set("potentialTenant", e.target.value)} placeholder="Ej. BBVA, Farmacias Guadalajara…" />
              </Field>
            )}
            <Nav back={() => setStep("people")} next={() => setStep("docs")} />
          </div>
        )}

        {step === "docs" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Documentos</h2>

            <div>
              <label className="label">Foto del inmueble (opcional)</label>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "photo"); }} className="input" />
              {form.photo && <img src={form.photo.url} alt="" className="mt-2 h-32 rounded-lg object-cover" />}
            </div>

            <div>
              <label className="label">Ficha SEDUVI (PDF de uso de suelo)</label>
              <input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "seduvi"); }} className="input" />
              {form.seduviFicha && (
                <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs">
                  <div className="font-semibold text-emerald-800">✓ Ficha SEDUVI procesada</div>
                  {form.seduviFicha.extracted ? (
                    <div className="mt-1 grid grid-cols-2 gap-1 text-emerald-900">
                      {form.seduviFicha.extracted.cuentaCatastral && <div><b>Cuenta catastral:</b> {form.seduviFicha.extracted.cuentaCatastral}</div>}
                      {form.seduviFicha.extracted.usoSueloCodigo && <div><b>Uso de suelo:</b> {form.seduviFicha.extracted.usoSueloCodigo}</div>}
                      {form.seduviFicha.extracted.superficiePredioM2 && <div><b>Superficie:</b> {form.seduviFicha.extracted.superficiePredioM2} m²</div>}
                      {form.seduviFicha.extracted.frenteM && <div><b>Frente:</b> {form.seduviFicha.extracted.frenteM} m</div>}
                      {form.seduviFicha.extracted.colonia && <div><b>Colonia:</b> {form.seduviFicha.extracted.colonia}</div>}
                      {form.seduviFicha.extracted.codigoPostal && <div><b>CP:</b> {form.seduviFicha.extracted.codigoPostal}</div>}
                    </div>
                  ) : (
                    <div className="mt-1 text-amber-700">PDF guardado, pero no se pudo extraer información estructurada. {form.seduviFicha.parseError ? `(${form.seduviFicha.parseError})` : ""}</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="label">Archivo KMZ / KML (polígono del predio desde Google Earth)</label>
              <input type="file" accept=".kmz,.kml" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "kmz"); }} className="input" />
              {form.kmz?.centroid && <div className="mt-1 text-xs text-emerald-700">✓ KMZ cargado · polígono detectado · pin ubicado en {form.kmz.centroid.lat.toFixed(5)}, {form.kmz.centroid.lng.toFixed(5)}</div>}
              {form.kmz && !form.kmz.centroid && <div className="mt-1 text-xs text-amber-700">KMZ cargado pero no se pudo extraer el polígono. El archivo se guarda igual.</div>}
            </div>

            {!form.location && form.address.line1 && (
              <button type="button" onClick={geocodeIfNeeded} className="btn-secondary">Geolocalizar dirección (si no subiste KMZ)</button>
            )}

            {form.location && (
              <MapView
                key={`${form.location.lat},${form.location.lng}`}
                center={form.location}
                markers={[form.location]}
                polygonGeoJson={form.kmz?.polygonGeoJson ?? null}
                className="h-64 w-full rounded-xl overflow-hidden"
              />
            )}

            <Nav back={() => setStep("occupancy")} next={() => setStep("confirm")} />
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirmar</h2>
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1">
              <div className="font-medium">{form.title || "(sin título)"} <span className="text-xs text-slate-500">· {form.propertyType}</span></div>
              <div className="text-slate-600">{form.address.line1}, {form.address.neighborhood} · {form.address.municipality}, {form.address.state} {form.address.postalCode}</div>
              <div className="text-slate-500">
                {form.priceAmount && <>Precio: ${Number(form.priceAmount).toLocaleString()} MXN · </>}
                {form.surfaceM2 && <>Sup: {form.surfaceM2} m² · </>}
                {form.occupancyStatus === "rented" ? `Rentado a ${form.currentTenant || "—"}` : "Vacío"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {form.seduviFicha && "✓ SEDUVI · "}
                {form.kmz && "✓ KMZ · "}
                {form.photo && "✓ Foto"}
              </div>
            </div>
            <p className="text-xs text-slate-500">Se te asignará un número de ticket automáticamente y el inmueble entrará al pipeline como "Analizando".</p>
            {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <Nav back={() => setStep("docs")} next={submit} nextLabel={busy ? "Creando…" : "Crear inmueble"} nextDisabled={busy} />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: 1 | 2 }) {
  return <div className={span === 2 ? "md:col-span-2" : undefined}><label className="label">{label}</label>{children}</div>;
}

function OccCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-xl border p-4 text-left transition ${selected ? "border-ink bg-ink/5" : "border-slate-200 hover:border-slate-300"}`}>
      <div className="text-base font-semibold">{label}</div>
    </button>
  );
}

function Nav({ back, next, nextLabel, nextDisabled }: { back?: () => void; next: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="flex justify-between pt-4">
      {back ? <button type="button" onClick={back} className="btn-ghost">← Atrás</button> : <span />}
      <button type="button" onClick={next} disabled={nextDisabled} className="btn-primary">{nextLabel ?? "Continuar →"}</button>
    </div>
  );
}
