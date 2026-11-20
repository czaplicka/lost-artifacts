import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REPAIR = process.argv.includes('--repair-known');
const CATALOG = 'assets/data/dialogue/extracted.json';
const RUNTIME = 'dialogues/DialogueText.js';
const EXCLUDED = new Set([
  '.git', '.github', 'node_modules', 'tools', 'scripts', 'tests', 'test',
  'admin', 'supabase', 'dist', 'build', 'coverage', 'output',
  'manifest-backups', 'alex-dialogue-backups', 'dialogue-json-backups'
]);
const TEMPLATE = 'ui/characterCreation/CharacterCreationTemplate.js';
const DOSSIER = 'ui/characterCreation/DossierView.js';
const SKETCH = 'ui/warrant/WarrantSketch.js';
const CHARACTER = 'scenes/CharacterCreationScene.js';
const KEEP_VISIBLE = new Map([
  [TEMPLATE, new Set([
    't_bf176ca19ce9488e44b0', 't_5d593ea2e52a52ec9500',
    't_fdc8132ab0482f7e188d', 't_468fa2488adbaa75e25d',
    't_74445f140db83027f3f5', 't_0ee6d25a70ffefd83541',
    't_6b7b806bd4d818b98a18'
  ])],
  [DOSSIER, new Set([
    't_803b7246d0b19ce1283c', 't_fbc956c208e6e60b20c1',
    't_b19e02e9502bbe5ac59d', 't_d696a35bdd1883da07a8',
    't_7ca366b05bf258c6d43c', 't_3907fa7f80722a6fc58c',
    't_f3ba306d86066cb50bef'
  ])]
]);
const TECHNICAL = new Set([
  'stroke', 'strokeThickness', 'fontStyle', 'fontFamily', 'fontSize',
  'color', 'backgroundColor', 'align', 'className', 'id', 'key', 'type',
  'sceneKey', 'textureKey', 'portraitKey', 'url', 'src', 'path',
  'selector', 'style', 'styles', 'css', 'html', 'innerHTML',
  'event', 'eventName', 'flag', 'flags', 'effects', 'when', 'showIf'
]);
const report = {
  mode: WRITE ? 'write' : 'preview',
  operation: REPAIR ? 'repair-known' : 'extract-visible',
  changedFiles: [], review: [], repaired: 0, extracted: 0, newEntries: 0
};
const posix = value => value.split(path.sep).join('/');
const literal = node => node?.type === 'Literal' && typeof node.value === 'string';
const member = node => node?.type === 'MemberExpression' && !node.computed
  ? node.property.name : null;
const property = node => !node.computed
  ? node.key?.name ?? node.key?.value : null;
const objectRecord = value => value && typeof value === 'object' && !Array.isArray(value);

function ast(source, file, comments = []) {
  try {
    return parse(source, {
      ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true,
      locations: true, onComment: comments
    });
  } catch (error) {
    throw new Error(`${file}:${error.loc?.line ?? '?'}: ${error.message}`);
  }
}

function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  if (visit(node, parents) === false) return;
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === 'string') walk(child, visit, [...parents, node]);
    }
  }
}

async function filesAt(directory = ROOT) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED.has(entry.name) && !/backup/i.test(entry.name)) {
        result.push(...await filesAt(absolute));
      }
    } else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name) &&
      !/\.(test|spec)\.(js|mjs)$/.test(entry.name)) {
      const file = posix(path.relative(ROOT, absolute));
      if (file !== RUNTIME) result.push(file);
    }
  }
  return result.sort();
}

function editSource(source, edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) throw new Error('Overlapping edits.');
  }
  for (const edit of sorted.reverse()) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}

function readerPath(file) {
  const relative = posix(path.relative(path.dirname(file), RUNTIME));
  return relative.startsWith('.') ? relative : './' + relative;
}

