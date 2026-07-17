import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, extname, join, normalize, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkedExtensions = new Set(['.md', '.mdx', '.ts', '.tsx']);
const ignored = new Set(['node_modules', '.git', '.docusaurus', 'build']);
const forbidden = ['Dinosaurs are cool', 'My Site', 'facebook/docusaurus', 'docs/superpowers', 'TODO', 'TBD'];
const failures: string[] = [];
const tabValues = {
  'programming-languages': new Set(['rust', 'python', 'go', 'zig', 'c']),
  'operating-systems': new Set(['macos-linux', 'windows']),
};
const tabGroupCounts = new Map(Object.keys(tabValues).map((group) => [group, 0]));

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
  const importsTabs = text.includes("import Tabs from '@theme/Tabs';");
  const importsTabItem = text.includes("import TabItem from '@theme/TabItem';");
  const usesTabs = text.includes('<Tabs');
  if (usesTabs && (!importsTabs || !importsTabItem)) failures.push(`${label}: tabbed docs must import Tabs and TabItem`);
  if (importsTabs !== importsTabItem) failures.push(`${label}: Tabs and TabItem imports must be paired`);
  for (const tabs of text.matchAll(/<Tabs\s+groupId="([^"]+)"[^>]*>([\s\S]*?)<\/Tabs>/g)) {
    const [, groupId, body] = tabs;
    const allowed = tabValues[groupId as keyof typeof tabValues];
    if (!allowed) {
      failures.push(`${label}: unsupported synchronized tab group "${groupId}"`);
      continue;
    }
    tabGroupCounts.set(groupId, (tabGroupCounts.get(groupId) ?? 0) + 1);
    const values = [...body.matchAll(/<TabItem\s+value="([^"]+)"/g)].map((match) => match[1]);
    if (values.length < 2) failures.push(`${label}: ${groupId} tabs need at least two choices`);
    for (const value of values) if (!allowed.has(value)) failures.push(`${label}: invalid ${groupId} tab value "${value}"`);
  }
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^(https?:|mailto:|\/)/.test(href)) continue;
    const target = normalize(resolve(dirname(file), href));
    const candidates = [target, `${target}.md`, `${target}.mdx`, join(target, 'index.md'), join(target, 'index.mdx')];
    if (!candidates.some(existsSync)) failures.push(`${label}: missing local link ${match[1]}`);
  }
}

for (const [groupId, count] of tabGroupCounts) {
  if (count === 0) failures.push(`missing synchronized tab group "${groupId}"`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Content checks passed.');
