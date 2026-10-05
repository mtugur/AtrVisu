import type { CommandContext, CommandEnableState } from "../platform/contracts";
import { getPlatformCommandSeedById } from "../platform/registrySeeds";
import { MEASURE_ACTIVE_REASON } from "./measureAuthority";
// These commands can replace project/selection context or start a stateful editing
// flow despite non-mutating metadata. Camera and read-only exports remain live.
const contextChangingCommands = new Set([
    "edit.undo", "edit.redo", "project.save", "project.importJson",
    "project.restorePrompt", "project.manager", "layout.controls",
    "assembly.enterEdit", "assembly.exitEdit", "library.importAsset",
    "library.manager", "library.taxonomyManager", "simulation.controls"
]);
export function guardMeasureCommandBindings<T extends Record<string, {
    getEnableState: (context: CommandContext) => CommandEnableState;
} | undefined>>(bindings: T, isActive: () => boolean): T {
    return Object.fromEntries(Object.entries(bindings).map(([id, binding]) => {
        if (!binding)
            return [id, binding];
        const blocked = getPlatformCommandSeedById(id)?.mutatesData
            || contextChangingCommands.has(id);
        return [id, {
                ...binding,
                getEnableState: (context: CommandContext): CommandEnableState => blocked && isActive()
                    ? { enabled: false, reason: MEASURE_ACTIVE_REASON }
                    : binding.getEnableState(context)
            }];
    })) as T;
}
