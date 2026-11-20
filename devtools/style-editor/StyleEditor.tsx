"use client";
// The style editor: a development-only panel for adjusting the app's CSS by pointing at the page.
// Open it with Shift+Alt+E (or the "Styles" button), click Pick (or Alt+click anything), adjust
// sizes, spacing and alignment with live preview, then Save (Ctrl/Cmd+S) to write the change into
// the .css file the rule came from. Never part of the production build (see Mount.tsx).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  cascade, conditionLabel, defaultTarget, inheritedFrom, label, shortFile, store, suggestSelector, type Cascade, type Match,
} from "./model";
import { nudge, readProp, writeProp, writeSides, type Decl, type Side } from "./shared";
import "./styleEditor.css";

const OPEN_KEY = "hali-style-editor";
const DOCK_KEY = "hali-style-editor-dock";
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const PROPS = [
  "font-size", "line-height", "font-weight", "letter-spacing", "text-align", "padding", "padding-top", "padding-right",
  "padding-bottom", "padding-left", "margin", "margin-top", "margin-bottom", "gap", "row-gap", "column-gap", "max-width",
  "width", "min-width", "height", "justify-content", "align-items", "align-content", "justify-items", "grid-template-columns",
  "flex-direction", "flex-wrap", "border-radius", "color", "background", "text-wrap", "white-space",
];

let host: HTMLElement | null = null;

export function mountStyleEditor() {
  if (host) return;
  host = document.createElement("div");
  host.id = "style-editor";
  document.body.appendChild(host);
  createRoot(host).render(<StyleEditor />);
  void store.load();
  watchStylesheets();
}

/** Next added, swapped or dropped a stylesheet (our save, an edit in your code editor, or a route
 *  with its own CSS): read the rules again once the new sheet has loaded. */
function watchStylesheets() {
  let timer = 0;
  const reload = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void store.load(), 120);
  };
  const isSheet = (n: Node) => n instanceof HTMLLinkElement ? n.rel === "stylesheet" : n instanceof HTMLStyleElement;
  new MutationObserver((records) => {
    let changed = false;
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!isSheet(n)) continue;
        changed = true;
        if (n instanceof HTMLLinkElement && !n.sheet) n.addEventListener("load", reload, { once: true });
      }
      for (const n of r.removedNodes) if (isSheet(n)) changed = true;
    }
    if (changed) reload();
  }).observe(document.head, { childList: true });
}

const useStore = () => useSyncExternalStore(store.subscribe, store.getVersion);

function readLocal(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: remembered for this visit only */
  }
}

