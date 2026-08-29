/**
 * One-shot measurement script for _R1#117. Not a guard, not committed as a
 * permanent test. Produces the raw data behind the markdown census: every
 * equality or inequality comparison in the tree where either side traces
 * to a process.env read, directly or through a same-file variable alias,
 * classified as a secret compare or something else.
 *
 * Run with: node --experimental-strip-types scripts/secret-compare-census.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const SCAN_DIRS = ["src", "scripts"];

const EQUALITY_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".worktrees") continue;
      results.push(...collectSourceFiles(full));
    } else if (
      entry.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx")) &&
      path.resolve(full) !== THIS_FILE
    ) {
      results.push(full);
    }
  }
  return results;
}

/** True if this expression's text directly contains a process.env read. */
function textHasProcessEnv(text: string): boolean {
  return /\bprocess\s*\.\s*env\b/.test(text);
}

/**
 * Builds the set of identifier names in this file whose declared value
 * traces to process.env, directly or through a chain of same-file aliases.
 * Iterates to a fixed point so multi-hop chains resolve, such as
 * apiKey -> expected, the real shape from the #106 bypass this ticket's
 * own #116 fix responded to.
 */
/**
 * True if this initializer, at its own top level, is a plain alias rather
 * than a computation: a bare identifier, a process.env access, a member
 * access rooted at a traced identifier, or one of those wrapped in a
 * nullish/logical-or default, an optional chain, or a type assertion. This
 * is deliberately strict. A comparison that merely uses a value COMPUTED
 * from an env read, such as a filtered array length, is not the same
 * finding as a variable that IS an env value one or more renames removed,
 * which is the exact shape of the #106 bypass this census exists to catch.
 * Anything more computed than this does not propagate the trace, so the
 * count below stays tied to real aliasing chains, not incidental reuse of
 * an unrelated identifier.
 */
function aliasTarget(expr: ts.Expression): { text: string } | null {
  let e = expr;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isNonNullExpression(e) ||
    ts.isSatisfiesExpression(e)
  ) {
    e = ts.isParenthesizedExpression(e) ? e.expression : (e as ts.AsExpression | ts.NonNullExpression | ts.SatisfiesExpression).expression;
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    return aliasTarget(e.left);
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
    return aliasTarget(e.left);
  }
  if (ts.isIdentifier(e)) return { text: e.text };
  if (ts.isPropertyAccessExpression(e)) {
    const base = aliasTarget(e.expression);
    return base ? { text: `${base.text}.${e.name.text}` } : null;
  }
  return null;
}

function extractEnvVarNames(text: string): string[] {
  const names: string[] = [];
  const re1 = /process\s*\.\s*env\s*\.\s*([A-Za-z0-9_]+)/g;
  const re2 = /process\s*\.\s*env\s*\[\s*["']([A-Za-z0-9_]+)["']\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(text))) names.push(m[1]);
  while ((m = re2.exec(text))) names.push(m[1]);
  return names;
}

/**
 * Traced identifier name to the env var name or names it was aliased
 * from, so a hit on `expected` two renames away from
 * `process.env.API_KEY` still classifies on API_KEY rather than
 * reporting no env var name resolved.
 */
function buildEnvTracedNames(sourceFile: ts.SourceFile): { names: Set<string>; envVarByName: Map<string, string[]> } {
  const declarations: Array<{ name: string; initializer: ts.Expression }> = [];

  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name)) {
        declarations.push({ name: node.name.text, initializer: node.initializer });
      } else if (ts.isObjectBindingPattern(node.name) && textHasProcessEnv(node.initializer.getText(sourceFile))) {
        // const { FOO, BAR: baz } = process.env destructuring only. Bound
        // names here always trace, since the source object is process.env
        // itself, not a computation.
        for (const el of node.name.elements) {
          if (ts.isIdentifier(el.name)) {
            declarations.push({ name: el.name.text, initializer: node.initializer });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const traced = new Set<string>();
  const envVarByName = new Map<string, string[]>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const decl of declarations) {
      if (traced.has(decl.name)) continue;
      const initText = decl.initializer.getText(sourceFile);
      const target = aliasTarget(decl.initializer);
      const direct = textHasProcessEnv(initText) && target !== null;
      const aliasRoot = target ? target.text.split(".")[0] : null;
      const viaAlias = aliasRoot ? traced.has(aliasRoot) : false;
      if (direct || viaAlias) {
        traced.add(decl.name);
        const ownNames = extractEnvVarNames(initText);
        const inherited = aliasRoot ? (envVarByName.get(aliasRoot) ?? []) : [];
        envVarByName.set(decl.name, Array.from(new Set([...ownNames, ...inherited])));
        changed = true;
      }
    }
  }
  return { names: traced, envVarByName };
}

function sideIsEnvTraced(expr: ts.Expression, sourceFile: ts.SourceFile, envNames: Set<string>): boolean {
  const text = expr.getText(sourceFile);
  if (textHasProcessEnv(text)) return true;
  if (ts.isIdentifier(expr) && envNames.has(expr.text)) return true;
  // Property access off a traced object, e.g. config.FOO where config traces.
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && envNames.has(expr.expression.text)) {
    return true;
  }
  return false;
}

