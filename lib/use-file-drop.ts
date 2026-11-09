"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

/** Images are stored as data URLs inside MongoDB documents (16 MB max), so cap uploads. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Shared drag-and-drop for image uploads. Returns props to spread on the drop
 * zone plus `dragging` / `error` state.
 *
 * - Counts dragenter/dragleave so the highlight doesn't flicker when the
 *   pointer passes over child elements (the usual dragleave bug).
 * - Only reacts to drags that carry files (not selected text or links).
 * - Validates type and size, and reports a readable error instead of
 *   silently ignoring the drop.
 * - Marks the zone with `data-dropzone` so <DropGuard> lets drops through.
 */
export function useFileDrop(
  onFile: (file: File) => void,
  { accept = ["image/"], maxBytes = MAX_UPLOAD_BYTES }: { accept?: string[]; maxBytes?: number } = {}
) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const depth = useRef(0);

  const check = useCallback(
    (file: File | undefined): file is File => {
      if (!file) return false;
      const ok = accept.some((a) => (a.endsWith("/") ? file.type.startsWith(a) : file.type === a));
      if (!ok) {
        setError(`“${file.name}” isn't a supported image. Use a PNG or JPG.`);
        return false;
      }
      if (file.size > maxBytes) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        setError(`That image is ${mb} MB — please use one under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
        return false;
      }
      setError(null);
      return true;
    },
    [accept, maxBytes]
  );

  /** Use for the hidden <input type=file> too, so both paths validate the same way. */
  const take = useCallback(
    (file: File | undefined) => {
      if (check(file)) onFile(file);
    },
    [check, onFile]
  );

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const dropProps = {
    "data-dropzone": "",
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      take(e.dataTransfer.files?.[0]);
    },
  };

  return { dragging, error, setError, take, dropProps };
}
