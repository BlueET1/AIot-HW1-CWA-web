export type TyphoonIntensity = "熱帶低壓" | "輕度" | "中度" | "強烈";

export interface TyphoonPoint {
  id: string;
  timeStr: string;        // e.g. "9/28 15時"
  dateLabel: string;      // e.g. "9/28"
  hourLabel: string;      // e.g. "15時"
  timestamp: number;
  lat: number;
  lon: number;
  intensity: TyphoonIntensity;
  windSpeed: number;      // m/s
  windGust?: number;      // m/s
  pressure: number;       // hPa
  radius7: number;        // km, 7級暴風半徑
  radius10?: number;      // km, 10級暴風半徑
  uncertaintyRadius?: number; // km, 70% 預報不確定圓半徑
  status: "past" | "current" | "forecast";
}

export interface TyphoonTrack {
  id: string;
  name: string;              // e.g. "燕子"
  internationalName: string; // e.g. "JEBI"
  intensity: TyphoonIntensity;
  currentIndex: number;
  points: TyphoonPoint[];
  summary: string;
}

/**
 * Generate a geodesic circle polygon in GeoJSON format.
 * Accurately projects distance in kilometers to geographic coordinates.
 */
export function createGeoJSONCircle(
  center: [number, number],
  radiusKm: number,
  points = 64
): GeoJSON.Polygon {
  const [clon, clat] = center;
  const coords: [number, number][] = [];
  const rad = Math.PI / 180;
  const clatRad = clat * rad;
  const clonRad = clon * rad;
  const earthRadius = 6371; // km
  const dByR = radiusKm / earthRadius;

  for (let i = 0; i <= points; i++) {
    const bearing = ((i * 360) / points) * rad;
    const latRad = Math.asin(
      Math.sin(clatRad) * Math.cos(dByR) +
        Math.cos(clatRad) * Math.sin(dByR) * Math.cos(bearing)
    );
    const lonRad =
      clonRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(clatRad),
        Math.cos(dByR) - Math.sin(clatRad) * Math.sin(latRad)
      );
    coords.push([lonRad / rad, latRad / rad]);
  }
  return {
    type: "Polygon",
    coordinates: [coords],
  };
}

/**
 * Rich realistic typhoon track dataset matching the user's reference image:
 * "輕度颱風 燕子 (JEBI)" moving from Luzon Strait past eastern Taiwan offshore,
 * recurving towards Japan, with past observations and 70% forecast uncertainty circles.
 */
