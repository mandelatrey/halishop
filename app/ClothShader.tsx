"use client";

import { useEffect, useRef } from "react";

/**
 * Hero background: a fine halftone dot texture laid over a slowly folding
 * "cloth" surface. Moving the pointer drops ripples into the cloth, and the
 * dots swell, shrink and shift with the surface's light and slope.
 *
 * Deliberately quiet: low-contrast ink (the theme's text colour at a few
 * percent), gentle folds and short-lived ripples. Tuning lives in `TUNE`.
 *
 * - Plain WebGL 1, one full-screen triangle, no dependencies.
 * - Ripples are analytic (a ring buffer of recent pointer drops summed in the
 *   shader), so there is no simulation state to keep in sync.
 * - Pauses off-screen and in background tabs; with reduced motion it draws a
 *   single still frame and ignores the pointer. Without WebGL it draws nothing.
 * - Theme-aware: re-reads the ink colour when the light/dark theme changes.
 */

const TUNE = {
  cell: 6, // CSS px between dot centres
  maxRipples: 16,
  dropEvery: 28, // CSS px of pointer travel between ripple drops
  rippleLife: 3, // seconds
  dprCap: 2,
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

#define MAX_RIPPLES ${TUNE.maxRipples}

uniform vec2  uRes;      // canvas size, device px
uniform float uDpr;
uniform float uTime;
uniform vec3  uInk;
uniform float uAlpha;
uniform float uCell;     // CSS px
uniform vec3  uPointer;  // x, y (CSS px, top-left origin), presence 0..1
uniform vec4  uRipples[MAX_RIPPLES]; // x, y (CSS px), birth time, strength

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y) * 2.0 - 1.0;
}

// Large, slow folds: two octaves with a little domain warp so it drapes
// rather than boils.
float folds(vec2 p) {
  float t = uTime;
  vec2 q = p / 520.0;
  vec2 w = vec2(noise(q * 0.7 + vec2(0.0, t * 0.025)),
                noise(q * 0.7 + vec2(5.2, -t * 0.02)));
  q += w * 0.55 + vec2(t * 0.012, t * 0.006);
  return noise(q) * 22.0 + noise(q * 2.1 + 3.7) * 7.0;
}

