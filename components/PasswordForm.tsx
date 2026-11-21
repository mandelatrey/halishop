"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/lib/actions/auth";

/** New password (twice); the current one too unless they're on a temporary password. */
export default function PasswordForm({ temporary, next }: { temporary: boolean; next?: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="st-form" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {!temporary && (
        <label className="st-field">
          <span className="st-label">Current password</span>
          <input className="inp" name="current" type="password" autoComplete="current-password" required />
        </label>
      )}
      <label className="st-field">
        <span className="st-label">New password</span>
        <input className="inp" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="st-hint">At least 8 characters.</span>
      </label>
      <label className="st-field">
        <span className="st-label">New password again</span>
        <input className="inp" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state?.error && (
        <p className="st-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn st-submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
