/** Opens a map search for the exact place agreed in the invitation. */
export function trainingPlaceMapUrl(placeLabel: string): string {
  const place = placeLabel.trim();
  if (!place) throw new Error('El encuentro no tiene un lugar para buscar.');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
