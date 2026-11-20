"use client";
import { useEffect } from "react";
import { trackOpenOnce } from "@/lib/track-client";

export function PwaRegister() {
  useEffect(() => {
    trackOpenOnce();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
