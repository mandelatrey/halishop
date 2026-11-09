"use server";

import { redirect } from "next/navigation";
import { createSession } from "../auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "../auth/password";
import {
  claimLegacyShops,
  createVendor,
  findVendorByEmail,
  isValidEmail,
  normalizeEmail,
} from "../auth/vendors";
import { safeNext } from "../auth/next";

export type AuthFormState = { error?: string; email?: string; name?: string } | undefined;

function field(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const name = field(form, "name").trim();
  const email = normalizeEmail(field(form, "email"));
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));
  const echo = { email, name };

  if (!name) return { ...echo, error: "Tell us your name — buyers see it on your shop's About page." };
  if (name.length > 80) return { ...echo, error: "That name is too long." };
  if (!isValidEmail(email)) return { ...echo, error: "Enter a valid email address." };
  const pwProblem = passwordProblem(password);
  if (pwProblem) return { ...echo, error: pwProblem };

  const existing = await findVendorByEmail(email);
  if (existing) {
    return {
      ...echo,
      error: existing.googleId && !existing.passwordHash
        ? "That email already has an account. Continue with Google instead."
        : "That email already has an account. Log in instead.",
    };
  }

  let vendorId: string;
  try {
    const vendor = await createVendor({ email, name, passwordHash: await hashPassword(password) });
    vendorId = vendor._id;
  } catch (err) {
    // Unique index race: two sign-ups with the same email at once.
    if ((err as { code?: number }).code === 11000) return { ...echo, error: "That email already has an account. Log in instead." };
    throw err;
  }
  await createSession(vendorId);
  redirect(next ?? "/dashboard");
}

export async function logIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(field(form, "email"));
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));

  const vendor = email ? await findVendorByEmail(email) : null;
  if (vendor && !vendor.passwordHash && vendor.googleId) {
    return { email, error: "This account signs in with Google. Use “Continue with Google”." };
  }
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!vendor?.passwordHash || !(await verifyPassword(password, vendor.passwordHash))) {
    return { email, error: "That email and password don't match." };
  }

  await claimLegacyShops(vendor);
  await createSession(vendor._id);
  redirect(next ?? "/dashboard");
}
