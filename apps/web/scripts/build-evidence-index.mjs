/** Builds a human-readable INDEX.md from the sweep reports. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node build-evidence-index.mjs <evidence-dir>');

const load = (f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : null);
const main = load('report.json');
const admin = load('report-admin.json');

const rel = (p) => (p ? p.split(/click-evidence[\\/]/).pop()?.replace(/\\/g, '/') ?? p : '');

let md = `# Evidencia de sweep de clicks — GymSheet Web\n\n`;
md += `Generado con Playwright + Chromium contra el stack real (web \`:3002\` → backend NestJS \`:3000\` → PostgreSQL) usando usuarios mock sembrados.\n\n`;

const totalClicks = (main?.routes ?? []).reduce((a, r) => a + r.clicks.length, 0) + (admin?.routes ?? []).reduce((a, r) => a + r.clicks.length, 0);
md += `## Totales\n\n`;
md += `- **Rutas barridas:** ${(main?.routes?.length ?? 0) + (admin?.routes?.length ?? 0)} (cliente ${main?.routes?.length ?? 0} + admin ${admin?.routes?.length ?? 0})\n`;
md += `- **Clicks ejecutados:** ${totalClicks}\n`;
md += `- **Fallos de click:** ${main?.failures?.length ?? 0}\n`;
md += `- **Usuarios mock:** \`active.mock\` (CLIENTE activo), \`new.mock\` (onboarding), \`expired.mock\` (membresía vencida), \`admin.dev\` (ADMIN)\n\n`;

function section(title, report) {
  if (!report) return '';
  let s = `## ${title}\n\n`;
  s += `| Ruta | Aterrizó en | Clicks | Navegaciones | Popups |\n|---|---|---:|---:|---:|\n`;
  for (const r of report.routes) {
    const nav = r.clicks.filter((c) => c.navigatedTo).length;
    const pop = r.clicks.filter((c) => c.status === 'opened-popup').length;
    s += `| \`${r.route}\` | \`${r.landed}\` | ${r.clicks.length} | ${nav} | ${pop} |\n`;
  }
  return s + '\n';
}

md += section('Rutas cliente + públicas + logout', main);
md += section('Rutas admin (rol ADMIN)', admin);

md += `## Estructura de carpetas\n\n`;
md += '```\n';
md += `00_public/      login, register (sin autenticar)\n`;
md += `01_active_mock/ todas las rutas del portal (CLIENTE activo)\n`;
md += `02_new_mock/    onboarding (cliente nuevo)\n`;
md += `03_expired_mock/membership + dashboard (membresía vencida)\n`;
md += `04_logout/      cierre de sesión\n`;
md += `05_admin/       panel de operaciones (rol ADMIN)\n`;
md += '```\n\n';
md += `Cada carpeta de ruta contiene: \`NNN_page.png\` (estado base) y un \`NNN_<elemento>.png\` por cada click, con sufijo \`__nav_<ruta>\` si navegó o \`__popup\` si abrió una pestaña externa.\n\n`;
md += `> Datos: app poblada con datos reales — 1324 ejercicios importados, 8 rutinas propias, 14 entrenamientos con series registradas (estados FINALIZADA/EN_PROGRESO/CANCELADA) y 3 planes asignados por el coach. El sweep cubre una ruta \`/exercises/<uuid>\` real y su edición.\n`;

writeFileSync(join(dir, 'INDEX.md'), md);
console.log('wrote', join(dir, 'INDEX.md'), `(${md.length} bytes)`);
