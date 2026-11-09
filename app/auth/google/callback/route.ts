import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_FLOW_COOKIE, appOrigin, exchangeCode, googleEnabled } from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/next";
import { getCurrentVendor, issueSession } from "@/lib/auth/session";
import {
  claimLegacyShops,
  createVendor,
  findVendorByEmail,
  findVendorByGoogleId,
  normalizeEmail,
  updateVendor,
} from "@/lib/auth/vendors";

/** Step 2: Google sends the vendor back here with a one-time code. */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    res.cookies.delete({ name: GOOGLE_FLOW_COOKIE, path: "/auth/google" });
    return res;
  };

  if (!googleEnabled()) return fail("google_unavailable");
  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_cancelled");

  let flow: { state?: string; verifier?: string; next?: string } = {};
  try {
    flow = JSON.parse(req.cookies.get(GOOGLE_FLOW_COOKIE)?.value ?? "{}");
  } catch {
    /* fall through to the state check */
  }
  const code = params.get("code");
  if (!code || !flow.state || !flow.verifier || params.get("state") !== flow.state) return fail("google_state");

  let profile;
  try {
    profile = await exchangeCode(req, code, flow.verifier);
  } catch (err) {
    console.warn("[hali] google sign-in failed:", (err as Error).message);
    return fail("google_failed");
  }

  // 0) Already signed in (linking from the Account page): attach Google to
  //    this vendor, whatever email it uses.
  // 1) Returning Google user. 2) Existing email account — link it, but only if
  //    Google has verified the address. 3) Brand-new vendor.
  let vendor = await findVendorByGoogleId(profile.sub);
  const signedIn = await getCurrentVendor();
  if (signedIn) {
    if (vendor && vendor._id !== signedIn.id) return fail("google_conflict");
    if (!vendor) await updateVendor(signedIn.id, { googleId: profile.sub, avatar: signedIn.avatar || profile.picture });
    const res = NextResponse.redirect(new URL(safeNext(flow.next) ?? "/dashboard/account", origin));
    res.cookies.delete({ name: GOOGLE_FLOW_COOKIE, path: "/auth/google" });
    return res;
  }
  if (!vendor) {
    if (!profile.emailVerified) return fail("google_unverified");
    const byEmail = await findVendorByEmail(profile.email);
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== profile.sub) return fail("google_conflict");
      await updateVendor(byEmail._id, { googleId: profile.sub, avatar: byEmail.avatar || profile.picture });
      vendor = byEmail;
    } else {
      vendor = await createVendor({
        email: normalizeEmail(profile.email),
        name: profile.name || profile.email.split("@")[0],
        googleId: profile.sub,
        avatar: profile.picture,
      });
    }
  }

  await claimLegacyShops(vendor);
  const session = await issueSession(vendor._id);
  const res = NextResponse.redirect(new URL(safeNext(flow.next) ?? "/dashboard", origin));
  res.cookies.set(session);
  res.cookies.delete({ name: GOOGLE_FLOW_COOKIE, path: "/auth/google" });
  return res;
}
