"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", organizationName: "", role: "admin" as "admin" | "broker" | "investor",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Error en el registro");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold">Crear cuenta</h1>
        <p className="mb-6 text-sm text-slate-500">Configura tu organización y tu primer usuario admin.</p>

        <label className="label">Nombre</label>
        <input className="input mb-4" required value={form.name} onChange={(e) => set("name", e.target.value)} />

        <label className="label">Email</label>
        <input className="input mb-4" required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />

        <label className="label">Contraseña (mín 8)</label>
        <input className="input mb-4" required type="password" minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />

        <label className="label">Nombre de la organización</label>
        <input className="input mb-4" required value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} />

        <label className="label">Rol</label>
        <select className="input mb-6" value={form.role} onChange={(e) => set("role", e.target.value as typeof form.role)}>
          <option value="admin">Admin</option>
          <option value="broker">Bróker</option>
          <option value="investor">Inversionista</option>
        </select>

        {err && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}

        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Creando…" : "Crear cuenta"}</button>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-ink underline">Ingresa</Link>
        </p>
      </form>
    </main>
  );
}
