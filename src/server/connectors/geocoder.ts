import type { ValidatedAddress } from "./types";

/**
 * Thin geocoder facade. Production should front Mapbox / Google / Azure Maps;
 * the default uses Nominatim (OpenStreetMap) which has strict usage terms but
 * is fine for dev and low-volume use with a polite User-Agent.
 */

const NOMINATIM_URL = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
const UA = "UVIKT/0.1 (contact@uvikt.local)";

export async function geocodeAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  if (process.env.GEOCODER_PROVIDER && process.env.GEOCODER_PROVIDER !== "nominatim") {
    // TODO: add Mapbox / Google implementations here
  }
  try {
    const url = `${NOMINATIM_URL}/search?format=jsonv2&limit=1&countrycodes=mx&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es" }, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.warn("[geocoder] failed:", err);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<ValidatedAddress | null> {
  try {
    const url = `${NOMINATIM_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    return {
      line1: [a.road, a.house_number].filter(Boolean).join(" ") || (data.display_name ?? ""),
      neighborhood: a.neighbourhood || a.suburb,
      municipality: a.city || a.town || a.municipality,
      state: a.state,
      postalCode: a.postcode || "",
      country: "MX",
      lat, lng,
    };
  } catch (err) {
    console.warn("[geocoder] reverse failed:", err);
    return null;
  }
}
