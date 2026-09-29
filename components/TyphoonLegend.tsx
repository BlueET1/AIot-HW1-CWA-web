"use client";

import { useState } from "react";

export default function TyphoonLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-[195px] rounded-2xl border border-white/10 bg-black/80 p-3 text-white shadow-2xl backdrop-blur-md transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/90">颱風路徑</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
          title={collapsed ? "展開詳細圖例" : "收合詳細圖例"}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2 text-[11px]">
          {/* Past Track */}
          <div className="flex items-center gap-2 text-white/80">
            <span className="inline-block h-0.5 w-6 bg-slate-200 shadow-sm" />
            <span>過去路徑</span>
          </div>

          {/* Forecast Track */}
          <div className="flex items-center gap-2 text-white/80">
            <span className="inline-block h-0.5 w-6 border-b-2 border-dashed border-amber-400" />
            <span>官方預報路徑</span>
          </div>

          {/* Uncertainty Circle */}
          <div className="flex items-center gap-2 text-white/80">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-amber-400 bg-amber-400/20" />
            <span>預報不確定圓 (70%)</span>
          </div>

          {/* Storm Radii */}
          <div className="flex items-center gap-2 text-white/80">
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full border border-amber-400 bg-amber-400/20">
              <span className="h-1.5 w-1.5 rounded-full border border-rose-500 bg-rose-500/40" />
            </span>
            <div className="flex flex-col">
              <span>暴風圈</span>
              <span className="text-[9px] text-white/50">七級 (外) / 十級 (內)</span>
            </div>
          </div>

          {/* Intensity Tiers */}
          <div className="border-t border-white/5 pt-1.5">
            <div className="mb-1 text-[10px] text-white/50">強度分級</div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="text-white/70">熱帶低壓</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                <span className="text-white/70">輕度</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-white/70">中度</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-white/70">強烈</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
