export type VisibilityTarget = {
  isVisible: boolean;
};

export const captureWithoutEditorAffordances = async <Result>(
  targets: readonly VisibilityTarget[],
  capture: () => Promise<Result>
) => {
  const states = targets.map((target) => ({ target, isVisible: target.isVisible }));
  states.forEach(({ target }) => {
    target.isVisible = false;
  });
  try {
    return await capture();
  } finally {
    states.forEach(({ target, isVisible }) => {
      target.isVisible = isVisible;
    });
  }
};
