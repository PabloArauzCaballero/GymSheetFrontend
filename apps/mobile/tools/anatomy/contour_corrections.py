"""Correcciones locales de contornos tras vectorizar las máscaras anatómicas."""


def _replace_recess(ring, start, end):
    """Une los hombros de una muesca sin alterar el resto del contorno."""
    points = [ring[index:index + 2] for index in range(0, len(ring), 2)]

    def nearest(target):
        return min(range(len(points)), key=lambda index: (
            (points[index][0] - target[0]) ** 2 +
            (points[index][1] - target[1]) ** 2
        ))

    first = nearest(start)
    last = nearest(end)
    if first >= last or last - first < 8:
        raise ValueError("No se encontró la muesca pectoral esperada")
    for index, target in ((first, start), (last, end)):
        distance = sum((points[index][axis] - target[axis]) ** 2 for axis in (0, 1))
        if distance > 25:
            raise ValueError("Cambió el contorno pectoral; revisar la corrección")

    x0, y0 = points[first]
    x1, y1 = points[last]
    curve = []
    for t in (1 / 3, 2 / 3):
        curve.append([
            round(x0 + (x1 - x0) * t, 1),
            round(y0 + (y1 - y0) * t + 12 * t * (1 - t), 1),
        ])
    corrected = points[:first + 1] + curve + points[last:]
    return [coordinate for point in corrected for coordinate in point]


def fill_pectoral_notches(rings):
    """Rellena las dos muescas rectangulares del borde inferior del pectoral.

    Los puntos son del viewBox 1000×2000 del modelo fijo. Si el modelo cambia,
    se falla de forma visible en vez de editar una región distinta por error.
    """
    if len(rings) != 2:
        raise ValueError("Se esperaban los dos lados del pectoral mayor")
    right = _replace_recess(rings[0], (540.0, 656.9), (584.6, 669.6))
    left = _replace_recess(rings[1], (415.0, 669.6), (459.6, 656.9))
    return [right, left]
