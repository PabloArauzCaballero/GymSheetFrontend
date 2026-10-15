/**
 * Colores de los marcadores del mapa social. Leaflet los pide como cadenas en
 * `pathOptions` (no admite variables CSS), así que viven aquí, en el directorio
 * de tema, y no como literales dentro de la pantalla.
 */
export const mapMarkerColors = {
  people: '#c8f31d',
  registeredGym: '#5b62ea',
  externalGym: '#ef8f35',
} as const;
