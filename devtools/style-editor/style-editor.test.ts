import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendRule, applyRuleEdit, cssFiles, EditError, handleStyleEditor, sourceRules } from "./server";
import { alignRules, composeBox, expandBox, normSelector, nudge, readProp, specificity, writeProp, writeSides, type Decl } from "./shared";

const d = (prop: string, value: string): Decl => ({ prop, value, important: false });

describe("style editor: matching the browser's rules to the source", () => {
  it("spells a selector the same way the browser and the file do", () => {
    expect(normSelector(".a>.b")).toBe(normSelector(".a > .b"));
    expect(normSelector('[data-theme="dark"]')).toBe(normSelector("[data-theme=dark]"));
    expect(normSelector(".x:before")).toBe(normSelector(".x::before"));
    expect(normSelector(".fact:nth-child(n + 4)")).toBe(normSelector(".fact:nth-child(n+4)"));
    expect(normSelector(".fact:nth-child(odd)")).toBe(normSelector(".fact:nth-child(2n + 1)"));
    expect(normSelector(".a .b")).not.toBe(normSelector(".a.b"));
    // Next's CSS compiler drops a `*` that sits next to a pseudo-element
    expect(normSelector(".lp *::before")).toBe(normSelector(".lp ::before"));
    expect(normSelector("*, *::before, *::after")).toBe(normSelector("*, ::before, ::after"));
    expect(normSelector("[href*=wa]")).toBe("[href*=wa]");
  });
  it("computes specificity", () => {
    expect(specificity("table.data th")).toEqual([0, 1, 2]);
    expect(specificity(".navlink[aria-current=page]")).toEqual([0, 2, 0]);
    expect(specificity(":root:not([data-theme=light]) .atlas-page")).toEqual([0, 3, 0]);
    expect(specificity(".layer:has(input:checked)")).toEqual([0, 2, 1]);
    expect(specificity(":where(.a) p")).toEqual([0, 0, 1]);
    expect(specificity("#id .x::before")).toEqual([1, 1, 1]);
  });
  it("lists rules with their @media context and repeat count", () => {
    const css = ".a { gap: 1px; }\n@media (max-width:960px) { .a { gap: 2px; } }\n.a { color: red; }\n@keyframes k { from { opacity: 0; } }";
    const refs = sourceRules(css, "/x.css").rules.map((r) => r.ref);
    expect(refs.map((r) => [r.context, r.occurrence, r.line])).toEqual([[[], 0, 1], [["media (max-width:960px)"], 0, 2], [[], 1, 3]]);
  });
});

describe("style editor: lining up the compiled CSS with the source", () => {
  const src = (css: string) => sourceRules(css, "/x.css").rules.map((r) => r.ref);
  const live = (selector: string, context: string[] = []) => ({ selector: normSelector(selector), context });
  const lines = (a: ReturnType<typeof alignRules>) =>
    a.map((x) => (x.kind === "one" ? x.source.line : x.kind === "merged" ? x.sources.map((s) => s.line) : null));

  it("treats the parts of a rule split around a fallback as that rule", () => {
    const sources = src(".nav {\n  gap: 4px;\n  background: color-mix(in srgb, red 88%, transparent);\n  top: 0;\n}\n.nav .brand { x: y; }");
    const items = [live(".nav"), live(".nav", ["supports (color:color-mix(inlab,red,red))"]), live(".nav"), live(".nav .brand")];
    expect(lines(alignRules(items, sources))).toEqual([1, 1, 1, 6]);
  });
  it("finds adjacent rules merged into one selector list", () => {
    const sources = src(".nav a:hover { color: red; }\n.nav a.on { color: red; }\n.z { x: y; }");
    expect(lines(alignRules([live(".nav a:hover, .nav a.on"), live(".z")], sources))).toEqual([[1, 2], 3]);
  });
  it("finds a selector list split into one rule per selector", () => {
    const sources = src(".a:focus-visible,\n.b:focus-visible { outline: 0; }\n.p { x: y; }\n.q { x: y; }");
    const items = [live(".a:focus-visible"), live(".b:focus-visible"), live(".p, .q")];
    expect(lines(alignRules(items, sources))).toEqual([1, 1, [3, 4]]);
  });
  it("keeps real repeats apart, skips generated rules and rules that never arrive", () => {
    const sources = src("@media (min-width: 720px) { .a { x: 1; } }\n.a { x: 2; }\n.a { x: 3; }\n.gone {}\n.b { x: 4; }");
    const items = [live("*, ::before", ["layer base"]), live(".a", ["media (min-width:720px)"]), live(".a"), live(".a"), live(".b"), live(".b::-webkit-input-placeholder")];
    expect(lines(alignRules(items, sources))).toEqual([null, 1, 2, 3, 5, null]);
  });
});

