/**
 * WhatsApp-style "read" double tick for message-bubble previews. Drawn as SVG
 * so the two ticks sit tight together in every browser — the "✓✓" characters
 * were spaced differently depending on the font (wide in Firefox).
 */
export default function ReadTicks({ color = "#53bdeb" }: { color?: string }) {
  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      aria-label="Read"
      role="img"
      style={{ display: "inline-block", verticalAlign: "-1px" }}
    >
      <path
        d="M1 6l3 3 6.5-7.5M6.5 8.5l.5.5 6.5-7.5"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
