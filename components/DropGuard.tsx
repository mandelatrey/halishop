"use client";

import { useEffect } from "react";

/**
 * If a file is dropped anywhere that isn't an upload zone, browsers navigate
 * to it (opening the image in the tab) and any unsaved form changes are lost.
 * This cancels drops outside elements marked `data-dropzone`.
 */
export default function DropGuard() {
  useEffect(() => {
    const outsideZone = (e: DragEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.("[data-dropzone]")) return;
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", outsideZone);
    window.addEventListener("drop", outsideZone);
    return () => {
      window.removeEventListener("dragover", outsideZone);
      window.removeEventListener("drop", outsideZone);
    };
  }, []);
  return null;
}
