/**
 * How `StepProgress` lays out its labels: equal columns while the widest label fits its column, else one
 * compact line («Paso N de M: label»). Dynamic Type past ×1.3 always goes compact. Until the row has been
 * measured, columns are assumed (the first frame).
 */
export function stepRowLayout({
  count,
  fontScale,
  gap,
  labelWidths,
  rowWidth,
}: {
  count: number;
  fontScale: number;
  gap: number;
  labelWidths: readonly number[];
  rowWidth: number;
}): 'columns' | 'compact' {
  if (fontScale > 1.3) return 'compact';
  if (rowWidth <= 0 || count === 0 || labelWidths.filter((w) => w > 0).length < count) return 'columns';
  const column = (rowWidth - gap * (count - 1)) / count;
  return Math.max(...labelWidths) > column ? 'compact' : 'columns';
}