describe("style editor: editing values", () => {
  it("nudges the number under the caret, with a step to suit the unit", () => {
    expect(nudge("18px 20px", 6, 1, "padding")?.value).toBe("18px 21px");
    expect(nudge("1.55", 0, 1, "line-height")?.value).toBe("1.6");
    expect(nudge("-0.025em", 0, -1, "letter-spacing")?.value).toBe("-0.03em");
    expect(nudge("500 13.5px var(--f-sans)", 0, 1, "font")?.value).toBe("510 13.5px var(--f-sans)");
    expect(nudge("clamp(28px, 3.6vw, 40px)", 20, 10, "font-size")?.value).toBe("clamp(28px, 3.6vw, 50px)");
    expect(nudge("#e4572e", 3, 1, "color")).toBeNull();
  });
  it("expands and recomposes box shorthands", () => {
    expect(expandBox("18px 20px")).toEqual(["18px", "20px", "18px", "20px"]);
    expect(composeBox(["4px", "4px", "4px", "4px"])).toBe("4px");
    expect(composeBox(["3px", "10px", "3px", "8px"])).toBe("3px 10px 3px 8px");
    expect(composeBox(["1px", "2px", "3px", "2px"])).toBe("1px 2px 3px");
  });
  it("edits a shorthand in place rather than adding a longhand", () => {
    expect(writeProp([d("padding", "18px 20px")], "padding-left", "24px")).toEqual([d("padding", "18px 20px 18px 24px")]);
    expect(writeProp([d("gap", "12px")], "column-gap", "20px")).toEqual([d("gap", "12px 20px")]);
    expect(writeProp([d("font", "500 13.5px var(--f-sans)")], "font-size", "15px")).toEqual([d("font", "500 15px var(--f-sans)")]);
    expect(writeProp([d("font", "15px/1.55 var(--f-sans)")], "line-height", "1.6")).toEqual([d("font", "15px/1.6 var(--f-sans)")]);
    expect(writeProp([d("font", "inherit")], "font-size", "15px")).toEqual([d("font", "inherit"), d("font-size", "15px")]);
    expect(readProp([d("font", "500 11px var(--f-mono)")], "font-weight")).toBe("500");
    expect(readProp([d("padding", "8px 14px")], "padding-right")).toBe("14px");
  });
  it("adds, updates and removes plain properties", () => {
    expect(writeProp([d("gap", "8px")], "text-align", "center")).toEqual([d("gap", "8px"), d("text-align", "center")]);
    expect(writeProp([d("gap", "8px"), d("color", "red")], "gap", null)).toEqual([d("color", "red")]);
    expect(writeSides([], "padding", { top: "4px", right: "4px", bottom: "4px", left: "4px" })).toEqual([d("padding", "4px")]);
    expect(writeSides([], "margin", { top: "4px" })).toEqual([d("margin-top", "4px")]);
  });
});

