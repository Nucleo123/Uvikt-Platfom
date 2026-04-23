import type { DemographicsConnector, DemographicsData, ConnectorResult } from "./types";
import { reverseGeocode } from "./geocoder";
import { getMunicipioArea, getEstadoArea } from "./inegi-data/municipio-areas";

/**
 * INEGI connector — **uses REAL INEGI Census 2020 data** via the public
 * wscatgeo catalog API (no token required). Flow:
 *
 *   1. Fetch the full 32-estado municipio catalog from INEGI once (cached).
 *      Endpoint: https://gaia.inegi.org.mx/wscatgeo/mgem/{cve_ent}
 *   2. Reverse-geocode the property's coordinate via Nominatim to resolve
 *      state + municipio names.
 *   3. Fuzzy-match those names to INEGI's CVE_ENT + CVE_MUN.
 *   4. Pull the authoritative 2020 Census numbers (pob, pob_fem, pob_mas, viv).
 *   5. Compute density = población / área_municipio and scale to the requested
 *      radius to estimate hab/hogares within the buffer.
 *
 * Full-precision AGEB-level spatial computation (what the client called the
 * "RTZ sobre AGEBs") requires loading the AGEB shapefile + Censo ITER and
 * doing PostGIS-style intersection. That's planned for Etapa 3. Until then,
 * the municipio-level estimate is HONEST real-data with a documented method.
 *
 * Socioeconomic strata: INEGI wscatgeo doesn't expose AMAI/NSE. We derive a
 * rough distribution from an empirical table per CDMX alcaldía (based on
 * CONAPO 2020 Índice de Marginación + public AMAI breakdowns) and fall back
 * to a population-density heuristic elsewhere.
 */

type IngeiMunicipioRow = {
  cvegeo: string;    // e.g. "09010"
  cve_agee: string;  // "09"
  cve_agem: string;  // "010"
  nom_agem: string;  // "Álvaro Obregón"
  pob: string;       // "749982"
  pob_fem: string;
  pob_mas: string;
  viv: string;
};

type IngeiEstadoRow = {
  cvegeo: string;
  cve_agee: string;
  nom_agee: string;
  pob: string;
};

const WSCATGEO = "https://gaia.inegi.org.mx/wscatgeo";

/** Simple per-process cache. On serverless invocations, rebuilds once per cold start. */
const catalogCache = {
  estados: null as IngeiEstadoRow[] | null,
  byEstado: new Map<string, IngeiMunicipioRow[]>(),
  fetchedAt: 0,
};
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

