/**
 * Next.js instrumentation hook — runs once at server start, before any HTTP
 * request lands. Pre-warms the MongoDB connection so the first user request
 * doesn't pay the full topology-discovery + seed cost.
 *
 * The `mongodb` driver is Node-only; we hide it behind a dynamic import of
 * `instrumentation-node.ts` so the Edge runtime bundle never sees it.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { warmup } = await import("./instrumentation-node");
  const slug = process.env.NEXT_PUBLIC_SHOP_SLUG || "shania";

  // Fire and forget — errors are logged inside `warmup`, and the first real
  // request will retry via the same cached promises in `lib/db.ts`.
  void warmup(slug);
}
