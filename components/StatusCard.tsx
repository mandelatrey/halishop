"use client";

import { forwardRef, type CSSProperties } from "react";
import type {
  BrandKit,
  BuiltinTemplate,
  CardConfig,
  CustomTemplate,
  Product,
  ResolvedTemplate,
  TextZone,
} from "@/lib/types";
import { derivePalette, type DerivedPalette } from "@/lib/palette";
import { getOptions } from "@/lib/variants";
import { prettyPhone } from "@/lib/wa";
import ProductPhoto from "./ProductPhoto";

const REF_WIDTH = 200;
const REF_HEIGHT = 356;

function paletteFor(brand: BrandKit): DerivedPalette {
  return derivePalette(brand.palette.primary, brand.palette.harmony, brand.palette.accent);
}

export type StatusCardProps = {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  template: ResolvedTemplate;
  width?: number;
  /** When true, the card renders text/lines that are meant only for the export PNG
   *  (higher-DPI sharpness tweaks). Preview keeps the wireframe metrics. */
  exporting?: boolean;
};

function formatPrice(p: Product) {
  return `${p.currency} ${p.price.toLocaleString()}`;
}

function codeText(product: Product, format: CardConfig["codeFormat"], brand: BrandKit) {
  if (format === "short") return product.code;
  const initials = brand.shopName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SH";
  return `${initials}-4F2-${product.code}`;
}

function scale(v: number, width: number) {
  return (v / REF_WIDTH) * width;
}

/* -------------------------------------------------------------------------
 * The 9:16 card. Two rendering paths: BUILTIN and CUSTOM.
 * ------------------------------------------------------------------------- */

const StatusCard = forwardRef<HTMLDivElement, StatusCardProps>(function StatusCard(
  { product, brand, config, template, width = REF_WIDTH },
  ref
) {
  const height = (width / 9) * 16;
  const s = (v: number) => scale(v, width);

  const rootStyle: CSSProperties = {
    width,
    height,
    position: "relative",
    background: "#f3f2f1",
    border: `1px solid rgba(32, 30, 29, 0.14)`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
  };

  const logo = <LogoBadge src={brand.logo} width={width} />;

  if (template.kind === "builtin") {
    return (
      <div ref={ref} style={rootStyle} data-card="builtin" data-tpl={template.id}>
        {renderBuiltin(template, product, brand, config, width)}
      </div>
    );
  }

  return (
    <div ref={ref} style={rootStyle} data-card="custom" data-tpl={template.id}>
      {renderCustom(template, product, brand, config, width)}
      {logo}
    </div>
  );
});

function LogoBadge({ src, width }: { src?: string; width: number }) {
  if (!src) return null;
  const s = (v: number) => scale(v, width);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        top: s(10),
        right: s(10),
        height: s(24),
        width: "auto",
        maxWidth: s(52),
        objectFit: "contain",
        pointerEvents: "none",
        filter: "drop-shadow(0 0 3px rgba(0,0,0,0.35))",
        zIndex: 2,
      }}
    />
  );
}

export default StatusCard;

/* -------------------------------------------------------------------------
 * Built-in templates
 * ------------------------------------------------------------------------- */

function renderBuiltin(
  template: BuiltinTemplate,
  product: Product,
  brand: BrandKit,
  config: CardConfig,
  width: number
) {
  switch (template.id) {
    case "bar":
      return <BarTemplate product={product} brand={brand} config={config} width={width} />;
    case "block":
      return <BlockTemplate product={product} brand={brand} config={config} width={width} />;
    case "frame":
      return <FrameTemplate product={product} brand={brand} config={config} width={width} />;
    case "split":
      return <SplitTemplate product={product} brand={brand} config={config} width={width} />;
    case "clean":
      return <CleanTemplate product={product} brand={brand} config={config} width={width} />;
  }
}

