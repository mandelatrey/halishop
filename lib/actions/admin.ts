"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { endAllSessions, hashPassword, requireAdmin, temporaryPassword, type User, type UserDoc } from "../auth";
import type { Shop } from "../types";
import { normalizePhone } from "../wa";

/**
 * Haali team tools for accounts (/admin). Every action checks the caller is
 * an admin and writes an entry to `admin_log`: who did what to whom, when.
 */

type ShopDoc = Shop & { _id: string };
export type AdminLogEntry = {
  at: number;
  adminId: string | null;
  adminName: string;
  targetId: string;
  targetName: string;
  action: string;
  detail?: string;
};
export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

async function target(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ _id: id });
}

async function log(admin: User, t: Pick<UserDoc, "_id" | "name">, action: string, detail?: string) {
  const db = await getDb();
  await db.collection<AdminLogEntry>("admin_log").insertOne({
    at: Date.now(),
    adminId: admin.id,
    adminName: admin.name,
    targetId: t._id,
    targetName: t.name,
    action,
    ...(detail ? { detail } : {}),
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${t._id}`);
}

/** A temporary password, shown to the admin once. The person is signed out everywhere and
 *  must choose a new password the next time they sign in. */
export async function resetPassword(userId: string): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const t = await target(userId);
  if (!t) return { ok: false, error: "No such account." };
  const password = temporaryPassword();
  const db = await getDb();
  await db.collection<UserDoc>("users").updateOne({ _id: t._id }, { $set: { ...(await hashPassword(password)), mustChangePassword: true } });
  const ended = await endAllSessions(t._id);
  await log(admin, t, "reset-password", `temporary password issued; ${ended} session${ended === 1 ? "" : "s"} ended`);
  return { ok: true, password };
}

export async function signOutEverywhere(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const t = await target(userId);
  if (!t) return { ok: false, error: "No such account." };
  const ended = await endAllSessions(t._id);
  await log(admin, t, "sign-out-everywhere", `${ended} session${ended === 1 ? "" : "s"} ended`);
  return { ok: true, message: `Signed out of ${ended} device${ended === 1 ? "" : "s"}.` };
}

export async function setDisabled(userId: string, disabled: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "You can't turn off your own account." };
  const t = await target(userId);
  if (!t) return { ok: false, error: "No such account." };
  const db = await getDb();
  await db.collection<UserDoc>("users").updateOne({ _id: t._id }, disabled ? { $set: { disabled: true } } : { $unset: { disabled: "" } });
  if (disabled) await endAllSessions(t._id);
  await log(admin, t, disabled ? "disable" : "enable");
  return { ok: true, message: disabled ? "Account turned off and signed out." : "Account turned back on." };
}

export async function updateProfile(userId: string, input: { name: string; phone: string }): Promise<AdminResult> {
  const admin = await requireAdmin();
  const t = await target(userId);
  if (!t) return { ok: false, error: "No such account." };
  const name = input.name.trim().slice(0, 60);
  const digits = normalizePhone(input.phone);
  if (!name) return { ok: false, error: "Add a name." };
  if (digits.length < 8 || digits.length > 15) return { ok: false, error: "Enter a full WhatsApp number." };
  const phone = `+${digits}`;
  const db = await getDb();
  try {
    await db.collection<UserDoc>("users").updateOne({ _id: t._id }, { $set: { name, phone } });
  } catch {
    return { ok: false, error: `Another account already uses ${phone}.` };
  }
  const changes = [name !== t.name && `name “${t.name}” → “${name}”`, phone !== t.phone && `phone ${t.phone} → ${phone}`].filter(Boolean);
  if (changes.length) await log(admin, { _id: t._id, name }, "edit-profile", changes.join("; "));
  return { ok: true, message: changes.length ? "Saved." : "Nothing changed." };
}

export async function setAdmin(userId: string, makeAdmin: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && !makeAdmin) return { ok: false, error: "You can't remove your own admin access." };
  const t = await target(userId);
  if (!t) return { ok: false, error: "No such account." };
  const db = await getDb();
  await db.collection<UserDoc>("users").updateOne({ _id: t._id }, makeAdmin ? { $set: { role: "admin" } } : { $unset: { role: "" } });
  await log(admin, t, makeAdmin ? "make-admin" : "remove-admin");
  return { ok: true, message: makeAdmin ? `${t.name} is now an admin.` : `${t.name} is no longer an admin.` };
}

/** Take a shop away from its owner (e.g. claimed by the wrong person). It becomes claimable again
 *  by the account whose number is the shop's order number. */
export async function releaseShop(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const t = await target(userId);
  if (!t?.shopSlug) return { ok: false, error: "This account doesn't run a shop." };
  const db = await getDb();
  await db.collection<ShopDoc>("shops").updateOne({ _id: t.shopSlug, ownerId: t._id }, { $unset: { ownerId: "" } });
  await db.collection<UserDoc>("users").updateOne({ _id: t._id }, { $unset: { shopSlug: "" } });
  await log(admin, t, "release-shop", t.shopSlug);
  return { ok: true, message: `“${t.shopSlug}” no longer has an owner.` };
}

/** Hand a user's shop to another account (by phone number). That account must not run a shop. */
export async function transferShop(userId: string, toPhone: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  const t = await target(userId);
  if (!t?.shopSlug) return { ok: false, error: "This account doesn't run a shop." };
  const digits = normalizePhone(toPhone);
  const db = await getDb();
  const to = await db.collection<UserDoc>("users").findOne({ phone: `+${digits}` });
  if (!to) return { ok: false, error: `No account with +${digits}. They need to sign up first.` };
  if (to._id === t._id) return { ok: false, error: "That's the same account." };
  if (to.shopSlug) return { ok: false, error: `${to.name} already runs “${to.shopSlug}”.` };
  await db.collection<ShopDoc>("shops").updateOne({ _id: t.shopSlug }, { $set: { ownerId: to._id } });
  await db.collection<UserDoc>("users").updateOne({ _id: to._id }, { $set: { shopSlug: t.shopSlug } });
  await db.collection<UserDoc>("users").updateOne({ _id: t._id }, { $unset: { shopSlug: "" } });
  await log(admin, t, "transfer-shop", `“${t.shopSlug}” → ${to.name} (${to.phone})`);
  await log(admin, to, "receive-shop", `“${t.shopSlug}” from ${t.name} (${t.phone})`);
  return { ok: true, message: `“${t.shopSlug}” now belongs to ${to.name}.` };
}
