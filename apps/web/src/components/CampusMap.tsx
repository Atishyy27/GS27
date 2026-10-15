"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MLMap, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BRANCHES, SEASON, branchesFor, type Branch } from "@/data/branches";

const CENTER: [number, number] = [75.87242, 22.72637];

type Pick = { title: string; branches: Branch[] } | null;

function shortName(n: string) {
  if (!n) return "";
  const b = branchesFor(n);
  if (b.length) return b.join(" + ");
  if (/HOSTEL/i.test(n)) return n.replace(/HOSTEL/i, "").trim().split(/\s+/).slice(-1)[0] + " Hostel";
  return n.length > 18 ? "" : n;
}

export default function CampusMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [pick, setPick] = useState<Pick>(null);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: CENTER,
      zoom: 16.4,
      pitch: 60,
      bearing: -20,
      maxPitch: 75,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    m.on("load", async () => {
      const geo = await fetch("/campus.geojson").then((r) => r.json());
      for (const f of geo.features) {
        const p = f.properties;
        const isDept = branchesFor(p.name || "").length > 0;
        p.role = p.kind === "building" ? (isDept ? "dept" : /HOSTEL/i.test(p.name || "") ? "hostel" : p.name ? "named" : "other") : p.kind;
        p.h = (p.levels ? p.levels * 4 : 0) || (isDept ? 18 : p.role === "hostel" ? 15 : p.name ? 12 : 8);
        p.label = shortName(p.name || "");
      }
      // hide the base map's own 3D buildings so ours are the only ones
      for (const l of m.getStyle().layers) if (l.type === "fill-extrusion") m.setLayoutProperty(l.id, "visibility", "none");

      m.addSource("campus", { type: "geojson", data: geo });
      m.addLayer({ id: "campus-hull", type: "line", source: "campus", filter: ["==", ["get", "kind"], "campus"],
        paint: { "line-color": "#ff5a36", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.7 } });
      m.addLayer({ id: "grounds", type: "fill", source: "campus", filter: ["==", ["get", "kind"], "ground"],
        paint: { "fill-color": "#3dd68c", "fill-opacity": 0.35 } });
      m.addLayer({ id: "paths", type: "line", source: "campus", filter: ["==", ["get", "kind"], "path"],
        paint: { "line-color": "#6b6f7b", "line-width": 1.5 } });
      m.addLayer({ id: "buildings", type: "fill-extrusion", source: "campus", filter: ["==", ["get", "kind"], "building"],
        paint: {
          "fill-extrusion-color": ["match", ["get", "role"], "dept", "#ff5a36", "hostel", "#3dd68c", "named", "#8b8fa3", "#3a3d47"],
          "fill-extrusion-height": ["get", "h"],
          "fill-extrusion-opacity": 0.92,
        } });
      m.addLayer({ id: "labels", type: "symbol", source: "campus", filter: ["all", ["==", ["get", "kind"], "building"], ["!=", ["get", "label"], ""]],
        layout: { "text-field": ["get", "label"], "text-size": 12, "text-font": ["Noto Sans Regular"], "text-allow-overlap": false },
        paint: { "text-color": "#f2f2f2", "text-halo-color": "#0e0f13", "text-halo-width": 1.5 } });

      m.on("mouseenter", "buildings", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "buildings", () => (m.getCanvas().style.cursor = ""));
      m.on("click", "buildings", (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        const name = (f?.properties?.name as string) || "Unnamed building";
        const codes = branchesFor(name);
        setPick({ title: name, branches: BRANCHES.filter((b) => codes.includes(b.code)) });
        setSpinning(false);
      });
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  // slow orbit until someone touches the map
  useEffect(() => {
    const m = map.current;
    if (!m || !spinning) return;
    let raf = 0;
    const stop = () => setSpinning(false);
    const tick = () => { m.setBearing(m.getBearing() + 0.04); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    m.on("mousedown", stop); m.on("touchstart", stop); m.on("wheel", stop);
    return () => { cancelAnimationFrame(raf); m.off("mousedown", stop); m.off("touchstart", stop); m.off("wheel", stop); };
  }, [spinning]);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden">
      <div ref={box} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 max-w-md sm:left-8 sm:top-8">
        <p className="text-xs font-bold tracking-[0.2em] text-[#ff5a36]">SGSITS INDORE</p>
        <h1 className="mt-2 text-5xl font-extrabold leading-none sm:text-7xl">GS27</h1>
        <p className="mt-3 text-sm text-[#9a9ca6] sm:text-base">
          Started by the 2027 batch, for every batch after. Tap a department to see how its branch is placing this season.
        </p>
      </div>

      <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-auto sm:w-[380px]">
        {pick ? (
          <BuildingCard pick={pick} onClose={() => setPick(null)} />
        ) : (
          <BranchList onPick={(b) => setPick({ title: b.name, branches: [b] })} />
        )}
      </div>
    </div>
  );
}

function Stat({ b }: { b: Branch }) {
  const rate = Math.round((100 * b.clearedAny) / b.registered);
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold">{b.code}</span>
        <span className="text-xs text-[#9a9ca6]">{b.name}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-3xl font-extrabold text-[#ff5a36]">{b.drivesOpen}<span className="text-base text-[#9a9ca6]">/{SEASON.drives}</span></div>
          <div className="text-xs text-[#9a9ca6]">drives open to this branch</div>
        </div>
        <div>
          <div className="text-3xl font-extrabold text-[#3dd68c]">{rate}%</div>
          <div className="text-xs text-[#9a9ca6]">of 2027 batch ({b.clearedAny}/{b.registered}) cleared at least one round</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-white/10">
        <div className="h-full bg-[#3dd68c]" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function BuildingCard({ pick, onClose }: { pick: NonNullable<Pick>; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13]/90 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">{pick.title}</h2>
        <button onClick={onClose} className="text-[#9a9ca6] hover:text-white" aria-label="Close">✕</button>
      </div>
      {pick.branches.length ? pick.branches.map((b) => <Stat key={b.code} b={b} />) : (
        <p className="mt-2 text-sm text-[#9a9ca6]">Not a department building. Try one of the orange blocks.</p>
      )}
      <p className="mt-3 text-[11px] text-[#6b6f7b]">Source: T&amp;P cell sheets, {SEASON.asOf}. Rounds cleared are stage results, not final offers.</p>
    </div>
  );
}

function BranchList({ onPick }: { onPick: (b: Branch) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13]/85 p-4 backdrop-blur">
      <p className="text-xs text-[#9a9ca6]">
        Season so far: <b className="text-white">{SEASON.drives}</b> drives, median CTC <b className="text-white">{SEASON.medianCtcLpa} LPA</b> ({SEASON.ctcN} drives state one)
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {BRANCHES.map((b) => (
          <button key={b.code} onClick={() => onPick(b)}
            className="rounded-full border border-white/15 px-3 py-1 text-sm hover:border-[#ff5a36] hover:text-[#ff5a36]">
            {b.code}
          </button>
        ))}
      </div>
    </div>
  );
}