function ProductImage({
  product,
  width,
  mode = "color",
  fit = "cover",
  style,
}: {
  product: Product;
  width: number;
  mode?: "grayscale" | "color" | "hidden";
  fit?: "cover" | "contain";
  style?: CSSProperties;
}) {
  if (mode === "hidden") return null;
  if (!product.image) {
    return (
      <div
        className="ph"
        style={{
          width: "100%",
          height: "100%",
          fontSize: scale(8.5, width),
          ...style,
        }}
      >
        product shot<br />9:16 crop{mode === "grayscale" ? ", grayscale" : ""}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        display: "block",
        filter: mode === "grayscale" ? "grayscale(1)" : undefined,
        ...style,
      }}
    />
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* -------------------------------------------------------------------------
 * Built-in template building blocks
 *
 * Every size is in REF_WIDTH (200px) units and scaled with `s()`, so the same
 * layout renders as a 200px thumbnail, a 360px preview or a 1080px export.
 * Everything is inline-styled: html-to-image snapshots it for the PNG, so no
 * class names, backdrop-filter or external CSS.
 * ------------------------------------------------------------------------- */

// next/font registers DM Sans under a generated family name exposed via this
// variable; the plain name is only a fallback.
const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const INK = "#201e1d";

type CardCtx = {
  s: (v: number) => number;
  p: DerivedPalette;
  brand: BrandKit;
  product: Product;
  title: string;
  currency: string;
  amount: string;
  code: string;
  variants: string[];
  phone: string;
  show: { price: boolean; code: boolean; link: boolean; variants: boolean; whatsapp: boolean };
};

/** Respect the seller's casing; only tidy titles typed in all-lower or ALL-CAPS. */
function displayTitle(t: string): string {
  const trimmed = t.trim();
  if (trimmed !== trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.replace(/\S+/g, (w) => (/\d/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()));
}

function cardCtx(product: Product, brand: BrandKit, config: CardConfig, width: number): CardCtx {
  const opts = getOptions(product);
  return {
    s: (v: number) => scale(v, width),
    p: paletteFor(brand),
    brand,
    product,
    title: displayTitle(product.title),
    currency: product.currency,
    amount: product.price.toLocaleString("en-US"),
    code: codeText(product, config.codeFormat, brand),
    // First option only — a card has room for one row of chips.
    variants: (opts[0]?.values ?? []).slice(0, 6),
    phone: brand.whatsapp ? prettyPhone(brand.whatsapp) : "",
    show: {
      price: config.showPrice && brand.alwaysShow.price,
      code: brand.alwaysShow.code,
      link: brand.alwaysShow.shopLink,
      variants: brand.alwaysShow.variants && opts.length > 0,
      whatsapp: brand.alwaysShow.whatsapp && !!brand.whatsapp,
    },
  };
}

type Tone = "dark" | "light";

/** Logo + shop name. `photo` sits on the product shot with its own backing. */
function ShopTag({ c, tone, photo = false }: { c: CardCtx; tone: Tone; photo?: boolean }) {
  const { s } = c;
  const fg = photo ? "#fff" : tone === "dark" ? c.p.primaryFg : INK;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s(5),
        maxWidth: "78%",
        padding: photo ? `${s(4)}px ${s(8)}px ${s(4)}px ${c.brand.logo ? s(4) : s(8)}px` : 0,
        borderRadius: s(999),
        background: photo ? "rgba(12, 12, 12, 0.46)" : "transparent",
        color: fg,
      }}
    >
      {c.brand.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.brand.logo}
          alt=""
          draggable={false}
          style={{
            height: s(14),
            width: "auto",
            maxWidth: s(36),
            objectFit: "contain",
            borderRadius: s(3),
            background: photo ? "#fff" : "transparent",
            padding: photo ? s(1.5) : 0,
            flex: "none",
          }}
        />
      )}
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: s(6.3),
          lineHeight: 1.1,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: photo ? 1 : 0.72,
        }}
      >
        {c.brand.shopName}
      </span>
    </div>
  );
}

function Title({ c, size, color, weight = 400, lines = 2 }: { c: CardCtx; size: number; color: string; weight?: number; lines?: number }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: weight,
        fontSize: c.s(size),
        lineHeight: 1.04,
        letterSpacing: "-0.035em",
        color,
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        paddingBottom: c.s(1), // keep descenders inside the clamp
      }}
    >
      {c.title}
    </div>
  );
}

