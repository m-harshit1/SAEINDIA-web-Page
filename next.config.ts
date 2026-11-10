import type { NextConfig } from "next";

/* Static export for Firebase Hosting. Security headers live in firebase.json
   (Next's headers() does not apply to exported sites). */
const nextConfig: NextConfig = {
  output: "export",
  // Pre-sized photo variants, picked per screen by lib/imageLoader.ts (no server-side optimiser).
  images: { loader: "custom", loaderFile: "./lib/imageLoader.ts" },
};

export default nextConfig;
