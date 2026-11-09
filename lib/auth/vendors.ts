import "server-only";
import { randomUUID } from "node:crypto";
import type { Vendor, VendorPublic } from "../types";
import { getDb } from "../db";

/** Stored shape. Secrets (passwordHash, googleId) never leave this module. */
export type VendorDoc = {
  _id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  passwordHash?: string;
  googleId?: string;
  createdAt: number;
  updatedAt: number;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function toVendor(doc: VendorDoc): Vendor {
  return {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    bio: doc.bio,
    avatar: doc.avatar,
    hasPassword: !!doc.passwordHash,
    hasGoogle: !!doc.googleId,
    createdAt: doc.createdAt,
  };
}

export function toVendorPublic(doc: Pick<VendorDoc, "name" | "bio" | "avatar" | "createdAt">): VendorPublic {
  return { name: doc.name, bio: doc.bio, avatar: doc.avatar, createdAt: doc.createdAt };
}

async function vendors() {
  return (await getDb()).collection<VendorDoc>("vendors");
}

let indexesReady: Promise<unknown> | null = null;
export function ensureAuthIndexes(): Promise<unknown> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb();
      await Promise.all([
        db.collection("vendors").createIndex({ email: 1 }, { unique: true }),
        db.collection("vendors").createIndex({ googleId: 1 }, { unique: true, sparse: true }),
        // Sessions expire on their own — Mongo's TTL monitor deletes them.
        db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("sessions").createIndex({ vendorId: 1 }),
        db.collection("shops").createIndex({ ownerId: 1 }),
      ]);
    })().catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
}

export async function findVendorById(id: string): Promise<VendorDoc | null> {
  return (await vendors()).findOne({ _id: id });
}

export async function findVendorByEmail(email: string): Promise<VendorDoc | null> {
  return (await vendors()).findOne({ email: normalizeEmail(email) });
}

export async function findVendorByGoogleId(googleId: string): Promise<VendorDoc | null> {
  return (await vendors()).findOne({ googleId });
}

export async function createVendor(input: {
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  avatar?: string;
}): Promise<VendorDoc> {
  await ensureAuthIndexes();
  const now = Date.now();
  const doc: VendorDoc = {
    _id: randomUUID(),
    email: normalizeEmail(input.email),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    googleId: input.googleId,
    avatar: input.avatar,
    createdAt: now,
    updatedAt: now,
  };
  // Drop undefined keys so the sparse googleId index stays sparse.
  for (const k of Object.keys(doc) as (keyof VendorDoc)[]) if (doc[k] === undefined) delete doc[k];
  await (await vendors()).insertOne(doc);
  await claimLegacyShops(doc);
  return doc;
}

export async function updateVendor(
  id: string,
  patch: Partial<Pick<VendorDoc, "name" | "bio" | "avatar" | "googleId" | "passwordHash">>
): Promise<void> {
  const $set: Record<string, unknown> = { updatedAt: Date.now() };
  const $unset: Record<string, ""> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") $unset[k] = "";
    else $set[k] = v;
  }
  await (await vendors()).updateOne({ _id: id }, Object.keys($unset).length ? { $set, $unset } : { $set });
}

/**
 * Shops created before vendor accounts existed have no owner. The vendor whose
 * email matches HALI_LEGACY_OWNER_EMAIL gets them the first time they sign in,
 * so the original single-shop deployment carries over without a migration.
 */
export async function claimLegacyShops(vendor: Pick<VendorDoc, "_id" | "email">): Promise<number> {
  const legacyEmail = process.env.HALI_LEGACY_OWNER_EMAIL;
  if (!legacyEmail || normalizeEmail(legacyEmail) !== vendor.email) return 0;
  const db = await getDb();
  const res = await db
    .collection("shops")
    .updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: vendor._id, updatedAt: Date.now() } });
  return res.modifiedCount;
}
