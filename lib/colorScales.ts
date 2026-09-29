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

export interface ContinuousStop {
  val: number;
  r: number;
  g: number;
  b: number;
  a?: number;
}

export const CONTINUOUS_SCALES: Record<LayerKey, ContinuousStop[]> = {
  temp: [
    { val: 0, r: 34, g: 94, b: 168 },
    { val: 10, r: 57, g: 135, b: 229 },
    { val: 15, r: 41, g: 182, b: 216 },
    { val: 20, r: 47, g: 174, b: 96 },
    { val: 25, r: 201, g: 196, b: 0 },
    { val: 30, r: 235, g: 154, b: 52 },
    { val: 35, r: 227, g: 82, b: 74 },
    { val: 38, r: 163, g: 40, b: 47 },
    { val: 42, r: 103, g: 0, b: 31 },
  ],
  rain: [
    { val: 0, r: 205, g: 226, b: 251, a: 0 },
    { val: 0.5, r: 158, g: 197, b: 244, a: 0.55 },
    { val: 2, r: 85, g: 152, b: 231, a: 0.75 },
    { val: 6, r: 37, g: 106, b: 191, a: 0.88 },
    { val: 15, r: 24, g: 79, b: 149, a: 0.95 },
    { val: 30, r: 13, g: 54, b: 107, a: 1.0 },
    { val: 60, r: 73, g: 0, b: 106, a: 1.0 },
  ],
  humidity: [
    { val: 30, r: 205, g: 243, b: 234, a: 0.7 },
    { val: 45, r: 134, g: 221, b: 201, a: 0.8 },
    { val: 60, r: 63, g: 199, b: 168, a: 0.9 },
    { val: 75, r: 25, g: 158, b: 112, a: 0.95 },
    { val: 90, r: 10, g: 89, b: 64, a: 1.0 },
    { val: 100, r: 4, g: 48, b: 34, a: 1.0 },
  ],
  wind: [
    { val: 0, r: 251, g: 224, b: 208, a: 0.25 },
    { val: 3, r: 242, g: 180, b: 140, a: 0.65 },
    { val: 6, r: 235, g: 104, b: 52, a: 0.8 },
    { val: 10, r: 201, g: 79, b: 31, a: 0.95 },
    { val: 16, r: 143, g: 56, b: 19, a: 1.0 },
    { val: 25, r: 84, g: 21, b: 5, a: 1.0 },
  ],
};

/**
 * Returns [r, g, b, alpha] for a given numeric value on the continuous ramp.
 * Alpha is in [0, 1].
 */
export function getContinuousRgba(layer: LayerKey, value: number): [number, number, number, number] {
  const ramp = CONTINUOUS_SCALES[layer];
  if (value <= ramp[0].val) {
    const s = ramp[0];
    return [s.r, s.g, s.b, s.a ?? 1];
  }
  const last = ramp[ramp.length - 1];
  if (value >= last.val) {
    return [last.r, last.g, last.b, last.a ?? 1];
  }
  for (let i = 0; i < ramp.length - 1; i++) {
    const s0 = ramp[i];
    const s1 = ramp[i + 1];
    if (value >= s0.val && value <= s1.val) {
      const t = (value - s0.val) / (s1.val - s0.val);
      const r = Math.round(s0.r + t * (s1.r - s0.r));
      const g = Math.round(s0.g + t * (s1.g - s0.g));
      const b = Math.round(s0.b + t * (s1.b - s0.b));
      const a0 = s0.a ?? 1;
      const a1 = s1.a ?? 1;
      const a = a0 + t * (a1 - a0);
      return [r, g, b, a];
    }
  }
  return [last.r, last.g, last.b, last.a ?? 1];
}

/**
 * Returns a CSS linear-gradient string representing the continuous scale for UI legends.
 */
export function getContinuousCssGradient(layer: LayerKey): string {
  const ramp = CONTINUOUS_SCALES[layer];
  const minVal = ramp[0].val;
  const maxVal = ramp[ramp.length - 1].val;
  const stops = ramp.map((s) => {
    const pct = Math.round(((s.val - minVal) / (maxVal - minVal)) * 100);
    return `rgba(${s.r}, ${s.g}, ${s.b}, ${s.a ?? 1}) ${pct}%`;
  });
  return `linear-gradient(to right, ${stops.join(", ")})`;
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