function resolvedEnvVarNames(
  expr: ts.Expression,
  sourceFile: ts.SourceFile,
  envVarByName: Map<string, string[]>,
): string[] {
  const text = expr.getText(sourceFile);
  const own = extractEnvVarNames(text);
  if (ts.isIdentifier(expr)) {
    return Array.from(new Set([...own, ...(envVarByName.get(expr.text) ?? [])]));
  }
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
    return Array.from(new Set([...own, ...(envVarByName.get(expr.expression.text) ?? [])]));
  }
  return own;
}

type Hit = {
  file: string;
  line: number;
  operator: string;
  text: string;
  envVarNames: string[];
  category: string;
};

function classify(envVarNames: string[], fullText: string): string {
  const names = envVarNames.map((n) => n.toUpperCase());
  if (names.includes("NODE_ENV")) return "NODE_ENV check";
  if (names.some((n) => n.startsWith("VERCEL_"))) return "VERCEL_ENV check";
  if (names.some((n) => n.includes("URL"))) return "URL comparison";
  if (names.some((n) => n.includes("FLAG") || n.includes("ENABLE") || n.includes("FEATURE"))) return "feature flag";
  if (names.some((n) => /SECRET|TOKEN|KEY|PASSWORD|AUTH|CREDENTIAL/.test(n))) return "secret compare";
  if (names.length === 0) return "unclear, no env var name resolved";
  return "other";
}

function scanFile(file: string): Hit[] {
  const content = fs.readFileSync(file, "utf-8");
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const { names: envNames, envVarByName } = buildEnvTracedNames(sourceFile);
  const hits: Hit[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && EQUALITY_OPS.has(node.operatorToken.kind)) {
      const leftHit = sideIsEnvTraced(node.left, sourceFile, envNames);
      const rightHit = sideIsEnvTraced(node.right, sourceFile, envNames);
      if (leftHit || rightHit) {
        const fullText = node.getText(sourceFile);
        const envVarNames = Array.from(
          new Set([
            ...resolvedEnvVarNames(node.left, sourceFile, envVarByName),
            ...resolvedEnvVarNames(node.right, sourceFile, envVarByName),
          ]),
        );
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        hits.push({
          file: path.relative(ROOT, file),
          line,
          operator: node.operatorToken.getText(sourceFile),
          text: fullText.replace(/\s+/g, " ").slice(0, 160),
          envVarNames,
          category: classify(envVarNames, fullText),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

const allFiles = SCAN_DIRS.flatMap((d) => collectSourceFiles(path.join(ROOT, d)));
const allHits = allFiles.flatMap(scanFile);

console.log(JSON.stringify({ totalFilesScanned: allFiles.length, totalHits: allHits.length, hits: allHits }, null, 2));
