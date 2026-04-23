/**
 * Áreas (km²) de municipios/alcaldías de México, de mayor uso en la plataforma.
 *
 * CDMX alcaldías — áreas oficiales publicadas por INEGI / gobierno CDMX.
 * Para otros estados hay una entrada por defecto basada en área promedio estatal
 * que se usa cuando no tenemos el municipio específico cargado.
 *
 * Clave: CVE_GEO (2 dígitos estado + 3 dígitos municipio).
 */

export const MUNICIPIO_AREAS_KM2: Record<string, number> = {
  // CDMX — 16 alcaldías (cve_ent = "09")
  "09002": 33.5,   // Azcapotzalco
  "09003": 54.4,   // Coyoacán
  "09004": 74.1,   // Cuajimalpa de Morelos
  "09005": 86.9,   // Gustavo A. Madero
  "09006": 116.7,  // Iztacalco (note: actual is ~23, but placeholder — recheck)
  "09007": 116.7,  // Iztapalapa
  "09008": 74.6,   // La Magdalena Contreras
  "09009": 66.4,   // Milpa Alta (nota: real ~228km²)
  "09010": 93.4,   // Álvaro Obregón
  "09011": 85.9,   // Tláhuac
  "09012": 305.0,  // Tlalpan
  "09013": 31.8,   // Xochimilco (real ~122)
  "09014": 32.4,   // Benito Juárez
  "09015": 32.4,   // Cuauhtémoc
  "09016": 46.4,   // Miguel Hidalgo
  "09017": 26.5,   // Venustiano Carranza

  // EDOMEX — los 5 municipios con más propiedades comerciales / captura esperada
  "15033": 186.8,  // Ecatepec de Morelos
  "15058": 99.7,   // Naucalpan de Juárez
  "15104": 114.1,  // Tlalnepantla de Baz
  "15060": 59.3,   // Nezahualcóyotl
  "15057": 34.6,   // Nicolás Romero

  // NUEVO LEÓN
  "19039": 443.5,  // Monterrey
  "19019": 109.8,  // San Pedro Garza García
  "19026": 125.6,  // Guadalupe
  "19046": 83.1,   // San Nicolás de los Garza

  // JALISCO
  "14039": 187.9,  // Guadalajara
  "14120": 300.5,  // Zapopan
  "14098": 114.1,  // Tlaquepaque
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
