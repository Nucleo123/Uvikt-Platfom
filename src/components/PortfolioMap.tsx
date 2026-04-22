"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioMap({ points }: { points: Array<{ id: string; lat: number; lng: number; label: string }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let canceled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41], iconAnchor: [12, 41],
      });
      if (canceled || !ref.current || ref.current.childNodes.length > 0) return;

      const fallback = { lat: 19.4326, lng: -99.1332 };
      const first = points[0] ?? fallback;
      const map = L.map(ref.current).setView([first.lat, first.lng], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);

      const bounds: [number, number][] = [];
      points.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(`<a href="/properties/${p.id}">${p.label}</a>`);
        m.on("click", () => router.push(`/properties/${p.id}`));
        bounds.push([p.lat, p.lng]);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={ref} className="h-[70vh] w-full" />
    </>
  );
}
