"use client";

import { useEffect, useRef } from "react";

/**
 * Hero background: a halftone dot texture over a slowly folding "cloth".
 * Moving the pointer sends ripples through the cloth; the dots swell and
 * shrink with the light on the surface.
 *
 * Built to be cheap and to work everywhere:
 * - All the physics runs on the CPU on a coarse grid, one cell per dot
 *   (~6 CSS px). A damped wave equation gives the ripples; large, slow value
 *   noise (sampled on an even coarser grid and interpolated) gives the folds.
 *   That is a few tens of thousands of cells, around a millisecond a frame.
 * - The GPU only draws: one byte per dot is uploaded as a texture and each
 *   pixel does a single lookup to size its dot. No per-pixel noise.
 * - If WebGL is unavailable or fails, the same grid is drawn with Canvas 2D.
 * - Fixed 60 Hz simulation step, so motion is the same at any frame rate.
 * - Pauses off-screen and in background tabs; with reduced motion it draws a
 *   single still frame and ignores the pointer.
 * - Theme-aware: re-reads `--cloth-ink` / `--cloth-alpha` on theme changes.
 */

const TUNE = {
  cell: 6, // CSS px between dot centres
  foldScale: 520, // CSS px, size of the big folds
  foldAmp: 1.0, // how strongly the folds shade the dots
  waveSpeed: 0.32, // c² of the wave equation (keep < 0.5 for stability)
  damping: 0.972, // per step; lower = ripples die sooner
  push: 0.42, // how hard a moving pointer pushes the cloth
  pressDepth: 0.9, // gentle dent under a resting pointer
  dprCap: 2,
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform sampler2D uTone;
uniform vec2 uGrid;    // cols, rows
uniform vec2 uRes;     // canvas size, device px
uniform float uCellPx; // cell size, device px
uniform vec3 uInk;
uniform float uAlpha;

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cell = floor(p / uCellPx);
  float tone = texture2D(uTone, (cell + 0.5) / uGrid).r;
  vec2 local = p - (cell + 0.5) * uCellPx;
  float radius = mix(0.08, 0.44, tone) * uCellPx;
  float cov = 1.0 - smoothstep(radius - 0.8, radius + 0.8, length(local));
  float a = cov * uAlpha * (0.5 + 0.7 * tone);
  gl_FragColor = vec4(uInk * a, a);
}
`;

/* ---------------- noise (CPU) ---------------- */

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
/** Large, slow folds with a little domain warp so they drape rather than boil. */
function folds(x: number, y: number, t: number) {
  const wx = noise(x * 0.7, y * 0.7 + t * 0.025);
  const wy = noise(x * 0.7 + 5.2, y * 0.7 - t * 0.02);
  const qx = x + wx * 0.55 + t * 0.012;
  const qy = y + wy * 0.55 + t * 0.006;
  return noise(qx, qy) + 0.32 * noise(qx * 2.1 + 3.7, qy * 2.1 + 3.7);
}

/** Any CSS colour → 0..1 RGB via a 2D canvas. */
function parseColor(css: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [0.08, 0.09, 0.1];
  c.fillStyle = "#000";
  c.fillStyle = css;
  const v = String(c.fillStyle);
  if (v.startsWith("#")) {
    const n = parseInt(v.slice(1, 7), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [m[0] / 255, m[1] / 255, m[2] / 255];
}

/* ---------------- renderers ---------------- */

type Renderer = {
  resize(w: number, h: number, cols: number, rows: number, cellPx: number): void;
  setInk(rgb: [number, number, number], alpha: number): void;
  draw(tone: Uint8Array): void;
  dispose(): void;
};

function webglRenderer(canvas: HTMLCanvasElement): Renderer | null {
  let ctx: WebGLRenderingContext | null = null;
  try {
    ctx = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  const g = ctx;
  const compile = (type: number, src: string) => {
    const s = g.createShader(type);
    if (!s) return null;
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
      console.warn("ClothShader: shader failed, using 2D fallback.", g.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(g.VERTEX_SHADER, VERT);
  const fs = compile(g.FRAGMENT_SHADER, FRAG);
  const prog = g.createProgram();
  if (!vs || !fs || !prog) return null;
  g.attachShader(prog, vs);
  g.attachShader(prog, fs);
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    console.warn("ClothShader: link failed, using 2D fallback.", g.getProgramInfoLog(prog));
    return null;
  }
  g.useProgram(prog);

  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const aPos = g.getAttribLocation(prog, "aPos");
  g.enableVertexAttribArray(aPos);
  g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);

  const tex = g.createTexture();
  g.activeTexture(g.TEXTURE0);
  g.bindTexture(g.TEXTURE_2D, tex);
  g.pixelStorei(g.UNPACK_ALIGNMENT, 1); // rows of any width
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);

  const U = (n: string) => g.getUniformLocation(prog, n);
  const uTone = U("uTone"), uGrid = U("uGrid"), uRes = U("uRes"), uCellPx = U("uCellPx");
  const uInk = U("uInk"), uAlpha = U("uAlpha");
  g.uniform1i(uTone, 0);
  g.clearColor(0, 0, 0, 0);

  let cols = 1, rows = 1, allocated = false;
  return {
    resize(w, h, c, r, cellPx) {
      cols = c;
      rows = r;
      allocated = false;
      g.viewport(0, 0, w, h);
      g.uniform2f(uRes, w, h);
      g.uniform2f(uGrid, c, r);
      g.uniform1f(uCellPx, cellPx);
    },
    setInk(rgb, alpha) {
      g.uniform3f(uInk, rgb[0], rgb[1], rgb[2]);
      g.uniform1f(uAlpha, alpha);
    },
    draw(tone) {
      if (!allocated) {
        g.texImage2D(g.TEXTURE_2D, 0, g.LUMINANCE, cols, rows, 0, g.LUMINANCE, g.UNSIGNED_BYTE, tone);
        allocated = true;
      } else {
        g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, cols, rows, g.LUMINANCE, g.UNSIGNED_BYTE, tone);
      }
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    },
    dispose() {
      g.deleteTexture(tex);
      g.deleteBuffer(buf);
      g.deleteProgram(prog);
      g.deleteShader(vs);
      g.deleteShader(fs);
    },
  };
}

/** Fallback: tiny squares at this size read as dots; batched into a few fills by tone. */
function canvas2dRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const LEVELS = 8;
  let cols = 1, rows = 1, cellPx = 1, w = 1, h = 1;
  let ink = "20,22,26", alpha = 0.15;
  return {
    resize(cw, ch, c, r, cp) {
      w = cw; h = ch; cols = c; rows = r; cellPx = cp;
    },
    setInk(rgb, a) {
      ink = rgb.map((v) => Math.round(v * 255)).join(",");
      alpha = a;
    },
    draw(tone) {
      ctx.clearRect(0, 0, w, h);
      for (let l = 0; l < LEVELS; l++) {
        const t = (l + 0.5) / LEVELS;
        const size = Math.max(1, (0.16 + 0.72 * t) * cellPx);
        const off = (cellPx - size) / 2;
        ctx.fillStyle = `rgba(${ink},${alpha * (0.5 + 0.7 * t)})`;
        ctx.beginPath();
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (Math.min(LEVELS - 1, (tone[y * cols + x] * LEVELS) >> 8) !== l) continue;
            ctx.rect(x * cellPx + off, y * cellPx + off, size, size);
          }
        }
        ctx.fill();
      }
    },
    dispose() {},
  };
}

/* ---------------- component ---------------- */

export default function ClothShader({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = webglRenderer(canvas) ?? canvas2dRenderer(canvas);
    if (!renderer) return;

    /* ---------- grid state ---------- */
    let cols = 0, rows = 0;
    let cur = new Float32Array(0), prev = new Float32Array(0);
    let height = new Float32Array(0);
    let tone = new Uint8Array(0);
    // Folds are sampled every FOLD_STEP cells and interpolated.
    const FOLD_STEP = 4;
    let fcols = 0, frows = 0;
    let fold = new Float32Array(0);

    let rect = canvas.getBoundingClientRect();
    const resize = () => {
      rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, TUNE.dprCap);
      const cellPx = Math.max(2, Math.round(TUNE.cell * dpr));
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      const nc = Math.ceil(w / cellPx) + 1;
      const nr = Math.ceil(h / cellPx) + 1;
      if (nc !== cols || nr !== rows) {
        cols = nc;
        rows = nr;
        cur = new Float32Array(cols * rows);
        prev = new Float32Array(cols * rows);
        height = new Float32Array(cols * rows);
        tone = new Uint8Array(cols * rows);
        fcols = Math.ceil(cols / FOLD_STEP) + 3;
        frows = Math.ceil(rows / FOLD_STEP) + 3;
        fold = new Float32Array(fcols * frows);
      }
      renderer.resize(w, h, cols, rows, cellPx);
    };

    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      const ink = parseColor(cs.getPropertyValue("--cloth-ink").trim() || "#14161a");
      const a = parseFloat(cs.getPropertyValue("--cloth-alpha"));
      renderer.setInk(ink, Number.isFinite(a) ? a : 0.15);
    };

    /* ---------- simulation ---------- */
    const step = () => {
      const c2 = TUNE.waveSpeed, damp = TUNE.damping;
      for (let y = 1; y < rows - 1; y++) {
        let i = y * cols + 1;
        for (let x = 1; x < cols - 1; x++, i++) {
          const lap = cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols] - 4 * cur[i];
          prev[i] = (2 * cur[i] - prev[i] + c2 * lap) * damp;
        }
      }
      const t = prev;
      prev = cur;
      cur = t;
    };

    /** Push the cloth along a pointer segment (grid units). */
    const disturb = (x0: number, y0: number, x1: number, y1: number, amount: number) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 1; s <= n; s++) {
        const px = x0 + ((x1 - x0) * s) / n, py = y0 + ((y1 - y0) * s) / n;
        const cx = Math.round(px), cy = Math.round(py);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const gx = cx + dx, gy = cy + dy;
            if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
            const d2 = (gx - px) ** 2 + (gy - py) ** 2;
            cur[gy * cols + gx] -= (amount / n) * Math.exp(-d2 / 2.2);
          }
        }
      }
    };

    const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, presence: 0, lastX: NaN, lastY: NaN };

    const composeTone = (t: number, withPointer: boolean) => {
      // Fold field on the coarse grid
      const cell = TUNE.cell, fs = TUNE.foldScale;
      for (let fy = 0; fy < frows; fy++) {
        for (let fx = 0; fx < fcols; fx++) {
          fold[fy * fcols + fx] =
            folds(((fx - 1) * FOLD_STEP * cell) / fs, ((fy - 1) * FOLD_STEP * cell) / fs, t) * TUNE.foldAmp;
        }
      }
      // Height = interpolated folds + ripples + pointer dent
      const inv = 1 / FOLD_STEP;
      const pr2 = 18 * 18; // dent radius², cells
      const pd = withPointer ? TUNE.pressDepth * pointer.presence : 0;
      for (let y = 0; y < rows; y++) {
        const fyf = y * inv + 1, fy = Math.floor(fyf), ty = fyf - fy;
        const r0 = fy * fcols, r1 = r0 + fcols;
        const dy2 = (y - pointer.sy) ** 2;
        for (let x = 0; x < cols; x++) {
          const fxf = x * inv + 1, fx = Math.floor(fxf), tx = fxf - fx;
          const top = fold[r0 + fx] + (fold[r0 + fx + 1] - fold[r0 + fx]) * tx;
          const bot = fold[r1 + fx] + (fold[r1 + fx + 1] - fold[r1 + fx]) * tx;
          let h = top + (bot - top) * ty + cur[y * cols + x];
          if (pd > 0.001) h -= pd * Math.exp(-((x - pointer.sx) ** 2 + dy2) / pr2);
          height[y * cols + x] = h;
        }
      }
      // Light from the upper left: slopes facing it brighten the dots
      for (let y = 0; y < rows; y++) {
        const yu = (y > 0 ? y - 1 : y) * cols, yd = (y < rows - 1 ? y + 1 : y) * cols, row = y * cols;
        for (let x = 0; x < cols; x++) {
          const xl = x > 0 ? x - 1 : x, xr = x < cols - 1 ? x + 1 : x;
          const gx = height[row + xr] - height[row + xl];
          const gy = height[yd + x] - height[yu + x];
          let v = 0.5 + (gx * 0.6 + gy * 0.75) * 1.6 + height[row + x] * 0.18;
          v = v < 0 ? 0 : v > 1 ? 1 : v;
          tone[row + x] = (v * 255) | 0;
        }
      }
    };

    /* ---------- pointer ---------- */
    const toGrid = (clientX: number, clientY: number) => {
      const x = clientX - rect.left, y = clientY - rect.top;
      return { x: x / TUNE.cell, y: y / TUNE.cell, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
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
    const onScroll = () => {
      rect = canvas.getBoundingClientRect();
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
        step();
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
        composeTone((now - start) / 1000, true);
        renderer.draw(tone);
      }
      raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (!raf && visible && !document.hidden && !reduced.matches) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    const still = () => {
      composeTone(12, false);
      renderer.draw(tone);
    };

    resize();
    readTheme();
    // Draw something immediately, before the first animation frame.
    composeTone(0, false);
    renderer.draw(tone);

    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced.matches) still();
      else {
        composeTone((performance.now() - start) / 1000, true);
        renderer.draw(tone);
      }
    });
    ro.observe(canvas);

    const onTheme = () => {
      readTheme();
      if (reduced.matches) still();
    };
    const onReduced = () => (reduced.matches ? still() : wake());
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

    if (reduced.matches) still();
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
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
