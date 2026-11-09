# HALI — Status Commerce

A multi-shop app for social sellers. A **vendor** signs in (email + password or
Google), runs one or more shops (one per hustle), and tracks how they're doing
from a dashboard. For each shop they:

1. Set a brand kit, upload a logo, seed a catalogue, and fill in shop info.
2. Generate a 9:16 status card for one product, or batch-generate a whole drop
   (multiple products at once with captions + tracked links).
3. Share the buyer-facing shop URL — buyers tap "Order" and land in the
   vendor's WhatsApp with the order pre-composed.

**Buyers** never sign in. They arrive from a vendor's status and only ever see
that one shop, plus an About page telling them who they're buying from.

## What ships

### Vendor (sign-in required)

| Route | Screen | Purpose |
|---|---|---|
| `/` | — | Landing page; log in / sign up |
| `/login`, `/signup` | — | Email + password, or "Continue with Google" |
| `/dashboard` | — | All the vendor's shops + metrics rolled up across them |
| `/dashboard/new` | — | Create another shop (name, link, WhatsApp, city) |
| `/dashboard/account` | — | Name, photo, bio (shown to buyers), sign-in methods |
| `/dashboard/[slug]` | — | One shop's overview: share link, metrics, most-wanted products |
| `/dashboard/[slug]/products` | — | Catalogue + inline add/edit |
| `/dashboard/[slug]/products/[code]/card` | 1t | Single-card generator |
| `/dashboard/[slug]/drops/new` | 1u | Multi-select products, name/expiry/template, batch generate |
| `/dashboard/[slug]/drops/[dropId]` | 1v | Card carousel + captions (default/scarcity/restock) + save-all |
| `/dashboard/[slug]/templates[/id]` | — | Custom templates + editor |
| `/dashboard/[slug]/brand-kit` | 2e | Shop name, logo, palette, frame |
| `/dashboard/[slug]/settings` | — | Order WhatsApp number, delivery, **About the shop** (tagline, description, payment, hours, socials, show owner) |

Every `/dashboard/[slug]/…` page and every Server Action checks the signed-in
vendor owns the shop; anyone else gets a 404 / an error.

### Buyer (no sign-in)

| Route | Screen | Purpose |
|---|---|---|
| `/shop/[slug]` | 1a / 1c | Storefront + "You're buying from" seller card |
| `/shop/[slug]/about` | — | Shop details + who runs it (if the vendor opts in) |
| `/shop/[slug]/d/[dropId]` | 1d | Today's-drop page (only items in this drop) |
| `/shop/[slug]/[code]` | 1f / 1g / 1h | Product + inline buy form, message preview, one-tap repeat buyer |
| `/o/[slug]/[code]` | — | Tracked short link (logs a tap) → product page |
| `/o/[code]` | — | Legacy short link from old captions → demo shop's product |

Buyer pages carry no Haali nav — only the seller's shop.

### Metrics

Buyer pages send anonymous beacons to `/api/track` (`lib/track.ts`) — page
views, order taps, question taps — and `/o/…` logs link taps server-side.
Events live in `events` (no personal data, 400-day TTL). `lib/metrics.ts`
aggregates them per shop for the dashboards: page views, order taps,
product-view→order rate, daily charts, most-wanted products, plus catalogue
facts (stock value, low stock). Bots and the vendor's own visits are ignored.
"Order taps" means a buyer opened WhatsApp with an order; whether the chat
became a sale isn't visible to Haali.

### WhatsApp handoff

- `lib/wa.ts` — `normalizePhone`, `buildWaLink`, `composeOrderMessage`, `composeAskMessage`.
- Numbers with a leading `0` are treated as Uganda (`+256`). Otherwise assumed E.164.
- Prefill truncates at 300 chars (some WhatsApp builds truncate long prefills).

### Captions

- `lib/captions.ts` — 3 default templates (default/scarcity/restock) with `{token}` substitution.
- Tokens: `{shop} {product} {price} {variants} {variantsLine} {stock} {code} {ref} {trackedLink} {shopLink} {cityCopy} {city}`.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- MongoDB Atlas (via `mongodb` driver) — Server Components read directly, mutations use Server Actions
- DM Sans (Google Fonts) via `next/font/google`
- `html-to-image` for client-side PNG snapshots
- `localStorage` only used for buyer-side one-tap recall (`hali:buyer`)

## Setup

1. Copy `.env.example` to `.env.local` and fill it in:

   | Variable | Purpose |
   |---|---|
   | `MONGODB_URI`, `MONGODB_DB` | Database |
   | `NEXT_PUBLIC_APP_HOST` | Host shown in captions and shop links (`shop.app`) |
   | `APP_URL` | Public origin, e.g. `https://shop.app` — used for the Google redirect URI |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" (optional) |
   | `HALI_DEMO_SHOP` | Slug of the fixture shop to seed (`shania`), or `off` |
   | `HALI_LEGACY_OWNER_EMAIL` | Vendor who inherits shops created before accounts existed |
   | `HALI_TIMEZONE` | Day boundaries for metrics (default `Africa/Kampala`) |

