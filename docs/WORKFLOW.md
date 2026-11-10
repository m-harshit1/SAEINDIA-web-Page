# SAEINDIA Web Platform — Engineering Workflow System

This document outlines the standard 5-stage development lifecycle for contributing to and editing the **SAEINDIA IIITDM Kurnool Web Platform**.

---

## The 5-Stage Lifecycle

```
[1. Planning] ──> [2. Local Dev] ──> [3. CI & Build] ──> [4. Testing] ──> [5. Production Deployment]
```

---

### Stage 1: Planning
Before modifying code:
1. **Understand Architectural Constraints**:
   - The site uses Next.js 16 with static HTML export (`output: "export"` in `next.config.ts`).
   - Node.js runtime API routes cannot run on static hosting; dynamic features use Firebase Firestore / Auth directly on the client.
   - Three.js / Draco 3D models require web worker calculation (`normals.worker.ts`) compiled via `esbuild`.
2. **Review UX Impact**:
   - Ensure cinematic transitions (e.g. cold-open hero timeline, BuggyCurtain) are respected.
   - Any full-screen scenes should utilize `body.hero-active` or `hideNav` patterns to prevent UI overlaps.

---

### Stage 2: Local Development
Keep the development server live locally while programming:

```bash
# 1. Install dependencies (first time)
npm install

# 2. Start development server (with pre-compiled worker)
npm run dev
```

- Accessible at: **`http://localhost:3000`**
- `npm run dev` automatically runs `predev` (`npm run build:worker`) before booting Next.js with the Webpack bundler.
- Keep the local server active in the background while making changes; Hot Module Replacement (HMR) will update modified components in real-time.

---

### Stage 3: Continuous Integration (CI) & Build
Every commit pushed to GitHub and every Pull Request is automatically verified by **GitHub Actions** (`.github/workflows/ci.yml`).

The automated CI executes:
1. `npm ci`: Clean dependency resolution.
2. `npm run build:worker`: Compiles Web Worker bundles.
3. `npm run typecheck`: Strict TypeScript validation (`tsc --noEmit`).
4. `npm run lint`: ESLint code quality checks.
5. `npm run build`: Generates the complete static export into `out/`.
6. Static Artifact Verification: Validates `out/index.html`, `out/admin.html`, `out/404.html`, and `out/workers/normals.js`.

---

### Stage 4: Testing & Verification
Before pushing changes or deploying, run the local verification suite:

```bash
# Run complete verification (worker build + typecheck + lint)
npm run test:verify
```

#### Manual Verification Checklist:
- **3D Vehicle Viewport**: Verify car model loads with Draco decoding and lighting.
- **Intro Animation**: Verify top navigation taskbar and bottom HUD bars stay hidden until the cold open completes or "Skip intro" is pressed.
- **Tab Switching**: Verify tab changes animate with the BuggyCurtain transition.
- **Responsive Layout**: Test desktop and mobile navigation behavior.

---

### Stage 5: Production Deployment
Deployments publish the static output to **Firebase Hosting** on project `sae-iiitdm-kurnool`.

#### One-Command Production Deployment:
```bash
npm run deploy:live
```
*(This automatically runs verification, builds the static export, and publishes to Firebase Hosting).*

#### Manual Step-by-Step Deployment:
```bash
# 1. Verify build
npm run test:verify

# 2. Build static export
npm run build

# 3. Deploy to Firebase
npx firebase deploy --only hosting
```

- **Live Production URL**: `https://sae-iiitdm-kurnool.web.app`
- **Firebase Project Console**: `https://console.firebase.google.com/project/sae-iiitdm-kurnool/overview`