/** "UGX" small + amount large; shrinks long amounts instead of wrapping. */
function Price({ c, size, color }: { c: CardCtx; size: number; color: string }) {
  const fit = Math.min(1, 8 / Math.max(c.amount.length, 1));
  const px = c.s(size) * fit;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: c.s(3), whiteSpace: "nowrap", color }}>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: Math.max(px * 0.36, c.s(6)), letterSpacing: "0.06em", opacity: 0.85 }}>
        {c.currency}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: px, lineHeight: 1, letterSpacing: "-0.035em" }}>
        {c.amount}
      </span>
    </div>
  );
}

function CodeChip({ c, tone }: { c: CardCtx; tone: Tone }) {
  const fg = tone === "dark" ? c.p.primaryFg : INK;
  return (
    <span
      style={{
        fontFamily: MONO,
        fontWeight: 600,
        fontSize: c.s(6.2),
        lineHeight: 1,
        letterSpacing: "0.08em",
        padding: `${c.s(3.5)}px ${c.s(5)}px`,
        borderRadius: c.s(4),
        border: `1px solid ${tone === "dark" ? hexToRgba(fgHex(c.p.primaryFg), 0.28) : "rgba(32, 30, 29, 0.18)"}`,
        color: fg,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      {c.code}
    </span>
  );
}

function Chips({ c, tone }: { c: CardCtx; tone: Tone }) {
  if (!c.show.variants || !c.variants.length) return null;
  const line = tone === "dark" ? hexToRgba(fgHex(c.p.primaryFg), 0.3) : "rgba(32, 30, 29, 0.16)";
  const fg = tone === "dark" ? c.p.primaryFg : INK;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: c.s(3) }}>
      {c.variants.map((v) => (
        <span
          key={v}
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: c.s(6),
            lineHeight: 1,
            padding: `${c.s(3)}px ${c.s(5.5)}px`,
            borderRadius: c.s(999),
            border: `1px solid ${line}`,
            color: fg,
            whiteSpace: "nowrap",
          }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

/** Shop link and/or WhatsApp number in small caps. Renders nothing if both are off. */
function Footer({ c, tone, align = "space-between" }: { c: CardCtx; tone: Tone; align?: CSSProperties["justifyContent"] }) {
  if (!c.show.link && !c.show.whatsapp) return null;
  const muted = tone === "dark" ? c.p.primaryMuted : "rgba(32, 30, 29, 0.56)";
  const style: CSSProperties = {
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: c.s(5.6),
    lineHeight: 1.2,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: muted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return (
    <div style={{ display: "flex", justifyContent: align, gap: c.s(8), minWidth: 0 }}>
      {c.show.link && <span style={style}>{c.brand.shopUrl} →</span>}
      {c.show.whatsapp && <span style={{ ...style, letterSpacing: "0.04em" }}>WA {c.phone}</span>}
    </div>
  );
}

function Hairline({ c, tone }: { c: CardCtx; tone: Tone }) {
  return (
    <div
      style={{
        height: 1,
        background: tone === "dark" ? hexToRgba(fgHex(c.p.primaryFg), 0.16) : "rgba(32, 30, 29, 0.1)",
        margin: `${c.s(1)}px 0`,
      }}
    />
  );
}

/** primaryFg is a hex; primaryMuted is rgba — this keeps hexToRgba honest. */
function fgHex(v: string) {
  return v.startsWith("#") ? v : "#f3f2f1";
}

type TplProps = { product: Product; brand: BrandKit; config: CardConfig; width: number };

/** Product photo inside a card: whole-product shots keep clear of the shop tag and text panels. */
function CardPhoto({ product, reserveTop, reserveBottom }: { product: Product; reserveTop: number; reserveBottom: number }) {
  return (
    <ProductPhoto
      src={product.image}
      meta={product.imageMeta}
      fit={product.imageFit}
      label="product photo"
      padding={0.06}
      reserveTop={reserveTop}
      reserveBottom={reserveBottom}
    />
  );
}

/* ---- 1. Bar — photo on top, a rounded brand-colour sheet below ---------- */
function BarTemplate({ product, brand, config, width }: TplProps) {
  const c = cardCtx(product, brand, config, width);
  const { s, p } = c;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: p.primary }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", background: "#fff" }}>
        <CardPhoto product={product} reserveTop={0.12} reserveBottom={0.08} />
        <div style={{ position: "absolute", top: s(10), left: s(10), right: s(10) }}>
          <ShopTag c={c} tone="dark" photo />
        </div>
      </div>
      <div
        style={{
          position: "relative",
          marginTop: -s(14),
          borderRadius: `${s(14)}px ${s(14)}px 0 0`,
          background: p.primary,
          color: p.primaryFg,
          padding: `${s(14)}px ${s(14)}px ${s(13)}px`,
          display: "flex",
          flexDirection: "column",
          gap: s(8),
        }}
      >
        <Title c={c} size={19} color={p.primaryFg} />
        <Chips c={c} tone="dark" />
        {(c.show.price || c.show.code) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: s(8) }}>
            {c.show.price ? <Price c={c} size={20} color={p.accent} /> : <span />}
            {c.show.code && <CodeChip c={c} tone="dark" />}
          </div>
        )}
        {(c.show.link || c.show.whatsapp) && <Hairline c={c} tone="dark" />}
        <Footer c={c} tone="dark" />
      </div>
    </div>
  );
}

