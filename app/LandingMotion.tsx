"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Wraps the landing page and drives all of its motion with GSAP.
 * The page itself stays a server component; this only adds behaviour,
 * targeting elements by class / data attributes inside its own scope.
 *
 * Everything is gated on `prefers-reduced-motion: no-preference`; with reduced
 * motion the page renders static (the CSS un-hides the intro elements).
 */
export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);

        /* ---------- Hero intro ---------- */
        const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
        intro
          .fromTo(q(".lp-hero .lp-pill"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6 })
          .fromTo(
            q(".lp-line-in"),
            { yPercent: 105 },
            { yPercent: 0, stagger: 0.12, duration: 1.05, ease: "expo.out" },
            "-=0.3"
          )
          .fromTo(q(".lp-lede, .lp-hero .lp-ctas"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, "-=0.7")
          .fromTo(q(".lp-card"), { autoAlpha: 0, y: 140 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "expo.out" }, "-=0.6")
          .fromTo(q(".lp-float-left"), { autoAlpha: 0, x: -60, rotate: -4 }, { autoAlpha: 1, x: 0, rotate: 0 }, "-=0.85")
          .fromTo(q(".lp-float-right"), { autoAlpha: 0, x: 60, rotate: 4 }, { autoAlpha: 1, x: 0, rotate: 0 }, "<0.12")
          .fromTo(q(".lp-hero-note"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.5");

        // Circuit lines draw themselves in
        q(".lp-hero .lp-circuit path").forEach((p) => {
          const len = (p as unknown as SVGPathElement).getTotalLength();
          gsap.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", delay: 0.2 }
          );
        });
        gsap.fromTo(
          q(".lp-hero .lp-circuit rect, .lp-hero .lp-circuit circle"),
          { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" },
          { autoAlpha: 1, scale: 1, stagger: 0.06, delay: 1, duration: 0.5, ease: "back.out(2)" }
        );

        // Idle float on the side panels (on an inner wrapper so it doesn't fight the parallax)
        q(".lp-float-bob").forEach((el, i) => {
          gsap.to(el, {
            y: i % 2 ? 9 : -9,
            duration: 2.6 + i * 0.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 1.6,
          });
        });

        // Scroll parallax: panels drift faster than the card
        const heroScroll = { trigger: q(".lp-hero")[0], start: "top top", end: "bottom top", scrub: true };
        gsap.to(q(".lp-float-left"), { y: -120, ease: "none", scrollTrigger: heroScroll });
        gsap.to(q(".lp-float-right"), { y: -70, ease: "none", scrollTrigger: heroScroll });
        gsap.to(q(".lp-card"), { y: -30, ease: "none", scrollTrigger: heroScroll });
        gsap.to(q(".lp-hero-copy"), { y: 60, autoAlpha: 0.2, ease: "none", scrollTrigger: heroScroll });

        /* ---------- Statement: words light up as you scroll ---------- */
        const words = q(".lp-word");
        gsap.fromTo(
          words,
          { opacity: 0.12 },
          {
            opacity: (_i, el: HTMLElement) => (el.dataset.soft ? 0.42 : 1),
            ease: "none",
            stagger: 0.08,
            scrollTrigger: {
              trigger: q(".lp-statement")[0],
              start: "top 80%",
              end: "bottom 40%",
              scrub: 0.6,
            },
          }
        );
        gsap.fromTo(
          q(".lp-dark .lp-pill"),
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, scrollTrigger: { trigger: q(".lp-dark")[0], start: "top 75%" } }
        );

        /* ---------- Stats: dividers grow, numbers count up ---------- */
        gsap.fromTo(
          q(".lp-stat"),
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.15,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-stats")[0], start: "top 85%" },
          }
        );
        q("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.4,
            ease: "power2.out",
            snap: { v: 1 },
            onUpdate: () => {
              el.textContent = String(counter.v);
            },
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });

        /* ---------- Features ---------- */
        gsap.fromTo(
          q(".lp-glow"),
          { scale: 0.94, borderRadius: 40 },
          {
            scale: 1,
            borderRadius: 20,
            ease: "none",
            scrollTrigger: { trigger: q(".lp-glow")[0], start: "top bottom", end: "top 35%", scrub: true },
          }
        );
        gsap.fromTo(
          q(".lp-glow .lp-center > *"),
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-glow")[0], start: "top 70%" },
          }
        );
        gsap.fromTo(
          q(".lp-fcard"),
          { autoAlpha: 0, y: 70 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.14,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-feature-grid")[0], start: "top 80%" },
          }
        );
        // Mini status cards fan out
        const minis = q(".lp-mini-card");
        if (minis.length === 3) {
          gsap.fromTo(
            [minis[0], minis[2]],
            { x: (i: number) => (i === 0 ? 70 : -70), rotate: 0 },
            {
              x: 0,
              rotate: (i: number) => (i === 0 ? -6 : 6),
              duration: 1,
              ease: "back.out(1.4)",
              scrollTrigger: { trigger: q(".lp-feature-grid")[0], start: "top 65%" },
            }
          );
        }
        // Caption chips cycle Default → Scarcity → Restock
        const chips = q(".lp-fcard .lp-ui .lp-chip");
        if (chips.length) {
          const cycle = gsap.timeline({
            repeat: -1,
            paused: true,
            scrollTrigger: {
              trigger: q(".lp-feature-grid")[0],
              start: "top 80%",
              end: "bottom top",
              toggleActions: "play pause resume pause",
            },
          });
          chips.forEach((_c, i) => {
            cycle.call(() => chips.forEach((c, j) => c.classList.toggle("on", i === j)), [], i * 1.6);
          });
          cycle.to({}, { duration: 1.6 }, chips.length * 1.6 - 1.6);
        }
        // WhatsApp bubble pops in
        gsap.fromTo(
          q(".lp-bubble-static"),
          { autoAlpha: 0, scale: 0.8, y: 16, transformOrigin: "100% 100%" },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.7,
            ease: "back.out(1.8)",
            scrollTrigger: { trigger: q(".lp-feature-grid")[0], start: "top 60%" },
          }
        );
        gsap.fromTo(
          q(".lp-small"),
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-small-grid")[0], start: "top 90%" },
          }
        );

        /* ---------- Steps ---------- */
        gsap.fromTo(
          q(".lp-steps-head > *"),
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-steps-head")[0], start: "top 80%" },
          }
        );
        gsap.fromTo(
          q(".lp-step"),
          { autoAlpha: 0, y: 40, clipPath: "inset(0 0 100% 0)" },
          {
            autoAlpha: 1,
            y: 0,
            clipPath: "inset(0 0 0% 0)",
            stagger: 0.18,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-steps")[0], start: "top 82%" },
          }
        );

        /* ---------- Closing CTA ---------- */
        gsap.fromTo(
          q(".lp-final"),
          { clipPath: "inset(12% 8% 12% 8% round 32px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 20px)",
            ease: "none",
            scrollTrigger: { trigger: q(".lp-final")[0], start: "top bottom", end: "top 40%", scrub: true },
          }
        );
        gsap.fromTo(
          q(".lp-final-copy > *"),
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: q(".lp-final")[0], start: "top 65%" },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <main className="lp lp-motion" ref={root}>
      {/* Without JS nothing would reveal the hero, so un-hide it */}
      <noscript>
        <style>{`.lp-motion .lp-hero * { visibility: visible !important; }`}</style>
      </noscript>
      {children}
    </main>
  );
}
