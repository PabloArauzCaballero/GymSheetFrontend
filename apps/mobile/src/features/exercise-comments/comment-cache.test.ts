/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoutineComment } from '@gymsheet/types';
import { commentCountLabel, mapComment, removeComment, shiftTotal, type CommentPages } from './comment-cache.ts';

const comment = (id: string, respuestas: RoutineComment[] = []): RoutineComment => ({
  id,
  autor: { id: 'u1', nombre: 'Ana' },
  texto: `texto ${id}`,
  respuestaA: null,
  creadoEn: '2026-10-18T10:00:00Z',
  esMio: true,
  likes: 0,
  meGusta: false,
  respuestas,
});

const pages = (items: RoutineComment[], total?: number): CommentPages => ({
  pageParams: [null],
  pages: [{ items, siguienteCursor: null, ...(total === undefined ? {} : { total }) }],
});

test('el contador dice «comentario» en singular y «comentarios» en plural', () => {
  assert.equal(commentCountLabel(1), '1 comentario');
  assert.equal(commentCountLabel(0), '0 comentarios');
  assert.equal(commentCountLabel(12), '12 comentarios');
});

test('mapComment cambia un comentario o una respuesta sin tocar el resto', () => {
  const reply = { ...comment('r1'), respuestaA: 'c1' };
  const result = mapComment(pages([comment('c1', [reply]), comment('c2')]), 'r1', (c) => ({ ...c, likes: 3 }));
  assert.equal(result.pages[0]?.items[0]?.respuestas[0]?.likes, 3);
  assert.equal(result.pages[0]?.items[1]?.likes, 0);
});

test('shiftTotal mueve el total del servidor y nunca baja de cero; sin total no inventa uno', () => {
  assert.equal(shiftTotal(pages([], 2), 1).pages[0]?.total, 3);
  assert.equal(shiftTotal(pages([], 0), -1).pages[0]?.total, 0);
  assert.equal(shiftTotal(pages([]), 1).pages[0]?.total, undefined);
});

test('borrar quita la fila, vacía un hilo con respuestas y baja el total', () => {
  const reply = { ...comment('r1'), respuestaA: 'c1' };
  const start = pages([comment('c1', [reply]), comment('c2')], 3);
  const withoutLonely = removeComment(start, 'c2');
  assert.deepEqual(withoutLonely.pages[0]?.items.map((c) => c.id), ['c1']);
  assert.equal(withoutLonely.pages[0]?.total, 2);
  const emptied = removeComment(start, 'c1');
  assert.equal(emptied.pages[0]?.items[0]?.texto, '');
  assert.equal(emptied.pages[0]?.items[0]?.respuestas.length, 1);
  const noReply = removeComment(start, 'r1');
  assert.equal(noReply.pages[0]?.items[0]?.respuestas.length, 0);
});
