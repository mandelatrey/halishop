"use client";

import { useActionState, useState } from "react";
import PhoneInput from "@/components/PhoneInput";
import { createShop, type CreateShopState } from "@/lib/actions/shops";
import { slugify } from "@/lib/paths";

export default function NewShopForm({ host, defaultWhatsapp }: { host: string; defaultWhatsapp: string }) {
  const [state, action, pending] = useActionState<CreateShopState, FormData>(createShop, undefined);
  const v = state?.values ?? {};
  const [name, setName] = useState(v.name ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!v.slug);
  const [whatsapp, setWhatsapp] = useState(v.whatsapp ?? defaultWhatsapp);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={action} className="panel ad-form" style={{ maxWidth: 640 }}>
      {state?.error && (
        <div className="ad-alert" role="alert">
          {state.error}
        </div>
      )}
      <label className="ad-field">
        <span className="k">Shop name</span>
        <input
          className="inp"
          name="name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shania Collections"
          autoFocus
        />
      </label>
      <label className="ad-field">
        <span className="k">Shop link</span>
        <div className="ad-row" style={{ alignItems: "center", gap: 6 }}>
          <span className="ad-hint" style={{ whiteSpace: "nowrap" }}>
            {host}/shop/
          </span>
          <input
            className="inp"
            name="slug"
            value={effectiveSlug}
            maxLength={40}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
            placeholder="shania-collections"
          />
        </div>
        <span className="ad-hint">This is the link you share. Lowercase letters, numbers and dashes.</span>
      </label>
      <div className="ad-field">
        <span className="k">WhatsApp number for orders</span>
        <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder="772 000 000" />
        <input type="hidden" name="whatsapp" value={whatsapp} />
        <span className="ad-hint">Every Order button in this shop opens a chat with this number.</span>
      </div>
      <div className="ad-grid-2">
        <label className="ad-field">
          <span className="k">City</span>
          <input className="inp" name="city" defaultValue={v.city} placeholder="Kampala" />
        </label>
        <label className="ad-field">
          <span className="k">Delivery area</span>
          <input className="inp" name="area" defaultValue={v.area} placeholder="Ntinda" />
        </label>
      </div>
      <button type="submit" className="btn" disabled={pending} style={{ alignSelf: "flex-start", width: "auto", minWidth: 180 }}>
        {pending ? "Creating…" : "Create shop"}
      </button>
    </form>
  );
}
