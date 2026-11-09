/**
 * Node.js-only warmup. Kept in its own file so `import "mongodb"` only lands
 * in the Node bundle — the Edge instrumentation entry never touches it and
 * Next.js won't try to resolve Node's `net` module for browser targets.
 */
import { getDb } from "./lib/db";
import { demoShopSlug, ensureDemoSeeded } from "./lib/seed";

export async function warmup(): Promise<void> {
  try {
    await getDb();
    await ensureDemoSeeded();
    const slug = demoShopSlug();
    // eslint-disable-next-line no-console
    console.log(`[hali] warmup complete — mongo ready${slug ? `, demo shop "${slug}" seeded` : ""}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[hali] warmup failed (${(err as Error).message}); first request will retry`
    );
  }
}
