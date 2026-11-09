"use client";

import { useState } from "react";

/** Shows a shareable link with Copy + Open buttons. Copies the absolute URL. */
export default function CopyLink({ display, path }: { display: string; path: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy your shop link:", url);
    }
  }
  return (
    <div className="ad-row" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <code className="db-shop-url" style={{ fontSize: 14, flex: "1 1 220px" }}>
        {display}
      </code>
      <button type="button" className="btn sec" style={{ width: "auto" }} onClick={copy}>
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      <a href={path} target="_blank" rel="noopener noreferrer" className="btn gh" style={{ width: "auto" }}>
        Open ↗
      </a>
    </div>
  );
}
