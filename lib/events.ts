import "server-only";
import type { ShopEventType } from "./types";
import { SHOP_EVENT_TYPES } from "./types";
import { getDb } from "./db";

export type EventDoc = {
  shopSlug: string;
  type: ShopEventType;
  code?: string;
  dropId?: string;
  ts: Date;
};

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|headless|lighthouse/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

export function isEventType(v: unknown): v is ShopEventType {
  return typeof v === "string" && (SHOP_EVENT_TYPES as string[]).includes(v);
}

/** Record one anonymous buyer event. No personal data is stored. */
export async function recordEvent(e: { shopSlug: string; type: ShopEventType; code?: string; dropId?: string }) {
  const db = await getDb();
  const doc: EventDoc = { shopSlug: e.shopSlug, type: e.type, ts: new Date() };
  if (e.code) doc.code = e.code.slice(0, 40);
  if (e.dropId) doc.dropId = e.dropId.slice(0, 40);
  await db.collection<EventDoc>("events").insertOne(doc);
}
