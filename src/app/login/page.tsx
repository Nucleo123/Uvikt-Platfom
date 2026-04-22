"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("broker@demo.uvikt.mx");
  const [password, setPassword] = useState("demo12345");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Error al iniciar sesión");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-white md:flex">
        <div className="flex items-center gap-2 text-sm tracking-[0.3em]">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" /> UVIKT
        </div>
        <div>
          <h2 className="text-4xl font-semibold">Dispara. Valida.<br />Personaliza. Envía.</h2>
          <p className="mt-4 max-w-md text-white/70">
            Inteligencia de propiedades para brokers e inversionistas en México.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} UVIKT</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="mb-1 text-2xl font-semibold">Ingresar</h1>
          <p className="mb-6 text-sm text-slate-500">Demo: broker@demo.uvikt.mx · demo12345</p>

          <label className="label">Email</label>
          <input className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label className="label">Contraseña</label>
          <input className="input mb-6" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          {err && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta? <Link href="/register" className="font-medium text-ink underline">Crea una</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
