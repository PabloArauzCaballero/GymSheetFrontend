// Deja en `output.programId` el id del programa de pesas activo de la cuenta (para abrir su pantalla de cierre).
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
var active = call('GET', '/programs/active', login.data.accessToken).data;
output.programId = active.fuerza ? active.fuerza.id : '';
