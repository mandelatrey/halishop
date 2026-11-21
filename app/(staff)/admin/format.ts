// Formatting for the admin pages (rendered on the server, so in one fixed time zone).
const TZ = process.env.HALI_TIME_ZONE || "Africa/Kampala";

export function formatWhen(ts: number, time = true): string {
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const ACTIONS: Record<string, string> = {
  "reset-password": "reset the password of",
  "sign-out-everywhere": "signed out",
  disable: "turned off",
  enable: "turned back on",
  "edit-profile": "edited",
  "make-admin": "made an admin:",
  "remove-admin": "removed admin from",
  "release-shop": "released the shop of",
  "transfer-shop": "moved the shop of",
  "receive-shop": "gave a shop to",
};
export const describeAction = (a: string) => ACTIONS[a] ?? a;