// Height (x) and analytic gradient (yz) of the ripples + pointer press.
vec3 ripples(vec2 p) {
  vec3 acc = vec3(0.0);
  const float speed = 220.0;            // px / s
  const float k = 6.2831853 / 64.0;     // wavelength 64 px
  const float width = 46.0;             // wave packet half-width
  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > ${TUNE.rippleLife.toFixed(2)}) continue;
    vec2 dv = p - r.xy;
    float d = length(dv) + 1e-3;
    float x = d - age * speed;
    float g = exp(-(x * x) / (width * width));
    float env = r.w * 7.0 * exp(-age * 1.25) / (1.0 + d * 0.004);
    float s = sin(k * x), c = cos(k * x);
    acc.x += s * g * env;
    float dh = (k * c - s * 2.0 * x / (width * width)) * g * env;
    acc.yz += dh * dv / d;
  }
  // The pointer gently presses the cloth down where it rests.
  vec2 dp = p - uPointer.xy;
  float pr = 120.0;
  float bump = -14.0 * uPointer.z * exp(-dot(dp, dp) / (pr * pr));
  acc.x += bump;
  acc.yz += bump * (-2.0 * dp / (pr * pr));
  return acc;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr; // CSS px, top-left

  // Surface height + slope
  float e = 3.0;
  float f0 = folds(p);
  vec2 fg = vec2(folds(p + vec2(e, 0.0)) - f0, folds(p + vec2(0.0, e)) - f0) / e;
  vec3 rp = ripples(p);
  float h = f0 + rp.x;
  vec2 grad = fg + rp.yz;

  // Light the cloth from the upper left
  vec3 n = normalize(vec3(-grad * 2.6, 1.0));
  vec3 L = normalize(vec3(-0.45, -0.55, 0.7));
  float tone = 0.5 + (dot(n, L) - L.z) * 1.8 + h * 0.016;
  tone = clamp(tone, 0.0, 1.0);

  // Halftone: the grid is displaced by the slope, so ripples visibly shift
  // the dots the way a weave bends over a fold.
  vec2 q = p - grad * 5.0;
  vec2 cell = q / uCell;
  vec2 local = (fract(cell) - 0.5) * uCell;
  float radius = mix(0.45, uCell * 0.42, tone);
  float aa = 0.75 / uDpr;
  float dot_ = 1.0 - smoothstep(radius - aa, radius + aa, length(local));

  float a = dot_ * uAlpha * (0.45 + 0.75 * tone);
  gl_FragColor = vec4(uInk * a, a); // premultiplied
}
`;

/** Normalise any CSS colour string to linear 0..1 RGB via a 2D canvas. */
function parseColor(css: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [0.08, 0.09, 0.1];
  c.fillStyle = "#000";
  c.fillStyle = css;
  const v = c.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"
  if (v.startsWith("#")) {
    const n = parseInt(v.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [m[0] / 255, m[1] / 255, m[2] / 255];
}

export default function ClothShader({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("ClothShader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes"), uDpr = U("uDpr"), uTime = U("uTime"), uInk = U("uInk");
    const uAlpha = U("uAlpha"), uCell = U("uCell"), uPointer = U("uPointer"), uRipples = U("uRipples");

    /* ---------- Theme ---------- */
    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      const ink = parseColor(cs.getPropertyValue("--cloth-ink").trim() || "#14161a");
      const alpha = parseFloat(cs.getPropertyValue("--cloth-alpha")) || 0.12;
      gl.uniform3fv(uInk, ink);
      gl.uniform1f(uAlpha, alpha);
    };
    readTheme();
    gl.uniform1f(uCell, TUNE.cell);

    /* ---------- Size ---------- */
    let dpr = 1;
    let rect = canvas.getBoundingClientRect();
    const resize = () => {
      rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, TUNE.dprCap);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uDpr, dpr);
    };
    resize();

    /* ---------- Pointer → ripples ---------- */
    const ripples = new Float32Array(TUNE.maxRipples * 4);
    let head = 0;
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, presence: 0, target: 0 };
    let last: { x: number; y: number; t: number } | null = null;
    let travel = 0;

    const drop = (x: number, y: number, strength: number) => {
      ripples.set([x, y, now(), strength], head * 4);
      head = (head + 1) % TUNE.maxRipples;
    };

    const onMove = (e: PointerEvent) => {
      rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      pointer.target = inside ? 1 : 0;
      if (!inside) {
        last = null;
        return;
      }
      pointer.tx = x;
      pointer.ty = y;
      if (pointer.presence < 0.01) {
        pointer.x = x;
        pointer.y = y;
      }
      const t = performance.now();
      if (last) {
        const d = Math.hypot(x - last.x, y - last.y);
        const v = d / Math.max(1, t - last.t); // px per ms
        travel += d;
        if (travel >= TUNE.dropEvery) {
          travel = 0;
          drop(x, y, 0.5 + 0.5 * Math.min(1, v / 1.5));
        }
      }
      last = { x, y, t };
      wake();
    };
    const onLeave = () => {
      pointer.target = 0;
      last = null;
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      if (pointer.target) drop(pointer.tx, pointer.ty, 1.3);
    };

    /* ---------- Loop ---------- */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let raf = 0;

    const draw = (t: number) => {
      pointer.presence += (pointer.target - pointer.presence) * 0.06;
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      gl.uniform1f(uTime, t);
      gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.presence);
      gl.uniform4fv(uRipples, ripples);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = () => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) return;
      draw(now());
      raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (!raf && visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(frame);
    }
    const still = () => draw(12); // a fixed, pleasant moment in the folds

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced.matches) still();
    });
    ro.observe(canvas);

    const onVisibility = () => wake();
    const onReducedChange = () => (reduced.matches ? still() : wake());
    const onTheme = () => {
      readTheme();
      if (reduced.matches) still();
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", onTheme);
    reduced.addEventListener("change", onReducedChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    if (reduced.matches) still();
    else wake();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      scheme.removeEventListener("change", onTheme);
      reduced.removeEventListener("change", onReducedChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
