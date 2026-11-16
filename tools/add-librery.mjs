import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const plan = new Map();
const original = new Map();
const notes = [];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
const absolute = file => path.join(root, file);
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const read = file => {
  if (plan.has(file)) return plan.get(file);
  const value = fs.readFileSync(absolute(file), 'utf8');
  if (!original.has(file)) original.set(file, value);
  return value;
};
const put = (file, text) => {
  if (!original.has(file)) original.set(file, fs.existsSync(absolute(file)) ? fs.readFileSync(absolute(file), 'utf8') : null);
  if (original.get(file) !== text) plan.set(file, text);
};
const readJson = file => JSON.parse(read(file));
const putJson = (file, value) => put(file, JSON.stringify(value, null, 2) + '\n');

function block(source, marker, opening, closing) {
  const match = marker.exec(source);
  ensure(match, `Nie znaleziono oczekiwanej deklaracji: ${marker}`);
  const start = source.indexOf(opening, match.index);
  ensure(start >= 0, `Brak znaku ${opening}`);
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === opening) depth++;
    if (c === closing && --depth === 0) return { start, end: i, body: source.slice(start + 1, i) };
  }
  throw new Error(`Niezamknieta deklaracja: ${marker}`);
}
function objectMember(file, marker, key, expression) {
  const source = read(file), area = block(source, marker, '{', '}');
  const exists = new RegExp(`(?:^|[,\\s])(?:["']${key}["']|${key})\\s*:`).test(area.body);
  if (exists) return;
  put(file, source.slice(0, area.start + 1) + `\n  ${JSON.stringify(key)}: ${expression},\n` + source.slice(area.start + 1));
}
function arrayValue(file, marker, value) {
  const source = read(file), area = block(source, marker, '[', ']');
  const present = new RegExp(`["']${value}["']`).test(area.body);
  if (present) return;
  put(file, source.slice(0, area.start + 1) + JSON.stringify(value) + ', ' + source.slice(area.start + 1));
}

