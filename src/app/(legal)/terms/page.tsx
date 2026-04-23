export const metadata = { title: "Términos y Condiciones — UVIKT" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="mb-6 text-3xl font-semibold">Términos y Condiciones de Uso</h1>
      <p className="text-sm text-slate-500">Última actualización: 22 de abril de 2026</p>

      <div className="prose prose-slate mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <p className="text-xs italic text-amber-700">
          ⚠️ Plantilla preliminar. Antes de operación comercial, sustituir por redacción revisada por abogado mexicano familiarizado con SaaS y LFPDPPP.
        </p>

        <section>
          <h2 className="text-lg font-semibold">1. Aceptación</h2>
          <p>Al acceder a la plataforma UVIKT ("UVIKT", "la Plataforma"), el usuario acepta estos Términos y se obliga a cumplirlos. Si no está de acuerdo, debe abstenerse de utilizar la Plataforma.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Descripción del servicio</h2>
          <p>UVIKT es una plataforma SaaS que permite a corredores (brokers) e inversionistas inmobiliarios en México organizar su pipeline de adquisiciones, cargar información de inmuebles, enriquecerla con datos de fuentes públicas y privadas, y generar fichas comerciales compartibles.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Cuentas de usuario</h2>
          <p>El usuario es responsable de mantener la confidencialidad de sus credenciales y de toda actividad realizada bajo su cuenta. UVIKT puede suspender cuentas que violen estos términos.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Propiedad intelectual</h2>
          <p>El software, diseño y contenidos de UVIKT son propiedad de su titular. La información cargada por cada organización (inmuebles, documentos, fotos) permanece propiedad de dicha organización, quien otorga a UVIKT una licencia limitada para procesarla y mostrarla según la funcionalidad de la Plataforma.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Fuentes de datos externas</h2>
          <p>UVIKT cruza información de SEPOMEX, SEDUVI, INEGI, OpenStreetMap y otras fuentes públicas. La exactitud, disponibilidad y vigencia de dicha información es responsabilidad de cada fuente. UVIKT no garantiza integridad total de los datos externos y no debe usarse como único criterio para decisiones de compra o inversión.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Limitación de responsabilidad</h2>
          <p>UVIKT se proporciona "tal cual". Su titular no será responsable por daños indirectos, lucro cesante o pérdidas derivadas de decisiones tomadas a partir de la información mostrada.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Modificaciones</h2>
          <p>Los Términos pueden actualizarse. Los cambios se publicarán en esta misma página; el uso continuado constituye aceptación.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Jurisdicción</h2>
          <p>Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales de la Ciudad de México.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Contacto</h2>
          <p>Para cualquier pregunta sobre estos Términos: <a href="/privacy" className="underline">Aviso de Privacidad</a>.</p>
        </section>
      </div>
    </main>
  );
}
