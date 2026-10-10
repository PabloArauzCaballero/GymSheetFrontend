// Prepara el cierre semanal real (RF-18): crea la rutina «Cierre semanal QA» con UN día en el día de la
// semana de hoy y dos ejercicios, activa un programa de sobrecarga sobre ella e inicia la sesión de hoy.
// Una sesión solo cuenta para la semana si dura 10 minutos o más (hora del servidor): el flujo espera ese
// tiempo antes de terminarla. Variables: EMAIL. Deja `output.sessionId`.
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
function exerciseId(name) { return call('GET', '/exercises?search=' + encodeURIComponent(name) + '&pageSize=1', token).data.items[0].id; }
var mine = call('GET', '/routines?scope=mine&q=Cierre&limit=20', token).data.items;
for (var i = 0; i < mine.length; i += 1) { if (mine[i].nombre === 'Cierre semanal QA') call('DELETE', '/routines/' + mine[i].id, token); }
var now = new Date();
var iso = now.getDay() || 7;
function item(id, series, min, max) {
  return { ejercicioId: id, seriesObjetivo: series, repsMin: min, repsMax: max, pesoObjetivoKg: null, rirObjetivo: 2, descansoSeg: 90, nota: null };
}
var created = call('POST', '/routines', token, {
  nombre: 'Cierre semanal QA', descripcion: null, objetivo: 'HIPERTROFIA', visibilidad: 'PRIVATE', duracionSemanas: 4,
  progresion: { activa: true, descargaCada: 4 },
  dias: [{ diaSemana: iso, nombre: 'Hoy', ejercicios: [item(exerciseId('barbell bench press'), 3, 8, 12), item(exerciseId('barbell bent over row'), 3, 8, 12)] }],
}).data;
call('POST', '/programs/strength/activate', token, { routineId: created.id, modo: 'PROGRESSIVE_OVERLOAD', replace: true });
var session = call('POST', '/routines/' + created.id + '/start', token, { routineDayId: created.dias[0].id }).data;
output.sessionId = session.id;
output.routineId = created.id;
