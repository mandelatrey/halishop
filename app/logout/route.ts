import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/auth/session";

/** POST-only so a stray link or image can't sign a vendor out. */
export async function POST(req: Request) {
  await destroySession();
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
