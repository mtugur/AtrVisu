// @vitest-environment jsdom
import { Matrix, Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMeasureAuthority } from "../../measure/measureAuthority";
import { installMeasureViewportAdapter } from "./measureViewportAdapter";
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });
const setup = () => {
    const canvas = document.createElement("canvas");
    canvas.tabIndex = 0;
    document.body.append(canvas);
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON() { } });
    const captures = new Set<number>();
    canvas.setPointerCapture = id => { captures.add(id); };
    canvas.hasPointerCapture = id => captures.has(id);
    canvas.releasePointerCapture = id => { captures.delete(id); };
    const pick = vi.fn(() => ({ hit: true, pickedPoint: new Vector3(1, 2, 3), pickedMesh: { metadata: { instanceId: "actual-machine" } } }));
    const scene = { pick, getTransformMatrix: () => Matrix.Identity(), onAfterRenderObservable: { add: vi.fn(), remove: vi.fn() } } as unknown as Scene;
    const authority = createMeasureAuthority();
    const context = { selectionIds: [], entities: [], machines: [] };
    authority.dispatch({ type: "toggle" }, context);
    const onAction = vi.fn(action => authority.dispatch(action, context));
    const adapter = installMeasureViewportAdapter({ scene, camera: {} as ArcRotateCamera, canvas, authority, onAction, diagnostics: () => false });
    const send = (type: string, x = 100, pointerId = 1) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, { button: 0, buttons: type === "pointerup" ? 0 : 1, isPrimary: true, pointerId, clientX: x, clientY: 100 });
        canvas.dispatchEvent(event);
    };
    return { canvas, authority, adapter, send, pick, onAction };
};
describe("Measure native event ownership without a Babylon Engine", () => {
    it.each(["pointercancel", "lostpointercapture", "blur"])("%s before up cancels and the late up cannot revive it", type => {
        const { authority, adapter, send } = setup();
        send("pointerdown");
        send(type);
        send("pointerup");
        expect(authority.getSnapshot()?.points).toEqual([]);
        expect(authority.getSnapshot()?.lastPress?.confirmed).toBe(false);
        adapter.dispose();
    });
    it("a native pending capture release before its event is still rejected on up", () => {
        const { canvas, authority, adapter, send } = setup();
        send("pointerdown");
        canvas.releasePointerCapture(1);
        send("pointerup");
        expect(authority.getSnapshot()?.points).toEqual([]);
        expect(authority.getSnapshot()?.lastPress?.reason).toBe("pre-up capture loss");
        adapter.dispose();
    });
    it("confirms current surface only on valid up, once, and ignores normal later capture loss", () => {
        const { authority, adapter, send, pick } = setup();
        send("pointerdown");
        expect(authority.getSnapshot()?.points).toHaveLength(0);
        send("pointermove", 104);
        send("pointerup", 104);
        send("lostpointercapture");
        send("pointerup", 104);
        expect(authority.getSnapshot()?.points).toEqual([{ xMm: 1000, yMm: 3000, zMm: 2000, entityId: "machine:actual-machine" }]);
        expect(authority.getSnapshot()?.lastPress).toMatchObject({ maximum: 4, confirmed: true });
        expect(pick).toHaveBeenCalled();
        adapter.dispose();
    });
    it("modal/text Enter/Escape stays with that editor; viewport Escape uses the registered action", () => {
        const { canvas, adapter, onAction } = setup();
        const input = document.createElement("input");
        document.body.append(input);
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(onAction).not.toHaveBeenCalled();
        const modal = document.createElement("dialog");
        modal.open = true;
        document.body.append(modal);
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(onAction).not.toHaveBeenCalled();
        modal.remove();
        canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: "exit" });
        adapter.dispose();
    });
});
