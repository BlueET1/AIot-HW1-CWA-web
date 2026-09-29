import type { TyphoonTrack, TyphoonPoint, TyphoonIntensity } from "./typhoonData";

export interface TyphoonStatus {
  active: boolean;
  name?: string;
  internationalName?: string;
  intensity?: string;
  lat?: number;
  lon?: number;
  summary?: string;
}

interface RawSection {
  title?: string;
  value?: string;
}

interface RawInfo {
  description?: { section?: RawSection[] };
}

const NAME_RE = /(輕度|中度|強烈)?颱風\s*([一-龥]+)(?:（國際命名\s*([A-Za-z]+)）)?/;
const LATLON_RE = /北緯\s*([\d.]+)\s*度[，,]\s*東經\s*([\d.]+)\s*度/;

export function getIntensityFromWind(speed: number): TyphoonIntensity {
  if (speed >= 51.0) return "強烈";
  if (speed >= 32.7) return "中度";
  if (speed >= 17.2) return "輕度";
  return "熱帶低壓";
}

// CWA's typhoon warning bulletin (W-C0034-001) text parser
export function parseTyphoonBulletin(data: unknown): TyphoonStatus {
  const info: RawInfo[] = (data as { records?: { info?: RawInfo[] } })?.records?.info ?? [];
  if (!info.length) return { active: false };

  const sections = info[0]?.description?.section ?? [];
  const positionSection = sections.find((s) => s.value && LATLON_RE.test(s.value));
  if (!positionSection?.value) return { active: false };

  const latlon = positionSection.value.match(LATLON_RE);
  const nameMatch = positionSection.value.match(NAME_RE);
  if (!latlon) return { active: false };

  return {
    active: true,
    intensity: nameMatch?.[1],
    name: nameMatch?.[2],
    internationalName: nameMatch?.[3],
    lat: Number(latlon[1]),
    lon: Number(latlon[2]),
    summary: positionSection.value,
  };
}

interface RawFix {
  DateTime?: string;
  InitialTime?: string;
  ForecastHour?: string;
  CoordinateLongitude?: string;
  CoordinateLatitude?: string;
  MaxWindSpeed?: string;
  MaxGustSpeed?: string;
  Pressure?: string;
  Circle15ms?: { Radius?: string; QuadrantRadii?: unknown } | string;
  Circle25ms?: { Radius?: string; QuadrantRadii?: unknown } | string;
  Radius70PercentProbability?: string;
  MovingSpeed?: string;
  MovingDirection?: string;
}

interface RawTC {
  Year?: string;
  TyphoonName?: string;
  CwaTyphoonName?: string;
  CwaTdNo?: string;
  CwaTyNo?: string;
  AnalysisData?: {
    Fix?: RawFix[];
  };
  ForecastData?: {
    Fix?: RawFix[];
  };
}

/**
 * Parses CWA OpenData W-C0034-005 (Live Tropical Cyclones track and forecast).
 * Returns real-time tracks with past observation fixes and official forecast uncertainty circles.
 */
