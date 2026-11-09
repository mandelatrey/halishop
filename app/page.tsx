import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import LandingMotion from "./LandingMotion";
import AppNav from "@/components/AppNav";
import ReadTicks from "@/components/ReadTicks";
import { getCurrentVendor } from "@/lib/auth/session";
import { demoShopSlug } from "@/lib/seed";
import { listShopsForOwner } from "@/lib/server-store";

export const metadata: Metadata = {
  title: "Haali — commerce for social sellers",
  description:
    "Turn your catalogue into WhatsApp status cards, share one shop link, and get orders straight into your WhatsApp, already written out.",
};

const DEMO_SLUG = demoShopSlug();

/** Product facts, not vanity metrics — every number here is true of the app. */
const STATS: { value: string; count?: number; suffix?: string; label: string }[] = [
  { value: "9:16", label: "Status-ready cards, sized for stories" },
  { value: "3", count: 3, label: "Caption styles for every card" },
  { value: "1 tap", count: 1, suffix: " tap", label: "From your status to a WhatsApp order" },
];

const STATEMENT_MAIN =
  "Haali gives social sellers one place to manage their catalogue, post drops that look like a brand,";
const STATEMENT_SOFT = "and turn every status view into an order they can actually fulfil.";

/** Split a sentence into word spans so GSAP can light them up one by one. */
function Words({ text, soft = false }: { text: string; soft?: boolean }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="lp-word" data-soft={soft ? "1" : undefined}>
          {w}{" "}
        </span>
      ))}
    </>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Set up your shop once",
    body: "Add your logo, colours and WhatsApp number in the brand kit, then load your catalogue: prices, sizes and how many you have in stock.",
  },
  {
    n: "02",
    title: "Post a drop to your status",
    body: "Pick today's products and Haali makes a status card for each one, with a ready-to-paste caption and a short link. Save them all in one tap.",
  },
  {
    n: "03",
    title: "Orders land in your WhatsApp",
    body: "Buyers tap the link, choose a size and hit Order. WhatsApp opens with the order already written out, so you just confirm and send the boda.",
  },
];

const SMALL_FEATURES = [
  {
    title: "One shop link",
    body: "A storefront that works on any phone, plus a page for just today's drop. Nothing for buyers to install.",
  },
  {
    title: "Short product links",
    body: "Every card gets its own short link, so buyers land on exactly what they saw in your status.",
  },
  {
    title: "One-tap repeat buyers",
    body: "Returning buyers' details are remembered on their phone, so ordering again takes a single tap.",
  },
];

function Pill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={dark ? "lp-pill lp-pill-dark" : "lp-pill"}>
      <span className="lp-pill-mark" aria-hidden />
      {children}
    </span>
  );
}

/** Faint circuit-board lines behind the hero, echoing "everything connected". */
function CircuitLines() {
  return (
    <svg className="lp-circuit" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g fill="none" strokeWidth="1">
        <path d="M0 120 H140 V260 H260" />
        <path d="M0 380 H90 V520 H220 V640" />
        <path d="M160 0 V70 H320 V180" />
        <path d="M1200 140 H1060 V60 H940 V0" />
        <path d="M1200 330 H1090 V470 H960 V640" />
        <path d="M1200 560 H1120" />
        <path d="M60 640 V560" />
      </g>
      <g strokeWidth="1">
        <rect x="248" y="248" width="40" height="24" rx="6" />
        <rect x="300" y="168" width="40" height="24" rx="6" />
        <rect x="200" y="508" width="40" height="24" rx="6" />
        <rect x="920" y="48" width="40" height="24" rx="6" />
        <rect x="940" y="458" width="40" height="24" rx="6" />
        <rect x="1100" y="548" width="40" height="24" rx="6" />
        <circle cx="140" cy="120" r="3" />
        <circle cx="1060" cy="140" r="3" />
        <circle cx="1090" cy="330" r="3" />
      </g>
    </svg>
  );
}

function StatusCardMock() {
  return (
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
  );
}

// Reads the session cookie to tailor the nav and CTAs.
export const dynamic = "force-dynamic";

