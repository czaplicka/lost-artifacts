import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parse, tokenizer } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REPAIR = process.argv.includes('--repair-known');
const SELF_TEST = process.argv.includes('--self-test');
const CATALOG = 'assets/data/dialogue/extracted.json';
const RUNTIME = 'dialogues/DialogueText.js';
const EXCLUDED = new Set([
  '.git', '.github', 'node_modules', 'tools', 'scripts', 'tests', 'test',
  'admin', 'supabase', 'dist', 'build', 'coverage', 'output',
  'manifest-backups', 'alex-dialogue-backups', 'dialogue-json-backups'
]);
const TEMPLATE = 'ui/characterCreation/CharacterCreationTemplate.js';
const DOSSIER = 'ui/characterCreation/DossierView.js';
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
const COMPARISONS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'in', 'instanceof']);
const TECHNICAL = new Set([
  'stroke', 'strokeThickness', 'fontStyle', 'fontFamily', 'fontSize',
  'color', 'backgroundColor', 'align', 'className', 'id', 'key', 'type',
  'sceneKey', 'textureKey', 'portraitKey', 'url', 'src', 'path',
  'selector', 'style', 'styles', 'css', 'html', 'innerHTML', 'outerHTML',
  'event', 'eventName', 'flag', 'flags', 'effects', 'when', 'showIf',
  'font', 'fontWeight', 'fontVariant', 'fontStretch', 'fill', 'background',
  'border', 'borderColor', 'borderStyle', 'borderWidth', 'borderRadius',
  'boxShadow', 'textShadow', 'textAlign', 'textBaseline', 'textTransform',
  'textDecoration', 'whiteSpace', 'wordBreak', 'overflowWrap', 'display',
  'position', 'overflow', 'overflowX', 'overflowY', 'cursor', 'visibility',
  'padding', 'margin', 'lineHeight', 'lineSpacing', 'shadow', 'wordWrap'
]);
const TECHNICAL_CALLS = new Set([
  'querySelector', 'querySelectorAll', 'matches', 'closest', 'setAttribute',
  'insertAdjacentHTML', 'createElement', 'getElementById',
  'setStyle', 'setTextStyle', 'setFont', 'setFontFamily', 'setFontSize',
  'setFontStyle', 'setColor', 'setBackgroundColor', 'setStroke',
  'setStrokeStyle', 'setFillStyle', 'setTexture', 'setOrigin',
  'addEventListener', 'removeEventListener', 'emit', 'on', 'once', 'off',
  'includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf'
]);
const report = {
  mode: WRITE ? 'write' : 'preview', operation: REPAIR ? 'repair-known' : 'extract-visible',
  changedFiles: [], review: [], repaired: 0, keywordRepairs: 0,
  extracted: 0, newEntries: 0, before: [], after: []
};
const posix = value => value.split(path.sep).join('/');
const literal = node => node?.type === 'Literal' && typeof node.value === 'string';
const member = node => node?.type === 'MemberExpression'
  ? node.computed ? (literal(node.property) ? node.property.value : null) : node.property.name
  : null;
const property = node => !node?.computed ? node?.key?.name ?? node?.key?.value : null;
const objectRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const hasMarkup = value => /[<>]/.test(value);

