/**
 * Memory luminance: the opacity of a point for a retrievability. Below about 0.55 recall is a coin toss and
 * everything looks equally dim; above 0.97 it is equally bright. The floor keeps a faded card visible.
 */
export const memoryOpacity = (retrievability: number | null): number =>
  retrievability === null
    ? 0.55
    : Math.min(1, Math.max(0.16, (retrievability - 0.55) / 0.42));
