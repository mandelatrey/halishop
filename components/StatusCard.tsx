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
    fontFamily: '"DM Sans", system-ui, sans-serif',
  };

  const logo = <LogoBadge src={brand.logo} width={width} />;

  if (template.kind === "builtin") {
    return (
      <div ref={ref} style={rootStyle} data-card="builtin" data-tpl={template.id}>
        {renderBuiltin(template, product, brand, config, width)}
        {logo}
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

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function BarTemplate({
  product,
  brand,
  config,
  width,
}: {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  width: number;
}) {
  const s = (v: number) => scale(v, width);
  const p = paletteFor(brand);
  const showPrice = config.showPrice && brand.alwaysShow.price;
  const showCode = brand.alwaysShow.code;
  const showLink = brand.alwaysShow.shopLink;
  return (
    <>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <ProductImage product={product} width={width} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, transparent 68%, ${hexToRgba(p.primary, 0.18)} 100%)`,
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        style={{
          background: p.primary,
          color: p.primaryFg,
          display: "flex",
          flexDirection: "column",
          gap: s(6),
          padding: `${s(11)}px ${s(12)}px ${s(12)}px`,
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: 600,
            fontSize: s(7.5),
            lineHeight: 1,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: p.primaryMuted,
          }}
        >
          {brand.shopName}
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: s(15),
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {titleCase(product.title)}
        </span>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: s(8),
            paddingTop: s(6),
            borderTop: `1px solid ${hexToRgba(p.primaryFg, 0.16)}`,
          }}
        >
          {showPrice ? (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: s(16),
                lineHeight: 1,
                color: p.accent,
                letterSpacing: "-0.01em",
              }}
            >
              {formatPrice(product)}
            </span>
          ) : (
            <span />
          )}
          {showCode && (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 600,
                fontSize: s(10),
                lineHeight: 1,
                letterSpacing: "0.08em",
                color: p.primaryMuted,
              }}
            >
              {codeText(product, config.codeFormat, brand)}
            </span>
          )}
        </div>
        {showLink && (
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontWeight: 500,
              fontSize: s(6.5),
              lineHeight: 1,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: p.primaryMuted,
            }}
          >
            {brand.shopUrl}
          </span>
        )}
      </div>
    </>
  );
}

function BlockTemplate({
  product,
  brand,
  config,
  width,
}: {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  width: number;
}) {
  const s = (v: number) => scale(v, width);
  const p = paletteFor(brand);
  const showPrice = config.showPrice && brand.alwaysShow.price;
  const showCode = brand.alwaysShow.code;
  return (
    <>
      <div style={{ height: "50%", position: "relative", overflow: "hidden" }}>
        <ProductImage product={product} width={width} />
      </div>
      <div
        style={{
          flex: 1,
          background: p.primary,
          color: p.primaryFg,
          display: "flex",
          flexDirection: "column",
          padding: `${s(16)}px ${s(14)}px ${s(14)}px`,
          gap: s(8),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: s(6) }}>
          <span
            style={{
              width: s(14),
              height: 1,
              background: p.accent,
              display: "block",
            }}
          />
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontWeight: 600,
              fontSize: s(7.5),
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: p.primaryMuted,
            }}
          >
            {brand.shopName}
          </span>
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: s(19),
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
          }}
        >
          {titleCase(product.title)}
        </span>
        {showPrice && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: s(26),
              lineHeight: 1,
              color: p.accent,
              letterSpacing: "-0.02em",
            }}
          >
            {formatPrice(product)}
          </span>
        )}
        <div
          style={{
            marginTop: "auto",
            paddingTop: s(8),
            borderTop: `1px solid ${hexToRgba(p.primaryFg, 0.14)}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: s(8),
          }}
        >
          {brand.alwaysShow.shopLink ? (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 500,
                fontSize: s(6.5),
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: p.primaryMuted,
              }}
            >
              {brand.shopUrl}
            </span>
          ) : (
            <span />
          )}
          {showCode && (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 600,
                fontSize: s(10),
                letterSpacing: "0.08em",
                color: p.primaryMuted,
              }}
            >
              {codeText(product, config.codeFormat, brand)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function FrameTemplate({
  product,
  brand,
  config,
  width,
}: {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  width: number;
}) {
  const s = (v: number) => scale(v, width);
  const p = paletteFor(brand);
  const showPrice = config.showPrice && brand.alwaysShow.price;
  const showCode = brand.alwaysShow.code;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: `${s(6)}px solid ${p.primary}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ProductImage product={product} width={width} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "42%",
          background: `linear-gradient(to top, ${hexToRgba("#0a0a0a", 0.78)} 0%, ${hexToRgba("#0a0a0a", 0.55)} 40%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${s(12)}px ${s(12)}px ${s(11)}px`,
          color: "#f3f2f1",
          display: "flex",
          flexDirection: "column",
          gap: s(5),
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontWeight: 600,
            fontSize: s(7.5),
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: hexToRgba("#f3f2f1", 0.72),
          }}
        >
          {brand.shopName}
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: s(15),
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {titleCase(product.title)}
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: s(8) }}>
          {showPrice ? (
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: s(16),
                color: p.accent,
                letterSpacing: "-0.01em",
              }}
            >
              {formatPrice(product)}
            </span>
          ) : (
            <span />
          )}
          {showCode && (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 600,
                fontSize: s(10),
                letterSpacing: "0.08em",
                color: hexToRgba("#f3f2f1", 0.85),
              }}
            >
              {codeText(product, config.codeFormat, brand)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SplitTemplate({
  product,
  brand,
  config,
  width,
}: {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  width: number;
}) {
  const s = (v: number) => scale(v, width);
  const p = paletteFor(brand);
  const showPrice = config.showPrice && brand.alwaysShow.price;
  const showCode = brand.alwaysShow.code;
  return (
    <>
      <div style={{ height: "58%", position: "relative", overflow: "hidden" }}>
        <ProductImage product={product} width={width} />
      </div>
      <div
        style={{
          flex: 1,
          background: p.primary,
          color: p.primaryFg,
          padding: `${s(14)}px ${s(14)}px ${s(12)}px`,
          display: "flex",
          flexDirection: "column",
          gap: s(7),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: s(8) }}>
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontWeight: 600,
              fontSize: s(7.5),
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: p.primaryMuted,
            }}
          >
            {brand.shopName}
          </span>
          {showCode && (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 600,
                fontSize: s(9.5),
                letterSpacing: "0.08em",
                color: p.primaryMuted,
              }}
            >
              {codeText(product, config.codeFormat, brand)}
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: s(17),
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
          }}
        >
          {titleCase(product.title)}
        </span>
        {showPrice && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: s(21),
              color: p.accent,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {formatPrice(product)}
          </span>
        )}
        {brand.alwaysShow.shopLink && (
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontWeight: 500,
              fontSize: s(6.5),
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: p.primaryMuted,
              marginTop: "auto",
              paddingTop: s(8),
              borderTop: `1px solid ${hexToRgba(p.primaryFg, 0.14)}`,
            }}
          >
            {brand.shopUrl}
          </span>
        )}
      </div>
    </>
  );
}

function CleanTemplate({
  product,
  brand,
  config,
  width,
}: {
  product: Product;
  brand: BrandKit;
  config: CardConfig;
  width: number;
}) {
  const s = (v: number) => scale(v, width);
  const p = paletteFor(brand);
  const showPrice = config.showPrice && brand.alwaysShow.price;
  const showCode = brand.alwaysShow.code;
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ProductImage product={product} width={width} mode="color" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, ${hexToRgba("#0a0a0a", 0.42)} 0%, transparent 22%, transparent 60%, ${hexToRgba("#0a0a0a", 0.58)} 100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: s(12),
          left: s(12),
          fontFamily: "ui-monospace, Menlo, monospace",
          fontWeight: 600,
          fontSize: s(7.5),
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#f3f2f1",
        }}
      >
        {brand.shopName}
      </div>
      <div
        style={{
          position: "absolute",
          left: s(12),
          right: s(12),
          bottom: s(12),
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: s(8),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: s(6), maxWidth: "62%" }}>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: s(15),
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              color: "#f3f2f1",
            }}
          >
            {titleCase(product.title)}
          </span>
          {brand.alwaysShow.shopLink && (
            <span
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 500,
                fontSize: s(6.5),
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: hexToRgba("#f3f2f1", 0.78),
              }}
            >
              {brand.shopUrl}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: s(5),
          }}
        >
          {showPrice && (
            <span
              style={{
                background: p.accent,
                color: p.accentFg,
                padding: `${s(5)}px ${s(9)}px`,
                borderRadius: s(999),
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: s(13),
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {formatPrice(product)}
            </span>
          )}
          {showCode && (
            <span
              style={{
                background: hexToRgba("#0a0a0a", 0.55),
                color: "#f3f2f1",
                padding: `${s(4)}px ${s(8)}px`,
                borderRadius: s(999),
                fontFamily: "ui-monospace, Menlo, monospace",
                fontWeight: 600,
                fontSize: s(9),
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              {codeText(product, config.codeFormat, brand)}
            </span>
          )}
        </div>
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
