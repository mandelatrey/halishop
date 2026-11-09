/**
 * Only allow same-site relative paths as post-login destinations — otherwise
 * `/login?next=https://evil.example` becomes an open redirect.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/login") || next.startsWith("/signup") || next.startsWith("/auth/")) return null;
  return next;
}
