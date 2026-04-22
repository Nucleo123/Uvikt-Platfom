"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MapView from "./MapView";

type Step = "method" | "capture" | "details" | "confirm";
type Method = "mobile_photo" | "desktop_address";

type Form = {
  method: Method;
  transactionType: "sale" | "rent";
  title: string;
  description: string;
  priceAmount: string;
  address: { line1: string; line2: string; neighborhood: string; municipality: string; state: string; postalCode: string };
  location: { lat: number; lng: number; source: string } | null;
  photo: { url: string; storageKey: string } | null;
  surfaceM2: string;
  frontageM: string;
  depthM: string;
  propertyUse: string;
  isCorner: boolean;
  levels: string;
  localUnits: string;
  notableBrands: string;
};

const empty: Form = {
  method: "desktop_address",
  transactionType: "sale",
  title: "",
  description: "",
  priceAmount: "",
  address: { line1: "", line2: "", neighborhood: "", municipality: "", state: "", postalCode: "" },
  location: null,
  photo: null,
  surfaceM2: "", frontageM: "", depthM: "",
  propertyUse: "comercio",
  isCorner: false,
  levels: "", localUnits: "",
  notableBrands: "",
};

export default function PropertyWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("method");
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function setAddr<K extends keyof Form["address"]>(k: K, v: string) { setForm((f) => ({ ...f, address: { ...f.address, [k]: v } })); }

  async function uploadPhoto(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    set("photo", { url: data.url, storageKey: data.key });
  }

  async function captureGeolocation() {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          set("location", { lat: pos.coords.latitude, lng: pos.coords.longitude, source: "geophoto" });
          resolve();
        },
        (e) => reject(e),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function geocodeIfNeeded() {
    if (form.location) return;
    const q = [form.address.line1, form.address.neighborhood, form.address.municipality, form.address.state, form.address.postalCode, "México"]
      .filter(Boolean).join(", ");
    if (!q) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.coords) set("location", { lat: data.coords.lat, lng: data.coords.lng, source: "geocoded" });
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const payload = {
        inputMethod: form.method,
        transactionType: form.transactionType,
        title: form.title || undefined,
        description: form.description || undefined,
        priceAmount: form.priceAmount ? parseFloat(form.priceAmount) : undefined,
        priceCurrency: "MXN",
        address: form.address,
        location: form.location ? { ...form.location, kind: form.method === "mobile_photo" ? "original" : "geocoded" as const } : undefined,
        photoUrl: form.photo?.url,
        photoStorageKey: form.photo?.storageKey,
        surfaceM2: form.surfaceM2 ? parseFloat(form.surfaceM2) : undefined,
        frontageM: form.frontageM ? parseFloat(form.frontageM) : undefined,
        depthM: form.depthM ? parseFloat(form.depthM) : undefined,
        propertyUse: form.propertyUse,
        isCorner: form.isCorner,
        levels: form.levels ? parseInt(form.levels, 10) : undefined,
        localUnits: form.localUnits ? parseInt(form.localUnits, 10) : undefined,
        notableBrands: form.notableBrands || undefined,
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

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        {(["method", "capture", "details", "confirm"] as Step[]).map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${step === s ? "text-ink font-medium" : ""}`}>
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${step === s ? "border-ink bg-ink text-white" : "border-slate-300"}`}>{i + 1}</span>
            {labelOf(s)}
            {i < 3 && <span className="mx-1 text-slate-300">/</span>}
          </li>
        ))}
      </ol>

      <div className="card">
        {step === "method" && (
          <div className="grid gap-4 md:grid-cols-2">
            <MethodCard
              title="Desde móvil"
              subtitle="Toma una foto georreferenciada en sitio"
              badge="DISPARA"
              selected={form.method === "mobile_photo"}
              onClick={() => set("method", "mobile_photo")}
            />
            <MethodCard
              title="Desde escritorio"
              subtitle="Ingresa una dirección validada"
              badge="VALIDA"
              selected={form.method === "desktop_address"}
              onClick={() => set("method", "desktop_address")}
            />
            <div className="md:col-span-2 flex justify-end pt-2">
              <button className="btn-primary" onClick={() => setStep("capture")}>Continuar →</button>
            </div>
          </div>
        )}

        {step === "capture" && form.method === "mobile_photo" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Captura</h2>
            <p className="text-sm text-slate-500">Toma una foto y permite acceso a la ubicación para georreferenciarla.</p>

            <label className="label">Foto de la propiedad</label>
            <input type="file" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await uploadPhoto(f); }} className="input" />
            {form.photo && <img src={form.photo.url} alt="preview" className="h-48 w-full rounded-lg object-cover" />}

            <div>
              <button className="btn-secondary" onClick={() => captureGeolocation().catch((e) => setErr(e.message))} type="button">
                {form.location ? "Ubicación capturada ✓" : "Capturar ubicación GPS"}
              </button>
              {form.location && <span className="ml-2 text-xs text-slate-500">{form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}</span>}
            </div>

            <Nav back={() => setStep("method")} next={() => setStep("details")} nextDisabled={!form.photo || !form.location} />
          </div>
        )}

        {step === "capture" && form.method === "desktop_address" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Dirección</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Calle y número"><input className="input" value={form.address.line1} onChange={(e) => setAddr("line1", e.target.value)} /></Field>
              <Field label="Interior / Local"><input className="input" value={form.address.line2} onChange={(e) => setAddr("line2", e.target.value)} /></Field>
              <Field label="Colonia"><input className="input" value={form.address.neighborhood} onChange={(e) => setAddr("neighborhood", e.target.value)} /></Field>
              <Field label="Municipio / Alcaldía"><input className="input" value={form.address.municipality} onChange={(e) => setAddr("municipality", e.target.value)} /></Field>
              <Field label="Estado"><input className="input" value={form.address.state} onChange={(e) => setAddr("state", e.target.value)} /></Field>
              <Field label="Código postal"><input className="input" value={form.address.postalCode} onChange={(e) => setAddr("postalCode", e.target.value)} /></Field>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={geocodeIfNeeded}>Geolocalizar dirección</button>
              {form.location && <span className="text-xs text-slate-500">Pin: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}</span>}
            </div>

            {form.location && (
              <MapView
                key={`${form.location.lat},${form.location.lng}`}
                center={form.location}
                markers={[form.location]}
                draggable
                onPinChange={(lat, lng) => set("location", { lat, lng, source: "user_pin" })}
                className="h-64 w-full rounded-xl overflow-hidden"
              />
            )}

            <Nav back={() => setStep("method")} next={() => setStep("details")} nextDisabled={!form.address.line1} />
          </div>
        )}

        {step === "details" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Detalles comerciales</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título"><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Local comercial esquina" /></Field>
              <Field label="Operación">
                <select className="input" value={form.transactionType} onChange={(e) => set("transactionType", e.target.value as "sale" | "rent")}>
                  <option value="sale">Venta</option>
                  <option value="rent">Renta</option>
                </select>
              </Field>
              <Field label="Precio (MXN)"><input className="input" type="number" value={form.priceAmount} onChange={(e) => set("priceAmount", e.target.value)} /></Field>
              <Field label="Giro">
                <select className="input" value={form.propertyUse} onChange={(e) => set("propertyUse", e.target.value)}>
                  <option value="comercio">Comercio</option>
                  <option value="habitacional">Habitacional</option>
                  <option value="industrial">Industrial</option>
                  <option value="mixto">Mixto</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
              <Field label="Superficie (m²)"><input className="input" type="number" value={form.surfaceM2} onChange={(e) => set("surfaceM2", e.target.value)} /></Field>
              <Field label="Frente (m)"><input className="input" type="number" value={form.frontageM} onChange={(e) => set("frontageM", e.target.value)} /></Field>
              <Field label="Fondo (m)"><input className="input" type="number" value={form.depthM} onChange={(e) => set("depthM", e.target.value)} /></Field>
              <Field label="Niveles"><input className="input" type="number" value={form.levels} onChange={(e) => set("levels", e.target.value)} /></Field>
              <Field label="No. de locales"><input className="input" type="number" value={form.localUnits} onChange={(e) => set("localUnits", e.target.value)} /></Field>
              <Field label="Esquina">
                <label className="inline-flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={form.isCorner} onChange={(e) => set("isCorner", e.target.checked)} />
                  <span className="text-sm">Es esquina</span>
                </label>
              </Field>
              <Field label="Marcas vecinas notables" span={2}>
                <input className="input" value={form.notableBrands} onChange={(e) => set("notableBrands", e.target.value)} placeholder="Starbucks, BBVA, Oxxo…" />
              </Field>
              <Field label="Descripción" span={2}>
                <textarea className="input min-h-24" value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            <Nav back={() => setStep("capture")} next={() => setStep("confirm")} />
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirmar y enriquecer</h2>
            <p className="text-sm text-slate-500">
              Al crear la propiedad ejecutaremos enriquecimiento con SEPOMEX, SEDUVI, INEGI y fuentes comerciales.
            </p>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="font-medium">{form.title || "(sin título)"}</div>
              <div className="text-slate-600">{form.address.line1}, {form.address.neighborhood} · {form.address.municipality}, {form.address.state} {form.address.postalCode}</div>
              <div className="text-slate-500">{form.transactionType === "sale" ? "Venta" : "Renta"} · {form.propertyUse}</div>
            </div>
            {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <Nav back={() => setStep("details")} next={submit} nextLabel={busy ? "Creando…" : "Crear propiedad"} nextDisabled={busy} />
          </div>
        )}
      </div>
    </div>
  );
}

function labelOf(s: Step) {
  return { method: "Método", capture: "Captura", details: "Detalles", confirm: "Confirmar" }[s];
}

function MethodCard({ title, subtitle, badge, selected, onClick }: { title: string; subtitle: string; badge: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${selected ? "border-ink bg-ink/5" : "border-slate-200 hover:border-slate-300"}`}>
      <span className="text-[10px] uppercase tracking-widest text-brand-accent">{badge}</span>
      <div className="mt-1 text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
    </button>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: 1 | 2 }) {
  return <div className={span === 2 ? "md:col-span-2" : undefined}><label className="label">{label}</label>{children}</div>;
}

function Nav({ back, next, nextLabel, nextDisabled }: { back?: () => void; next: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return (
    <div className="flex justify-between pt-4">
      {back ? <button type="button" onClick={back} className="btn-ghost">← Atrás</button> : <span />}
      <button type="button" onClick={next} disabled={nextDisabled} className="btn-primary">{nextLabel ?? "Continuar →"}</button>
    </div>
  );
}
