"use client";
// Mounts the style editor (Shift+Alt+E) under `npm run dev`. In a production build
// process.env.NODE_ENV is "production", so the import below is dropped and the editor never ships.
import { useEffect } from "react";

export default function StyleEditorMount() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("./StyleEditor").then((m) => m.mountStyleEditor());
    }
  }, []);
  return null;
}
