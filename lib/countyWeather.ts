import type { StationObservation } from "./cwaObservations";
import { colorFor, type LayerKey } from "./colorScales";
import { TAIWAN_COUNTIES_GEOJSON } from "./taiwanCounties";

export interface CountyWeatherProperties {
  name: string;
  value: number | null;
  formattedValue: string;
  color: string;
  stationCount: number;
}

const UNITS: Record<LayerKey, string> = {
  temp: "°C",
  rain: " mm",
  humidity: "%",
  wind: " m/s",
};

export function computeCountyWeatherGeoJSON(
  stations: StationObservation[],
  layer: LayerKey
): GeoJSON.FeatureCollection {
  // Group stations by normalized county name
  const countyStations: Record<string, StationObservation[]> = {};
  for (const f of TAIWAN_COUNTIES_GEOJSON.features) {
    countyStations[f.properties?.name] = [];
  }

  for (const s of stations) {
    if (!s.county) continue;
    const norm = s.county.replace(/臺/g, "台");
    if (countyStations[norm]) {
      countyStations[norm].push(s);
    }
  }

  const enrichedFeatures = TAIWAN_COUNTIES_GEOJSON.features.map((f) => {
    const countyName = f.properties?.name;
    const countySts = countyStations[countyName] || [];

    let sum = 0;
    let count = 0;
    let maxRain = 0;

    for (const s of countySts) {
      let v: number | null = null;
      if (layer === "temp") v = s.temp;
      else if (layer === "rain") v = s.rain;
      else if (layer === "humidity") v = s.humidity;
      else if (layer === "wind") v = s.windSpeed;

      if (v !== null && !Number.isNaN(v)) {
        sum += v;
        count++;
        if (layer === "rain" && v > maxRain) {
          maxRain = v;
        }
      }
    }

    let finalVal: number | null = null;
    if (count > 0) {
      if (layer === "rain") {
        // For rain, if there is localized rain, blend average and peak
        const avgRain = sum / count;
        finalVal = maxRain > 1 ? Number((avgRain * 0.4 + maxRain * 0.6).toFixed(1)) : Number(avgRain.toFixed(1));
      } else {
        finalVal = Number((sum / count).toFixed(1));
      }
    }

    const color = colorFor(layer, finalVal);
    const unit = UNITS[layer];
    const formattedValue = finalVal !== null ? `${finalVal}${unit}` : "無資料";

    return {
      ...f,
      properties: {
        name: countyName,
        value: finalVal,
        formattedValue,
        color,
        stationCount: count,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features: enrichedFeatures,
  };
}
