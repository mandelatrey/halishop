import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Shop, Vendor } from "../types";
import { getDb } from "../db";
import { getShopDoc } from "../server-store";
import { ensureAuthIndexes, findVendorById, toVendor } from "./vendors";

export const SESSION_COOKIE = "hali_session";
const SESSION_DAYS = 30;

type SessionDoc = {
  /** sha256 of the cookie token — a leaked DB row can't be replayed as a cookie. */
  _id: string;
  vendorId: string;
  createdAt: Date;
  expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

type SessionCookie = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires: Date;
};

/** Store a new session and return the cookie to set. For Route Handlers that build their own response. */
export async function issueSession(vendorId: string): Promise<SessionCookie> {
  await ensureAuthIndexes();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").insertOne({ _id: hashToken(token), vendorId, createdAt: now, expiresAt });
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

/** Start a session for `vendorId` and set the cookie. For Server Actions. */
export async function createSession(vendorId: string): Promise<void> {
  const cookie = await issueSession(vendorId);
  (await cookies()).set(cookie);
}

/** End the current session (if any) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: hashToken(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in vendor, or null. Memoised per request. */
export const getCurrentVendor = cache(async (): Promise<Vendor | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({ _id: hashToken(token) });
  // The TTL monitor only sweeps once a minute, so check expiry ourselves too.
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const doc = await findVendorById(session.vendorId);
  return doc ? toVendor(doc) : null;
});

/** For vendor pages: the signed-in vendor, or a redirect to /login. */
export async function requireVendor(next?: string): Promise<Vendor> {
  const vendor = await getCurrentVendor();
  if (!vendor) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return vendor;
}

/**
 * For vendor pages scoped to one shop: the shop, if the signed-in vendor owns
 * it. Someone else's shop 404s rather than 403s, so slugs can't be probed.
 */
export const requireOwnedShop = cache(async (slug: string): Promise<{ vendor: Vendor; shop: Shop }> => {
  const vendor = await requireVendor(`/dashboard/${slug}`);
  const shop = await getShopDoc(slug);
  if (!shop || shop.ownerId !== vendor.id) notFound();
  return { vendor, shop };
});

/**
 * For Server Actions: Server Actions are public POST endpoints, so every
 * mutation re-checks ownership instead of trusting the page that rendered it.
 */
export async function assertShopOwner(slug: string): Promise<{ vendor: Vendor; shop: Shop }> {
  const vendor = await getCurrentVendor();
  if (!vendor) throw new Error("You're signed out. Sign in again to save changes.");
  const shop = typeof slug === "string" ? await getShopDoc(slug) : null;
  if (!shop || shop.ownerId !== vendor.id) throw new Error("You don't have access to this shop.");
  return { vendor, shop };
}
