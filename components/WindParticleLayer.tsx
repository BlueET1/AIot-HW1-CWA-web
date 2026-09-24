"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { sampleWind, type WindGridData } from "@/lib/windGrid";

interface Particle {
  x: number;
  y: number;
  age: number;
}

const PARTICLE_COUNT = 2200;
const MAX_AGE = 90;
const FADE_ALPHA = 0.06; // lower = longer trails
// Simulated seconds of wind advection per animation frame. Real-time would be
// imperceptible: at zoom 7 one pixel is ~1.1km, so a 5 m/s wind moves a
// particle ~0.004px per frame. ~350 sim-seconds/frame gives ~1.5px/frame.
const SIM_SECONDS_PER_FRAME = 350;

// Web Mercator meters-per-pixel at a given latitude/zoom.
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export default function WindParticleLayer({ map, grid }: { map: MapLibreMap; grid: WindGridData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const gridRef = useRef(grid);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = map.getContainer();
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(13,13,13,1)";
      ctx.fillRect(0, 0, clientWidth, clientHeight);
      respawnAll();
    };

    function randomParticle(): Particle {
      const { clientWidth, clientHeight } = map.getContainer();
      return { x: Math.random() * clientWidth, y: Math.random() * clientHeight, age: Math.random() * MAX_AGE };
    }

    function respawnAll() {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, randomParticle);
    }

    let running = true;
    const tick = () => {
      if (!running) return;
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const zoom = map.getZoom();

      ctx.fillStyle = `rgba(13,13,13,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(230,238,248,0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.age > MAX_AGE) {
          particles[i] = randomParticle();
          continue;
        }
        const lngLat = map.unproject([p.x, p.y]);
        const [u, v] = sampleWind(gridRef.current, lngLat.lng, lngLat.lat);
        const mpp = metersPerPixel(lngLat.lat, zoom) || 1;
        const dx = (u * SIM_SECONDS_PER_FRAME) / mpp;
        const dy = (-v * SIM_SECONDS_PER_FRAME) / mpp;

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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{ mixBlendMode: "screen", opacity: 0.85 }}
    />
  );
}
