"use client";

/* Browser cache (IndexedDB) for the B-26's *prepared* geometry — positions, creased normals and
   colours, after Draco decoding and the normals pass. Return visits load this directly and skip
   both steps. Bump CACHE_KEY whenever the model file or the geometry processing changes. */

export interface PreparedGeometry {
  position: Float32Array;
  normal: Float32Array;
  paint: Float32Array;
  sphere: [number, number, number, number];
}

const DB_NAME = "sae-3d";
const STORE = "geometry";
const CACHE_KEY = "b26_draco.glb@695824/creased-pi5/v2-centred-livery";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Cached geometry, or null on a miss / when storage is unavailable. Never throws. */
export async function readPrepared(): Promise<PreparedGeometry | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(CACHE_KEY);
      req.onsuccess = () => {
        const v = req.result as PreparedGeometry | undefined;
        resolve(v && v.position instanceof Float32Array && v.normal instanceof Float32Array && v.paint instanceof Float32Array && Array.isArray(v.sphere) ? v : null);
      };
      req.onerror = () => resolve(null);
      db.close();
    });
  } catch {
    return null;
  }
}

/** Store prepared geometry for next time; drops older versions. Best-effort, never throws. */
export async function writePrepared(g: PreparedGeometry): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      store.put(g, CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    db.close();
  } catch { /* storage full / private mode: just skip caching */ }
}
