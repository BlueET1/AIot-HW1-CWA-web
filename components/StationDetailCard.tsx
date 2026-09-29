import type { StationObservation } from "@/lib/cwaObservations";

function fmt(v: number | null, digits = 1): string {
  return v === null || v === undefined ? "--" : v.toFixed(digits);
}

const TAIPEI_TIME_FORMAT = new Intl.DateTimeFormat("zh-Hant-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return TAIPEI_TIME_FORMAT.format(new Date(iso));
}

interface Props {
  station: StationObservation;
  onRefresh: () => void;
}

export default function StationDetailCard({ station, onRefresh }: Props) {
  return (
    <div className="w-[260px] rounded-2xl border border-white/10 bg-black/75 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📍</span>
          <div>
            <div className="text-base font-bold">{station.name}</div>
            <div className="text-[10px] text-white/50">
              {station.county}
              {station.town}
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20 transition-colors"
        >
          ↻ 更新
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 font-medium">
          <span>🌡️</span>
          <span>{fmt(station.temp)}°C</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 font-medium">
          <span>💧</span>
          <span>{fmt(station.humidity, 0)}%</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 font-medium">
          <span>🌧️</span>
          <span>{fmt(station.rain)} mm</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 font-medium">
          <span>🌬️</span>
          <span>{fmt(station.windSpeed)} m/s</span>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-white/40">
        更新時間：{formatTime(station.obsTime)}
      </div>
    </div>
  );
}
