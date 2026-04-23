import type { CommercialConnector, CommercialData, ConnectorResult } from "./types";

/**
 * DENUE (INEGI) — Directorio Estadístico Nacional de Unidades Económicas.
 *
 * Real Mexican businesses registry. Free API, requires a token obtained at
 * https://www.inegi.org.mx/app/desarrolladores/generatoken/Usuarios/token_Verify
 * and stored as `INEGI_API_TOKEN` env var.
 *
 * This connector is optional — if the token isn't configured, enrichment falls
 * back to the OSM Overpass connector (which is free & unauthenticated).
 */

const DENUE_BASE = process.env.INEGI_API_URL || "https://www.inegi.org.mx/app/api/denue/v1/consulta";

// SCIAN sector buckets mapped to our category keys
const CATEGORY_SCIAN: Record<string, string[]> = {
  retail:     ["46"],                // Comercio al por menor
  banking:    ["5221", "5222", "5223"],
  food:       ["7225", "7224", "7223"],
  automotive: ["4411", "8111"],
  education:  ["6111", "6112", "6113", "6114", "6115", "6116", "6117"],
  healthcare: ["6211", "6213", "6214", "6215", "6216", "622"],
};

type DenueRecord = {
  Nombre?: string;
  Razon_social?: string;
  Clase_actividad?: string;
  Estrato?: string;
  Latitud?: string;
  Longitud?: string;
};

export const denueConnector: CommercialConnector = {
  async fetchCommercialContext(
    coords,
    radiiMeters,
    categories = Object.keys(CATEGORY_SCIAN),
  ): Promise<ConnectorResult<CommercialData>> {
    const token = process.env.INEGI_API_TOKEN;
    if (!token) {
      return {
        source: "denue",
        status: "failed",
        fetchedAt: new Date().toISOString(),
        raw: { reason: "no-token" },
        normalized: { bands: [] },
        error: "INEGI_API_TOKEN not configured — register free at inegi.org.mx/app/desarrolladores.",
      };
    }

    const bands = [];
    for (const r of radiiMeters) {
      const byCategory: Record<string, { count: number; brands: string[] }> = {};
      for (const cat of categories) {
        const scianCodes = CATEGORY_SCIAN[cat];
        if (!scianCodes) { byCategory[cat] = { count: 0, brands: [] }; continue; }
        const names = new Set<string>();
        let count = 0;
        for (const scian of scianCodes) {
          try {
            // DENUE endpoint: /Buscar/{nombre}/{lat,lng}/{radio_m}/{token}
            const url = `${DENUE_BASE}/Buscar/${scian}/${coords.lat},${coords.lng}/${Math.min(5000, r)}/${token}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000), next: { revalidate: 0 } });
            if (!res.ok) continue;
            const rows = (await res.json()) as DenueRecord[];
            count += Array.isArray(rows) ? rows.length : 0;
            for (const row of rows.slice(0, 10)) {
              const label = row.Nombre || row.Razon_social;
              if (label) names.add(label);
            }
          } catch (err) {
            console.warn(`[denue] ${scian} r=${r}m failed`, err);
          }
        }
        byCategory[cat] = { count, brands: [...names].slice(0, 6) };
      }
      bands.push({ radiusMeters: r, byCategory });
    }

    return {
      source: "denue",
      status: "success",
      confidence: 0.9,
      fetchedAt: new Date().toISOString(),
      raw: { coords, radiiMeters, provider: "denue" },
      normalized: { bands },
    };
  },
};
