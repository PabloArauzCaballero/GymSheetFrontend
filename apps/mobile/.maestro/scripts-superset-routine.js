// Prepara la rutina «Superserie QA» (C3): lunes con un press suelto (2:00), la superserie A (remo +
// curl, sin transición, 2:00 tras la vuelta) y el circuito B (3 ejercicios, 15 s entre ellos, 1:00
// tras la vuelta). Cancela antes cualquier sesión abierta de la cuenta. Variables: EMAIL.
// Deja `output.routineId` y `output.diaId`.
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
var sessions = call('GET', '/workouts?page=1&pageSize=10', token).data.items;
for (var s = 0; s < sessions.length; s += 1) { if (sessions[s].estado === 'EN_PROGRESO') call('PATCH', '/workouts/' + sessions[s].id + '/cancel', token); }
var mine = call('GET', '/routines?scope=mine&q=Superserie&limit=20', token).data.items;
for (var i = 0; i < mine.length; i += 1) { if (mine[i].nombre === 'Superserie QA') call('DELETE', '/routines/' + mine[i].id, token); }
function item(name, extra) {
  var out = { ejercicioId: exerciseId(name), seriesObjetivo: 3, repsMin: 8, repsMax: 12, pesoObjetivoKg: null, rirObjetivo: 2, descansoSeg: 120, nota: null, grupo: null, descansoEntreSeg: null, duracionSeg: null };
  for (var key in extra) out[key] = extra[key];
  return out;
}
var created = call('POST', '/routines', token, {
  nombre: 'Superserie QA', descripcion: null, objetivo: 'HIPERTROFIA', visibilidad: 'PRIVATE', duracionSemanas: 4,
  progresion: { activa: true, descargaCada: 4 },
  dias: [{
    diaSemana: 1,
    nombre: 'Torso A',
    ejercicios: [
      item('barbell bench press', {}),
      item('barbell bent over row', { grupo: 1, descansoEntreSeg: 0, descansoSeg: 0 }),
      item('dumbbell biceps curl', { grupo: 1, descansoEntreSeg: 0, descansoSeg: 120 }),
      item('push-up', { grupo: 2, descansoEntreSeg: 15, descansoSeg: 0, seriesObjetivo: 2 }),
      item('squat', { grupo: 2, descansoEntreSeg: 15, descansoSeg: 0, seriesObjetivo: 2 }),
      item('plank', { grupo: 2, descansoEntreSeg: 15, descansoSeg: 60, seriesObjetivo: 2, repsMin: null, repsMax: null, duracionSeg: 30 }),
    ],
  }],
}).data;
if (!created || !created.id) throw new Error('No se pudo crear la rutina con superserie');
output.routineId = created.id;
output.diaId = created.dias[0].id;
