"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { sampleWind, type WindGridData } from "@/lib/windGrid";
import type { MapStyleKey } from "@/lib/mapStyles";

interface Particle {
  x: number;
  y: number;
  age: number;
}

// Web Mercator meters-per-pixel at a given latitude/zoom.
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// Dynamic particle count: decreases gracefully at higher zoom to avoid visual clutter
function getTargetParticleCount(zoom: number): number {
  if (zoom <= 7.0) return 1700;
  const t = Math.min(1, Math.max(0, (zoom - 7.0) / 3.5)); // 0 at zoom 7, 1 at zoom 10.5
  return Math.round(1700 - t * 1100); // 1700 -> 600
}

// Dynamic particle age: shorter trails at close zoom to avoid tangled webs
function getMaxAge(zoom: number): number {
  if (zoom <= 7.0) return 85;
  const t = Math.min(1, Math.max(0, (zoom - 7.0) / 3.5));
  return Math.round(85 - t * 45); // 85 -> 40
}

export default function WindParticleLayer({
  map,
  grid,
  mapStyle = "dark",
}: {
  map: MapLibreMap;
  grid: WindGridData;
  mapStyle?: MapStyleKey;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const gridRef = useRef(grid);
  const styleRef = useRef(mapStyle);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    styleRef.current = mapStyle;
  }, [mapStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isLight = styleRef.current === "light" || styleRef.current === "streets";

    function randomParticle(maxAge: number): Particle {
      const { clientWidth, clientHeight } = map.getContainer();
      return {
        x: Math.random() * clientWidth,
        y: Math.random() * clientHeight,
        age: Math.random() * maxAge,
      };
    }

    function respawnAll() {
      const zoom = map.getZoom();
      const count = getTargetParticleCount(zoom);
      const maxAge = getMaxAge(zoom);
      particlesRef.current = Array.from({ length: count }, () => randomParticle(maxAge));
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = map.getContainer();
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = isLight ? "rgba(255,255,255,1)" : "rgba(13,13,13,1)";
      ctx.fillRect(0, 0, clientWidth, clientHeight);
      respawnAll();
    };

    let running = true;
    const tick = () => {
      if (!running) return;
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const zoom = map.getZoom();
      const currentIsLight = styleRef.current === "light" || styleRef.current === "streets";

      // Dynamically fade faster at high zoom so lines stay clean and uncluttered
      const fadeAlpha = zoom > 9.0 ? 0.10 : zoom > 7.5 ? 0.08 : 0.06;
      ctx.fillStyle = currentIsLight
        ? `rgba(255,255,255,${fadeAlpha})`
        : `rgba(13,13,13,${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = currentIsLight
        ? "rgba(30,58,138,0.7)"
        : "rgba(230,238,248,0.75)";
      ctx.lineWidth = zoom > 8.5 ? 0.8 : 1.0;
      ctx.beginPath();

      const targetCount = getTargetParticleCount(zoom);
      const maxAge = getMaxAge(zoom);

      // Smoothly adapt particle array size to zoom
      const particles = particlesRef.current;
      if (particles.length > targetCount) {
        particles.length = targetCount;
      } else if (particles.length < targetCount) {
        while (particles.length < targetCount) {
          particles.push(randomParticle(maxAge));
        }
      }

      // Smooth zoom-adaptive simulation scale factor:
      // Prevents excessive hyperspeed when zoomed in closely to Taiwan Strait
      const zoomFactor = Math.pow(2, Math.max(0, zoom - 7.0) * 0.35);
      const simSeconds = 300 / zoomFactor;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.age > maxAge) {
          particles[i] = randomParticle(maxAge);
          continue;
        }
        const lngLat = map.unproject([p.x, p.y]);
        const [u, v] = sampleWind(gridRef.current, lngLat.lng, lngLat.lat);
        const mpp = metersPerPixel(lngLat.lat, zoom) || 1;

        // Non-linear power-law speed compression:
        // Compresses the extreme 10x-15x ratio between open Taiwan Strait sea (15-20 m/s)
        // and sheltered land (1-2 m/s) down to an elegant ~3x-3.8x ratio, preserving clear
        // difference while avoiding huge speed disparity.
        const rawSpeed = Math.hypot(u, v);
        let effU = u;
        let effV = v;
        if (rawSpeed > 0.05) {
          const refSpeed = 3.5;
          const compressedSpeed = refSpeed * Math.pow(rawSpeed / refSpeed, 0.55);
          const ratio = compressedSpeed / rawSpeed;
          effU = u * ratio;
          effV = v * ratio;
        }

        const dx = (effU * simSeconds) / mpp;
        const dy = (-effV * simSeconds) / mpp;

        const nx = p.x + dx;
        const ny = p.y + dy;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);

        p.x = nx;
        p.y = ny;
        p.age += 1;
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onCamera = () => respawnAll();

    resize();
    map.on("resize", resize);
    map.on("moveend", onCamera);
    map.on("zoomend", onCamera);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.off("resize", resize);
      map.off("moveend", onCamera);
      map.off("zoomend", onCamera);
    };
  }, [map]);

  const isLight = mapStyle === "light" || mapStyle === "streets";

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{
        mixBlendMode: isLight ? "multiply" : "screen",
        opacity: 0.85,
      }}
    />
  );
}
