"use client";

/* Opens the B-26 sprint from anywhere: dispatch `sae:play`, or land on /?play=1 (shared links, 404).
   The game chunk loads only when someone asks for it. */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SprintGame = dynamic(() => import("./SprintGame"), { ssr: false });

export default function GameLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("sae:play", on);
    const t = new URLSearchParams(window.location.search).get("play") === "1" ? setTimeout(on, 0) : 0;
    return () => { window.removeEventListener("sae:play", on); if (t) clearTimeout(t); };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("play")) { url.searchParams.delete("play"); window.history.replaceState(null, "", url.toString()); }
  }, []);

  return open ? <SprintGame onClose={close} /> : null;
}
