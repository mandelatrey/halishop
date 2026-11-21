# HALI — Status Commerce (Phase 1 wedge)

A single-shop app for the Status Commerce wedge. A reseller:

1. Sets a brand kit, uploads a logo, seeds a catalogue.
2. Generates a 9:16 status card for one product, or batch-generates a whole drop
   (multiple products at once with captions + tracked links).
3. Shares the buyer-facing shop URL — buyers tap "Order" and land in the
   reseller's WhatsApp with the order pre-composed.

## What ships

### Reseller (admin)

| Route | Screen | Purpose |
|---|---|---|
| `/` | — | Landing page explaining Haali, with links into setup and the live shop |
| `/brand-kit` | 2e | Shop name, URL, logo, palette, frame, WhatsApp number |
| `/storefront` | — | Shop page look: banner slides (carousel) + the hanging menu under them, with live phone preview |
| `/templates` | — | List custom templates |
| `/templates/[id]` | — | Custom template editor with live preview + instructions |
| `/products` | — | Catalogue + inline add/edit |
| `/products/[code]/card` | 1t | Single-card generator |
| `/drops/new` | 1u | Multi-select products, name/expiry/template, batch generate |
| `/drops/[dropId]` | 1v | Card carousel + captions (default/scarcity/restock) + save-all |

### Buyer

| Route | Screen | Purpose |
|---|---|---|
| `/shop/[slug]` | 1a / 1c | Storefront — mobile list + desktop grid |
| `/shop/[slug]/d/[dropId]` | 1d | Today's-drop page (only items in this drop) |
| `/shop/[slug]/[code]` | 1f / 1g / 1h | Product + inline buy form, message preview, one-tap repeat buyer |
| `/o/[code]` | — | 302 tracked short link → `/shop/[slug]/[code]` |
| `/shop/[slug]/[code]/photo` | — | A product's photo as a plain image (for the cart) |

### WhatsApp handoff

- `lib/wa.ts` — `normalizePhone`, `buildWaLink`, `composeOrderMessage`, `composeAskMessage`.
- Numbers with a leading `0` are treated as Uganda (`+256`). Otherwise assumed E.164.
- Prefill truncates at 300 chars (some WhatsApp builds truncate long prefills). A cart order lists every item, so it gets 1,500.
- On desktop, buyers pick **WhatsApp Web** or the **desktop app** (`components/WhatsAppTargetPicker.tsx`,
  remembered in `localStorage` as `hali:wa-target`). Phones always use wa.me.

### Cart

- Buyers **Add to cart** on a product page (options + quantity), then send the whole cart as one WhatsApp
  message from the cart sheet (`components/Cart.tsx`): items with refs, total, delivery area.
- The cart lives on the buyer's device (`localStorage`, `hali:cart:<slug>`, `lib/cart.ts`); nothing is stored
  server-side. Quantities are capped at the stock when added.

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

1. Copy MongoDB URI + shop config into `.env.local`:

   ```
   MONGODB_URI="mongodb+srv://…"
   MONGODB_DB="hali"
   NEXT_PUBLIC_SHOP_SLUG="shania"
   NEXT_PUBLIC_APP_HOST="shop.app"
   ```

   `atlas-credentials.env` has the current cluster URI.

2. Install and run:

   ```
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`. First page load triggers `ensureSeeded()` in
   `lib/seed.ts`, which idempotently upserts the Shania fixture (`shops`) and
   6 seed products (`products`). Indexes are created on the same call.

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

### Visual CSS editor (dev only)

With `npm run dev` running, press **Shift+Alt+E** (or the "Styles" button, bottom right), then **Pick** an
element or **Alt+click** anything: adjust font sizes, alignment, padding, margins, gaps and widths with live
preview, and **Save** (Ctrl/⌘+S) to write the change into the `.css` file under `app/` the rule lives in.
Review it with `git diff`.

The editor is [domeditor](https://github.com/mandelatrey/domeditor), a dev dependency. It is wired up in three
places: `withDomEditor` in `next.config.ts`, the route `app/api/dev/domeditor/route.dev.ts` (only exists under
`next dev`), and `<DomEditor />` in `app/layout.tsx` (only rendered in development). None of it is in
`npm run build`. Update it with `npm i -D github:mandelatrey/domeditor`.

### Troubleshooting Atlas

If pages 500 with `MongoServerSelectionError · SSL alert internal error`, the
Atlas cluster is refusing the TLS handshake. Almost always: **your current IP is
not in the Atlas Network Access allowlist**.

Atlas → Project → Network Access → *Add IP Address* → *Add Current IP Address*.
Or during dev, allow `0.0.0.0/0` (open to internet). Wait ~1 minute after
adding, then reload the page.

## Reseeding

The seeder is idempotent. To reseed the Shania fixture from scratch, drop the
Atlas collections (`shops`, `products`, `custom_templates`, `drops`, `storefronts`) and reload
the app.

## Data model

```
shops              _id = slug              — Shop { brandKit, contact, refPrefix }
products           _id = `${slug}:${code}` — Product + shopSlug
custom_templates   _id = uuid              — CustomTemplate + shopSlug
drops              _id = `${slug}:${id}`   — Drop with items + captions + expiry
storefronts        _id = slug              — Storefront { banners, autoplay, menu } (own doc so banner images stay off getShop())
```

See `lib/types.ts` for full shapes.

## Explicitly out of scope

- Onboarding (screen 1s) — brand kit + products together cover the same ground.
- Camera-first "shoot and generate" (pattern 2a) — deferred from the start.
- Reseller dashboard / orders / stock / earnings (screens 1i–1r).
- Analytics on `/o/[code]` taps — the redirect is live, tap logging is Phase 2.
- Auth — single-shop deployment via env var.
- Supplier surfaces (1w/1x) — Phase 3.

## Layout

```
app/
  layout.tsx                       # Root — html/body only
  globals.css                      # Design tokens + utility classes
  (admin)/
    layout.tsx                     # Admin nav
    page.tsx                       # Launcher
    brand-kit/{page.tsx, Client.tsx}
    templates/{page.tsx, Client.tsx, [id]/{page.tsx, Client.tsx}}
    products/{page.tsx, Client.tsx, [code]/card/{page.tsx, Client.tsx}}
    drops/
      new/{page.tsx, Client.tsx}
      [dropId]/{page.tsx, Client.tsx}
  (buyer)/
    layout.tsx                     # Buyer chrome (no admin nav)
    shop/[slug]/
      page.tsx                     # Storefront
      d/[dropId]/page.tsx          # Drop page
      [code]/{page.tsx, BuyForm.tsx}
  o/[code]/route.ts                # Short link 302

components/                        # StatusCard, TemplatePicker, Frame, Button, …
lib/
  db.ts                            # Mongo singleton
  seed.ts                          # ensureSeeded(slug)
  server-store.ts                  # Server-only reads
  actions/                         # "use server" mutations
    _slug.ts brand-kit.ts products.ts templates.ts drops.ts
  wa.ts captions.ts ref.ts format.ts buyer-recall.ts
  types.ts fixtures.ts palette.ts render-card.ts
```
