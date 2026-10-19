// Registra series por API en la sesión abierta de la cuenta (equivale a teclearlas): lo usan los
// flujos que necesitan datos de entrenamiento sin pasar medio minuto por cada formulario.
// Variables: EMAIL, EXERCISE (nombre exacto del ejercicio de la sesión), SETS (JSON:
// [{"pesoKg":60,"repeticiones":12,"rir":2}]) o CARDIO (JSON: {"duracionSeg":1920,...}).
var base = 'http://localhost:3011/api/v1';

function call(method, path, token, body) {
  var response = http.request(base + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return JSON.parse(response.body);
}

var login = call('POST', '/auth/login', null, { email: EMAIL, password: 'MockLocal2026!' });
var token = login.data.accessToken;
var list = call('GET', '/workouts?page=1&pageSize=10', token);
var open = null;
for (var i = 0; i < list.data.items.length; i += 1) {
  if (list.data.items[i].estado === 'EN_PROGRESO') { open = list.data.items[i]; break; }
}
if (!open) throw new Error('No hay una sesión en curso');
var target = null;
for (var j = 0; j < open.ejercicios.length; j += 1) {
  if (open.ejercicios[j].ejercicio && open.ejercicios[j].ejercicio.nombre === EXERCISE) { target = open.ejercicios[j]; break; }
}
if (!target && typeof EXERCISE_ID !== 'undefined' && EXERCISE_ID) {
  // Un ejercicio que no estaba en el día: se añade a la sesión (RF-20 «añadiendo un ejercicio»).
  call('POST', '/workouts/' + open.id + '/exercises', token, { ejercicioId: EXERCISE_ID, orden: open.ejercicios.length + 1 });
  open = call('GET', '/workouts/' + open.id, token).data;
  for (var m = 0; m < open.ejercicios.length; m += 1) {
    if (open.ejercicios[m].ejercicio && open.ejercicios[m].ejercicio.nombre === EXERCISE) { target = open.ejercicios[m]; break; }
  }
}
if (!target) throw new Error('La sesión no tiene el ejercicio ' + EXERCISE);
var number = target.series.length;
if (typeof CARDIO !== 'undefined' && CARDIO) {
  var cardio = JSON.parse(CARDIO);
  cardio.tipoSerie = 'CARDIO';
  cardio.numeroSerie = number + 1;
  call('POST', '/workouts/session-exercises/' + target.id + '/sets', token, cardio);
} else {
  var sets = JSON.parse(SETS);
  for (var k = 0; k < sets.length; k += 1) {
    number += 1;
    call('POST', '/workouts/session-exercises/' + target.id + '/sets', token, {
      numeroSerie: number, repeticiones: sets[k].repeticiones, pesoKg: sets[k].pesoKg, rir: sets[k].rir, descansoSegAnterior: 0,
    });
  }
}
output.sessionId = open.id;
