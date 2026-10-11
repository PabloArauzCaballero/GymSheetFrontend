// Busca una rutina por nombre exacto con la API y deja su id en `output.routineId`, para abrirla por enlace
// profundo (`gymsheet:///routines/<id>`) sin pasar por el buscador del catálogo (con muchas rutinas en la
// cuenta la tarjeta queda bajo la barra de pestañas). Variables: EMAIL, ROUTINE_NAME y SCOPE (`mine` | `public`).
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
var list = call('GET', '/routines?scope=' + SCOPE + '&q=' + encodeURIComponent(ROUTINE_NAME) + '&limit=50', token).data.items;
var id = null;
for (var i = 0; i < list.length; i += 1) { if (list[i].nombre === ROUTINE_NAME) { id = list[i].id; break; } }
if (!id) throw new Error('No existe la rutina ' + ROUTINE_NAME + ' en ' + SCOPE);
output.routineId = id;
