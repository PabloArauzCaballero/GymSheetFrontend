// Busca una rutina por nombre exacto con la API y deja su id en `output.routineId`, para abrirla por enlace
// profundo (`gymsheet:///routines/<id>`) sin pasar por el buscador del catálogo (con muchas rutinas en la
// cuenta la tarjeta queda bajo la barra de pestañas). Variables: EMAIL y ROUTINE_NAME/NAME. SCOPE puede ser
// `mine`/`public` o una pestaña heredada (`Mías`, `Públicas`, `REPP`).
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
var name = typeof ROUTINE_NAME === 'undefined' ? NAME : ROUTINE_NAME;
var requestedScope = typeof SCOPE === 'undefined' ? TAB : SCOPE;
var scope = requestedScope === 'mine' || requestedScope === 'public' ? requestedScope : requestedScope === 'Mías' ? 'mine' : 'public';
var list = call('GET', '/routines?scope=' + scope + '&q=' + encodeURIComponent(name) + '&limit=50', token).data.items;
var id = null;
for (var i = 0; i < list.length; i += 1) { if (list[i].nombre === name) { id = list[i].id; break; } }
if (!id) throw new Error('No existe la rutina ' + name + ' en ' + scope);
output.routineId = id;
