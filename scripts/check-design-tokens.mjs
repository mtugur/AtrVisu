import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DESIGN_COLOR_MATCH_TYPES = Object.freeze([
  "hex",
  "rgb",
  "hsl",
  "color3-constructor",
  "color4-constructor",
  "from-hex-string"
]);

const matchers = Object.freeze([
  { type: "hex", expression: /#[0-9a-fA-F]{3,8}\b/g },
  { type: "rgb", expression: /\brgba?\s*\(/gi },
  { type: "hsl", expression: /\bhsla?\s*\(/gi },
  { type: "color3-constructor", expression: /\bnew\s+(?:BABYLON\.)?Color3\s*\(/g },
  { type: "color4-constructor", expression: /\bnew\s+(?:BABYLON\.)?Color4\s*\(/g },
  { type: "from-hex-string", expression: /\b(?:BABYLON\.)?(?:Color3|Color4)\.FromHexString\s*\(/g }
]);

export const DESIGN_TOKEN_ALLOWLIST = Object.freeze([
  Object.freeze({
    path: "src/designSystem/themes.css",
    reason: "Dark, light, and system semantic theme values are defined here.",
    matchTypes: Object.freeze(["hex", "rgb"])
  }),
  Object.freeze({
    path: "src/designSystem/technicalPalette.ts",
    reason: "Immutable technical rendering color values are governed here.",
    matchTypes: Object.freeze(["hex", "rgb"])
  }),
  Object.freeze({
    path: "src/designSystem/technicalPaletteBabylon.ts",
    reason: "Babylon color instances are created only by this technical palette adapter.",
    matchTypes: Object.freeze([
      "color3-constructor",
      "color4-constructor",
      "from-hex-string"
    ])
  })
]);

const normalizePath = (value) => value.replaceAll("\\", "/");

export const validateDesignTokenAllowlist = (allowlist) => {
  const errors = [];
  const knownTypes = new Set(DESIGN_COLOR_MATCH_TYPES);
  const seenPaths = new Set();

  for (const entry of allowlist) {
    if (typeof entry.path !== "string" || !entry.path.startsWith("src/")
      || /[*?{}[\]]/.test(entry.path)) {
      errors.push(`Allowlist path must be an exact src path: ${String(entry.path)}`);
    }
    if (seenPaths.has(entry.path)) {
      errors.push(`Duplicate allowlist path: ${entry.path}`);
    }
    seenPaths.add(entry.path);
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 12) {
      errors.push(`Allowlist entry requires a specific reason: ${entry.path}`);
    }
    if (!Array.isArray(entry.matchTypes) || entry.matchTypes.length === 0) {
      errors.push(`Allowlist entry requires expected match types: ${entry.path}`);
      continue;
    }
    for (const matchType of entry.matchTypes) {
      if (!knownTypes.has(matchType)) {
        errors.push(`Unknown allowlist match type "${matchType}" for ${entry.path}`);
      }
    }
  }

  return errors;
};

export const findDesignColorMatches = (source) => matchers.flatMap(({ type, expression }) => {
  const matches = [];
  expression.lastIndex = 0;
  let match = expression.exec(source);
  while (match) {
    const line = source.slice(0, match.index).split("\n").length;
    matches.push({ type, value: match[0], line });
    match = expression.exec(source);
  }
  return matches;
});

export const scanDesignTokenSource = (
  relativePath,
  source,
  allowlist = DESIGN_TOKEN_ALLOWLIST
) => {
  const normalizedPath = normalizePath(relativePath);
  const allowance = allowlist.find((entry) => entry.path === normalizedPath);
  const allowedTypes = new Set(allowance?.matchTypes ?? []);
  return findDesignColorMatches(source)
    .filter((match) => !allowedTypes.has(match.type))
    .map((match) => ({ ...match, path: normalizedPath }));
};

const isMaintainedSource = (fileName) => {
  if (!/\.(?:css|ts|tsx)$/.test(fileName)) {
    return false;
  }
  return !/\.(?:test|spec)\.(?:ts|tsx)$/.test(fileName)
    && !fileName.endsWith(".d.ts");
};

const collectMaintainedSources = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectMaintainedSources(absolutePath));
    } else if (entry.isFile() && isMaintainedSource(entry.name)) {
      results.push(absolutePath);
    }
  }
  return results;
};

export const runDesignTokenGovernance = async ({
  rootDirectory = process.cwd(),
  allowlist = DESIGN_TOKEN_ALLOWLIST
} = {}) => {
  const allowlistErrors = validateDesignTokenAllowlist(allowlist);
  if (allowlistErrors.length > 0) {
    return { passed: false, allowlistErrors, violations: [], scannedFileCount: 0 };
  }

  const sourceRoot = path.join(rootDirectory, "src");
  const sourceFiles = await collectMaintainedSources(sourceRoot);
  const violations = [];
  const encounteredByAllowedPath = new Map();

  for (const absolutePath of sourceFiles.sort()) {
    const relativePath = normalizePath(path.relative(rootDirectory, absolutePath));
    const source = await readFile(absolutePath, "utf8");
    const matches = findDesignColorMatches(source);
    const allowance = allowlist.find((entry) => entry.path === relativePath);
    if (allowance) {
      encounteredByAllowedPath.set(relativePath, new Set(matches.map((match) => match.type)));
    }
    violations.push(...scanDesignTokenSource(relativePath, source, allowlist));
  }

  for (const entry of allowlist) {
    const encountered = encounteredByAllowedPath.get(entry.path) ?? new Set();
    for (const expectedType of entry.matchTypes) {
      if (!encountered.has(expectedType)) {
        allowlistErrors.push(`Stale allowlist match type "${expectedType}" for ${entry.path}`);
      }
    }
  }

  return {
    passed: allowlistErrors.length === 0 && violations.length === 0,
    allowlistErrors,
    violations,
    scannedFileCount: sourceFiles.length
  };
};

const isDirectExecution = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const result = await runDesignTokenGovernance();
  if (!result.passed) {
    for (const error of result.allowlistErrors) {
      console.error(`[design-token-allowlist] ${error}`);
    }
    for (const violation of result.violations) {
      console.error(
        `[design-token-governance] ${violation.path}:${violation.line} `
        + `${violation.type} ${violation.value}`
      );
    }
    process.exitCode = 1;
  } else {
    console.log(`Design token governance passed (${result.scannedFileCount} maintained files).`);
  }
}
