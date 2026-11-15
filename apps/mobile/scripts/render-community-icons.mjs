#!/usr/bin/env node
/**
 * 3D icons of the Comunidad «⋯» sheet (mobile `community-overflow-sheet.tsx`,
 * web `comunidad-client.tsx`). Single vector source: each icon is a layered SVG
 * (tile + volumetric glyph) on a 1024 canvas, rasterised with Playwright's
 * Chromium straight at each target size (vector, no upscaling).
 *
 * Shared material, so the set reads as one family:
 * - Light from the top-left; every glyph is extruded straight down (`DEPTH`).
 * - Tile: iOS superellipse, deep tint of the hue, inner glow behind the glyph,
 *   glass rim lit from the top.
 * - Glyph: glossy enamel — face gradient, lit top rim, shaded bottom rim,
 *   specular sheen, contact shadow on the tile.
 *
 * Output (do not hand-edit, re-run this):
 *   apps/mobile/assets/icons/community/<name>{,@2x,@3x}.png   (56 / 112 / 168 px)
 *   apps/web/public/icons/community/<name>{,@2x,@3x}.png      (+ web-only icons)
 *
 * Usage (from apps/mobile):
 *   node scripts/render-community-icons.mjs                 regenerate the committed assets
 *   node scripts/render-community-icons.mjs --out <dir>     write every PNG to <dir> instead
 *   node scripts/render-community-icons.mjs --sheet <dir>   also write SVGs, 1024 masters and contact-sheet.png
 *   --dry-run (alias --sheet-only)                          never touch the committed assets
 *
 * `ICON_SIZE` is coupled to `iconSizes.tile` in `src/theme/spacing.ts`.
 * Chromium used for the committed PNGs (2026-11-15): 153.0.8010.12
 * (repo Playwright 1.62 driving /opt/pw-browsers/chromium_headless_shell-1243). The script prints the version it used.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('@playwright/test');
  }
})();

const here = dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = join(here, '..', 'assets', 'icons', 'community');
const WEB_DIR = join(here, '..', '..', 'web', 'public', 'icons', 'community');
/** Icons only the web sheet shows («Personas del gimnasio»); not shipped in the app bundle. */
const WEB_ONLY = new Set(['personas']);
/** Rendered size in pt/CSS px (= `iconSizes.tile`); the PNG canvas includes the tile's drop shadow. */
export const ICON_SIZE = 56;
const DEPTH = 26;

