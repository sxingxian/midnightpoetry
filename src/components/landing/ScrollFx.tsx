"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker, plus scroll reveals for
 * anything marked data-rv (optional data-d = delay in ms). With reduced motion:
 * native scrolling and simple fades, no movement.
 */
export function ScrollFx() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      tickerFn = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-rv]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) return; // already on screen: leave it visible
        const delay = Number(el.dataset.d ?? 0) / 1000;
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: reduced ? 0 : 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduced ? 0.3 : 0.9,
            delay,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    });

    return () => {
      ctx.revert();
      if (tickerFn) gsap.ticker.remove(tickerFn);
      lenis?.destroy();
    };
  }, []);

  return null;
}