/* ---- 2. Block — a big statement block with large light type ------------- */
function BlockTemplate({ product, brand, config, width }: TplProps) {
  const c = cardCtx(product, brand, config, width);
  const { s, p } = c;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: p.primary }}>
      <div style={{ height: "52%", flex: "none", position: "relative", overflow: "hidden", background: "#fff" }}>
        <CardPhoto product={product} reserveTop={0.14} reserveBottom={0.04} />
        <div style={{ position: "absolute", top: s(10), left: s(10), right: s(10) }}>
          <ShopTag c={c} tone="dark" photo />
        </div>
        {c.show.code && (
          <div style={{ position: "absolute", right: s(10), bottom: s(10), background: p.primary, borderRadius: s(4) }}>
            <CodeChip c={c} tone="dark" />
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: `${s(16)}px ${s(15)}px ${s(14)}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: p.primaryFg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: s(9) }}>
          <div style={{ width: s(18), height: s(2), borderRadius: s(2), background: p.accent }} />
          <Title c={c} size={26} color={p.primaryFg} weight={300} lines={3} />
          <Chips c={c} tone="dark" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(9) }}>
          {c.show.price && <Price c={c} size={24} color={p.accent} />}
          {(c.show.link || c.show.whatsapp) && <Hairline c={c} tone="dark" />}
          <Footer c={c} tone="dark" />
        </div>
      </div>
    </div>
  );
}

/* ---- 3. Frame — photo inset in a brand-colour frame, text on a scrim ----- */
function FrameTemplate({ product, brand, config, width }: TplProps) {
  const c = cardCtx(product, brand, config, width);
  const { s, p } = c;
  return (
    <div style={{ width: "100%", height: "100%", background: p.primary, padding: s(8), display: "flex" }}>
      <div style={{ position: "relative", flex: 1, borderRadius: s(12), overflow: "hidden", background: "#fff" }}>
        <CardPhoto product={product} reserveTop={0.1} reserveBottom={0.44} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.55) 26%, rgba(10,10,10,0) 52%), linear-gradient(to bottom, rgba(10,10,10,0.28) 0%, rgba(10,10,10,0) 18%)",
          }}
        />
        <div style={{ position: "absolute", top: s(9), left: s(9), right: s(9) }}>
          <ShopTag c={c} tone="dark" photo />
        </div>
        <div
          style={{
            position: "absolute",
            left: s(13),
            right: s(13),
            bottom: s(13),
            display: "flex",
            flexDirection: "column",
            gap: s(8),
            color: "#fff",
          }}
        >
          <Title c={c} size={20} color="#fff" />
          {c.show.variants && c.variants.length > 0 && (
            <div style={{ color: "#fff" }}>
              <Chips c={{ ...c, p: { ...p, primaryFg: "#ffffff" } }} tone="dark" />
            </div>
          )}
          {(c.show.price || c.show.code) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: s(8) }}>
              {c.show.price ? <Price c={c} size={20} color="#fff" /> : <span />}
              {c.show.code && <CodeChip c={{ ...c, p: { ...p, primaryFg: "#ffffff" } }} tone="dark" />}
            </div>
          )}
          {(c.show.link || c.show.whatsapp) && (
            <div style={{ display: "flex", alignItems: "center", gap: s(6) }}>
              <div style={{ width: s(10), height: s(2), borderRadius: s(2), background: p.accent, flex: "none" }} />
              <Footer c={{ ...c, p: { ...p, primaryMuted: "rgba(255,255,255,0.78)" } }} tone="dark" align="flex-start" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- 4. Split — light: rounded photo on top, white panel with a price pill ---- */
function SplitTemplate({ product, brand, config, width }: TplProps) {
  const c = cardCtx(product, brand, config, width);
  const { s, p } = c;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#fff" }}>
      <div
        style={{
          height: "58%",
          flex: "none",
          position: "relative",
          overflow: "hidden",
          background: "#f3f2f1",
          borderRadius: `0 0 ${s(16)}px ${s(16)}px`,
        }}
      >
        <CardPhoto product={product} reserveTop={0.14} reserveBottom={0.02} />
        <div style={{ position: "absolute", top: s(10), left: s(10), right: s(10) }}>
          <ShopTag c={c} tone="dark" photo />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: `${s(14)}px ${s(14)}px ${s(13)}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: s(8),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: s(8) }}>
          <Title c={c} size={20} color={INK} lines={2} />
          <Chips c={c} tone="light" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: s(9) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: s(8) }}>
            {c.show.price ? (
              <div style={{ background: p.accent, borderRadius: s(999), padding: `${s(5)}px ${s(10)}px` }}>
                <Price c={c} size={15} color={p.accentFg} />
              </div>
            ) : (
              <span />
            )}
            {c.show.code && <CodeChip c={c} tone="light" />}
          </div>
          <Footer c={c} tone="light" />
        </div>
      </div>
    </div>
  );
}

