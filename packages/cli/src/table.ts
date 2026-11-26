/**
 * Pads cells into aligned columns. Header labels come from the catalog and differ in length per
 * language, so widths are measured, not fixed.
 */
export const formatTable = (
  rows: readonly (readonly string[])[],
): readonly string[] => {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    });
  }
  return rows.map((row) =>
    row
      .map((cell, index) =>
        index === row.length - 1 ? cell : cell.padEnd(widths[index] ?? 0),
      )
      .join("   ")
      .trimEnd(),
  );
};