2. Install and run:

   ```
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`, sign up, and create a shop.

### Google sign-in

Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID*
(Web application). Add the authorised redirect URI
`{APP_URL}/auth/google/callback` (e.g. `http://localhost:3000/auth/google/callback`
for dev), then set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Without them the
Google button is hidden. A Google account whose verified email matches an
existing vendor is linked to that vendor; vendors can also link Google from
`/dashboard/account`.

### Migrating the original single-shop deployment

Shops created before accounts have no owner. Set `HALI_LEGACY_OWNER_EMAIL` to
the seller's email; the first time they sign up or log in with it, every
unowned shop is assigned to them. Until then nobody can edit those shops
(buyers can still browse them).

### First-request performance

Dev uses **Turbopack** (`next dev --turbopack`) — ~10× faster route compile
than webpack, so the first request lands in seconds instead of half a minute.

MongoDB connection is warmed at server start via `instrumentation.ts` +
`instrumentation-node.ts`. The boot hook fires `getDb()` and `ensureSeeded()`
before the first HTTP request arrives; you'll see
`[hali] warmup complete — mongo ready, shop "…" seeded` in the log.

If you see `Webpack is configured while Turbopack is not, which may cause
problems.` on startup — that's expected. `next.config.ts`'s webpack block
exists for `next build` (which still uses webpack); Turbopack just notes it
isn't applying the config in dev.

### Troubleshooting Atlas

If pages 500 with `MongoServerSelectionError · SSL alert internal error`, the
Atlas cluster is refusing the TLS handshake. Almost always: **your current IP is
not in the Atlas Network Access allowlist**.

Atlas → Project → Network Access → *Add IP Address* → *Add Current IP Address*.
Or during dev, allow `0.0.0.0/0` (open to internet). Wait ~1 minute after
adding, then reload the page.

## Reseeding

The seeder is idempotent and only touches the demo shop (`HALI_DEMO_SHOP`).
To reseed it from scratch, drop the `shops`/`products` docs for that slug and
restart the app.

## Data model

```
vendors            _id = uuid              — email (unique), name, bio, avatar, passwordHash (scrypt), googleId
sessions           _id = sha256(token)     — vendorId, expiresAt (TTL)
shops              _id = slug              — Shop { ownerId, brandKit, contact, about, refPrefix }
products           _id = `${slug}:${code}` — Product + shopSlug
custom_templates   _id = uuid              — CustomTemplate + shopSlug
drops              _id = `${slug}:${id}`   — Drop with items + captions + expiry
events             auto id                 — { shopSlug, type, code?, dropId?, ts } (TTL 400 days)
```

See `lib/types.ts` for full shapes.

## Explicitly out of scope

- Onboarding (screen 1s) — brand kit + products together cover the same ground.
- Camera-first "shoot and generate" (pattern 2a) — deferred from the start.
- Orders / earnings (screens 1i–1r) — orders complete in WhatsApp, so metrics
  stop at the order tap.
- Buyer accounts — buyers stay anonymous; repeat-buyer details live on their phone.
- Team members / shared shops — one vendor owns each shop.
- Password reset by email — needs an email provider. Vendors can sign in with
  Google, or change their password from `/dashboard/account`.
- Supplier surfaces (1w/1x) — Phase 3.

## Layout

```
app/
  layout.tsx                       # Root — html/body only
  page.tsx                         # Landing (public nav)
  (auth)/login, signup             # Email/password forms + Google button
  auth/google/{route.ts, callback/route.ts}   # Google OAuth (PKCE)
  logout/route.ts                  # POST — end session
  (vendor)/
    layout.tsx                     # Requires sign-in; vendor nav + shop switcher
    dashboard/
      page.tsx                     # All shops + rolled-up metrics
      new/  account/
      [slug]/
        layout.tsx                 # Ownership check, ShopProvider, tab bar
        page.tsx                   # Shop overview + metrics
        products/ drops/ templates/ brand-kit/ settings/
  (buyer)/
    layout.tsx                     # Buyer chrome (no Haali nav)
    shop/[slug]/
      page.tsx  about/  d/[dropId]/  [code]/
  api/track/route.ts               # Buyer activity beacon
  o/[slug]/[code]/route.ts         # Tracked short link
  o/[slug]/route.ts                # Legacy /o/{code}

components/                        # StatusCard, ShopContext, ShopTabs, SellerCard, DailyBars, …
lib/
  auth/                            # session, password (scrypt), vendors, google, next
  actions/                         # "use server" mutations — each checks ownership
  db.ts seed.ts server-store.ts events.ts metrics.ts track.ts paths.ts
  wa.ts captions.ts ref.ts format.ts buyer-recall.ts types.ts …
```
