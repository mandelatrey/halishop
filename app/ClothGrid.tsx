"use client";

import { useEffect, useRef } from "react";

/**
 * Hero background: the page's grid lines, printed on a soft piece of cloth.
 *
 * The landing page has two thin rails inset from the left and right edges and
 * divider lines between sections (plain CSS: `.lp-rails`, section ::before).
 * In the hero this canvas takes over drawing them, adds a faint interior grid,
 * and bends every line with a cloth surface:
 * - a damped wave equation on a coarse grid (one cell per 8 CSS px) carries
 *   ripples from the pointer and from scrolling;
 * - a resting pointer gently dents the cloth, pulling nearby lines in;
 * - a slow, tiny drift keeps it alive when nobody touches it.
 * Lines are displaced by the slope of the surface (like a grid seen through a
 * rippling sheet). Displacement and line strength fade towards the bottom of
 * the hero, where the CSS rails take over, so the hand-off is seamless.
 *
 * Plain Canvas 2D: ~20 polylines a frame, well under a millisecond, the same in
 * every browser. Pauses off-screen / in background tabs; with reduced motion it
 * draws one still frame and ignores input. Colours come from CSS
 * (`--lp-grid`, `--cloth-fade`), re-read on theme changes.
 */

const TUNE = {
  cell: 8, // CSS px per simulation cell
  colTarget: 120, // CSS px, interior grid spacing (rounded to fit the rails)
  innerAlpha: 0.5, // interior lines, relative to the rails
  step: 6, // CSS px between points along a line
  waveSpeed: 0.3, // c² of the wave equation (keep < 0.5)
  damping: 0.976, // per step; lower = ripples settle sooner
  push: 0.4, // how hard a moving pointer pushes the cloth
  scrollPush: 0.06, // ripple per px scrolled
  bend: 20, // px of line displacement per unit of slope
  maxBend: 12, // px, soft cap on displacement
  pressDepth: 4, // dent under a resting pointer
  pressRadius: 14, // cells
  drift: 1.6, // px of idle drift
  navOffset: 80, // the canvas starts this far above the hero (behind the nav)
  dprCap: 2,
};

