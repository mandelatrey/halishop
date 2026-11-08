import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";

export const metadata: Metadata = {
  title: "Haali — commerce for social sellers",
  description:
    "Turn your catalogue into WhatsApp status cards, share one shop link, and get orders straight into your WhatsApp, already written out.",
};

const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

const STEPS = [
  {
    n: "01",
    title: "Set up your shop once",
    body: "Add your logo, colours and WhatsApp number in the brand kit, then load your catalogue: prices, sizes and how many you have in stock.",
  },
  {
    n: "02",
    title: "Post a drop to your status",
    body: "Pick today's products and Haali makes a 9:16 status card for each one, with a ready-to-paste caption and a short link. Save them all in one tap.",
  },
  {
    n: "03",
    title: "Orders land in your WhatsApp",
    body: "Buyers tap the link, choose a size and hit Order. WhatsApp opens with the order already written out, so you just confirm and send the boda.",
  },
];

const FEATURES = [
  {
    title: "Status cards in your brand",
    body: "Built-in and custom templates, your palette and frame, product photo, price and code. Download as PNG, ready for WhatsApp, Instagram or TikTok stories.",
  },
  {
    title: "Drops with captions",
    body: "Batch-generate a whole drop. Each card comes with Default, Scarcity (“only 2 left”) and Restock captions you can switch between and copy.",
  },
  {
    title: "One shop link",
    body: "A clean storefront that works on any phone, plus a page for just today's drop. No app for buyers to install, no checkout to set up.",
  },
  {
    title: "WhatsApp handoff",
    body: "Every order arrives as a pre-composed WhatsApp message with product, size, code and delivery details, so nothing gets lost in the chat.",
  },
  {
    title: "Short product links",
    body: "Each card gets its own short link that goes straight to that product, so buyers land on exactly what they saw in your status.",
  },
  {
    title: "One-tap repeat buyers",
    body: "Returning buyers' details are remembered on their phone, so ordering again takes a single tap.",
  },
];

export default function Landing() {
  return (
    <main className="lp">
      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <div className="lp-eyebrow">Commerce for social sellers</div>
          <h1 className="lp-h1">
            Sell from your status.
            <br />
            <span>Take orders on WhatsApp.</span>
          </h1>
          <p className="lp-lede">
            Haali turns your catalogue into branded status cards, gives buyers one link to shop from, and sends
            every order straight into your WhatsApp, already written out.
          </p>
          <div className="lp-ctas">
            <Link href="/brand-kit" className="lp-btn">
              Set up your shop <span aria-hidden>→</span>
            </Link>
            <Link href={`/shop/${SHOP_SLUG}`} className="lp-btn lp-btn-sec">
              See a live shop
            </Link>
          </div>
        </div>

        {/* Illustrative mock: a status card and the WhatsApp order it produces */}
        <div className="lp-mock" aria-hidden>
          <div className="lp-card">
            <div className="lp-card-top">
              <span className="lp-card-shop">Your shop</span>
              <span className="lp-card-tag">Today&apos;s drop</span>
            </div>
            <div className="lp-card-img ph">product photo</div>
            <div className="lp-card-name">Hoodie grey</div>
            <div className="lp-card-price">UGX 55,000</div>
            <div className="lp-card-meta">
              <span>S · M · L</span>
              <span className="lp-card-left">Only 3 left</span>
            </div>
            <div className="lp-card-link">haali.app/o/C4</div>
          </div>
          <div className="lp-bubble">
            <div className="lp-bubble-k">New order · WhatsApp</div>
            <p>
              Hi! I&apos;d like to order <b>Hoodie grey</b> (size M), code <b>C4</b>. Deliver to Ntinda, please.
            </p>
            <div className="lp-bubble-time">18:24 ✓✓</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section">
        <div className="lp-eyebrow">How it works</div>
        <h2 className="lp-h2">From catalogue to confirmed order in three steps</h2>
        <ol className="lp-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="lp-step">
              <div className="lp-step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="lp-section">
        <div className="lp-eyebrow">What you get</div>
        <h2 className="lp-h2">Everything a status seller needs, nothing they don&apos;t</h2>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="lp-final">
        <h2>Your next drop could be ready in minutes.</h2>
        <p>Set up your brand kit, add a few products, and post your first drop today.</p>
        <div className="lp-ctas">
          <Link href="/brand-kit" className="lp-btn lp-btn-inv">
            Get started <span aria-hidden>→</span>
          </Link>
          <Link href="/products" className="lp-btn lp-btn-ghost">
            Add products
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <span>Haali</span>
        <span>Made for social sellers in Kampala and beyond</span>
      </footer>
    </main>
  );
}
