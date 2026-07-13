import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, extname, join, normalize, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkedExtensions = new Set(['.md', '.mdx', '.ts', '.tsx']);
const ignored = new Set(['node_modules', '.git', '.docusaurus', 'build']);
const forbidden = ['Dinosaurs are cool', 'My Site', 'facebook/docusaurus', 'docs/superpowers', 'TODO', 'TBD'];
const failures: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (ignored.has(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const file of walk(root).filter((path) => checkedExtensions.has(extname(path)))) {
  const text = readFileSync(file, 'utf8');
  const label = relative(root, file);
  if (label !== 'scripts/check-content.ts') {
    for (const phrase of forbidden) if (text.includes(phrase)) failures.push(`${label}: forbidden text "${phrase}"`);
  }
  if (!['.md', '.mdx'].includes(extname(file))) continue;
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^(https?:|mailto:|\/)/.test(href)) continue;
    const target = normalize(resolve(dirname(file), href));
    const candidates = [target, `${target}.md`, `${target}.mdx`, join(target, 'index.md'), join(target, 'index.mdx')];
    if (!candidates.some(existsSync)) failures.push(`${label}: missing local link ${match[1]}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Content checks passed.');
