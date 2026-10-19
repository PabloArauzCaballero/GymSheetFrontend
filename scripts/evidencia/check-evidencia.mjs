#!/usr/bin/env node
/**
 * Puerta de la Definition of Done de Rutinas REPP (06_PRUEBAS_Y_EVIDENCIA.md):
 * «sin captura no está hecho».
 *
 * Lee todos los `pasos*.json` y comprueba que CADA captura declarada existe en
 * disco. Un paso sin plataforma (`plataformas: []`) es una carencia declarada
 * con su motivo: se lista, pero no hace fallar la puerta. Una captura faltante
 * sí. También informa cuántas están revisadas por una persona
 * (`revisiones*.json`); con `--exigir-revision` la falta de revisión falla.
 *
 * Uso: node scripts/evidencia/check-evidencia.mjs [--exigir-revision]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = join(root, 'docs', 'evidencias', 'rutinas');
const exigirRevision = process.argv.includes('--exigir-revision');

const filesOf = (prefix) =>
  readdirSync(base).filter((n) => n.startsWith(prefix) && n.endsWith('.json')).sort();
const pasos = filesOf('pasos').flatMap((n) => JSON.parse(readFileSync(join(base, n), 'utf8')).pasos);
const revisiones = Object.assign({}, ...filesOf('revisiones').map((n) => JSON.parse(readFileSync(join(base, n), 'utf8'))));

const WEB = [[390, 'claro'], [390, 'oscuro'], [1440, 'claro'], [1440, 'oscuro']];
const esperadas = (p, plataforma) => {
  const stem = `${p.rf}_p${p.paso}_${p.nombre}`;
  return plataforma === 'web' ? WEB.map(([w, t]) => `${stem}_${w}_${t}.png`) : [`${stem}_ios_oscuro.png`];
};

const faltan = [];
const declaradas = [];
let total = 0;
let revisadas = 0;
for (const p of pasos) {
  if (p.plataformas.length === 0) {
    declaradas.push(`${p.rf} p${p.paso} ${p.nombre}: ${p.faltante ?? 'sin motivo'}`);
    continue;
  }
  for (const plataforma of p.plataformas) {
    for (const archivo of esperadas(p, plataforma)) {
      total += 1;
      const ruta = join(base, p.rf, plataforma === 'web' ? 'web' : 'movil', archivo);
      if (!existsSync(ruta)) faltan.push(`${p.rf}/${plataforma}/${archivo}`);
      else if (revisiones[archivo]) revisadas += 1;
    }
  }
}

console.log(`Capturas esperadas: ${total} · presentes: ${total - faltan.length} · revisadas por una persona: ${revisadas}`);
if (declaradas.length) console.log(`\nCarencias declaradas (${declaradas.length}):\n- ${declaradas.join('\n- ')}`);
if (faltan.length) console.error(`\nFALTAN ${faltan.length} capturas:\n- ${faltan.join('\n- ')}`);
const sinRevisar = total - faltan.length - revisadas;
if (exigirRevision && sinRevisar > 0) console.error(`\n${sinRevisar} capturas sin revisión humana.`);
process.exit(faltan.length > 0 || (exigirRevision && sinRevisar > 0) ? 1 : 0);
