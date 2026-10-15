import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const buttonSource = await readFile(new URL('./ui.tsx', import.meta.url), 'utf8');
const chatSource = await readFile(new URL('../../app/(app)/chat/[id].tsx', import.meta.url), 'utf8');

test('Button forwards explicit accessibility labels to the native pressable', () => {
  assert.ok(/accessibilityLabel=\{accessibilityLabel\}/u.test(buttonSource),
    'Button must pass its accessibilityLabel to AnimatedPressable');
});

test('chat edit save action has a stable Maestro accessibility label', () => {
  const icon = chatSource.indexOf("icon={editingMessageId ? 'checkmark' : 'send'}");
  assert.notEqual(icon, -1, 'chat composer action must exist');
  const start = chatSource.lastIndexOf('<Button', icon);
  const end = chatSource.indexOf('/>', start);
  assert.notEqual(end, -1, 'chat composer action must be a self-closing Button');
  assert.ok(/accessibilityLabel=\{editingMessageId \? 'Guardar edición' : 'Enviar mensaje'\}/u
    .test(chatSource.slice(start, end)),
    'chat save button must be accessible by the label Maestro uses');
});

test('chat edit text field has a stable label while its value hides the placeholder', () => {
  const field = chatSource.indexOf("placeholder={editingMessageId ? 'Edita tu mensaje…'");
  assert.notEqual(field, -1, 'chat composer text field must exist');
  const start = chatSource.lastIndexOf('<TextInput', field);
  const end = chatSource.indexOf('/>', field);
  assert.notEqual(end, -1, 'chat composer text field must be self-closing');
  assert.ok(/accessibilityLabel=\{editingMessageId \? 'Editar mensaje actual' : 'Escribe un mensaje'\}/u
    .test(chatSource.slice(start, end)),
  'chat text field must be accessible by a stable edit label');
});

test('chat edit action has a message-specific Maestro test id', () => {
  const editAction = chatSource.indexOf('accessibilityLabel="Editar mensaje"');
  assert.notEqual(editAction, -1, 'chat message edit action must exist');
  const start = chatSource.lastIndexOf('<PressableScale', editAction);
  const end = chatSource.indexOf('\n          >', editAction);
  assert.ok(/testID=\{`chat-message-edit-\$\{item\.id\}`\}/u.test(chatSource.slice(start, end)),
    'Maestro must target the exact fixture message instead of a repeated edit label');
});