/** iOS-like superellipse (n = 5) of side `s` at (x, y). */
function squircle(x, y, s, n = 5) {
  const r = s / 2;
  const pts = [];
  for (let i = 0; i < 240; i += 1) {
    const t = (i / 240) * Math.PI * 2;
    const c = Math.cos(t);
    const sn = Math.sin(t);
    pts.push(`${(x + r + r * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(1)} ${(y + r + r * Math.sign(sn) * Math.abs(sn) ** (2 / n)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Four-point sparkle with soft concave sides. */
function star4(cx, cy, r, k = 0.2) {
  const q = r * k;
  return `M${cx} ${cy - r}Q${cx + q} ${cy - q} ${cx + r} ${cy}Q${cx + q} ${cy + q} ${cx} ${cy + r}Q${cx - q} ${cy + q} ${cx - r} ${cy}Q${cx - q} ${cy - q} ${cx} ${cy - r}Z`;
}

function star5(cx, cy, r) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.46 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
}

/** A capsule from (x1, y1) to (x2, y2), `w` thick, as a filled shape. */
function bar(x1, y1, x2, y2, w) {
  const len = Math.hypot(x2 - x1, y2 - y1) + w;
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return `<rect x="${-len / 2}" y="${-w / 2}" width="${len}" height="${w}" rx="${w / 2}" transform="translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${deg})"/>`;
}

let uid = 0;
/**
 * One extruded enamel part. `shape` is SVG markup without fills; `box` is
 * [x0, y0, x1, y1] for the lighting; `m` = { face: [hi, mid, lo], side: [hi, lo] };
 * `decor` is markup painted on the face (inside its mask), `depth` overrides DEPTH.
 */
function solid(shape, box, m, { decor = '', depth = DEPTH, gloss = 0.55 } = {}) {
  const id = `p${(uid += 1)}`;
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const steps = Math.max(1, Math.round(depth / 2));
  let side = '';
  for (let i = steps; i >= 1; i -= 1) side += `<use href="#${id}" transform="translate(0 ${((i * depth) / steps).toFixed(1)})"/>`;
  return `<defs><g id="${id}">${shape}</g>
<linearGradient id="${id}f" gradientUnits="userSpaceOnUse" x1="${x0 + w * 0.3}" y1="${y0}" x2="${x0 + w * 0.7}" y2="${y1}"><stop offset="0" stop-color="${m.face[0]}"/><stop offset=".5" stop-color="${m.face[1]}"/><stop offset="1" stop-color="${m.face[2]}"/></linearGradient>
<linearGradient id="${id}s" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1 + depth}"><stop offset="0" stop-color="${m.side[0]}"/><stop offset="1" stop-color="${m.side[1]}"/></linearGradient>
<radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${x0 + w * 0.34}" cy="${y0 + h * 0.2}" r="${Math.max(w, h) * 0.55}"><stop offset="0" stop-color="#fff" stop-opacity="${gloss}"/><stop offset=".45" stop-color="#fff" stop-opacity="${gloss * 0.25}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}d" gradientUnits="userSpaceOnUse" cx="${x0 + w * 0.4}" cy="${y0 + h * 0.3}" r="${Math.max(w, h) * 0.85}"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient>
<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><use href="#${id}" fill="#fff"/></mask></defs>
<use href="#${id}" fill="#000" opacity=".5" filter="url(#soft)" transform="translate(6 ${depth + 22})"/>
<use href="#${id}" fill="#000" opacity=".35" filter="url(#tight)" transform="translate(2 ${depth + 6})"/>
<g fill="url(#${id}s)">${side}</g>
<use href="#${id}" fill="url(#${id}f)"/>
<g mask="url(#${id}m)">${decor}
<rect width="1024" height="1024" fill="url(#${id}d)"/>
<use href="#${id}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="22" filter="url(#tight)" transform="translate(0 -12)"/>
<use href="#${id}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="10" filter="url(#rim)" transform="translate(0 7)"/>
<rect width="1024" height="1024" fill="url(#${id}g)"/></g>`;
}

/** Glossy sphere (slider knobs, heads). */
function sphere(cx, cy, r, [hi, mid, lo]) {
  const id = `b${(uid += 1)}`;
  return `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" r="${r * 1.5}"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>
<ellipse cx="${cx + 4}" cy="${cy + r * 0.95}" rx="${r * 0.85}" ry="${r * 0.32}" fill="#000" opacity=".45" filter="url(#soft)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
<ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.42}" rx="${r * 0.42}" ry="${r * 0.26}" fill="#fff" opacity=".7" filter="url(#rim)"/>`;
}

/** Tile: deep tint `[top, bottom]`, glow colour behind the glyph. */
function tile([top, bottom], glow) {
  const d = squircle(72, 60, 880);
  const inner = squircle(78, 66, 868);
  return `<defs><linearGradient id="tb" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<radialGradient id="tg" cx=".5" cy=".46" r=".52"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".22" stop-color="#fff" stop-opacity=".08"/><stop offset=".8" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
<linearGradient id="ts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="tc"><path d="${d}"/></clipPath></defs>
<path d="${d}" fill="#000" opacity=".55" filter="url(#soft)" transform="translate(0 26)"/>
<path d="${d}" fill="url(#tb)"/>
<g clip-path="url(#tc)"><rect width="1024" height="1024" fill="url(#tg)"/><ellipse cx="420" cy="80" rx="620" ry="300" fill="url(#ts)"/></g>
<path d="${inner}" fill="none" stroke="url(#tr)" stroke-width="8"/>`;
}

const FILTERS = `<defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="tight" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="rim" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>`;

/** Scale/shift a glyph about the tile's optical centre. */
const fit = (markup, scale = 1, dy = 0) => `<g transform="translate(512 ${500 + dy}) scale(${scale}) translate(-512 -500)">${markup}</g>`;

const pearl = { face: ['#FFFFFF', '#EEF4F8', '#C9D6E2'], side: ['#9FB0C2', '#5E7088'] };

/** The set. Keys are the asset file names. */
export const ICONS = {
  preferencias: () =>
    tile(['#1F6F66', '#0A2B2A'], '#48D1B6') +
    [[312, 610], [500, 390], [688, 652]]
      .map(([y, knob]) =>
        solid(`<rect x="236" y="${y - 38}" width="552" height="76" rx="38"/>`, [236, y - 38, 788, y + 38], pearl, {
          depth: 18,
          decor: `<rect x="236" y="${y - 38}" width="${knob - 236}" height="76" fill="#3FE0BE"/><rect x="236" y="${y - 38}" width="${knob - 236}" height="76" fill="url(#mintShade)"/>`,
        }) + sphere(knob, y, 86, ['#FFFFFF', '#E7FFF8', '#5FB8A6']),
      )
      .join('')
      .replace('<defs>', '<defs><linearGradient id="mintShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#0B5E50" stop-opacity=".5"/></linearGradient>'),

  top: () => {
    const gold = { face: ['#FFF0A0', '#FFC21A', '#C77400'], side: ['#9A5A06', '#4E2A02'] };
    return (
      tile(['#B0480C', '#3A0E00'], '#FFB000') +
      fit(solid('<path d="M354 268C214 268 222 486 412 494L424 434C320 422 304 340 354 340Z"/><path d="M670 268C810 268 802 486 612 494L600 434C704 422 720 340 670 340Z"/>', [214, 268, 810, 494], gold, { depth: 18, gloss: 0.4 }) +
      solid('<path d="M482 540H542L556 642H468Z"/>', [468, 540, 556, 642], gold, { depth: 14, gloss: 0.3 }) +
      solid('<path d="M352 238H672V318C672 462 602 548 512 560C422 548 352 462 352 318Z"/>', [352, 238, 672, 560], gold, { gloss: 0.4,
        decor: `<path d="${star5(512, 372, 74)}" fill="#FFF7CC" opacity=".9"/><path d="${star5(512, 380, 74)}" fill="#B87406" opacity=".35"/><path d="${star5(512, 372, 74)}" fill="#FFE27A"/>`,
      }) +
      solid('<rect x="420" y="632" width="184" height="40" rx="14"/><rect x="384" y="664" width="256" height="92" rx="24"/>', [384, 632, 640, 756], { face: ['#FFE48A', '#E9A21C', '#A9640A'], side: ['#7A4606', '#3F2202'] }, {
        depth: 22,
        decor: '<rect x="452" y="690" width="120" height="38" rx="10" fill="#7A4606" opacity=".55"/>',
      }), 1.14, -6)
    );
  },

  directorio: () => {
    // Four wide awning panels and two big openings: reads at 56 pt.
    let stripes = '';
    for (let i = 0; i < 4; i += 2) stripes += `<rect x="${262 + i * 125}" y="200" width="125" height="300" fill="#2F7BFF"/>`;
    let scallops = '';
    for (let i = 0; i < 4; i += 1) scallops += `A62.5 62.5 0 0 1 ${762 - (i + 1) * 125} 424`;
    return (
      tile(['#1E4FA8', '#07173A'], '#38BDF8') +
      solid('<rect x="300" y="380" width="424" height="390" rx="30"/>', [300, 380, 724, 770], pearl, {
        decor: `<rect x="340" y="500" width="168" height="150" rx="22" fill="#123A7A"/><rect x="548" y="500" width="136" height="280" rx="22" fill="#0E2F66"/>
<path d="M340 500h168v46c-60 8-118 40-168 86z" fill="#7CC4FF" opacity=".5"/><circle cx="660" cy="650" r="12" fill="#FFD24A"/>
<rect x="340" y="500" width="168" height="150" rx="22" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="12" transform="translate(0 5)"/><rect x="548" y="500" width="136" height="280" rx="22" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="12" transform="translate(0 5)"/>`,
      }) +
      solid(`<path d="M300 236Q300 214 322 214H702Q724 214 724 236L762 400V424${scallops}V400Z"/>`, [262, 214, 762, 486], pearl, {
        depth: 22,
        decor: `${stripes}<rect x="262" y="200" width="500" height="300" fill="url(#awnShade)"/>`,
      }).replace('<defs>', '<defs><linearGradient id="awnShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#001440" stop-opacity=".35"/></linearGradient>')
    );
  },

  mapa: () =>
    tile(['#137A55', '#042A1E'], '#34D399') +
    '<ellipse cx="512" cy="792" rx="190" ry="58" fill="none" stroke="#7CF5C4" stroke-opacity=".35" stroke-width="14"/><ellipse cx="512" cy="792" rx="110" ry="32" fill="#7CF5C4" opacity=".28"/>' +
    solid('<path fill-rule="evenodd" d="M512 790C468 700 318 590 318 404A194 194 0 0 1 706 404C706 590 556 700 512 790ZM512 322A84 84 0 1 0 512.1 322Z"/>', [318, 210, 706, 790], { face: ['#C8FFE6', '#3FE694', '#0E9F62'], side: ['#0B7A4A', '#03361F'] }),

  interacciones: () =>
    tile(['#A3163F', '#3A0718'], '#FB7185') +
    solid('<path d="M512 792C376 694 236 590 236 434C236 330 314 252 408 252C458 252 494 276 512 312C530 276 566 252 616 252C710 252 788 330 788 434C788 590 648 694 512 792Z"/>', [236, 252, 788, 792], { face: ['#FFC2CF', '#FF4D73', '#C3123F'], side: ['#9A0E33', '#4A0315'] }, { gloss: 0.7 }),

  bloqueadas: () =>
    tile(['#3A4A63', '#0D1422'], '#94A3B8') +
    solid('<path d="M512 226C604 280 684 292 748 292V500C748 652 638 754 512 806C386 754 276 652 276 500V292C340 292 420 280 512 226Z"/>', [276, 226, 748, 806], { face: ['#F2F6FA', '#B7C4D3', '#6E7F96'], side: ['#55657C', '#222C3C'] }, {
      decor: '<path d="M512 270C590 314 656 326 708 328V500C708 628 618 716 512 762C406 716 316 628 316 500V328C368 326 434 314 512 270Z" fill="#26344D"/><path d="M512 270C590 314 656 326 708 328V420C600 400 470 420 316 520V328C368 326 434 314 512 270Z" fill="#8FA3C0" opacity=".25"/>',
    }) +
    // Ban sign (ring + slash), not a check: a check reads as «verified».
    solid('<path fill-rule="evenodd" d="M512 336A166 166 0 1 1 511.9 336ZM512 410A92 92 0 1 0 512.1 410Z"/>' + bar(418, 408, 606, 596, 72), [346, 336, 678, 668], { face: ['#FFD6D1', '#FF6B5E', '#C9302C'], side: ['#9A1F1A', '#4A0906'] }, { depth: 16 }),

  tour: () =>
    tile(['#5B2A9E', '#1C0A3A'], '#C084FC') +
    fit(solid(`<path d="${star4(474, 548, 236)}"/>`, [238, 312, 710, 784], { face: ['#FFF6D6', '#E3C7FF', '#9A5CF0'], side: ['#6A2FC2', '#2E0D63'] }, { gloss: 0.7 }) +
    solid(`<path d="${star4(708, 316, 108)}"/>`, [600, 208, 816, 424], { face: ['#FFFFFF', '#F3E6FF', '#B98AF8'], side: ['#7B44CF', '#36126D'] }, { depth: 18 }) +
    solid(`<path d="${star4(304, 280, 64)}"/>`, [240, 216, 368, 344], { face: ['#FFFFFF', '#F3E6FF', '#B98AF8'], side: ['#7B44CF', '#36126D'] }, { depth: 12 }), 1, -24),

  personas: () => {
    // Indigo, so it never sits next to the orange trophy with the same hue.
    const back = { face: ['#E4E6FF', '#A5ADFF', '#6366F1'], side: ['#4338CA', '#1E1A6B'] };
    const front = { face: ['#FFFFFF', '#E0E4FF', '#8F98F8'], side: ['#5B5FD6', '#24207A'] };
    return (
      tile(['#3F3AB8', '#120F4A'], '#818CF8') +
      fit(solid('<circle cx="634" cy="350" r="92"/><path d="M462 700C462 556 546 474 634 474C722 474 806 556 806 700Q806 726 780 726H488Q462 726 462 700Z"/>', [462, 258, 806, 726], back) +
      solid('<circle cx="424" cy="410" r="108"/><path d="M220 776C220 610 316 536 424 536C532 536 628 610 628 776Q628 806 598 806H250Q220 806 220 776Z"/>', [220, 302, 628, 806], front), 1.04, -40)
    );
  },
};

const svg = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${FILTERS}${ICONS[name]()}</svg>`;

/** Bundled browser first; else `CHROMIUM_PATH`, else any headless shell under PLAYWRIGHT_BROWSERS_PATH. */
async function launch() {
  if (process.env.CHROMIUM_PATH) return chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    return await chromium.launch();
  } catch (error) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '';
    const shell = existsSync(root) ? readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().pop() : undefined;
    if (!shell) throw error;
    return chromium.launch({ executablePath: join(root, shell, 'chrome-headless-shell-linux64', 'chrome-headless-shell') });
  }
}

const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);

/** Contact sheet: masters at 300 px, then actual size (56) on the sheet surfaces. */
function contactSheet(masters, actual) {
  const img = (src, px) => `<img width="${px}" height="${px}" src="${src}">`;
  const row = (bg) => `<div style="display:flex;gap:18px;padding:20px;background:${bg};border-radius:20px;width:fit-content;margin-top:12px">${Object.values(actual).map((src) => img(src, ICON_SIZE)).join('')}</div>`;
  return `<body style="margin:0;background:#0F172A;color:#F5F8FA;font:600 16px system-ui"><div style="padding:40px;width:1360px">
<div style="display:grid;grid-template-columns:repeat(4,300px);gap:28px">${Object.entries(masters).map(([n, src]) => `<div style="text-align:center">${img(src, 300)}<div style="color:#A9B6C2;font-size:14px">${n}</div></div>`).join('')}</div>
<p style="margin:36px 0 0">Actual size (${ICON_SIZE} pt): sheet #172235 · row #1D283D · canvas #0F172A</p>${['#172235', '#1D283D', '#0F172A'].map(row).join('')}</div></body>`;
}

async function main() {
  const sheetDir = arg('--sheet');
  const outDir = arg('--out');
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--sheet-only');
  const browser = await launch();
  console.log(`Chromium ${browser.version()}`);
  const page = await browser.newPage();
  const shoot = async (markup, px) => {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('width="1024" height="1024"', `width="${px}" height="${px}"`)}</body></html>`);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
  };
  const written = new Set();
  const masters = {};
  const actual = {};
  for (const name of Object.keys(ICONS)) {
    const markup = svg(name);
    const dirs = [outDir, ...(dryRun || outDir ? [] : [WEB_DIR, WEB_ONLY.has(name) ? null : MOBILE_DIR])].filter(Boolean);
    for (const [scale, suffix] of [[1, ''], [2, '@2x'], [3, '@3x']]) {
      const png = await shoot(markup, ICON_SIZE * scale);
      if (scale === 3) actual[name] = `data:image/png;base64,${png.toString('base64')}`;
      for (const dir of dirs) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${name}${suffix}.png`), png);
        written.add(dir);
      }
    }
    if (sheetDir) {
      mkdirSync(join(sheetDir, 'masters'), { recursive: true });
      writeFileSync(join(sheetDir, 'masters', `${name}.svg`), markup);
      const master = await shoot(markup, 1024);
      writeFileSync(join(sheetDir, 'masters', `${name}-1024.png`), master);
      masters[name] = `data:image/png;base64,${master.toString('base64')}`;
    }
  }
  if (sheetDir) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(contactSheet(masters, actual));
    await page.screenshot({ path: join(sheetDir, 'contact-sheet.png'), fullPage: true });
    console.log(`contact sheet → ${join(sheetDir, 'contact-sheet.png')}`);
  }
  await browser.close();
  console.log(`${Object.keys(ICONS).length} icons → ${written.size ? [...written].join(', ') : '(no asset folders written)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