export default async function Landing() {
  const vendor = await getCurrentVendor();
  const shops = vendor ? await listShopsForOwner(vendor.id) : [];
  return (
    <>
    <AppNav
      vendor={vendor ? { name: vendor.name, email: vendor.email, avatar: vendor.avatar } : null}
      shops={shops.map((s) => ({ slug: s.slug, name: s.brandKit.shopName }))}
    />
    <LandingMotion>
      {/* ---------------- Hero ---------------- */}
      <section className="lp-hero">
        <CircuitLines />
        <div className="lp-hero-copy">
          <Pill>Built for WhatsApp sellers</Pill>
          <h1 className="lp-h1">
            <span className="lp-line">
              <span className="lp-line-in">Sell from your status.</span>
            </span>
            <span className="lp-line">
              <span className="lp-line-in">
                <span className="lp-soft">Take orders on</span> WhatsApp.
              </span>
            </span>
          </h1>
          <p className="lp-lede">
            Branded status cards, one link to shop from, and every order sent straight into your WhatsApp,
            already written out.
          </p>
          <div className="lp-ctas lp-ctas-center">
            <Link href={vendor ? "/dashboard" : "/signup"} className="lp-btn">
              {vendor ? "Go to your dashboard" : "Set up your shop"}
            </Link>
            {DEMO_SLUG && (
              <Link href={`/shop/${DEMO_SLUG}`} className="lp-btn lp-btn-sec">
                See a live shop
              </Link>
            )}
          </div>
        </div>

        <div className="lp-stage" aria-hidden>
          <div className="lp-float lp-float-left">
            <div className="lp-float-bob">
            <div className="lp-float-k">Drop · 6 cards ready</div>
            <div className="lp-float-row">
              <span className="lp-chip on">Default</span>
              <span className="lp-chip">Scarcity</span>
              <span className="lp-chip">Restock</span>
            </div>
            <p className="lp-float-text">
              🔥 Hoodie grey is back. Sizes S–L, only 3 left. Tap to order: haali.app/o/C4
            </p>
            </div>
          </div>

          <StatusCardMock />

          <div className="lp-float lp-float-right">
            <div className="lp-float-bob lp-bubble">
              <div className="lp-bubble-k">New order · WhatsApp</div>
              <p>
                Hi! I&apos;d like to order <b>Hoodie grey</b> (size M), code <b>C4</b>. Deliver to Ntinda, please.
              </p>
              <div className="lp-bubble-time">18:24 <ReadTicks /></div>
            </div>
          </div>
        </div>

        <p className="lp-hero-note">
          <span className="lp-hero-note-k">/about</span>
          Haali helps social sellers turn a catalogue into status posts that sell, and turns every tap into a
          clear WhatsApp order.
        </p>
      </section>

      {/* ---------------- Statement + stats (dark) ---------------- */}
      <section className="lp-dark">
        <div className="lp-inner lp-center">
          <Pill dark>What Haali does</Pill>
          <p className="lp-statement" aria-label={`${STATEMENT_MAIN} ${STATEMENT_SOFT}`}>
            <Words text={STATEMENT_MAIN} />
            <Words text={STATEMENT_SOFT} soft />
          </p>
          <div className="lp-stats">
            {STATS.map((s) => (
              <div key={s.value} className="lp-stat">
                <div className="lp-stat-v">
                  {s.count !== undefined ? (
                    <>
                      <span data-count={s.count}>{s.count}</span>
                      {s.suffix}
                    </>
                  ) : (
                    s.value
                  )}
                </div>
                <div className="lp-stat-l">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features (glow panel) ---------------- */}
      <section className="lp-section">
        <div className="lp-glow">
          <div className="lp-center">
            <Pill dark>Features</Pill>
            <h2 className="lp-h2 lp-h2-light">
              Everything a <span className="lp-fade">status seller</span> needs
            </h2>
            <p className="lp-sub-light">Make the post, share the link, take the order.</p>
          </div>

          <div className="lp-feature-grid">
            <article className="lp-fcard">
              <div className="lp-fshot">
                <div className="lp-mini-cards">
                  <div className="lp-mini-card">
                    <div className="ph" />
                    <b>UGX 35,000</b>
                  </div>
                  <div className="lp-mini-card lp-mini-card-hi">
                    <div className="ph" />
                    <b>UGX 55,000</b>
                  </div>
                  <div className="lp-mini-card">
                    <div className="ph" />
                    <b>UGX 40,000</b>
                  </div>
                </div>
              </div>
              <h3>Status cards in your brand</h3>
              <p>Your logo, palette and frame on every card. Download as PNG for WhatsApp, Instagram or TikTok.</p>
            </article>

            <article className="lp-fcard">
              <div className="lp-fshot">
                <div className="lp-ui">
                  <div className="lp-ui-k">Caption</div>
                  <div className="lp-float-row">
                    <span className="lp-chip">Default</span>
                    <span className="lp-chip on">Scarcity</span>
                    <span className="lp-chip">Restock</span>
                  </div>
                  <p className="lp-ui-text">Only 2 left in size 32 👀 Jeans straight, UGX 40,000. haali.app/o/C1</p>
                  <div className="lp-ui-btn">Copy caption</div>
                </div>
              </div>
              <h3>Drops with captions</h3>
              <p>Batch-generate a whole drop. Switch each card between Default, Scarcity and Restock captions.</p>
            </article>

            <article className="lp-fcard">
              <div className="lp-fshot">
                <div className="lp-ui lp-ui-wa">
                  <div className="lp-bubble lp-bubble-static">
                    <div className="lp-bubble-k">New order</div>
                    <p>
                      <b>T-shirt black</b>, size L, code B3. Deliver to Kololo.
                    </p>
                    <div className="lp-bubble-time">09:12 <ReadTicks /></div>
                  </div>
                </div>
              </div>
              <h3>WhatsApp handoff</h3>
              <p>Orders arrive pre-written with product, size, code and delivery details. Nothing lost in the chat.</p>
            </article>
          </div>

          <div className="lp-small-grid">
            {SMALL_FEATURES.map((f) => (
              <div key={f.title} className="lp-small">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="lp-section lp-inner">
        <div className="lp-center lp-steps-head">
          <Pill>How it works</Pill>
          <h2 className="lp-h2">
            From catalogue to <span className="lp-soft">confirmed order</span>
          </h2>
        </div>
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

      {/* ---------------- Closing CTA ---------------- */}
      <section className="lp-section">
        <div className="lp-final">
          <CircuitLines />
          <div className="lp-final-copy">
            <h2 className="lp-h2 lp-h2-light">
              Your next drop could be <span className="lp-fade">ready in minutes.</span>
            </h2>
            <p className="lp-sub-light">Set up your brand kit, add a few products, and post your first drop today.</p>
            <div className="lp-ctas lp-ctas-center">
              <Link href={vendor ? "/dashboard" : "/signup"} className="lp-btn">
                {vendor ? "Go to your dashboard" : "Get started"}
              </Link>
              {!vendor && (
                <Link href="/login" className="lp-btn lp-btn-ghost">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer lp-inner">
        <span>Haali</span>
        <span>Made for social sellers in Kampala and beyond</span>
      </footer>
    </LandingMotion>
    </>
  );
}
