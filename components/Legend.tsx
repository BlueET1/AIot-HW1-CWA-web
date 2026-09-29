"use client";

import { useState } from "react";
import { SCALES, NO_DATA_COLOR, getContinuousCssGradient, type LayerKey } from "@/lib/colorScales";

const TITLES: Record<LayerKey, string> = {
  temp: "氣溫 °C",
  rain: "雨量 mm",
  humidity: "濕度 %",
  wind: "風速 m/s",
};

const RANGE_LABELS: Record<LayerKey, [string, string]> = {
  temp: ["0°C", "40°C+"],
  rain: ["0mm", "60mm+"],
  humidity: ["30%", "100%"],
  wind: ["0m/s", "25m/s+"],
};

export default function Legend({
  layer,
  showDiffusion = true,
}: {
  layer: LayerKey;
  showDiffusion?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const scale = SCALES[layer];
  const gradient = getContinuousCssGradient(layer);
  const [minLabel, maxLabel] = RANGE_LABELS[layer];

  return (
    <div className="w-[155px] rounded-2xl border border-white/10 bg-black/75 p-2.5 text-white shadow-2xl backdrop-blur-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">{TITLES[layer]}</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
          title={collapsed ? "展開詳細圖例" : "收合詳細圖例"}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {showDiffusion && (
        <div className="mt-1.5 mb-1.5">
          <div
            className="h-2 w-full rounded-full border border-white/20 shadow-inner"
            style={{ background: gradient }}
          />
          <div className="mt-0.5 flex justify-between text-[9px] font-mono text-white/50">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mt-1.5 space-y-0.5 border-t border-white/5 pt-1.5">
          {scale.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[11px] text-white/80">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: NO_DATA_COLOR }} />
            <span>無資料</span>
          </div>
        </div>
      )}
    </div>
  );
}
