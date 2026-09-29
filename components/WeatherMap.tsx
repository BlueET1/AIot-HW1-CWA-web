"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type ImageSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Self-hosting the worker (+ maplibre-gl-shared.mjs) in public/ prevents Turbopack/webpack 404s.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

import type { StationObservation } from "@/lib/cwaObservations";
import type { TyphoonStatus } from "@/lib/typhoonParser";
import { maplibreStepExpression, type LayerKey } from "@/lib/colorScales";
import { MAP_STYLES, type MapStyleKey } from "@/lib/mapStyles";
import { generateDiffusionImage, DIFFUSION_COORDINATES } from "@/lib/diffusionGrid";
import { TAIWAN_COUNTIES_GEOJSON } from "@/lib/taiwanCounties";
import WindParticleLayer from "./WindParticleLayer";
import type { WindGridData } from "@/lib/windGrid";
import {
  type TyphoonTrack,
  getTyphoonBounds,
  getPastTrackGeoJSON,
  getForecastTrackGeoJSON,
  getTrackPointsGeoJSON,
  getForecastCirclesGeoJSON,
  getStormRadiiGeoJSON,
} from "@/lib/typhoonData";

const DIFFUSION_SOURCE = "weather-diffusion";
const DIFFUSION_LAYER = "weather-diffusion-layer";
const COUNTIES_SOURCE = "taiwan-counties";
const COUNTIES_LINE_LAYER = "taiwan-counties-line";
const STATIONS_SOURCE = "stations";
const STATIONS_LAYER = "stations-circles";

// Typhoon specific sources & layers
const TYPHOON_PAST_SOURCE = "typhoon-past-source";
const TYPHOON_PAST_LAYER = "typhoon-past-line";
const TYPHOON_FORECAST_SOURCE = "typhoon-forecast-source";
const TYPHOON_FORECAST_LAYER = "typhoon-forecast-line";
const TYPHOON_UNCERTAINTY_SOURCE = "typhoon-uncertainty-source";
const TYPHOON_UNCERTAINTY_FILL_LAYER = "typhoon-uncertainty-fill";
const TYPHOON_UNCERTAINTY_LINE_LAYER = "typhoon-uncertainty-line";
const TYPHOON_STORM_SOURCE = "typhoon-storm-source";
const TYPHOON_STORM_FILL_7 = "typhoon-storm-fill-7";
const TYPHOON_STORM_LINE_7 = "typhoon-storm-line-7";
const TYPHOON_STORM_FILL_10 = "typhoon-storm-fill-10";
const TYPHOON_STORM_LINE_10 = "typhoon-storm-line-10";
const TYPHOON_POINTS_SOURCE = "typhoon-points-source";
const TYPHOON_POINTS_LAYER = "typhoon-points-circle";

const EMPTY_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const LAYER_PROPERTY: Record<LayerKey, string> = {
  temp: "temp",
  rain: "rain",
  humidity: "humidity",
  wind: "windSpeed",
};

const TAIWAN_BOUNDS: [[number, number], [number, number]] = [
  [117.6, 21.2], // SW: west of Kinmen, south of Kenting
  [123.5, 26.8], // NE: east of Taiwan, north of Matsu
];

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
  mapStyle: MapStyleKey;
  showDiffusion: boolean;
  diffusionOpacity: number;
  windGrid: WindGridData | null;
  showParticles: boolean;
  showStations: boolean;
  typhoon: TyphoonStatus | null;
  typhoonTrack: TyphoonTrack;
  selectedTyphoonIndex: number;
  onSelectTyphoonIndex: (idx: number) => void;
  onSelectStation: (station: StationObservation | null) => void;
}

