import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const OLD_MANAGER = 'managers/UnifiedTravelManager.js';
const MIGRATION = 'gameState/legacyTravelMigration.js';
const EXCLUDED = new Set([
  '.git', '.github', 'node_modules', 'tools', 'scripts', 'tests', 'test',
  'dist', 'build', 'coverage', 'output', 'admin', 'supabase'
]);
const parseJS = source => parse(source, {
  ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true
});
function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  if (visit(node, parents) === false) return;
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'loc'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === 'string') walk(child, visit, [...parents, node]);
    }
  }
}
function edit(source, edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) throw new Error('Overlapping edits.');
  }
  for (const item of sorted.reverse()) {
    source = source.slice(0, item.start) + item.text + source.slice(item.end);
  }
  parseJS(source);
  return source;
}
function one(items, description) {
  if (items.length !== 1) throw new Error(`Expected one ${description}; found ${items.length}. No files written.`);
  return items[0];
}
const read = file => fs.readFile(path.join(ROOT, file), 'utf8');
async function exists(file) {
  try { await fs.access(path.join(ROOT, file)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function propName(node) { return node.computed ? null : node.key?.name ?? node.key?.value; }

function removeUnifiedSetup(source) {
  const tree = parseJS(source);
  const imports = tree.body.filter(node => node.type === 'ImportDeclaration' &&
    node.source.value === './managers/UnifiedTravelManager.js');
  if (!imports.length && !source.includes('createUnifiedTravelManager')) return source;
  const imp = one(imports, 'UnifiedTravelManager import');
  if (imp.specifiers.length !== 1 || imp.specifiers[0].local.name !== 'createUnifiedTravelManager') {
    throw new Error('Unexpected UnifiedTravelManager import specifiers.');
  }
  const calls = [];
  walk(tree, (node, parents) => {
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
        !node.callee.computed && node.callee.property.name === 'init' &&
        node.callee.object.type === 'CallExpression' &&
        node.callee.object.callee.name === 'createUnifiedTravelManager') {
      if (node.arguments.length || node.callee.object.arguments.length || parents.at(-1)?.type !== 'ExpressionStatement') {
        throw new Error('Unexpected UnifiedTravelManager initialization.');
      }
      calls.push(parents.at(-1));
    }
  });
  const call = one(calls, 'UnifiedTravelManager initialization');
  const result = edit(source, [
    { start: imp.start, end: imp.end, text: '' },
    { start: call.start, end: call.end, text: '' }
  ]);
  if (result.includes('createUnifiedTravelManager')) throw new Error('Additional Unified setup uses require review.');
  return result;
}

function updateTravelEstimate(source) {
  const tree = parseJS(source);
  const functions = [];
  walk(tree, node => {
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'calculateTravelValues') functions.push(node);
  });
  const fn = one(functions, 'calculateTravelValues function');
  if (fn.params.length !== 2 || fn.params[1].name !== 'type') throw new Error('Unexpected calculateTravelValues signature.');
  const properties = [];
  walk(fn.body, node => {
    if (node.type === 'Property' && propName(node) === 'estimatedEnergyChange') properties.push(node);
  });
  const value = one(properties, 'estimatedEnergyChange in calculateTravelValues').value;
  const text = '-getEnergyManager().getTravelCost(type)';
  if (source.slice(value.start, value.end).replace(/\s/g, '') === text) return source;
  const result = edit(source, [{ start: value.start, end: value.end, text }]);
  if (!result.includes("from './EnergyManager.js'")) throw new Error('Expected EnergyManager import missing.');
  return result;
}

function updateDefaultState(source) {
  const tree = parseJS(source);
  const declarations = [];
  walk(tree, node => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'defaultGameState') declarations.push(node);
  });
  const object = one(declarations, 'defaultGameState declaration').init;
  if (object?.type !== 'ObjectExpression') throw new Error('Unexpected defaultGameState.');
  const old = object.properties.filter(node => propName(node) === 'unifiedTravelManagerState');
  const archived = object.properties.filter(node => propName(node) === 'legacyTravelArchive');
  if (!old.length && archived.length === 1) return source;
  if (archived.length) throw new Error('Both old and new default travel fields exist; review required.');
  const field = one(old, 'legacy Unified default field');
  return edit(source, [{ start: field.start, end: field.end, text: 'legacyTravelArchive: null' }]);
}

