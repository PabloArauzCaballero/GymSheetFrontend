/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { MASCOT_MOODS, mascotXml } from './mascot.ts';
import { gymEntry, gymLevel, gymTimeline, matchEntry, matchTimeline, waitedLabel, type GymNudgeInput } from './nudge.ts';

// Jueves 22/10/2026. Lunes = 1, así que jueves = 4.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

const base: GymNudgeInput = {
  now: at(22, 9),
  lastWorkoutAt: at(21, 19),
  scheduledWeekdays: [1, 2, 4, 5],
  dayNames: { 1: 'Pecho', 2: 'Espalda', 4: 'Pierna', 5: 'Hombro' },
  streakWeeks: 3,
};

test('entrenó hoy: orgullosa, aunque sea tarde', () => {
  assert.equal(gymLevel({ ...base, lastWorkoutAt: at(22, 7) }, at(22, 21)), 'proud');
});

test('toca hoy: temprano guiña, desde las 18:00 se impacienta', () => {
  assert.equal(gymLevel(base, at(22, 17, 59)), 'early');
  assert.equal(gymLevel(base, at(22, 18)), 'late');
  assert.equal(gymEntry(base, at(22, 9)).title, 'Hoy toca Pierna');
});

test('día de descanso del plan: descansa, salvo que ya debas sesiones', () => {
  assert.equal(gymLevel({ ...base, lastWorkoutAt: at(23, 8) }, at(24, 10)), 'rest'); // viernes → sábado
  assert.equal(gymLevel(base, at(24, 10)), 'slipping'); // miércoles → sábado: se saltó jueves y viernes
});

test('el fin de semana de descanso no cuenta como falta', () => {
  // Viernes 23 → lunes 26: tres días, cero sesiones saltadas.
  assert.equal(gymLevel({ ...base, lastWorkoutAt: at(23, 8) }, at(26, 9)), 'early');
});

test('una sesión saltada se pone dramática; dos y cinco días, se duerme', () => {
  assert.equal(gymLevel({ ...base, lastWorkoutAt: at(19, 8) }, at(22, 9)), 'slipping'); // lunes → jueves: martes saltado
  assert.equal(gymLevel({ ...base, lastWorkoutAt: at(16, 8) }, at(22, 9)), 'gone');
  assert.equal(gymEntry({ ...base, lastWorkoutAt: at(16, 8) }, at(22, 9)).mood, 'asleep');
});

test('rutina sin días fijos: todos los días cuentan', () => {
  const free = { ...base, scheduledWeekdays: [], dayNames: {} };
  assert.equal(gymLevel(free, at(24, 10)), 'slipping');
  assert.equal(gymEntry(free, at(22, 9)).title, 'Hoy toca entrenar');
});

test('nunca entrenó: no hay drama, solo invitación', () => {
  const fresh = { ...base, lastWorkoutAt: null };
  assert.equal(gymLevel(fresh, at(22, 9)), 'early');
  assert.equal(gymLevel(fresh, at(23, 20)), 'late');
});

test('la línea de tiempo escala sola si no entrenas y siempre lleva a rutinas', () => {
  const timeline = gymTimeline({ ...base, lastWorkoutAt: at(21, 19) });
  const moods = timeline.map((entry) => entry.mood);
  assert.equal(timeline[0]?.date.getTime(), base.now.getTime());
  assert.deepEqual(moods.slice(0, 2), ['wink', 'impatient']);
  assert.ok(moods.includes('dramatic'));
  assert.ok(timeline.every((entry) => entry.url === 'gymsheet:///routines'));
  for (let index = 1; index < timeline.length; index += 1) {
    assert.ok((timeline[index]?.date.getTime() ?? 0) > (timeline[index - 1]?.date.getTime() ?? 0));
  }
});

test('la frase es estable en el día y cambia con la fecha', () => {
  const morning = gymEntry(base, at(22, 8)).body;
  assert.equal(gymEntry(base, at(22, 11)).body, morning);
  const bodies = new Set([19, 20, 21, 22].map((day) => gymEntry({ ...base, lastWorkoutAt: null }, at(day, 9)).body));
  assert.ok(bodies.size > 1);
});

test('ninguna frase se burla del cuerpo ni usa admiraciones en cadena', () => {
  const texts = gymTimeline({ ...base, lastWorkoutAt: at(10, 8) }, 10).flatMap((entry) => [entry.title, entry.body]);
  for (const text of texts) {
    assert.doesNotMatch(text, /gord|flac|peso|kilo|barriga|comida|!!/iu);
  }
});

const pending = { userId: 'u1', name: 'Ana', conversationId: 'c1', since: at(20, 12) };

