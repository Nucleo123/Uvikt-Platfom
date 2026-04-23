export const metadata = { title: "Aviso de Privacidad — UVIKT" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="mb-6 text-3xl font-semibold">Aviso de Privacidad Integral</h1>
      <p className="text-sm text-slate-500">Conforme a la LFPDPPP · Última actualización: 22 de abril de 2026</p>

      <div className="prose prose-slate mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <p className="text-xs italic text-amber-700">
          ⚠️ Plantilla preliminar. Antes de operación comercial, sustituir por Aviso de Privacidad redactado por abogado especializado en LFPDPPP y completar con razón social, RFC y domicilio del responsable.
        </p>

        <section>
          <h2 className="text-lg font-semibold">1. Responsable</h2>
          <p><strong>[Razón Social]</strong>, con domicilio en [dirección], Ciudad de México, México ("UVIKT"), es responsable del tratamiento de sus datos personales, protección que atiende lo dispuesto en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Datos que recabamos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>De identificación: nombre, correo electrónico, teléfono.</li>
            <li>De contacto profesional: organización, cargo.</li>
            <li>Técnicos: IP, navegador, timestamps de uso.</li>
            <li>De los inmuebles que cargues: dirección, fotos, documentos (SEDUVI, KMZ), precios.</li>
          </ul>
          <p className="mt-2">No recabamos datos personales sensibles (origen racial, salud, creencias, etc.).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Finalidades primarias</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Proporcionar acceso a la Plataforma y sus funcionalidades.</li>
            <li>Validar direcciones, enriquecer datos de inmuebles con fuentes oficiales.</li>
            <li>Generar fichas comerciales y compartirlas según tus instrucciones.</li>
            <li>Atender soporte técnico y comunicaciones del servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Finalidades secundarias</h2>
          <p>Con tu consentimiento previo: mejorar la Plataforma mediante análisis estadístico agregado y enviar comunicaciones comerciales. Puedes oponerte en cualquier momento escribiendo a [correo privacidad].</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Transferencias</h2>
          <p>No transferimos datos personales a terceros sin tu consentimiento, salvo en los casos previstos por la ley. Utilizamos proveedores de infraestructura (hosting, base de datos, geocodificación) que procesan datos bajo contratos de confidencialidad.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Derechos ARCO</h2>
          <p>Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento de tus datos. También puedes revocar tu consentimiento o limitar su uso. Envía tu solicitud a [correo privacidad] indicando: nombre, identificación, objeto de la solicitud.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Seguridad</h2>
          <p>Implementamos medidas administrativas, físicas y técnicas para proteger tus datos: cifrado en tránsito (HTTPS), controles de acceso por rol, bitácora de auditoría, aislamiento por organización.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Cookies</h2>
          <p>Utilizamos cookies propias y de terceros para autenticación (sesión cifrada) y analítica agregada. Puedes deshabilitarlas desde tu navegador; algunas funcionalidades pueden dejar de operar.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Modificaciones</h2>
          <p>Los cambios a este Aviso se publicarán en esta página. Te notificaremos por la Plataforma cuando haya modificaciones sustanciales.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Contacto</h2>
          <p>Para ejercer tus derechos ARCO o cualquier duda sobre este Aviso: <strong>[correo privacidad]</strong>.</p>
        </section>
      </div>
    </main>
  );
}
