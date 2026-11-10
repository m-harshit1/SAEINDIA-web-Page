# SAEINDIA Web Page - IIITDM Kurnool

Official web platform for the SAEINDIA Collegiate Club at IIITDM Kurnool. Features interactive 3D vehicle visualization, event showcases, blogs, team portals, and membership workflows.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Webpack bundler) & React 19
- **3D & Graphics**: Three.js, React Three Fiber, Drei, Draco compression, custom normal worker
- **Styling**: Tailwind CSS v4, Lucide icons, Framer Motion, Lenis smooth scrolling
- **Backend & Database**: Firebase (Hosting, Firestore), Prisma (legacy/local tools)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

> **Note**: `npm run dev` automatically triggers the pre-build step (`npm run build:worker`) to compile the 3D normals web worker via `esbuild`.

Open [http://localhost:3000](http://localhost:3000) in your browser to view the site.

---

## Deployment Instructions

To deploy updates to the live production site:

### 1. Firebase Access
Ensure your Google account has been granted collaborator/editor access to the Firebase project:
```
sae-iiitdm-kurnool
```

### 2. Build the Static Export
Build the application with the Webpack flag:
```bash
npm run build
# or
npx next build --webpack
```

### 3. Deploy to Firebase Hosting
Deploy the static export to Firebase:
```bash
npx firebase deploy --only hosting
```

---

## Project Structure

```
├── app/                  # Next.js App Router (pages, layout, admin)
├── assets-archive/       # 3D assets archive (.glb models)
├── components/           # React UI and 3D cinema components
│   └── cinema/           # 3D Buggy viewer, engine, workers
├── data/                 # Team, achievements, blogs, and local seed data
├── lib/                  # Firebase client configuration, cache, loaders
├── public/               # Static assets, WebP images, Draco decoders, models
└── legacy-server/        # Legacy API routes and backend utilities
```

---

## License

Maintained by SAEINDIA Collegiate Club, IIITDM Kurnool.
