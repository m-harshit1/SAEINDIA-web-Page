/** Cold-open beats, in seconds of the shared hero clock (starts when the model is ready).
 *  The 3D stage advances `t` each rendered frame (capped per frame, so a dropped frame
 *  slows the shot instead of skipping it); HeroOverlay and HomeTab read the same `t`.
 *
 *   0.0  loaded — the title card holds for a beat
 *   lights  five start lights come on one by one; landing target + sky beam + rumble
 *   drop    lights out → the car falls into the target
 *   impact  shockwave, dust, shake, B-26 title
 *   race    chase shot, speedo
 *   rewind  car bursts into particles → "starts as a story"
 *   end     hand over to the scroll story                                                  */
export const HERO = { lights: 0.8, drop: 2.0, impact: 2.5, race: 3.4, rewind: 5.0, end: 6.8 };
export const LIGHT_STEP = 0.22; // seconds between start lights
export type HeroClock = { started: boolean; t: number };

export let heroPlayed = typeof window !== "undefined" && Boolean(sessionStorage.getItem("sae_hero_seen"));
export function setHeroPlayed(v: boolean) {
  heroPlayed = v;
  if (v && typeof window !== "undefined") {
    try { sessionStorage.setItem("sae_hero_seen", "1"); } catch {}
  }
}
