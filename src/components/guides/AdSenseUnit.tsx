"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** A manual AdSense ad unit in one of our reserved spots (Auto ads stay off). */
export function AdSenseUnit({ client, slot }: { client: string; slot: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers, or the script didn't load: the reserved space simply stays empty */
    }
  }, []);
  return <ins className="adsbygoogle adsense" data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />;
}