function ast(source, file, comments = []) {
  try {
    return parse(source, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true,
      locations: true, onComment: comments });
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
      if (!EXCLUDED.has(entry.name) && !/backup/i.test(entry.name)) result.push(...await filesAt(absolute));
    } else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name) && !/\.(test|spec)\.(js|mjs)$/.test(entry.name)) {
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
    // Replacing return"text" with an identifier must not create return__dialogueText.
    const before = source[edit.start - 1] ?? '';
    const after = source[edit.end] ?? '';
    let text = edit.text;
    if (/[\w$]/.test(before) && /^[\w$]/.test(text)) text = ' ' + text;
    if (/[\w$]$/.test(text) && /^[\w$]/.test(after)) text += ' ';
    source = source.slice(0, edit.start) + text + source.slice(edit.end);
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
      if (spec.type === 'ImportSpecifier' && (spec.imported.name ?? spec.imported.value) === 'dialogueText') names.add(spec.local.name);
    }
  }
  return names;
}
function tokensFor(source) {
  return [...tokenizer(source, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true, locations: true })];
}
function lexicalReaders(tokens, file) {
  // Token-based: ignore import-looking text in comments and strings.
  const names = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type.label !== 'import' || tokens[i + 1]?.type.label !== '{') continue;
    let end = i + 2;
    while (end < tokens.length && tokens[end].type.label !== '}') end++;
    if (tokens[end + 1]?.value !== 'from' || tokens[end + 2]?.value !== readerPath(file)) continue;
    for (let j = i + 2; j < end; j++) {
      if (tokens[j].value !== 'dialogueText' || (j > i + 2 && tokens[j - 1].type.label !== ',')) continue;
      names.add(tokens[j + 1]?.value === 'as' ? tokens[j + 2]?.value : 'dialogueText');
    }
  }
  return names;
}
function keywordProblems(source, file) {
  const tokens = tokensFor(source), names = lexicalReaders(tokens, file), issues = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type.label !== 'name' || tokens[i + 1]?.type.label !== '(') continue;
    for (const word of ['return', 'case', 'typeof']) {
      if (token.value.startsWith(word) && names.has(token.value.slice(word.length))) {
        issues.push({ file, line: token.loc.start.line, reason: 'glued-keyword',
          start: token.start, end: token.end, text: word + ' ' + token.value.slice(word.length) });
      }
    }
  }
  return issues;
}
function fixKeywords(source, file) {
  const issues = keywordProblems(source, file);
  report.keywordRepairs += issues.length;
  return editSource(source, issues);
}
function catalogValue(catalog, source, id) {
  const entries = Object.hasOwn(catalog.sources, source) ? catalog.sources[source] : null;
  if (!entries || !Object.hasOwn(entries, id) || typeof entries[id] !== 'string') {
    throw new Error(`Missing original literal: ${source}/${id}. No files were written.`);
  }
  return entries[id];
}
function syntaxString(node, parents) {
  const parent = parents.at(-1);
  return parents.some(p => p.type.startsWith('Import') || p.type === 'ExportSpecifier') ||
    parent?.source === node ||
    (['Property', 'MethodDefinition', 'PropertyDefinition'].includes(parent?.type) && parent.key === node) ||
    (parent?.type === 'ExpressionStatement' && parent.directive);
}
function unsafeContext(node, parents) {
  for (let i = 0; i < parents.length; i++) {
    const p = parents[i], child = i === parents.length - 1 ? node : parents[i + 1];
    if (p.type === 'BinaryExpression' && COMPARISONS.has(p.operator)) return true;
    if (p.type === 'UnaryExpression' && ['typeof', 'delete', 'void'].includes(p.operator)) return true;
    if (p.type === 'SwitchCase' && p.test === child) return true;
    if (p.type === 'SwitchStatement' && p.discriminant === child) return true;
    if (p.type === 'MemberExpression' && p.computed && p.property === child) return true;
    if (['ThrowStatement', 'TaggedTemplateExpression', 'ImportExpression'].includes(p.type)) return true;
    if (['Property', 'PropertyDefinition', 'MethodDefinition'].includes(p.type)) {
      if (p.key === child || TECHNICAL.has(property(p))) return true;
    }
    if (p.type === 'AssignmentExpression' && p.right === child) {
      if (TECHNICAL.has(member(p.left)) || p.left?.object?.property?.name === 'style') return true;
    }
    if (p.type === 'CallExpression' || p.type === 'NewExpression') {
      const name = member(p.callee);
      if (TECHNICAL_CALLS.has(name) || p.callee.object?.name === 'console') return true;
      // The fourth argument of Phaser add.text is a style object.
      if (name === 'text' && member(p.callee.object) === 'add' && p.arguments[3] === child) return true;
      if (p.callee.object?.name === 'Object' && name === 'assign' &&
          p.arguments[0]?.type === 'MemberExpression' && member(p.arguments[0]) === 'style') return true;
    }
  }
  return false;
}
function displayValue(node, parents) {
  let child = node;
  for (let i = parents.length - 1; i >= 0; i--) {
    const parent = parents[i];
    if (parent.type === 'ArrayExpression' && parent.elements.includes(child)) { child = parent; continue; }
    if (parent.type === 'ConditionalExpression' && (parent.consequent === child || parent.alternate === child)) { child = parent; continue; }
    if (parent.type !== 'CallExpression') return false;
    const name = member(parent.callee);
    if (name === 'text' && member(parent.callee.object) === 'add') return parent.arguments[2] === child;
    return ['setText', 'setTitle', 'setSubtitle'].includes(name) && parent.arguments[0] === child;
  }
  return false;
}
function cleanUnusedReader(source, file) {
  const tree = ast(source, file), names = readers(tree, file), edits = [];
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
    if (unused.length && unused.length === node.specifiers.length) edits.push({ start: node.start, end: node.end, text: '' });
  }
  return editSource(source, edits);
}
function localTemplateHelper(tree, names, file) {
  if (!KEEP_VISIBLE.has(file)) return false;
  const sourceBinding = tree.body.some(n => n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name === 'SOURCE' && literal(d.init) && d.init.value === file));
  const helper = tree.body.some(n => n.type === 'VariableDeclaration' && n.declarations.some(d =>
    d.id.name === 'text' && d.init?.type === 'ArrowFunctionExpression' && d.init.params.length === 1 &&
    d.init.params[0].type === 'Identifier' && d.init.body.type === 'CallExpression' &&
    names.has(d.init.body.callee.name) && d.init.body.arguments.length === 2 &&
    d.init.body.arguments[0].name === 'SOURCE' && d.init.body.arguments[1].name === d.init.params[0].name));
  // Already repaired templates without the old helper do not need special handling.
  return sourceBinding && helper;
}
function repairKnown(file, original, catalog) {
  const source = fixKeywords(original, file), tree = ast(source, file), names = readers(tree, file);
  const helper = localTemplateHelper(tree, names, file), edits = [];
  walk(tree, (node, parents) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
    let sourceKey, id, restore = false;
    if (names.has(node.callee.name) && node.arguments.length === 2 && node.arguments.every(literal)) {
      [sourceKey, id] = node.arguments.map(arg => arg.value);
      restore = unsafeContext(node, parents);
      if (!restore) restore = hasMarkup(catalogValue(catalog, sourceKey, id));
    } else if (helper && node.callee.name === 'text' && node.arguments.length === 1 && literal(node.arguments[0])) {
      sourceKey = file; id = node.arguments[0].value;
      restore = !KEEP_VISIBLE.get(file).has(id) || unsafeContext(node, parents) || hasMarkup(catalogValue(catalog, sourceKey, id));
    }
    if (!restore) return;
    edits.push({ start: node.start, end: node.end, text: JSON.stringify(catalogValue(catalog, sourceKey, id)) });
    return false;
  });
  report.repaired += edits.length;
  return edits.length ? cleanUnusedReader(editSource(source, edits), file) : source;
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
  const comments = [], tree = ast(source, file, comments);
  if (!tree.body.some(n => n.type === 'ImportDeclaration' || n.type.startsWith('Export'))) return source;
  const existing = readers(tree, file), identifiers = new Set();
  walk(tree, node => { if (node.type === 'Identifier') identifiers.add(node.name); });
  let reader = existing.values().next().value;
  if (!reader) {
    reader = '__dialogueText'; let n = 1;
    while (identifiers.has(reader)) reader = `__dialogueText${n++}`;
  }
  const edits = [];
  const annotated = node => comments.some(c => c.type === 'Block' && c.value.trim() === '@dialogue' &&
    c.end <= node.start && /^\s*$/.test(source.slice(c.end, node.start)));
  const lookup = value => `${reader}(${JSON.stringify(file)}, ${JSON.stringify(addText(catalog, file, value))})`;
  walk(tree, (node, parents) => {
    if (node.type === 'CallExpression' && existing.has(node.callee.name)) return false;
    if (node.type !== 'Literal' && node.type !== 'TemplateLiteral') return;
    if (node.type === 'Literal' && !literal(node)) return;
    // An annotation never overrides technical-context exclusions.
    if (syntaxString(node, parents) || unsafeContext(node, parents)) return;
    if (!displayValue(node, parents) && !annotated(node)) return;
    const values = node.type === 'Literal' ? [node.value] : node.quasis.map(q => q.value.cooked);
    if (values.some(value => typeof value !== 'string' || hasMarkup(value))) {
      report.review.push({ file, line: node.loc.start.line, reason: 'HTML/markup: extract visible leaf text manually.' });
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
function audit(file, source, catalog) {
  const glued = keywordProblems(source, file);
  const issues = glued.map(({ file, line, reason }) => ({ file, line, reason }));
  // Parse the corrected projection, so glued case/typeof do not hide other issues.
  const tree = ast(editSource(source, glued), file), names = readers(tree, file);
  walk(tree, (node, parents) => {
    if (node.type !== 'CallExpression' || !names.has(node.callee.name) ||
        node.arguments.length !== 2 || !node.arguments.every(literal)) return;
    const value = catalogValue(catalog, node.arguments[0].value, node.arguments[1].value);
    if (unsafeContext(node, parents) || hasMarkup(value)) {
      issues.push({ file, line: node.loc.start.line, reason: hasMarkup(value) ? 'catalog-markup' : 'catalog-in-technical-context' });
    }
    return false;
  });
  return issues;
}
async function writeWithBackup(changes) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const backup = path.join(ROOT, 'dialogue-json-backups', stamp), manifest = [];
  for (const [file] of changes) {
    const absolute = path.join(ROOT, file); let exists = true;
    try { await fs.access(absolute); } catch (e) { if (e.code !== 'ENOENT') throw e; exists = false; }
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
function selfTest() {
  const file = 'scenes/Test.js';
  const head = `import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';\n`;
  const catalog = { version: 1, sources: { [file]: { text: 'Hello', id: 'ready', html: '<b>Hello</b>', style: 'bold' } } };
  const call = id => `__dialogueText('${file}','${id}')`;
  for (const expression of [
    `x === ${call('id')}`, `${call('id')} !== x`, `x < ${call('id')}`,
    `switch(x){case ${call('id')}:break;}`, `typeof ${call('id')}`,
    `({stroke:${call('style')}})`, `({fontStyle:${call('style')}})`,
    `obj.innerHTML=${call('html')}`, `obj.setStyle({custom:${call('style')}})`,
    `obj.setText(${call('html')})`, `[${call('id')}].includes(x)`,
    `scene.add.text(0,0,'Title',{custom:${call('style')}})`
  ]) {
    const original = head + expression + ';';
    assert.ok(audit(file, original, catalog).length);
    const repaired = repairKnown(file, original, catalog);
    assert.equal(audit(file, repaired, catalog).length, 0);
    assert.equal(repairKnown(file, repaired, catalog), repaired);
  }
  const visible = head + `obj.setText(${call('text')});`;
  assert.equal(repairKnown(file, visible, catalog), visible);
  for (const [bad, good] of [
    [`function f(){return${call('text')}}`, `function f(){return ${call('text')}}`],
    [`function f(){return typeof${call('text')}}`, `function f(){return typeof ${call('text')}}`],
    [`switch(x){case${call('text')}:break;}`, `switch(x){case ${call('text')}:break;}`]
  ]) assert.equal(fixKeywords(head + bad, file), head + good);
  const untouched = head + `// return__dialogueText('x','y')\nconst x="return__dialogueText('x','y')";`;
  assert.equal(fixKeywords(untouched, file), untouched);
  for (const src of [
    `export function f(){return/*@dialogue*/"Hello";}`,
    `export function f(){return"Hello";}`
  ]) {
    // First is annotated; the second remains outside the visible-text allowlist.
    const out = extractVisible(file, src, structuredClone(catalog));
    ast(out, file);
    assert.ok(!out.includes('return__dialogueText'));
  }
  assert.equal(editSource('return"x"', [{start:6,end:9,text:'__dialogueText()'}]), 'return __dialogueText()');
  assert.equal(editSource('typeof"x"', [{start:6,end:9,text:'__dialogueText()'}]), 'typeof __dialogueText()');
  assert.equal(editSource('case"x":', [{start:4,end:7,text:'__dialogueText()'}]), 'case __dialogueText():');
  const styles = `export const x={stroke:/*@dialogue*/'red',fontStyle:/*@dialogue*/'bold'};`;
  assert.equal(extractVisible(file, styles, structuredClone(catalog)), styles);
  const comparison = `export const x=a===/*@dialogue*/'ready';`;
  assert.equal(extractVisible(file, comparison, structuredClone(catalog)), comparison);
  const html = `export function f(){obj.setText('<b>Hi</b>')}`;
  assert.equal(extractVisible(file, html, structuredClone(catalog)), html);
  console.log('PASS: keyword boundaries, repair, comparisons, styles, HTML, visible text, idempotence.');
}
async function main() {
  if (SELF_TEST) { selfTest(); return; }
  let catalog;
  try { catalog = JSON.parse(await fs.readFile(path.join(ROOT, CATALOG), 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT' || REPAIR) throw error;
    catalog = { version: 1, sources: Object.create(null) };
  }
  if (catalog.version !== 1 || !objectRecord(catalog.sources) || Object.values(catalog.sources).some(entries =>
      !objectRecord(entries) || Object.values(entries).some(value => typeof value !== 'string'))) {
    throw new Error('Invalid existing catalog. No files were written.');
  }
  const changes = new Map(), planned = new Map();
  const files = await filesAt();
  for (const file of files) {
    const original = await fs.readFile(path.join(ROOT, file), 'utf8');
    report.before.push(...audit(file, original, catalog));
    const updated = REPAIR ? repairKnown(file, original, catalog) : extractVisible(file, original, catalog);
    ast(updated, file);
    report.after.push(...audit(file, updated, catalog));
    planned.set(file, updated);
    if (updated !== original) { changes.set(file, updated); report.changedFiles.push(file); }
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.after.length) {
    throw new Error('Unsafe catalog calls or glued keywords remain. No files were written. Run --repair-known and inspect the report.');
  }
  if (!REPAIR && report.newEntries) changes.set(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  if (changes.has(RUNTIME)) throw new Error('Refusing to overwrite dialogue runtime.');
  if (!WRITE) { console.log('PREVIEW: no files changed. Add --write to apply.'); return; }
  if (!changes.size) { console.log('No changes needed.'); return; }
  changes.set('dialogue-migration-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('Backup: ' + await writeWithBackup(changes));
  // Re-read actual files after writing; do not report only a planned result.
  const afterWrite = [];
  for (const file of files) afterWrite.push(...audit(file, await fs.readFile(path.join(ROOT, file), 'utf8'), catalog));
  console.log(JSON.stringify({ postWriteAudit: afterWrite, remaining: afterWrite.length }, null, 2));
  if (afterWrite.length) throw new Error('Post-write audit failed. Use the backup to investigate.');
}
main().catch(error => { console.error('[Dialogue migration]', error); process.exitCode = 1; });