export function parseCWATropicalCyclones(data: unknown): TyphoonTrack[] {
  const records = (data as { records?: { TropicalCyclones?: { TropicalCyclone?: RawTC[] } } })?.records;
  const tcList = records?.TropicalCyclones?.TropicalCyclone;
  if (!Array.isArray(tcList) || tcList.length === 0) {
    return [];
  }

  const tracks: TyphoonTrack[] = [];

  for (const tc of tcList) {
    const analysisFixes = tc.AnalysisData?.Fix ?? [];
    const forecastFixes = tc.ForecastData?.Fix ?? [];

    if (analysisFixes.length === 0 && forecastFixes.length === 0) continue;

    const points: TyphoonPoint[] = [];

    // 1. Process Past & Current Analysis Fixes
    analysisFixes.forEach((fix, idx) => {
      if (!fix.DateTime || !fix.CoordinateLatitude || !fix.CoordinateLongitude) return;

      const isCurrent = idx === analysisFixes.length - 1;
      const d = new Date(fix.DateTime);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hour = String(d.getHours()).padStart(2, "0");
      const windSpeed = Number(fix.MaxWindSpeed) || 0;
      const windGust = Number(fix.MaxGustSpeed) || undefined;
      const pressure = Number(fix.Pressure) || 1000;

      let radius7 = 100;
      if (typeof fix.Circle15ms === "object" && fix.Circle15ms?.Radius) {
        radius7 = Number(fix.Circle15ms.Radius) || 100;
      }

      let radius10: number | undefined;
      if (typeof fix.Circle25ms === "object" && fix.Circle25ms?.Radius) {
        const r = Number(fix.Circle25ms.Radius);
        if (r > 0) radius10 = r;
      }

      points.push({
        id: `fix-${idx}`,
        timeStr: `${month}/${day} ${hour}時`,
        dateLabel: `${month}/${day}`,
        hourLabel: `${hour}時`,
        timestamp: d.getTime(),
        lat: Number(fix.CoordinateLatitude),
        lon: Number(fix.CoordinateLongitude),
        intensity: getIntensityFromWind(windSpeed),
        windSpeed,
        windGust,
        pressure,
        radius7,
        radius10,
        status: isCurrent ? "current" : "past",
      });
    });

    const currentIndex = Math.max(0, points.length - 1);

    // 2. Process Official Forecast Fixes
    forecastFixes.forEach((fix, idx) => {
      if (!fix.InitialTime || !fix.CoordinateLatitude || !fix.CoordinateLongitude) return;

      const initD = new Date(fix.InitialTime);
      const fHour = Number(fix.ForecastHour) || (idx + 1) * 6;
      const d = new Date(initD.getTime() + fHour * 3600 * 1000);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hour = String(d.getHours()).padStart(2, "0");
      const windSpeed = Number(fix.MaxWindSpeed) || 0;
      const windGust = Number(fix.MaxGustSpeed) || undefined;
      const pressure = Number(fix.Pressure) || 1000;

      let radius7 = 100;
      if (typeof fix.Circle15ms === "object" && fix.Circle15ms?.Radius) {
        radius7 = Number(fix.Circle15ms.Radius) || 100;
      }

      let radius10: number | undefined;
      if (typeof fix.Circle25ms === "object" && fix.Circle25ms?.Radius) {
        const r = Number(fix.Circle25ms.Radius);
        if (r > 0) radius10 = r;
      }

      const rawProb = Number(fix.Radius70PercentProbability);
      const uncertaintyRadius = !isNaN(rawProb) && rawProb > 0 ? rawProb : Math.min(350, fHour * 3.5 + 40);

      points.push({
        id: `forecast-${idx}`,
        timeStr: `${month}/${day} ${hour}時`,
        dateLabel: `${month}/${day}`,
        hourLabel: `${hour}時`,
        timestamp: d.getTime(),
        lat: Number(fix.CoordinateLatitude),
        lon: Number(fix.CoordinateLongitude),
        intensity: getIntensityFromWind(windSpeed),
        windSpeed,
        windGust,
        pressure,
        radius7,
        radius10,
        uncertaintyRadius,
        status: "forecast",
      });
    });

    const currentPt = points[currentIndex] || points[0];
    const name = tc.CwaTyphoonName || "熱帶氣旋";
    const internationalName = tc.TyphoonName || "";
    const intensity = currentPt ? currentPt.intensity : "輕度";

    tracks.push({
      id: `tc-${tc.Year || "2026"}-${internationalName || name}`,
      name,
      internationalName,
      intensity,
      currentIndex,
      points,
      summary: `${intensity}颱風 ${name}（${internationalName}）中心目前位置在北緯 ${currentPt?.lat ?? 0} 度，東經 ${currentPt?.lon ?? 0} 度，近中心最大風速每秒 ${currentPt?.windSpeed ?? 0} 公尺，中心氣壓 ${currentPt?.pressure ?? 1000} 百帕，七級風暴風半徑約 ${currentPt?.radius7 ?? 100} 公里。`,
    });
  }

  return tracks;
}
