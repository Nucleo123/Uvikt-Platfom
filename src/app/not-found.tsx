import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md">
        <div className="mb-4 text-[10px] uppercase tracking-[0.3em] text-brand-accent">UVIKT</div>
        <div className="mb-2 text-7xl font-bold text-ink">404</div>
        <h1 className="mb-3 text-xl font-semibold text-ink">No encontramos esto</h1>
        <p className="mb-6 text-sm text-slate-600">El enlace puede estar roto o el recurso fue movido.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Ir al dashboard</Link>
          <Link href="/" className="btn-secondary">Inicio</Link>
        </div>
      </div>
    </div>
  );
}
