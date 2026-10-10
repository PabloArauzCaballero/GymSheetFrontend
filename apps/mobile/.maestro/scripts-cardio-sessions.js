// Crea por API N sesiones de cardio ya finalizadas (de `MINUTES` minutos, esfuerzo `RPE`, sin
// pulsómetro) en la cuenta: «sin pulsómetro funciona igual» (RF-17). Variables: EMAIL, COUNT, MINUTES, RPE.
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
var found = call('GET', '/exercises?search=stationary%20bike&pageSize=5', token).data.items;
var bike = null;
for (var i = 0; i < found.length; i += 1) { if (found[i].category === 'cardio') { bike = found[i]; break; } }
if (!bike) throw new Error('No hay ejercicio de cardio');
for (var n = 0; n < Number(COUNT); n += 1) {
  var session = call('POST', '/workouts', token, { observacion: null }).data;
  var added = call('POST', '/workouts/' + session.id + '/exercises', token, { ejercicioId: bike.id, orden: 1 }).data;
  var sessionExercise = added.ejercicios ? added.ejercicios[0] : added;
  call('POST', '/workouts/session-exercises/' + sessionExercise.id + '/sets', token, {
    tipoSerie: 'CARDIO', numeroSerie: 1, duracionSeg: Number(MINUTES) * 60, distanciaM: 9000, rpe: Number(RPE), descansoSegAnterior: 0,
  });
  call('PATCH', '/workouts/' + session.id + '/finish', token, {});
}
