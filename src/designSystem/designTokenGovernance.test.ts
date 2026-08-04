// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
const {
  DESIGN_TOKEN_ALLOWLIST,
  runDesignTokenGovernance,
  scanDesignTokenSource,
  validateDesignTokenAllowlist
// @ts-expect-error The dependency-free JavaScript scanner intentionally has no TS package surface.
} = await import("../../scripts/check-design-tokens.mjs");

type DesignTokenViolation = Readonly<{
  type: string;
  value: string;
}>;

const readFixture = (name: string) => readFile(
  new URL(`../../scripts/fixtures/designTokens/${name}`, import.meta.url),
  "utf8"
);

describe("design token governance", () => {
  it("accepts semantic token usage", async () => {
    expect(scanDesignTokenSource(
      "src/example.css",
      await readFixture("valid-token.css"),
      []
    )).toEqual([]);
  });

  it.each([
    ["hex", "#"],
    ["rgb", "rgba"],
    ["hsl", "hsl"]
  ])("rejects unauthorized %s CSS colors", async (type, signal) => {
    const violations = scanDesignTokenSource(
      "src/example.css",
      await readFixture("raw-css-colors.css"),
      []
    ) as DesignTokenViolation[];
    expect(violations.some((violation) => violation.type === type)).toBe(true);
    expect(violations.some((violation) => violation.value.includes(signal))).toBe(true);
  });

  it("rejects direct Color3, Color4, and FromHexString construction", async () => {
    const violationTypes = (scanDesignTokenSource(
      "src/example.ts",
      await readFixture("raw-babylon-colors.ts"),
      []
    ) as DesignTokenViolation[]).map((violation) => violation.type);

    expect(violationTypes).toEqual(expect.arrayContaining([
      "color3-constructor",
      "color4-constructor",
      "from-hex-string"
    ]));
  });

  it("accepts exact theme and technical palette authorities", async () => {
    for (const entry of DESIGN_TOKEN_ALLOWLIST) {
      const source = await readFile(new URL(`../../${entry.path}`, import.meta.url), "utf8");
      expect(scanDesignTokenSource(entry.path, source)).toEqual([]);
    }
  });

  it("rejects unjustified broad allowlist entries", () => {
    expect(validateDesignTokenAllowlist([{
      path: "src/**",
      reason: "This broad exception would hide future violations.",
      matchTypes: ["hex"]
    }])).toContainEqual(expect.stringContaining("exact src path"));
  });

  it("passes the maintained production source tree", async () => {
    await expect(runDesignTokenGovernance()).resolves.toMatchObject({
      passed: true,
      allowlistErrors: [],
      violations: []
    });
  });
});
