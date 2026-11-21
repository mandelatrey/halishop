"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ShoppingBag, Store } from "lucide-react";
import PhoneInput from "./PhoneInput";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";

/** Sign in / sign up with WhatsApp number + password. */
export default function AuthForm({ mode, next, role: initialRole = "buyer" }: { mode: "login" | "signup"; next?: string; role?: "buyer" | "seller" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, undefined);
  const [phone, setPhone] = useState(state?.phone ?? "");
  const [show, setShow] = useState(false);
  const [role, setRole] = useState(initialRole);
  const signup = mode === "signup";
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="st-form" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {signup && (
        <fieldset className="st-roles">
          <legend className="st-label">I want to</legend>
          {(
            [
              ["buyer", ShoppingBag, "Shop", "Follow shops and track your orders"],
              ["seller", Store, "Sell", "Open a shop and take orders on WhatsApp"],
            ] as const
          ).map(([value, Icon, title, hint]) => (
            <label key={value} className={`st-role${role === value ? " on" : ""}`}>
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />
              <Icon size={18} aria-hidden />
              <span>
                <b>{title}</b>
                <span>{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {signup && (
        <label className="st-field">
          <span className="st-label">Your name</span>
          <input className="inp" name="name" autoComplete="name" defaultValue={state?.name ?? ""} required />
        </label>
      )}

      <div className="st-field">
        <span className="st-label">WhatsApp number</span>
        <PhoneInput value={phone} onChange={setPhone} placeholder="772 145 908" />
        <input type="hidden" name="phone" value={phone} />
      </div>

      <label className="st-field">
        <span className="st-label">Password</span>
        <span className="st-pass">
          <input
            className="inp"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            required
          />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </span>
        {signup && <span className="st-hint">At least 8 characters.</span>}
      </label>

      {state?.error && (
        <p className="st-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn st-submit" disabled={pending}>
        {pending ? "One moment…" : signup ? (role === "seller" ? "Create account and set up my shop" : "Create account") : "Sign in"}
      </button>

      <p className="st-switch">
        {signup ? (
          <>
            Already have an account? <Link href={`/login${nextQ}`}>Sign in</Link>
          </>
        ) : (
          <>
            New to Haali? <Link href={`/signup${nextQ}`}>Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
