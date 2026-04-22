/**
 * KMZ export helper. MVP generates plain KML (KMZ is a zipped KML) from a
 * point or polygon payload. For production, zip + include referenced assets.
 */

export function buildKml(opts: {
  title: string;
  description?: string;
  lat: number;
  lng: number;
  polygonGeoJson?: string | null;
}): string {
  const escape = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

  let polygonKml = "";
  if (opts.polygonGeoJson) {
    try {
      const g = JSON.parse(opts.polygonGeoJson) as { geometry?: { coordinates?: number[][][] } };
      const ring = g.geometry?.coordinates?.[0];
      if (ring) {
        const coords = ring.map(([lng, lat]) => `${lng},${lat},0`).join(" ");
        polygonKml = `<Placemark><name>Parcel</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
      }
    } catch { /* ignore malformed polygons */ }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escape(opts.title)}</name>
    ${opts.description ? `<description>${escape(opts.description)}</description>` : ""}
    <Placemark>
      <name>${escape(opts.title)}</name>
      <Point><coordinates>${opts.lng},${opts.lat},0</coordinates></Point>
    </Placemark>
    ${polygonKml}
  </Document>
</kml>`;
}
