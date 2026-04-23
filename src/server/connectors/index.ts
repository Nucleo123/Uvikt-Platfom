export * from "./types";
export { sepomexConnector } from "./sepomex";
export { seduviConnector } from "./seduvi";
export { inegiConnector } from "./inegi";
export { denueConnector } from "./denue";
export { commercialConnector as osmCommercialConnector } from "./commercial";
export { geocodeAddress, reverseGeocode } from "./geocoder";

import { denueConnector } from "./denue";
import { commercialConnector as osmCommercial } from "./commercial";
import type { CommercialConnector } from "./types";

/**
 * Preferred commercial connector: uses DENUE (real INEGI data) when the token
 * is configured, otherwise falls back to OSM Overpass (free, no token).
 */
export const commercialConnector: CommercialConnector = {
  async fetchCommercialContext(coords, radii, categories) {
    if (process.env.INEGI_API_TOKEN) {
      const result = await denueConnector.fetchCommercialContext(coords, radii, categories);
      if (result.status !== "failed") return result;
    }
    return osmCommercial.fetchCommercialContext(coords, radii, categories);
  },
};
