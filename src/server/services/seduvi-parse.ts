/**
 * Parse a SEDUVI "Ficha de uso de suelo" PDF and extract the fields
 * most brokers care about: cuenta catastral, uso de suelo, superficie,
 * número oficial, colonia, and zonificación notes.
 *
 * SEDUVI PDFs vary by delegación and año, so we use a robust regex
 * strategy with multiple fallbacks rather than fixed column positions.
 */

export type SeduviExtract = {
  cuentaCatastral?: string;
  usoSueloCodigo?: string;     // e.g. "HC 3/20/MB"
  usoSueloTexto?: string;      // full normalized text
  superficiePredioM2?: number;
  frenteM?: number;
  numeroOficial?: string;
  colonia?: string;
  alcaldia?: string;
  codigoPostal?: string;
  observaciones?: string;
  rawText: string;             // full extracted text (for debug / manual inspection)
};

export async function parseSeduviPdf(pdfBuffer: Buffer): Promise<SeduviExtract> {
  // pdf-parse's index loads a test PDF at import time → bypass by importing
  // the internal module directly so it never runs that side-effect.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js" as string)).default;
  const data = await pdfParse(pdfBuffer);
  const text = (data.text || "").replace(/\s+/g, " ").trim();

  const first = (regexes: RegExp[]): string | undefined => {
    for (const r of regexes) {
      const m = text.match(r);
      if (m?.[1]) return m[1].trim();
    }
    return undefined;
  };

  const num = (s?: string) => {
    if (!s) return undefined;
    const cleaned = s.replace(/[, ]/g, "").replace(/[^\d.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : undefined;
  };

  const cuentaCatastral = first([
    /Cuenta\s+Catastral[:\s]+([0-9\- ]{8,20})/i,
    /Clave\s+Catastral[:\s]+([0-9\- ]{8,20})/i,
  ]);

  const usoSueloCodigo = first([
    /Zonificación[:\s]+([A-Z]{1,3}\s*[A-Z]{0,3}\s*\/?\s*\d{1,3}\s*\/?\s*\d{1,3}\s*\/?\s*[A-Z]{0,3})/i,
    /Uso\s+de\s+Suelo[:\s]+([A-Z]{1,3}\s*[A-Z]{0,3}\s*\/?\s*\d{1,3}\s*\/?\s*\d{1,3}\s*\/?\s*[A-Z]{0,3})/i,
    /Clave\s+Uso\s+de\s+Suelo[:\s]+([A-Z0-9\/ ]{3,20})/i,
  ]);

  const usoSueloTexto = first([
    /Uso\s+de\s+Suelo[:\s]+([A-Za-zÁÉÍÓÚáéíóúñÑ,\s]{10,200})/i,
    /Uso\s+Permitido[:\s]+([A-Za-zÁÉÍÓÚáéíóúñÑ,\s]{10,200})/i,
  ]);

  const superficieStr = first([
    /Superficie\s+(?:del\s+)?Predio[:\s]+([\d,.]+)\s*m[²2]/i,
    /Superficie\s+Total[:\s]+([\d,.]+)\s*m[²2]/i,
    /Área\s+del\s+Predio[:\s]+([\d,.]+)\s*m[²2]/i,
  ]);
  const superficiePredioM2 = num(superficieStr);

  const frenteStr = first([
    /Frente[:\s]+([\d,.]+)\s*m/i,
    /Frente\s+Predio[:\s]+([\d,.]+)\s*m/i,
  ]);
  const frenteM = num(frenteStr);

  const numeroOficial = first([/Número\s+Oficial[:\s]+(\S+)/i, /No\.?\s+Oficial[:\s]+(\S+)/i]);

  const colonia = first([/Colonia[:\s]+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9,\s]{3,80})/i]);
  const alcaldia = first([/(?:Alcald[ií]a|Delegaci[oó]n)[:\s]+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]{3,40})/i]);
  const codigoPostal = first([/C\.?P\.?[:\s]+(\d{5})/i, /Código\s+Postal[:\s]+(\d{5})/i]);

  const observaciones = first([/Observaciones[:\s]+([\s\S]{10,500})/i]);

  return {
    cuentaCatastral,
    usoSueloCodigo: usoSueloCodigo?.replace(/\s+/g, ""),
    usoSueloTexto,
    superficiePredioM2,
    frenteM,
    numeroOficial,
    colonia,
    alcaldia,
    codigoPostal,
    observaciones,
    rawText: text.slice(0, 4000), // truncate for storage
  };
}
