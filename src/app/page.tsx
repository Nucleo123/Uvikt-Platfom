import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="flex items-center justify-between px-8 py-6">
        <Logo />
        <nav className="flex items-center gap-4">
          <Link href="/login" className="btn-ghost text-white hover:bg-white/10">Ingresar</Link>
          <Link href="/register" className="btn bg-brand-accent text-ink hover:bg-yellow-400">Crear cuenta</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-8 pb-24 pt-16 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-brand-accent">Property Intelligence</p>
        <h1 className="text-5xl font-semibold leading-tight md:text-6xl">
          Dispara. Valida.<br />Personaliza. Envía.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Desde una fotografía en sitio o una dirección validada, genera una ficha
          comercial con tus colores y logo — lista para enviar a tu cliente, sin imprimir.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/register" className="btn bg-brand-accent text-ink hover:bg-yellow-400">Empezar gratis</Link>
          <Link href="/login" className="btn border border-white/30 text-white hover:bg-white/10">Ingresar</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-8 pb-12 md:grid-cols-4">
        {[
          { n: "1", t: "DISPARA", d: "Captura desde móvil con geofoto, o dirección desde escritorio." },
          { n: "2", t: "VALIDA",  d: "Confirmación SEPOMEX + uso de suelo SEDUVI + demografía INEGI." },
          { n: "3", t: "PERSONALIZA", d: "Ficha con tus colores y logo, campos editables por bróker." },
          { n: "4", t: "ENVÍA",   d: "Enlace compartible + PDF exportable, sin necesidad de imprimir." },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-3 text-xs text-brand-accent">{s.n}</div>
            <div className="text-lg font-semibold">{s.t}</div>
            <div className="mt-2 text-sm text-white/60">{s.d}</div>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 px-8 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} UVIKT ·{" "}
        <Link href="/terms" className="hover:text-white/70 hover:underline">Términos</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-white/70 hover:underline">Aviso de Privacidad</Link>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 font-semibold tracking-wide">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a7 7 0 017 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 017-7z" fill="#E4B43C"/>
        <circle cx="12" cy="9" r="2.5" fill="#0E2A35"/>
      </svg>
      UVIKT
    </div>
  );
}
