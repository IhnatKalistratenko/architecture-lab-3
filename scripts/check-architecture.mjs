import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walk(path.join(directory, entry.name)));
      }
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function importsIn(source) {
  const imports = new Set();
  const staticImport = /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g;
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(staticImport)) imports.add(match[1]);
  for (const match of source.matchAll(dynamicImport)) imports.add(match[1]);
  return [...imports];
}

function resolveLocalImport(importer, specifier, root, knownFiles) {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(importer), specifier);
  const candidates = [base];
  for (const extension of sourceExtensions) candidates.push(`${base}${extension}`);
  for (const extension of sourceExtensions) candidates.push(path.join(base, `index${extension}`));
  return candidates.find((candidate) => knownFiles.has(candidate) && isWithin(root, candidate));
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function moduleName(file, srcRoot) {
  if (!isWithin(srcRoot, file) || file === srcRoot) return undefined;
  return path.relative(srcRoot, file).split(path.sep)[0];
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function stockWriteLocations(file, source, root) {
  const relative = path.relative(root, file).split(path.sep);
  if (relative[0] !== "src" || !["orders", "checkout"].includes(relative[1])) return [];

  const locations = [];
  const stockPath = "\\b[A-Za-z_$][\\w$]*(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*)*\\s*\\.\\s*stock";
  const directMutation = new RegExp(`${stockPath}\\s*\\.\\s*(?:set|delete|clear|update|reserve)\\s*\\(`, "g");
  const directAssignment = new RegExp(`${stockPath}(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*|\\s*\\[[^\\]]+\\])*\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--)`, "g");
  const stockRowAssignment = new RegExp(`${stockPath}\\s*\\.\\s*get\\s*\\([^)]*\\)\\s*!?\\s*(?:\\.\\s*available|\\[\\s*["']available["']\\s*\\])\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--)`, "g");
  for (const pattern of [directMutation, directAssignment, stockRowAssignment]) {
    for (const match of source.matchAll(pattern)) {
      locations.push({ line: lineNumber(source, match.index), expression: match[0].trim() });
    }
  }

  // Also catch the common `const stock = database.stock; stock.set(...)` form.
  const aliases = [...source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\.\s*stock\b/g)]
    .map((match) => match[1]);
  for (const match of source.matchAll(/\b(?:const|let|var)\s*\{\s*stock(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*\}\s*=\s*[A-Za-z_$][\w$]*/g)) {
    aliases.push(match[1] ?? "stock");
  }
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const aliasMutation = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:set|delete|clear|update|reserve)\\s*\\(`, "g");
    const aliasAssignment = new RegExp(`\\b${escaped}\\s*\\[[^\\]]+\\]\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--)`, "g");
    const aliasRowAssignment = new RegExp(`\\b${escaped}\\s*\\.\\s*get\\s*\\([^)]*\\)\\s*!?\\s*(?:\\.\\s*available|\\[\\s*["']available["']\\s*\\])\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--)`, "g");
    for (const pattern of [aliasMutation, aliasAssignment, aliasRowAssignment]) {
      for (const match of source.matchAll(pattern)) {
        locations.push({ line: lineNumber(source, match.index), expression: match[0].trim() });
      }
    }
  }
  return [...new Map(locations.map((location) => [`${location.line}:${location.expression}`, location])).values()];
}

function dependencyCycles(graph, root) {
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(file) {
    state.set(file, 1);
    stack.push(file);
    for (const dependency of graph.get(file) ?? []) {
      if (!state.has(dependency)) {
        visit(dependency);
      } else if (state.get(dependency) === 1) {
        const start = stack.indexOf(dependency);
        const cycle = [...stack.slice(start), dependency];
        cycles.push(cycle.map((entry) => path.relative(root, entry)).join(" -> "));
      }
    }
    stack.pop();
    state.set(file, 2);
  }

  for (const file of graph.keys()) {
    if (!state.has(file)) visit(file);
  }
  return [...new Set(cycles)];
}

export function checkArchitecture(root = process.cwd()) {
  root = path.resolve(root);
  const srcRoot = path.join(root, "src");
  const files = walk(root);
  const knownFiles = new Set(files);
  const graph = new Map(files.map((file) => [file, []]));
  const violations = [];

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const source = stripComments(original);
    for (const specifier of importsIn(source)) {
      const target = resolveLocalImport(file, specifier, root, knownFiles);
      if (!target) continue;
      graph.get(file).push(target);

      if (isWithin(srcRoot, target)) {
        const targetParts = path.relative(srcRoot, target).split(path.sep);
        const internalIndex = targetParts.indexOf("internal");
        if (internalIndex !== -1) {
          const fromModule = moduleName(file, srcRoot);
          const targetModule = targetParts[0];
          if (fromModule !== targetModule) {
            violations.push(
              `${path.relative(root, file)} imports internal file ${specifier} from another module (${targetModule}).`,
            );
          }
        }
      }
    }

    for (const write of stockWriteLocations(file, source, root)) {
      violations.push(
        `${path.relative(root, file)}:${write.line} writes Inventory storage directly (${write.expression}); use the Inventory API.`,
      );
    }
  }

  for (const cycle of dependencyCycles(graph, root)) {
    violations.push(`Local import dependency cycle: ${cycle}.`);
  }
  return violations;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const rootIndex = process.argv.indexOf("--root");
  const root = rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd();
  if (!root) {
    console.error("Usage: node scripts/check-architecture.mjs [--root <repository-root>]");
    process.exitCode = 2;
  } else {
    const violations = checkArchitecture(root);
    if (violations.length > 0) {
      console.error("Architecture check failed:");
      for (const violation of violations) console.error(`- ${violation}`);
      process.exitCode = 1;
    } else {
      console.log("Architecture check passed: no cross-module internals, direct Inventory writes, or local import cycles.");
    }
  }
}
