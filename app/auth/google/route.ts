import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_FLOW_COOKIE, authorizeUrl, googleEnabled, newFlow } from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/next";

/** Step 1: send the vendor to Google's account picker. */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  }
  const { state, verifier, challenge } = newFlow();
  const next = safeNext(req.nextUrl.searchParams.get("next")) ?? "";
  const res = NextResponse.redirect(authorizeUrl(req, state, challenge));
  res.cookies.set(GOOGLE_FLOW_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return res;
}
