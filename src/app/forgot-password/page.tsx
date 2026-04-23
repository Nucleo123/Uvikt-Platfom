"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null); // holds the resetUrl (dev mode) or just "ok"
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Error");
      return;
    }
    const data = await res.json();
    setSent(data.resetUrl ?? "ok");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-500">Te mandaremos un link para restablecerla.</p>

        {!sent ? (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar link"}</button>
            <p className="text-center text-sm text-slate-500">
              <Link href="/login" className="underline">← Volver a ingresar</Link>
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
              Si existe una cuenta para <strong>{email}</strong>, te llegará un link para restablecer la contraseña.
            </div>
            {sent !== "ok" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold">💡 Modo desarrollo:</div>
                <div className="mt-1">Aún no enviamos emails. Usa este link directamente:</div>
                <a href={sent} className="mt-2 block break-all rounded bg-white px-2 py-1 text-[11px] font-mono underline">{sent}</a>
              </div>
            )}
            <Link href="/login" className="btn-secondary w-full">← Volver a ingresar</Link>
          </div>
        )}
      </div>
    </main>
  );
}
