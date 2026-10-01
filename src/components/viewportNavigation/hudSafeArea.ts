export const getViewportHudSafeInsets = (left: number, right: number, width: number) => {
  const finite = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const available = Math.max(0, finite(width) - 160);
  const desiredLeft = finite(left);
  const desiredRight = finite(right);
  const scale = desiredLeft + desiredRight > available ? available / (desiredLeft + desiredRight) : 1;
  return { left: desiredLeft * scale, right: desiredRight * scale };
};
