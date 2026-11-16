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

/**
 * What StepProgress says about where you are: shown in the compact line and announced for the columns row.
 * It is the only place a flow states «Paso N de M», so a screen header must not repeat it.
 */
export function stepAnnouncement(current: number, labels: readonly string[]): string {
  const total = labels.length;
  const index = Math.min(Math.max(current, 0), Math.max(total - 1, 0));
  const label = labels[index];
  return label ? `Paso ${index + 1} de ${total}: ${label}` : `Paso ${index + 1} de ${total}`;
}
