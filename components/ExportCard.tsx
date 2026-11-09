"use client";

import { forwardRef } from "react";
import StatusCard, { type StatusCardProps } from "./StatusCard";

/** Layout width the exported PNG is drawn at, before scaling to 1080×1920. */
export const EXPORT_LAYOUT_WIDTH = 360;

/**
 * Hidden, fixed-size copy of a status card used only for PNG export.
 *
 * Card sizes are computed from its width, so exporting the on-screen preview
 * (136px on a phone, 180–200px elsewhere) would bake in that cramped layout —
 * tiny footer text gets squeezed and clipped. Exporting this 360px copy instead
 * gives the same, roomy result on every device.
 */
const ExportCard = forwardRef<HTMLDivElement, Omit<StatusCardProps, "width">>(function ExportCard(props, ref) {
  return (
    <div
      aria-hidden
      style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}
    >
      <StatusCard ref={ref} {...props} width={EXPORT_LAYOUT_WIDTH} />
    </div>
  );
});

export default ExportCard;
