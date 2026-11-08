"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  flagEmoji,
  formatE164,
  parsePhone,
} from "@/lib/country-codes";

type Props = {
  /** Current value as canonical E.164 (e.g. "+256772145908") or empty. */
  value: string;
  /** Fires with the canonical E.164 string (or empty if the number is cleared). */
  onChange: (next: string) => void;
  /** Placeholder for the national-number part. */
  placeholder?: string;
  /** Fallback country code (defaults to Uganda). */
  defaultCc?: string;
  /** Whether to use `inputMode="tel"` (default true). */
  tel?: boolean;
  id?: string;
  className?: string;
};

/**
 * WhatsApp-friendly phone input: country selector on the left, national digits
 * on the right. Emits canonical E.164 strings (with a leading `+`) upward.
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder = "772 000 000",
  defaultCc = DEFAULT_COUNTRY.cc,
  tel = true,
  id,
  className,
}: Props) {
  const parsed = useMemo(() => parsePhone(value, defaultCc), [value, defaultCc]);
  const [cc, setCc] = useState(parsed.cc);
  const [national, setNational] = useState(parsed.national);

  // If the outside value changes (e.g. reset), re-sync the local state.
  useEffect(() => {
    setCc(parsed.cc);
    setNational(parsed.national);
  }, [parsed.cc, parsed.national]);

  function emit(nextCc: string, nextNational: string) {
    const cleaned = nextNational.replace(/[^\d]/g, "");
    onChange(cleaned ? formatE164(nextCc, cleaned) : "");
  }

  const currentCountry =
    COUNTRY_CODES.find((c) => c.cc === cc) ?? DEFAULT_COUNTRY;

  return (
    <div className={`phone-input${className ? ` ${className}` : ""}`}>
      <Select
        value={cc}
        onValueChange={(next: string | null) => {
          if (!next) return;
          setCc(next);
          emit(next, national);
        }}
      >
        <SelectTrigger
          className="phone-cc-trigger"
          aria-label="Country calling code"
        >
          <SelectValue>
            <span className="phone-flag">{flagEmoji(currentCountry.iso)}</span>
            <span className="phone-cc-num">+{currentCountry.cc}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="phone-cc-content">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.iso} value={c.cc}>
              <span className="phone-flag">{flagEmoji(c.iso)}</span>
              <span>{c.name}</span>
              <span className="phone-cc-hint">+{c.cc}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        id={id}
        className="phone-national"
        value={national}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          setNational(digits);
          emit(cc, digits);
        }}
        placeholder={placeholder}
        inputMode={tel ? "tel" : undefined}
        autoComplete="tel-national"
      />

      <style jsx global>{`
        .phone-input {
          display: flex;
          gap: 6px;
          align-items: stretch;
          width: 100%;
        }
        .phone-input :global(.phone-cc-trigger) {
          height: auto;
          padding: 8px 10px;
          gap: 6px;
          background: #fff;
          border-radius: var(--radius);
          font: 500 11.5px/1 "DM Sans", sans-serif;
          color: var(--color-text);
          flex: 0 0 auto;
        }
        .phone-input :global(.phone-cc-content) {
          font-family: "DM Sans", sans-serif;
        }
        .phone-flag {
          font-size: 15px;
          line-height: 1;
        }
        .phone-cc-num {
          font-family: ui-monospace, Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.02em;
        }
        .phone-cc-hint {
          font-family: ui-monospace, Menlo, monospace;
          font-size: 10px;
          color: var(--color-mute-2);
          margin-left: auto;
        }
        .phone-national {
          flex: 1 1 auto;
          min-width: 0;
          border: 1px solid var(--stroke-soft);
          background: #fff;
          padding: 9px 11px;
          font: 400 11.5px/1.2 "DM Sans", sans-serif;
          color: var(--color-text);
          border-radius: var(--radius);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .phone-national::placeholder {
          color: var(--color-mute-2);
        }
        .phone-national:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
        }
      `}</style>
    </div>
  );
}
