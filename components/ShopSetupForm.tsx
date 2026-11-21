"use client";

import { useActionState, useState, useTransition } from "react";
import PhoneInput from "./PhoneInput";
import { claimShop, createShop, type SetupState } from "@/lib/actions/shops";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

/** New shop: name, link (from the name, editable), order WhatsApp, area. Plus "claim" for a matching existing shop. */
export function ShopSetupForm({ phone, host }: { phone: string; host: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(createShop, undefined);
  const v = state?.values ?? {};
  const [name, setName] = useState(v.shopName ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!v.slug);
  const [whatsapp, setWhatsapp] = useState(v.whatsapp || phone);
  const link = slugTouched ? slugify(slug) : slugify(name);

  return (
    <form action={action} className="st-form" noValidate>
      <label className="st-field">
        <span className="st-label">Shop name</span>
        <input className="inp" name="shopName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shania Collections" required />
      </label>
      <label className="st-field">
        <span className="st-label">Shop link</span>
        <span className="st-slug">
          <span className="st-slug-host">{host}/shop/</span>
          <input
            className="inp"
            name="slug"
            value={slugTouched ? slug : link}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="shania"
            autoCapitalize="none"
            spellCheck={false}
          />
        </span>
        <span className="st-hint">Letters, numbers and dashes. This is the link you share.</span>
      </label>
      <div className="st-field">
        <span className="st-label">Orders go to (WhatsApp)</span>
        <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="772 145 908" />
        <input type="hidden" name="whatsapp" value={whatsapp} />
      </div>
      <div className="st-grid-2">
        <label className="st-field">
          <span className="st-label">City</span>
          <input className="inp" name="city" defaultValue={v.city ?? ""} placeholder="Kampala" />
        </label>
        <label className="st-field">
          <span className="st-label">Delivery area</span>
          <input className="inp" name="area" defaultValue={v.area ?? ""} placeholder="Ntinda" />
        </label>
      </div>
      {state?.error && (
        <p className="st-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn st-submit" disabled={pending}>
        {pending ? "Creating your shop…" : "Create my shop"}
      </button>
    </form>
  );
}

export function ClaimShopButton({ slug, name }: { slug: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="st-claim">
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await claimShop(slug);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Claiming…" : `Run ${name}`}
      </button>
      {error && <span className="st-error">{error}</span>}
    </div>
  );
}
