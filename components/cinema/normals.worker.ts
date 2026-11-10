/// <reference lib="webworker" />
/* Off-main-thread geometry prep for the B-26: creased normals (smooth across gentle curves,
   sharp at real edges) over ~456k vertices. Running it here keeps the page — and the loader
   dial — fully animated while it works. */
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface BakeIn {
  position: Float32Array;
  index?: Uint32Array | Uint16Array;
  color?: ArrayLike<number> & { buffer: ArrayBufferLike };
  colorSize?: number;
  colorNormalized?: boolean;
}
export interface BakeOut {
  position: Float32Array;   // already centred on the origin
  normal: Float32Array;
  paint: Float32Array;      // RGB livery: racing red / chrome / gloss black
  sphere: [number, number, number, number]; // bounding sphere (cx, cy, cz, r)
}

self.onmessage = (e: MessageEvent<BakeIn>) => {
  const { position, index, color, colorSize, colorNormalized } = e.data;
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  if (color && colorSize) {
    const c = new THREE.BufferAttribute(color as unknown as Float32Array, colorSize, !!colorNormalized);
    // Normalise to plain floats so the main thread gets one simple format.
    const f = new Float32Array(c.count * colorSize);
    for (let i = 0; i < c.count; i++) for (let k = 0; k < colorSize; k++) f[i * colorSize + k] = c.getComponent(i, k);
    g.setAttribute("color", new THREE.BufferAttribute(f, colorSize));
  }
  if (index) g.setIndex(new THREE.BufferAttribute(index, 1));
  g = toCreasedNormals(g, Math.PI / 5);

  // Everything else the main thread used to do on mount happens here too, so the page never
  // pauses: centre the model, repaint the livery, and measure the bounding sphere.
  g.center();
  const pos = g.getAttribute("position");
  const col = g.getAttribute("color");
  const paint = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < pos.count; i++) {
    if (col) c.setRGB(col.getX(i), col.getY(i), col.getZ(i)); else c.setRGB(0.1, 0.1, 0.1);
    c.getHSL(hsl);
    const deg = hsl.h * 360;
    const o = i * 3;
    if (hsl.s > 0.35 && hsl.l > 0.12 && (deg >= 290 || deg < 14)) { paint[o] = 0.72; paint[o + 1] = 0.012; paint[o + 2] = 0; }
    else if (hsl.l > 0.62) { paint[o] = 0.62; paint[o + 1] = 0.62; paint[o + 2] = 0.64; }
    else { paint[o] = 0.018; paint[o + 1] = 0.018; paint[o + 2] = 0.02; }
  }
  g.computeBoundingSphere();
  const bs = g.boundingSphere!;

  const out: BakeOut = {
    position: pos.array as Float32Array,
    normal: g.getAttribute("normal").array as Float32Array,
    paint,
    sphere: [bs.center.x, bs.center.y, bs.center.z, bs.radius],
  };
  const transfer: Transferable[] = [out.position.buffer as ArrayBuffer, out.normal.buffer as ArrayBuffer, paint.buffer as ArrayBuffer];
  (self as unknown as Worker).postMessage(out, transfer);
};
