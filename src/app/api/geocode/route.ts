import { NextResponse } from "next/server";
import { requireContext } from "@/lib/auth";
import { geocodeAddress, reverseGeocode } from "@/server/connectors/geocoder";

export async function GET(req: Request) {
  await requireContext(); // authenticated only
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const q = url.searchParams.get("q");

  if (lat && lng) {
    const addr = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    return NextResponse.json({ address: addr });
  }
  if (q) {
    const coords = await geocodeAddress(q);
    return NextResponse.json({ coords });
  }
  return NextResponse.json({ error: "Provide q or lat+lng" }, { status: 400 });
}
