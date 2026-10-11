// Deja a la cuenta B con UNA invitación pendiente de la rutina (ROUTINE_ID) de la cuenta A, por API: revoca las
// que hubiera (para empezar limpio) y vuelve a invitar. Es lo mismo que hace la pantalla «Compartir con…», cuyo
// recorrido por la interfaz ya cubre el flujo 16. Variables: OWNER_EMAIL, GUEST_EMAIL y ROUTINE_ID.
var base = 'http://localhost:3011/api/v1';
function call(method, path, token, body) {
  var response = http.request(base + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return JSON.parse(response.body);
}
function b64decode(input) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var s = input.replace(/-/g, '+').replace(/_/g, '/');
  var out = ''; var bits = 0; var acc = 0;
  for (var i = 0; i < s.length; i += 1) {
    var v = chars.indexOf(s.charAt(i));
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 255); }
  }
  return out;
}
var owner = call('POST', '/auth/login', null, { email: OWNER_EMAIL, password: 'MockLocal2026!' }).data.accessToken;
var guest = call('POST', '/auth/login', null, { email: GUEST_EMAIL, password: 'MockLocal2026!' }).data.accessToken;
var guestId = JSON.parse(b64decode(guest.split('.')[1])).sub;
var shares = call('GET', '/routines/' + ROUTINE_ID + '/shares', owner).data;
var items = shares.items || shares;
for (var i = 0; i < items.length; i += 1) { call('DELETE', '/routines/' + ROUTINE_ID + '/shares/' + items[i].id, owner); }
var result = call('POST', '/routines/' + ROUTINE_ID + '/shares', owner, { usuarioIds: [guestId] });
output.shared = JSON.stringify(result).slice(0, 200);
