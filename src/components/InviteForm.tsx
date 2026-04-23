"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "broker" | "investor">("broker");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setResult(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Error");
      return;
    }
    const data = await res.json();
    setResult({ url: data.inviteUrl });
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={invite} className="card flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Invitar a alguien</h3>
      <div className="flex flex-wrap gap-2">
        <input className="input flex-1 min-w-48" type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="broker">Bróker</option>
          <option value="investor">Inversionista</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn-primary" disabled={busy}>{busy ? "Creando…" : "Generar invitación"}</button>
      </div>
      {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      {result && (
        <div className="rounded bg-emerald-50 p-3 text-xs">
          <div className="font-semibold text-emerald-800">✓ Invitación creada. Comparte este link manualmente (WhatsApp, correo, etc):</div>
          <div className="mt-1 flex gap-2 items-center">
            <code className="flex-1 break-all rounded bg-white px-2 py-1 text-[11px]">{result.url}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.url)} className="rounded bg-white px-2 py-1 underline">Copiar</button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-500">💡 UVIKT aún no envía emails automáticamente. Copia el link y mándalo tú.</p>
    </form>
  );
}
