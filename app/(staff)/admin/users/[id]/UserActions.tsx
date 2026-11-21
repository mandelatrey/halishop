"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import WhatsAppTargetPicker from "@/components/WhatsAppTargetPicker";
import {
  releaseShop,
  resetPassword,
  setAdmin,
  setDisabled,
  signOutEverywhere,
  transferShop,
  updateProfile,
  type AdminResult,
} from "@/lib/actions/admin";
import { buildWhatsAppHref } from "@/lib/wa";
import { useWhatsAppTarget } from "@/lib/wa-target";

type U = {
  id: string;
  name: string;
  phone: string;
  shopSlug?: string;
  shopName?: string;
  role?: "admin";
  disabled?: boolean;
};

/** Every admin action for one account. Risky ones ask first; results show inline and the page reloads its data. */
export default function UserActions({ user, sessions, isMe, host }: { user: U; sessions: number; isMe: boolean; host: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [to, setTo] = useState("");
  const { target } = useWhatsAppTarget();
  const first = user.name.split(/\s+/)[0];

  const run = (fn: () => Promise<AdminResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const res = await fn();
      setNote(res.ok ? { ok: true, text: res.message ?? "Done." } : { ok: false, text: res.error });
      router.refresh();
    });
  };

  const tempMessage = temp
    ? `Hi ${first}, your Haali password has been reset. Sign in at ${host}/login with your WhatsApp number and this temporary password: ${temp} — you'll choose a new one straight away.`
    : "";

  return (
    <div className="sf-actions">
      {note && (
        <p className={note.ok ? "st-done" : "st-error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}

      <section className="panel">
        <h2 className="section-title">Password</h2>
        <p className="ad-hint">
          Makes a temporary password and signs {first} out everywhere. They choose a new password as soon as they sign in with it.
        </p>
        {temp ? (
          <div className="sf-temp">
            <span className="st-label">Temporary password — shown once</span>
            <code className="sf-temp-pw">{temp}</code>
            <div className="sf-row">
              <button
                type="button"
                className="btn sec"
                onClick={async () => {
                  await navigator.clipboard.writeText(temp).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copied" : "Copy"}
              </button>
              <a className="btn" href={buildWhatsAppHref(user.phone, tempMessage, target, 600)} target={target === "app" ? undefined : "_blank"} rel="noopener noreferrer">
                Send to {first} on WhatsApp
              </a>
            </div>
            <WhatsAppTargetPicker />
          </div>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Reset ${user.name}'s password? They'll be signed out everywhere.`)) return;
              start(async () => {
                const res = await resetPassword(user.id);
                if (res.ok) {
                  setTemp(res.password);
                  setNote(null);
                } else setNote({ ok: false, text: res.error });
                router.refresh();
              });
            }}
          >
            Reset password
          </button>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Devices</h2>
        <p className="ad-hint">
          Signed in on {sessions} device{sessions === 1 ? "" : "s"}.
        </p>
        <button type="button" className="btn sec" disabled={pending || sessions === 0} onClick={() => run(() => signOutEverywhere(user.id), `Sign ${user.name} out on every device?`)}>
          Sign out everywhere
        </button>
      </section>

      <section className="panel">
        <h2 className="section-title">Name and number</h2>
        <form
          className="st-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateProfile(user.id, { name, phone }));
          }}
        >
          <label className="st-field">
            <span className="st-label">Name</span>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="st-field">
            <span className="st-label">WhatsApp number (they sign in with it)</span>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
          <button type="submit" className="btn sec" disabled={pending || (name === user.name && phone === user.phone)}>
            Save
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Access</h2>
        <div className="sf-row">
          {user.disabled ? (
            <button type="button" className="btn sec" disabled={pending} onClick={() => run(() => setDisabled(user.id, false))}>
              Turn account back on
            </button>
          ) : (
            <button
              type="button"
              className="btn sec sf-danger"
              disabled={pending || isMe}
              title={isMe ? "You can't turn off your own account" : undefined}
              onClick={() => run(() => setDisabled(user.id, true), `Turn off ${user.name}'s account? They'll be signed out and can't sign in until it's turned back on.`)}
            >
              Turn account off
            </button>
          )}
          {user.role === "admin" ? (
            <button
              type="button"
              className="btn gh"
              disabled={pending || isMe}
              title={isMe ? "You can't remove your own admin access" : undefined}
              onClick={() => run(() => setAdmin(user.id, false), `Remove ${user.name}'s admin access?`)}
            >
              Remove admin
            </button>
          ) : (
            <button type="button" className="btn gh" disabled={pending} onClick={() => run(() => setAdmin(user.id, true), `Make ${user.name} an admin? They'll be able to manage every account.`)}>
              Make admin
            </button>
          )}
        </div>
      </section>

      {user.shopSlug && (
        <section className="panel">
          <h2 className="section-title">Shop · {user.shopName ?? user.shopSlug}</h2>
          <p className="ad-hint">Move the shop to another account (they must have signed up, and not run a shop), or release it so it has no owner.</p>
          <form
            className="sf-row"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => transferShop(user.id, to), `Give “${user.shopSlug}” to the account with ${to}? ${user.name} loses access to it.`);
            }}
          >
            <div className="sf-grow">
              <PhoneInput value={to} onChange={setTo} placeholder="New owner's number" />
            </div>
            <button type="submit" className="btn sec" disabled={pending || !to}>
              Move shop
            </button>
          </form>
          <button type="button" className="btn gh sf-danger" disabled={pending} onClick={() => run(() => releaseShop(user.id), `Release “${user.shopSlug}” from ${user.name}? The shop keeps its products and orders but has no owner until someone claims it.`)}>
            Release shop
          </button>
        </section>
      )}
    </div>
  );
}
