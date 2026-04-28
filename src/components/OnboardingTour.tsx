"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "uvikt_onboarding_seen_v1";

const STEPS = [
  {
    title: "Bienvenido a UVIKT",
    body: "Una plataforma para organizar y analizar tu pipeline de adquisiciones inmobiliarias.",
    cta: null,
  },
  {
    title: "1. Carga tus inmuebles",
    body: "Desde 'Nuevo inmueble' llenas el formulario en 5 pasos: básicos, responsables, condición (rentado/vacío), documentos (SEDUVI + KMZ). Al subir la ficha SEDUVI, se extraen automáticamente uso de suelo, superficie y cuenta catastral.",
    cta: { href: "/properties/new", label: "Crear primer inmueble" },
  },
  {
    title: "2. Controla el pipeline con semáforos",
    body: "Cada inmueble arranca en 'Analizando'. Lo mueves entre Autorizado / Cancelado / En firma / Firmado en la pantalla del inmueble o desde el tablero Kanban.",
    cta: { href: "/adquisiciones", label: "Ver pipeline" },
  },
  {
    title: "3. Genera ficha de mercado",
    body: "Desde cualquier inmueble, click en 'Ficha de mercado'. Se genera un one-pager con demografía INEGI real, presencia comercial de OSM, uso de suelo, y un mapa con radio ajustable (RTZ).",
    cta: null,
  },
  {
    title: "4. Comparte con tu cliente",
    body: "Desde la ficha de mercado, 'Compartir link' genera un URL público (sin login requerido) que puedes mandar por WhatsApp o correo. También tiene botón de PDF.",
    cta: null,
  },
  {
    title: "5. Invita a tu equipo",
    body: "En Admin → Usuarios puedes crear invitaciones con link. Aún no mandamos email automáticamente: copias el link y lo compartes tú.",
    cta: { href: "/admin/users", label: "Invitar usuarios" },
  },
];

export default function OnboardingTour({ userName }: { userName: string }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function done() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">Tour · {step + 1} / {STEPS.length}</div>
          <button onClick={done} className="text-xs text-slate-500 hover:text-ink">Saltar</button>
        </div>
        <h2 className="mb-2 text-xl font-semibold">{s.title}{step === 0 && userName ? `, ${userName.split(" ")[0]}` : ""}</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">{s.body}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-ink" : "bg-slate-200"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-ghost">Atrás</button>}
            {s.cta && (
              <Link href={s.cta.href} onClick={done} className="btn-secondary">{s.cta.label}</Link>
            )}
            {!isLast ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary">Siguiente</button>
            ) : (
              <button onClick={done} className="btn-primary">Comenzar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
