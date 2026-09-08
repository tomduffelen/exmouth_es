/* Rebuilds data/spaces/index.json from whatever .json files are sitting in
   data/spaces/. Run it after adding or removing a space:

     node tools/build-index.mjs

   Existing order is preserved; new spaces are appended at the end. */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data', 'spaces');
const indexPath = join(dir, 'index.json');

const files = await readdir(dir);

const ids = files
  .filter((f) => f.endsWith('.json'))
  .filter((f) => f !== 'index.json')
  .filter((f) => !f.startsWith('_'))
  .map((f) => f.replace(/\.json$/, ''));

let existing = [];
try {
  existing = JSON.parse(await readFile(indexPath, 'utf8'));
} catch {
  existing = [];
}

const kept = existing.filter((id) => ids.includes(id));
const added = ids.filter((id) => !kept.includes(id)).sort();
const next = [...kept, ...added];

await writeFile(indexPath, JSON.stringify(next, null, 2) + '\n');

console.log(`index.json now lists ${next.length} spaces.`);
if (added.length) console.log(`Added: ${added.join(', ')}`);

const dropped = existing.filter((id) => !ids.includes(id));
if (dropped.length) console.log(`Removed (no matching file): ${dropped.join(', ')}`);
