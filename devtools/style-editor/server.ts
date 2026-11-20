// Server half of the style editor: lists the rules in the app's .css files and writes edits made in
// the browser back into them. Served by app/api/dev/style-editor/route.dev.ts, a route that only
// exists under `npm run dev` (see pageExtensions in next.config.ts), and refuses to run otherwise.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { normCondition, normSelector, sameDecls, type Decl, type RuleRef, type SourceRule } from "./shared";

export class EditError extends Error {}

function contextOf(rule: Rule): string[] | null {
  const ctx: string[] = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type === "atrule") {
      const a = p as AtRule;
      if (/keyframes$/i.test(a.name)) return null; // keyframe steps are not selectors
      ctx.unshift(`${a.name.toLowerCase()} ${normCondition(a.params)}`);
    } else if (p.type === "rule") ctx.unshift(`rule ${normSelector((p as Rule).selector)}`);
  }
  return ctx;
}

const declsOf = (rule: Rule): Declaration[] => (rule.nodes ?? []).filter((n): n is Declaration => n.type === "decl");

/** Every style rule in a stylesheet, with the reference the browser side uses to find it. */
export function sourceRules(css: string, file: string) {
  const root = postcss.parse(css, { from: file });
  const seen = new Map<string, number>();
  const rules: { rule: Rule; ref: SourceRule }[] = [];
  root.walkRules((rule) => {
    const context = contextOf(rule);
    if (!context) return;
    const selector = normSelector(rule.selector);
    const k = JSON.stringify([context, selector]);
    const occurrence = seen.get(k) ?? 0;
    seen.set(k, occurrence + 1);
    const decls = declsOf(rule).map((d) => ({ prop: d.prop, value: d.value, important: !!d.important }));
    rules.push({ rule, ref: { file, context, selector, occurrence, line: rule.source?.start?.line ?? 0, decls } });
  });
  return { root, rules };
}

/** Make a rule's declarations equal `after`, touching only what changed so the file keeps its formatting. */
function patchRule(rule: Rule, after: readonly Decl[]) {
  const existing = declsOf(rule);
  const kept = new Set<Declaration>();
  const seen = new Map<string, number>();
  const added: Decl[] = [];
  for (const d of after) {
    const n = seen.get(d.prop) ?? 0;
    seen.set(d.prop, n + 1);
    const node = existing.filter((e) => e.prop === d.prop)[n];
    if (!node) { added.push(d); continue; }
    kept.add(node);
    if (node.value !== d.value) node.value = d.value;
    if (!!node.important !== d.important) node.important = d.important;
  }
  for (const node of existing) if (!kept.has(node)) node.remove();
  const oneLine = !/\n/.test(rule.toString());
  for (const d of added) {
    const last = declsOf(rule).at(-1);
    const node = postcss.decl({ prop: d.prop, value: d.value, important: d.important });
    node.raws.before = last?.raws.before ?? (oneLine ? " " : "\n  ");
    node.raws.between = last?.raws.between ?? ": ";
    rule.append(node);
    if (oneLine && !rule.raws.after) rule.raws.after = " ";
  }
  rule.raws.semicolon = true;
}

const sameRef = (a: RuleRef, b: RuleRef) =>
  a.selector === b.selector && a.occurrence === b.occurrence && JSON.stringify(a.context) === JSON.stringify(b.context);

/** Apply one rule edit to a stylesheet's text. Refuses if the rule changed on disk since the browser read it. */
export function applyRuleEdit(css: string, edit: { ref: RuleRef; before: Decl[]; after: Decl[] }): string {
  const { root, rules } = sourceRules(css, edit.ref.file);
  const hit = rules.find((r) => sameRef(r.ref, edit.ref));
  if (!hit) throw new EditError(`${edit.ref.selector} is no longer in the file`);
  if (!sameDecls(hit.ref.decls, edit.before)) throw new EditError(`${edit.ref.selector} was changed in the file since the editor read it; reload and try again`);
  patchRule(hit.rule, edit.after);
  return root.toString();
}

/** Add a new rule at the end of a stylesheet, written one-line or multi-line to match most of the file's rules. */
export function appendRule(css: string, selector: string, decls: Decl[]): string {
  if (!selector.trim() || /[{}]/.test(selector)) throw new EditError("not a valid selector");
  try {
    postcss.parse(`${selector} {}`);
  } catch {
    throw new EditError("not a valid selector");
  }
  let multi = 0, one = 0;
  postcss.parse(css).walkRules((r) => { if (/\n/.test(r.toString())) multi++; else one++; });
  const text = (d: Decl) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
  const body = multi > one
    ? `\n${decls.map((d) => `  ${text(d)}\n`).join("")}`
    : decls.length ? ` ${decls.map(text).join(" ")} ` : " ";
  return `${css.replace(/\s*$/, "\n")}${selector.trim()} {${body}}\n`;
}

// ---------- the route

/** Where the app's own stylesheets live, relative to the project root. */
const CSS_DIRS = ["app", "components"];
const SKIP = new Set(["node_modules", ".next", "devtools"]);

/** Every editable stylesheet, as project-relative paths with forward slashes ("app/(admin)/admin.css"),
 *  the same spelling Turbopack uses in its CSS chunks ("[project]/app/(admin)/admin.css"). */
export function cssFiles(projectRoot: string): string[] {
  const walk = (dir: string): string[] => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(p);
      return e.name.endsWith(".css") ? [p] : [];
    });
  };
  return CSS_DIRS.flatMap((d) => walk(join(projectRoot, d))).map((f) => relative(projectRoot, f).split(sep).join("/")).sort();
}

type SaveRequest = {
  edits?: { ref: RuleRef; before: Decl[]; after: Decl[] }[];
  create?: { file: string; selector: string; decls: Decl[] };
};

const json = (status: number, data: unknown) => Response.json(data, { status });

/** GET lists the rules in every stylesheet; POST writes edits. Development only. */
export async function handleStyleEditor(req: Request, projectRoot = process.cwd()): Promise<Response> {
  if (process.env.NODE_ENV !== "development") return json(404, { error: "not found" });
  // only the editor's own page may call this: a custom header forces a CORS preflight on other sites
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (req.headers.get("x-style-editor") !== "1" || (origin && new URL(origin).host !== host)) {
    return json(403, { error: "forbidden" });
  }
  const root = resolve(projectRoot);
  try {
    const files = cssFiles(root);
    const read = (f: string) => readFileSync(join(root, f), "utf8");
    if (req.method === "GET") {
      const rules = files.flatMap((f) => sourceRules(read(f), f).rules.map((r) => r.ref));
      return json(200, { files, rules });
    }
    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > 1_000_000) throw new EditError("request too large");
      const { edits = [], create } = JSON.parse(text) as SaveRequest;
      const byFile = new Map<string, string>();
      const current = (f: string) => {
        if (!files.includes(f)) throw new EditError(`not an editable stylesheet: ${f}`);
        return byFile.get(f) ?? read(f);
      };
      for (const e of edits) byFile.set(e.ref.file, applyRuleEdit(current(e.ref.file), e));
      if (create) byFile.set(create.file, appendRule(current(create.file), create.selector, create.decls));
      // every edit applied cleanly: only now write, so a refused edit leaves all files untouched
      for (const [f, css] of byFile) writeFileSync(join(root, f), css);
      return json(200, { ok: true, files: [...byFile.keys()] });
    }
    return json(405, { error: "method not allowed" });
  } catch (err) {
    return json(err instanceof EditError ? 409 : 400, { error: err instanceof Error ? err.message : String(err) });
  }
}
