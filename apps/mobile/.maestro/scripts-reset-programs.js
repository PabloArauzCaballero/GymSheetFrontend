// Detiene por API los programas activos de la cuenta y cancela sus sesiones abiertas (como `scripts/reset-programas-evidencia.mjs`).
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
var active = call('GET', '/programs/active', token).data;
if (active.fuerza) call('POST', '/programs/' + active.fuerza.id + '/stop', token, {});
if (active.cardio) call('POST', '/programs/' + active.cardio.id + '/stop', token, {});
