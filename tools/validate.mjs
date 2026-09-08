/* Checks every space file before it goes live:

     node tools/validate.mjs

   Catches the mistakes that are easy to make by hand — a missing comma, a
   forgotten index entry, a typo in an occasion name, a photo path pointing
   at a file that isn't there. Exits non-zero on failure so CI can use it. */

import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'data', 'spaces');

const OCCASIONS = [
  'Wedding', 'Party', 'Meeting', 'Community event',
  'Wake', 'Class or workshop', 'Performance'
];
const SETTINGS = ['Indoor', 'Outdoor'];
const CONTACT_TYPES = ['email', 'phone', 'link'];
const REQUIRED = [
  'id', 'name', 'org', 'area', 'setting', 'capacity',
  'occasions', 'features', 'priceTier', 'summary', 'description', 'contact'
];

const problems = [];
const notes = [];

function fail(file, message) { problems.push(`${file}: ${message}`); }
function warn(file, message) { notes.push(`${file}: ${message}`); }

const files = (await readdir(dir))
  .filter((f) => f.endsWith('.json') && f !== 'index.json' && !f.startsWith('_'));

let index;
try {
  index = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8'));
} catch (err) {
  console.error(`index.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const seenIds = new Set();

for (const file of files) {
  let space;
  try {
    space = JSON.parse(await readFile(join(dir, file), 'utf8'));
  } catch (err) {
    fail(file, `not valid JSON — ${err.message}`);
    continue;
  }

  for (const key of REQUIRED) {
    if (space[key] === undefined || space[key] === '') fail(file, `missing "${key}"`);
  }

  const expectedId = file.replace(/\.json$/, '');
  if (space.id && space.id !== expectedId) {
    fail(file, `id is "${space.id}" but the filename says "${expectedId}" — they must match`);
  }

  if (seenIds.has(space.id)) fail(file, `duplicate id "${space.id}"`);
  seenIds.add(space.id);

  if (!index.includes(expectedId)) {
    fail(file, `not listed in index.json — add "${expectedId}" or run: node tools/build-index.mjs`);
  }

  if (space.setting && !SETTINGS.includes(space.setting)) {
    fail(file, `setting is "${space.setting}", must be one of ${SETTINGS.join(' or ')}`);
  }

  if (space.capacity !== undefined && (!Number.isFinite(space.capacity) || space.capacity <= 0)) {
    fail(file, 'capacity must be a positive number, with no quotes around it');
  }

  if (space.priceTier !== undefined && ![1, 2, 3].includes(space.priceTier)) {
    fail(file, 'priceTier must be 1, 2 or 3');
  }

  for (const occasion of space.occasions || []) {
    if (!OCCASIONS.includes(occasion)) {
      fail(file, `occasion "${occasion}" is not recognised. Use one of: ${OCCASIONS.join(', ')}`);
    }
  }

  const contact = space.contact || {};
  if (contact.type && !CONTACT_TYPES.includes(contact.type)) {
    fail(file, `contact.type is "${contact.type}", must be email, phone or link`);
  }
  if (contact.type === 'email' && contact.value && !contact.value.includes('@')) {
    fail(file, 'contact.value should be an email address');
  }
  if (contact.type === 'link' && contact.value && !/^https?:\/\//.test(contact.value)) {
    fail(file, 'contact.value should be a full URL starting with https://');
  }
  if (!contact.value) fail(file, 'contact.value is missing');

  if (space.image) {
    try {
      await access(join(root, space.image));
    } catch {
      fail(file, `image "${space.image}" does not exist. Check the path and the file extension.`);
    }
  } else {
    warn(file, 'no photograph yet — the name will show on a navy panel instead');
  }

  if (!space.source) warn(file, 'no source link, so the details cannot be checked later');
}

for (const id of index) {
  if (!files.includes(`${id}.json`)) {
    problems.push(`index.json lists "${id}" but data/spaces/${id}.json does not exist`);
  }
}

if (notes.length) {
  console.log('Worth a look:');
  for (const n of notes) console.log(`  · ${n}`);
  console.log('');
}

if (problems.length) {
  console.error('Problems found:');
  for (const p of problems) console.error(`  ✕ ${p}`);
  console.error(`\n${problems.length} problem(s). Nothing was changed.`);
  process.exit(1);
}

console.log(`All good — ${files.length} spaces checked.`);
