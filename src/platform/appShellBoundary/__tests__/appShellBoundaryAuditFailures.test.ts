import { describe, expect, it } from "vitest";
import { createAppShellBoundaryAuditReportFromZones } from "../appShellBoundaryAudit";
import type { AppShellBoundaryZone } from "../appShellBoundaryTypes";

const appRootZone: AppShellBoundaryZone = {
  id: "app-root",
  label: "App Root",
  type: "root",
  owner: "existing-app",
  sourceFiles: ["src/App.tsx"],
  responsibilities: ["Own shell composition."],
  refactorNotes: ["Keep root shell behavior stable."],
  riskLevel: "high"
};

const sceneViewportZone: AppShellBoundaryZone = {
  id: "scene-viewport",
  label: "Scene Viewport",
  type: "viewport",
  owner: "existing-app",
  sourceFiles: ["src/components/BabylonScene.tsx"],
  responsibilities: ["Render scene viewport."],
  refactorNotes: ["Keep viewport isolated."],
  riskLevel: "high"
};

const panelZone: AppShellBoundaryZone = {
  id: "machine-library",
  label: "Machine Library",
  type: "panel",
  owner: "existing-app",
  sourceFiles: ["src/components/MachineLibrary.tsx"],
  responsibilities: ["Expose machine library."],
  refactorNotes: ["Preserve existing access."],
  riskLevel: "medium"
};

const modalZone: AppShellBoundaryZone = {
  id: "modal-layer",
  label: "Modal Layer",
  type: "modal",
  owner: "existing-app",
  sourceFiles: ["src/components/ProjectManager.tsx"],
  responsibilities: ["Host modal managers."],
  refactorNotes: ["Keep close behavior stable."],
  riskLevel: "medium"
};

const validZones: readonly AppShellBoundaryZone[] = [appRootZone, sceneViewportZone, panelZone, modalZone];

const hasIssue = (zones: readonly AppShellBoundaryZone[], code: string, severity: "error" | "warning") =>
  createAppShellBoundaryAuditReportFromZones(zones).issues.some((issue) =>
    issue.code === code && issue.severity === severity
  );

describe("app shell boundary audit failures", () => {
  it("reports duplicate zone ids", () => {
    expect(hasIssue([appRootZone, appRootZone, sceneViewportZone, panelZone, modalZone], "zone-id-duplicate", "error")).toBe(true);
  });

  it("reports empty ids", () => {
    expect(hasIssue([{ ...panelZone, id: "" }, appRootZone, sceneViewportZone, modalZone], "zone-id-empty", "error")).toBe(true);
  });

  it("reports empty labels", () => {
    expect(hasIssue([{ ...panelZone, label: "" }, appRootZone, sceneViewportZone, modalZone], "zone-label-empty", "error")).toBe(true);
  });

  it("reports empty source files", () => {
    expect(hasIssue([{ ...panelZone, sourceFiles: [] }, appRootZone, sceneViewportZone, modalZone], "zone-source-files-empty", "error")).toBe(true);
  });

  it("reports empty responsibilities", () => {
    expect(hasIssue([{ ...panelZone, responsibilities: [] }, appRootZone, sceneViewportZone, modalZone], "zone-responsibilities-empty", "error")).toBe(true);
  });

  it("reports empty refactor notes as a warning", () => {
    expect(hasIssue([{ ...panelZone, refactorNotes: [] }, appRootZone, sceneViewportZone, modalZone], "zone-refactor-notes-empty", "warning")).toBe(true);
  });

  it("reports missing app-root", () => {
    expect(hasIssue([sceneViewportZone, panelZone, modalZone], "required-zone-missing", "error")).toBe(true);
  });

  it("reports missing scene-viewport", () => {
    expect(hasIssue([appRootZone, panelZone, modalZone], "required-zone-missing", "error")).toBe(true);
  });

  it("reports missing panel zones", () => {
    expect(hasIssue([appRootZone, sceneViewportZone, modalZone], "panel-zone-missing", "error")).toBe(true);
  });

  it("reports missing modal zones as a warning", () => {
    expect(hasIssue([appRootZone, sceneViewportZone, panelZone], "modal-zone-missing", "warning")).toBe(true);
  });

  it("does not report errors for valid local data", () => {
    expect(createAppShellBoundaryAuditReportFromZones(validZones).errorCount).toBe(0);
  });
});
