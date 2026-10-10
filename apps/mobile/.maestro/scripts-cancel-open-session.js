// Cancela por API la sesión abierta de la cuenta, si la hay, para no dejarle una abierta al flujo
// siguiente. Variables: EMAIL.
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
var sessions = call('GET', '/workouts?page=1&pageSize=10', token).data.items;
for (var i = 0; i < sessions.length; i += 1) { if (sessions[i].estado === 'EN_PROGRESO') call('PATCH', '/workouts/' + sessions[i].id + '/cancel', token); }
