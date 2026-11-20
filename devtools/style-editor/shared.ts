// Pure helpers shared by the style editor's browser panel (StyleEditor.tsx) and its dev-server
// route (server.ts, served at /api/dev/style-editor). No DOM and no Node APIs here, so both sides
// and the tests can use them.

export type Decl = { prop: string; value: string; important: boolean };

/** Which rule in the source: its file, the at-rules around it (outermost first), its selector, and
 *  which repeat of that (context, selector) pair it is in the file. The browser's CSSOM and PostCSS
 *  both produce one of these, so a rule seen in the page can be found again in its .css file. */
export type RuleRef = { file: string; context: string[]; selector: string; occurrence: number };
export type SourceRule = RuleRef & { line: number; decls: Decl[] };

export const ruleKey = (r: RuleRef) => JSON.stringify([r.file, r.context, r.selector, r.occurrence]);

/** A selector in one canonical spelling, so the browser's serialisation and the source text compare equal.
 *  Next's CSS compiler (Lightning CSS) also rewrites some selectors on the way to the browser, e.g.
 *  `.a *::before` arrives as `.a :before`, so a `*` next to a class, id, attribute or pseudo is dropped. */
export function normSelector(sel: string): string {
  return sel
    .replace(/["']/g, "")
    .replace(/\*(?=[.#:[])/g, "")
    .replace(/\(\s*odd\s*\)/gi, "(2n+1)") // the browser serialises :nth-child(odd) as (2n+1)
    .replace(/\(\s*even\s*\)/gi, "(2n)")
    .replace(/(^|[^:]):(before|after|first-line|first-letter)\b/gi, "$1::$2")
    .replace(/\s+/g, " ")
    .replace(/\s*([>+~,()])\s*/g, "$1")
    .trim();
}

/** An at-rule's condition (media query, supports test...) in one canonical spelling. */
export const normCondition = (s: string) => s.toLowerCase().replace(/["'\s]/g, "");

/** Split on top-level commas: "a, b:is(c, d)" -> ["a", "b:is(c, d)"]. Also splits values on spaces with splitTop(v, " "). */
export function splitTop(s: string, sep: "," | " " = ","): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && (sep === "," ? ch === "," : /\s/.test(ch))) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------- specificity

export type Spec = [number, number, number];
const LEGACY_PSEUDO_ELEMENTS = new Set(["before", "after", "first-line", "first-letter"]);

function identEnd(s: string, i: number): number {
  while (i < s.length && /[\w\-\\ -￿]/.test(s[i]!)) i += s[i] === "\\" ? 2 : 1;
  return i;
}
function parenEnd(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return s.length - 1;
}
const maxSpec = (list: string): Spec =>
  splitTop(list).map(specificity).reduce<Spec>((m, s) => (compareSpec(s, m) > 0 ? s : m), [0, 0, 0]);

/** Specificity of one complex selector (no top-level commas), per Selectors Level 4. */
export function specificity(sel: string): Spec {
  const sp: Spec = [0, 0, 0];
  const add = (o: Spec) => { sp[0] += o[0]; sp[1] += o[1]; sp[2] += o[2]; };
  let i = 0;
  while (i < sel.length) {
    const ch = sel[i]!;
    if (ch === "#") { sp[0]++; i = identEnd(sel, i + 1); }
    else if (ch === ".") { sp[1]++; i = identEnd(sel, i + 1); }
    else if (ch === "[") { sp[1]++; const j = sel.indexOf("]", i); i = j < 0 ? sel.length : j + 1; }
    else if (ch === ":") {
      const element = sel[i + 1] === ":";
      const start = i + (element ? 2 : 1);
      i = identEnd(sel, start);
      const name = sel.slice(start, i).toLowerCase();
      let args: string | null = null;
      if (sel[i] === "(") { const end = parenEnd(sel, i); args = sel.slice(i + 1, end); i = end + 1; }
      if (element || LEGACY_PSEUDO_ELEMENTS.has(name)) sp[2]++;
      else if (name === "where") { /* adds nothing */ }
      else if (["is", "not", "has", "matches"].includes(name) && args) add(maxSpec(args));
      else if (/^nth-(last-)?child$/.test(name) && args && /\sof\s/i.test(args)) { sp[1]++; add(maxSpec(args.split(/\sof\s/i)[1]!)); }
      else sp[1]++;
    } else if (/[a-zA-Z_\- -￿]/.test(ch)) { sp[2]++; i = identEnd(sel, i); }
    else i++; // *, combinators, whitespace
  }
  return sp;
}

export const compareSpec = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// ---------- nudging numbers inside a value (arrow keys and drag-to-scrub)

// a number not preceded by a letter, digit, '#', '.' or '-' (so hex colours and names like "ss01" are skipped)
const NUMBER = /(?<![\w#.-])(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)/gi;

export type NumberToken = { start: number; end: number; num: number; unit: string };

/** The number under (or nearest before) the caret in a CSS value. */
export function numberAt(value: string, caret: number): NumberToken | null {
  const all: NumberToken[] = [];
  for (const m of value.matchAll(NUMBER)) {
    const start = m.index!;
    all.push({ start, end: start + m[0].length, num: parseFloat(m[1]!), unit: m[2]!.toLowerCase() });
  }
  return all.find((t) => caret >= t.start && caret <= t.end) ?? [...all].reverse().find((t) => t.end <= caret) ?? all[0] ?? null;
}

/** How much one arrow-key press changes a number, by property and unit. */
export function stepFor(prop: string, tok: NumberToken): number {
  if (prop === "font-weight" || (prop === "font" && !tok.unit && tok.num >= 100)) return 10;
  if (prop === "letter-spacing" && (tok.unit === "em" || tok.unit === "rem")) return 0.005;
  if (tok.unit === "ms") return 10;
  if (tok.unit === "em" || tok.unit === "rem" || tok.unit === "s" || (!tok.unit && Math.abs(tok.num) < 10)) return 0.05;
  return 1;
}

export const formatNumber = (n: number) => String(Number(n.toFixed(4)) || 0);

/** Change the number at the caret by `steps` (+1 = one arrow press). Returns the new value and the token's new span. */
export function nudge(value: string, caret: number, steps: number, prop: string): { value: string; start: number; end: number } | null {
  const tok = numberAt(value, caret);
  if (!tok) return null;
  let next = tok.num + steps * stepFor(prop, tok);
  if (prop === "font-weight" || (prop === "font" && !tok.unit && tok.num >= 100)) next = Math.min(1000, Math.max(1, next));
  const text = formatNumber(next) + tok.unit;
  return { value: value.slice(0, tok.start) + text + value.slice(tok.end), start: tok.start, end: tok.start + text.length };
}

// ---------- reading and writing one longhand in a rule that may use shorthands

const SIDES = ["top", "right", "bottom", "left"] as const;
export type Side = (typeof SIDES)[number];

/** "8px 12px" -> ["8px", "12px", "8px", "12px"] */
export function expandBox(v: string): [string, string, string, string] | null {
  const t = splitTop(v, " ");
  if (t.length < 1 || t.length > 4) return null;
  const [a, b = a, c = a, d = b] = t as [string, string?, string?, string?];
  return [a, b!, c!, d!];
}
/** ["8px", "12px", "8px", "12px"] -> "8px 12px" */
export function composeBox([t, r, b, l]: readonly string[]): string {
  if (r === l) {
    if (t === b) return t === r ? t! : `${t} ${r}`;
    return `${t} ${r} ${b}`;
  }
  return `${t} ${r} ${b} ${l}`;
}

// a font size: a number with a unit, or calc()/clamp()/min()/max() (a bare number is a weight)
const isFontSize = (t: string) => /^(-?[\d.]+[a-z%]+|(calc|clamp|min|max)\(.*\))$/i.test(t);

/** Where the size, line height and weight sit inside a `font` shorthand, or null if it is not one we can edit. */
function fontParts(v: string) {
  const tokens = splitTop(v.replace(/\s*\/\s*/g, "/"), " ");
  const sizeIdx = tokens.findIndex((t) => isFontSize(t.split("/")[0]!));
  if (sizeIdx < 0 || sizeIdx === tokens.length - 1) return null; // a font needs a family after the size
  const weightIdx = tokens.slice(0, sizeIdx).findIndex((t) => /^(\d{1,4}|bold|bolder|lighter|normal)$/i.test(t));
  return { tokens, sizeIdx, weightIdx };
}

type FontPart = "font-size" | "line-height" | "font-weight";
function readFont(v: string, part: FontPart): string | null {
  const p = fontParts(v);
  if (!p) return null;
  const [size, lh] = p.tokens[p.sizeIdx]!.split("/");
  if (part === "font-size") return size!.trim();
  if (part === "line-height") return lh?.trim() ?? "normal";
  return p.weightIdx >= 0 ? p.tokens[p.weightIdx]! : "normal";
}
function writeFont(v: string, part: FontPart, value: string): string | null {
  const p = fontParts(v);
  if (!p) return null;
  const t = [...p.tokens];
  const [size, lh] = t[p.sizeIdx]!.split("/");
  if (part === "font-size") t[p.sizeIdx] = lh !== undefined ? `${value}/${lh}` : value;
  else if (part === "line-height") t[p.sizeIdx] = `${size}/${value}`;
  else if (p.weightIdx >= 0) t[p.weightIdx] = value;
  else t.unshift(value);
  return t.join(" ");
}

/** The shorthand that also sets a longhand, and how to read/write its part of it. */
function shorthandOf(prop: string): { name: string; read: (v: string) => string | null; write: (v: string, x: string) => string | null } | null {
  const box = /^(padding|margin)-(top|right|bottom|left)$/.exec(prop);
  if (box) {
    const i = SIDES.indexOf(box[2] as Side);
    return {
      name: box[1]!,
      read: (v) => expandBox(v)?.[i] ?? null,
      write: (v, x) => { const s = expandBox(v); if (!s) return null; s[i] = x; return composeBox(s); },
    };
  }
  if (prop === "row-gap" || prop === "column-gap") {
    const i = prop === "row-gap" ? 0 : 1;
    return {
      name: "gap",
      read: (v) => { const t = splitTop(v, " "); return t[i] ?? t[0] ?? null; },
      write: (v, x) => { const t = splitTop(v, " "); const pair = [t[0]!, t[1] ?? t[0]!]; pair[i] = x; return pair[0] === pair[1] ? pair[0]! : pair.join(" "); },
    };
  }
  if (prop === "font-size" || prop === "line-height" || prop === "font-weight") {
    return { name: "font", read: (v) => readFont(v, prop), write: (v, x) => writeFont(v, prop, x) };
  }
  return null;
}

/** What a rule declares for a property, counting a shorthand that sets it (the last declaration wins). */
export function readProp(decls: readonly Decl[], prop: string): string | null {
  const sh = shorthandOf(prop);
  for (let i = decls.length - 1; i >= 0; i--) {
    const d = decls[i]!;
    if (d.prop === prop) return d.value;
    if (sh && d.prop === sh.name) return sh.read(d.value);
  }
  return null;
}

/** Set (or with null, remove) one property in a rule, editing a shorthand in place where the rule uses one,
 *  so the source keeps its shape: `padding: 18px 20px` + left=24px -> `padding: 18px 20px 18px 24px`. */
export function writeProp(decls: readonly Decl[], prop: string, value: string | null): Decl[] {
  const out = decls.map((d) => ({ ...d }));
  const sh = shorthandOf(prop);
  for (let i = out.length - 1; i >= 0; i--) {
    const d = out[i]!;
    if (d.prop === prop) {
      if (value === null) out.splice(i, 1);
      else d.value = value;
      return out;
    }
    if (sh && d.prop === sh.name) {
      if (value === null) return out; // a shorthand's part cannot be removed on its own
      const next = sh.write(d.value, value);
      if (next !== null) { d.value = next; return out; }
      break; // a shorthand we cannot edit (e.g. `font: inherit`): add a longhand after it
    }
  }
  if (value !== null) out.push({ prop, value, important: false });
  return out;
}

/** Set several sides of padding/margin at once; all four on a rule with no longhands becomes one shorthand. */
export function writeSides(decls: readonly Decl[], base: "padding" | "margin", sides: Partial<Record<Side, string>>): Decl[] {
  const all = SIDES.every((s) => sides[s] !== undefined);
  if (all && !decls.some((d) => d.prop.startsWith(`${base}-`))) {
    return writeProp(decls, base, composeBox(SIDES.map((s) => sides[s]!)));
  }
  let out = [...decls];
  for (const s of SIDES) if (sides[s] !== undefined) out = writeProp(out, `${base}-${s}`, sides[s]!);
  return out;
}

export const sameDecls = (a: readonly Decl[], b: readonly Decl[]) =>
  a.length === b.length && a.every((d, i) => d.prop === b[i]!.prop && d.value.trim() === b[i]!.value.trim() && d.important === b[i]!.important);

export const serializeDecls = (decls: readonly Decl[]) =>
  decls.map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join(" ");

// ---------- lining up the browser's rules with the source

/** Where one compiled rule came from: one source rule, several adjacent ones the compiler merged into a
 *  single selector list, or none (generated, e.g. by Tailwind or for vendor prefixes). */
export type Alignment<T> =
  | { kind: "one"; item: T; source: SourceRule }
  | { kind: "merged"; item: T; sources: SourceRule[] }
  | { kind: "none"; item: T };

const sameContext = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((c, i) => c === b[i]);

/**
 * Pair the rules the browser got from one file (in order) with the file's source rules (in order).
 * Next compiles CSS with Lightning CSS, which changes the rule list on the way:
 *  - adjacent rules with identical declarations become one: `.a { x } .b { x }` -> `.a, .b { x }`
 *  - a selector list is split, one rule per selector, when some selector might be unsupported:
 *    `.a:focus-visible, .b:focus-visible { x }` -> `.a:focus-visible { x } .b:focus-visible { x }`
 *  - a rule is split around a value that needs a fallback: `.a { x; color-mix(...); y }` ->
 *    `.a { x; fallback }  @supports (color: color-mix(...)) { .a { color-mix(...) } }  .a { y }`
 *  - rules are added (Tailwind's output, vendor-prefixed copies)
 * Both lists keep the source order, so a single forward pass lines them up.
 */
export function alignRules<T extends { selector: string; context: string[] }>(items: readonly T[], sources: readonly SourceRule[]): Alignment<T>[] {
  // @supports blocks the compiler added for fallbacks are not part of the source's context
  const written = new Set(sources.flatMap((s) => s.context));
  const ctxOf = (item: T) => item.context.filter((c) => !c.startsWith("supports ") || written.has(c));
  const partsOf = sources.map((s) => splitTop(s.selector));
  const startsWith = (list: string[], from: number, sub: string[]) => sub.every((p, k) => list[from + k] === p);
  const out: Alignment<T>[] = [];
  let i = 0; // the next source rule not yet fully seen in the browser...
  let used = 0; // ...and how many selectors of its list have been (when the compiler split the list)

  /** Line the item up with source j (starting `from` selectors into its list); returns the new position. */
  const tryAt = (item: T, ctx: string[], parts: string[], j: number, from: number): [number, number] | null => {
    const s = sources[j];
    if (!s || !sameContext(s.context, ctx)) return null;
    // the whole rule, or the next selectors of its list
    if (startsWith(partsOf[j]!, from, parts)) {
      out.push({ kind: "one", item, source: s });
      return from + parts.length >= partsOf[j]!.length ? [j + 1, 0] : [j, from + parts.length];
    }
    // adjacent rules merged into one selector list
    if (from === 0 && parts.length > partsOf[j]!.length) {
      const group: SourceRule[] = [];
      let covered = 0;
      for (let k = j; k < sources.length && covered < parts.length && sameContext(sources[k]!.context, ctx); k++) {
        if (!startsWith(parts, covered, partsOf[k]!)) break;
        group.push(sources[k]!);
        covered += partsOf[k]!.length;
      }
      if (group.length > 1 && covered === parts.length) {
        out.push({ kind: "merged", item, sources: group });
        return [j + group.length, 0];
      }
    }
    return null;
  };

  for (const item of items) {
    const ctx = ctxOf(item), parts = splitTop(item.selector);
    let next = tryAt(item, ctx, parts, i, used);
    // another part of the rule before, split around a fallback
    const prev = used ? i : i - 1;
    if (!next && sources[prev] && sameContext(sources[prev]!.context, ctx) && parts.every((p) => partsOf[prev]!.includes(p))) {
      out.push({ kind: "one", item, source: sources[prev]! });
      continue;
    }
    // further on: the source rules in between never reached the browser (e.g. empty rules are dropped)
    for (let j = i + 1; !next && j < sources.length; j++) next = tryAt(item, ctx, parts, j, 0);
    if (next) [i, used] = next;
    else out.push({ kind: "none", item });
  }
  return out;
}
