import { NextResponse } from "next/server";
import { requireContext } from "@/lib/auth";
import { uploadFile } from "@/server/services/storage";
import { extractPolygonFromKml, polygonCentroid } from "@/server/services/kmz-parse";

export const runtime = "nodejs";

/**
 * Upload a .kml or .kmz file. Returns the stored URL plus extracted polygon GeoJSON
 * and centroid coordinates so the wizard can pre-fill the map pin.
 *
 * .kmz = zipped .kml. We only parse the first .kml entry.
 */
export async function POST(req: Request) {
  const ctx = await requireContext();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file missing" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  // Extract KML content
  let kmlText: string | null = null;
  if (name.endsWith(".kml")) {
    kmlText = bytes.toString("utf-8");
  } else if (name.endsWith(".kmz")) {
    // Minimal zip reader — find first entry ending in .kml.
    // For production, swap to a real library (jszip, yauzl, etc).
    kmlText = extractKmlFromKmz(bytes);
    if (!kmlText) {
      return NextResponse.json({ error: "Could not extract .kml from .kmz. Try re-exporting from Google Earth." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "File must be .kml or .kmz" }, { status: 400 });
  }

  const stored = await uploadFile(bytes, {
    filename: file.name,
    mimeType: file.type || (name.endsWith(".kmz") ? "application/vnd.google-earth.kmz" : "application/vnd.google-earth.kml+xml"),
    folder: `org-${ctx.organization.id}/kmz`,
  });

  const polygonGeoJson = extractPolygonFromKml(kmlText);
  const centroid = polygonGeoJson ? polygonCentroid(polygonGeoJson) : null;

  return NextResponse.json({
    ...stored,
    polygonGeoJson,
    centroid,
  });
}

/**
 * Parse a KMZ (zip) buffer and return the first .kml entry as a string.
 * Implements just enough of the ZIP format for the common case of small KMZs
 * with uncompressed or DEFLATE-compressed entries.
 */
function extractKmlFromKmz(buf: Buffer): string | null {
  const zlib = require("zlib") as typeof import("zlib");
  const sig = 0x04034b50; // local file header signature
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) !== sig) { i++; continue; }
    const compressionMethod = buf.readUInt16LE(i + 8);
    const compressedSize    = buf.readUInt32LE(i + 18);
    const uncompressedSize  = buf.readUInt32LE(i + 22);
    const fileNameLen       = buf.readUInt16LE(i + 26);
    const extraLen          = buf.readUInt16LE(i + 28);
    const name = buf.toString("utf-8", i + 30, i + 30 + fileNameLen);
    const dataStart = i + 30 + fileNameLen + extraLen;
    const dataEnd   = dataStart + compressedSize;

    if (name.toLowerCase().endsWith(".kml")) {
      const slice = buf.subarray(dataStart, dataEnd);
      try {
        if (compressionMethod === 0) return slice.toString("utf-8");
        if (compressionMethod === 8) return zlib.inflateRawSync(slice).toString("utf-8");
      } catch (err) {
        console.warn("[kmz] inflate failed:", err);
        return null;
      }
    }
    i = dataEnd;
  }
  return null;
}