function prepare() {
  ensure(fs.existsSync(absolute('GameData.js')), 'Uruchom skrypt z tools/ w katalogu projektu gry.');
  ensure(!fs.existsSync(absolute('systems/LibreryIntegration.js')), 'Istnieje LibreryIntegration.js. Ten pakiet zaklada brak poprzedniego obejscia; niczego nie zmieniono.');
  for (const suffix of ['a', 'h', 'w', 'b', 'o']) {
    ensure(fs.existsSync(absolute(`assets/local/librery_${suffix}.webp`)), `Brak assets/local/librery_${suffix}.webp. Niczego jeszcze nie zapisano.`);
  }

  const dialogueFile = 'assets/data/dialogue/librery.json';
  const dialogue = readJson(dialogueFile);
  const variant = dialogue?.libreryClues?.locationVariants?.default;
  ensure(variant?.topics?.books && variant?.topics?.authors, 'Nieprawidlowy librery.json.');

  objectMember('npcCatalogData.js', /["']npcs["']\s*:\s*\{/, 'librarian', JSON.stringify({
    id: 'librarian', role: 'Librarian', displayName: 'Librarian', dialogueId: 'librarian', portraits: {}
  }, null, 2));

  objectMember('dialogues/dialogueKeys.js', /\bconst\s+definitions\s*=\s*\{/, 'librarian', JSON.stringify({
    key: 'dialogue_librery', root: 'libreryClues', file: dialogueFile
  }, null, 2));

  arrayValue('locationIcons.js', /\bconst\s+TYPES\s*=\s*\[/, 'librery');
  objectMember('locationIcons.js', /\bconst\s+ALIASES\s*=\s*\{/, 'library', "'librery'");
  objectMember('locationIcons.js', /\bconst\s+NPC_TYPES\s*=\s*\{/, 'librarian', "'librery'");
  objectMember('locationIcons.js', /\bconst\s+LABELS\s*=\s*\{/, 'librery', "'Library'");

  const configFile = 'scenes/city/CityConfig.js';
  const config = read(configFile);
  const hours = block(config, /\bconst\s+LOCATION_HOURS\s*=\s*\{/, '{', '}');
  const bank = block(hours.body, /\bbank\s*:\s*\[/, '[', ']');
  objectMember(configFile, /\bconst\s+LOCATION_HOURS\s*=\s*\{/, 'librery', '[' + bank.body + ']');

  for (const field of ['literaryBook', 'literaryAuthor']) {
    arrayValue('dialogues/EditableTravelTemplates.js', /\bconst\s+EDITABLE_FIELDS\s*=\s*\[/, field);
  }

  const destinationFile = 'dialogues/DestinationClueText.js';
  let destination = read(destinationFile);
  if (!destination.includes('LITERARY_TOPICS_JSON_ONLY')) {
    const signature = /export\s+function\s+buildDestinationLines\s*\(\s*\{\s*topicId\s*,\s*facts\s*,\s*templates\s*=\s*\[\s*\]\s*,\s*guard\s*\}\s*\)\s*\{/;
    ensure(signature.test(destination), 'Zmodyfikowano buildDestinationLines; skrypt zatrzymany bez zapisu.');
    destination = destination.replace(signature, match => match + `
 // LITERARY_TOPICS_JSON_ONLY: do not replace missing literary data with a generic clue.
 if (topicId === 'books' || topicId === 'authors') {
   return facts ? editableTravelLines(templates, facts, guard) : [];
 }
`);
    put(destinationFile, destination);
  }

  const locationFile = 'assets/data/locations.json';
  const locations = readJson(locationFile);
  ensure(Array.isArray(locations), 'locations.json nie jest tablica.');
  let citiesAdded = 0;
  for (const city of locations) {
    if (!city?.id || !Array.isArray(city.encounterPool) || !Array.isArray(city.encounterSlots) || !city.encounterSlots.some(slot => slot.enabled)) continue;
    if (city.encounterPool.some(pair => pair?.npcId === 'librarian' && pair?.locationId === 'librery')) continue;
    city.encounterPool.push({ id: `${city.id}_librarian_librery`, npcId: 'librarian', locationId: 'librery' });
    citiesAdded++;
  }
  putJson(locationFile, locations);
  notes.push(`Bibliotekarka dodana do puli ${citiesAdded} miast; liczba spotkan pozostaje bez zmian.`);

  const indexFile = 'assets/manifests/index.json';
  const index = readJson(indexFile);
  ensure(index.version === 2 && Array.isArray(index.files) && index.bundles, 'Nieobslugiwany manifest.');
  const parts = new Map(index.files.map(file => [file, readJson(file)]));
  const allAssets = [...parts.entries()].flatMap(([part, data]) => (data.assets || []).map(asset => ({ ...asset, part })));
  const factsAsset = allAssets.find(asset => asset.type === 'json' && asset.key === 'country_facts');
  ensure(factsAsset?.url && !/^https?:/i.test(factsAsset.url), 'Nie znaleziono lokalnego country_facts.');
  const facts = readJson(factsAsset.url);
  ensure(facts && typeof facts === 'object' && !Array.isArray(facts), 'Nieprawidlowe fakty miast.');

  const literary = {
    warsaw: {
      literaryBook: 'The Doll, with the merchant Wokulski and his disastrous pursuit of an aristocratic romance',
      literaryAuthor: 'Boleslaw Prus, specifically the city portrayed in The Doll'
    },
    toronto: {
      literaryBook: 'In the Skin of a Lion, a story about immigrants, bridge builders and tunnellers in a Canadian city',
      literaryAuthor: 'Michael Ondaatje, specifically the city portrayed in In the Skin of a Lion'
    },
    paris: {
      literaryBook: 'A Moveable Feast, a memoir about a young writer and the literary life of the 1920s',
      literaryAuthor: 'Ernest Hemingway, specifically the city remembered in A Moveable Feast'
    }
  };
  for (const [id, value] of Object.entries(facts)) {
    const data = literary[normalize(id)];
    if (!data || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const [key, content] of Object.entries(data)) {
      if (!own(value, key)) value[key] = content;
    }
  }
  for (const id of Object.keys(literary)) {
    ensure(Object.keys(facts).some(key => normalize(key) === id), `Brak miasta ${id} w country_facts; sprawdz strukture danych.`);
  }
  putJson(factsAsset.url, facts);

  const partFile = 'assets/manifests/other.json';
  const part = parts.get(partFile);
  ensure(Array.isArray(part?.assets), 'Nieprawidlowy assets/manifests/other.json.');
  index.bundles.shared ??= [];
  function asset(type, key, url, group) {
    const existing = allAssets.find(a => a.type === type && a.key === key);
    ensure(!existing || existing.url === url, `Konflikt zasobu ${type}:${key}.`);
    if (!existing) {
      const item = { key, url, type, groups: [group] };
      part.assets.push(item);
      allAssets.push({ ...item, part: partFile });
    }
    const ref = `${type}:${key}`;
    if (!index.bundles.shared.includes(ref)) index.bundles.shared.push(ref);
  }
  for (const suffix of ['a', 'h', 'w', 'b', 'o']) {
    asset('image', `librery_${suffix}`, `assets/local/librery_${suffix}.webp`, 'backgrounds');
  }
  asset('json', 'dialogue_librery', dialogueFile, 'json');
  if (fs.existsSync(absolute('assets/map_locations/librery.webp'))) {
    asset('image', 'map_location_librery', 'assets/map_locations/librery.webp', 'backgrounds');
  } else {
    notes.push('Brak assets/map_locations/librery.webp: pozostaje istniejaca ikona zastepcza lokalizacji. Nie generowano obrazka.');
  }
  putJson(partFile, part);
  putJson(indexFile, index);

  for (const [file, content] of plan) {
    if (file.endsWith('.json')) JSON.parse(content);
    if (file.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: content, encoding: 'utf8' });
      ensure(!result.error && result.status === 0, `Blad skladni ${file}: ${result.stderr || result.error || ''}`);
    }
  }
  ensure(!plan.has('scenes/BaseScene.js'), 'BaseScene nie moze byc zmieniany.');
}

function commit() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(root, '.librery-backups', stamp);
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'changes.json'), JSON.stringify([...plan.keys()], null, 2));
  for (const file of plan.keys()) {
    const before = original.get(file);
    if (before !== null) {
      const target = path.join(backup, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, before);
    }
  }
  const written = [];
  try {
    for (const [file, content] of plan) {
      const target = absolute(file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      written.push(file);
      fs.writeFileSync(target, content);
    }
  } catch (error) {
    for (const file of written.reverse()) {
      const before = original.get(file);
      if (before === null) fs.rmSync(absolute(file), { force: true });
      else fs.writeFileSync(absolute(file), before);
    }
    throw error;
  }
  console.log(`Zapisano ${plan.size} pelnych plikow. Kopia poprzednich wersji: ${path.relative(root, backup)}`);
}

try {
  prepare();
  console.log('Pliki do aktualizacji:\n' + [...plan.keys()].map(file => ' - ' + file).join('\n'));
  for (const note of notes) console.log(note);
  if (!plan.size) console.log('Wszystkie wpisy sa juz dodane.');
  else if (apply) commit();
  else console.log('Podglad gotowy. Aby zapisac: node tools/add-librery.mjs --apply');
} catch (error) {
  console.error('[Librery] ' + error.message);
  process.exitCode = 1;
}