describe("style editor: writing back to the file", () => {
  const css = `.card { background: white; }
.card-pad { padding: 18px 20px; }
@media (max-width: 960px) {
  .content { padding-top: 18px; }
}
`;
  const ref = (selector: string, context: string[] = []) => ({ file: "/x.css", selector, context, occurrence: 0 });

  it("changes only the edited value and keeps the formatting", () => {
    const out = applyRuleEdit(css, { ref: ref(".card-pad"), before: [d("padding", "18px 20px")], after: [d("padding", "16px 24px")] });
    expect(out).toBe(css.replace("18px 20px", "16px 24px"));
  });
  it("adds a declaration in the rule's own style, one-line or multi-line", () => {
    const one = applyRuleEdit(css, { ref: ref(".card"), before: [d("background", "white")], after: [d("background", "white"), d("text-align", "center")] });
    expect(one).toContain(".card { background: white; text-align: center; }");
    const multi = `.x {\n  color: red;\n}\n`;
    expect(applyRuleEdit(multi, { ref: { ...ref(".x"), file: "/x.css" }, before: [d("color", "red")], after: [d("color", "red"), d("gap", "4px")] }))
      .toBe(`.x {\n  color: red;\n  gap: 4px;\n}\n`);
  });
  it("edits the rule inside the right @media block and removes declarations", () => {
    const out = applyRuleEdit(css, { ref: ref(".content", ["media (max-width:960px)"]), before: [d("padding-top", "18px")], after: [] });
    expect(out).toContain("@media (max-width: 960px) {\n  .content { }\n}");
  });
  it("refuses an edit if the file changed since the editor read it", () => {
    expect(() => applyRuleEdit(css, { ref: ref(".card-pad"), before: [d("padding", "1px")], after: [] })).toThrow(EditError);
    expect(() => applyRuleEdit(css, { ref: ref(".nope"), before: [], after: [] })).toThrow(EditError);
  });
  it("appends a new rule, in the style most of the file uses", () => {
    expect(appendRule(".a { x: y; }", ".lede p", [d("font-size", "14px")])).toBe(".a { x: y; }\n.lede p { font-size: 14px; }\n");
    expect(appendRule(".a {\n  x: y;\n}\n", ".b", [d("gap", "4px")])).toBe(".a {\n  x: y;\n}\n.b {\n  gap: 4px;\n}\n");
    const empty = appendRule(".a {\n  x: y;\n}\n", ".b", []);
    expect(applyRuleEdit(empty, { ref: { file: "/x.css", selector: ".b", context: [], occurrence: 0 }, before: [], after: [d("gap", "4px")] }))
      .toBe(".a {\n  x: y;\n}\n.b {\n  gap: 4px;\n}\n");
    expect(() => appendRule("", ".a { }", [])).toThrow(EditError);
  });
});

describe("style editor: the dev-server route", () => {
  let root: string;
  const css = ".card { padding: 8px; }\n";
  const req = (method: string, body?: unknown, headers: Record<string, string> = { "x-style-editor": "1" }) =>
    new Request("http://localhost:3000/api/dev/style-editor", { method, headers: { host: "localhost:3000", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "hali-se-"));
    mkdirSync(join(root, "app", "(admin)"), { recursive: true });
    mkdirSync(join(root, "node_modules", "x"), { recursive: true });
    mkdirSync(join(root, "devtools"), { recursive: true });
    writeFileSync(join(root, "app", "(admin)", "admin.css"), css);
    writeFileSync(join(root, "app", "globals.css"), "body { margin: 0; }\n");
    writeFileSync(join(root, "node_modules", "x", "a.css"), ".x {}");
    writeFileSync(join(root, "devtools", "panel.css"), ".se {}");
    vi.stubEnv("NODE_ENV", "development");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("finds the app's stylesheets as project-relative paths", () => {
    expect(cssFiles(root)).toEqual(["app/(admin)/admin.css", "app/globals.css"]);
  });
  it("lists rules and saves an edit into the file", async () => {
    const list = await (await handleStyleEditor(req("GET"), root)).json();
    expect(list.files).toEqual(["app/(admin)/admin.css", "app/globals.css"]);
    const card = list.rules.find((r: { selector: string }) => r.selector === ".card");
    const ref = { file: card.file, context: card.context, selector: card.selector, occurrence: card.occurrence };
    const res = await handleStyleEditor(req("POST", { edits: [{ ref, before: card.decls, after: [d("padding", "12px")] }] }), root);
    expect(res.status).toBe(200);
    expect(readFileSync(join(root, "app", "(admin)", "admin.css"), "utf8")).toBe(".card { padding: 12px; }\n");
  });
  it("only writes the app's own stylesheets", async () => {
    const ref = { file: "../outside.css", context: [], selector: ".x", occurrence: 0 };
    const res = await handleStyleEditor(req("POST", { edits: [{ ref, before: [], after: [] }] }), root);
    expect(res.status).toBe(409);
    const own = await handleStyleEditor(req("POST", { create: { file: "devtools/panel.css", selector: ".y", decls: [] } }), root);
    expect(own.status).toBe(409);
  });
  it("refuses other sites and production", async () => {
    expect((await handleStyleEditor(req("GET", undefined, {}), root)).status).toBe(403);
    expect((await handleStyleEditor(req("GET", undefined, { "x-style-editor": "1", origin: "https://evil.example" }), root)).status).toBe(403);
    vi.stubEnv("NODE_ENV", "production");
    expect((await handleStyleEditor(req("GET"), root)).status).toBe(404);
  });
});
