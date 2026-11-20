// Browser half of the style editor: finds the app's rules in the live stylesheets, works out which
// ones apply to an element (and which declarations win), and keeps unsaved edits, previewed live.
import {
  alignRules, compareSpec, normCondition, normSelector, ruleKey, sameDecls, serializeDecls, specificity, splitTop,
  type Decl, type RuleRef, type SourceRule, type Spec,
} from "./shared";

const API = "/api/dev/style-editor";
const HEADERS = { "x-style-editor": "1", "Content-Type": "application/json" };

/** A rule as the page has it: the live CSSOM rule plus where it is in the source. */
export type LiveRule = {
  key: string; // the source rule's key, or "live:n" for a rule not written in a source file
  ref: RuleRef;
  rule: CSSStyleRule;
  order: number; // position in the whole document's cascade order
  conds: CSSRule[]; // the @media/@supports blocks around it
  source?: SourceRule;
};

/** A style rule in a live stylesheet, before it is matched to the source. */
type Item = { rule: CSSStyleRule; file: string | null; context: string[]; selector: string; conds: CSSRule[] };

export type Match = {
  live: LiveRule;
  spec: Spec;
  active: boolean; // its @media etc. currently apply
  state: string | null; // ":hover", "::before"... when it only applies in that state
  part: string; // the part of a selector list that matched
};

export type Cascade = {
  matches: Match[]; // highest priority first
  applied: Set<string>; // `${key}#${declIndex}` of declarations that win at least one longhand
  winner: Map<string, string>; // longhand -> rule key that sets it (or "inline")
  inline: Decl[];
};

// interaction states and pseudo-elements: rules using them style the element only sometimes (the
// mouse is over it while picking, so :hover would otherwise always "match")
const STATES = /::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|first-line|first-letter)\b/gi;

// ---------- longhands a declaration sets (to tell which declarations are overridden)

const probe = typeof document !== "undefined" ? document.createElement("div").style : null;
const SHORT: Record<string, string[]> = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  gap: ["row-gap", "column-gap"],
  font: ["font-style", "font-weight", "font-size", "line-height", "font-family"],
};
const longhandCache = new Map<string, string[]>();
export function longhands(prop: string, value: string): string[] {
  if (prop.startsWith("--") || !probe) return [prop];
  const k = `${prop}:${value}`;
  let out = longhandCache.get(k);
  if (!out) {
    probe.cssText = "";
    probe.setProperty(prop, value);
    out = Array.from(probe);
    if (out.length === 0) out = SHORT[prop] ?? [prop];
    longhandCache.set(k, out);
  }
  return out;
}

// ---------- the store

type Listener = () => void;

class Store {
  version = 0;
  files: string[] = [];
  sources = new Map<string, SourceRule>();
  edits = new Map<string, Decl[]>(); // rule key -> its declarations as edited (unsaved)
  live: LiveRule[] = [];
  selected: Element | null = null;
  hovered: Element | null = null;
  highlight: string | null = null; // rule key whose elements to outline
  picking = false;
  target: string | null = null; // rule key the quick controls write to
  message: { kind: "ok" | "error"; text: string } | null = null;
  private indexRun = 0;
  private byFile = new Map<string, SourceRule[]>(); // each file's source rules, in file order
  private listeners = new Set<Listener>();

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;
  emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  async load() {
    try {
      const r = await fetch(API, { headers: HEADERS, cache: "no-store" });
      if (!r.ok) throw new Error(`the dev server answered ${r.status}`);
      const data = (await r.json()) as { files: string[]; rules: SourceRule[] };
      this.files = data.files;
      this.sources = new Map(data.rules.map((s) => [ruleKey(s), s]));
      this.byFile = new Map();
      for (const s of data.rules) this.byFile.set(s.file, [...(this.byFile.get(s.file) ?? []), s]);
    } catch (e) {
      this.message = { kind: "error", text: `Could not read the stylesheets: ${(e as Error).message}` };
    }
    await this.reindex();
    this.emit();
  }

