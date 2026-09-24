export type LayerKey = "temp" | "rain" | "humidity" | "wind";

export interface ScaleStop {
  /** Inclusive lower bound of this tier. */
  min: number;
  label: string;
  color: string;
}

// Temperature: domain meteorological convention (cold blue -> hot red), matching
// the standard weather-map legend rather than a generic single-hue business ramp.
const TEMP_SCALE: ScaleStop[] = [
  { min: -Infinity, label: "< 10°C", color: "#3987e5" },
  { min: 10, label: "10 - 15°C", color: "#29b6d8" },
  { min: 15, label: "15 - 20°C", color: "#2fae60" },
  { min: 20, label: "20 - 25°C", color: "#c9c400" },
  { min: 25, label: "25 - 30°C", color: "#eb9a34" },
  { min: 30, label: "30 - 35°C", color: "#e3524a" },
  { min: 35, label: "> 35°C", color: "#a3282f" },
];

// Rain: single-hue sequential (blue), reusing the dataviz skill's default
// sequential ramp steps 100->700.
const RAIN_SCALE: ScaleStop[] = [
  { min: -Infinity, label: "0 mm", color: "#cde2fb" },
  { min: 0.1, label: "0 - 1 mm", color: "#9ec5f4" },
  { min: 1, label: "1 - 5 mm", color: "#5598e7" },
  { min: 5, label: "5 - 10 mm", color: "#256abf" },
  { min: 10, label: "10 - 20 mm", color: "#184f95" },
  { min: 20, label: "> 20 mm", color: "#0d366b" },
];

// Humidity: single-hue sequential (aqua/teal), the palette's slot-3 hue family.
const HUMIDITY_SCALE: ScaleStop[] = [
  { min: -Infinity, label: "< 40%", color: "#cdf3ea" },
  { min: 40, label: "40 - 55%", color: "#86ddc9" },
  { min: 55, label: "55 - 70%", color: "#3fc7a8" },
  { min: 70, label: "70 - 85%", color: "#199e70" },
  { min: 85, label: "≥ 85%", color: "#0a5940" },
];

// Wind speed (m/s): single-hue sequential (orange), the palette's slot-2 hue family.
const WIND_SCALE: ScaleStop[] = [
  { min: -Infinity, label: "< 3 m/s", color: "#fbe0d0" },
  { min: 3, label: "3 - 6 m/s", color: "#f2b48c" },
  { min: 6, label: "6 - 10 m/s", color: "#eb6834" },
  { min: 10, label: "10 - 15 m/s", color: "#c94f1f" },
  { min: 15, label: "≥ 15 m/s", color: "#8f3813" },
];

export const SCALES: Record<LayerKey, ScaleStop[]> = {
  temp: TEMP_SCALE,
  rain: RAIN_SCALE,
  humidity: HUMIDITY_SCALE,
  wind: WIND_SCALE,
};

export const NO_DATA_COLOR = "#5b5b58";

export function colorFor(layer: LayerKey, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return NO_DATA_COLOR;
  }
  const scale = SCALES[layer];
  let color = scale[0].color;
  for (const stop of scale) {
    if (value >= stop.min) color = stop.color;
  }
  return color;
}

/**
 * MapLibre `case`+`step` expression driven by a numeric GeoJSON property.
 * Sensors with no reading (property is `null`) render as NO_DATA_COLOR
 * instead of silently falling into the coldest/lowest tier.
 */
export function maplibreStepExpression(layer: LayerKey, property: string): unknown[] {
  const scale = SCALES[layer];
  const step: unknown[] = ["step", ["get", property]];
  step.push(scale[0].color);
  for (let i = 1; i < scale.length; i++) {
    step.push(scale[i].min, scale[i].color);
  }
  return ["case", ["==", ["get", property], null], NO_DATA_COLOR, step];
}
