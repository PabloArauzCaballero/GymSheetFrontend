import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const allowedFetchFiles = new Set([
  'src/features/auth/services/auth-client.ts',
  'src/shared/api/api-client.ts',
  'src/shared/server/backend.ts',
  'src/shared/server/media-proxy.ts',
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

for (const absolute of await walk(sourceRoot)) {
  const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
  if (!sourceExtensions.has(path.extname(absolute))) continue;
  const content = await readFile(absolute, 'utf8');
  const lineCount = content.split(/\r?\n/u).length;
  if (lineCount >= 300) findings.push(`${relative}: ${lineCount} lines (limit is <300)`);
  if (/\bfetch\s*\(/u.test(content) && !allowedFetchFiles.has(relative)) {
    findings.push(`${relative}: direct fetch outside the authorized network layer`);
  }
  if (/\b(localStorage|sessionStorage)\b/u.test(content)) {
    findings.push(`${relative}: browser storage is prohibited for session data`);
  }
  if (/(@ts-ignore|@ts-nocheck|\bas any\b)/u.test(content)) {
    findings.push(`${relative}: unsafe TypeScript suppression or cast`);
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Source check passed.');
}