export const DEFAULT_TYPHOON_TRACK: TyphoonTrack = {
  id: "typhoon-jebi",
  name: "燕子",
  internationalName: "JEBI",
  intensity: "輕度",
  currentIndex: 7, // index of the current "9/28 15時" point
  summary: "輕度颱風 燕子中心目前在花蓮東南方海面，朝西北西轉東北前進，對台灣北部海面及東半部海面構成威脅。",
  points: [
    // --- Past observation points ---
    {
      id: "pt-1",
      timeStr: "9/26 02時",
      dateLabel: "9/26",
      hourLabel: "02時",
      timestamp: 1727287200000,
      lat: 19.4,
      lon: 124.6,
      intensity: "熱帶低壓",
      windSpeed: 15,
      pressure: 1002,
      radius7: 80,
      status: "past",
    },
    {
      id: "pt-2",
      timeStr: "9/26 08時",
      dateLabel: "9/26",
      hourLabel: "08時",
      timestamp: 1727308800000,
      lat: 19.8,
      lon: 123.8,
      intensity: "熱帶低壓",
      windSpeed: 16,
      pressure: 1000,
      radius7: 100,
      status: "past",
    },
    {
      id: "pt-3",
      timeStr: "9/26 14時",
      dateLabel: "9/26",
      hourLabel: "14時",
      timestamp: 1727330400000,
      lat: 20.4,
      lon: 123.0,
      intensity: "輕度",
      windSpeed: 18,
      pressure: 996,
      radius7: 120,
      status: "past",
    },
    {
      id: "pt-4",
      timeStr: "9/26 20時",
      dateLabel: "9/26",
      hourLabel: "20時",
      timestamp: 1727352000000,
      lat: 21.0,
      lon: 122.5,
      intensity: "輕度",
      windSpeed: 20,
      pressure: 992,
      radius7: 120,
      status: "past",
    },
    {
      id: "pt-5",
      timeStr: "9/27 08時",
      dateLabel: "9/27",
      hourLabel: "08時",
      timestamp: 1727395200000,
      lat: 21.9,
      lon: 122.2,
      intensity: "輕度",
      windSpeed: 23,
      pressure: 988,
      radius7: 140,
      status: "past",
    },
    {
      id: "pt-6",
      timeStr: "9/27 20時",
      dateLabel: "9/27",
      hourLabel: "20時",
      timestamp: 1727438400000,
      lat: 22.8,
      lon: 122.4,
      intensity: "輕度",
      windSpeed: 23,
      pressure: 988,
      radius7: 140,
      status: "past",
    },
    {
      id: "pt-7",
      timeStr: "9/28 08時",
      dateLabel: "9/28",
      hourLabel: "08時",
      timestamp: 1727481600000,
      lat: 23.7,
      lon: 123.0,
      intensity: "輕度",
      windSpeed: 25,
      pressure: 985,
      radius7: 150,
      radius10: 50,
      status: "past",
    },
    // --- Current observation point (NOW) ---
    {
      id: "pt-current",
      timeStr: "9/28 15時",
      dateLabel: "9/28",
      hourLabel: "15時",
      timestamp: 1727506800000,
      lat: 24.3,
      lon: 123.6,
      intensity: "輕度",
      windSpeed: 25,
      windGust: 33,
      pressure: 985,
      radius7: 150,
      radius10: 50,
      status: "current",
    },
    // --- Official forecast points ---
    {
      id: "pt-f1",
      timeStr: "9/29 20時",
      dateLabel: "9/29",
      hourLabel: "20時",
      timestamp: 1727611200000,
      lat: 26.2,
      lon: 126.6,
      intensity: "輕度",
      windSpeed: 28,
      pressure: 980,
      radius7: 160,
      radius10: 50,
      uncertaintyRadius: 100,
      status: "forecast",
    },
    {
      id: "pt-f2",
      timeStr: "9/30 02時",
      dateLabel: "9/30",
      hourLabel: "02時",
      timestamp: 1727632800000,
      lat: 27.3,
      lon: 128.2,
      intensity: "中度",
      windSpeed: 33,
      pressure: 970,
      radius7: 180,
      radius10: 60,
      uncertaintyRadius: 140,
      status: "forecast",
    },
    {
      id: "pt-f3",
      timeStr: "9/30 08時",
      dateLabel: "9/30",
      hourLabel: "08時",
      timestamp: 1727654400000,
      lat: 28.4,
      lon: 130.0,
      intensity: "中度",
      windSpeed: 35,
      pressure: 965,
      radius7: 200,
      radius10: 70,
      uncertaintyRadius: 180,
      status: "forecast",
    },
    {
      id: "pt-f4",
      timeStr: "9/30 14時",
      dateLabel: "9/30",
      hourLabel: "14時",
      timestamp: 1727676000000,
      lat: 29.6,
      lon: 132.1,
      intensity: "中度",
      windSpeed: 35,
      pressure: 965,
      radius7: 200,
      radius10: 70,
      uncertaintyRadius: 230,
      status: "forecast",
    },
    {
      id: "pt-f5",
      timeStr: "10/1 02時",
      dateLabel: "10/1",
      hourLabel: "02時",
      timestamp: 1727719200000,
      lat: 31.4,
      lon: 134.8,
      intensity: "輕度",
      windSpeed: 30,
      pressure: 975,
      radius7: 180,
      radius10: 50,
      uncertaintyRadius: 290,
      status: "forecast",
    },
    {
      id: "pt-f6",
      timeStr: "10/1 14時",
      dateLabel: "10/1",
      hourLabel: "14時",
      timestamp: 1727762400000,
      lat: 33.6,
      lon: 138.4,
      intensity: "輕度",
      windSpeed: 25,
      pressure: 982,
      radius7: 160,
      uncertaintyRadius: 360,
      status: "forecast",
    },
  ],
};

