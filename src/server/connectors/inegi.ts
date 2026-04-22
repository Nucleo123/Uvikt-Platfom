import type { DemographicsConnector, DemographicsData, ConnectorResult } from "./types";

/**
 * INEGI connector — Mexican national statistics institute.
 *
 * Production: INEGI's Inventario Nacional de Viviendas + DENUE + censo geostats
 * require geo-queries (circular buffer intersection with AGEBs/manzanas).
 * `INEGI_API_URL` + `INEGI_API_KEY` should point at a pre-processed geocoding
 * service that returns demographics for a (lat, lng, radius) tuple.
 *
 * For dev, generate deterministic pseudo-random demographics keyed off coords
 * so the same property always yields the same numbers — useful for demo screens.
 */

function now() { return new Date().toISOString(); }

/** Simple deterministic hash → [0,1) based on a string. */
function seeded(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export const inegiConnector: DemographicsConnector = {
  async fetchDemographics(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
  ): Promise<ConnectorResult<DemographicsData>> {
    const base = seeded(`${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`);

    const bands = radiiMeters.map((r) => {
      // population scales roughly with area
      const area = Math.PI * (r / 1000) ** 2; // km²
      const popDensity = 9000 + base * 6000;  // urban density, 9–15k/km²
      const population = Math.round(area * popDensity);
      const households = Math.round(population / 3.4);

      // socioeconomic mix, varies slightly with radius
      const abc1 = Math.max(3, Math.min(45, 10 + base * 30 - r / 5000));
      const c2 = 15 + base * 10;
      const c = 30 - base * 5;
      const d = Math.max(5, 100 - abc1 - c2 - c - 5);
      const e = Math.max(0, 100 - abc1 - c2 - c - d);

      return {
        radiusMeters: r,
        population,
        households,
        avgAge: 32 + base * 6,
        avgHouseholdIncome: Math.round(12000 + base * 38000),
        socioeconomic: {
          abc1Pct: round1(abc1),
          c2Pct: round1(c2),
          cPct: round1(c),
          dPct: round1(d),
          ePct: round1(e),
        },
      };
    });

    return {
      source: "inegi",
      status: "success",
      confidence: 0.7,
      fetchedAt: now(),
      raw: { coords, radiiMeters, seed: base },
      normalized: { bands },
    };
  },
};

function round1(n: number) { return Math.round(n * 10) / 10; }
