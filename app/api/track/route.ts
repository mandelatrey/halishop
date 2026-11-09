import { NextResponse, type NextRequest } from "next/server";
import { getCurrentVendor } from "@/lib/auth/session";
import { isBot, isEventType, recordEvent } from "@/lib/events";
import { getShopDoc } from "@/lib/server-store";

/**
 * Beacon endpoint for buyer activity (`navigator.sendBeacon`). Always answers
 * 204 so a tracking hiccup never surfaces to buyers.
 */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  try {
    if (isBot(req.headers.get("user-agent"))) return done;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.slug !== "string" || !isEventType(body.type)) return done;

    const shop = await getShopDoc(body.slug);
    if (!shop) return done;
    // A vendor browsing their own shop isn't a buyer — keep their numbers honest.
    const vendor = await getCurrentVendor();
    if (vendor && vendor.id === shop.ownerId) return done;

    await recordEvent({
      shopSlug: shop.slug,
      type: body.type,
      code: typeof body.code === "string" ? body.code : undefined,
      dropId: typeof body.dropId === "string" ? body.dropId : undefined,
    });
  } catch (err) {
    console.warn("[hali] track failed:", (err as Error).message);
  }
  return done;
}
