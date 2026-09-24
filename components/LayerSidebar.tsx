import type { StationObservation } from "@/lib/cwaObservations";
import type { LayerKey } from "@/lib/colorScales";

export type ActiveLayer = LayerKey | "typhoon";

const LAYERS: { key: ActiveLayer; label: string; icon: string }[] = [
  { key: "temp", label: "氣溫", icon: "🌡️" },
  { key: "rain", label: "雨量", icon: "🌧️" },
  { key: "humidity", label: "濕度", icon: "💧" },
  { key: "wind", label: "風速", icon: "🌬️" },
  { key: "typhoon", label: "颱風", icon: "🌀" },
];

interface Props {
  activeLayer: ActiveLayer;
  onLayerChange: (layer: ActiveLayer) => void;
  showStations: boolean;
  onToggleStations: (v: boolean) => void;
  showParticles: boolean;
  onToggleParticles: (v: boolean) => void;
  stations: StationObservation[];
  selectedStationId: string | null;
  onSelectStationId: (id: string) => void;
}

export default function LayerSidebar({
  activeLayer,
  onLayerChange,
  showStations,
  onToggleStations,
  showParticles,
  onToggleParticles,
  stations,
  selectedStationId,
  onSelectStationId,
}: Props) {
  return (
    <div className="w-[220px] rounded-2xl border border-white/10 bg-black/70 p-4 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 text-xs font-medium text-white/50">圖層</div>
      <div className="space-y-1.5">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => onLayerChange(l.key)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              activeLayer === l.key ? "bg-sky-500 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </button>
        ))}
      </div>

      <div className="my-3 h-px bg-white/10" />

      <label className="flex items-center gap-2 py-1 text-sm text-white/80">
        <input
          type="checkbox"
          checked={showStations}
          onChange={(e) => onToggleStations(e.target.checked)}
          className="h-4 w-4 accent-sky-500"
        />
        測站點位
      </label>
      <label className="flex items-center gap-2 py-1 text-sm text-white/80">
        <input
          type="checkbox"
          checked={showParticles}
          onChange={(e) => onToggleParticles(e.target.checked)}
          className="h-4 w-4 accent-sky-500"
        />
        風場動畫
      </label>

      <div className="my-3 h-px bg-white/10" />

      <div className="mb-1 text-xs font-medium text-white/50">測站</div>
      <select
        value={selectedStationId ?? ""}
        onChange={(e) => onSelectStationId(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white outline-none"
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
