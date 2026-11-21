import "server-only";
import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDb } from "./db";

/**
 * Accounts: phone number + password, for sellers and buyers alike. A user is
 * a buyer; a user with `shopSlug` also runs that shop.
 *
 * Passwords are hashed with scrypt (Node's crypto, per-user salt). Sessions
 * are random tokens in an httpOnly cookie; only a SHA-256 of the token is
 * stored, so a database leak doesn't hand out live sessions.
 *
 * Phone numbers are not verified (no SMS/WhatsApp code yet): anyone can sign
 * up with any number. Nothing here trusts a number as proof of identity.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "hali_session";
const SESSION_DAYS = 30;

export type UserDoc = {
  _id: string;
  /** E.164 with "+" — "+256772145908". Unique. */
  phone: string;
  name: string;
  passwordHash: string; // hex
  salt: string; // hex
  /** The shop this user runs, if they sell. */
  shopSlug?: string;
  /** Shops they follow (slugs). */
  favorites: string[];
  createdAt: number;
  /** Haali team: can manage users at /admin. Granted by scripts/make-admin.mjs or another admin. */
  role?: "admin";
  /** Turned off by an admin: can't sign in, sessions ended. */
  disabled?: boolean;
  /** Signed in with a temporary password from an admin: must choose a new one first. */
  mustChangePassword?: boolean;
};

/** What pages and components get: never the password fields. */
export type User = Omit<UserDoc, "_id" | "passwordHash" | "salt"> & { id: string };

type SessionDoc = { _id: string; userId: string; expiresAt: Date; createdAt: Date };

const toUser = (d: UserDoc): User => ({
  id: d._id,
  phone: d.phone,
  name: d.name,
  shopSlug: d.shopSlug,
  favorites: d.favorites ?? [],
  createdAt: d.createdAt,
  role: d.role,
  mustChangePassword: d.mustChangePassword,
});

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(password: string): Promise<{ passwordHash: string; salt: string }> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { passwordHash: hash.toString("hex"), salt: salt.toString("hex") };
}

export async function verifyPassword(password: string, user: Pick<UserDoc, "passwordHash" | "salt">): Promise<boolean> {
  const hash = await scrypt(password, Buffer.from(user.salt, "hex"), 64);
  const stored = Buffer.from(user.passwordHash, "hex");
  return stored.length === hash.length && timingSafeEqual(stored, hash);
}

let indexed: Promise<void> | null = null;
/** Indexes for accounts, created once per process. */
export function ensureAuthIndexes(): Promise<void> {
  indexed ??= (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection<UserDoc>("users").createIndex({ phone: 1 }, { unique: true }),
      db.collection<SessionDoc>("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("orders").createIndex({ shopSlug: 1, createdAt: -1 }),
      db.collection("orders").createIndex({ userId: 1, createdAt: -1 }),
      db.collection<SessionDoc>("sessions").createIndex({ userId: 1 }),
      db.collection("admin_log").createIndex({ targetId: 1, at: -1 }),
      db.collection("admin_log").createIndex({ at: -1 }),
    ]);
  })().catch((e) => {
    indexed = null;
    throw e;
  });
  return indexed;
}

export async function findUserByPhone(phone: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ phone });
}

/** Start a session for a user and set the cookie. Call from a server action. */
export async function startSession(userId: string): Promise<void> {
  await ensureAuthIndexes();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = await getDb();
  await db.collection<SessionDoc>("sessions").insertOne({ _id: sha256(token), userId, expiresAt, createdAt: new Date() });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** End the current session (cookie + record). Call from a server action. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({ _id: sha256(token) });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const user = await db.collection<UserDoc>("users").findOne({ _id: session.userId });
  return user && !user.disabled ? toUser(user) : null;
});

/** End every session a user has (password reset, turned off, "sign out everywhere"). Keeps `except`. */
export async function endAllSessions(userId: string, except?: string): Promise<number> {
  const db = await getDb();
  const filter = except ? { userId, _id: { $ne: except } } : { userId };
  const res = await db.collection<SessionDoc>("sessions").deleteMany(filter);
  return res.deletedCount;
}

/** The current session's stored id (hash), to keep it while ending the others. */
export async function currentSessionId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/** Signed-in user, or off to /login (and back to `next` afterwards). Someone on a temporary
 *  password goes to choose a new one first. */
export async function requireUser(next = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.mustChangePassword) redirect(`/account/password?next=${encodeURIComponent(next)}`);
  return user;
}

/** Haali team only. Anyone else gets a plain 404 — the admin area doesn't announce itself. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

/** Signed-in seller with a shop; sellers without one go to set it up. */
export async function requireSeller(next = "/orders"): Promise<User & { shopSlug: string }> {
  const user = await requireUser(next);
  if (!user.shopSlug) redirect("/seller/setup");
  return user as User & { shopSlug: string };
}

/** Where to send someone after signing in: a safe same-site path only. */
export function safeNext(next: unknown, fallback: string): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** A temporary password an admin can read out or send: 12 easy characters in three groups. */
export function temporaryPassword(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = () => abc[randomInt(abc.length)];
  return [0, 1, 2].map(() => Array.from({ length: 4 }, pick).join("")).join("-");
}