/* ---------------- noise ---------------- */

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** Any CSS colour → [r, g, b, a] (0..255, 0..1) via a 2D canvas. */
function parseColor(css: string): [number, number, number, number] {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [110, 98, 80, 0.22];
  c.fillStyle = "#000";
  c.fillStyle = css;
  const v = String(c.fillStyle);
  if (v.startsWith("#")) {
    const n = parseInt(v.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [m[0], m[1], m[2], m[3] ?? 1];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function ClothGrid({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    /* ---------- layout ---------- */
    let W = 1, H = 1, dpr = 1;
    let rect = canvas.getBoundingClientRect();
    let railL = 16, railR = 100; // CSS px, canvas coordinates (line centres)
    let cols: number[] = []; // interior vertical lines
    let rowsY: number[] = []; // interior horizontal lines (first one sits under the nav)
    let fadeAt = 0.62; // share of the height where the hand-off to the CSS rails begins

    /* ---------- simulation grid ---------- */
    let gw = 0, gh = 0;
    let cur = new Float32Array(0), prev = new Float32Array(0);

    /* ---------- colours ---------- */
    let rgb = "110,98,80", lineA = 0.22;
    let railGrad: CanvasGradient | string = "";
    let innerGrad: CanvasGradient | string = "";

    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      const [r, g, b, a] = parseColor(cs.getPropertyValue("--lp-grid").trim() || "rgb(110 98 80 / 0.22)");
      rgb = `${r},${g},${b}`;
      lineA = a;
      const f = parseFloat(cs.getPropertyValue("--cloth-fade"));
      fadeAt = Number.isFinite(f) ? f / 100 : 0.62;
      buildGradients();
    };
    // Vertical lines fade along their length: rails in step with the cream
    // ground (so the CSS rails behind take over), interior lines earlier.
    const buildGradients = () => {
      const rg = ctx.createLinearGradient(0, 0, 0, H * dpr);
      rg.addColorStop(0, `rgba(${rgb},${lineA})`);
      rg.addColorStop(fadeAt, `rgba(${rgb},${lineA})`);
      rg.addColorStop(1, `rgba(${rgb},0)`);
      railGrad = rg;
      const ig = ctx.createLinearGradient(0, 0, 0, H * dpr);
      const ia = lineA * TUNE.innerAlpha;
      ig.addColorStop(0, `rgba(${rgb},${ia})`);
      ig.addColorStop(fadeAt * 0.7, `rgba(${rgb},${ia})`);
      ig.addColorStop(Math.min(0.98, fadeAt + 0.2), `rgba(${rgb},0)`);
      ig.addColorStop(1, `rgba(${rgb},0)`);
      innerGrad = ig;
    };
    const innerAlphaAt = (y: number) => {
      const t = y / H;
      return lineA * TUNE.innerAlpha * (1 - smooth(fadeAt * 0.7, Math.min(0.98, fadeAt + 0.2), t));
    };

    const resize = () => {
      rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, TUNE.dprCap);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      // Rails: line up exactly with the CSS rails element
      const rails = canvas.closest(".lp")?.querySelector<HTMLElement>(".lp-rails");
      if (rails) {
        const r = rails.getBoundingClientRect();
        railL = r.left - rect.left + 0.5;
        railR = r.right - rect.left - 0.5;
      } else {
        railL = 16.5;
        railR = W - 16.5;
      }
      const span = railR - railL;
      const n = Math.max(2, Math.round(span / TUNE.colTarget));
      const colW = span / n;
      cols = [];
      for (let i = 1; i < n; i++) cols.push(railL + i * colW);
      rowsY = [];
      for (let y = TUNE.navOffset + 0.5; y < H; y += colW) rowsY.push(y);

      const nw = Math.ceil(W / TUNE.cell) + 2, nh = Math.ceil(H / TUNE.cell) + 2;
      if (nw !== gw || nh !== gh) {
        gw = nw;
        gh = nh;
        cur = new Float32Array(gw * gh);
        prev = new Float32Array(gw * gh);
      }
      buildGradients();
    };

    /* ---------- physics ---------- */
    const stepSim = () => {
      const c2 = TUNE.waveSpeed, damp = TUNE.damping;
      for (let y = 1; y < gh - 1; y++) {
        let i = y * gw + 1;
        for (let x = 1; x < gw - 1; x++, i++) {
          const lap = cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw] - 4 * cur[i];
          prev[i] = (2 * cur[i] - prev[i] + c2 * lap) * damp;
        }
      }
      const t = prev;
      prev = cur;
      cur = t;
    };

    /** Push the cloth along a segment (cell units). */
    const disturb = (x0: number, y0: number, x1: number, y1: number, amount: number) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 1; s <= n; s++) {
        const px = x0 + ((x1 - x0) * s) / n, py = y0 + ((y1 - y0) * s) / n;
        const cx = Math.round(px), cy = Math.round(py);
        // A broad, soft press, so the cloth folds rather than creases
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const gx = cx + dx, gy = cy + dy;
            if (gx < 1 || gy < 1 || gx >= gw - 1 || gy >= gh - 1) continue;
            cur[gy * gw + gx] -= (amount / n) * Math.exp(-((gx - px) ** 2 + (gy - py) ** 2) / 6);
          }
        }
      }
    };

    /** Wave height at a point (cell units), bilinear. */
    const heightAt = (x: number, y: number) => {
      x = Math.min(gw - 1.001, Math.max(0, x));
      y = Math.min(gh - 1.001, Math.max(0, y));
      const xi = x | 0, yi = y | 0, tx = x - xi, ty = y - yi, i = yi * gw + xi;
      const a = cur[i] + (cur[i + 1] - cur[i]) * tx;
      const b = cur[i + gw] + (cur[i + gw + 1] - cur[i + gw]) * tx;
      return a + (b - a) * ty;
    };

    const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, presence: 0, lastX: NaN, lastY: NaN };
    let time = 0;
    let still = false;

    /** Displacement (CSS px) of a point on the cloth at (x, y) CSS px. */
    const out = { x: 0, y: 0 };
    const displace = (x: number, y: number) => {
      const gx = x / TUNE.cell, gy = y / TUNE.cell;
      // Slope of the ripples, measured across a few cells so lines curve smoothly
      let sx = (heightAt(gx + 2, gy) - heightAt(gx - 2, gy)) * 0.25;
      let sy = (heightAt(gx, gy + 2) - heightAt(gx, gy - 2)) * 0.25;
      // Slope of the dent under the pointer (analytic gaussian)
      if (pointer.presence > 0.001 && !still) {
        const dx = gx - pointer.sx, dy = gy - pointer.sy, r2 = TUNE.pressRadius ** 2;
        const e = TUNE.pressDepth * pointer.presence * Math.exp(-(dx * dx + dy * dy) / r2) * (2 / r2);
        sx += e * dx;
        sy += e * dy;
      }
      let ox = -sx * TUNE.bend, oy = -sy * TUNE.bend;
      // Soft limit: big pushes saturate smoothly instead of kinking
      const m = Math.hypot(ox, oy);
      if (m > 0.001) {
        const k = (TUNE.maxBend * Math.tanh(m / TUNE.maxBend)) / m;
        ox *= k;
        oy *= k;
      }
      // Slow idle drift
      const d = TUNE.drift;
      ox += d * noise(x / 320 + time * 0.05, y / 320);
      oy += d * noise(x / 320 + 9.1, y / 320 - time * 0.04);
      // Settle towards the bottom, where the CSS rails continue
      const k = 1 - smooth(fadeAt, 1, y / H);
      out.x = ox * k;
      out.y = oy * k;
      return out;
    };

    /* ---------- drawing ---------- */
    const vline = (x: number) => {
      ctx.beginPath();
      for (let y = -TUNE.step; y <= H + TUNE.step; y += TUNE.step) {
        const o = displace(x, y);
        ctx.lineTo((x + o.x) * dpr, (y + o.y) * dpr);
      }
      ctx.stroke();
    };
    const hline = (y: number, x0: number, x1: number) => {
      ctx.beginPath();
      for (let x = x0; ; x += TUNE.step) {
        const xx = Math.min(x, x1);
        const o = displace(xx, y);
        ctx.lineTo((xx + o.x) * dpr, (y + o.y) * dpr);
        if (xx >= x1) break;
      }
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = dpr; // 1 CSS px
      ctx.lineJoin = "round";
      // Interior grid
      ctx.strokeStyle = innerGrad;
      for (const x of cols) vline(x);
      for (let i = 1; i < rowsY.length; i++) {
        const a = innerAlphaAt(rowsY[i]);
        if (a < 0.004) continue;
        ctx.strokeStyle = `rgba(${rgb},${a})`;
        hline(rowsY[i], railL, railR);
      }
      // The line under the nav runs full width, like the section dividers
      if (rowsY.length) {
        ctx.strokeStyle = `rgba(${rgb},${lineA})`;
        hline(rowsY[0], -TUNE.step, W + TUNE.step);
      }
      // Rails
      ctx.strokeStyle = railGrad;
      vline(railL);
      vline(railR);
    };

    /* ---------- input ---------- */
    let scrollEnergy = 0;
    let lastScrollY = window.scrollY;
    const tug = () => {
      if (Math.abs(scrollEnergy) < 0.002) {
        scrollEnergy = 0;
        return;
      }
      const amount = scrollEnergy * 0.25;
      scrollEnergy -= amount;
      // Along the top of the visible part of the cloth, unevenly
      const row = Math.max(2, Math.min(gh - 3, Math.round(Math.max(0, -rect.top) / TUNE.cell) + 2));
      for (let x = 1; x < gw - 1; x++) {
        const a = amount * (0.55 + 0.45 * noise(x * 0.06, time * 0.6));
        cur[(row - 1) * gw + x] -= a * 0.5;
        cur[row * gw + x] -= a;
        cur[(row + 1) * gw + x] -= a * 0.5;
      }
    };

    const toGrid = (clientX: number, clientY: number) => {
      const x = clientX - rect.left, y = clientY - rect.top;
      return { x: x / TUNE.cell, y: y / TUNE.cell, inside: x >= 0 && y >= 0 && x <= W && y <= H };
    };
    const onMove = (e: PointerEvent) => {
      const g = toGrid(e.clientX, e.clientY);
      pointer.inside = g.inside;
      if (!g.inside) {
        pointer.lastX = NaN;
        return;
      }
      if (pointer.presence < 0.01) {
        pointer.sx = g.x;
        pointer.sy = g.y;
      }
      if (!Number.isNaN(pointer.lastX)) {
        const dist = Math.hypot(g.x - pointer.lastX, g.y - pointer.lastY);
        disturb(pointer.lastX, pointer.lastY, g.x, g.y, Math.min(6, dist) * TUNE.push);
      }
      pointer.lastX = pointer.x = g.x;
      pointer.lastY = pointer.y = g.y;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const g = toGrid(e.clientX, e.clientY);
      if (g.inside) disturb(g.x, g.y, g.x, g.y, 4 * TUNE.push);
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.lastX = NaN;
    };

    /* ---------- loop ---------- */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const STEP = 1000 / 60;
    const start = performance.now();
    let visible = true;
    let raf = 0;
    let lastT = start;
    let acc = 0;

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) return;
      acc += Math.min(100, now - lastT);
      lastT = now;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        tug();
        stepSim();
        acc -= STEP;
        steps++;
      }
      if (steps === 4) acc = 0;
      if (steps > 0) {
        const follow = 1 - Math.pow(0.85, steps);
        const fade = 1 - Math.pow(0.94, steps);
        pointer.presence += ((pointer.inside ? 1 : 0) - pointer.presence) * fade;
        pointer.sx += (pointer.x - pointer.sx) * follow;
        pointer.sy += (pointer.y - pointer.sy) * follow;
        time = (now - start) / 1000;
        draw();
      }
      raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (!raf && visible && !document.hidden && !reduced.matches) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    const drawStill = () => {
      still = true;
      time = 0;
      cur.fill(0);
      prev.fill(0);
      draw();
      still = false;
    };

    const onScroll = () => {
      rect = canvas.getBoundingClientRect();
      const y = window.scrollY;
      const dy = y - lastScrollY;
      lastScrollY = y;
      if (reduced.matches || rect.bottom < 0) return;
      scrollEnergy = Math.max(-1.2, Math.min(1.2, scrollEnergy + dy * TUNE.scrollPush));
      wake();
    };

    resize();
    readTheme();
    draw();

    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced.matches) drawStill();
      else draw();
    });
    ro.observe(canvas);

    const onTheme = () => {
      readTheme();
      if (reduced.matches) drawStill();
      else draw();
    };
    const onReduced = () => (reduced.matches ? drawStill() : wake());
    const onVisibility = () => wake();
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", onTheme);
    reduced.addEventListener("change", onReduced);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    if (reduced.matches) drawStill();
    else wake();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      scheme.removeEventListener("change", onTheme);
      reduced.removeEventListener("change", onReduced);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