function readers(tree, file) {
  const names = new Set();
  for (const node of tree.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== readerPath(file)) continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier' &&
          (spec.imported.name ?? spec.imported.value) === 'dialogueText') {
        names.add(spec.local.name);
      }
    }
  }
  return names;
}

function catalogValue(catalog, source, id) {
  const entries = Object.hasOwn(catalog.sources, source) ? catalog.sources[source] : null;
  if (!entries || !Object.hasOwn(entries, id) || typeof entries[id] !== 'string') {
    throw new Error(`Missing original literal: ${source}/${id}. No files were written.`);
  }
  return entries[id];
}

function cleanUnusedReader(source, file) {
  const tree = ast(source, file);
  const names = readers(tree, file);
  const edits = [];
  for (const node of tree.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== readerPath(file)) continue;
    const unused = node.specifiers.filter(spec => names.has(spec.local.name)).filter(spec => {
      let used = false;
      walk(tree, candidate => {
        if (candidate.type === 'ImportDeclaration') return false;
        if (candidate.type === 'Identifier' && candidate.name === spec.local.name) used = true;
      });
      return !used;
    });
    // Nie przebudowujemy importów z innymi eksportami.
    if (unused.length && unused.length === node.specifiers.length) {
      edits.push({ start: node.start, end: node.end, text: '' });
    }
  }
  return editSource(source, edits);
}

function repairKnown(file, source, catalog) {
  const drive = file === 'scenes/DriveScene.js' || file.startsWith('scenes/drive/');
  if (!drive && ![TEMPLATE, DOSSIER, SKETCH, CHARACTER].includes(file)) return source;
  const tree = ast(source, file);
  const names = readers(tree, file);
  const localTemplate = KEEP_VISIBLE.has(file);

  if (localTemplate) {
    const sourceBinding = tree.body.some(node => node.type === 'VariableDeclaration' &&
      node.declarations.some(d => d.id.name === 'SOURCE' && literal(d.init) && d.init.value === file));
    const helperBinding = tree.body.some(node => node.type === 'VariableDeclaration' &&
      node.declarations.some(d => d.id.name === 'text' &&
        d.init?.type === 'ArrowFunctionExpression' && d.init.params.length === 1 &&
        d.init.params[0].type === 'Identifier' && d.init.body.type === 'CallExpression' &&
        names.has(d.init.body.callee.name) && d.init.body.arguments.length === 2 &&
        d.init.body.arguments[0].name === 'SOURCE' &&
        d.init.body.arguments[1].name === d.init.params[0].name));
    if (!sourceBinding || !helperBinding) {
      throw new Error(`${file}: unexpected text/SOURCE binding. Manual review required.`);
    }
  }

  const edits = [];
  walk(tree, (node, parents) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
    const parent = parents.at(-1);
    let sourceKey, id, restore = false;
    if (names.has(node.callee.name) && node.arguments.length === 2 && node.arguments.every(literal)) {
      [sourceKey, id] = node.arguments.map(arg => arg.value);
      restore = drive && parent?.type === 'Property' && parent.value === node &&
        ['stroke', 'fontStyle'].includes(property(parent));
      restore ||= file === SKETCH && parent?.type === 'BinaryExpression' &&
        ['===', '!==', '==', '!='].includes(parent.operator) &&
        (parent.left.name === 'feature' || parent.right.name === 'feature');
      restore ||= file === CHARACTER && parent?.type === 'CallExpression' &&
        member(parent.callee) === 'querySelector' && parent.arguments[0] === node;
    } else if (localTemplate && node.callee.name === 'text' &&
      node.arguments.length === 1 && literal(node.arguments[0])) {
      sourceKey = file;
      id = node.arguments[0].value;
      restore = !KEEP_VISIBLE.get(file).has(id);
      if (!restore && /[<>]/.test(catalogValue(catalog, sourceKey, id))) {
        throw new Error(`${file}/${id}: visible-text allowlist contains HTML.`);
      }
    }
    if (!restore) return;
    edits.push({ start: node.start, end: node.end,
      text: JSON.stringify(catalogValue(catalog, sourceKey, id)) });
    return false;
  });
  report.repaired += edits.length;
  return edits.length ? cleanUnusedReader(editSource(source, edits), file) : source;
}

