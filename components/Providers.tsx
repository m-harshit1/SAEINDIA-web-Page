"use client";

/* Auth now lives in Firebase (lib/firebase.ts + lib/useFirebaseUser.ts), so no provider is needed. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
