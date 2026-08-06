import { describe, expect, it } from "vitest";
import {
  ANNOTATION_TECHNICAL_STYLES,
  CIVIL_TECHNICAL_COLORS,
  TECHNICAL_CSS_COLORS,
  TECHNICAL_COLOR_RGB,
  TECHNICAL_COLOR_RGBA
} from "./technicalPalette";
import { createTechnicalColor3, createTechnicalColor4 } from "./technicalPaletteBabylon";

describe("technical palette authority", () => {
  it("retains immutable technical meanings", () => {
    expect(Object.isFrozen(TECHNICAL_COLOR_RGB)).toBe(true);
    expect(Object.isFrozen(TECHNICAL_COLOR_RGBA)).toBe(true);
    expect(Object.isFrozen(TECHNICAL_CSS_COLORS)).toBe(true);
    expect(Object.isFrozen(CIVIL_TECHNICAL_COLORS)).toBe(true);
    expect(Object.isFrozen(ANNOTATION_TECHNICAL_STYLES)).toBe(true);
    Object.values(TECHNICAL_COLOR_RGB).forEach((color) => {
      expect(Object.isFrozen(color)).toBe(true);
    });
    Object.values(TECHNICAL_COLOR_RGBA).forEach((color) => {
      expect(Object.isFrozen(color)).toBe(true);
    });
    Object.values(ANNOTATION_TECHNICAL_STYLES).forEach((style) => {
      expect(Object.isFrozen(style)).toBe(true);
    });
    expect(TECHNICAL_COLOR_RGB.collisionActive).toEqual([1, 0.22, 0.16]);
    expect(TECHNICAL_COLOR_RGB.selectionPrimary).toEqual([1, 0.86, 0.28]);
    expect(TECHNICAL_COLOR_RGB.measurement).toEqual([0.98, 0.98, 0.72]);
    expect(TECHNICAL_COLOR_RGB.clearanceFrame).toEqual([1, 0.56, 0.22]);
    expect(TECHNICAL_COLOR_RGB.diagnosticsInfo).toEqual([0.25, 0.78, 1]);
    expect(TECHNICAL_COLOR_RGB.connectionPoint).toBeDefined();
    expect(TECHNICAL_COLOR_RGB.annotation).toBeDefined();
    expect(CIVIL_TECHNICAL_COLORS.column).toBe("#b6bdc8");
    expect(ANNOTATION_TECHNICAL_STYLES.warning.accentColor).toBe("#ffd166");
  });

  it("rejects runtime mutation of tuple channels and annotation styles", () => {
    const selection = TECHNICAL_COLOR_RGB.selectionPrimary as unknown as number[];
    const warning = ANNOTATION_TECHNICAL_STYLES.warning as unknown as {
      accentColor: string;
    };

    expect(() => { selection[0] = 0; }).toThrow(TypeError);
    expect(() => { warning.accentColor = "mutated"; }).toThrow(TypeError);
    expect(TECHNICAL_COLOR_RGB.selectionPrimary).toEqual([1, 0.86, 0.28]);
    expect(ANNOTATION_TECHNICAL_STYLES.warning.accentColor).toBe("#ffd166");
  });

  it("returns independent Babylon color instances", () => {
    const first = createTechnicalColor3("selectionPrimary");
    const second = createTechnicalColor3("selectionPrimary");
    const clearFirst = createTechnicalColor4("sceneClear");
    const clearSecond = createTechnicalColor4("sceneClear");

    expect(first).not.toBe(second);
    expect(first.asArray()).toEqual(second.asArray());
    expect(clearFirst).not.toBe(clearSecond);
    expect(clearFirst.asArray()).toEqual(clearSecond.asArray());

    first.r = 0;
    clearFirst.a = 0;
    expect(second.asArray()).toEqual([1, 0.86, 0.28]);
    expect(clearSecond.asArray()).toEqual([0.035, 0.045, 0.055, 1]);
    expect(TECHNICAL_COLOR_RGB.selectionPrimary).toEqual([1, 0.86, 0.28]);
    expect(TECHNICAL_COLOR_RGBA.sceneClear).toEqual([0.035, 0.045, 0.055, 1]);
  });
});
