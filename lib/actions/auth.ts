"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import {
  ensureAuthIndexes,
  endSession,
  findUserByPhone,
  hashPassword,
  safeNext,
  startSession,
  verifyPassword,
  type UserDoc,
} from "../auth";
import { normalizePhone } from "../wa";

export type AuthState = { error?: string; phone?: string; name?: string } | undefined;

const MIN_PASSWORD = 8;

/** "+256 772…" / "0772…" -> "+256772145908", or null if it can't be a mobile number. */
function cleanPhone(raw: FormDataEntryValue | null): string | null {
  const digits = normalizePhone(String(raw ?? ""));
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const phone = cleanPhone(form.get("phone"));
  const password = String(form.get("password") ?? "");
  const role = form.get("role") === "seller" ? "seller" : "buyer";
  const keep = { phone: String(form.get("phone") ?? ""), name };

  if (!name) return { ...keep, error: "Add your name." };
  if (!phone) return { ...keep, error: "Enter your full WhatsApp number." };
  if (password.length < MIN_PASSWORD) return { ...keep, error: `Use a password of at least ${MIN_PASSWORD} characters.` };

  await ensureAuthIndexes();
  if (await findUserByPhone(phone)) {
    return { ...keep, error: "There's already an account with this number. Sign in instead." };
  }
  const user: UserDoc = { _id: randomUUID(), phone, name, ...(await hashPassword(password)), favorites: [], createdAt: Date.now() };
  try {
    const db = await getDb();
    await db.collection<UserDoc>("users").insertOne(user);
  } catch {
    // unique index: someone signed up with this number a moment ago
    return { ...keep, error: "There's already an account with this number. Sign in instead." };
  }
  await startSession(user._id);
  redirect(role === "seller" ? "/seller/setup" : safeNext(form.get("next"), "/account"));
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const phone = cleanPhone(form.get("phone"));
  const password = String(form.get("password") ?? "");
  const keep = { phone: String(form.get("phone") ?? "") };
  const wrong = { ...keep, error: "That number and password don't match an account." };
  if (!phone || !password) return wrong;

  const user = await findUserByPhone(phone);
  if (!user || !(await verifyPassword(password, user))) return wrong;
  await startSession(user._id);
  redirect(safeNext(form.get("next"), user.shopSlug ? "/orders" : "/account"));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}
