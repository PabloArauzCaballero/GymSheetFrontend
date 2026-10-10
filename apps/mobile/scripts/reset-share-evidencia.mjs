// Deja «Plan para compartir» de A sin invitaciones vivas (revoca las existentes), para repetir el flujo 16.
import { call, login } from './rutinas-api.mjs';
const A = await login('athlete.mock@gymsheet.local');
const mine = await call(A.token, 'GET', '/routines?scope=mine&q=Plan%20para&limit=10');
const routine = mine.data.items.find((r) => r.nombre === 'Plan para compartir');
const shares = (await call(A.token, 'GET', `/routines/${routine.id}/shares`)).data;
for (const share of shares.filter((s) => s.estado === 'PENDING' || s.estado === 'ACCEPTED')) {
  await call(A.token, 'DELETE', `/routines/${routine.id}/shares/${share.id}`);
}
console.log('rutina', routine.id, 'invitaciones revocadas', shares.length);
