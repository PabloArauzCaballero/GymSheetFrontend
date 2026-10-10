// Ejecuta el cierre semanal REAL de un programa (el mismo código que el trabajo del lunes) con la
// herramienta de soporte `POST /admin/support/programs/:id/close-weeks { hasta }`, usando la cuenta
// de administración sembrada (`admin@gymsheet.local`; solo existe en la base desechable de pruebas).
// `SEMANAS` = cuántas semanas del programa se cierran (1 = la semana de hoy, 2 = también la siguiente):
// la app no tiene reloj simulado, pero el servidor admite la fecha de «hasta». Variables: EMAIL (dueña
// del programa) y SEMANAS.
var base = 'http://localhost:3011/api/v1';
function call(method, path, token, body) {
  var response = http.request(base + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return JSON.parse(response.body);
}
var owner = call('POST', '/auth/login', null, { email: EMAIL, password: 'MockLocal2026!' }).data.accessToken;
var active = call('GET', '/programs/active', owner).data;
var program = active.fuerza || active.cardio;
var admin = call('POST', '/auth/login', null, { email: 'admin@gymsheet.local', password: 'AdminLocal2026!' }).data.accessToken;
var until = new Date();
var toMonday = (8 - (until.getDay() || 7)) % 7 || 7; // el lunes siguiente (estrictamente posterior a hoy)
until = new Date(until.getTime() + (toMonday + 7 * (Number(SEMANAS) - 1)) * 86400000);
var pad = function (n) { return (n < 10 ? '0' : '') + n; };
var hasta = until.getFullYear() + '-' + pad(until.getMonth() + 1) + '-' + pad(until.getDate());
var result = call('POST', '/admin/support/programs/' + program.id + '/close-weeks', admin, { hasta: hasta });
output.cerradas = JSON.stringify(result);
output.programId = program.id;
