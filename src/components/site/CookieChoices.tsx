"use client";

/**
 * Re-opens Google's consent message (AdSense Privacy & messaging) so visitors can
 * change their choice. Only rendered on pages where AdSense is switched on.
 */
declare global {
  interface Window {
    googlefc?: { callbackQueue?: unknown[]; showRevocationMessage?: () => void };
  }
}

export function CookieChoices() {
  const open = () => {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push(() => window.googlefc?.showRevocationMessage?.());
  };
  return (
    <button type="button" onClick={open}>
      Cookie choices
    </button>
  );
}
