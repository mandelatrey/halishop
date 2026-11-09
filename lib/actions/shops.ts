"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import type { Shop } from "../types";
import { getDb } from "../db";
import { getCurrentVendor } from "../auth/session";
import { DEFAULT_BRAND_KIT } from "../fixtures";
import { appHost, dashPath, slugify, slugProblem } from "../paths";
import { normalizePhone } from "../wa";

type ShopDoc = Shop & { _id: string };

export type CreateShopState =
  | { error?: string; values?: Record<string, string> }
  | undefined;

/** "Shania Collections" → "SC-4F2". Short, readable, unlikely to clash. */
function makeRefPrefix(name: string): string {
  const initials =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2) || "SH";
  const tail = randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
  return `${initials}-${tail}`;
}

export async function createShop(_prev: CreateShopState, form: FormData): Promise<CreateShopState> {
  const vendor = await getCurrentVendor();
  if (!vendor) redirect("/login?next=/dashboard/new");

  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const values = {
    name: get("name"),
    slug: get("slug").toLowerCase(),
    whatsapp: get("whatsapp"),
    city: get("city"),
    area: get("area"),
  };

  if (!values.name) return { values, error: "Give your shop a name." };
  if (values.name.length > 60) return { values, error: "Keep the shop name under 60 characters." };
  const slug = values.slug || slugify(values.name);
  const problem = slugProblem(slug);
  if (problem) return { values: { ...values, slug }, error: problem };
  const digits = normalizePhone(values.whatsapp);
  if (digits.length < 8 || digits.length > 15)
    return { values, error: "Enter the WhatsApp number orders should go to, including the country code." };

  const whatsapp = `+${digits}`;
  const now = Date.now();
  const shop: Shop = {
    slug,
    ownerId: vendor.id,
    brandKit: {
      ...DEFAULT_BRAND_KIT,
      shopName: values.name,
      shopUrl: `${appHost()}/shop/${slug}`,
      logo: undefined,
      whatsapp,
    },
    contact: {
      whatsapp,
      city: values.city || undefined,
      area: values.area || undefined,
      cityCopy: values.city ? `delivery today in ${values.city}` : undefined,
    },
    about: { showOwner: true },
    refPrefix: makeRefPrefix(values.name),
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  try {
    await db.collection<ShopDoc>("shops").insertOne({ _id: slug, ...JSON.parse(JSON.stringify(shop)) });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      return { values: { ...values, slug }, error: "That shop link is taken. Try another." };
    throw err;
  }
  redirect(dashPath(slug));
}
