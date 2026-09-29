import type { StationObservation } from "@/lib/cwaObservations";
import type { LayerKey } from "@/lib/colorScales";
import { MAP_STYLES, type MapStyleKey } from "@/lib/mapStyles";

export type ActiveLayer = LayerKey | "typhoon";

const LAYERS: { key: ActiveLayer; label: string; icon: string }[] = [
  { key: "temp", label: "氣溫", icon: "🌡️" },
  { key: "rain", label: "雨量", icon: "🌧️" },
  { key: "humidity", label: "濕度", icon: "💧" },
  { key: "wind", label: "風速", icon: "🌬️" },
  { key: "typhoon", label: "颱風", icon: "🌀" },
];

interface Props {
  // Weather layer
  activeLayer: ActiveLayer;
  onLayerChange: (layer: ActiveLayer) => void;
  // Basemap style
  mapStyle: MapStyleKey;
  onMapStyleChange: (style: MapStyleKey) => void;
  // Diffusion continuous layer
  showDiffusion: boolean;
  onToggleDiffusion: (v: boolean) => void;
  diffusionOpacity: number;
  onChangeDiffusionOpacity: (v: number) => void;
  // Stations & Particles
  showStations: boolean;
  onToggleStations: (v: boolean) => void;
  showParticles: boolean;
  onToggleParticles: (v: boolean) => void;
  // Station picker
  stations: StationObservation[];
  selectedStationId: string | null;
  onSelectStationId: (id: string) => void;
}

export default function LayerSidebar({
  activeLayer,
  onLayerChange,
  mapStyle,
  onMapStyleChange,
  showDiffusion,
  onToggleDiffusion,
  diffusionOpacity,
  onChangeDiffusionOpacity,
  showStations,
  onToggleStations,
  showParticles,
  onToggleParticles,
  stations,
  selectedStationId,
  onSelectStationId,
}: Props) {
  return (
    <div className="w-[210px] max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl border border-white/10 bg-black/75 p-3 text-white shadow-2xl backdrop-blur-md">
      {/* 1. Basemap Style Switcher */}
      <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        底圖樣式
      </div>
      <div className="grid grid-cols-2 gap-1">
        {MAP_STYLES.map((st) => (
          <button
            key={st.key}
            onClick={() => onMapStyleChange(st.key)}
            title={st.description}
            className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-all ${
              mapStyle === st.key
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{st.icon}</span>
            <span>{st.label}</span>
          </button>
        ))}
      </div>

      <div className="my-2.5 h-px bg-white/10" />

      {/* 2. Weather Layer */}
      <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        氣象圖層
      </div>
      <div className="space-y-1">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => onLayerChange(l.key)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeLayer === l.key
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      <div className="my-2.5 h-px bg-white/10" />

      {/* 3. Visual Overlays */}
      <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        顯示效果
      </div>
      <div className="space-y-1.5">
        {/* High-Resolution Continuous Diffusion Layer */}
        <div className="rounded-lg bg-white/5 p-2">
          <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-white/90">
            <span className="flex items-center gap-1.5">
              <span>🎨</span>
              <span>連續擴散漸變</span>
            </span>
            <input
              type="checkbox"
              checked={showDiffusion}
              onChange={(e) => onToggleDiffusion(e.target.checked)}
              className="h-3.5 w-3.5 accent-sky-500"
            />
          </label>

          {showDiffusion && activeLayer !== "typhoon" && (
            <div className="mt-2 pt-1.5 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] text-white/60">
                <span>漸變透明度</span>
                <span className="font-mono text-sky-400">
                  {Math.round(diffusionOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={diffusionOpacity}
                onChange={(e) => onChangeDiffusionOpacity(parseFloat(e.target.value))}
                className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-sky-500"
              />
            </div>
          )}
        </div>

        {/* Stations Marker Toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/80 hover:bg-white/10">
          <span className="flex items-center gap-1.5">
            <span>📍</span>
            <span>測站標記</span>
          </span>
          <input
            type="checkbox"
            checked={showStations}
            onChange={(e) => onToggleStations(e.target.checked)}
            className="h-3.5 w-3.5 accent-sky-500"
          />
        </label>

        {/* Wind Particles Toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/80 hover:bg-white/10">
          <span className="flex items-center gap-1.5">
            <span>🍃</span>
            <span>風場流線</span>
          </span>
          <input
            type="checkbox"
            checked={showParticles}
            onChange={(e) => onToggleParticles(e.target.checked)}
            className="h-3.5 w-3.5 accent-sky-500"
          />
        </label>
      </div>

      <div className="my-2.5 h-px bg-white/10" />

      {/* 4. Station Picker */}
      <div className="mb-1 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        測站選單
      </div>
      <select
        value={selectedStationId ?? ""}
        onChange={(e) => onSelectStationId(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-sky-500"
      >
        <option value="" className="text-black">
          選擇測站…
        </option>
        {stations
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
          .map((s) => (
            <option key={s.id} value={s.id} className="text-black">
              {s.county} - {s.name}
            </option>
          ))}
      </select>
    </div>
  );
}