function syntaxString(node, parents) {
  const parent = parents.at(-1);
  return parents.some(p => p.type.startsWith('Import') || p.type === 'ExportSpecifier') ||
    (parent?.source === node) ||
    (['Property', 'MethodDefinition', 'PropertyDefinition'].includes(parent?.type) && parent.key === node) ||
    (parent?.type === 'ExpressionStatement' && parent.directive);
}

function displayValue(node, parents) {
  // Wyłącznie bezpośredni argument tekstowy. Nigdy cały poddrzewo add.text().
  let child = node;
  for (let i = parents.length - 1; i >= 0; i--) {
    const parent = parents[i];
    if (parent.type === 'ArrayExpression' && parent.elements.includes(child)) {
      child = parent; continue;
    }
    if (parent.type === 'ConditionalExpression' &&
        (parent.consequent === child || parent.alternate === child)) {
      child = parent; continue;
    }
    if (parent.type !== 'CallExpression') return false;
    const name = member(parent.callee);
    const object = parent.callee.object;
    if (name === 'text' && member(object) === 'add') return parent.arguments[2] === child;
    return ['setText', 'setTitle', 'setSubtitle'].includes(name) &&
      parent.arguments[0] === child;
  }
  return false;
}

function blocked(parents) {
  return parents.some(node =>
    node.type === 'ThrowStatement' ||
    node.type === 'TaggedTemplateExpression' ||
    ((node.type === 'Property' || node.type === 'PropertyDefinition') && TECHNICAL.has(property(node))) ||
    (node.type === 'CallExpression' &&
      (['querySelector', 'querySelectorAll', 'matches', 'closest', 'setAttribute'].includes(member(node.callee)) ||
       node.callee.object?.name === 'console'))
  );
}

function addText(catalog, file, value) {
  if (!Object.hasOwn(catalog.sources, file)) catalog.sources[file] = Object.create(null);
  const entries = catalog.sources[file];
  const base = 't_' + crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
  let id = base, suffix = 1;
  while (Object.hasOwn(entries, id) && entries[id] !== value) id = `${base}_${suffix++}`;
  if (!Object.hasOwn(entries, id)) { entries[id] = value; report.newEntries++; }
  return id;
}

function extractVisible(file, source, catalog) {
  const comments = [];
  const tree = ast(source, file, comments);
  if (!tree.body.some(node => node.type === 'ImportDeclaration' || node.type.startsWith('Export'))) return source;
  const existing = readers(tree, file);
  const identifiers = new Set();
  walk(tree, node => { if (node.type === 'Identifier') identifiers.add(node.name); });
  let reader = existing.values().next().value;
  if (!reader) {
    reader = '__dialogueText';
    let n = 1;
    while (identifiers.has(reader)) reader = `__dialogueText${n++}`;
  }
  const edits = [];
  const annotated = node => comments.some(c => c.type === 'Block' &&
    c.value.trim() === '@dialogue' && c.end <= node.start &&
    /^\s*$/.test(source.slice(c.end, node.start)));
  const lookup = value => `${reader}(${JSON.stringify(file)}, ${JSON.stringify(addText(catalog, file, value))})`;

  walk(tree, (node, parents) => {
    if (node.type === 'CallExpression' && existing.has(node.callee.name)) return false;
    if (node.type !== 'Literal' && node.type !== 'TemplateLiteral') return;
    if (node.type === 'Literal' && !literal(node)) return;
    if (syntaxString(node, parents) || blocked(parents)) return;
    if (!displayValue(node, parents) && !annotated(node)) return;
    const values = node.type === 'Literal' ? [node.value] : node.quasis.map(q => q.value.cooked);
    if (values.some(value => typeof value !== 'string' || /[<>]/.test(value))) {
      report.review.push({ file, line: node.loc.start.line,
        reason: 'HTML/markup or unsupported template: keep structure in JS; mark visible leaf text manually.' });
      return false;
    }
    if (node.type === 'Literal') {
      if (!node.value.trim()) return;
      edits.push({ start: node.start, end: node.end, text: lookup(node.value) });
    } else {
      for (const quasi of node.quasis) {
        if (!quasi.value.cooked.trim()) continue;
        edits.push({ start: quasi.start, end: quasi.end, text: '${' + lookup(quasi.value.cooked) + '}' });
      }
    }
    // Nie ekstraktujemy literałów technicznych z ${wyrażeń}.
    return false;
  });
  if (!edits.length) return source;
  report.extracted += edits.length;
  let result = editSource(source, edits);
  if (!existing.has(reader)) {
    const statement = `import { dialogueText as ${reader} } from ${JSON.stringify(readerPath(file))};\n`;
    const insert = source.startsWith('#!') ? result.indexOf('\n') + 1 : 0;
    if (source.startsWith('#!') && insert === 0) throw new Error(`Invalid hashbang in ${file}.`);
    result = result.slice(0, insert) + statement + result.slice(insert);
  }
  return result;
}