async function loadEstados(): Promise<IngeiEstadoRow[]> {
  if (catalogCache.estados && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) return catalogCache.estados;
  const res = await fetch(`${WSCATGEO}/mgee/`, { signal: AbortSignal.timeout(15000), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`INEGI estados ${res.status}`);
  const json = (await res.json()) as { datos: IngeiEstadoRow[] };
  catalogCache.estados = json.datos;
  catalogCache.fetchedAt = Date.now();
  return json.datos;
}

async function loadMunicipios(cveEnt: string): Promise<IngeiMunicipioRow[]> {
  if (catalogCache.byEstado.has(cveEnt)) return catalogCache.byEstado.get(cveEnt)!;
  const res = await fetch(`${WSCATGEO}/mgem/${cveEnt}`, { signal: AbortSignal.timeout(15000), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`INEGI municipios ${res.status}`);
  const json = (await res.json()) as { datos: IngeiMunicipioRow[] };
  catalogCache.byEstado.set(cveEnt, json.datos);
  return json.datos;
}

/** Normalize a Spanish name for fuzzy match: lowercase, strip accents, remove punctuation. */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function matchLocation(coords: { lat: number; lng: number }): Promise<{ cveEnt: string; cveGeo: string; nomMunicipio: string; nomEstado: string } | null> {
  // Reverse-geocode to text name via OSM Nominatim
  const addr = await reverseGeocode(coords.lat, coords.lng);
  if (!addr) return null;
  const stateName = norm(addr.state ?? "");
  const muniName  = norm(addr.municipality ?? "");
  if (!stateName || !muniName) return null;

  const estados = await loadEstados();
  // CDMX has many alias variants ("ciudad de mexico", "distrito federal", "cdmx")
  const aliases: Record<string, string[]> = {
    "ciudad de mexico": ["cdmx", "distrito federal"],
    "distrito federal": ["cdmx", "ciudad de mexico"],
    "estado de mexico": ["mexico", "edomex"],
    "mexico": ["estado de mexico", "edomex"],
  };
  const stateCandidates = [stateName, ...(aliases[stateName] ?? [])];
  const estado = estados.find((e) => stateCandidates.includes(norm(e.nom_agee)))
    ?? estados.find((e) => stateCandidates.some((c) => norm(e.nom_agee).includes(c)));
  if (!estado) return null;

  const municipios = await loadMunicipios(estado.cve_agee);
  const muni = municipios.find((m) => norm(m.nom_agem) === muniName)
    ?? municipios.find((m) => norm(m.nom_agem).includes(muniName) || muniName.includes(norm(m.nom_agem)));
  if (!muni) return null;

  return { cveEnt: estado.cve_agee, cveGeo: muni.cvegeo, nomMunicipio: muni.nom_agem, nomEstado: estado.nom_agee };
}

/**
 * Rough socioeconomic-strata distribution per CDMX alcaldía.
 * Derived from public CONAPO Índice de Marginación 2020 + AMAI NSE 2020 reports.
 * Percentages approximate household-level strata (ABC1 = high, E = subsistence).
 */
const CDMX_NSE: Record<string, { abc1: number; c2: number; c: number; d: number; e: number }> = {
  "09014": { abc1: 46, c2: 22, c: 21, d: 10, e: 1 }, // Benito Juárez
  "09016": { abc1: 41, c2: 22, c: 22, d: 13, e: 2 }, // Miguel Hidalgo
  "09015": { abc1: 28, c2: 22, c: 27, d: 19, e: 4 }, // Cuauhtémoc
  "09003": { abc1: 30, c2: 22, c: 26, d: 18, e: 4 }, // Coyoacán
  "09010": { abc1: 25, c2: 20, c: 29, d: 22, e: 4 }, // Álvaro Obregón
  "09008": { abc1: 24, c2: 20, c: 28, d: 23, e: 5 }, // La Magdalena Contreras
  "09004": { abc1: 33, c2: 22, c: 24, d: 18, e: 3 }, // Cuajimalpa
  "09012": { abc1: 22, c2: 20, c: 28, d: 24, e: 6 }, // Tlalpan
  "09002": { abc1: 18, c2: 19, c: 31, d: 26, e: 6 }, // Azcapotzalco
  "09017": { abc1: 15, c2: 18, c: 32, d: 28, e: 7 }, // Venustiano Carranza
  "09006": { abc1: 13, c2: 17, c: 33, d: 30, e: 7 }, // Iztacalco
  "09005": { abc1: 10, c2: 16, c: 33, d: 33, e: 8 }, // Gustavo A. Madero
  "09007": { abc1: 7,  c2: 14, c: 32, d: 38, e: 9 }, // Iztapalapa
  "09013": { abc1: 14, c2: 17, c: 32, d: 29, e: 8 }, // Xochimilco
  "09011": { abc1: 11, c2: 15, c: 31, d: 34, e: 9 }, // Tláhuac
  "09009": { abc1: 6,  c2: 13, c: 30, d: 40, e: 11 }, // Milpa Alta
};

/** Fallback socioeconomic breakdown derived from municipio density + a smoothing function. */
function nseFromDensity(densityPerKm2: number): { abc1: number; c2: number; c: number; d: number; e: number } {
  // Higher density → slightly skews towards C/D in urban sprawl patterns.
  // This is a smoothing heuristic, NOT INEGI data. Used only outside our NSE table.
  const base = Math.min(1, densityPerKm2 / 15000);
  const abc1 = Math.max(4, Math.round(25 - base * 12));
  const c2   = Math.max(10, Math.round(22 - base * 5));
  const c    = Math.round(30 + base * 3);
  const d    = Math.round(100 - abc1 - c2 - c - 6);
  const e    = Math.max(2, 100 - abc1 - c2 - c - d);
  return { abc1, c2, c, d, e };
}

function round1(n: number) { return Math.round(n * 10) / 10; }

export const inegiConnector: DemographicsConnector = {
  async fetchDemographics(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
  ): Promise<ConnectorResult<DemographicsData>> {
    const now = new Date().toISOString();

    try {
      const match = await matchLocation(coords);
      if (!match) {
        return fallback(coords, radiiMeters, "Nominatim no resolvió estado/municipio", now);
      }

      const municipios = await loadMunicipios(match.cveEnt);
      const row = municipios.find((m) => m.cvegeo === match.cveGeo);
      if (!row) return fallback(coords, radiiMeters, "Municipio no encontrado en INEGI", now);

      const pob = parseInt(row.pob, 10);
      const viv = parseInt(row.viv, 10);
      const munArea = getMunicipioArea(match.cveGeo);
      // If we don't have the specific municipio area, fall back to STATE density
      // (state population / state area) which is a much more honest proxy than
      // guessing a muni size.
      let densidadHabKm2: number;
      let densidadVivKm2: number;
      let area: number;
      let areaSource: "municipio" | "state_fallback";
      if (munArea) {
        area = munArea;
        densidadHabKm2 = pob / munArea;
        densidadVivKm2 = viv / munArea;
        areaSource = "municipio";
      } else {
        const estadoArea = getEstadoArea(match.cveEnt) ?? 50000;
        const estadoRow = (await loadEstados()).find((e) => e.cve_agee === match.cveEnt);
        const estadoPob = estadoRow ? parseInt(estadoRow.pob, 10) : pob * 100;
        densidadHabKm2 = estadoPob / estadoArea;
        densidadVivKm2 = densidadHabKm2 / 3.4; // avg household size MX ~3.4
        area = pob / densidadHabKm2; // implied muni area
        areaSource = "state_fallback";
      }

      const nse = CDMX_NSE[match.cveGeo] ?? nseFromDensity(densidadHabKm2);
      const avgHousehold = pob / Math.max(1, viv);

      const bands = radiiMeters.map((r) => {
        const areaBuffer = Math.PI * (r / 1000) ** 2; // km²
        const population = Math.round(densidadHabKm2 * areaBuffer);
        const households = Math.round(densidadVivKm2 * areaBuffer);
        return {
          radiusMeters: r,
          population,
          households,
          avgAge: 32,  // not exposed by wscatgeo; placeholder until ITER ingestion
          avgHouseholdIncome: Math.round(18000 + nse.abc1 * 900), // rough proxy
          socioeconomic: {
            abc1Pct: round1(nse.abc1),
            c2Pct:   round1(nse.c2),
            cPct:    round1(nse.c),
            dPct:    round1(nse.d),
            ePct:    round1(nse.e),
          },
        };
      });

      return {
        source: "inegi",
        status: "success",
        confidence: 0.75,
        fetchedAt: now,
        raw: {
          coords, radiiMeters,
          method: areaSource === "municipio" ? "inegi_wscatgeo_municipio + muni_area" : "inegi_wscatgeo_municipio + state_density_fallback",
          match,
          municipio: { cvegeo: row.cvegeo, nom: row.nom_agem, pob, viv, areaKm2: area, densidadHabKm2, areaSource },
          nseSource: CDMX_NSE[match.cveGeo] ? "CONAPO/AMAI table" : "density heuristic",
        },
        normalized: { bands },
      };
    } catch (err) {
      return fallback(coords, radiiMeters, err instanceof Error ? err.message : String(err), now);
    }
  },
};

function fallback(
  coords: { lat: number; lng: number },
  radii: number[],
  error: string,
  now: string,
): ConnectorResult<DemographicsData> {
  // Deterministic pseudo-random — same coords → same numbers (useful for demos).
  let h = 2166136261;
  const s = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const base = ((h >>> 0) % 100000) / 100000;
  const bands = radii.map((r) => {
    const area = Math.PI * (r / 1000) ** 2;
    const density = 9000 + base * 6000;
    const population = Math.round(area * density);
    return {
      radiusMeters: r,
      population,
      households: Math.round(population / 3.4),
      avgAge: round1(32 + base * 6),
      avgHouseholdIncome: Math.round(12000 + base * 38000),
      socioeconomic: nseFromDensity(density),
    };
  });
  return {
    source: "inegi",
    status: "partial",
    confidence: 0.45,
    fetchedAt: now,
    raw: { coords, radii, fallback: true },
    normalized: { bands: bands.map((b) => ({ ...b, socioeconomic: {
      abc1Pct: b.socioeconomic.abc1, c2Pct: b.socioeconomic.c2, cPct: b.socioeconomic.c, dPct: b.socioeconomic.d, ePct: b.socioeconomic.e,
    } })) },
    error: `INEGI fallback (${error})`,
  };
}
