/** Human copy for `?error=` codes from the Google sign-in routes. */
export const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server yet. Use email and password for now.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "That sign-in link expired. Please try again.",
  google_failed: "We couldn't reach Google just now. Please try again.",
  google_unverified: "Your Google email isn't verified, so we can't use it to sign in.",
  google_conflict: "That email is already linked to a different Google account.",
};
