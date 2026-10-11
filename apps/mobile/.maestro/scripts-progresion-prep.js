// Prepara la sobrecarga progresiva de RF-15 p04 (dos fallos bajan la carga) y p05 (semana de descarga).
// Crea la rutina «Progresión QA» con UN día en el día de la semana de hoy (press banca 3 × 8–12), activa el
// programa de sobrecarga con el press banca a 60 kg, y deja en curso la sesión de hoy con 3 series de `REPS`
// repeticiones a 60 kg. Si `FALLOS_PREVIOS` = 1 antes termina por API una sesión igual (fallo nº 1: «Mantén el
// peso»). Una serie por debajo del mínimo de repeticiones (8) es un fallo; con dos seguidos el motor baja el peso.
// Variables: EMAIL, REPS (por defecto 5) y FALLOS_PREVIOS (0 | 1). Deja `output.sessionId` y `output.routineId`.
var base = 'http://localhost:3011/api/v1';
function call(method, path, token, body) {
  var response = http.request(base + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return JSON.parse(response.body);
}
var token = call('POST', '/auth/login', null, { email: EMAIL, password: 'MockLocal2026!' }).data.accessToken;
var reps = typeof REPS !== 'undefined' && REPS ? Number(REPS) : 5;
var previous = typeof FALLOS_PREVIOS !== 'undefined' && FALLOS_PREVIOS ? Number(FALLOS_PREVIOS) : 0;
var bench = call('GET', '/exercises?search=barbell%20bench%20press&pageSize=1', token).data.items[0].id;
var mine = call('GET', '/routines?scope=mine&q=Progresi&limit=20', token).data.items;
for (var i = 0; i < mine.length; i += 1) { if (mine[i].nombre === 'Progresión QA') call('DELETE', '/routines/' + mine[i].id, token); }
var iso = new Date().getDay() || 7;
var created = call('POST', '/routines', token, {
  nombre: 'Progresión QA', descripcion: null, objetivo: 'HIPERTROFIA', visibilidad: 'PRIVATE', duracionSemanas: 8,
  progresion: { activa: true, descargaCada: 4 },
  dias: [{ diaSemana: iso, nombre: 'Hoy', ejercicios: [{ ejercicioId: bench, seriesObjetivo: 3, repsMin: 8, repsMax: 12, pesoObjetivoKg: null, rirObjetivo: 2, descansoSeg: 90, nota: null }] }],
}).data;
if (!created.dias) created = call('GET', '/routines/' + created.id, token).data;
call('POST', '/programs/strength/activate', token, {
  routineId: created.id, modo: 'PROGRESSIVE_OVERLOAD', replace: true,
  liftTargets: [{ ejercicioId: bench, pesoTrabajoKg: 60, repsMin: 8, repsMax: 12, rirObjetivo: 2 }],
});
function runSession() {
  var session = call('POST', '/routines/' + created.id + '/start', token, { routineDayId: created.dias[0].id }).data;
  var full = call('GET', '/workouts/' + session.id, token).data;
  var target = full.ejercicios[0];
  for (var k = 1; k <= 3; k += 1) {
    call('POST', '/workouts/session-exercises/' + target.id + '/sets', token, { numeroSerie: k, repeticiones: reps, pesoKg: 60, rir: 2, descansoSegAnterior: 0 });
  }
  return session.id;
}
if (previous >= 1) {
  var first = runSession();
  call('PATCH', '/workouts/' + first + '/finish', token, {});
  output.primeraSesionId = first;
}
output.sessionId = runSession();
output.routineId = created.id;
