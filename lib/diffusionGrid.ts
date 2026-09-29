import type { StationObservation } from "./cwaObservations";
import { getContinuousRgba, type LayerKey } from "./colorScales";
import { TAIWAN_LAND_RINGS } from "./taiwanLandBounds";

export interface DiffusionResult {
  url: string;
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
}

export const DIFFUSION_BOUNDS = {
  west: 118.0,
  east: 122.5,
  south: 21.6,
  north: 26.5,
};

export const DIFFUSION_COORDINATES: [
  [number, number],
  [number, number],
  [number, number],
  [number, number]
] = [
  [DIFFUSION_BOUNDS.west, DIFFUSION_BOUNDS.north], // top-left
  [DIFFUSION_BOUNDS.east, DIFFUSION_BOUNDS.north], // top-right
  [DIFFUSION_BOUNDS.east, DIFFUSION_BOUNDS.south], // bottom-right
  [DIFFUSION_BOUNDS.west, DIFFUSION_BOUNDS.south], // bottom-left
];

// High-resolution grid (450 x 500 = 225,000 pixels) for crisp, detailed gradients
const GRID_WIDTH = 450;
const GRID_HEIGHT = 500;
const COS_LAT = 0.917; // cos(23.5 deg) aspect ratio correction
const MAX_DIST_DEG = 0.42; // max influence radius
const MAX_DIST_SQ = MAX_DIST_DEG * MAX_DIST_DEG;
const CELL_SIZE = 0.35; // spatial bucket cell size

function latToMercY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) / 2;
}

function mercYToLat(y: number): number {
  const n = Math.PI - 2 * Math.PI * y;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedTempCanvas: HTMLCanvasElement | null = null;

function getCanvases(): { canvas: HTMLCanvasElement; tempCanvas: HTMLCanvasElement } | null {
  if (typeof document === "undefined") return null;
  if (!cachedCanvas) {
    cachedCanvas = document.createElement("canvas");
    cachedCanvas.width = GRID_WIDTH;
    cachedCanvas.height = GRID_HEIGHT;
  }
  if (!cachedTempCanvas) {
    cachedTempCanvas = document.createElement("canvas");
    cachedTempCanvas.width = GRID_WIDTH;
    cachedTempCanvas.height = GRID_HEIGHT;
  }
  return { canvas: cachedCanvas, tempCanvas: cachedTempCanvas };
}

interface PointVal {
  x: number;
  y: number;
  val: number;
}

export function generateDiffusionImage(
  stations: StationObservation[],
  layer: LayerKey
): DiffusionResult | null {
  if (typeof window === "undefined" || !stations || stations.length === 0) {
    return null;
  }

  // 1. Extract valid points for the requested layer
  const points: PointVal[] = [];
  for (const s of stations) {
    let v: number | null = null;
    if (layer === "temp") v = s.temp;
    else if (layer === "rain") v = s.rain;
    else if (layer === "humidity") v = s.humidity;
    else if (layer === "wind") v = s.windSpeed;

    if (v !== null && !Number.isNaN(v)) {
      points.push({ x: s.lon, y: s.lat, val: v });
    }
  }

  if (points.length < 3) return null;

  // 2. Spatial grid binning
  const spanLng = DIFFUSION_BOUNDS.east - DIFFUSION_BOUNDS.west;
  const cols = Math.ceil(spanLng / CELL_SIZE) + 1;
  const rows = Math.ceil((DIFFUSION_BOUNDS.north - DIFFUSION_BOUNDS.south) / CELL_SIZE) + 1;
  const buckets: PointVal[][] = Array.from({ length: cols * rows }, () => []);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const c = Math.floor((p.x - DIFFUSION_BOUNDS.west) / CELL_SIZE);
    const r = Math.floor((DIFFUSION_BOUNDS.north - p.y) / CELL_SIZE);
    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      buckets[r * cols + c].push(p);
    }
  }

  // 3. Prepare canvases & Web Mercator projection
  const canvases = getCanvases();
  if (!canvases) return null;
  const { canvas, tempCanvas } = canvases;

  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  const ctx = canvas.getContext("2d");
  if (!tempCtx || !ctx) return null;

  const imgData = tempCtx.createImageData(GRID_WIDTH, GRID_HEIGHT);
  const data = imgData.data;

  const yNorth = latToMercY(DIFFUSION_BOUNDS.north);
  const ySouth = latToMercY(DIFFUSION_BOUNDS.south);
  const spanMercY = ySouth - yNorth;

  // 4. Compute IDW continuous scalar field across the high-res grid
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const my = yNorth + ((y + 0.5) / GRID_HEIGHT) * spanMercY;
    const lat = mercYToLat(my);
    const bucketRow = Math.floor((DIFFUSION_BOUNDS.north - lat) / CELL_SIZE);

    for (let x = 0; x < GRID_WIDTH; x++) {
      const lng = DIFFUSION_BOUNDS.west + ((x + 0.5) / GRID_WIDTH) * spanLng;
      const bucketCol = Math.floor((lng - DIFFUSION_BOUNDS.west) / CELL_SIZE);

      let sumWeight = 0;
      let sumVal = 0;
      let minDistSq = 999;

      // Check 3x3 adjacent spatial buckets
      for (let dr = -1; dr <= 1; dr++) {
        const br = bucketRow + dr;
        if (br < 0 || br >= rows) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const bc = bucketCol + dc;
          if (bc < 0 || bc >= cols) continue;
          const bucket = buckets[br * cols + bc];
          for (let i = 0; i < bucket.length; i++) {
            const p = bucket[i];
            const dLng = (p.x - lng) * COS_LAT;
            const dLat = p.y - lat;
            const distSq = dLng * dLng + dLat * dLat;
            if (distSq < minDistSq) minDistSq = distSq;
            if (distSq < MAX_DIST_SQ) {
              const w = 1 / (distSq + 0.00025);
              sumWeight += w;
              sumVal += p.val * w;
            }
          }
        }
      }

      const pixelIdx = (y * GRID_WIDTH + x) * 4;

      if (minDistSq >= MAX_DIST_SQ || sumWeight === 0) {
        data[pixelIdx + 3] = 0;
        continue;
      }

      const interpolatedVal = sumVal / sumWeight;
      const [r, g, b, baseAlpha] = getContinuousRgba(layer, interpolatedVal);

      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = Math.round(baseAlpha * 255);
    }
  }

  // Draw unclipped continuous IDW field to temp canvas
  tempCtx.putImageData(imgData, 0, 0);

  // 5. Clear main canvas and clip strictly to high-precision Taiwan land & island polygons
  ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
  ctx.save();
  ctx.beginPath();

  for (let rIdx = 0; rIdx < TAIWAN_LAND_RINGS.length; rIdx++) {
    const ring = TAIWAN_LAND_RINGS[rIdx];
    for (let pIdx = 0; pIdx < ring.length; pIdx++) {
      const [lng, lat] = ring[pIdx];
      const px = ((lng - DIFFUSION_BOUNDS.west) / spanLng) * GRID_WIDTH;
      const py = ((latToMercY(lat) - yNorth) / spanMercY) * GRID_HEIGHT;
      if (pIdx === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
  }

  // Clip exactly to land and composite the high-res weather gradient
  ctx.clip();
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.restore();

  return {
    url: canvas.toDataURL("image/png"),
    coordinates: DIFFUSION_COORDINATES,
  };
}