function updateImportNormalization(source) {
  const tree = parseJS(source);
  const existing = tree.body.filter(node => node.type === 'ImportDeclaration' &&
    node.source.value === './legacyTravelMigration.js');
  const functions = [];
  walk(tree, node => {
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'normalizeImportedState') functions.push(node);
  });
  const fn = one(functions, 'normalizeImportedState function');
  const already = [];
  walk(fn.body, node => {
    if (node.type === 'CallExpression' && node.callee.name === 'migrateLegacyTravelState') already.push(node);
  });
  if (existing.length === 1 && already.length === 1 && already[0].arguments[0]?.name === 'state') return source;
  if (existing.length || already.length) throw new Error('Incomplete existing legacy migration integration.');
  const normalize = fn.body.body.filter(node => node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' && node.expression.callee.name === 'normalizeCaseSuspects' &&
    node.expression.arguments[0]?.name === 'state');
  const statement = one(normalize, 'normalizeCaseSuspects(state) in save normalization');
  return edit(source, [
    { start: 0, end: 0, text: "import { migrateLegacyTravelState } from './legacyTravelMigration.js';\n" },
    { start: statement.start, end: statement.start, text: 'migrateLegacyTravelState(state);\n  ' }
  ]);
}

async function listSources(directory = ROOT) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || /backup/i.test(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED.has(entry.name)) found.push(...await listSources(absolute));
    } else if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) {
      found.push(path.relative(ROOT, absolute).split(path.sep).join('/'));
    }
  }
  return found;
}

async function backupAndWrite(changes, remove) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const backupRoot = path.join(ROOT, 'travel-refactor-backups', stamp);
  const manifest = [];
  const originals = new Map();
  for (const file of [...changes.keys(), ...remove]) {
    const present = await exists(file);
    manifest.push({ path: file, existed: present, operation: remove.has(file) ? 'delete' : 'update' });
    originals.set(file, present ? await fs.readFile(path.join(ROOT, file)) : null);
    if (present) {
      const destination = path.join(backupRoot, file);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, originals.get(file));
    }
  }
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.writeFile(path.join(backupRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  try {
    for (const [file, content] of changes) await fs.writeFile(path.join(ROOT, file), content, 'utf8');
    for (const file of remove) await fs.unlink(path.join(ROOT, file));
  } catch (error) {
    for (const [file, original] of originals) {
      try {
        if (original === null) await fs.rm(path.join(ROOT, file), { force: true });
        else await fs.writeFile(path.join(ROOT, file), original);
      } catch (rollbackError) { console.error('Rollback failed:', file, rollbackError); }
    }
    throw error;
  }
  return path.relative(ROOT, backupRoot);
}

async function main() {
  // Plik migracji z paczki musi już być w gameState/.
  parseJS(await read(MIGRATION));
  const plans = new Map([
    ['gameSetup.js', removeUnifiedSetup],
    ['managers/TravelManager.js', updateTravelEstimate],
    ['gameState/defaultState.js', updateDefaultState],
    ['gameState/importExport.js', updateImportNormalization]
  ]);
  const changes = new Map();
  for (const [file, transform] of plans) {
    const source = await read(file);
    const updated = transform(source);
    if (source !== updated) changes.set(file, updated);
  }
  // Nie usuwamy modułu, jeżeli lokalny kod ma dodatkowych użytkowników.
  const obsolete = /\b(?:getUnifiedTravelManager|createUnifiedTravelManager|travelManagerInitialized)\b|UnifiedTravelManager\.(?:js|mjs)/;
  for (const file of await listSources()) {
    if (file === OLD_MANAGER || file === MIGRATION) continue;
    const source = changes.get(file) ?? await read(file);
    if (obsolete.test(source)) throw new Error(`Additional UnifiedTravelManager reference: ${file}. No files written.`);
    if (file !== 'gameState/defaultState.js' && /\b(?:costLedger|unifiedTravelManagerState|lastTravelData)\b/.test(source)) {
      throw new Error(`Additional legacy travel state user: ${file}. No files written.`);
    }
  }
  const remove = new Set(await exists(OLD_MANAGER) ? [OLD_MANAGER] : []);
  console.log(JSON.stringify({
    mode: WRITE ? 'write' : 'preview',
    changed: [...changes.keys()], removed: [...remove],
    untouched: ['scenes/crimeCity/CrimeCityProgressService.js', 'gameStatePersistence.js'],
    archive: 'legacyTravelArchive (history only; no charges or active ledger)'
  }, null, 2));
  if (!WRITE) { console.log('PREVIEW: add --write to apply.'); return; }
  if (!changes.size && !remove.size) { console.log('Already applied. No changes needed.'); return; }
  console.log('Backup: ' + await backupAndWrite(changes, remove));
}
main().catch(error => {
  console.error('[Travel refactor]', error);
  process.exitCode = 1;
});
