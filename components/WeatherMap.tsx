"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Next.js's bundler (Turbopack and webpack alike) fails to correctly serve
// maplibre-gl's Worker script when it's resolved via the library's own
// `new URL(..., import.meta.url)` — it 404s in production. Self-hosting the
// worker (+ its relative "./maplibre-gl-shared.mjs" import) as plain static
// files in public/ and pointing at them explicitly sidesteps that entirely.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}
import type { StationObservation } from "@/lib/cwaObservations";
import type { TyphoonStatus } from "@/lib/typhoonParser";
import { maplibreStepExpression, type LayerKey } from "@/lib/colorScales";
import WindParticleLayer from "./WindParticleLayer";
import type { WindGridData } from "@/lib/windGrid";

const STATIONS_SOURCE = "stations";
const STATIONS_LAYER = "stations-circles";
const TYPHOON_SOURCE = "typhoon";
const TYPHOON_LAYER = "typhoon-marker";

const LAYER_PROPERTY: Record<LayerKey, string> = {
  temp: "temp",
  rain: "rain",
  humidity: "humidity",
  wind: "windSpeed",
};

function stationsToGeoJSON(stations: StationObservation[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { ...s },
    })),
  };
}

interface Props {
  stations: StationObservation[];
  activeLayer: LayerKey | "typhoon";
  windGrid: WindGridData | null;
  showParticles: boolean;
  showStations: boolean;
  typhoon: TyphoonStatus | null;
  onSelectStation: (station: StationObservation | null) => void;
}

export default function WeatherMap({
  stations,
  activeLayer,
  windGrid,
  showParticles,
  showStations,
  typhoon,
  onSelectStation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = new MapLibreMap({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [121.0, 23.7],
      zoom: 7,
      attributionControl: { compact: true },
    });
    // No NavigationControl: all four corners are taken by the overlay cards,
    // and scroll/drag/pinch already cover zoom and pan.

    m.on("load", () => {
      m.addSource(STATIONS_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: STATIONS_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 10, 12],
          "circle-color": maplibreStepExpression("temp", "temp") as never,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.85)",
          "circle-opacity": 0.9,
        },
      });

      m.addSource(TYPHOON_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: TYPHOON_LAYER,
        type: "circle",
        source: TYPHOON_SOURCE,
        paint: {
          "circle-radius": 14,
          "circle-color": "#e3524a",
          "circle-opacity": 0.35,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#e3524a",
        },
      });

      m.on("click", STATIONS_LAYER, (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f) onSelectStation(f.properties as unknown as StationObservation);
      });
      m.on("mouseenter", STATIONS_LAYER, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", STATIONS_LAYER, () => (m.getCanvas().style.cursor = ""));

      setLoaded(true);
      setMap(m);
    });

    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push station data updates.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const src = mapRef.current.getSource(STATIONS_SOURCE) as GeoJSONSource | undefined;
    src?.setData(stationsToGeoJSON(stations));
  }, [stations, loaded]);

  // Toggle station visibility + recolor on layer change.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const m = mapRef.current;
    m.setLayoutProperty(STATIONS_LAYER, "visibility", showStations ? "visible" : "none");
    const numericLayer: LayerKey = activeLayer === "typhoon" ? "temp" : activeLayer;
    m.setPaintProperty(
      STATIONS_LAYER,
      "circle-color",
      maplibreStepExpression(numericLayer, LAYER_PROPERTY[numericLayer]) as never
    );
    m.setPaintProperty(STATIONS_LAYER, "circle-opacity", activeLayer === "typhoon" ? 0.35 : 0.9);
  }, [activeLayer, showStations, loaded]);

  // Typhoon marker.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const src = mapRef.current.getSource(TYPHOON_SOURCE) as GeoJSONSource | undefined;
    if (!src) return;
    if (typhoon?.active && typhoon.lat && typhoon.lon) {
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [typhoon.lon, typhoon.lat] },
            properties: { name: typhoon.name ?? "" },
          },
        ],
      });
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [typhoon, loaded]);

  return (
    <div className="absolute inset-0">
      {/*
        Inline styles, not Tailwind: MapLibre adds `.maplibregl-map` to this
        element, and its unlayered `position: relative` beats Tailwind v4's
        `.absolute` (which lives in @layer utilities - unlayered CSS always
        wins over layered CSS). That collapsed the container to height 0.
      */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {map && showParticles && windGrid && <WindParticleLayer map={map} grid={windGrid} />}
    </div>
  );
}