  /** Walk the page's stylesheets and find each rule's source; call after Next swaps a stylesheet.
   *  Re-applies unsaved edits. */
  async reindex() {
    const run = ++this.indexRun;
    const sheets = await Promise.all(Array.from(document.styleSheets).map(async (sheet) => ({ sheet, fileOf: await sheetFiles(sheet) })));
    if (run !== this.indexRun) return; // a newer reindex started while this one waited
    const out: LiveRule[] = [];
    let order = 0, unknown = 0;
    const push = (r: Item, source?: SourceRule) => {
      const ref = source ?? { file: r.file ?? "", context: r.context, selector: r.selector, occurrence: -1 };
      out.push({ key: source ? ruleKey(source) : `live:${unknown++}`, ref, rule: r.rule, order: order++, conds: r.conds, source });
    };
    for (const { sheet, fileOf } of sheets) {
      const items = styleRules(sheet, fileOf);
      if (fileOf) {
        // Turbopack said which file each rule came from: line them up with that file's source, in order
        const perFile = new Map<string, Item[]>();
        for (const it of items) if (it.file && this.files.includes(it.file)) perFile.set(it.file, [...(perFile.get(it.file) ?? []), it]);
        for (const [file, list] of perFile) {
          for (const a of alignRules(list, this.byFile.get(file) ?? [])) {
            if (a.kind === "one") push(a.item, a.source);
            else if (a.kind === "none") push(a.item);
            else {
              const split = unmerge(a.item, a.sources, fileOf);
              if (split) split.forEach((r, i) => push(r, a.sources[i]));
              else push(a.item);
            }
          }
        }
      } else {
        // no file information (an inline <style>, or `next dev` without Turbopack): use a rule only if
        // exactly one source rule has its selector and context
        for (const it of items) {
          const cands = [...this.sources.values()].filter((s) => s.selector === it.selector && JSON.stringify(s.context) === JSON.stringify(it.context));
          if (cands.length === 1) push(it, cands[0]);
        }
      }
    }
    this.live = out;
    for (const [key, decls] of this.edits) this.preview(key, decls);
  }

  declsOf(key: string): Decl[] {
    return this.edits.get(key) ?? this.sources.get(key)?.decls ?? [];
  }

  private preview(key: string, decls: Decl[]) {
    for (const l of this.live) if (l.key === key) l.rule.style.cssText = serializeDecls(decls);
  }

  /** Change a rule's declarations: shown at once, written to the file on save. */
  setDecls(key: string, decls: Decl[]) {
    const src = this.sources.get(key);
    if (!src) return;
    if (sameDecls(decls, src.decls)) this.edits.delete(key);
    else this.edits.set(key, decls);
    this.preview(key, decls);
    this.message = null;
    this.emit();
  }

  revert(key: string) {
    const src = this.sources.get(key);
    if (src) this.setDecls(key, src.decls);
  }
  discardAll() {
    for (const key of [...this.edits.keys()]) this.revert(key);
  }

  async save() {
    if (this.edits.size === 0) return;
    const edits = [...this.edits].map(([key, after]) => {
      const s = this.sources.get(key)!;
      return { ref: { file: s.file, context: s.context, selector: s.selector, occurrence: s.occurrence }, before: s.decls, after };
    });
    const r = await post({ edits });
    if (!r.ok) return this.fail(r.error);
    for (const [key, after] of this.edits) {
      const s = this.sources.get(key);
      if (s) this.sources.set(key, { ...s, decls: after });
    }
    this.edits.clear();
    this.message = { kind: "ok", text: `Saved to ${r.files.map(shortFile).join(", ")}` };
    this.emit();
    // Next rebuilds the CSS and swaps it in; check it did, in case the browser kept an old copy
    for (const ms of [1500, 4000]) setTimeout(() => void refreshSavedSheets(r.files), ms);
  }

  async createRule(file: string, selector: string) {
    const r = await post({ create: { file, selector, decls: [] } });
    if (!r.ok) return this.fail(r.error);
    this.message = { kind: "ok", text: `Added ${selector} to ${shortFile(file)}` };
    await this.load(); // Next swaps in the rebuilt sheet; the <head> watcher in StyleEditor re-indexes once it lands
  }

  private fail(text: string) {
    this.message = { kind: "error", text };
    this.emit();
  }

  select(el: Element | null) {
    this.selected = el;
    this.target = null;
    this.picking = false;
    this.emit();
  }
}

