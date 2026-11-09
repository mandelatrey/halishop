import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Google sign-in (OAuth 2.0 authorization code + PKCE, OpenID Connect).
 * Enabled when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 *
 * Register this redirect URI in Google Cloud Console → APIs & Services →
 * Credentials → OAuth client (Web application):
 *   {APP_URL}/auth/google/callback
 */
export const GOOGLE_FLOW_COOKIE = "hali_google_flow";

export function googleEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Public origin of the app. APP_URL wins; otherwise the request's own origin. */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  return configured || new URL(req.url).origin;
}

export function redirectUri(req: Request): string {
  return `${appOrigin(req)}/auth/google/callback`;
}

export function newFlow() {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(req: Request, state: string, challenge: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri(req));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

/**
 * Exchange the code for tokens and read the ID token's claims. The ID token
 * comes straight from Google's token endpoint over TLS, which OpenID Connect
 * Core §3.1.3.7 allows in place of signature validation; we still check the
 * issuer, audience and expiry.
 */
export async function exchangeCode(req: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google returned no ID token");

  const payload = JSON.parse(Buffer.from(id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
  };
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com")
    throw new Error("Unexpected ID token issuer");
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("ID token is for another app");
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("ID token expired");
  if (!payload.sub || !payload.email) throw new Error("ID token is missing the account or email");

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name,
    picture: payload.picture,
  };
}
