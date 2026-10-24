"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    __turnstileLoading?: Promise<void>;
  }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoading) return window.__turnstileLoading;
  window.__turnstileLoading = new Promise((resolve, reject) => {
    // Created from our own (nonce-trusted) bundle, so 'strict-dynamic' lets it load.
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return window.__turnstileLoading;
}

/**
 * Cloudflare Turnstile. Adds a hidden "cf-turnstile-response" field to the form;
 * Supabase Auth verifies the token server-side (captcha protection setting).
 * Change `resetKey` after a failed submit to get a fresh single-use token.
 */
export function Turnstile({ siteKey, action, resetKey }: { siteKey: string; action: string; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile || widget.current) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        if (box.current) box.current.textContent = "The security check couldn't load. Check your connection or disable blockers for this page.";
      });
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetKey !== undefined && widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetKey]);

  return <div ref={box} className="turnstile" />;
}
