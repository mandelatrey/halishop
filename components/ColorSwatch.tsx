"use client";

type Props<T extends string> = {
  value: T;
  options: T[];
  onChange: (v: T) => void;
};

export default function ColorSwatch<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="swatches">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          className={c === value ? "on" : ""}
          onClick={() => onChange(c)}
          aria-label={`Choose color ${c}`}
        >
          <span style={{ background: c }} />
        </button>
      ))}
    </div>
  );
}
