"use client";

import { useCallback, useEffect, useState } from "react";
import WeatherMap from "@/components/WeatherMap";
import SummaryCard from "@/components/SummaryCard";
import LayerSidebar, { type ActiveLayer } from "@/components/LayerSidebar";
import Legend from "@/components/Legend";
import StationDetailCard from "@/components/StationDetailCard";
import TyphoonTimeline from "@/components/TyphoonTimeline";
import TyphoonLegend from "@/components/TyphoonLegend";
import type { StationObservation } from "@/lib/cwaObservations";
import type { WindGridData } from "@/lib/windGrid";
import type { TyphoonStatus } from "@/lib/typhoonParser";
import { DEFAULT_TYPHOON_TRACK, type TyphoonTrack } from "@/lib/typhoonData";
import type { MapStyleKey } from "@/lib/mapStyles";
import { computeSummary } from "@/lib/stats";

const OBS_REFRESH_MS = 5 * 60 * 1000;
const WIND_REFRESH_MS = 30 * 60 * 1000;

export default function Home() {
  const [stations, setStations] = useState<StationObservation[]>([]);
  const [windGrid, setWindGrid] = useState<WindGridData | null>(null);
  const [typhoon, setTyphoon] = useState<TyphoonStatus | null>(null);
  const [typhoonTrack, setTyphoonTrack] = useState<TyphoonTrack>(DEFAULT_TYPHOON_TRACK);
  const [availableTracks, setAvailableTracks] = useState<TyphoonTrack[]>([DEFAULT_TYPHOON_TRACK]);
  const [selectedTyphoonIndex, setSelectedTyphoonIndex] = useState<number>(DEFAULT_TYPHOON_TRACK.currentIndex);
  const [isPlayingTyphoon, setIsPlayingTyphoon] = useState<boolean>(false);
  const [refreshingTyphoon, setRefreshingTyphoon] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("temp");
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("dark");
  const [showDiffusion, setShowDiffusion] = useState<boolean>(true);
  const [diffusionOpacity, setDiffusionOpacity] = useState<number>(0.7);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showParticles, setShowParticles] = useState<boolean>(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadObservations = useCallback(async () => {
    try {
      const res = await fetch("/api/observations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "抓取即時觀測資料失敗");
      setStations(data.stations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "抓取即時觀測資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWind = useCallback(async () => {
    try {
      const res = await fetch("/api/wind");
      const data = await res.json();
      if (res.ok) setWindGrid(data);
    } catch {
      // Wind animation is decorative; a failed fetch just disables it.
    }
  }, []);

  const loadTyphoon = useCallback(async () => {
    setRefreshingTyphoon(true);
    try {
      const res = await fetch("/api/typhoon");
      const data = await res.json();
      if (res.ok) {
        setTyphoon(data);
        if (data.tracks && data.tracks.length > 0) {
          setAvailableTracks(data.tracks);
          setTyphoonTrack(data.track || data.tracks[0]);
          setSelectedTyphoonIndex(data.track?.currentIndex ?? data.tracks[0].currentIndex);
        } else if (data.track) {
          setTyphoonTrack(data.track);
          setSelectedTyphoonIndex(data.track.currentIndex);
        }
      }
    } catch {
      setTyphoon({ active: false });
    } finally {
      setRefreshingTyphoon(false);
    }
  }, []);

  useEffect(() => {
    // Syncing with external weather APIs on mount + polling interval
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadObservations();
    loadWind();
    loadTyphoon();
    const obsTimer = setInterval(loadObservations, OBS_REFRESH_MS);
    const windTimer = setInterval(() => {
      loadWind();
      loadTyphoon();
    }, WIND_REFRESH_MS);
    return () => {
      clearInterval(obsTimer);
      clearInterval(windTimer);
    };
  }, [loadObservations, loadWind, loadTyphoon]);

  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? null;
  const summary = computeSummary(stations);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <WeatherMap
        stations={stations}
        activeLayer={activeLayer}
        mapStyle={mapStyle}
        showDiffusion={showDiffusion}
        diffusionOpacity={diffusionOpacity}
        windGrid={windGrid}
        showParticles={showParticles}
        showStations={showStations}
        typhoon={typhoon}
        typhoonTrack={typhoonTrack}
        selectedTyphoonIndex={selectedTyphoonIndex}
        onSelectTyphoonIndex={setSelectedTyphoonIndex}
        onSelectStation={(s) => setSelectedStationId(s?.id ?? null)}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
          正在載入即時氣象資料…
        </div>
      )}

      {error && !loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}

      {/* Top weather warning badge matching screenshot */}
      {activeLayer === "typhoon" && (
        <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-amber-500/30 bg-slate-950/80 px-3 py-1 text-xs text-amber-300 shadow-xl backdrop-blur-md">
          <span>⚠️</span>
          <span className="font-semibold">天氣特報 1 則</span>
          <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-200 border border-amber-500/40">
            海警
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto">
            <SummaryCard stats={summary} />
          </div>
          <div className="pointer-events-auto">
            <LayerSidebar
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              mapStyle={mapStyle}
              onMapStyleChange={setMapStyle}
              showDiffusion={showDiffusion}
              onToggleDiffusion={setShowDiffusion}
              diffusionOpacity={diffusionOpacity}
              onChangeDiffusionOpacity={setDiffusionOpacity}
              showStations={showStations}
              onToggleStations={setShowStations}
              showParticles={showParticles}
              onToggleParticles={setShowParticles}
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStationId={setSelectedStationId}
            />
          </div>
        </div>

        {/* Bottom controls & legend row */}
        <div className="relative flex items-end justify-between gap-3 pb-1">
          <div className="pointer-events-auto">
            {activeLayer !== "typhoon" && selectedStation && (
              <StationDetailCard station={selectedStation} onRefresh={loadObservations} />
            )}
          </div>

          {/* Floating bottom-center Typhoon Timeline Player */}
          {activeLayer === "typhoon" && (
            <div className="pointer-events-auto absolute bottom-1 left-1/2 -translate-x-1/2 z-30">
              <TyphoonTimeline
                track={typhoonTrack}
                tracks={availableTracks}
                onSelectTrack={(t) => {
                  setTyphoonTrack(t);
                  setSelectedTyphoonIndex(t.currentIndex);
                }}
                selectedIndex={selectedTyphoonIndex}
                onSelectIndex={setSelectedTyphoonIndex}
                isPlaying={isPlayingTyphoon}
                onTogglePlay={() => setIsPlayingTyphoon((v) => !v)}
                onRefresh={loadTyphoon}
                refreshing={refreshingTyphoon}
              />
            </div>
          )}

          <div className="pointer-events-auto">
            {activeLayer === "typhoon" ? (
              <TyphoonLegend />
            ) : (
              <Legend layer={activeLayer} showDiffusion={showDiffusion} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
