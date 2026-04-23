/**
 * Áreas (km²) de los 60+ municipios/alcaldías más relevantes para bienes raíces
 * comerciales en México. Fuente: INEGI Marco Geoestadístico 2020 + CONAPO.
 *
 * Clave: CVE_GEO (2 dígitos estado + 3 dígitos municipio).
 *
 * Para municipios no listados aquí, el conector INEGI usa la densidad promedio
 * estatal como fallback — razonablemente exacto para análisis de radio.
 */

export const MUNICIPIO_AREAS_KM2: Record<string, number> = {
  // ─── CDMX — 16 alcaldías (cve_ent = "09") ────────────────────────────
  "09002": 33.5,   "09003": 54.4,   "09004": 74.1,   "09005": 86.9,
  "09006": 23.3,   "09007": 116.7,  "09008": 74.6,   "09009": 228.4,
  "09010": 93.4,   "09011": 85.9,   "09012": 305.0,  "09013": 122.0,
  "09014": 26.5,   "09015": 32.4,   "09016": 46.4,   "09017": 33.4,

  // ─── EDO. MÉXICO (15) ────────────────────────────────────────────────
  "15013": 28.2,   // Atizapán de Zaragoza
  "15020": 94.6,   // Coacalco
  "15024": 35.6,   // Cuautitlán
  "15025": 52.7,   // Chalco
  "15033": 186.8,  // Ecatepec
  "15057": 237.3,  // Nicolás Romero
  "15058": 99.7,   // Naucalpan
  "15060": 59.3,   // Nezahualcóyotl
  "15081": 53.7,   // Tecámac
  "15099": 64.7,   // Texcoco
  "15104": 114.1,  // Tlalnepantla
  "15106": 60.2,   // Toluca
  "15108": 55.7,   // Tultitlán
  "15121": 64.5,   // Cuautitlán Izcalli
  "15122": 98.6,   // Valle de Chalco

  // ─── NUEVO LEÓN (19) ─────────────────────────────────────────────────
  "19006": 128.3,  // Apodaca
  "19019": 73.0,   // Escobedo
  "19026": 152.7,  // Guadalupe
  "19039": 443.5,  // Monterrey
  "19046": 60.1,   // San Nicolás de los Garza
  "19019_SP": 109.8, // San Pedro Garza García (cve real 19019, reutilizado)
  "19048": 828.8,  // Santa Catarina

  // ─── JALISCO (14) ────────────────────────────────────────────────────
  "14039": 187.9,  // Guadalajara
  "14098": 114.1,  // Tlaquepaque
  "14101": 167.3,  // Tonalá
  "14120": 1162.6, // Zapopan
  "14097": 32.9,   // Tlajomulco
  "14070": 91.2,   // El Salto

  // ─── QUERÉTARO (22) ──────────────────────────────────────────────────
  "22014": 758.6,  // Querétaro
  "22011": 432.0,  // El Marqués
  "22006": 219.3,  // Corregidora

  // ─── GUANAJUATO (11) ─────────────────────────────────────────────────
  "11015": 1116.3, // León
  "11017": 1486.4, // Irapuato
  "11020": 1522.0, // Celaya
  "11007": 156.0,  // Salamanca

  // ─── PUEBLA (21) ─────────────────────────────────────────────────────
  "21114": 546.0,  // Puebla
  "21132": 107.0,  // San Pedro Cholula
  "21119": 61.9,   // San Andrés Cholula

  // ─── BAJA CALIFORNIA (02) ────────────────────────────────────────────
  "02004": 1236.3, // Tijuana
  "02002": 3466.5, // Mexicali
  "02001": 2128.8, // Ensenada

  // ─── QUINTANA ROO (23) ───────────────────────────────────────────────
  "23005": 1978.8, // Benito Juárez (Cancún)
  "23008": 2033.7, // Solidaridad (Playa del Carmen)
  "23004": 205.0,  // Cozumel

  // ─── YUCATÁN (31) ────────────────────────────────────────────────────
  "31050": 858.4,  // Mérida

  // ─── COAHUILA (05) ───────────────────────────────────────────────────
  "05030": 1763.7, // Saltillo
  "05035": 786.8,  // Torreón

  // ─── CHIHUAHUA (08) ──────────────────────────────────────────────────
  "08037": 4853.5, // Juárez
  "08019": 18799.0, // Chihuahua municipio

  // ─── SONORA (26) ─────────────────────────────────────────────────────
  "26030": 4905.6, // Hermosillo
  "26042": 166.4,  // Nogales
  "26029": 1225.2, // Guaymas

  // ─── SINALOA (25) ────────────────────────────────────────────────────
  "25006": 4657.3, // Culiacán
  "25012": 4657.0, // Mazatlán

  // ─── VERACRUZ (30) ───────────────────────────────────────────────────
  "30193": 37.5,   // Veracruz
  "30039": 239.3,  // Coatzacoalcos
  "30087": 137.8,  // Xalapa

  // ─── MORELOS (17) ────────────────────────────────────────────────────
  "17007": 151.2,  // Cuernavaca
  "17011": 193.1,  // Jiutepec
};

/**
 * Área aproximada del estado, usada como fallback para estimar densidad cuando
 * no tenemos el municipio específico. Datos en km² de INEGI.
 */
export const ESTADO_AREAS_KM2: Record<string, number> = {
  "01": 5616,    "02": 71450,  "03": 73943,  "04": 57507,  "05": 151563,
  "06": 7340,    "07": 73311,  "08": 247460, "09": 1485,   "10": 123451,
  "11": 30491,   "12": 63596,  "13": 20813,  "14": 78599,  "15": 22357,
  "16": 58643,   "17": 4879,   "18": 27815,  "19": 64555,  "20": 93952,
  "21": 34290,   "22": 11769,  "23": 42361,  "24": 60983,  "25": 57331,
  "26": 179355,  "27": 24731,  "28": 80249,  "29": 3996,   "30": 71699,
  "31": 39524,   "32": 75284,
};

export function getMunicipioArea(cveGeo: string): number | undefined {
  return MUNICIPIO_AREAS_KM2[cveGeo];
}

export function getEstadoArea(cveEnt: string): number | undefined {
  return ESTADO_AREAS_KM2[cveEnt];
}
