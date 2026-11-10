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
export const HERO = { lights: 1.0, drop: 2.45, impact: 3.0, race: 4.1, rewind: 6.1, end: 8.6 };
export const LIGHT_STEP = 0.26; // seconds between start lights
export type HeroClock = { started: boolean; t: number };

export let heroPlayed = false;
export function setHeroPlayed(v: boolean) {
  heroPlayed = v;
}
