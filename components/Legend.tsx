import { SCALES, NO_DATA_COLOR, type LayerKey } from "@/lib/colorScales";

const TITLES: Record<LayerKey, string> = {
  temp: "氣溫 °C",
  rain: "雨量 mm",
  humidity: "濕度 %",
  wind: "風速 m/s",
};

export default function Legend({ layer }: { layer: LayerKey }) {
  const scale = SCALES[layer];
  return (
    <div className="w-[150px] rounded-2xl border border-white/10 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 text-xs font-medium text-white/50">{TITLES[layer]}</div>
      <div className="space-y-1">
        {scale.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs text-white/80">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: NO_DATA_COLOR }} />
          無資料
        </div>
      </div>
    </div>
  );
}
