#!/usr/bin/env node
// Make (or unmake) a Haali admin — the way to create the first one, since phone
// numbers aren't verified and an "admins are these numbers" setting could be
// taken by whoever signs up first. It needs the database itself, so only
// someone with MONGODB_URI can run it. After that, admins can promote others
// from /admin.
//
//   npm run make-admin -- +256772145908
//   npm run make-admin -- +256772145908 --remove
//
// Reads MONGODB_URI / MONGODB_DB from the environment or from .env.local.
import { readFileSync, existsSync } from "node:fs";
import { MongoClient } from "mongodb";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const raw = args.find((a) => !a.startsWith("--"));
if (!raw) {
  console.error("Usage: npm run make-admin -- <phone, e.g. +256772145908> [--remove]");
  process.exit(1);
}
const digits = raw.replace(/\D/g, "");
const phone = `+${digits.startsWith("0") ? "256" + digits.slice(1) : digits}`;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI isn't set (in the environment or .env.local).");
  process.exit(1);
}
const client = await MongoClient.connect(process.env.MONGODB_URI);
try {
  const users = client.db(process.env.MONGODB_DB ?? "hali").collection("users");
  const user = await users.findOne({ phone });
  if (!user) {
    console.error(`No account with ${phone}. Sign up with that number first, then run this again.`);
    process.exitCode = 1;
  } else {
    await users.updateOne({ _id: user._id }, remove ? { $unset: { role: "" } } : { $set: { role: "admin" } });
    await client.db(process.env.MONGODB_DB ?? "hali").collection("admin_log").insertOne({
      at: Date.now(), adminId: null, adminName: "make-admin script", targetId: user._id, targetName: user.name,
      action: remove ? "remove-admin" : "make-admin", detail: phone,
    });
    console.log(`${user.name} (${phone}) is ${remove ? "no longer an admin" : "now an admin — sign in and open /admin"}.`);
  }
} finally {
  await client.close();
}