/* ---- 5. Clean — full-bleed photo with a floating product sticker -------- */
function CleanTemplate({ product, brand, config, width }: TplProps) {
  const c = cardCtx(product, brand, config, width);
  const { s, p } = c;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#fff" }}>
      <CardPhoto product={product} reserveTop={0.1} reserveBottom={0.44} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          // Faint top shade only: the shop tag has its own backing and the details
          // sit on the sticker, so heavy fades would just grey out white backgrounds.
          background: "linear-gradient(to bottom, rgba(10,10,10,0.14) 0%, rgba(10,10,10,0) 14%)",
        }}
      />
      <div style={{ position: "absolute", top: s(10), left: s(10), right: s(10) }}>
        <ShopTag c={c} tone="dark" photo />
      </div>
      <div
        style={{
          position: "absolute",
          left: s(10),
          right: s(10),
          bottom: s(10),
          background: "rgba(255, 255, 255, 0.97)",
          borderRadius: s(14),
          padding: `${s(11)}px ${s(12)}px ${s(10)}px`,
          display: "flex",
          flexDirection: "column",
          gap: s(7),
          boxShadow: `0 ${s(6)}px ${s(18)}px rgba(0, 0, 0, 0.2)`,
        }}
      >
        <Title c={c} size={16} color={INK} weight={500} />
        <Chips c={c} tone="light" />
        {(c.show.price || c.show.code) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: s(8) }}>
            {c.show.price ? <Price c={c} size={17} color={INK} /> : <span />}
            {c.show.code && (
              <span
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: s(6.4),
                  letterSpacing: "0.08em",
                  padding: `${s(4)}px ${s(7)}px`,
                  borderRadius: s(999),
                  background: p.accent,
                  color: p.accentFg,
                  whiteSpace: "nowrap",
                }}
              >
                {c.code}
              </span>
            )}
          </div>
        )}
        {(c.show.link || c.show.whatsapp) && <Hairline c={c} tone="light" />}
        <Footer c={c} tone="light" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Custom templates
 * ------------------------------------------------------------------------- */

function zoneStyles(zone: TextZone, width: number): CSSProperties {
  const s = (v: number) => scale(v, width);
  const pad = s(10);
  const box: CSSProperties = {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    gap: s(4),
    maxWidth: s(160),
  };
  const [v, h] = zone.split("-") as [
    "top" | "middle" | "bottom",
    "left" | "center" | "right"
  ];
  if (v === "top") box.top = pad;
  if (v === "bottom") box.bottom = pad;
  if (v === "middle") {
    box.top = "50%";
    box.transform = "translateY(-50%)";
  }
  if (h === "left") {
    box.left = pad;
    box.alignItems = "flex-start";
    box.textAlign = "left" as CSSProperties["textAlign"];
  }
  if (h === "right") {
    box.right = pad;
    box.alignItems = "flex-end";
    box.textAlign = "right" as CSSProperties["textAlign"];
  }
  if (h === "center") {
    box.left = "50%";
    if (box.transform) box.transform = `${box.transform} translateX(-50%)`;
    else box.transform = "translateX(-50%)";
    box.alignItems = "center";
    box.textAlign = "center" as CSSProperties["textAlign"];
  }
  return box;
}

