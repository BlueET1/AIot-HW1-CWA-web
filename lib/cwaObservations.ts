const CWA_BASE = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";

export interface StationObservation {
  id: string;
  name: string;
  county: string;
  town: string;
  lat: number;
  lon: number;
  obsTime: string | null;
  temp: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rain: number | null;
  pressure: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  weather: string | null;
}

// CWA uses -99 / -999 as "sensor has no reading" sentinels across numeric fields.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n) || n <= -90) return null;
  return n;
}

interface RawCoordinate {
  CoordinateName: string;
  StationLatitude: string;
  StationLongitude: string;
}

interface RawStation {
  StationId: string;
  StationName: string;
  ObsTime?: { DateTime?: string };
  GeoInfo: {
    CountyName?: string;
    TownName?: string;
    Coordinates: RawCoordinate[];
  };
  WeatherElement: {
    AirTemperature?: string;
    RelativeHumidity?: string;
    WindSpeed?: string;
    WindDirection?: string;
    AirPressure?: string;
    Weather?: string;
    Now?: { Precipitation?: string };
    DailyExtreme?: {
      DailyHigh?: { TemperatureInfo?: { AirTemperature?: string } };
      DailyLow?: { TemperatureInfo?: { AirTemperature?: string } };
    };
  };
}

export async function fetchStationObservations(apiKey: string): Promise<StationObservation[]> {
  const url = `${CWA_BASE}/O-A0003-001?Authorization=${encodeURIComponent(apiKey)}&format=JSON`;
  const res = await fetch(url, { next: { revalidate: 240 } });
  if (!res.ok) {
    throw new Error(`CWA observation API responded ${res.status}`);
  }
  const data = await res.json();
  const stations: RawStation[] = data?.records?.Station ?? [];

  const result: StationObservation[] = [];
  for (const s of stations) {
    const wgs84 = s.GeoInfo?.Coordinates?.find((c) => c.CoordinateName === "WGS84");
    if (!wgs84) continue;
    const lat = Number(wgs84.StationLatitude);
    const lon = Number(wgs84.StationLongitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const we = s.WeatherElement ?? {};
    result.push({
      id: s.StationId,
      name: s.StationName,
      county: s.GeoInfo?.CountyName ?? "",
      town: s.GeoInfo?.TownName ?? "",
      lat,
      lon,
      obsTime: s.ObsTime?.DateTime ?? null,
      temp: num(we.AirTemperature),
      humidity: num(we.RelativeHumidity),
      windSpeed: num(we.WindSpeed),
      windDirection: num(we.WindDirection),
      rain: num(we.Now?.Precipitation),
      pressure: num(we.AirPressure),
      dailyHigh: num(we.DailyExtreme?.DailyHigh?.TemperatureInfo?.AirTemperature),
      dailyLow: num(we.DailyExtreme?.DailyLow?.TemperatureInfo?.AirTemperature),
      weather: we.Weather ?? null,
    });
  }
  return result;
}
