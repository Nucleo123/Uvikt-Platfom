"use client";

import { useEffect, useRef } from "react";

type Marker = { lat: number; lng: number; color?: string; label?: string };
type Circle = { lat: number; lng: number; radiusMeters: number; color?: string };

export default function MapView({
  markers = [],
  circles = [],
  polygonGeoJson,
  center,
  zoom = 15,
  draggable = false,
  onPinChange,
  className,
}: {
  markers?: Marker[];
  circles?: Circle[];
  polygonGeoJson?: string | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  draggable?: boolean;
  onPinChange?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // Fix default icon URLs for Leaflet in webpack
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41], iconAnchor: [12, 41],
      });

      if (canceled || !ref.current) return;
      if (ref.current.childNodes.length > 0) {
        // Already initialized — skip
        return;
      }
      const c = center ?? markers[0] ?? { lat: 19.3561, lng: -99.2237 };
      const map = L.map(ref.current).setView([c.lat, c.lng], zoom);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      markers.forEach((m) => {
        const marker = L.marker([m.lat, m.lng], { icon, draggable });
        marker.addTo(map);
        if (m.label) marker.bindPopup(m.label);
        if (draggable && onPinChange) {
          marker.on("dragend", () => {
            const ll = marker.getLatLng();
            onPinChange(ll.lat, ll.lng);
          });
        }
      });

      circles.forEach((c) =>
        L.circle([c.lat, c.lng], {
          radius: c.radiusMeters,
          color: c.color ?? "#0E2A35",
          weight: 1,
          fillOpacity: 0.05,
        }).addTo(map),
      );

      if (polygonGeoJson) {
        try {
          const feature = JSON.parse(polygonGeoJson);
          L.geoJSON(feature, { style: { color: "#E4B43C", weight: 2, fillOpacity: 0.1 } }).addTo(map);
        } catch { /* ignore */ }
      }
    })();
    return () => { canceled = true; };
    // Intentional: don't re-init on every render. Parent should remount via key when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={ref} className={className ?? "h-80 w-full rounded-xl overflow-hidden"} />
    </>
  );
}