function StyleEditor() {
  useStore();
  const [open, setOpen] = useState(() => readLocal(OPEN_KEY, "0") === "1");
  const [dock, setDock] = useState(() => readLocal(DOCK_KEY, "right"));
  useEffect(() => writeLocal(OPEN_KEY, open ? "1" : "0"), [open]);
  useEffect(() => writeLocal(DOCK_KEY, dock), [dock]);

  // Shift+Alt+E toggles the panel from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && e.altKey && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // picking: hover outlines an element, click (or Alt+click any time) selects it without triggering the app
  useEffect(() => {
    if (!open) return;
    const mine = (t: EventTarget | null) => t instanceof Node && !!host?.contains(t);
    const armed = (e: MouseEvent) => (store.picking || e.altKey) && !mine(e.target);
    const onMove = (e: PointerEvent) => {
      store.hovered = armed(e) ? (e.target as Element) : null;
    };
    const block = (e: Event) => {
      if (armed(e as MouseEvent)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!armed(e)) return;
      e.preventDefault();
      e.stopPropagation();
      store.hovered = null;
      store.select(e.target as Element);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && store.picking) {
        store.picking = false;
        store.hovered = null;
        store.emit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && store.edits.size) {
        e.preventDefault();
        void store.save();
      }
    };
    const onResize = () => store.emit(); // which @media rules apply may have changed
    const blocked = ["pointerdown", "mousedown", "pointerup", "mouseup", "dblclick", "contextmenu"];
    document.addEventListener("pointermove", onMove, true);
    for (const t of blocked) document.addEventListener(t, block, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointermove", onMove, true);
      for (const t of blocked) document.removeEventListener(t, block, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
      store.hovered = null;
    };
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="se-launch" onClick={() => setOpen(true)} title="Style editor (Shift+Alt+E)">
        <PenIcon /> Styles{store.edits.size > 0 && <span className="se-dot" />}
      </button>
    );
  }
  return (
    <>
      <Overlay />
      <aside className="se-panel" data-dock={dock} aria-label="Style editor">
        <header className="se-header">
          <strong>Styles</strong>
          <span className="se-dim se-mono" title="Viewport width: @media rules depend on it">{window.innerWidth}px</span>
          <span className="se-grow" />
          <button type="button" className={`se-btn${store.picking ? " on" : ""}`} aria-pressed={store.picking}
            onClick={() => { store.picking = !store.picking; store.emit(); }} title="Pick an element (or Alt+click anywhere)">
            <PickIcon /> Pick
          </button>
          <button type="button" className="se-icon" onClick={() => setDock(dock === "right" ? "left" : "right")} title="Move the panel to the other side">⇄</button>
          <button type="button" className="se-icon" onClick={() => setOpen(false)} title="Close (Shift+Alt+E)">✕</button>
        </header>
        <div className="se-body">
          {store.selected?.isConnected ? <Inspector el={store.selected} /> : <Empty gone={!!store.selected} />}
        </div>
        <Footer />
      </aside>
    </>
  );
}

function Empty({ gone }: { gone: boolean }) {
  return (
    <div className="se-empty">
      {gone && <p>The selected element left the page.</p>}
      <p><b>Pick</b> an element, or <b>Alt+click</b> anything on the page.</p>
      <ul>
        <li>Change values by typing, with <kbd>↑</kbd>/<kbd>↓</kbd> on any number (<kbd>Shift</kbd> ×10, <kbd>Alt</kbd> ×0.1), or drag a label sideways.</li>
        <li>Changes show at once; <b>Save</b> (<kbd>Ctrl/⌘ S</kbd>) writes them into the .css file the rule lives in.</li>
        <li>Rules for other screen sizes are listed too: edit the phone layout from your desktop.</li>
      </ul>
    </div>
  );
}

// ---------- the inspector for one element

const TEXT_PROPS = ["font-size", "line-height", "font-weight", "letter-spacing", "text-align"];

function Inspector({ el }: { el: Element }) {
  const version = useStore();
  const cas = useMemo(() => cascade(el), [el, version]);
  const inherited = useMemo(() => inheritedFrom(el, TEXT_PROPS), [el, version]);
  const editable = cas.matches.filter((m) => !m.state && m.live.source);
  const target = (store.target && editable.find((m) => m.live.key === store.target)) || defaultTarget(el, cas.matches);
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();

  const ancestors: Element[] = [];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) ancestors.unshift(p);

  return (
    <>
      <section className="se-sec">
        <nav className="se-crumbs" aria-label="Parents">
          {ancestors.slice(-4).map((a, i) => (
            <button key={i} type="button" onClick={() => store.select(a)} title={label(a)}>{short(label(a))}</button>
          ))}
        </nav>
        <div className="se-el">
          <code>{label(el)}</code>
          <span className="se-dim se-mono">{Math.round(r.width)} × {Math.round(r.height)}</span>
        </div>
        <div className="se-dim se-mono">{cs.fontSize} / {lineHeightRatio(cs)} · {cs.fontWeight} · {cs.display}</div>
        {el.children.length > 0 && (
          <button type="button" className="se-link" onClick={() => store.select(el.children[0]!)}>first child ↓</button>
        )}
        {cas.inline.length > 0 && (
          <p className="se-warn">
            Inline style set in the component (TSX), which beats the CSS: <code>{cas.inline.map((d) => `${d.prop}: ${d.value}`).join("; ")}</code>
          </p>
        )}
      </section>

      <Quick el={el} cs={cs} cas={cas} target={target} editable={editable} inherited={inherited} />

      <section className="se-sec">
        <div className="se-h">
          <span>All rules for this element</span>
          <NewRule el={el} cas={cas} />
        </div>
        {cas.matches.length === 0 && <p className="se-dim">No rule in the app's CSS matches it.</p>}
        {cas.matches.map((m) => <RuleCard key={m.live.key} m={m} cas={cas} isTarget={m === target} />)}
      </section>
    </>
  );
}

