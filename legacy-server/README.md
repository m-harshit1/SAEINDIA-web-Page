# Legacy server code (not deployed)

The site now deploys as a static export to Firebase Hosting, with data in Firestore
and sign-in via Firebase Auth (see `lib/firebase.ts`, `firestore.rules`).

These files are the previous Next.js API routes, next-auth config and Prisma client.
They are kept for reference only and are excluded from the build (`tsconfig.json`).

`components/PortalTab.tsx` and `lib/useFirebaseUser.ts` are the members/admin Portal
(Firestore + Google sign-in). It was removed from the site on request; to bring it back,
move both files back, re-add the "portal" tab in `app/page.tsx`, restore the auth exports
in `lib/firebase.ts`, and enable Google sign-in in Firebase Authentication.
