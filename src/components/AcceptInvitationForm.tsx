"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcceptInvitationForm({ token, email, isExistingUser }: { token: string; email: string; isExistingUser: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/auth/accept-invitation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, name: name || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Error");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Email</label>
        <input className="input" value={email} disabled />
      </div>
      {!isExistingUser && (
        <div>
          <label className="label">Tu nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      )}
      <div>
        <label className="label">{isExistingUser ? "Contraseña actual" : "Crea una contraseña (mín 8)"}</label>
        <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Aceptando…" : "Aceptar invitación"}</button>
    </form>
  );
}
