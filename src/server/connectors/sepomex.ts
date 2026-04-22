import type { AddressConnector, AddressInput, PostalData, ValidatedAddress, ConnectorResult } from "./types";

/**
 * SEPOMEX connector — validates Mexican postal addresses.
 *
 * In production, hook `SEPOMEX_API_URL` + `SEPOMEX_API_KEY` to a licensed
 * SEPOMEX data provider (CopoMex, SepoMex.io, or direct Correos de Mexico feed).
 * For dev, this stub returns deterministic mock data so the pipeline runs end-to-end.
 */

const STUB_CP_TO_COLONIAS: Record<string, PostalData> = {
  "01730": {
    postalCode: "01730",
    neighborhoodOptions: ["Puente Colorado", "Olivar de los Padres", "Las Águilas"],
    municipality: "Álvaro Obregón",
    state: "Ciudad de México",
  },
  "11560": {
    postalCode: "11560",
    neighborhoodOptions: ["Polanco V Sección", "Polanco IV Sección"],
    municipality: "Miguel Hidalgo",
    state: "Ciudad de México",
  },
  "06600": {
    postalCode: "06600",
    neighborhoodOptions: ["Juárez", "Cuauhtémoc"],
    municipality: "Cuauhtémoc",
    state: "Ciudad de México",
  },
};

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

    const match = STUB_CP_TO_COLONIAS[postal];
    if (match) {
      const neighborhood =
        match.neighborhoodOptions.find((n) => n.toLowerCase() === input.neighborhood?.toLowerCase()) ??
        input.neighborhood ??
        match.neighborhoodOptions[0];
      return {
        source: "sepomex",
        status: "success",
        confidence: 0.95,
        fetchedAt: now(),
        raw: { input, match },
        normalized: {
          line1: input.line1,
          line2: input.line2,
          neighborhood,
          municipality: match.municipality,
          state: match.state,
          postalCode: match.postalCode,
          country: "MX",
        },
      };
    }

    // Unknown CP — still "partial success": echo back normalized input
    return {
      source: "sepomex",
      status: "partial",
      confidence: 0.5,
      fetchedAt: now(),
      raw: input,
      normalized: {
        line1: input.line1,
        line2: input.line2,
        neighborhood: input.neighborhood,
        municipality: input.municipality ?? "",
        state: input.state ?? "",
        postalCode: postal,
        country: input.country ?? "MX",
      },
      error: "Postal code not in stub registry — production SEPOMEX would resolve this.",
    };
  },

  async reverseGeocode(lat: number, lng: number): Promise<ConnectorResult<ValidatedAddress>> {
    // Delegate to Nominatim via the geocoder service in production.
    // The stub returns a plausible CDMX address.
    return {
      source: "sepomex",
      status: "partial",
      confidence: 0.6,
      fetchedAt: now(),
      raw: { lat, lng },
      normalized: {
        line1: "Av. Calz. Las Águilas 1280",
        neighborhood: "Puente Colorado",
        municipality: "Álvaro Obregón",
        state: "Ciudad de México",
        postalCode: "01730",
        country: "MX",
        lat,
        lng,
      },
      error: "Reverse geocoding handled by Nominatim in prod; SEPOMEX used only for CP confirmation.",
    };
  },

  async fetchPostalData(postalCode: string): Promise<ConnectorResult<PostalData>> {
    const match = STUB_CP_TO_COLONIAS[postalCode];
    if (match) {
      return { source: "sepomex", status: "success", confidence: 1, fetchedAt: now(), raw: match, normalized: match };
    }
    return {
      source: "sepomex",
      status: "failed",
      fetchedAt: now(),
      raw: { postalCode },
      normalized: { postalCode, neighborhoodOptions: [], municipality: "", state: "" },
      error: "Postal code not found in stub registry.",
    };
  },
};
