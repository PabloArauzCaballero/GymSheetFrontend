// Activa por API un programa de pesas (modo `MODE`: NONE por defecto) sobre la rutina `ROUTINE_NAME` de la cuenta:
// sirve de base a los flujos que combinan pesas y cardio. Variables: EMAIL, ROUTINE_NAME y, opcional, MODE.
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
var list = call('GET', '/routines?scope=mine&limit=50', token).data.items;
var id = null;
for (var i = 0; i < list.length; i += 1) { if (list[i].nombre === ROUTINE_NAME && list[i].esMia) { id = list[i].id; break; } }
if (!id) throw new Error('No existe la rutina ' + ROUTINE_NAME);
call('POST', '/programs/strength/activate', token, { routineId: id, modo: typeof MODE !== 'undefined' && MODE ? MODE : 'NONE' });
