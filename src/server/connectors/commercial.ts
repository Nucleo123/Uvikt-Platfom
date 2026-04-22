import type { CommercialConnector, CommercialData, ConnectorResult } from "./types";

/**
 * Commercial database connector (placeholder).
 *
 * Intended for paid datasets (e.g. DENUE-paid, banking BIN-level presence,
 * automotive dealer networks, retail concessions, etc.). The MVP ships with
 * a stub that mirrors the shape a real provider would return so the report
 * UI stays stable when we swap in a real feed.
 */

function now() { return new Date().toISOString(); }

const DEFAULT_CATEGORIES = ["retail", "banking", "food", "automotive", "education", "healthcare"];

const BRAND_POOL: Record<string, string[]> = {
  retail:     ["Liverpool", "Walmart", "Costco", "Chedraui", "Sams", "Soriana"],
  banking:    ["BBVA", "Banamex", "Santander", "Banorte", "HSBC", "Scotiabank"],
  food:       ["Starbucks", "Toks", "Vips", "La Casa de Toño", "Sanborns"],
  automotive: ["Ford", "GM", "Nissan", "Toyota", "VW", "Mazda"],
  education:  ["Tec de Monterrey", "Colegio Williams", "Liceo Mexicano"],
  healthcare: ["Hospital ABC", "Hospital Ángeles", "Farmacias San Pablo", "Farmacias del Ahorro"],
};

function seeded(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

export const commercialConnector: CommercialConnector = {
  async fetchCommercialContext(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
    categories: string[] = DEFAULT_CATEGORIES,
  ): Promise<ConnectorResult<CommercialData>> {
    const base = seeded(`${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`);
    const bands = radiiMeters.map((r, idx) => {
      const byCategory: Record<string, { count: number; brands: string[] }> = {};
      categories.forEach((cat, cIdx) => {
        const pool = BRAND_POOL[cat] ?? [];
        const density = (0.2 + base * 0.6 + cIdx * 0.05);
        const count = Math.max(0, Math.round((r / 500) * density * (1 + idx * 0.3)));
        const brands = pool.slice(0, Math.min(pool.length, 1 + Math.round(base * 4)));
        byCategory[cat] = { count, brands };
      });
      return { radiusMeters: r, byCategory };
    });

    return {
      source: "commercial",
      status: "success",
      confidence: 0.55,
      fetchedAt: now(),
      raw: { coords, radiiMeters, categories },
      normalized: { bands },
      error: process.env.COMMERCIAL_API_URL ? undefined : "No live provider configured — using synthetic data.",
    };
  },
};
