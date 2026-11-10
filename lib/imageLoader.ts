'use client';

/* Static-export image loader. Next's image optimisation can't run on Firebase Hosting, so the
   photos in /public/media have pre-generated widths (name.w480.webp, name.w960.webp — made with
   sharp; regenerate them when you add or replace a photo). For each width the browser asks for,
   serve the smallest variant that is at least that wide, else the original. Anything not in the
   list below is served untouched. */

const VARIANTS = new Set([
  "/media/mockup-build.webp",
  "/media/mockup-cad.webp",
  "/media/mockup-team.webp",
  "/media/team-2025.webp",
  "/media/workshop-frame.webp",
]);
const WIDTHS = [480, 960];
/* Wide photos shown full-bleed also get a 1280 cut, so 3× phones (~1170 px) skip the original. */
const WIDE = new Set(["/media/team-2025.webp", "/media/workshop-frame.webp"]);

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!VARIANTS.has(src)) return src;
  const sizes = WIDE.has(src) ? [...WIDTHS, 1280] : WIDTHS;
  const w = sizes.find((x) => x >= width);
  return w ? src.replace(/\.webp$/, `.w${w}.webp`) : src;
}
