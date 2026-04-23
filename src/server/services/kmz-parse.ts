/**
 * Minimal KML/KMZ parser. Extracts first polygon ring from a KML string
 * and returns it as GeoJSON Feature. Good enough for CDMX parcel polygons
 * produced by Google Earth / SEDUVI exports.
 *
 * For KMZ (zipped KML), the API route unzips and passes the .kml content here.
 */

export function extractPolygonFromKml(kml: string): string | null {
  // Find all <coordinates>...</coordinates> blocks, but only within <Polygon>
  const polyMatch = kml.match(/<Polygon[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Polygon>/i);
  if (!polyMatch) {
    // Fallback: any coordinates block
    const anyMatch = kml.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (!anyMatch) return null;
    return buildFeature(anyMatch[1]);
  }
  return buildFeature(polyMatch[1]);
}

function buildFeature(raw: string): string | null {
  const coords = raw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter((arr) => arr.length >= 2 && !arr.some(Number.isNaN))
    .map(([lng, lat]) => [lng, lat]);

  if (coords.length < 3) return null;

  // Close ring if needed
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

  const feature = {
    type: "Feature",
    properties: { source: "kmz_upload" },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
  return JSON.stringify(feature);
}

/**
 * Compute the approximate centroid (average of ring points) for a polygon GeoJSON.
 * Returns null if the feature is not a polygon or is malformed.
 */
export function polygonCentroid(geoJsonStr: string): { lat: number; lng: number } | null {
  try {
    const f = JSON.parse(geoJsonStr) as { geometry?: { type?: string; coordinates?: number[][][] } };
    if (f.geometry?.type !== "Polygon" || !f.geometry.coordinates?.[0]) return null;
    const ring = f.geometry.coordinates[0];
    let sumLat = 0, sumLng = 0, n = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng; sumLat += lat; n++;
    }
    if (!n) return null;
    return { lat: sumLat / n, lng: sumLng / n };
  } catch { return null; }
}
