"use client";

import { useShop } from "@/components/ShopContext";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveShopAbout, saveShopSettings } from "@/lib/actions/settings";
import type { ShopAbout, ShopContact } from "@/lib/types";
import { buildWaLink, composeOrderMessage, normalizePhone, prettyPhone } from "@/lib/wa";
import Button from "@/components/Button";
import PageHeader from "@/components/PageHeader";
import PhoneInput from "@/components/PhoneInput";
import ReadTicks from "@/components/ReadTicks";


export default function SettingsClient({
  initialContact,
  initialAbout,
  shopName,
  shopPath,
  brandKitWhatsapp,
}: {
  initialContact: ShopContact;
  initialAbout: ShopAbout;
  shopName: string;
  shopPath: string;
  brandKitWhatsapp?: string;
}) {
  const { slug } = useShop();
  const [saved, setSaved] = useState<ShopContact>(initialContact);
  const [draft, setDraft] = useState<ShopContact>(initialContact);
  const [savedAbout, setSavedAbout] = useState<ShopAbout>(initialAbout);
  const [about, setAbout] = useState<ShopAbout>(initialAbout);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  const contactDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const aboutDirty = useMemo(() => JSON.stringify(about) !== JSON.stringify(savedAbout), [about, savedAbout]);
  const dirty = contactDirty || aboutDirty;
  const validNumber = normalizePhone(draft.whatsapp ?? "").length >= 8;

  // Before this page existed, the brand kit edited a separate number that order
  // links never used. If that one differs, offer it — it's probably what the
  // seller meant.
  const legacyNumber =
    brandKitWhatsapp && normalizePhone(brandKitWhatsapp) !== normalizePhone(saved.whatsapp)
      ? brandKitWhatsapp
      : null;

  const sampleMessage = composeOrderMessage({
    shopName,
    productTitle: "T-shirt black",
    variant: "M",
    quantity: 1,
    formattedPrice: "UGX 35,000",
    area: draft.area,
    ref: "B3",
  });
  const testLink = validNumber
    ? buildWaLink(draft.whatsapp, "Test from Haali settings — order links reach this number ✅")
    : undefined;

  function set<K extends keyof ShopContact>(key: K, value: ShopContact[K]) {
    setError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setA<K extends keyof ShopAbout>(key: K, value: ShopAbout[K]) {
    setError(null);
    setAbout((a) => ({ ...a, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      if (contactDirty) {
        const res = await saveShopSettings(slug, draft);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSaved(res.contact);
        setDraft(res.contact);
      }
      if (aboutDirty) {
        const res = await saveShopAbout(slug, about);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSavedAbout(res.about);
        setAbout(res.about);
      }
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    });
  }

  function revert() {
    setError(null);
    setDraft(saved);
    setAbout(savedAbout);
  }

  const saveButton = (
    <Button onClick={save} disabled={!dirty || isPending || !validNumber} style={{ minWidth: 148 }}>
      {isPending ? "Saving…" : dirty ? "Save settings" : "Saved"}
    </Button>
  );

  return (
    <main className="page ad-page">
      <PageHeader
        label="Shop"
        title="Shop"
        soft="info"
        subtitle="Where buyers' orders go, delivery details, and what buyers see about you."
        actions={
          <>
            {flash && (
              <span className="ad-flash" role="status">
                Saved ✓
              </span>
            )}
            {dirty && (
              <Button variant="sec" onClick={revert}>
                Revert
              </Button>
            )}
            {saveButton}
          </>
        }
      />

      {error && (
        <div className="ad-alert" role="alert">
          {error}
        </div>
      )}

      <div className="ad-split">
        <div className="ad-stack">
          <section className="panel">
            <h2 className="section-title">Orders on WhatsApp</h2>
            <div className="ad-form">
              <div className="ad-field">
                <span className="k">Order number</span>
                <PhoneInput
                  value={draft.whatsapp ?? ""}
                  onChange={(next) => set("whatsapp", next)}
                  placeholder="772 000 000"
                />
                <span className="ad-hint">
                  Every &ldquo;Order&rdquo; and &ldquo;Ask a question&rdquo; button in your shop opens a WhatsApp chat
                  with this number. Pick the country, then type the number.
                </span>
              </div>

              {legacyNumber && (
                <div className="ad-note">
                  <p>
                    Your brand kit had <strong>{prettyPhone(legacyNumber)}</strong>, but order links have been going to{" "}
                    <strong>{prettyPhone(saved.whatsapp)}</strong>.
                  </p>
                  <Button variant="sec" onClick={() => set("whatsapp", legacyNumber)}>
                    Use {prettyPhone(legacyNumber)}
                  </Button>
                </div>
              )}

              <div className="ad-row" style={{ alignItems: "center" }}>
                {testLink ? (
                  <a className="btn sec" style={{ width: "auto" }} href={testLink} target="_blank" rel="noopener noreferrer">
                    Test this number ↗
                  </a>
                ) : (
                  <span className="ad-hint">Enter a full number to test it.</span>
                )}
                <span className="ad-hint">Opens WhatsApp with a test message to the number above.</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Delivery</h2>
            <div className="ad-form">
              <div className="ad-grid-2">
                <label className="ad-field">
                  <span className="k">Default delivery area</span>
                  <input
                    className="inp"
                    value={draft.area ?? ""}
                    onChange={(e) => set("area", e.target.value)}
                    placeholder="Ntinda"
                  />
                  <span className="ad-hint">Pre-filled in the order form; buyers can change it.</span>
                </label>
                <label className="ad-field">
                  <span className="k">City</span>
                  <input
                    className="inp"
                    value={draft.city ?? ""}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Kampala"
                  />
                  <span className="ad-hint">Shown at the top of your shop and in restock captions.</span>
                </label>
              </div>
              <label className="ad-field">
                <span className="k">Delivery line for captions</span>
                <input
                  className="inp"
                  value={draft.cityCopy ?? ""}
                  onChange={(e) => set("cityCopy", e.target.value)}
                  placeholder="delivery today in Kampala"
                />
                <span className="ad-hint">
                  Added to your default captions, e.g. &ldquo;…tap the link to order, {draft.cityCopy || "delivery today in Kampala"}.&rdquo;
                </span>
              </label>
            </div>
          </section>
          <section className="panel">
            <h2 className="section-title">About your shop</h2>
            <p className="ad-hint" style={{ marginTop: -4 }}>
              Buyers see this on your shop&rsquo;s About page, so they know who they&rsquo;re buying from.
            </p>
            <div className="ad-form">
              <label className="ad-field">
                <span className="k">Tagline</span>
                <input
                  className="inp"
                  value={about.tagline ?? ""}
                  maxLength={120}
                  onChange={(e) => setA("tagline", e.target.value)}
                  placeholder="Thrifted streetwear, hand-picked in Kampala"
                />
              </label>
              <label className="ad-field">
                <span className="k">About the shop</span>
                <textarea
                  className="inp"
                  rows={4}
                  maxLength={1200}
                  value={about.description ?? ""}
                  onChange={(e) => setA("description", e.target.value)}
                  placeholder="What you sell, where it comes from, how long you've been at it."
                />
              </label>
              <div className="ad-grid-2">
                <label className="ad-field">
                  <span className="k">How buyers pay</span>
                  <input
                    className="inp"
                    value={about.payment ?? ""}
                    maxLength={200}
                    onChange={(e) => setA("payment", e.target.value)}
                    placeholder="Cash on delivery or MoMo"
                  />
                </label>
                <label className="ad-field">
                  <span className="k">Hours</span>
                  <input
                    className="inp"
                    value={about.hours ?? ""}
                    maxLength={120}
                    onChange={(e) => setA("hours", e.target.value)}
                    placeholder="Mon–Sat, 9am–7pm"
                  />
                </label>
                <label className="ad-field">
                  <span className="k">Instagram</span>
                  <input
                    className="inp"
                    value={about.instagram ?? ""}
                    onChange={(e) => setA("instagram", e.target.value)}
                    placeholder="@yourshop"
                  />
                </label>
                <label className="ad-field">
                  <span className="k">TikTok</span>
                  <input
                    className="inp"
                    value={about.tiktok ?? ""}
                    onChange={(e) => setA("tiktok", e.target.value)}
                    placeholder="@yourshop"
                  />
                </label>
              </div>
              <div className="fields">
                <label>
                  <input
                    type="checkbox"
                    checked={about.showOwner !== false}
                    onChange={(e) => setA("showOwner", e.target.checked)}
                  />
                  Show my name, photo and bio on this shop
                </label>
              </div>
              <span className="ad-hint">
                Running this shop anonymously? Untick it and buyers see only the shop.{" "}
                <Link href="/dashboard/account">Edit your profile</Link>
              </span>
            </div>
          </section>
        </div>

        <aside className="panel-dark ad-settings-aside">
          <span className="pill dark">Where orders go</span>
          <div className="ad-settings-number">{validNumber ? prettyPhone(draft.whatsapp) : "No number yet"}</div>
          <p className="s">A buyer tapping &ldquo;Order&rdquo; sends this to that number:</p>
          <div className="ad-settings-bubble">
            <p>{sampleMessage}</p>
            <div className="ad-settings-bubble-time"><ReadTicks /></div>
          </div>
          <Link href={shopPath} className="btn sec ad-settings-shoplink">
            Open your shop
          </Link>
        </aside>
      </div>

      {dirty && (
        <div className="ad-savebar" role="region" aria-label="Unsaved changes">
          <span className="ad-savebar-note">Unsaved changes</span>
          <Button variant="sec" onClick={revert} disabled={isPending}>
            Revert
          </Button>
          <Button onClick={save} disabled={isPending || !validNumber}>
            {isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </main>
  );
}
