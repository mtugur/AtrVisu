export const isTextEditingElement = (target: EventTarget | null): boolean => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    (typeof HTMLInputElement !== "undefined" && target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== "undefined" && target instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== "undefined" && target instanceof HTMLSelectElement) ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
};

export const shouldHandleGlobalUndoRedo = (event: Pick<KeyboardEvent, "target" | "ctrlKey" | "metaKey" | "key">) => {
  if (!event.ctrlKey && !event.metaKey) {
    return false;
  }

  const key = event.key.toLowerCase();
  if (key !== "z" && key !== "y") {
    return false;
  }

  return !isTextEditingElement(event.target);
};
