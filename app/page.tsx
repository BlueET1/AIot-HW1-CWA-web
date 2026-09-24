"use client";

import { useCallback, useEffect, useState } from "react";
import WeatherMap from "@/components/WeatherMap";
import SummaryCard from "@/components/SummaryCard";
import LayerSidebar, { type ActiveLayer } from "@/components/LayerSidebar";
import Legend from "@/components/Legend";
import StationDetailCard from "@/components/StationDetailCard";
import type { StationObservation } from "@/lib/cwaObservations";
import type { WindGridData } from "@/lib/windGrid";
import type { TyphoonStatus } from "@/lib/typhoonParser";
import { computeSummary } from "@/lib/stats";

const OBS_REFRESH_MS = 5 * 60 * 1000;
const WIND_REFRESH_MS = 30 * 60 * 1000;

export default function Home() {
  const [stations, setStations] = useState<StationObservation[]>([]);
  const [windGrid, setWindGrid] = useState<WindGridData | null>(null);
  const [typhoon, setTyphoon] = useState<TyphoonStatus | null>(null);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("temp");
  const [showStations, setShowStations] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const res = await fetch("/api/typhoon");
      const data = await res.json();
      if (res.ok) setTyphoon(data);
    } catch {
      setTyphoon({ active: false });
    }
  }, []);

  useEffect(() => {
    // Intentional: syncing with an external system (CWA/Open-Meteo APIs) on
    // mount + polling interval, one of React's documented effect use cases.
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
        windGrid={windGrid}
        showParticles={showParticles}
        showStations={showStations}
        typhoon={typhoon}
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

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="pointer-events-auto">
            <SummaryCard stats={summary} />
          </div>
          <div className="pointer-events-auto">
            <LayerSidebar
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
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

        <div className="flex items-end justify-between gap-4 pb-5">
          <div className="pointer-events-auto">
            {selectedStation && (
              <StationDetailCard station={selectedStation} onRefresh={loadObservations} />
            )}
          </div>
          <div className="pointer-events-auto">
            {activeLayer === "typhoon" ? (
              <div className="w-[220px] rounded-2xl border border-white/10 bg-black/70 p-4 text-sm text-white shadow-2xl backdrop-blur-md">
                {typhoon?.active ? (
                  <>
                    <div className="font-bold">
                      {typhoon.intensity}颱風 {typhoon.name}
                      {typhoon.internationalName ? `（${typhoon.internationalName}）` : ""}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-white/70">{typhoon.summary}</p>
                  </>
                ) : (
                  <div className="text-white/60">目前無颱風警報</div>
                )}
              </div>
            ) : (
              <Legend layer={activeLayer} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
