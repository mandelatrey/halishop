/**
 * URL builders shared by server and client code. Vendor tools live under
 * `/dashboard/[slug]`, buyer pages under `/shop/[slug]`.
 */
export function dashPath(slug: string, path = ""): string {
  return `/dashboard/${slug}${path}`;
}

export function shopPath(slug: string, path = ""): string {
  return `/shop/${slug}${path}`;
}

/** Host used in human-readable links (captions, brand kit "shop URL"). */
export function appHost(): string {
  return process.env.NEXT_PUBLIC_APP_HOST || "shop.app";
}

/**
 * Slugs that would collide with vendor routes under /dashboard (e.g.
 * /dashboard/new) or read as official.
 */
export const RESERVED_SLUGS = new Set([
  "new", "account", "admin", "api", "app", "auth", "dashboard", "haali", "hali",
  "help", "login", "logout", "o", "settings", "shop", "shops", "signup", "support", "www",
]);

/** "Shania Collections!" → "shania-collections". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** An error message for a slug the vendor typed, or null if it's usable. */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "Use at least 3 letters or numbers for your shop link.";
  if (slug.length > 40) return "Keep your shop link under 40 characters.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug))
    return "Shop links can only use lowercase letters, numbers and dashes.";
  if (RESERVED_SLUGS.has(slug)) return "That shop link is reserved. Try another.";
  return null;
}
