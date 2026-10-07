import { describe, expect, it, vi } from "vitest";
import { guardMeasureCommandBindings } from "./measureCommandGate";
import { createRuntimeFeatureCommandBridge } from "../platform/runtimeCommands/runtimeFeatureCommands";
import { createExecutedRuntimeCommandResult } from "../platform/runtimeCommands/runtimeCommandOperation";
describe("Measure preserves registered command authority", () => {
    it("blocks mutation and history at the live binding, including direct registry execution", () => {
        let active = true;
        const execute = vi.fn(() => createExecutedRuntimeCommandResult());
        const bindings = guardMeasureCommandBindings({
            "level.setDatum": { getEnableState: () => ({ enabled: true }), execute },
            "view.fitView": { getEnableState: () => ({ enabled: true }), execute },
            "view.measure": { getEnableState: () => ({ enabled: true }), execute }
        }, () => active);
        const bridge = createRuntimeFeatureCommandBridge(() => bindings);
        const context = { selectionIds: [], hasUnsavedChanges: false };
        expect(bridge.executeCommand("level.setDatum", context)).toMatchObject({ handled: false, status: "disabled", reason: /Exit Measure/ });
        bridge.registry.get("level.setDatum")!.execute(context);
        expect(execute).not.toHaveBeenCalled();
        expect(bridge.executeCommand("view.fitView", context)).toMatchObject({ handled: true });
        expect(bridge.executeCommand("view.measure", context)).toMatchObject({ handled: true });
        active = false;
        expect(bridge.executeCommand("level.setDatum", context)).toMatchObject({ handled: true });
        expect(execute).toHaveBeenCalledTimes(3);
    });
    it("preserves existing disabled/locked reasons and permits read-only capture", () => {
        const bindings = guardMeasureCommandBindings({
            "edit.undo": { getEnableState: () => ({ enabled: false, reason: "Nothing to undo." }) },
            "commercial.exportScenePng": { getEnableState: () => ({ enabled: true }) }
        }, () => true);
        expect(bindings["edit.undo"].getEnableState().enabled).toBe(false);
        expect(bindings["commercial.exportScenePng"].getEnableState().enabled).toBe(true);
        const inactive = guardMeasureCommandBindings(bindings, () => false);
        // The source bindings are never replaced or mutated by registration.
        expect(inactive["commercial.exportScenePng"].getEnableState().enabled).toBe(true);
    });
});
