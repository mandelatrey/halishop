"use server";

import { revalidatePath } from "next/cache";
import { getCurrentVendor } from "../auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "../auth/password";
import { findVendorById, updateVendor } from "../auth/vendors";

export type ProfileInput = { name: string; bio?: string; avatar?: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

// Uploaded photos are stored inline as data URLs; keep them small.
const MAX_AVATAR_CHARS = 400_000;

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const vendor = await getCurrentVendor();
  if (!vendor) return { ok: false, error: "You're signed out. Sign in again to save." };

  const name = String(input.name ?? "").trim();
  const bio = String(input.bio ?? "").trim();
  const avatar = String(input.avatar ?? "");
  if (!name) return { ok: false, error: "Your name can't be empty." };
  if (name.length > 80) return { ok: false, error: "That name is too long." };
  if (bio.length > 500) return { ok: false, error: "Keep your bio under 500 characters." };
  if (avatar && !/^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(avatar))
    return { ok: false, error: "That photo format isn't supported." };
  if (avatar.length > MAX_AVATAR_CHARS) return { ok: false, error: "That photo is too large. Try a smaller one." };

  await updateVendor(vendor.id, { name, bio, avatar });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/shop", "layout");
  return { ok: true };
}

/**
 * Set or change the password. Google-only vendors can add one; changing an
 * existing password needs the current one.
 */
export async function setPassword(current: string, password: string): Promise<ActionResult> {
  const vendor = await getCurrentVendor();
  if (!vendor) return { ok: false, error: "You're signed out. Sign in again to save." };
  const doc = await findVendorById(vendor.id);
  if (doc?.passwordHash && !(await verifyPassword(String(current ?? ""), doc.passwordHash)))
    return { ok: false, error: "Your current password isn't right." };
  const problem = passwordProblem(String(password ?? ""));
  if (problem) return { ok: false, error: problem };
  await updateVendor(vendor.id, { passwordHash: await hashPassword(password) });
  revalidatePath("/dashboard/account");
  return { ok: true };
}
