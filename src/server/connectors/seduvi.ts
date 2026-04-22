import type { LandUseConnector, LandUseData, ConnectorResult, ValidatedAddress } from "./types";

/**
 * SEDUVI connector — CDMX land-use authority.
 *
 * Production hookup: SEDUVI's "Ficha de uso de suelo" service (ciudadmx.gob.mx).
 * For dev, synthesize a small parcel polygon around the given coords and return
 * a plausible land-use code so the report UI renders a complete view.
 */

function now() { return new Date().toISOString(); }

/**
 * Build a tiny square polygon (~30m x 20m) around the coordinate. Good-enough
 * placeholder until a real parcel polygon is fetched from SEDUVI / catastro.
 */
function syntheticPolygon(lat: number, lng: number): string {
  // ~1 deg lat ≈ 111 km → 30m ≈ 0.00027 deg
  const dLat = 0.00009; // 10m half-height
  const dLng = 0.00013; // 15m half-width
  const feature = {
    type: "Feature",
    properties: { synthetic: true, note: "Placeholder parcel polygon" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [lng - dLng, lat - dLat],
        [lng + dLng, lat - dLat],
        [lng + dLng, lat + dLat],
        [lng - dLng, lat + dLat],
        [lng - dLng, lat - dLat],
      ]],
    },
  };
  return JSON.stringify(feature);
}

export const seduviConnector: LandUseConnector = {
  async fetchLandUseAndPolygon(
    coords: { lat: number; lng: number },
    address?: ValidatedAddress,
  ): Promise<ConnectorResult<LandUseData>> {
    const cp = address?.postalCode;

    // Simple zoning rules for the demo: major avenues get HC (mixed); elsewhere H.
    const isMajorAvenue = /\b(av|calz|boulevard|blvd|paseo)\b/i.test(address?.line1 ?? "");
    const landUseCode = isMajorAvenue ? "HC/3/20" : "H/3/20";
    const landUseLabel = isMajorAvenue
      ? "Habitacional con comercio, 3 niveles, 20% área libre"
      : "Habitacional, 3 niveles, 20% área libre";

    return {
      source: "seduvi",
      status: cp ? "success" : "partial",
      confidence: cp ? 0.8 : 0.5,
      fetchedAt: now(),
      raw: { coords, address },
      normalized: {
        landUseCode,
        landUseLabel,
        surfaceM2: 420,
        frontageM: 14,
        depthM: 30,
        polygonGeoJson: syntheticPolygon(coords.lat, coords.lng),
        fichaUrl: `https://ciudadmx.gob.mx/seduvi/ficha?cp=${cp ?? ""}&lat=${coords.lat}&lng=${coords.lng}`,
        sourceName: "CDMX-SEDUVI (stub)",
      },
    };
  },
};
