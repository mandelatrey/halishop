"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { ProductCategory, ProductOption } from "@/lib/types";
import { CATEGORY_OPTIONS, MAX_OPTIONS, optionKind, suggestValues } from "@/lib/variants";

/**
 * Product options editor: option types (Size, Colour, Storage…) suggested by
 * category, each with tap-to-add value chips suggested by type + category and
 * by values already used elsewhere in the catalogue. Typing is still allowed:
 * Enter or comma adds a value, Backspace on an empty box removes the last.
 */
export default function OptionsEditor({
  category,
  options,
  onChange,
  learned,
}: {
  category: ProductCategory;
  options: ProductOption[];
  onChange: (next: ProductOption[]) => void;
  learned: Partial<Record<string, string[]>>;
}) {
  const listId = useId();
  const present = new Set(options.map((o) => optionKind(o.label) + ":" + o.label.trim().toLowerCase()));
  const presentKinds = new Set(options.map((o) => optionKind(o.label)));
  const addable = CATEGORY_OPTIONS[category].suggested.filter((l) => {
    const k = optionKind(l);
    return k === "other" ? !present.has(`other:${l.toLowerCase()}`) : !presentKinds.has(k);
  });
  const full = options.length >= MAX_OPTIONS;

  function update(i: number, next: ProductOption) {
    onChange(options.map((o, j) => (j === i ? next : o)));
  }
  function remove(i: number) {
    onChange(options.filter((_, j) => j !== i));
  }
  function add(label: string) {
    if (full) return;
    onChange([...options, { label, values: [] }]);
  }

  return (
    <div className="ad-opts">
      <div className="ad-opts-head">
        <span className="k">Options</span>
        <span className="ad-hint">Buyers pick one of each when they order.</span>
      </div>

      {options.map((o, i) => (
        <OptionRow
          key={i}
          option={o}
          category={category}
          learned={learned}
          listId={listId}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
        />
      ))}

      {!full && (
        <div className="ad-opts-add">
          {addable.map((l) => (
            <button key={l} type="button" className="ad-chip ad-chip-add" onClick={() => add(l)}>
              + {l}
            </button>
          ))}
          <button type="button" className="ad-chip ad-chip-add ghost" onClick={() => add("")}>
            + Other option
          </button>
        </div>
      )}
      {full && <span className="ad-hint">Up to {MAX_OPTIONS} options per product.</span>}

      <datalist id={listId}>
        {CATEGORY_OPTIONS[category].suggested.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </div>
  );
}

function OptionRow({
  option,
  category,
  learned,
  listId,
  onChange,
  onRemove,
}: {
  option: ProductOption;
  category: ProductCategory;
  learned: Partial<Record<string, string[]>>;
  listId: string;
  onChange: (next: ProductOption) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState("");
  const suggestions = suggestValues(option.label, category, option.values, learned).slice(0, 12);

  function addValues(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((v) => !option.values.some((x) => x.toLowerCase() === v.toLowerCase()));
    if (parts.length) onChange({ ...option, values: [...option.values, ...parts] });
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValues(text);
      setText("");
    } else if (e.key === "Backspace" && !text && option.values.length) {
      onChange({ ...option, values: option.values.slice(0, -1) });
    }
  }

  return (
    <div className="ad-opt">
      <div className="ad-opt-top">
        <input
          className="inp ad-opt-label"
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
          placeholder="Option name, e.g. Colour"
          list={listId}
          aria-label="Option name"
        />
        <button type="button" className="ad-opt-remove" onClick={onRemove} aria-label={`Remove ${option.label || "option"}`}>
          ×
        </button>
      </div>

      <div className="ad-opt-values">
        {option.values.map((v) => (
          <span key={v} className="ad-chip on">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange({ ...option, values: option.values.filter((x) => x !== v) })}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="ad-opt-input"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            // Pasting "S, M, L" adds them all at once.
            if (v.includes(",")) {
              const lastComma = v.lastIndexOf(",");
              addValues(v.slice(0, lastComma));
              setText(v.slice(lastComma + 1));
            } else setText(v);
          }}
          onKeyDown={onKey}
          onBlur={() => {
            if (text.trim()) {
              addValues(text);
              setText("");
            }
          }}
          placeholder={option.values.length ? "Add another…" : "Type a value and press Enter"}
          aria-label={`${option.label || "Option"} values`}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="ad-opt-suggest">
          <span className="ad-hint">Suggested:</span>
          {suggestions.map((v) => (
            <button key={v} type="button" className="ad-chip sm" onClick={() => addValues(v)}>
              + {v}
            </button>
          ))}
          {suggestions.length > 1 && (
            <button type="button" className="ad-chip sm ghost" onClick={() => addValues(suggestions.join(","))}>
              Add all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
