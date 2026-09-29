import type { SummaryStats } from "@/lib/stats";

function Stat({ label, value, unit, station }: { label: string; value: string; unit: string; station?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2.5 py-1.5">
      <div className="text-[10px] text-white/50">{label}</div>
      <div className="text-base font-semibold text-white">
        {value}
        <span className="ml-0.5 text-xs font-normal text-white/60">{unit}</span>
      </div>
      {station && <div className="truncate text-[10px] text-white/50">{station}</div>}
    </div>
  );
}

export default function SummaryCard({ stats }: { stats: SummaryStats }) {
  return (
    <div className="w-[260px] rounded-2xl border border-white/10 bg-black/75 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="text-base font-bold">台灣即時氣象</div>
          <div className="text-[11px] text-white/50">CWA Weather Monitor</div>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          即時 API
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-white/60">
        <span>測站：{stats.count} 站</span>
        <span>•</span>
        <span>每 5 分鐘更新</span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
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
