// Временная замена будущей команды `wastech-learn render`:
// рендерит content/**/diagrams/*.mmd в SVG рядом и вписывает в начало SVG
// комментарий <!-- source-sha256: … --> — по нему проверяется свежесть рендера.
// Использование: npm run render:diagrams [-- --check]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, globSync } from 'node:fs';

const MERMAID_CLI = '@mermaid-js/mermaid-cli@11.12.0';
const check = process.argv.includes('--check');
const sources = globSync('content/**/diagrams/*.mmd').sort();
let stale = 0;

for (const src of sources) {
  const hash = createHash('sha256').update(readFileSync(src)).digest('hex');
  const svg = src.replace(/\.mmd$/, '.svg');
  const marker = `<!-- source-sha256: ${hash} -->`;
  const fresh = existsSync(svg) && readFileSync(svg, 'utf8').startsWith(marker);
  if (fresh) continue;
  if (check) {
    console.error(`stale: ${svg}`);
    stale++;
    continue;
  }
  execFileSync('npx', ['-y', MERMAID_CLI, '-q', '-b', 'white', '-i', src, '-o', svg], { stdio: 'inherit' });
  writeFileSync(svg, `${marker}\n${readFileSync(svg, 'utf8')}`);
  console.log(`rendered: ${svg}`);
}

if (check && stale) process.exit(1);
console.log(`${sources.length} diagram source(s), ${check ? `${stale} stale` : 'up to date'}`);
