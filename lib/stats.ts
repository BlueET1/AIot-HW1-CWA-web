import type { StationObservation } from "./cwaObservations";

export interface FieldExtreme {
  value: number;
  stationName: string;
}

export interface SummaryStats {
  count: number;
  maxTemp: FieldExtreme | null;
  minTemp: FieldExtreme | null;
  maxRain: FieldExtreme | null;
  maxWind: FieldExtreme | null;
}

function extreme(
  stations: StationObservation[],
  field: "temp" | "rain" | "windSpeed",
  pick: "max" | "min"
): FieldExtreme | null {
  let best: FieldExtreme | null = null;
  for (const s of stations) {
    const v = s[field];
    if (v === null || v === undefined) continue;
    if (!best || (pick === "max" ? v > best.value : v < best.value)) {
      best = { value: v, stationName: s.name };
    }
  }
  return best;
}

export function computeSummary(stations: StationObservation[]): SummaryStats {
  return {
    count: stations.length,
    maxTemp: extreme(stations, "temp", "max"),
    minTemp: extreme(stations, "temp", "min"),
    maxRain: extreme(stations, "rain", "max"),
    maxWind: extreme(stations, "windSpeed", "max"),
  };
}
