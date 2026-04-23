import type { AddressConnector, AddressInput, PostalData, ValidatedAddress, ConnectorResult } from "./types";

/**
 * SEPOMEX connector — validates Mexican postal addresses.
 *
 * Uses the free icalialabs SEPOMEX mirror (no token required, community-maintained).
 * For production, you can swap SEPOMEX_API_URL to a licensed provider (Copomex paid
 * tier, SepoMex.io, or Correos de México's direct feed) — the interface is the same.
 */

const DEFAULT_API = "https://sepomex.icalialabs.com/api/v1/zip_codes";

type IcaliaEntry = {
  d_codigo: string;
  d_asenta: string;
  d_tipo_asenta: string;
  d_mnpio: string;
  d_estado: string;
  d_ciudad: string;
};

/** Minimal cache: API is rate-limited. Same CP within the session returns cached data. */
const cache = new Map<string, { at: number; entries: IcaliaEntry[] }>();
const TTL = 1000 * 60 * 60 * 24; // 24h

async function fetchByCp(postalCode: string): Promise<IcaliaEntry[]> {
  const cached = cache.get(postalCode);
  if (cached && Date.now() - cached.at < TTL) return cached.entries;

  const base = process.env.SEPOMEX_API_URL || DEFAULT_API;
  const url = `${base}?zip_code=${encodeURIComponent(postalCode)}&per_page=20`;
  const res = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`SEPOMEX ${res.status}`);
  const data = (await res.json()) as { zip_codes: IcaliaEntry[] };
  const entries = data.zip_codes ?? [];
  cache.set(postalCode, { at: Date.now(), entries });
  return entries;
}

function now() { return new Date().toISOString(); }

export const sepomexConnector: AddressConnector = {
  async validateAddress(input: AddressInput): Promise<ConnectorResult<ValidatedAddress>> {
    const postal = input.postalCode?.trim();
    if (!postal) {
      return {
        source: "sepomex",
        status: "partial",
        confidence: 0.4,
        fetchedAt: now(),
        raw: input,
        normalized: {
          line1: input.line1,
          line2: input.line2,
          neighborhood: input.neighborhood,
          municipality: input.municipality ?? "",
          state: input.state ?? "",
          postalCode: "",
          country: input.country ?? "MX",
        },
        error: "Missing postal code — cannot confirm against SEPOMEX.",
      };
    }

    try {
      const entries = await fetchByCp(postal);
      if (!entries.length) {
        return {
          source: "sepomex",
          status: "partial",
          confidence: 0.5,
          fetchedAt: now(),
          raw: { postal, entries },
          normalized: {
            line1: input.line1, line2: input.line2,
            neighborhood: input.neighborhood,
            municipality: input.municipality ?? "",
            state: input.state ?? "",
            postalCode: postal,
            country: input.country ?? "MX",
          },
          error: "CP no encontrado en SEPOMEX.",
        };
      }
      // Pick best-matching entry by neighborhood text similarity
      const want = (input.neighborhood ?? "").toLowerCase().trim();
      const match = entries.find((e) => e.d_asenta.toLowerCase() === want)
        ?? entries.find((e) => want && e.d_asenta.toLowerCase().includes(want))
        ?? entries[0];

      return {
        source: "sepomex",
        status: "success",
        confidence: match.d_asenta.toLowerCase() === want ? 1 : 0.85,
        fetchedAt: now(),
        raw: { input, entries },
        normalized: {
          line1: input.line1,
          line2: input.line2,
          neighborhood: match.d_asenta,
          municipality: match.d_mnpio,
          state: match.d_estado,
          postalCode: match.d_codigo,
          country: "MX",
        },
      };
    } catch (err) {
      return {
        source: "sepomex",
        status: "failed",
        fetchedAt: now(),
        raw: input,
        normalized: {
          line1: input.line1, line2: input.line2,
          neighborhood: input.neighborhood,
          municipality: input.municipality ?? "",
          state: input.state ?? "",
          postalCode: postal,
          country: "MX",
        },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<ConnectorResult<ValidatedAddress>> {
    // Delegate to Nominatim via the geocoder service in production.
    return {
      source: "sepomex",
      status: "partial",
      confidence: 0.4,
      fetchedAt: now(),
      raw: { lat, lng },
      normalized: {
        line1: "", neighborhood: "", municipality: "",
        state: "", postalCode: "", country: "MX", lat, lng,
      },
      error: "Reverse geocoding handled by Nominatim in prod; SEPOMEX used only for CP confirmation.",
    };
  },

  async fetchPostalData(postalCode: string): Promise<ConnectorResult<PostalData>> {
    try {
      const entries = await fetchByCp(postalCode);
      if (!entries.length) {
        return {
          source: "sepomex", status: "failed", fetchedAt: now(),
          raw: { postalCode },
          normalized: { postalCode, neighborhoodOptions: [], municipality: "", state: "" },
          error: "CP no encontrado en SEPOMEX.",
        };
      }
      const first = entries[0];
      return {
        source: "sepomex", status: "success", confidence: 1, fetchedAt: now(),
        raw: entries,
        normalized: {
          postalCode: first.d_codigo,
          neighborhoodOptions: Array.from(new Set(entries.map((e) => e.d_asenta))),
          municipality: first.d_mnpio,
          state: first.d_estado,
        },
      };
    } catch (err) {
      return {
        source: "sepomex", status: "failed", fetchedAt: now(),
        raw: { postalCode },
        normalized: { postalCode, neighborhoodOptions: [], municipality: "", state: "" },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