test('matches: con nombre en la pantalla de inicio, nunca en la bloqueada', () => {
  const entry = matchEntry({ now: at(22, 9), pending: 2, oldest: pending, showNames: true });
  assert.equal(entry.mood, 'flirty');
  assert.equal(entry.title, '2 matches te esperan');
  assert.equal(entry.url, 'gymsheet:///chat/c1');
  assert.doesNotMatch(entry.bodyPrivate, /Ana/u);
  const hidden = matchEntry({ now: at(22, 9), pending: 2, oldest: pending, showNames: false });
  assert.doesNotMatch(hidden.body, /Ana/u);
});

test('matches: al día, Repi te manda al gym', () => {
  const entry = matchEntry({ now: at(22, 9), pending: 0, oldest: null, showNames: true });
  assert.equal(entry.title, 'Al día con tus matches');
  assert.equal(entry.url, 'gymsheet:///comunidad-mensajes');
});

test('cuánto lleva esperando, y la espera crece en la línea de tiempo', () => {
  assert.equal(waitedLabel(at(22, 8, 30), at(22, 9)), 'hace un rato');
  assert.equal(waitedLabel(at(22, 4), at(22, 9)), 'hace 5 h');
  assert.equal(waitedLabel(at(21, 4), at(22, 9)), 'ayer');
  assert.equal(waitedLabel(at(19, 4), at(22, 9)), 'hace 3 días');
  assert.equal(matchTimeline({ now: at(22, 9), pending: 1, oldest: pending, showNames: true }).length, 4);
});

test('Repi tiene un dibujo por ánimo', () => {
  for (const mood of MASCOT_MOODS) assert.match(mascotXml(mood), /^<svg .*<\/svg>$/su);
});

test('entrada: último entreno terminado y días con nombre propio', async () => {
  const { gymInput, matchInput } = await import('./nudge-input.ts');
  const input = gymInput(
    at(22, 9),
    [
      { estado: 'FINALIZADA', fechaInicio: '2026-10-20T10:00:00Z', fechaFin: '2026-10-20T11:00:00Z' },
      { estado: 'EN_PROGRESO', fechaInicio: '2026-10-22T08:00:00Z', fechaFin: null },
      { estado: 'FINALIZADA', fechaInicio: '2026-10-18T10:00:00Z', fechaFin: null },
    ],
    [
      { diaSemana: 1, nombre: 'Pecho' },
      { diaSemana: 4, nombre: 'Jueves' },
      { diaSemana: null, nombre: 'Extra' },
    ],
    2,
  );
  assert.equal(input.lastWorkoutAt?.toISOString(), '2026-10-20T11:00:00.000Z');
  assert.deepEqual(input.scheduledWeekdays, [1, 4]);
  assert.deepEqual(input.dayNames, { 1: 'Pecho' });
  const matches = matchInput(at(22, 9), { count: 1, oldest: { userId: 'u', firstName: 'Ana', conversationId: null, waitingSince: '2026-10-21T10:00:00Z' } }, false);
  assert.equal(matches.oldest?.name, 'Ana');
  assert.equal(matchInput(at(22, 9), null, true).pending, 0);
});

test('notificaciones: una de gym por día, nunca si entrenaste, y la de matches sin nombres', async () => {
  const { planNotifications } = await import('./nudge.ts');
  const matches = { now: at(22, 9), pending: 1, oldest: pending, showNames: true };
  const planned = planNotifications(base, matches);
  const gym = planned.filter((item) => item.id.startsWith('repi-gym'));
  assert.ok(gym.length >= 1 && gym.length <= 3);
  assert.ok(gym.every((item) => item.date.getHours() === 19));
  const match = planned.find((item) => item.id === 'repi-matches');
  assert.equal(match?.date.getHours(), 12);
  assert.doesNotMatch(`${match?.title} ${match?.body}`, /Ana/u);

  const trainedToday = planNotifications({ ...base, lastWorkoutAt: at(22, 7) }, { ...matches, pending: 0 });
  assert.ok(!trainedToday.some((item) => item.id === 'repi-gym-0'));
  assert.ok(!trainedToday.some((item) => item.id === 'repi-matches'));

  // Pasadas las 19:00 no se programa la de hoy; pasadas las 12:30, la de matches va mañana.
  const evening = planNotifications({ ...base, now: at(22, 20) }, { ...matches, now: at(22, 20) });
  assert.ok(!evening.some((item) => item.id === 'repi-gym-0'));
  assert.equal(evening.find((item) => item.id === 'repi-matches')?.date.getDate(), 23);
});