export default function WeatherMap({
  stations,
  activeLayer,
  mapStyle,
  showDiffusion,
  diffusionOpacity,
  windGrid,
  showParticles,
  showStations,
  typhoonTrack,
  selectedTyphoonIndex,
  onSelectTyphoonIndex,
  onSelectStation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  const currentDiffusionUrlRef = useRef<string>(EMPTY_IMAGE);
  const currentStyleKeyRef = useRef<MapStyleKey>(mapStyle);

  // Markers refs for typhoon interactive elements
  const typhoonMarkerRef = useRef<Marker | null>(null);
  const forecastMarkersRef = useRef<Marker[]>([]);

  const latestPropsRef = useRef({
    stations,
    activeLayer,
    mapStyle,
    showDiffusion,
    diffusionOpacity,
    showStations,
    typhoonTrack,
    selectedTyphoonIndex,
  });

  const onSelectStationRef = useRef(onSelectStation);
  const onSelectTyphoonIndexRef = useRef(onSelectTyphoonIndex);

  useEffect(() => {
    latestPropsRef.current = {
      stations,
      activeLayer,
      mapStyle,
      showDiffusion,
      diffusionOpacity,
      showStations,
      typhoonTrack,
      selectedTyphoonIndex,
    };
    onSelectStationRef.current = onSelectStation;
    onSelectTyphoonIndexRef.current = onSelectTyphoonIndex;
  }, [
    stations,
    activeLayer,
    mapStyle,
    showDiffusion,
    diffusionOpacity,
    showStations,
    typhoonTrack,
    selectedTyphoonIndex,
    onSelectStation,
    onSelectTyphoonIndex,
  ]);

  // Setup/Re-add custom layers onto the map whenever a style loads
  const setupCustomLayers = (m: MapLibreMap) => {
    const {
      stations: currStations,
      activeLayer: currActiveLayer,
      mapStyle: currMapStyle,
      showDiffusion: currShowDiff,
      diffusionOpacity: currDiffOpacity,
      showStations: currShowStations,
      typhoonTrack: currTrack,
      selectedTyphoonIndex: currTyphoonIdx,
    } = latestPropsRef.current;

    const numericLayer: LayerKey = currActiveLayer === "typhoon" ? "temp" : currActiveLayer;
    const isTyphoon = currActiveLayer === "typhoon";

    // 1. High-Resolution Weather Diffusion Layer (IDW raster image)
    if (!m.getSource(DIFFUSION_SOURCE)) {
      m.addSource(DIFFUSION_SOURCE, {
        type: "image",
        url: currentDiffusionUrlRef.current,
        coordinates: DIFFUSION_COORDINATES,
      });
    }

    if (!m.getLayer(DIFFUSION_LAYER)) {
      m.addLayer({
        id: DIFFUSION_LAYER,
        type: "raster",
        source: DIFFUSION_SOURCE,
        paint: {
          "raster-opacity": currShowDiff && !isTyphoon ? currDiffOpacity : 0,
          "raster-fade-duration": 150,
          "raster-resampling": "linear",
        },
      });
    }

    // 2. Subtle County Vector Line Layer
    if (!m.getSource(COUNTIES_SOURCE)) {
      m.addSource(COUNTIES_SOURCE, {
        type: "geojson",
        data: TAIWAN_COUNTIES_GEOJSON,
      });
    }

    if (!m.getLayer(COUNTIES_LINE_LAYER)) {
      m.addLayer({
        id: COUNTIES_LINE_LAYER,
        type: "line",
        source: COUNTIES_SOURCE,
        paint: {
          "line-color":
            currMapStyle === "light" || currMapStyle === "streets"
              ? "rgba(0,0,0,0.25)"
              : "rgba(255,255,255,0.35)",
          "line-width": 0.8,
          "line-opacity": currShowDiff && !isTyphoon ? 0.6 : 0,
        },
      });
    }

    // 3. Typhoon Layers
    // 3.1 Forecast Uncertainty Circles (Fill & Dashed border)
    if (!m.getSource(TYPHOON_UNCERTAINTY_SOURCE)) {
      m.addSource(TYPHOON_UNCERTAINTY_SOURCE, {
        type: "geojson",
        data: getForecastCirclesGeoJSON(currTrack),
      });
    }
    if (!m.getLayer(TYPHOON_UNCERTAINTY_FILL_LAYER)) {
      m.addLayer({
        id: TYPHOON_UNCERTAINTY_FILL_LAYER,
        type: "fill",
        source: TYPHOON_UNCERTAINTY_SOURCE,
        paint: {
          "fill-color": "#ca8a04",
          "fill-opacity": isTyphoon ? 0.16 : 0,
        },
      });
    }
    if (!m.getLayer(TYPHOON_UNCERTAINTY_LINE_LAYER)) {
      m.addLayer({
        id: TYPHOON_UNCERTAINTY_LINE_LAYER,
        type: "line",
        source: TYPHOON_UNCERTAINTY_SOURCE,
        paint: {
          "line-color": "#eab308",
          "line-width": 1.5,
          "line-dasharray": [3, 2],
          "line-opacity": isTyphoon ? 0.8 : 0,
        },
      });
    }

    // 3.2 Storm Radii (Level 7 Outer Circle & Level 10 Inner Circle)
    const activePt = currTrack.points[currTyphoonIdx] || currTrack.points[currTrack.currentIndex];
    if (!m.getSource(TYPHOON_STORM_SOURCE)) {
      m.addSource(TYPHOON_STORM_SOURCE, {
        type: "geojson",
        data: getStormRadiiGeoJSON(activePt),
      });
    }
    if (!m.getLayer(TYPHOON_STORM_FILL_7)) {
      m.addLayer({
        id: TYPHOON_STORM_FILL_7,
        type: "fill",
        source: TYPHOON_STORM_SOURCE,
        filter: ["==", ["get", "level"], 7],
        paint: {
          "fill-color": "#eab308",
          "fill-opacity": isTyphoon ? 0.22 : 0,
        },
      });
    }
    if (!m.getLayer(TYPHOON_STORM_LINE_7)) {
      m.addLayer({
        id: TYPHOON_STORM_LINE_7,
        type: "line",
        source: TYPHOON_STORM_SOURCE,
        filter: ["==", ["get", "level"], 7],
        paint: {
          "line-color": "#facc15",
          "line-width": 1.8,
          "line-opacity": isTyphoon ? 0.85 : 0,
        },
      });
    }
    if (!m.getLayer(TYPHOON_STORM_FILL_10)) {
      m.addLayer({
        id: TYPHOON_STORM_FILL_10,
        type: "fill",
        source: TYPHOON_STORM_SOURCE,
        filter: ["==", ["get", "level"], 10],
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": isTyphoon ? 0.35 : 0,
        },
      });
    }
    if (!m.getLayer(TYPHOON_STORM_LINE_10)) {
      m.addLayer({
        id: TYPHOON_STORM_LINE_10,
        type: "line",
        source: TYPHOON_STORM_SOURCE,
        filter: ["==", ["get", "level"], 10],
        paint: {
          "line-color": "#f43f5e",
          "line-width": 1.8,
          "line-opacity": isTyphoon ? 0.9 : 0,
        },
      });
    }

    // 3.3 Past Track Solid Line
    if (!m.getSource(TYPHOON_PAST_SOURCE)) {
      m.addSource(TYPHOON_PAST_SOURCE, {
        type: "geojson",
        data: getPastTrackGeoJSON(currTrack),
      });
    }
    if (!m.getLayer(TYPHOON_PAST_LAYER)) {
      m.addLayer({
        id: TYPHOON_PAST_LAYER,
        type: "line",
        source: TYPHOON_PAST_SOURCE,
        paint: {
          "line-color": "#f1f5f9",
          "line-width": 2.2,
          "line-opacity": isTyphoon ? 0.95 : 0,
        },
      });
    }

    // 3.4 Forecast Track Dashed Line
    if (!m.getSource(TYPHOON_FORECAST_SOURCE)) {
      m.addSource(TYPHOON_FORECAST_SOURCE, {
        type: "geojson",
        data: getForecastTrackGeoJSON(currTrack),
      });
    }
    if (!m.getLayer(TYPHOON_FORECAST_LAYER)) {
      m.addLayer({
        id: TYPHOON_FORECAST_LAYER,
        type: "line",
        source: TYPHOON_FORECAST_SOURCE,
        paint: {
          "line-color": "#facc15",
          "line-width": 2.2,
          "line-dasharray": [3, 2],
          "line-opacity": isTyphoon ? 0.95 : 0,
        },
      });
    }

    // 3.5 Track Points (Circles)
    if (!m.getSource(TYPHOON_POINTS_SOURCE)) {
      m.addSource(TYPHOON_POINTS_SOURCE, {
        type: "geojson",
        data: getTrackPointsGeoJSON(currTrack),
      });
    }
    if (!m.getLayer(TYPHOON_POINTS_LAYER)) {
      m.addLayer({
        id: TYPHOON_POINTS_LAYER,
        type: "circle",
        source: TYPHOON_POINTS_SOURCE,
        paint: {
          "circle-radius": 4.5,
          "circle-color": [
            "match",
            ["get", "intensity"],
            "熱帶低壓",
            "#38bdf8",
            "輕度",
            "#facc15",
            "中度",
            "#fb923c",
            "強烈",
            "#f43f5e",
            "#facc15",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": isTyphoon ? 0.95 : 0,
          "circle-stroke-opacity": isTyphoon ? 0.95 : 0,
        },
      });
    }

    // 4. Station Circle Markers (Hidden when activeLayer === "typhoon")
    if (!m.getSource(STATIONS_SOURCE)) {
      m.addSource(STATIONS_SOURCE, {
        type: "geojson",
        data: stationsToGeoJSON(currStations),
      });
    }
    if (!m.getLayer(STATIONS_LAYER)) {
      m.addLayer({
        id: STATIONS_LAYER,
        type: "circle",
        source: STATIONS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 10, 11],
          "circle-color": maplibreStepExpression(numericLayer, LAYER_PROPERTY[numericLayer]) as never,
          "circle-stroke-width": 1.5,
          "circle-stroke-color":
            currMapStyle === "light" || currMapStyle === "streets"
              ? "rgba(0,0,0,0.6)"
              : "rgba(255,255,255,0.85)",
          "circle-opacity": 0.9,
        },
        layout: {
          visibility: currShowStations && !isTyphoon ? "visible" : "none",
        },
      });
    }
  };

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyleOpt = MAP_STYLES.find((s) => s.key === mapStyle);
    const m = new MapLibreMap({
      container: containerRef.current,
      style: initialStyleOpt ? initialStyleOpt.style : "https://tiles.openfreemap.org/styles/dark",
      center: [120.95, 23.8],
      zoom: 7.2,
      minZoom: 6.2,
      maxZoom: 10.5,
      maxBounds: TAIWAN_BOUNDS,
      attributionControl: { compact: true },
    });

    m.on("style.load", () => {
      setupCustomLayers(m);
      setLoaded(true);
    });

    // Handle clicks: typhoon point click or station click
    m.on("click", (e) => {
      if (latestPropsRef.current.activeLayer === "typhoon") {
        if (m.getLayer(TYPHOON_POINTS_LAYER)) {
          const features = m.queryRenderedFeatures(e.point, { layers: [TYPHOON_POINTS_LAYER] });
          if (features && features.length > 0) {
            const idx = features[0].properties?.index;
            if (typeof idx === "number") {
              onSelectTyphoonIndexRef.current(idx);
            }
          }
        }
        return;
      }

      if (!m.getLayer(STATIONS_LAYER)) return;
      const features = m.queryRenderedFeatures(e.point, { layers: [STATIONS_LAYER] });
      if (features && features.length > 0) {
        onSelectStationRef.current(features[0].properties as unknown as StationObservation);
      }
    });

    m.on("mousemove", (e) => {
      if (latestPropsRef.current.activeLayer === "typhoon") {
        if (m.getLayer(TYPHOON_POINTS_LAYER)) {
          const features = m.queryRenderedFeatures(e.point, { layers: [TYPHOON_POINTS_LAYER] });
          m.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
        }
        return;
      }

      if (!m.getLayer(STATIONS_LAYER)) return;
      const features = m.queryRenderedFeatures(e.point, { layers: [STATIONS_LAYER] });
      m.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
    });

    mapRef.current = m;
    setMap(m);

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Basemap Style Switch
  useEffect(() => {
    if (!mapRef.current) return;
    if (currentStyleKeyRef.current === mapStyle) return;
    currentStyleKeyRef.current = mapStyle;

    const styleOpt = MAP_STYLES.find((s) => s.key === mapStyle);
    if (styleOpt) {
      mapRef.current.setStyle(styleOpt.style);
    }
  }, [mapStyle]);

  // Compute & Push High-Resolution Diffusion Image
  useEffect(() => {
    if (!loaded || !mapRef.current || stations.length === 0) return;
    const numericLayer: LayerKey = activeLayer === "typhoon" ? "temp" : activeLayer;
    const diff = generateDiffusionImage(stations, numericLayer);

    if (diff && diff.url) {
      currentDiffusionUrlRef.current = diff.url;
      const src = mapRef.current.getSource(DIFFUSION_SOURCE) as ImageSource | undefined;
      if (src && typeof src.updateImage === "function") {
        src.updateImage({
          url: diff.url,
          coordinates: DIFFUSION_COORDINATES,
        });
      }
    }
  }, [stations, activeLayer, loaded]);

  // Handle Layer Switch & Camera Transition
  const prevActiveLayerRef = useRef<LayerKey | "typhoon">(activeLayer);
  const prevTrackIdRef = useRef<string>(typhoonTrack.id);
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const m = mapRef.current;
    const prevLayer = prevActiveLayerRef.current;
    const trackChanged = prevTrackIdRef.current !== typhoonTrack.id;
    prevActiveLayerRef.current = activeLayer;
    prevTrackIdRef.current = typhoonTrack.id;

    const isTyphoon = activeLayer === "typhoon";

    // 1. Camera Transition
    if (isTyphoon && (prevLayer !== "typhoon" || trackChanged)) {
      // Release bounds constraints and zoom limits for East Asia/Pacific view
      m.setMaxBounds(null);
      m.setMinZoom(3.5);
      m.setMaxZoom(14);

      const typhoonBounds = getTyphoonBounds(typhoonTrack);
      m.fitBounds(typhoonBounds, {
        padding: { top: 70, bottom: 85, left: 80, right: 80 },
        duration: 1400,
      });
    } else if (prevLayer === "typhoon" && !isTyphoon) {
      // Re-apply Taiwan bounds & limits
      m.setMaxBounds(TAIWAN_BOUNDS);
      m.setMinZoom(6.2);
      m.setMaxZoom(10.5);

      m.flyTo({
        center: [120.95, 23.8],
        zoom: 7.2,
        duration: 1200,
      });
    }

    // 2. Hide / Show Taiwan Data
    if (m.getLayer(DIFFUSION_LAYER)) {
      m.setPaintProperty(
        DIFFUSION_LAYER,
        "raster-opacity",
        showDiffusion && !isTyphoon ? diffusionOpacity : 0
      );
    }
    if (m.getLayer(COUNTIES_LINE_LAYER)) {
      m.setPaintProperty(
        COUNTIES_LINE_LAYER,
        "line-opacity",
        showDiffusion && !isTyphoon ? 0.6 : 0
      );
    }
    if (m.getLayer(STATIONS_LAYER)) {
      m.setLayoutProperty(
        STATIONS_LAYER,
        "visibility",
        showStations && !isTyphoon ? "visible" : "none"
      );
    }

    // 3. Typhoon Layers Opacity / Visibility
    const typhoonOpacity = isTyphoon ? 0.95 : 0;
    if (m.getLayer(TYPHOON_PAST_LAYER)) {
      m.setPaintProperty(TYPHOON_PAST_LAYER, "line-opacity", typhoonOpacity);
    }
    if (m.getLayer(TYPHOON_FORECAST_LAYER)) {
      m.setPaintProperty(TYPHOON_FORECAST_LAYER, "line-opacity", typhoonOpacity);
    }
    if (m.getLayer(TYPHOON_UNCERTAINTY_FILL_LAYER)) {
      m.setPaintProperty(TYPHOON_UNCERTAINTY_FILL_LAYER, "fill-opacity", isTyphoon ? 0.16 : 0);
    }
    if (m.getLayer(TYPHOON_UNCERTAINTY_LINE_LAYER)) {
      m.setPaintProperty(TYPHOON_UNCERTAINTY_LINE_LAYER, "line-opacity", isTyphoon ? 0.8 : 0);
    }
    if (m.getLayer(TYPHOON_STORM_FILL_7)) {
      m.setPaintProperty(TYPHOON_STORM_FILL_7, "fill-opacity", isTyphoon ? 0.22 : 0);
    }
    if (m.getLayer(TYPHOON_STORM_LINE_7)) {
      m.setPaintProperty(TYPHOON_STORM_LINE_7, "line-opacity", isTyphoon ? 0.85 : 0);
    }
    if (m.getLayer(TYPHOON_STORM_FILL_10)) {
      m.setPaintProperty(TYPHOON_STORM_FILL_10, "fill-opacity", isTyphoon ? 0.35 : 0);
    }
    if (m.getLayer(TYPHOON_STORM_LINE_10)) {
      m.setPaintProperty(TYPHOON_STORM_LINE_10, "line-opacity", isTyphoon ? 0.9 : 0);
    }
    if (m.getLayer(TYPHOON_POINTS_LAYER)) {
      m.setPaintProperty(TYPHOON_POINTS_LAYER, "circle-opacity", typhoonOpacity);
      m.setPaintProperty(TYPHOON_POINTS_LAYER, "circle-stroke-opacity", typhoonOpacity);
    }
  }, [activeLayer, loaded, showDiffusion, diffusionOpacity, showStations, typhoonTrack]);

  // Update ALL Typhoon GeoJSON sources whenever typhoonTrack or selectedTyphoonIndex changes
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const m = mapRef.current;

    // 1. Update Forecast Uncertainty Circles
    const uncSrc = m.getSource(TYPHOON_UNCERTAINTY_SOURCE) as GeoJSONSource | undefined;
    uncSrc?.setData(getForecastCirclesGeoJSON(typhoonTrack));

    // 2. Update Track Points
    const ptsSrc = m.getSource(TYPHOON_POINTS_SOURCE) as GeoJSONSource | undefined;
    ptsSrc?.setData(getTrackPointsGeoJSON(typhoonTrack));

    // 3. Update Past Track Line
    const pastSrc = m.getSource(TYPHOON_PAST_SOURCE) as GeoJSONSource | undefined;
    pastSrc?.setData(getPastTrackGeoJSON(typhoonTrack));

    // 4. Update Forecast Track Line
    const forecastSrc = m.getSource(TYPHOON_FORECAST_SOURCE) as GeoJSONSource | undefined;
    forecastSrc?.setData(getForecastTrackGeoJSON(typhoonTrack));

    // 5. Update Storm Radii for currently selected point
    const pt =
      typhoonTrack.points[selectedTyphoonIndex] || typhoonTrack.points[typhoonTrack.currentIndex];
    const stormSrc = m.getSource(TYPHOON_STORM_SOURCE) as GeoJSONSource | undefined;
    stormSrc?.setData(getStormRadiiGeoJSON(pt));
  }, [selectedTyphoonIndex, typhoonTrack, loaded]);

  // Manage Typhoon HTML Markers (Current Position Marker & Forecast Badges)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const m = mapRef.current;

    // Clean up existing markers first
    if (typhoonMarkerRef.current) {
      typhoonMarkerRef.current.remove();
      typhoonMarkerRef.current = null;
    }
    forecastMarkersRef.current.forEach((mk) => mk.remove());
    forecastMarkersRef.current = [];

    if (activeLayer !== "typhoon") return;

    const currentPt =
      typhoonTrack.points[selectedTyphoonIndex] || typhoonTrack.points[typhoonTrack.currentIndex];

    // 1. Typhoon Active Marker (Spinning 🌀 icon + radar pulse + floating info badge)
    const markerEl = document.createElement("div");
    markerEl.className = "relative flex flex-col items-center justify-center pointer-events-auto cursor-pointer";
    markerEl.innerHTML = `
      <div class="absolute -top-11 flex flex-col items-center pointer-events-none drop-shadow-md">
        <div class="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 shadow-lg whitespace-nowrap border border-amber-300">
          ${currentPt.intensity}颱風 ${typhoonTrack.name}
        </div>
        <div class="mt-0.5 rounded bg-slate-900/90 px-1.5 py-0.2 text-[9px] font-mono text-white/90 whitespace-nowrap border border-white/20 backdrop-blur-sm">
          ${currentPt.windSpeed} m/s | ${currentPt.status === "forecast" ? "預報" : "實測"}
        </div>
      </div>
      <div class="relative flex items-center justify-center">
        <div class="absolute h-9 w-9 rounded-full bg-amber-400/35 animate-ping"></div>
        <div class="absolute h-6 w-6 rounded-full bg-amber-500/50"></div>
        <div class="text-2xl animate-spin select-none" style="animation-duration: 3s">🌀</div>
      </div>
    `;

    const activeMarker = new Marker({ element: markerEl, anchor: "center" })
      .setLngLat([currentPt.lon, currentPt.lat])
      .addTo(m);
    typhoonMarkerRef.current = activeMarker;

    // 2. Forecast Date/Time Badges matching the user's reference screenshot
    const forecastPoints = typhoonTrack.points.filter((p) => p.status === "forecast");
    forecastPoints.forEach((fpt) => {
      const badgeEl = document.createElement("div");
      badgeEl.className =
        "rounded-full bg-rose-700/85 hover:bg-rose-600 px-2 py-0.5 text-[10px] font-mono font-bold text-white shadow-lg border border-white/30 cursor-pointer whitespace-nowrap backdrop-blur-sm transition-transform hover:scale-110 active:scale-95";
      badgeEl.innerText = fpt.timeStr;
      badgeEl.onclick = (e) => {
        e.stopPropagation();
        const ptIdx = typhoonTrack.points.findIndex((p) => p.id === fpt.id);
        if (ptIdx !== -1) {
          onSelectTyphoonIndexRef.current(ptIdx);
        }
      };

      const fMarker = new Marker({ element: badgeEl, anchor: "center" })
        .setLngLat([fpt.lon, fpt.lat])
        .addTo(m);
      forecastMarkersRef.current.push(fMarker);
    });

    return () => {
      if (typhoonMarkerRef.current) {
        typhoonMarkerRef.current.remove();
        typhoonMarkerRef.current = null;
      }
      forecastMarkersRef.current.forEach((mk) => mk.remove());
      forecastMarkersRef.current = [];
    };
  }, [activeLayer, selectedTyphoonIndex, typhoonTrack, loaded]);

  // Push station data updates
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const src = mapRef.current.getSource(STATIONS_SOURCE) as GeoJSONSource | undefined;
    src?.setData(stationsToGeoJSON(stations));
  }, [stations, loaded]);

  // Toggle station color on layer or basemap change
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const m = mapRef.current;
    if (!m.getLayer(STATIONS_LAYER)) return;

    const isTyphoon = activeLayer === "typhoon";
    m.setLayoutProperty(
      STATIONS_LAYER,
      "visibility",
      showStations && !isTyphoon ? "visible" : "none"
    );

    const numericLayer: LayerKey = isTyphoon ? "temp" : activeLayer;
    m.setPaintProperty(
      STATIONS_LAYER,
      "circle-color",
      maplibreStepExpression(numericLayer, LAYER_PROPERTY[numericLayer]) as never
    );
    m.setPaintProperty(
      STATIONS_LAYER,
      "circle-stroke-color",
      mapStyle === "light" || mapStyle === "streets" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)"
    );
  }, [activeLayer, showStations, mapStyle, loaded]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {map && showParticles && windGrid && activeLayer !== "typhoon" && (
        <WindParticleLayer map={map} grid={windGrid} mapStyle={mapStyle} />
      )}
    </div>
  );
}
