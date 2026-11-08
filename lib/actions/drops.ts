"use server";

import { revalidatePath } from "next/cache";
import type {
  CaptionVariantKind,
  Drop,
  DropCaption,
  DropExpiry,
  DropItem,
} from "../types";
import { getDb } from "../db";
import { ensureSeeded } from "../seed";
import { DEFAULT_CAPTIONS } from "../captions";
import { getShopSlug } from "./_slug";

type DropDoc = Drop & { _id: string };

function randomBase36(len = 3): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function generateDropId(slug: string): Promise<string> {
  const db = await getDb();
  const drops = db.collection<DropDoc>("drops");
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = randomBase36(3);
    const existing = await drops.findOne(
      { _id: `${slug}:${id}` },
      { projection: { _id: 1 } }
    );
    if (!existing) return id;
  }
  // Widen to 4 chars if we hit too many collisions (shouldn't happen at phase-1 scale).
  return randomBase36(4);
}

function seedCaptions(): DropCaption[] {
  return (Object.keys(DEFAULT_CAPTIONS) as CaptionVariantKind[]).map((variant) => ({
    variant,
    text: DEFAULT_CAPTIONS[variant],
  }));
}

export type CreateDropInput = {
  name?: string;
  productCodes: string[];
  expiry: DropExpiry;
  templateId: string;
  showPrice: boolean;
  codeFormat: "short" | "full";
};

export async function createDrop(input: CreateDropInput): Promise<Drop> {
  const slug = getShopSlug();
  await ensureSeeded(slug);
  const db = await getDb();
  const id = await generateDropId(slug);
  const now = Date.now();

  const items: DropItem[] = input.productCodes.map((code) => ({
    code,
    captions: seedCaptions(),
    activeCaption: "default",
  }));

  const doc: Drop = {
    id,
    shopSlug: slug,
    name: input.name?.trim() || "Today's drop",
    createdAt: now,
    postedAt: now,
    expiry: input.expiry,
    items,
    templateId: input.templateId,
    cardConfig: {
      showPrice: input.showPrice,
      codeFormat: input.codeFormat,
    },
  };

  await db.collection<DropDoc>("drops").insertOne({ _id: `${slug}:${id}`, ...doc });

  revalidatePath("/drops");
  revalidatePath(`/drops/${id}`);
  revalidatePath(`/shop/${slug}/d/${id}`);
  return doc;
}

export async function updateDropItems(dropId: string, items: DropItem[]): Promise<void> {
  const slug = getShopSlug();
  const db = await getDb();
  await db.collection<DropDoc>("drops").updateOne(
    { _id: `${slug}:${dropId}` },
    { $set: { items } }
  );
  revalidatePath(`/drops/${dropId}`);
  revalidatePath(`/shop/${slug}/d/${dropId}`);
}

export async function deleteDrop(dropId: string): Promise<void> {
  const slug = getShopSlug();
  const db = await getDb();
  await db.collection<DropDoc>("drops").deleteOne({ _id: `${slug}:${dropId}` });
  revalidatePath("/drops");
  revalidatePath(`/shop/${slug}/d/${dropId}`);
}
