"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACQUISITION_STAGES, type AcquisitionStage } from "@/lib/stages";

export default function StageChanger({ propertyId, current }: { propertyId: string; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<AcquisitionStage>(current as AcquisitionStage);

  async function change(newStage: AcquisitionStage) {
    if (newStage === stage) return;
    setBusy(true);
    const res = await fetch(`/api/properties/${propertyId}/stage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setBusy(false);
    if (res.ok) { setStage(newStage); router.refresh(); }
  }

  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Etapa actual (semáforo)</div>
      <div className="grid grid-cols-5 gap-1">
        {ACQUISITION_STAGES.map((s) => {
          const active = s.key === stage;
          return (
            <button
              key={s.key}
              onClick={() => change(s.key)}
              disabled={busy}
              className="rounded-lg px-2 py-2 text-[11px] font-medium transition disabled:opacity-50"
              style={{
                background: active ? s.color : s.bg,
                color: active ? "#fff" : s.color,
                outline: active ? `2px solid ${s.color}` : "none",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
