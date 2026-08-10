import { useCallback, useState } from "react";

export const MAX_CASCADING_FLYOUT_DEPTH = 2 as const;
export type CascadingFlyoutDepth = 1 | 2;

export type CascadingFlyoutState = Readonly<{
  openPath: readonly string[];
}>;

export const createCascadingFlyoutState = (): CascadingFlyoutState =>
  Object.freeze({ openPath: Object.freeze([]) });

export const openCascadingFlyout = (
  state: CascadingFlyoutState,
  depth: CascadingFlyoutDepth,
  branchId: string
): CascadingFlyoutState => {
  if (depth === 2 && state.openPath.length === 0) {
    throw new Error("A depth-two flyout requires an open depth-one branch.");
  }
  return Object.freeze({
    openPath: Object.freeze([
      ...state.openPath.slice(0, depth - 1),
      branchId
    ])
  });
};

export const closeCascadingFlyout = (
  state: CascadingFlyoutState,
  depth: CascadingFlyoutDepth
): CascadingFlyoutState => Object.freeze({
  openPath: Object.freeze(state.openPath.slice(0, depth - 1))
});

export const closeCascadingFlyoutRoot = (): CascadingFlyoutState =>
  createCascadingFlyoutState();

export const useCascadingFlyoutState = () => {
  const [state, setState] = useState<CascadingFlyoutState>(createCascadingFlyoutState);
  const open = useCallback((depth: CascadingFlyoutDepth, branchId: string) => {
    setState((current) => openCascadingFlyout(current, depth, branchId));
  }, []);
  const close = useCallback((depth: CascadingFlyoutDepth) => {
    setState((current) => closeCascadingFlyout(current, depth));
  }, []);
  const closeRoot = useCallback(() => setState(closeCascadingFlyoutRoot()), []);

  return { state, open, close, closeRoot } as const;
};