async function post(payload: unknown): Promise<{ ok: true; files: string[] } | { ok: false; error: string }> {
  try {
    const r = await fetch(API, { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
    const data = (await r.json()) as { files?: string[]; error?: string };
    return r.ok ? { ok: true, files: data.files ?? [] } : { ok: false, error: data.error ?? `error ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const store = new Store();

export const shortFile = (f: string) => f.replace(/^app\//, "");

export function isActive(l: LiveRule): boolean {
  return l.conds.every((c) =>
    c instanceof CSSMediaRule ? matchMedia(c.media.mediaText).matches
    : c instanceof CSSSupportsRule ? CSS.supports(c.conditionText)
    : true);
}

export const conditionLabel = (l: LiveRule) =>
  l.conds.map((c) => (c instanceof CSSMediaRule ? `@media ${c.media.mediaText}` : c.cssText.split("{")[0]!.trim())).join(" ");

const safeMatches = (el: Element, sel: string) => {
  try {
    return el.matches(sel);
  } catch {
    return false;
  }
};

/** The rules that apply to an element (or would, in a state like :hover), best first, and which declarations win. */
export function cascade(el: Element): Cascade {
  const matches: Match[] = [];
  const found = new Set<string>(); // a source rule the compiler split in parts is listed once, as its first part
  for (const live of store.live) {
    if (found.has(live.key)) continue;
    let best: Match | null = null;
    for (const part of splitTop(live.rule.selectorText)) {
      const states = part.match(STATES);
      const state = states ? states.join("") : null;
      const bare = states ? part.replace(STATES, "").replace(/\(\s*\)/g, "") || "*" : part;
      if (!safeMatches(el, bare)) continue;
      const m: Match = { live, spec: specificity(part), active: isActive(live), state, part };
      if (!best || (best.state && !state) || (!!best.state === !!state && compareSpec(m.spec, best.spec) > 0)) best = m;
    }
    if (best) {
      matches.push(best);
      found.add(live.key);
    }
  }
  // priority: rules that apply now before conditional ones, then specificity, then source order
  const now = (m: Match) => (!m.state && m.active ? 1 : 0);
  matches.sort((a, b) => now(b) - now(a) || compareSpec(b.spec, a.spec) || b.live.order - a.live.order);

  const inline: Decl[] = [];
  const style = (el as HTMLElement).style;
  if (style) for (const p of Array.from(style)) inline.push({ prop: p, value: style.getPropertyValue(p), important: style.getPropertyPriority(p) === "important" });

  // candidates in the order the cascade resolves them: !important first, inline beats rules at equal importance
  type Cand = { id: string; key: string; decl: Decl; tier: number };
  const cands: Cand[] = [];
  inline.forEach((d) => cands.push({ id: `inline#${d.prop}`, key: "inline", decl: d, tier: d.important ? 4 : 2 }));
  for (const m of matches) {
    if (m.state || !m.active) continue;
    store.declsOf(m.live.key).forEach((d, i) => cands.push({ id: `${m.live.key}#${i}`, key: m.live.key, decl: d, tier: d.important ? 3 : 1 }));
  }
  const rank = new Map(matches.map((m, i) => [m.live.key, i]));
  // within one rule a later declaration beats an earlier one, so each rule's declarations go last-first
  cands.sort((a, b) => b.tier - a.tier || (rank.get(a.key) ?? -1) - (rank.get(b.key) ?? -1) || declIndex(b) - declIndex(a));

  const winner = new Map<string, string>();
  const applied = new Set<string>();
  for (const c of cands) {
    let wins = false;
    for (const lh of longhands(c.decl.prop, c.decl.value)) {
      if (!winner.has(lh)) { winner.set(lh, c.key); wins = true; }
    }
    if (wins) applied.add(c.id);
  }
  return { matches, applied, winner, inline };
}

/** The rule the quick controls edit by default: the element's own class rule (`.fact`, `.btn.primary`)
 *  rather than a narrower one like `.fact:first-child`; failing that, the strongest rule that applies. */
export function defaultTarget(el: Element, matches: Match[]): Match | null {
  const usable = matches.filter((m) => !m.state && m.active && m.live.source);
  const own = usable.find((m) => {
    const sel = /^([a-z][\w-]*)?((\.[\w-]+)+)$/i.exec(m.part.trim());
    return !!sel && (!sel[1] || sel[1].toLowerCase() === el.tagName.toLowerCase())
      && sel[2]!.slice(1).split(".").every((c) => el.classList.contains(c));
  });
  return own ?? usable[0] ?? null;
}

const declIndex = (c: { id: string }) => Number(c.id.split("#").at(-1)) || 0;

/** For inherited properties the element's own rules do not set: the nearest ancestor whose rules do, and that rule. */
export function inheritedFrom(el: Element, props: string[]): Map<string, { el: Element; key: string }> {
  const out = new Map<string, { el: Element; key: string }>();
  let todo = props.filter((p) => !cascade(el).winner.has(p));
  for (let p = el.parentElement; p && todo.length; p = p.parentElement) {
    const { winner } = cascade(p);
    for (const prop of todo) {
      const w = winner.get(prop);
      if (w) out.set(prop, { el: p, key: w });
    }
    todo = todo.filter((t) => !out.has(t));
  }
  return out;
}

/** A readable label for an element: tag#id.class.class */
export function label(el: Element): string {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + cls.map((c) => `.${c}`).join("");
}

/** A selector to suggest for a new rule targeting this element. */
export function suggestSelector(el: Element): string {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  if (cls.length) return `.${cls[0]}`;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const pc = typeof p.className === "string" ? p.className.trim().split(/\s+/).filter(Boolean)[0] : undefined;
    if (pc) return `.${pc} ${el.tagName.toLowerCase()}`;
  }
  return el.tagName.toLowerCase();
}

// ---------- which source file each part of a stylesheet came from

// Turbopack starts each file's CSS in a chunk with a comment: /* [project]/app/(admin)/admin.css [app-client] (css) */
const MARKER = /\/\* \[(project|next)\]\/(.+?) \[[^\]]*\] \(css\) \*\//g;
type FileOf = WeakMap<CSSRule, string>;
const fileMaps = new WeakMap<CSSStyleSheet, Promise<FileOf | null>>();

/** The source file of each top-level rule in a stylesheet, or null when the sheet does not say (an
 *  inline <style>, or `next dev` without Turbopack). Read once per sheet object, before the editor
 *  changes it; Next replaces the whole sheet when a file changes. */
function sheetFiles(sheet: CSSStyleSheet): Promise<FileOf | null> {
  let p = fileMaps.get(sheet);
  if (!p) {
    p = (async () => {
      const href = sheet.href;
      if (!href || new URL(href).origin !== location.origin || !new URL(href).pathname.startsWith("/_next/")) return null;
      try {
        const rules = Array.from(sheet.cssRules); // before the fetch, so later edits cannot shift it
        loaded.set(sheet, rules.filter(notImport).map(ruleText));
        const text = await serverCss(href);
        if (refreshIfStale(sheet, text)) return null; // a fresh copy is on its way; it is indexed when it lands
        const marks = [...text.matchAll(MARKER)];
        if (!marks.length) return null;
        const fileOf: FileOf = new WeakMap();
        let n = 0;
        marks.forEach((m, i) => {
          const chunk = text.slice(m.index! + m[0].length, marks[i + 1]?.index ?? text.length);
          const scratch = new CSSStyleSheet(); // counts the file's top-level rules the way the browser does
          scratch.replaceSync(chunk);
          const file = m[1] === "project" ? m[2]! : `[next]/${m[2]}`;
          if (scratch.cssRules.length) filesIn.set(sheet, (filesIn.get(sheet) ?? new Set()).add(file));
          for (let k = 0; k < scratch.cssRules.length; k++) if (rules[n + k]) fileOf.set(rules[n + k]!, file);
          n += scratch.cssRules.length;
        });
        return n === rules.length ? fileOf : null; // counts disagree (the file changed meanwhile): trust nothing
      } catch {
        return null;
      }
    })();
    fileMaps.set(sheet, p);
  }
  return p;
}

// ---------- keeping the page's CSS current after a save

/** What the browser loaded for each sheet (each rule's text), read before the editor changes anything. */
const loaded = new WeakMap<CSSStyleSheet, string[]>();
/** The project files each sheet was built from. */
const filesIn = new WeakMap<CSSStyleSheet, Set<string>>();
/** Links the editor added, and the server's text each was loaded for (so it never loops). */
const madeFor = new WeakMap<Element, string>();

/** A stylesheet as the dev server sends it now: a unique URL, so no cache can answer instead. */
async function serverCss(href: string): Promise<string> {
  const url = new URL(href);
  url.searchParams.set("se", `${Date.now()}${Math.random().toString(36).slice(2, 6)}`);
  return (await fetch(url, { cache: "no-store" })).text();
}

const notImport = (r: CSSRule) => !(typeof CSSImportRule !== "undefined" && r instanceof CSSImportRule);
// url()s are left out: a browser may serialise them resolved against different base URLs
const ruleText = (r: CSSRule) => r.cssText.replace(/url\([^)]*\)/g, "url()");

/**
 * When a .css file changes, Next (Turbopack) swaps in a new <link> to the same URL. Safari can reuse
 * its old copy of that URL instead of downloading it again (WebKit bug 187726; Turbopack only adds a
 * cache-busting query for Firefox), so the page keeps the old CSS and the edit seems to vanish.
 * If what the browser loaded differs from what the server sends now, load the sheet again under a
 * unique URL, the same way Turbopack does for Firefox. Returns true if it did.
 */
function refreshIfStale(sheet: CSSStyleSheet, serverText: string): boolean {
  const link = sheet.ownerNode;
  const had = loaded.get(sheet);
  if (!(link instanceof HTMLLinkElement) || !had || !link.isConnected) return false;
  const scratch = new CSSStyleSheet();
  scratch.replaceSync(serverText);
  const now = Array.from(scratch.cssRules).filter(notImport).map(ruleText);
  if (now.length === had.length && now.every((t, i) => t === had[i])) return false;
  const base = (link.getAttribute("href") ?? "").split("?")[0]!;
  if (!base || madeFor.get(link) === serverText) return false; // our own fresh copy: never loop
  const fresh = document.createElement("link");
  madeFor.set(fresh, serverText);
  for (const a of Array.from(link.attributes)) fresh.setAttribute(a.name, a.value);
  // keep the URL's start: Turbopack finds the sheet for its next update by `href^="<url>?"`
  fresh.setAttribute("href", `${base}?ts=${Date.now()}`);
  fresh.addEventListener("load", () => link.remove(), { once: true });
  link.after(fresh);
  return true;
}

/** After a save: once the dev server has rebuilt, re-load any sheet with the saved files that the
 *  browser still holds an old copy of (covers Safari, and an update that never arrived). */
async function refreshSavedSheets(files: string[]) {
  for (const sheet of Array.from(document.styleSheets)) {
    const own = filesIn.get(sheet);
    if (!sheet.href || !own || !files.some((f) => own.has(f))) continue;
    try {
      refreshIfStale(sheet, await serverCss(sheet.href));
    } catch {
      /* the dev server restarted; its own reload takes care of it */
    }
  }
}

/** Every style rule in a sheet, in cascade order, with the at-rules around it and its file. */
function styleRules(sheet: CSSStyleSheet, fileOf: FileOf | null): Item[] {
  const out: Item[] = [];
  const walk = (list: CSSRuleList, context: string[], conds: CSSRule[], file: string | null) => {
    for (const r of Array.from(list)) {
      const f = file ?? fileOf?.get(r) ?? null;
      if (r instanceof CSSStyleRule) {
        const selector = normSelector(r.selectorText);
        out.push({ rule: r, file: f, context, selector, conds });
        if (r.cssRules?.length) walk(r.cssRules, [...context, `rule ${selector}`], conds, f);
      } else if (r instanceof CSSMediaRule) walk(r.cssRules, [...context, `media ${normCondition(r.media.mediaText)}`], [...conds, r], f);
      else if (r instanceof CSSSupportsRule) walk(r.cssRules, [...context, `supports ${normCondition(r.conditionText)}`], [...conds, r], f);
      else if (typeof CSSContainerRule !== "undefined" && r instanceof CSSContainerRule) {
        walk(r.cssRules, [...context, `container ${normCondition(r.containerName + r.containerQuery)}`], [...conds, r], f);
      } else if (typeof CSSLayerBlockRule !== "undefined" && r instanceof CSSLayerBlockRule) {
        walk(r.cssRules, [...context, `layer ${normCondition(r.name)}`], [...conds, r], f);
      }
    }
  };
  try {
    walk(sheet.cssRules, [], [], null);
  } catch {
    /* a sheet still loading, or from another origin */
  }
  return out;
}

/** The compiler merged adjacent source rules into one (`.a, .b { x }`): put them back as separate rules
 *  in the live sheet, same declarations and position, so each can be previewed on its own. */
function unmerge(item: Item, sources: SourceRule[], fileOf: FileOf): Item[] | null {
  const rule = item.rule;
  const parent = (rule.parentRule as CSSGroupingRule | null) ?? rule.parentStyleSheet;
  if (!parent || rule.cssRules?.length) return null;
  const parts = splitTop(rule.selectorText);
  if (parts.length !== sources.reduce((n, s) => n + splitTop(s.selector).length, 0)) return null;
  try {
    let at = Array.from(parent.cssRules).indexOf(rule);
    const body = rule.style.cssText;
    parent.deleteRule(at);
    return sources.map((s) => {
      const selectorText = parts.splice(0, splitTop(s.selector).length).join(", ");
      parent.insertRule(`${selectorText} { ${body} }`, at);
      const r = parent.cssRules[at++] as CSSStyleRule;
      if (!rule.parentRule && item.file) fileOf.set(r, item.file);
      return { ...item, rule: r, selector: normSelector(r.selectorText) };
    });
  } catch {
    return null;
  }
}
