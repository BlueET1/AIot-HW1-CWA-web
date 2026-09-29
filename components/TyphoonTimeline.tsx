"use client";

import { useEffect, useRef } from "react";
import type { TyphoonTrack, TyphoonPoint } from "@/lib/typhoonData";

interface Props {
  track: TyphoonTrack;
  tracks?: TyphoonTrack[];
  onSelectTrack?: (track: TyphoonTrack) => void;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function TyphoonTimeline({
  track,
  tracks,
  onSelectTrack,
  selectedIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  onRefresh,
  refreshing,
}: Props) {
  const points = track.points;
  const currentPoint: TyphoonPoint = points[selectedIndex] || points[track.currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync to "現在" whenever a new track is loaded
  const prevTrackIdRef = useRef(track.id);
  useEffect(() => {
    if (prevTrackIdRef.current !== track.id) {
      prevTrackIdRef.current = track.id;
      onSelectIndex(track.currentIndex);
    }
  }, [track.id, track.currentIndex, onSelectIndex]);

  // Auto-play interval: starts from "現在" and loops back to "現在" after the last forecast point
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (selectedIndex >= points.length - 1) {
          // Loop back to "現在" (currentIndex)
          onSelectIndex(track.currentIndex);
        } else {
          onSelectIndex(selectedIndex + 1);
        }
      }, 1400);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, selectedIndex, points.length, track.currentIndex, onSelectIndex]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      // If at the end or before "現在", set initial playback point to "現在"
      if (selectedIndex >= points.length - 1) {
        onSelectIndex(track.currentIndex);
      }
    }
    onTogglePlay();
  };

  const isCurrentTime = selectedIndex === track.currentIndex;
  const isForecast = currentPoint.status === "forecast";

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/20 bg-slate-950/85 px-4 py-2 text-white shadow-2xl backdrop-blur-xl transition-all">
      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        title={isPlaying ? "暫停路徑播放" : "從「現在」播放路徑時間軸"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 shadow-md shadow-rose-500/30 transition-transform hover:scale-105 hover:bg-rose-600 active:scale-95"
      >
        {isPlaying ? (
          <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-4 w-4 fill-white ml-0.5" viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Typhoon Name & Intensity (with selector if multiple) */}
      <div className="flex items-center gap-1.5 shrink-0 border-r border-white/10 pr-3">
        <span className="animate-spin text-base" style={{ animationDuration: "4s" }}>
          🌀
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            {tracks && tracks.length > 1 ? (
              <select
                value={track.id}
                onChange={(e) => {
                  const target = tracks.find((t) => t.id === e.target.value);
                  if (target && onSelectTrack) onSelectTrack(target);
                }}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer border-b border-white/20"
              >
                {tracks.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.name} ({t.internationalName})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-white tracking-wide">{track.name}</span>
            )}
            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
              {currentPoint.intensity}颱風
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="重新抓取 CWA 最新路徑資料"
                className={`ml-1 text-white/50 hover:text-white transition-transform ${
                  refreshing ? "animate-spin text-sky-400" : ""
                }`}
              >
                🔄
              </button>
            )}
          </div>
          {track.internationalName && (
            <span className="text-[9px] text-white/50">{track.internationalName}</span>
          )}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex flex-col gap-1 w-48 sm:w-64 md:w-80">
        <div className="flex items-center justify-between text-[10px] text-white/60">
          <span>{points[0]?.dateLabel}</span>
          <button
            type="button"
            onClick={() => onSelectIndex(track.currentIndex)}
            className={`cursor-pointer font-bold transition-colors ${
              isCurrentTime ? "text-amber-400 underline" : "text-white/60 hover:text-white"
            }`}
          >
            現在
          </button>
          <span>{points[points.length - 1]?.dateLabel}</span>
        </div>

        <div className="relative flex items-center">
          {/* Custom Track Dots */}
          <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-sky-400"
              style={{
                width: `${(selectedIndex / Math.max(1, points.length - 1)) * 100}%`,
              }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={points.length - 1}
            step={1}
            value={selectedIndex}
            onChange={(e) => onSelectIndex(parseInt(e.target.value, 10))}
            className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent accent-rose-500"
          />
        </div>
      </div>

      {/* Right Stats & Time display */}
      <div className="flex items-center gap-2.5 border-l border-white/10 pl-3 shrink-0">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            isForecast
              ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
              : "bg-sky-500/25 text-sky-300 border border-sky-500/40"
          }`}
        >
          {isForecast ? "預報" : "實測"}
        </span>

        <div className="flex flex-col text-right">
          <span className="font-mono text-xs font-bold text-white leading-tight">
            {currentPoint.timeStr}
          </span>
          <span className="font-mono text-[10px] text-white/70">
            {currentPoint.windSpeed} m/s · {currentPoint.pressure} hPa
          </span>
        </div>
      </div>
    </div>
  );
}
