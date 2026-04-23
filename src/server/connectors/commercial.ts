import type { CommercialConnector, CommercialData, ConnectorResult } from "./types";

/**
 * Commercial context connector.
 *
 * Uses OpenStreetMap's Overpass API for real nearby-business data (free, no token).
 * Falls back to synthetic density if Overpass is unreachable. Production can swap
 * to INEGI DENUE or paid providers via COMMERCIAL_API_URL.
 *
 * OSM mapping for MX categories:
 *   retail     → shop=supermarket, mall, department_store, convenience
 *   banking    → amenity=bank, bureau_de_change, atm
 *   food       → amenity=restaurant, cafe, fast_food
 *   automotive → shop=car, car_repair, car_parts
 *   education  → amenity=school, university, college
 *   healthcare → amenity=hospital, clinic, pharmacy
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OverpassQuery = {
  filter: string; // e.g. 'amenity=bank' or 'shop~"supermarket|mall"'
};

const CATEGORY_QUERIES: Record<string, OverpassQuery[]> = {
  retail:     [{ filter: 'shop~"^(supermarket|mall|department_store|convenience|wholesale)$"' }],
  banking:    [{ filter: 'amenity~"^(bank|bureau_de_change|atm)$"' }],
  food:       [{ filter: 'amenity~"^(restaurant|cafe|fast_food)$"' }],
  automotive: [{ filter: 'shop~"^(car|car_repair|car_parts)$"' }],
  education:  [{ filter: 'amenity~"^(school|university|college)$"' }],
  healthcare: [{ filter: 'amenity~"^(hospital|clinic|pharmacy|doctors)$"' }],
};

function now() { return new Date().toISOString(); }

async function queryOverpass(lat: number, lng: number, radiusM: number, queries: OverpassQuery[]): Promise<Array<{ name?: string; brand?: string }>> {
  const parts = queries
    .map((q) => `node[${q.filter}](around:${radiusM},${lat},${lng});way[${q.filter}](around:${radiusM},${lat},${lng});`)
    .join("");
  const ql = `[out:json][timeout:15];(${parts});out center tags 500;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(ql),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as { elements: Array<{ tags?: Record<string, string> }> };
  return (data.elements ?? []).map((e) => ({ name: e.tags?.name, brand: e.tags?.brand }));
}

/** Deterministic fallback for when Overpass is unreachable. */
function syntheticBands(coords: { lat: number; lng: number }, radiiMeters: number[], categories: string[]) {
  let h = 2166136261;
  const s = `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const base = ((h >>> 0) % 100000) / 100000;
  return radiiMeters.map((r, idx) => {
    const byCategory: Record<string, { count: number; brands: string[] }> = {};
    categories.forEach((cat, cIdx) => {
      const count = Math.max(0, Math.round((r / 500) * (0.2 + base * 0.6 + cIdx * 0.05) * (1 + idx * 0.3)));
      byCategory[cat] = { count, brands: [] };
    });
    return { radiusMeters: r, byCategory };
  });
}

export const commercialConnector: CommercialConnector = {
  async fetchCommercialContext(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
    categories: string[] = Object.keys(CATEGORY_QUERIES),
  ): Promise<ConnectorResult<CommercialData>> {
    const bands: Array<{ radiusMeters: number; byCategory: Record<string, { count: number; brands: string[] }> }> = [];
    let live = true;

    for (const r of radiiMeters) {
      const byCategory: Record<string, { count: number; brands: string[] }> = {};
      for (const cat of categories) {
        const qs = CATEGORY_QUERIES[cat];
        if (!qs) { byCategory[cat] = { count: 0, brands: [] }; continue; }
        try {
          const hits = await queryOverpass(coords.lat, coords.lng, r, qs);
          // Collect top brands (by frequency)
          const brandMap = new Map<string, number>();
          for (const h of hits) {
            const label = h.brand || h.name;
            if (!label) continue;
            brandMap.set(label, (brandMap.get(label) ?? 0) + 1);
          }
          const brands = [...brandMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
          byCategory[cat] = { count: hits.length, brands };
        } catch (err) {
          console.warn(`[commercial] overpass ${cat} ${r}m failed:`, err);
          live = false;
          byCategory[cat] = { count: 0, brands: [] };
        }
      }
      bands.push({ radiusMeters: r, byCategory });
    }

    if (!live) {
      // All categories failed for some radius — fall back to synthetic for a useful demo
      return {
        source: "commercial", status: "partial", confidence: 0.4, fetchedAt: now(),
        raw: { coords, radiiMeters, live: false },
        normalized: { bands: syntheticBands(coords, radiiMeters, categories) },
        error: "Overpass API unreachable — using synthetic estimate.",
      };
    }

    return {
      source: "commercial", status: "success", confidence: 0.8, fetchedAt: now(),
      raw: { coords, radiiMeters, provider: "overpass" },
      normalized: { bands },
    };
  },
};