/**
 * Returns the geographical bounding box [[minLon, minLat], [maxLon, maxLat]]
 * covering all points and uncertainty circles of the typhoon track.
 */
/**
 * Returns the geographical bounding box [[minLon, minLat], [maxLon, maxLat]]
 * covering the relevant track near Taiwan, current position, and all forecast circles.
 * Caps the past history to the recent 48 hours to prevent zooming out across the entire ocean.
 */
export function getTyphoonBounds(track: TyphoonTrack): [[number, number], [number, number]] {
  // Focus on the recent past window (e.g. past ~48 hours before currentIndex)
  // plus the current point and all future forecast points
  const recentPastStart = Math.max(0, track.currentIndex - 8);
  const relevantPoints = track.points.slice(recentPastStart);

  let minLon = 119.5; // Always keep Taiwan in view
  let maxLon = 125.0;
  let minLat = 21.0;  // Always keep Taiwan in view
  let maxLat = 25.5;

  for (const pt of relevantPoints) {
    const marginDeg = (pt.uncertaintyRadius ?? pt.radius7 ?? 120) / 111;
    minLon = Math.min(minLon, pt.lon - marginDeg);
    maxLon = Math.max(maxLon, pt.lon + marginDeg);
    minLat = Math.min(minLat, pt.lat - marginDeg);
    maxLat = Math.max(maxLat, pt.lat + marginDeg);
  }

  // Add 1 degree margin
  minLon = Math.max(116, minLon - 0.8);
  maxLon = Math.min(148, maxLon + 0.8);
  minLat = Math.max(18, minLat - 0.8);
  maxLat = Math.min(38, maxLat + 0.8);

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

/**
 * GeoJSON for the past track (solid line connecting points from start up to current fix).
 */
export function getPastTrackGeoJSON(track: TyphoonTrack): GeoJSON.FeatureCollection {
  const pastPoints = track.points.slice(0, track.currentIndex + 1);

  if (pastPoints.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: pastPoints.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      },
    ],
  };
}

/**
 * GeoJSON for the forecast track (dashed line connecting current point into future forecast fixes).
 */
export function getForecastTrackGeoJSON(track: TyphoonTrack): GeoJSON.FeatureCollection {
  const futurePoints = track.points.slice(track.currentIndex);

  if (futurePoints.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: futurePoints.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      },
    ],
  };
}

/**
 * GeoJSON for all track point markers (small circle dots).
 */
export function getTrackPointsGeoJSON(track: TyphoonTrack): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: track.points.map((p, idx) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [p.lon, p.lat],
      },
      properties: {
        id: p.id,
        index: idx,
        timeStr: p.timeStr,
        intensity: p.intensity,
        status: p.status,
        windSpeed: p.windSpeed,
        pressure: p.pressure,
      },
    })),
  };
}

/**
 * GeoJSON for forecast uncertainty circles (70% probability area).
 */
export function getForecastCirclesGeoJSON(track: TyphoonTrack): GeoJSON.FeatureCollection {
  const forecastPoints = track.points.filter((p) => p.status === "forecast" && p.uncertaintyRadius);

  return {
    type: "FeatureCollection",
    features: forecastPoints.map((p) => ({
      type: "Feature",
      geometry: createGeoJSONCircle([p.lon, p.lat], p.uncertaintyRadius!),
      properties: {
        id: p.id,
        timeStr: p.timeStr,
        radius: p.uncertaintyRadius,
      },
    })),
  };
}

/**
 * GeoJSON for current active point storm radii (7-level & 10-level).
 */
export function getStormRadiiGeoJSON(point: TyphoonPoint): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Outer circle: 7-level storm radius
  if (point.radius7 > 0) {
    features.push({
      type: "Feature",
      geometry: createGeoJSONCircle([point.lon, point.lat], point.radius7),
      properties: { level: 7, radius: point.radius7 },
    });
  }

  // Inner circle: 10-level storm radius
  if (point.radius10 && point.radius10 > 0) {
    features.push({
      type: "Feature",
      geometry: createGeoJSONCircle([point.lon, point.lat], point.radius10),
      properties: { level: 10, radius: point.radius10 },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
