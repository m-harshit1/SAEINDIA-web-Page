"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { BakeIn, BakeOut } from "./normals.worker";
import { readPrepared, writePrepared } from "@/lib/modelCache";
import { HERO } from "./heroTimeline";

const MODEL = "/assets/b26_draco.glb";
const DRACO = "/draco/";
export const CHAPTERS = 6;
const FLOOR = -1.38;
const HALF = 1.95; // half the car's length along z, plus a margin — the scan line travels ±HALF

/* ───────────────────────── Story timeline (C = chapter position 0…6) ─────────────────────────
   (before 0)  hero cold open — see HERO below
   0 Idea      the finished car bursts into particles that re-form as "the idea"
   1 Blueprint particles dissolve, wireframe + grid appear
   2 Frame     scan line converts wire → raw welded steel
   3 Livery    scan line converts steel → painted final car
   4 Track     grid streams, speed streaks, chassis vibrates
   5 Finale    camera rises over the finished machine                                         */

type Shot = { az: number; el: number; d: number; shift: number; lift: number };
// az increases chapter to chapter, so the camera keeps circling the car in one direction.
const SHOTS: Shot[] = [
  // shift = how far the car sits to its own side (text takes the other half); d = distance.
  { az: 28, el: 14, d: 11.5, shift: 2.1, lift: 0 },
  { az: 92, el: 3, d: 11.2, shift: -2.3, lift: 0 },
  { az: 148, el: 20, d: 10.6, shift: 2.2, lift: 0 },
  { az: 214, el: 9, d: 11.0, shift: -2.3, lift: 0 },
  { az: 292, el: 3, d: 9.8, shift: 2.1, lift: 0 },
  { az: 378, el: 22, d: 18.5, shift: 0, lift: 3.3 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (c: number, a: number, b: number) => smooth(clamp01((c - a) / (b - a)));
const band = (c: number, a: number, b: number, d: number, e: number) => ramp(c, a, b) * (1 - ramp(c, d, e));

function shotAt(c: number): Shot {
  const x = Math.min(SHOTS.length - 1, Math.max(0, c - 0.5));
  const i = Math.min(SHOTS.length - 2, Math.floor(x));
  // Half linear, half eased: the camera is always moving, so every bit of scroll shows.
  const u = clamp01(x - i);
  const t = 0.55 * u + 0.45 * smooth(u);
  const a = SHOTS[i], b = SHOTS[i + 1];
  const l = (k: keyof Shot) => a[k] + (b[k] - a[k]) * t;
  return { az: l("az"), el: l("el"), d: l("d"), shift: l("shift"), lift: l("lift") };
}

/* ───────────────────────── Hero cold open (seconds since the model became ready) ─────────────────────────
   drop → impact (shockwave, dust, shake, squash) → race (streaks, grid) → rewind into particles → story */

const mixShot = (a: Shot, b: Shot, u: number): Shot => ({
  az: a.az + (b.az - a.az) * u, el: a.el + (b.el - a.el) * u, d: a.d + (b.d - a.d) * u,
  shift: a.shift + (b.shift - a.shift) * u, lift: a.lift + (b.lift - a.lift) * u,
});
const H_PRE: Shot = { az: 8, el: 2, d: 14.5, shift: 0, lift: 1.3 };   // wide, looking up at the sky
const H_START: Shot = { az: 20, el: 4, d: 12.5, shift: 0, lift: -0.1 };
const H_LAND: Shot = { az: 32, el: 7, d: 11.8, shift: 0, lift: -0.55 };   // car sits in the upper-middle, title below
const H_CHASE: Shot = { az: 80, el: 3, d: 10.8, shift: 0, lift: -0.5 };
function heroShot(t: number): Shot {
  if (t < HERO.drop) return mixShot(H_PRE, H_START, smooth(clamp01((t - HERO.lights) / (HERO.drop - HERO.lights))));
  if (t < HERO.impact) return H_START;
  if (t < HERO.race) return mixShot(H_START, H_LAND, smooth((t - HERO.impact) / (HERO.race - HERO.impact)));
  if (t < HERO.rewind) return mixShot(H_LAND, H_CHASE, smooth((t - HERO.race) / (HERO.rewind - HERO.race)));
  return mixShot(H_CHASE, SHOTS[0], smooth(clamp01((t - HERO.rewind) / (HERO.end - HERO.rewind))));
}

const DUST_VERT = /* glsl */ `
  uniform float uT; uniform float uSize;
  attribute vec3 aVel; attribute float aRand;
  varying float vA; varying float vSpark;
  void main() {
    float t = max(uT, 0.0);
    float drag = (1.0 - exp(-2.2 * t)) / 2.2;          // slows as it spreads
    vec3 p = position + vec3(aVel.x * drag, 0.0, aVel.z * drag);
    p.y = max(position.y, position.y + aVel.y * t - 4.9 * t * t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + aRand) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vA = clamp(1.0 - t / (1.0 + aRand), 0.0, 1.0) * step(0.0, uT);
    vSpark = step(0.86, aRand);
  }`;
const DUST_FRAG = /* glsl */ `
  varying float vA; varying float vSpark;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec3 col = mix(vec3(0.42, 0.40, 0.40), vec3(1.0, 0.18, 0.02), vSpark);
    gl_FragColor = vec4(col, (1.0 - d * 2.0) * vA * mix(0.55, 1.0, vSpark));
  }`;

/** Deterministic PRNG so particle layout is stable between renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINTS_VERT = /* glsl */ `
  uniform float uAssemble; uniform float uTime; uniform float uSize; uniform float uOpacity;
  attribute vec3 aOffset; attribute float aRand;
  varying float vAlpha; varying float vRed; varying float vTw;
  void main() {
    float t = smoothstep(0.0, 1.0, clamp(uAssemble * 1.5 - aRand * 0.5, 0.0, 1.0));
    vec3 p = mix(position + aOffset, position, t);
    p += 0.03 * vec3(sin(uTime * 1.7 + aRand * 40.0), cos(uTime * 1.3 + aRand * 30.0), 0.0) * (1.0 - t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float tw = pow(0.5 + 0.5 * sin(uTime * 2.6 + aRand * 80.0), 6.0);   // sparkle
    gl_PointSize = uSize / -mv.z * (0.85 + 0.9 * tw);
    gl_Position = projectionMatrix * mv;
    vAlpha = uOpacity * (0.25 + 0.75 * t);
    vRed = step(0.84, aRand);
    vTw = tw;
  }`;
const POINTS_FRAG = /* glsl */ `
  varying float vAlpha; varying float vRed; varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = 1.0 - d * 2.0;
    vec3 col = mix(vec3(0.82, 0.84, 0.88), vec3(1.0, 0.08, 0.0), vRed);
    col = mix(col, vec3(1.0), vTw * 0.8);                 // glints flash white
    gl_FragColor = vec4(col, core * core * vAlpha * (0.7 + 0.9 * vTw));
  }`;

/* Clipping planes the scan line drives (one stage per page, so module scope is fine).
   Three keeps the side where n·p + c ≥ 0. */
const planes = {
  wireKeep: new THREE.Plane(new THREE.Vector3(0, 0, -1), HALF),   // wire:  z < sA
  steelFront: new THREE.Plane(new THREE.Vector3(0, 0, 1), -HALF), // steel: z > sA
  steelBack: new THREE.Plane(new THREE.Vector3(0, 0, -1), HALF),  // steel: z < sB
  paintKeep: new THREE.Plane(new THREE.Vector3(0, 0, 1), -HALF),  // paint: z > sB
};

type CarProps = { trackEl: React.RefObject<HTMLElement | null>; advanceHero: (dt: number) => number; onReady: () => void; lite: boolean };

/** Return visits: prepared geometry straight from the browser cache (no decode, no normals pass).
    First visit (or no storage): load + prepare via CarLoader, which then fills the cache. */
function Stage(props: CarProps & { onCacheHit: () => void }) {
  const { onCacheHit, ...car } = props;
  const [cached, setCached] = useState<BakeOut | null | undefined>(undefined); // undefined = still checking
  useEffect(() => {
    let alive = true;
    readPrepared().then((g) => {
      if (!alive) return;
      setCached(g);
      if (g) onCacheHit();
    });
    return () => { alive = false; };
  }, [onCacheHit]);
  if (cached === undefined) return null;
  return cached ? <Car {...car} baked={cached} /> : <CarLoader {...car} />;
}

/** Loads the model, then prepares its geometry in a Web Worker before the car mounts. */
function CarLoader(props: CarProps) {
  const { scene } = useGLTF(MODEL, DRACO);
  const [baked, setBaked] = useState<BakeOut | null>(null);
  useEffect(() => {
    const g = (scene.getObjectByProperty("type", "Mesh") as THREE.Mesh).geometry;
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const col = g.getAttribute("color") as THREE.BufferAttribute | undefined;
    // Fast path: copy the raw float array; fall back to per-component reads if it's quantized.
    const positions = pos.array instanceof Float32Array && pos.array.length === pos.count * 3 && !pos.normalized
      ? pos.array.slice()
      : Float32Array.from({ length: pos.count * 3 }, (_, i) => pos.getComponent(Math.floor(i / 3), i % 3));
    const msg: BakeIn = { position: positions };
    const transfer: Transferable[] = [msg.position.buffer as ArrayBuffer];
    if (g.index) { msg.index = new Uint32Array(g.index.array); transfer.push(msg.index.buffer as ArrayBuffer); }
    if (col) {
      const c = (col.array as Float32Array).slice();
      msg.color = c; msg.colorSize = col.itemSize; msg.colorNormalized = col.normalized;
      transfer.push(c.buffer as ArrayBuffer);
    }
    // Compiled from ./normals.worker.ts by esbuild (npm run build:worker, runs before dev/build).
    const worker = new Worker("/workers/normals.js?v=2", { type: "module" }) /* bump ?v when the worker's output changes: browsers cache this file for a day */;
    worker.onmessage = (e: MessageEvent<BakeOut>) => {
      setBaked(e.data);
      worker.terminate();
      // Save the prepared geometry for next visit — after the intro's busiest moments.
      const g = e.data;
      setTimeout(() => { writePrepared(g); }, 9000);
    };
    worker.postMessage(msg, transfer);
    return () => worker.terminate();
  }, [scene]);
  return baked ? <Car {...props} baked={baked} /> : null;
}

function Car({ trackEl, advanceHero, onReady, lite, baked }: CarProps & { baked: BakeOut }) {
  const { camera, size, gl } = useThree();
  const warm = useRef<{ phase: 0 | 1 | 2; t0: number; mats: Set<THREE.Material> }>({ phase: 0, t0: 0, mats: new Set() });

  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const wire = useRef<THREE.Mesh>(null);
  const steel = useRef<THREE.Mesh>(null);
  const paint = useRef<THREE.Mesh>(null);
  const mirror = useRef<THREE.Group>(null);
  const mSteel = useRef<THREE.Mesh>(null);
  const mPaint = useRef<THREE.Mesh>(null);
  const mouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const scan = useRef<THREE.Group>(null);
  const grid = useRef<THREE.GridHelper>(null);
  const streaks = useRef<THREE.LineSegments>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const camPos = useRef(new THREE.Vector3(9, 2, 6));
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Points>(null);
  const trail = useRef<THREE.Mesh>(null);
  const zone = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const gridZ = useRef(0);
  const streakZ = useRef(0);
  // Story track geometry, measured on mount/resize — not every frame (no layout reads per frame).
  const track = useRef<{ el: HTMLElement | null; top: number; h: number; ro: ResizeObserver | null }>({ el: null, top: 0, h: 1, ro: null });

  const assets = useMemo(() => {
    // Geometry with creased normals, prepared off the main thread (normals.worker.ts).
    // Geometry arrives fully prepared from the worker (or the browser cache): creased normals,
    // centred, livery colours and bounding sphere — nothing heavy left for the main thread.
    // A browser may still hold the previous worker script (older output: raw colours, not
    // centred); in that case do the prep here, as before, rather than crash.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(baked.position, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(baked.normal, 3));
    let paintArr = baked.paint as Float32Array | undefined;
    let sphere: THREE.Sphere;
    if (paintArr instanceof Float32Array && Array.isArray(baked.sphere) && baked.sphere.length === 4) {
      sphere = new THREE.Sphere(new THREE.Vector3(baked.sphere[0], baked.sphere[1], baked.sphere[2]), baked.sphere[3]);
    } else {
      const legacy = baked as unknown as { color?: Float32Array; colorSize?: number };
      geo.center();
      const pos = geo.getAttribute("position");
      paintArr = new Float32Array(pos.count * 3);
      const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 }, cs = legacy.colorSize ?? 0;
      for (let i = 0; i < pos.count; i++) {
        if (legacy.color && cs) c.setRGB(legacy.color[i * cs], legacy.color[i * cs + 1], legacy.color[i * cs + 2]); else c.setRGB(0.1, 0.1, 0.1);
        c.getHSL(hsl);
        const deg = hsl.h * 360;
        if (hsl.s > 0.35 && hsl.l > 0.12 && (deg >= 290 || deg < 14)) paintArr.set([0.72, 0.012, 0.0], i * 3);
        else if (hsl.l > 0.62) paintArr.set([0.62, 0.62, 0.64], i * 3);
        else paintArr.set([0.018, 0.018, 0.02], i * 3);
      }
      geo.computeBoundingSphere();
      sphere = geo.boundingSphere!;
    }
    geo.boundingSphere = sphere;
    const paintGeo = new THREE.BufferGeometry();
    paintGeo.setAttribute("position", geo.getAttribute("position"));
    paintGeo.setAttribute("normal", geo.getAttribute("normal"));
    paintGeo.setAttribute("color", new THREE.BufferAttribute(paintArr, 3));
    paintGeo.boundingSphere = sphere.clone();

    // Vertical fade for the light beam from the sky (bright at the floor, gone at the top).
    const bc = document.createElement("canvas");
    bc.width = 4; bc.height = 256;
    const bx = bc.getContext("2d")!;
    const bgr = bx.createLinearGradient(0, 0, 0, 256);
    bgr.addColorStop(0, "rgba(255,255,255,0)");
    bgr.addColorStop(1, "rgba(255,255,255,1)");
    bx.fillStyle = bgr; bx.fillRect(0, 0, 4, 256);
    const beamTex = new THREE.CanvasTexture(bc);

    // Particle version: every 7th vertex (14th on phones), each starting scattered above the car.
    const stride = lite ? 14 : 7;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const n = Math.floor(pos.count / stride);
    const rand = mulberry32(26);
    const p = new Float32Array(n * 3), off = new Float32Array(n * 3), r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * stride;
      p[i * 3] = pos.getX(j); p[i * 3 + 1] = pos.getY(j); p[i * 3 + 2] = pos.getZ(j);
      const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1), rad = 2 + rand() * 5;
      off[i * 3] = Math.sin(ph) * Math.cos(th) * rad;
      off[i * 3 + 1] = Math.abs(Math.cos(ph)) * rad + 3 + rand() * 4; // falls in from above
      off[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rad;
      r[i] = rand();
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    pg.setAttribute("aOffset", new THREE.BufferAttribute(off, 3));
    pg.setAttribute("aRand", new THREE.BufferAttribute(r, 1));

    // Speed streaks for the track chapter.
    const S = 90, sp = new Float32Array(S * 6);
    for (let i = 0; i < S; i++) {
      const x = (rand() - 0.5) * 14, y = -1.3 + rand() * 4, z = (rand() - 0.5) * 30, len = 0.6 + rand() * 1.8;
      sp.set([x, y, z, x, y, z - len], i * 6);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));

    // Impact burst: dust and sparks thrown out from under the wheels.
    const D = 1600, dp = new Float32Array(D * 3), dv = new Float32Array(D * 3), dr = new Float32Array(D);
    for (let i = 0; i < D; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
      dp.set([Math.cos(a) * rr * 1.4, FLOOR + 0.02, Math.sin(a) * rr * 1.9], i * 3);
      const sp2 = 2 + rand() * 7;
      dv.set([Math.cos(a) * sp2, 0.6 + rand() * 3.8, Math.sin(a) * sp2], i * 3);
      dr[i] = rand();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dg.setAttribute("aVel", new THREE.BufferAttribute(dv, 3));
    dg.setAttribute("aRand", new THREE.BufferAttribute(dr, 1));

    const built = {
      geo, pg, sg, dg, paintGeo, beamTex,
      beamMat: new THREE.MeshBasicMaterial({ color: "#FF3A22", alphaMap: beamTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      dustMat: new THREE.ShaderMaterial({
        vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
        uniforms: { uT: { value: -1 }, uSize: { value: 60 * gl.getPixelRatio() } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
      wireMat: new THREE.MeshBasicMaterial({ color: "#F1F1F1", wireframe: true, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: [planes.wireKeep] }),
      // Raw stage: dark polished chrome.
      steelMat: lite
        ? new THREE.MeshStandardMaterial({ color: "#2B2E34", metalness: 1, roughness: 0.18, side: THREE.DoubleSide, clippingPlanes: [planes.steelFront, planes.steelBack] })
        : new THREE.MeshPhysicalMaterial({ color: "#2B2E34", metalness: 1, roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.1, side: THREE.DoubleSide, clippingPlanes: [planes.steelFront, planes.steelBack] }),
      // Final stage: gloss black + racing red under a clear coat.
      paintMat: lite
        ? new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.22, side: THREE.DoubleSide, transparent: true, clippingPlanes: [planes.paintKeep] })
        : new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, transparent: true, clippingPlanes: [planes.paintKeep] }),
      pointsMat: new THREE.ShaderMaterial({
        vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG,
        uniforms: { uAssemble: { value: 0 }, uTime: { value: 0 }, uSize: { value: 26 * gl.getPixelRatio() }, uOpacity: { value: 1 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
      streakMat: new THREE.LineBasicMaterial({ color: "#F1F1F1", transparent: true, opacity: 0, depthWrite: false }),
    };
    // Mirror image under the car: its own see-through copies of the materials, so the reflection
    // is faint on its own — no dark floor sheet needed (that sheet used to dim nearby text).
    const faint = <M extends THREE.Material>(m: M) => {
      const c = m.clone() as M;
      c.transparent = true; c.opacity = 0.22; c.depthWrite = false;
      return c;
    };
    return { ...built, mirrorSteelMat: faint(built.steelMat), mirrorPaintMat: faint(built.paintMat) };
  }, [baked, gl, lite]);

  useEffect(() => {
    // Grid lines fade in and out, so their material must be transparent.
    const gm = grid.current?.material as THREE.Material | undefined;
    if (gm) { gm.transparent = true; gm.depthWrite = false; gm.opacity = 0; gm.needsUpdate = true; }
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const t = track.current;
    return () => {
      t.ro?.disconnect();
      window.removeEventListener("pointermove", onMove);
      const a = assets;
      a.geo.dispose(); a.pg.dispose(); a.sg.dispose(); a.paintGeo.dispose(); a.mirrorSteelMat.dispose(); a.mirrorPaintMat.dispose(); a.dg.dispose(); a.dustMat.dispose(); a.beamTex.dispose(); a.beamMat.dispose();
      a.wireMat.dispose(); a.steelMat.dispose(); a.paintMat.dispose(); a.pointsMat.dispose(); a.streakMat.dispose();
    };
  }, [assets]);

  useFrame((state, dt) => {
    // Warm-up, before the cold open starts (the loader is on screen meanwhile):
    //  1. compile() every material — with KHR_parallel_shader_compile the GPU links them in the
    //     background while we keep returning frames, so the loader never freezes;
    //  2. once all programs report ready, draw everything once with culling off, so buffers are
    //     uploaded and bounding spheres computed now — not the first time a build stage appears.
    // (three's own compileAsync trips over materials that never got a program; this check doesn't.)
    const w = warm.current;
    if (w.phase !== 2) {
      if (w.phase === 0) {
        w.phase = 1; w.t0 = performance.now();
        state.scene.traverse((o) => {
          o.visible = true;
          const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
          if (g && !g.boundingSphere) g.computeBoundingSphere();
        });
        w.mats = state.gl.compile(state.scene, state.camera) as unknown as Set<THREE.Material>;
      }
      const ready = [...w.mats].every((m) => {
        const prog = (state.gl.properties.get(m) as { currentProgram?: { isReady?: () => boolean } }).currentProgram;
        return !prog?.isReady || prog.isReady();
      });
      if (!ready && performance.now() - w.t0 < 5000) { state.scene.visible = false; return; } // nothing drawn = nothing blocks
      state.scene.visible = true;
      const culled: THREE.Object3D[] = [];
      state.scene.traverse((o) => { o.visible = true; if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
      state.gl.render(state.scene, state.camera);
      culled.forEach((o) => { o.frustumCulled = true; });
      w.phase = 2;
      onReady();
    }
    const now = state.clock.elapsedTime;
    // Advance the shared hero clock by this frame's time (capped, so a hitch slows the shot down).
    const ht = advanceHero(Math.min(dt, 1 / 30)); // hero time (s)
    const heroOn = ht < HERO.end;
    const tau = ht - HERO.impact;                                  // time since impact
    const rw = clamp01((ht - HERO.rewind) / (HERO.end - HERO.rewind));

    // Where are we in the story? C = chapter index + progress, measured at mid-screen.
    let C = 0;
    const el = trackEl.current;
    const tr = track.current;
    if (el && el !== tr.el) {
      const measure = () => { const r = el.getBoundingClientRect(); tr.top = r.top + window.scrollY; tr.h = Math.max(1, r.height); };
      tr.ro?.disconnect();
      tr.ro = new ResizeObserver(measure);
      tr.ro.observe(el);
      tr.el = el;
      measure();
    }
    if (tr.el) C = Math.min(CHAPTERS, Math.max(0, ((window.scrollY + window.innerHeight * 0.5 - tr.top) / tr.h) * CHAPTERS));

    // ── Camera
    const s = heroOn ? heroShot(ht) : shotAt(C);
    const portrait = size.width < size.height;
    // Narrower-than-16:9 landscapes (tablets, 16:10, 4:3) pull back so the car keeps its share of the width.
    const wide = portrait ? 1 : Math.max(1, 1.72 / (size.width / size.height));
    const dist = portrait ? s.d * 2.15 : s.d * wide;
    const m = mouse.current;
    const mk = 1 - Math.pow(0.05, dt);
    m.sx += (m.x - m.sx) * mk; m.sy += (m.y - m.sy) * mk;
    const A = THREE.MathUtils.degToRad(s.az + Math.sin(now * 0.18) * 6 + m.sx * 7);
    const E = THREE.MathUtils.degToRad(s.el - m.sy * 3);
    const target = new THREE.Vector3(Math.cos(E) * Math.sin(A) * dist, Math.sin(E) * dist + 0.2, Math.cos(E) * Math.cos(A) * dist);
    // Punchy camera during the cold open, slow fluid glide during the story.
    camPos.current.lerp(target, 1 - Math.pow(heroOn && ht < HERO.rewind ? 0.0006 : 0.04, dt));
    camera.position.copy(camPos.current);
    const rumble = heroOn ? 0.045 * ramp(ht, HERO.lights + 0.6, HERO.drop) * (ht < HERO.impact ? 1 : 0) : 0;
    if (heroOn && ((tau > 0 && tau < 1) || rumble > 0.001)) {     // pre-drop rumble + impact shake
      const amp = tau > 0 ? 0.32 * Math.exp(-tau * 5.5) : rumble;
      camera.position.add(new THREE.Vector3(Math.sin(ht * 91) * amp, Math.sin(ht * 117 + 1) * amp, Math.sin(ht * 73 + 2) * amp));
    }
    camera.lookAt(0, 0, 0);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const shift = size.width >= 1024 ? s.shift * wide : 0;
    // Phones: look above the car so it sits in the lower half; the story text owns the top.
    camera.lookAt(new THREE.Vector3(0, portrait ? 2.3 + Math.max(0, s.lift) + Math.min(1, Math.max(0, (size.width / size.height - 0.48) * 10)) : s.lift, 0).addScaledVector(right, -shift));

    // ── Stage 0: the finished car bursts into particles (end of the cold open) — they swirl
    //    out and re-form as "the idea"; scrolling into the blueprint dissolves them.
    const dissolve = ramp(C, 0.72, 1.15);
    const pOpacity = heroOn ? smooth(clamp01(rw / 0.3)) * (0.45 + 0.55 * rw) : 1 - dissolve; // dim burst keeps the line readable
    const idleSwirl = 0.14 * Math.sin(Math.PI * clamp01(C / 0.72));                     // scroll stirs the cloud
    const pAssemble = heroOn ? 1 - 0.38 * Math.sin(Math.PI * rw) : (1 - dissolve) * (1 - idleSwirl); // swirl out, then re-form
    const pm = points.current?.material as THREE.ShaderMaterial | undefined;
    if (pm) {
      pm.uniforms.uAssemble.value = pAssemble;
      pm.uniforms.uOpacity.value = pOpacity;
      pm.uniforms.uTime.value = now;
    }
    if (points.current) points.current.visible = pOpacity > 0.002;

    // ── Stage 1→2→3: two scan sweeps, front to back
    const sA = HALF - 2 * HALF * ramp(C, 1.72, 2.3);
    const sB = HALF - 2 * HALF * ramp(C, 2.72, 3.3);
    planes.wireKeep.constant = sA;
    planes.steelFront.constant = -sA;
    planes.steelBack.constant = sB;
    planes.paintKeep.constant = heroOn ? 10 : -sB; // the cold open shows the whole finished car
    const wm = wire.current?.material as THREE.MeshBasicMaterial | undefined;
    if (wm) wm.opacity = 0.2 * ramp(C, 0.78, 1.1);
    if (wire.current) wire.current.visible = sA > -HALF + 0.01 && C > 0.75;
    if (steel.current) steel.current.visible = sA < HALF - 0.01 && sB > -HALF + 0.01;
    const paintFade = heroOn ? 1 - smooth(clamp01(rw / 0.35)) : 1;
    const pmat = paint.current?.material as THREE.MeshPhysicalMaterial | undefined;
    if (pmat) { pmat.opacity = paintFade; pmat.depthWrite = paintFade > 0.5; }
    const mpm = mPaint.current?.material as THREE.Material | undefined;
    if (mpm) mpm.opacity = 0.22 * paintFade;
    if (paint.current) paint.current.visible = heroOn ? paintFade > 0.01 && ht > HERO.drop - 0.05 : sB < HALF - 0.01;
    if (mSteel.current && steel.current) mSteel.current.visible = steel.current.visible;
    if (mPaint.current && paint.current) mPaint.current.visible = paint.current.visible;

    const sweepA = band(C, 1.72, 1.75, 2.27, 2.3), sweepB = band(C, 2.72, 2.75, 3.27, 3.3);
    if (scan.current) {
      const on = Math.max(sweepA, sweepB);
      scan.current.visible = on > 0.01;
      scan.current.position.z = sweepA > sweepB ? sA : sB;
      scan.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.Material;
        m.opacity = on * (c.userData.base as number);
      });
    }

    // ── Stage 4: race — grid streams, streaks fly, chassis vibrates
    const speed = Math.max(band(C, 3.75, 4.15, 4.85, 5.2), heroOn ? band(ht, HERO.race, HERO.race + 0.4, HERO.rewind - 0.2, HERO.rewind + 0.25) : 0);
    gridZ.current = (gridZ.current + dt * 9 * speed) % 0.5;
    if (grid.current) {
      grid.current.position.z = gridZ.current;
      const gm = grid.current.material as THREE.Material;
      const flash = heroOn ? (tau > 0 ? 0.6 * Math.exp(-tau * 3) : 0.22 * ramp(ht, HERO.lights, HERO.drop)) : 0;
      gm.opacity = Math.max(0.3 * band(C, 0.8, 1.1, 1.8, 2.2), 0.28 * speed, 0.1 * ramp(C, 4.9, 5.4), flash);
    }
    if (streaks.current) {
      streakZ.current = (streakZ.current + dt * 28 * speed) % 30;
      streaks.current.position.z = streakZ.current;
      (streaks.current.material as THREE.LineBasicMaterial).opacity = 0.45 * speed;
      streaks.current.visible = speed > 0.01;
    }
    // ── Car body motion: the drop, the landing squash, idle float and race vibration
    let dropY = 0, rx = 0, ry = 0, sq = 1;
    if (heroOn) {
      if (ht < HERO.impact) {
        const u = clamp01((ht - HERO.drop) / (HERO.impact - HERO.drop));
        dropY = 16 * (1 - u * u * u);           // accelerating fall from the sky
        rx = -0.35 * (1 - u); ry = 0.8 * (1 - u);
      } else {
        const e = Math.exp(-7 * tau);
        sq = 1 - 0.12 * e * Math.cos(16 * tau); // suspension squash + rebound
        dropY = 0.2 * Math.exp(-6 * tau) * Math.abs(Math.sin(11 * tau));
      }
    }
    if (group.current) {
      const g = group.current;
      const hover = heroOn ? 0 : Math.sin(now * 0.9) * 0.05 * (1 - speed);
      g.position.y = dropY + FLOOR * (1 - sq) + hover + Math.sin(now * 38) * 0.012 * speed + Math.sin(now * 3.1) * 0.02 * speed;
      g.rotation.set(rx + Math.sin(now * 0.6) * 0.012, ry, Math.sin(now * 2.3) * 0.012 * speed + Math.sin(now * 0.7) * 0.01);
      const bulge = 1 + (1 - sq) * 0.4;
      g.scale.set(bulge, sq, bulge);
      if (mirror.current) {
        mirror.current.position.y = 2 * FLOOR - g.position.y;
        mirror.current.rotation.set(-g.rotation.x, g.rotation.y, -g.rotation.z);
        mirror.current.scale.set(bulge, -sq, bulge);
      }
    }

    // ── Impact effects: shockwave rings, dust burst, falling light trail
    // Landing zone: a pulsing target on the floor and a beam from the sky, until touchdown.
    const zoneAmt = heroOn ? band(ht, HERO.lights, HERO.lights + 0.5, HERO.impact, HERO.impact + 0.35) : 0;
    if (zone.current) {
      zone.current.visible = zoneAmt > 0.01;
      const pulse = 1 + 0.06 * Math.sin(ht * 9);
      zone.current.scale.setScalar(pulse);
      zone.current.rotation.y = ht * 0.6;
      zone.current.children.forEach((c) => {
        ((c as THREE.Mesh).material as THREE.Material).opacity = zoneAmt * (c.userData.base as number);
      });
    }
    if (beam.current) {
      const beamAmt = heroOn ? band(ht, HERO.lights + 0.2, HERO.lights + 0.9, HERO.impact - 0.05, HERO.impact + 0.25) : 0;
      beam.current.visible = beamAmt > 0.01;
      (beam.current.material as THREE.MeshBasicMaterial).opacity = beamAmt * (0.075 + 0.015 * Math.sin(ht * 23));
    }

    const ringU = clamp01(tau / 0.9), ring2U = clamp01((tau - 0.12) / 1.0);
    if (ring.current) {
      ring.current.visible = heroOn && tau >= 0 && ringU < 1;
      ring.current.scale.setScalar(0.4 + 10 * (1 - Math.pow(1 - ringU, 3)));
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - ringU) * 0.95;
    }
    if (ring2.current) {
      ring2.current.visible = heroOn && tau >= 0.12 && ring2U < 1;
      ring2.current.scale.setScalar(0.4 + 7 * (1 - Math.pow(1 - ring2U, 3)));
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = (1 - ring2U) * 0.5;
    }
    const dm = dust.current?.material as THREE.ShaderMaterial | undefined;
    if (dm) dm.uniforms.uT.value = heroOn ? tau : -1;
    if (dust.current) dust.current.visible = heroOn && tau > -0.01 && tau < 2.2;
    if (trail.current) {
      const on = heroOn && ht > HERO.drop && ht < HERO.impact + 0.35;
      trail.current.visible = on;
      trail.current.position.y = dropY + 7;
      (trail.current.material as THREE.MeshBasicMaterial).opacity = on ? (ht < HERO.impact ? 0.9 : 0.9 * (1 - (ht - HERO.impact) / 0.35)) : 0;
    }

    // ── Light: the car is lit as it becomes real
    const heroKey = heroOn ? 2.3 * (1 - smooth(rw)) : 0;
    if (key.current) key.current.intensity = 0.15 + Math.max(2.3 * ramp(C, 1.8, 2.4), heroKey);
    const impactFlash = heroOn && tau > 0 ? 10 * Math.exp(-tau * 5) : 0;
    if (rim.current) rim.current.intensity = 2.2 + 1.8 * ramp(C, 4.8, 5.6) + impactFlash;
  });

  const scanBase = { plane: 0.07, edge: 0.95 };
  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight ref={key} position={[4, 7, 5]} color="#FFFFFF" />
      <directionalLight ref={rim} position={[-6, 3, -7]} color="#FF1A00" />
      <directionalLight position={[6, 1.5, -2]} intensity={1.2} color="#FF2A10" />
      <directionalLight position={[0, -4, 3]} intensity={0.25} color="#8090A8" />

      {/* Glossy floor: a mirrored copy of the car under a dark, fading sheet */}
      {!lite && (
        <group ref={mirror} scale={[1, -1, 1]} position={[0, 2 * FLOOR, 0]}>
          <mesh ref={mSteel} geometry={assets.geo} material={assets.mirrorSteelMat} visible={false} />
          <mesh ref={mPaint} geometry={assets.paintGeo} material={assets.mirrorPaintMat} visible={false} />
        </group>
      )}

      {/* Cold-open effects */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR + 0.01, 0]} visible={false}>
        <ringGeometry args={[0.96, 1, 128]} />
        <meshBasicMaterial color="#FF2A10" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR + 0.012, 0]} visible={false}>
        <ringGeometry args={[0.985, 1, 128]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <points ref={dust} geometry={assets.dg} material={assets.dustMat} visible={false} />
      <group ref={zone} position={[0, FLOOR + 0.015, 0]} visible={false}>
        {[[1.9, 1.96, 0.9], [2.5, 2.52, 0.45], [0.18, 0.24, 0.9]].map(([a, b, base], i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} userData={{ base }}>
            <ringGeometry args={[a, b, 96]} />
            <meshBasicMaterial color="#FF2A10" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`t${i}`} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]} userData={{ base: 0.8 }}>
            <planeGeometry args={[0.05, 0.7]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={beam} position={[0, FLOOR + 7, 0]} material={assets.beamMat} visible={false}>
        <cylinderGeometry args={[0.25, 1.7, 14, 48, 1, true]} />
      </mesh>
      <mesh ref={trail} visible={false}>
        <boxGeometry args={[0.035, 12, 0.035]} />
        <meshBasicMaterial color="#FF2A10" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      <gridHelper ref={grid} args={[22, 44, "#E10600", "#2A2A2E"]} position={[0, FLOOR + 0.004, 0]} />
      <lineSegments ref={streaks} geometry={assets.sg} material={assets.streakMat} />

      <group ref={group}>
        <points ref={points} geometry={assets.pg} material={assets.pointsMat} />
        <mesh ref={wire} geometry={assets.geo} material={assets.wireMat} />
        <mesh ref={steel} geometry={assets.geo} material={assets.steelMat} visible={false} />
        <mesh ref={paint} geometry={assets.paintGeo} material={assets.paintMat} visible={false} />

        {/* The scan line: a faint red sheet with a bright edge */}
        <group ref={scan} visible={false}>
          <mesh userData={{ base: scanBase.plane }}>
            <planeGeometry args={[3.4, 3.2]} />
            <meshBasicMaterial color="#E10600" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <lineLoop userData={{ base: scanBase.edge }}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array([-1.7, -1.6, 0, 1.7, -1.6, 0, 1.7, 1.6, 0, -1.7, 1.6, 0]), 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#FF3B1F" transparent opacity={0} />
          </lineLoop>
        </group>
      </group>
    </>
  );
}

/** Fixed, full-screen WebGL stage. The car lives here for the whole home page. */
export default function Story3D({
  trackEl, advanceHero, onReady, onProgress,
}: {
  trackEl: React.RefObject<HTMLElement | null>;
  advanceHero: (dt: number) => number;
  onReady: () => void;
  onProgress: (pct: number) => void;
}) {
  // Real download progress of the model + decoder, for the loading card.
  const { progress } = useProgress();
  useEffect(() => { onProgress(progress); }, [progress, onProgress]);
  const onCacheHit = useCallback(() => onProgress(100), [onProgress]);
  // Phones/tablets get a lighter render: lower resolution, no MSAA, no mirror, half the particles.
  const [lite] = useState(() => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);
  // Resolution adapts to the device: drop to 1× if frames start slipping, climb back when there's headroom.
  // iPhones/iPads have 3× screens and strong GPUs: 1.25× looks soft there, so they get up to 1.75×.
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const maxDpr = Math.min(window.devicePixelRatio || 1, lite ? (iOS ? 1.75 : 1.25) : 1.4);
  const [dpr, setDpr] = useState(maxDpr);
  // Only start judging frame rate once the intro is running — loading frames are always slow.
  const [settled, setSettled] = useState(false);
  const ready = useCallback(() => { onReady(); window.setTimeout(() => setSettled(true), 4000); }, [onReady]);
  return (
    <Canvas
      style={{ pointerEvents: "none" }} // a visual layer only: clicks go to the page beneath
      dpr={dpr}
      camera={{ fov: 30, near: 0.1, far: 80, position: [9, 2, 6] }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      onCreated={({ gl, scene }) => {
        gl.localClippingEnabled = true;
        const pmrem = new THREE.PMREMGenerator(gl);
        // Studio reflections. Phones bake a 128px cube (≈4× cheaper, still crisp on a small car).
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size: lite ? 128 : 256 }).texture;
        scene.environmentIntensity = 0.9; // strong studio reflections = shine
        pmrem.dispose();
      }}
    >
      {settled && <PerformanceMonitor flipflops={3} onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} onFallback={() => setDpr(1)} />}
      <Suspense fallback={null}>
        <Stage trackEl={trackEl} advanceHero={advanceHero} onReady={ready} lite={lite} onCacheHit={onCacheHit} />
      </Suspense>
    </Canvas>
  );
}

// No useGLTF.preload: on a cache hit the model file is never decoded at all.