function renderCustom(
  t: CustomTemplate & { kind: "custom" },
  product: Product,
  brand: BrandKit,
  config: CardConfig,
  width: number
) {
  const s = (v: number) => scale(v, width);
  const showPrice = t.fields.price && config.showPrice && brand.alwaysShow.price;
  const showCode = t.fields.code && brand.alwaysShow.code;
  const showShopName = t.fields.shopName;
  const showTitle = t.fields.title;
  const showShopUrl = t.fields.shopUrl && brand.alwaysShow.shopLink;

  const productScale = t.productScale ?? 1;
  const offsetX = t.productOffsetX ?? 0;
  const offsetY = t.productOffsetY ?? 0;
  const cardHeight = (width / 9) * 16;
  const productImg = (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: `${productScale * 100}%`,
          height: `${productScale * 100}%`,
          flexShrink: 0,
          transform:
            offsetX === 0 && offsetY === 0
              ? undefined
              : `translate(${offsetX * width}px, ${offsetY * cardHeight}px)`,
        }}
      >
        <ProductImage
          product={product}
          width={width}
          mode={t.productImageMode}
          fit="contain"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );

  const hasImage = !!t.image;

  const bgImg = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={t.image}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        display: "block",
        position: "absolute",
        inset: 0,
      }}
    />
  ) : (
    <div
      className="ph"
      style={{ position: "absolute", inset: 0, borderRadius: 0, fontSize: s(8.5) }}
    >
      no image
    </div>
  );

  const overlayImg = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={t.image}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        display: "block",
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    />
  ) : null;

  const textBlock = (
    <div style={zoneStyles(t.textZone, width)}>
      {showShopName && (
        <span
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: 700,
            fontSize: s(8),
            letterSpacing: "0.14em",
            color: t.textColor,
            textShadow: "0 0 3px rgba(0,0,0,0.35)",
          }}
        >
          {brand.shopName}
        </span>
      )}
      {showTitle && (
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: s(15),
            lineHeight: 1.05,
            color: t.textColor,
            textShadow: "0 0 4px rgba(0,0,0,0.3)",
          }}
        >
          {product.title.toUpperCase()}
        </span>
      )}
      {showPrice && (
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: s(20),
            lineHeight: 1,
            color: t.accentColor,
            textShadow: "0 0 4px rgba(0,0,0,0.3)",
          }}
        >
          {formatPrice(product)}
        </span>
      )}
      {showCode && (
        <span
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: 700,
            fontSize: s(12),
            color: t.textColor,
            textShadow: "0 0 3px rgba(0,0,0,0.35)",
          }}
        >
          {codeText(product, config.codeFormat, brand)}
        </span>
      )}
      {showShopUrl && (
        <span
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: 600,
            fontSize: s(8),
            letterSpacing: "0.08em",
            color: t.textColor,
            textShadow: "0 0 3px rgba(0,0,0,0.35)",
          }}
        >
          TAP THE LINK · {brand.shopUrl.toUpperCase()}
        </span>
      )}
    </div>
  );

  if (t.composition === "full") {
    return (
      <>
        {bgImg}
        {textBlock}
      </>
    );
  }

  if (t.composition === "background") {
    return (
      <>
        {bgImg}
        {t.productImageMode !== "hidden" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: s(20),
            }}
          >
            <div
              style={{
                width: "80%",
                aspectRatio: "9 / 16",
                overflow: "hidden",
                border: `${s(2)}px solid rgba(0,0,0,0.35)`,
              }}
            >
              {productImg}
            </div>
          </div>
        )}
        {textBlock}
      </>
    );
  }

  // overlay
  return (
    <>
      {t.productImageMode !== "hidden" && (
        <div style={{ position: "absolute", inset: 0 }}>{productImg}</div>
      )}
      {overlayImg}
      {textBlock}
    </>
  );
}