async function writeWithBackup(changes) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const backup = path.join(ROOT, 'dialogue-json-backups', stamp);
  const manifest = [];
  // Wszystkie pliki najpierw odczytane, sprawdzone i skopiowane.
  for (const [file] of changes) {
    const absolute = path.join(ROOT, file);
    let exists = true;
    try { await fs.access(absolute); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      exists = false;
    }
    manifest.push({ path: file, existed: exists });
    if (exists) {
      await fs.mkdir(path.dirname(path.join(backup, file)), { recursive: true });
      await fs.copyFile(absolute, path.join(backup, file));
    }
  }
  await fs.mkdir(backup, { recursive: true });
  await fs.writeFile(path.join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const [file, content] of changes) {
    await fs.mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
    await fs.writeFile(path.join(ROOT, file), content, 'utf8');
  }
  return posix(path.relative(ROOT, backup));
}

async function main() {
  let catalog;
  try { catalog = JSON.parse(await fs.readFile(path.join(ROOT, CATALOG), 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT' || REPAIR) throw error;
    catalog = { version: 1, sources: Object.create(null) };
  }
  if (catalog.version !== 1 || !objectRecord(catalog.sources) ||
      Object.values(catalog.sources).some(entries => !objectRecord(entries) ||
        Object.values(entries).some(value => typeof value !== 'string'))) {
    throw new Error('Invalid existing catalog. No files were written.');
  }
  const changes = new Map();
  for (const file of await filesAt()) {
    const original = await fs.readFile(path.join(ROOT, file), 'utf8');
    const updated = REPAIR ? repairKnown(file, original, catalog) : extractVisible(file, original, catalog);
    if (updated !== original) {
      ast(updated, file);
      changes.set(file, updated);
      report.changedFiles.push(file);
    }
  }
  // Naprawa zachowuje katalog: stare wpisy mogą mieć innych użytkowników.
  // Ekstraktor NIGDY nie zapisuje DialogueText.js.
  if (!REPAIR && report.newEntries) changes.set(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  if (changes.has(RUNTIME)) throw new Error('Refusing to overwrite dialogue runtime.');
  console.log(JSON.stringify(report, null, 2));
  if (!WRITE) {
    console.log('PREVIEW: no files changed. Add --write to apply.');
    return;
  }
  if (!changes.size) { console.log('No changes needed.'); return; }
  changes.set('dialogue-migration-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('Backup: ' + await writeWithBackup(changes));
}

main().catch(error => {
  console.error('[Dialogue migration]', error);
  process.exitCode = 1;
});
