"use client";

import { useRef, useState, useTransition } from "react";
import Button from "@/components/Button";
import { Avatar } from "@/components/SellerCard";
import { saveProfile, setPassword } from "@/lib/actions/account";

/** Downscale an uploaded photo to a 256px square JPEG data URL. */
async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const size = 256;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type V = { name: string; email: string; bio?: string; avatar?: string; hasPassword: boolean; hasGoogle: boolean };

export default function AccountClient({
  vendor,
  googleEnabled,
  justLinked,
}: {
  vendor: V;
  googleEnabled: boolean;
  justLinked: boolean;
}) {
  const [name, setName] = useState(vendor.name);
  const [bio, setBio] = useState(vendor.bio ?? "");
  const [avatar, setAvatar] = useState(vendor.avatar ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    justLinked ? { ok: true, text: "Google is now linked — you can sign in with it." } : null
  );
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hasPassword, setHasPassword] = useState(vendor.hasPassword);

  function saveProfileNow() {
    start(async () => {
      const res = await saveProfile({ name, bio, avatar });
      setMsg(res.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: res.error });
    });
  }

  function savePassword() {
    start(async () => {
      const res = await setPassword(current, pw);
      if (res.ok) {
        setHasPassword(true);
        setCurrent("");
        setPw("");
      }
      setPwMsg(res.ok ? { ok: true, text: "Password saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="ad-split">
      <div className="ad-stack">
        <section className="panel">
          <h2 className="section-title">Profile</h2>
          {msg && (
            <div className={msg.ok ? "ad-flash" : "ad-alert"} role="status" style={{ marginBottom: 12 }}>
              {msg.text}
            </div>
          )}
          <div className="ad-form">
            <div className="ad-row" style={{ alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Avatar name={name || vendor.email} src={avatar || undefined} size={64} />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setAvatar(await toAvatar(f));
                  e.target.value = "";
                }}
              />
              <Button variant="sec" onClick={() => fileRef.current?.click()}>
                {avatar ? "Change photo" : "Add a photo"}
              </Button>
              {avatar && (
                <Button variant="gh" onClick={() => setAvatar("")}>
                  Remove
                </Button>
              )}
            </div>
            <label className="ad-field">
              <span className="k">Name</span>
              <input className="inp" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="ad-field">
              <span className="k">Bio</span>
              <textarea
                className="inp"
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A line or two about you — buyers like knowing who they're dealing with."
              />
              <span className="ad-hint">{bio.length}/500</span>
            </label>
            <Button onClick={saveProfileNow} disabled={pending} style={{ alignSelf: "flex-start", minWidth: 160 }}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </section>
      </div>

      <aside className="ad-stack">
        <section className="panel">
          <h2 className="section-title">Sign-in</h2>
          <div className="ad-form">
            <div className="ad-field">
              <span className="k">Email</span>
              <span>{vendor.email}</span>
            </div>
            <div className="ad-field">
              <span className="k">Google</span>
              {vendor.hasGoogle ? (
                <span>Linked ✓</span>
              ) : googleEnabled ? (
                <a href={`/auth/google?next=${encodeURIComponent("/dashboard/account?linked=google")}`} className="btn sec" style={{ width: "auto", alignSelf: "flex-start" }}>
                  Link Google account
                </a>
              ) : (
                <span className="ad-hint">Not available on this server.</span>
              )}
            </div>
            <div className="ad-field">
              <span className="k">{hasPassword ? "Change password" : "Add a password"}</span>
              {pwMsg && (
                <div className={pwMsg.ok ? "ad-flash" : "ad-alert"} role="status">
                  {pwMsg.text}
                </div>
              )}
              {hasPassword && (
                <input
                  className="inp"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Current password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              )}
              <input
                className="inp"
                type="password"
                autoComplete="new-password"
                placeholder="New password (8+ characters)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <Button variant="sec" onClick={savePassword} disabled={pending || pw.length < 8} style={{ alignSelf: "flex-start" }}>
                Save password
              </Button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
