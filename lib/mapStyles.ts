import type { StyleSpecification } from "maplibre-gl";

export type MapStyleKey = "dark" | "satellite" | "light" | "streets";

export interface MapStyleOption {
  key: MapStyleKey;
  label: string;
  icon: string;
  description: string;
  style: string | StyleSpecification;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    key: "dark",
    label: "暗黑風格",
    icon: "🌙",
    description: "OpenFreeMap 暗色向量圖磚",
    style: "https://tiles.openfreemap.org/styles/dark",
  },
  {
    key: "satellite",
    label: "衛星空照",
    icon: "🛰️",
    description: "Esri 高解析度空照衛星影像",
    style: {
      version: 8,
      sources: {
        "esri-satellite": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Esri, Maxar, Earthstar Geographics",
        },
      },
      layers: [
        {
          id: "esri-satellite-layer",
          type: "raster",
          source: "esri-satellite",
        },
      ],
    },
  },
  {
    key: "light",
    label: "明亮淺色",
    icon: "☀️",
    description: "OpenFreeMap 簡約淺色向量圖磚",
    style: "https://tiles.openfreemap.org/styles/positron",
  },
  {
    key: "streets",
    label: "街道圖",
    icon: "🗺️",
    description: "OpenFreeMap 繁體中文街道圖",
    style: "https://tiles.openfreemap.org/styles/liberty",
  },
];
