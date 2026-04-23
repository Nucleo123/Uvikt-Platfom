"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Global error boundary. Caught by Next.js whenever an unhandled error reaches
 * the router. Keeps the user in a branded UVIKT state instead of a bare stack trace.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // TODO: wire Sentry / OpenTelemetry here
    console.error("[app:error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-[10px] uppercase tracking-[0.3em] text-brand-accent">UVIKT</div>
        <h1 className="mb-3 text-3xl font-semibold text-ink">Algo salió mal</h1>
        <p className="mb-6 text-sm text-slate-600">
          Encontramos un error procesando tu solicitud. El equipo ya fue notificado.
          {error.digest && <><br /><span className="mt-2 inline-block font-mono text-xs text-slate-400">ID: {error.digest}</span></>}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">Reintentar</button>
          <Link href="/dashboard" className="btn-secondary">Ir al dashboard</Link>
        </div>
      </div>
    </div>
  );
}
