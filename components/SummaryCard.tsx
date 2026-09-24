import type { SummaryStats } from "@/lib/stats";

function Stat({ label, value, unit, station }: { label: string; value: string; unit: string; station?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="text-xl font-semibold text-white">
        {value}
        <span className="ml-0.5 text-sm font-normal text-white/60">{unit}</span>
      </div>
      {station && <div className="text-[11px] text-white/50">{station}</div>}
    </div>
  );
}

export default function SummaryCard({ stats }: { stats: SummaryStats }) {
  return (
    <div className="w-[300px] rounded-2xl border border-white/10 bg-black/70 p-4 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">台灣即時氣象</div>
          <div className="text-xs text-white/50">CWA Weather Monitor</div>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-400">
          即時 API
        </span>
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-white/60">
        <div>觀測測站：{stats.count} 站</div>
        <div>資料來源：中央氣象署</div>
        <div>更新頻率：每 5 分鐘</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat
          label="最高溫"
          value={stats.maxTemp ? stats.maxTemp.value.toFixed(1) : "--"}
          unit="°"
          station={stats.maxTemp?.stationName}
        />
        <Stat
          label="最低溫"
          value={stats.minTemp ? stats.minTemp.value.toFixed(1) : "--"}
          unit="°"
          station={stats.minTemp?.stationName}
        />
        <Stat
          label="最大雨量"
          value={stats.maxRain ? stats.maxRain.value.toFixed(0) : "--"}
          unit="mm"
          station={stats.maxRain?.stationName}
        />
        <Stat
          label="最大風速"
          value={stats.maxWind ? stats.maxWind.value.toFixed(0) : "--"}
          unit="m/s"
          station={stats.maxWind?.stationName}
        />
      </div>
    </div>
  );
}
