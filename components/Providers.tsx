"use client";

import { useEffect } from "react";
import "@/lib/firebase";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensures Firebase & Google Analytics initialization triggers on client mount
    import("@/lib/firebase");
  }, []);

  return <>{children}</>;
}