const SHORT_LABEL: Record<string, string> = {
  "font-size": "size", "line-height": "line", "font-weight": "weight", "letter-spacing": "tracking", "max-width": "max-w",
};
const short = (s: string) => (s.length > 26 ? s.slice(0, 25) + "…" : s);
const px = (v: string) => `${Math.round(parseFloat(v) * 10) / 10 || 0}px`;
function lineHeightRatio(cs: CSSStyleDeclaration) {
  const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
  return lh && fs ? String(Math.round((lh / fs) * 100) / 100) : cs.lineHeight;
}

type QuickProps = {
  el: Element; cs: CSSStyleDeclaration; cas: Cascade; target: Match | null; editable: Match[];
  inherited: Map<string, { el: Element; key: string }>;
};

/** The everyday controls: type, alignment, spacing, written to one chosen rule. */
function Quick({ el, cs, cas, target, editable, inherited }: QuickProps) {
  const key = target?.live.key ?? null;
  const decls = key ? store.declsOf(key) : [];
  const write = (fn: (d: Decl[]) => Decl[]) => key && store.setDecls(key, fn(store.declsOf(key)));
  const rank = (k: string) => (k === "inline" ? -1 : cas.matches.findIndex((m) => m.live.key === k));
  // a declaration in the target will not show if a rule with higher priority sets the same longhand
  const overriddenBy = (longhand: string) => {
    const w = cas.winner.get(longhand);
    if (!w || !key || w === key || rank(w) > rank(key)) return null;
    return w;
  };
  const display = cs.display;
  const isBox = /flex|grid/.test(display);

  const field = (prop: string, placeholder: string) => (
    <Field key={prop} label={SHORT_LABEL[prop] ?? prop} prop={prop}
      value={readProp(decls, prop) ?? ""} placeholder={placeholder} disabled={!key}
      onChange={(v) => write((d) => writeProp(d, prop, v))} onClear={() => write((d) => writeProp(d, prop, null))}
      note={<Note prop={prop} over={overriddenBy(prop)} from={readProp(decls, prop) ? null : inherited.get(prop) ?? null} />} />
  );

  if (!target) {
    return (
      <section className="se-sec">
        <p className="se-dim">No editable rule targets this element yet. Add one with <b>New rule</b> below, or select a parent.</p>
      </section>
    );
  }

  return (
    <section className="se-sec se-quick">
      <label className="se-target">
        <span className="se-dim">Edit rule</span>
        <select value={key!} onChange={(e) => { store.target = e.target.value; store.emit(); }}>
          {editable.map((m) => (
            <option key={m.live.key} value={m.live.key}>
              {m.live.rule.selectorText}{m.live.conds.length ? `  @${conditionLabel(m.live).replace(/^@media /, "")}` : ""}{m.active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </label>
      <RuleMeta m={target} />

      <div className="se-h"><span>Text</span></div>
      <div className="se-grid2">
        {field("font-size", px(cs.fontSize))}
        {field("line-height", lineHeightRatio(cs))}
        {field("font-weight", cs.fontWeight)}
        {field("letter-spacing", cs.letterSpacing === "normal" ? "0em" : cs.letterSpacing)}
      </div>
      <Segmented
        label="align" options={["left", "center", "right", "justify"]}
        declared={readProp(decls, "text-align")} computed={cs.textAlign === "start" ? "left" : cs.textAlign}
        onPick={(v) => write((d) => writeProp(d, "text-align", v))}
      />

      <div className="se-h"><span>Spacing</span></div>
      <BoxModel el={el} cs={cs} decls={decls} write={write} overriddenBy={overriddenBy} />
      {(isBox || readProp(decls, "gap")) && (
        <div className="se-grid2">
          <Field label="gap" prop="gap" value={readProp(decls, "gap") ?? ""} disabled={!key}
            placeholder={cs.rowGap === cs.columnGap ? px(cs.rowGap) : `${px(cs.rowGap)} ${px(cs.columnGap)}`}
            onChange={(v) => write((d) => writeProp(d, "gap", v))} onClear={() => write((d) => writeProp(d, "gap", null))}
            note={<Note prop="gap" over={overriddenBy("row-gap")} from={null} />} />
        </div>
      )}

      {isBox && (
        <>
          <div className="se-h"><span>Layout · {display}</span></div>
          <div className="se-grid2">
            <Choice label="justify" prop="justify-content" decls={decls} write={write} computed={cs.justifyContent}
              options={["normal", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly", "stretch"]} />
            <Choice label="align" prop="align-items" decls={decls} write={write} computed={cs.alignItems}
              options={["normal", "stretch", "flex-start", "center", "flex-end", "baseline"]} />
          </div>
        </>
      )}
      <div className="se-grid2">
        {field("max-width", cs.maxWidth)}
        {field("width", px(cs.width))}
      </div>
    </section>
  );
}

function Note({ prop, over, from }: { prop: string; over: string | null; from: { el: Element; key: string } | null }) {
  if (over) {
    const sel = over === "inline" ? "an inline style" : store.sources.get(over)?.selector ?? "another rule";
    return (
      <button type="button" className="se-note warn" title={`A stronger rule sets ${prop}: edits here will not show`}
        onClick={() => { if (over !== "inline") { store.target = over; store.emit(); } }}>
        overridden by {short(sel)}
      </button>
    );
  }
  if (from) {
    return (
      <button type="button" className="se-note" title="Inherited: click to select the element it comes from" onClick={() => store.select(from.el)}>
        from {short(store.sources.get(from.key)?.selector ?? label(from.el))}
      </button>
    );
  }
  return null;
}

function RuleMeta({ m }: { m: Match }) {
  const src = m.live.source;
  const count = useMemo(() => countMatches(m.live.rule.selectorText), [m.live.rule.selectorText]);
  return (
    <div className="se-meta">
      {src && (
        <button type="button" className="se-link" onClick={() => openInEditor(src.file, src.line)} title="Open in your code editor">
          {shortFile(src.file)}:{src.line}
        </button>
      )}
      {m.live.conds.length > 0 && <span className={`se-tag${m.active ? "" : " off"}`}>{conditionLabel(m.live)}{m.active ? "" : " · not at this width"}</span>}
      {m.state && <span className="se-tag off">{m.state}</span>}
      <span className="se-tag" onMouseEnter={() => { store.highlight = m.live.key; }} onMouseLeave={() => { store.highlight = null; }}
        title="Every element this rule styles on the page (hover to outline them)">
        {count} element{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function countMatches(selector: string) {
  try {
    return document.querySelectorAll(selector).length;
  } catch {
    try {
      return document.querySelectorAll(selector.replace(/::?[\w-]+(\([^)]*\))?/g, "") || "*").length;
    } catch {
      return 0;
    }
  }
}

/** Next's dev server opens a file in your editor (set REACT_EDITOR or EDITOR if it picks the wrong one). */
function openInEditor(file: string, line: number) {
  void fetch(`/__nextjs_launch-editor?file=${encodeURIComponent(file)}&line1=${line}&column1=1`);
}

// ---------- box model: margin and padding, each side editable

function BoxModel({ el, cs, decls, write, overriddenBy }: {
  el: Element; cs: CSSStyleDeclaration; decls: Decl[]; write: (fn: (d: Decl[]) => Decl[]) => void;
  overriddenBy: (longhand: string) => string | null;
}) {
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const r = el.getBoundingClientRect();
  const side = (base: "margin" | "padding", s: Side) => {
    const prop = `${base}-${s}`;
    const over = overriddenBy(prop);
    return (
      <ValueInput className={`se-side${over ? " over" : ""}`} prop={prop} value={readProp(decls, prop) ?? ""}
        placeholder={px(cs.getPropertyValue(prop))} title={over ? `${prop}: overridden by ${store.sources.get(over)?.selector ?? "inline style"}` : prop}
        onChange={(v) => write((d) => (linked[base] ? writeSides(d, base, { top: v, right: v, bottom: v, left: v }) : writeProp(d, prop, v)))}
        onClear={() => write((d) => writeProp(d, prop, null))} />
    );
  };
  const link = (base: "margin" | "padding") => (
    <button type="button" className={`se-chain${linked[base] ? " on" : ""}`} aria-pressed={!!linked[base]}
      title={`Set all four ${base} sides together`} onClick={() => setLinked({ ...linked, [base]: !linked[base] })}>
      {base} {linked[base] ? "⛓ all" : "⛓"}
    </button>
  );
  return (
    <div className="se-box">
      <div className="se-margin">
        {link("margin")}
        {SIDES.map((s) => <span key={s} className={`se-slot se-${s}`}>{side("margin", s)}</span>)}
        <div className="se-padding">
          {link("padding")}
          {SIDES.map((s) => <span key={s} className={`se-slot se-${s}`}>{side("padding", s)}</span>)}
          <div className="se-content se-mono">
            {Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth))}
            {" × "}
            {Math.round(r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- inputs

/** A text input for a CSS value: ↑/↓ change the number under the caret, Enter applies, Esc restores. */
function ValueInput({ prop, value, placeholder, onChange, onClear, className, title, disabled }: {
  prop: string; value: string; placeholder?: string; onChange: (v: string) => void; onClear?: () => void;
  className?: string; title?: string; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const set = (v: string) => {
    setDraft(v);
    if (v.trim()) onChange(v.trim());
  };
  return (
    <input
      ref={ref} className={`se-input${value ? " set" : ""}${className ? ` ${className}` : ""}`} value={draft}
      placeholder={placeholder} title={title ?? prop} spellCheck={false} disabled={disabled} aria-label={prop}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        if (!draft.trim() && value) onClear?.();
        setDraft(value);
      }}
      onChange={(e) => set(e.target.value)}
      onKeyDown={(e) => {
        const input = e.currentTarget;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const base = draft.trim() ? draft : placeholder ?? "";
          const caret = draft.trim() ? input.selectionStart ?? base.length : 0;
          const steps = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const r = nudge(base, caret, steps, prop);
          if (!r) return;
          e.preventDefault();
          set(r.value);
          requestAnimationFrame(() => input.setSelectionRange(r.start, r.end));
        } else if (e.key === "Enter") input.blur();
        else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(value);
          requestAnimationFrame(() => input.blur());
        }
      }}
    />
  );
}

/** A labelled value whose label can be dragged sideways to scrub the number. */
function Field({ label, prop, value, placeholder, onChange, onClear, note, disabled }: {
  label: string; prop: string; value: string; placeholder: string; onChange: (v: string) => void; onClear: () => void;
  note?: ReactNode; disabled?: boolean;
}) {
  const drag = useRef<{ x: number; base: string } | null>(null);
  return (
    <div className="se-field">
      <span
        className="se-label" title={`${prop}: drag sideways to change (Shift ×10, Alt ×0.1)`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, base: value || placeholder };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const steps = Math.round((e.clientX - d.x) / 3) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const r = steps ? nudge(d.base, 0, steps, prop) : null;
          if (r) onChange(r.value);
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        {label}
      </span>
      <ValueInput prop={prop} value={value} placeholder={placeholder} onChange={onChange} onClear={onClear} disabled={disabled} />
      {note}
    </div>
  );
}

function Segmented({ label, options, declared, computed, onPick }: {
  label: string; options: string[]; declared: string | null; computed: string; onPick: (v: string | null) => void;
}) {
  return (
    <div className="se-field">
      <span className="se-label">{label}</span>
      <div className="se-seg" role="group" aria-label={label}>
        {options.map((o) => {
          const on = (declared ?? computed) === o;
          return (
            <button key={o} type="button" className={on ? (declared ? "on" : "soft") : ""} aria-pressed={on}
              title={declared === o ? `Remove text-align: ${o} from this rule` : `text-align: ${o}`}
              onClick={() => onPick(declared === o ? null : o)}>
              <AlignIcon kind={o} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Choice({ label, prop, decls, write, computed, options }: {
  label: string; prop: string; decls: Decl[]; write: (fn: (d: Decl[]) => Decl[]) => void; computed: string; options: string[];
}) {
  const declared = readProp(decls, prop);
  return (
    <div className="se-field">
      <span className="se-label">{label}</span>
      <select className={`se-input${declared ? " set" : ""}`} value={declared ?? ""} aria-label={prop}
        onChange={(e) => write((d) => writeProp(d, prop, e.target.value || null))}>
        <option value="">({computed})</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ---------- every matching rule, editable as written

function RuleCard({ m, cas, isTarget }: { m: Match; cas: Cascade; isTarget: boolean }) {
  const key = m.live.key;
  const src = m.live.source;
  const decls = store.declsOf(key);
  const [prop, setProp] = useState("");
  const [val, setVal] = useState("");
  const changed = store.edits.has(key);
  const set = (fn: (d: Decl[]) => Decl[]) => store.setDecls(key, fn(store.declsOf(key)));

  return (
    <div className={`se-rule${m.active && !m.state ? "" : " off"}${isTarget ? " target" : ""}`}>
      <div className="se-rule-head">
        <code title={m.live.rule.selectorText}>{m.live.rule.selectorText}</code>
        {changed && <button type="button" className="se-link" onClick={() => store.revert(key)}>revert</button>}
        {src && !isTarget && !m.state && (
          <button type="button" className="se-link" onClick={() => { store.target = key; store.emit(); }} title="Use this rule for the controls above">edit above</button>
        )}
      </div>
      <RuleMeta m={m} />
      {!src ? (
        <p className="se-dim">Not written in a source file (generated, e.g. by Tailwind), so read-only: {m.live.rule.style.cssText}</p>
      ) : (
        <>
          {decls.map((d, i) => {
            const applied = cas.applied.has(`${key}#${i}`) || !!m.state || !m.active;
            return (
              <div key={`${d.prop}-${i}`} className={`se-decl${applied ? "" : " over"}`} title={applied ? undefined : "Overridden by a stronger rule"}>
                <span className="se-prop">{d.prop}</span>
                <ValueInput prop={d.prop} value={d.value + (d.important ? " !important" : "")}
                  onChange={(v) => set((ds) => ds.map((x, j) => (j === i ? parseDecl(d.prop, v) : x)))}
                  onClear={() => set((ds) => ds.filter((_, j) => j !== i))} />
                <button type="button" className="se-x" title={`Remove ${d.prop}`} onClick={() => set((ds) => ds.filter((_, j) => j !== i))}>×</button>
              </div>
            );
          })}
          <form className="se-decl add" onSubmit={(e) => {
            e.preventDefault();
            if (!prop.trim() || !val.trim()) return;
            set((ds) => writeProp(ds, prop.trim(), val.trim()));
            setProp("");
            setVal("");
          }}>
            <input className="se-input" list="se-props" placeholder="+ property" value={prop} onChange={(e) => setProp(e.target.value)} spellCheck={false} aria-label="New property" />
            <input className="se-input" placeholder="value" value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} aria-label="New value" />
            <button type="submit" className="se-x" title="Add">↵</button>
          </form>
        </>
      )}
      <datalist id="se-props">{PROPS.map((p) => <option key={p} value={p} />)}</datalist>
    </div>
  );
}

const parseDecl = (prop: string, v: string): Decl => {
  const important = /!\s*important\s*$/i.test(v);
  return { prop, value: v.replace(/!\s*important\s*$/i, "").trim(), important };
};

function NewRule({ el, cas }: { el: Element; cas: Cascade }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");
  const [file, setFile] = useState("");
  if (!open) {
    return (
      <button type="button" className="se-link" onClick={() => {
        setSel(suggestSelector(el));
        // the page's own stylesheet (admin.css, buyer.css...) rather than globals.css, where there is one
        const own = cas.matches.find((m) => m.live.source && !m.live.ref.file.endsWith("globals.css"));
        setFile(own?.live.ref.file ?? cas.matches.find((m) => m.live.source)?.live.ref.file ?? store.files[0] ?? "");
        setOpen(true);
      }}>+ New rule</button>
    );
  }
  return (
    <form className="se-new" onSubmit={async (e) => {
      e.preventDefault();
      await store.createRule(file, sel);
      setOpen(false);
    }}>
      <input className="se-input" value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Selector" spellCheck={false} />
      <select className="se-input" value={file} onChange={(e) => setFile(e.target.value)} aria-label="File">
        {store.files.map((f) => <option key={f} value={f}>{shortFile(f)}</option>)}
      </select>
      <button type="submit" className="se-btn">Add</button>
      <button type="button" className="se-link" onClick={() => setOpen(false)}>cancel</button>
    </form>
  );
}

// ---------- unsaved changes

function Footer() {
  const [saving, setSaving] = useState(false);
  const n = store.edits.size;
  const files = [...new Set([...store.edits.keys()].map((k) => store.sources.get(k)?.file).filter(Boolean))] as string[];
  return (
    <footer className="se-foot">
      {store.message && <p className={`se-msg ${store.message.kind}`}>{store.message.text}</p>}
      {n > 0 && (
        <details className="se-pending">
          <summary>{n} rule{n === 1 ? "" : "s"} changed in {files.map(shortFile).join(", ")}</summary>
          {[...store.edits.keys()].map((k) => (
            <div key={k} className="se-pending-row">
              <code>{store.sources.get(k)?.selector}</code>
              <button type="button" className="se-link" onClick={() => store.revert(k)}>revert</button>
            </div>
          ))}
        </details>
      )}
      <div className="se-actions">
        <button type="button" className="se-btn" disabled={!n} onClick={() => store.discardAll()}>Discard</button>
        <button type="button" className="se-btn primary" disabled={!n || saving}
          onClick={async () => { setSaving(true); await store.save(); setSaving(false); }}>
          {saving ? "Saving…" : `Save${n ? ` ${n}` : ""}`} <kbd>⌘S</kbd>
        </button>
      </div>
    </footer>
  );
}

// ---------- the page overlay: hover outline, box model of the selection, gaps, and a rule's elements

type Box = { left: number; top: number; width: number; height: number };
type Frame = {
  hover: Box | null; hoverLabel: string;
  sel: { margin: Box; border: Box; padding: Box; content: Box; m: number[]; p: number[]; gaps: Box[]; label: string } | null;
  many: Box[];
};

function Overlay() {
  const [f, setF] = useState<Frame>({ hover: null, hoverLabel: "", sel: null, many: [] });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setF(measure());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = f.sel;
  return (
    <div className="se-overlay" aria-hidden="true">
      {f.many.map((b, i) => <div key={i} className="se-o-many" style={pos(b)} />)}
      {s && (
        <>
          <div className="se-o-ring margin" style={{ ...pos(s.margin), borderWidth: s.m.map((v) => `${v}px`).join(" ") }} />
          <div className="se-o-ring padding" style={{ ...pos(s.padding), borderWidth: s.p.map((v) => `${v}px`).join(" ") }} />
          <div className="se-o-content" style={pos(s.content)} />
          {s.gaps.map((g, i) => <div key={i} className="se-o-gap" style={pos(g)} />)}
          <div className="se-o-label" style={labelPos(s.border)}>{s.label}</div>
        </>
      )}
      {f.hover && (
        <>
          <div className="se-o-hover" style={pos(f.hover)} />
          <div className="se-o-label hover" style={labelPos(f.hover)}>{f.hoverLabel}</div>
        </>
      )}
    </div>
  );
}

const pos = (b: Box) => ({ left: b.left, top: b.top, width: Math.max(0, b.width), height: Math.max(0, b.height) });
const labelPos = (b: Box) => ({ left: Math.max(4, b.left), top: b.top > 26 ? b.top - 24 : b.top + b.height + 4 });
const rect = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });

function measure(): Frame {
  const frame: Frame = { hover: null, hoverLabel: "", sel: null, many: [] };
  const h = store.hovered;
  if (h?.isConnected) {
    const r = h.getBoundingClientRect();
    frame.hover = rect(r);
    frame.hoverLabel = `${short(label(h))}  ${Math.round(r.width)}×${Math.round(r.height)}`;
  }
  const el = store.selected;
  if (el?.isConnected) {
    const cs = getComputedStyle(el);
    const n = (p: string) => Math.max(0, parseFloat(cs.getPropertyValue(p)) || 0);
    const r = el.getBoundingClientRect();
    const m = SIDES.map((s) => n(`margin-${s}`));
    const b = SIDES.map((s) => n(`border-${s}-width`));
    const p = SIDES.map((s) => n(`padding-${s}`));
    const border = rect(r);
    const margin = { left: r.left - m[3]!, top: r.top - m[0]!, width: r.width + m[1]! + m[3]!, height: r.height + m[0]! + m[2]! };
    const padding = { left: r.left + b[3]!, top: r.top + b[0]!, width: r.width - b[1]! - b[3]!, height: r.height - b[0]! - b[2]! };
    const content = { left: padding.left + p[3]!, top: padding.top + p[0]!, width: padding.width - p[1]! - p[3]!, height: padding.height - p[0]! - p[2]! };
    frame.sel = { margin, border, padding, content, m, p, gaps: /flex|grid/.test(cs.display) ? gaps(el, content) : [], label: `${short(label(el))}  ${Math.round(r.width)}×${Math.round(r.height)}` };
  }
  if (store.highlight) {
    const live = store.live.find((l) => l.key === store.highlight);
    if (live) {
      let els: Element[] = [];
      try {
        els = Array.from(document.querySelectorAll(live.rule.selectorText.replace(/::?(hover|focus-visible|focus|active|before|after)\b/g, "") || "*"));
      } catch { /* selector the browser cannot query */ }
      frame.many = els.filter((e) => !host?.contains(e)).slice(0, 300).map((e) => rect(e.getBoundingClientRect()));
    }
  }
  return frame;
}

/** The gaps between a flex/grid container's children, so `gap` is visible. */
function gaps(el: Element, content: Box): Box[] {
  const kids = Array.from(el.children)
    .filter((c) => { const s = getComputedStyle(c); return s.display !== "none" && s.position !== "absolute" && s.position !== "fixed"; })
    .map((c) => c.getBoundingClientRect());
  const out: Box[] = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1]!, b = kids[i]!;
    if (b.left >= a.right - 0.5 && b.top < a.bottom && b.bottom > a.top) {
      const top = Math.min(a.top, b.top);
      out.push({ left: a.right, top, width: b.left - a.right, height: Math.max(a.bottom, b.bottom) - top });
    } else if (b.top >= a.bottom - 0.5) {
      out.push({ left: content.left, top: a.bottom, width: content.width, height: b.top - a.bottom });
    }
  }
  return out.filter((g) => g.width >= 1 && g.height >= 1);
}

// ---------- icons

const PenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" />
  </svg>
);
const PickIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l7 16 2.5-6.5L20 11z" />
  </svg>
);
function AlignIcon({ kind }: { kind: string }) {
  const rows = kind === "left" ? [[4, 16], [4, 12], [4, 16], [4, 10]]
    : kind === "center" ? [[4, 16], [6, 12], [4, 16], [7, 10]]
    : kind === "right" ? [[4, 16], [8, 12], [4, 16], [10, 10]]
    : [[4, 16], [4, 16], [4, 16], [4, 10]];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-label={kind}>
      {rows.map(([x, w], i) => <path key={i} d={`M${x! + 0} ${6 + i * 4}h${w}`} />)}
    </svg>
  );
}
