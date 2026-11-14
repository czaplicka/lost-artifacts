import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const WRITE = process.argv.includes('--write');

const CATALOG_PATH = 'assets/data/dialogue/extracted.json';
const RUNTIME_PATH = 'dialogues/DialogueText.js';
const REPORT_PATH = 'dialogue-migration-report.json';

const EXCLUDED_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'tools',
  'scripts',
  'tests',
  'test',
  'admin',
  'supabase',
  'dist',
  'build',
  'coverage',
  'output',
  'manifest-backups',
  'alex-dialogue-backups',
  'dialogue-json-backups'
]);

const TEXT_FIELDS = new Set([
  'text',
  'speaker',
  'lines',
  'body',
  'subject',
  'from',
  'greeting',
  'fallback',
  'fallbackVariants',
  'choicePrompt',
  'prompt',
  'question',
  'answer',
  'answers',
  'message',
  'messages',
  'reply',
  'replies',
  'response',
  'responses',
  'title',
  'subtitle',
  'label',
  'description',
  'summary',
  'snippet',
  'brand',
  'caption',
  'tooltip',
  'hint',
  'hints',
  'fragments',
  'blocks',
  'paragraphs',
  'transcript',
  'transcripts',
  'dialogue',
  'dialog',
  'quips'
]);

const TECHNICAL_FIELDS = new Set([
  'id',
  'caseId',
  'questId',
  'topicId',
  'threadId',
  'pageId',
  'cloudId',
  'keywordId',
  'contactId',
  'dialogueId',
  'portraitKey',
  'imageKey',
  'backgroundKey',
  'textureKey',
  'cacheKey',
  'sceneKey',
  'returnScene',
  'sourceScene',
  'key',
  'url',
  'src',
  'path',
  'type',
  'mode',
  'status',
  'phase',
  'effect',
  'effects',
  'number',
  'terms',
  'flags',
  'grantFlags',
  'requiresFlags',
  'grantKeywords',
  'initialKeywords',
  'requiresKeyword',
  'requires',
  'all',
  'none',
  'fontFamily',
  'fontSize',
  'color',
  'backgroundColor',
  'align',
  'ease',
  'event',
  'eventName',
  'contentId'
]);

const DISPLAY_CALLS = new Set([
  'openHolmes',
  'showMessage',
  'showToast',
  'say',
  'setText',
  'setTitle',
  'setSubtitle',
  'finishCall'
]);

const report = {
  version: 1,
  mode: WRITE ? 'write' : 'preview',
  changedFiles: [],
  review: [],
  totals: {
    scannedModules: 0,
    changedModules: 0,
    extractedOccurrences: 0,
    newCatalogEntries: 0
  }
};

const runtimeSource = `const CATALOG_URL = new URL(
  '../assets/data/dialogue/extracted.json',
  import.meta.url
);

async function loadCatalog() {
  const response = await fetch(CATALOG_URL, {
    cache: 'no-cache'
  });

  if (!response.ok) {
    throw new Error(
      '[DialogueText] Cannot load extracted.json: HTTP ' +
      response.status
    );
  }

  const data = await response.json();

  if (
    data?.version !== 1 ||
    !data.sources ||
    typeof data.sources !== 'object' ||
    Array.isArray(data.sources)
  ) {
    throw new Error('[DialogueText] Invalid dialogue catalog.');
  }

  for (const [source, entries] of Object.entries(data.sources)) {
    if (
      !entries ||
      typeof entries !== 'object' ||
      Array.isArray(entries)
    ) {
      throw new Error(
        '[DialogueText] Invalid source section: ' + source
      );
    }

    for (const [id, value] of Object.entries(entries)) {
      if (typeof value !== 'string') {
        throw new Error(
          '[DialogueText] Expected a string: ' + source + '/' + id
        );
      }
    }

    Object.freeze(entries);
  }

  Object.freeze(data.sources);

  return Object.freeze(data);
}

const catalog = await loadCatalog();

export function dialogueText(source, id) {
  const entries = Object.hasOwn(catalog.sources, source)
    ? catalog.sources[source]
    : null;

  if (!entries || !Object.hasOwn(entries, id)) {
    throw new Error(
      '[DialogueText] Missing text: ' + source + '/' + id
    );
  }

  return entries[id];
}
`;

function posix(value) {
  return value.split(path.sep).join('/');
}

function parseSource(source, file) {
  try {
    return parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowHashBang: true,
      locations: true
    });
  } catch (error) {
    throw new Error(
      `${file}:${error.loc?.line ?? '?'}: ${error.message}`
    );
  }
}

function walk(node, visit, ancestors = []) {
  if (!node || typeof node.type !== 'string') {
    return;
  }

  if (visit(node, ancestors) === false) {
    return;
  }

  const nextAncestors = [...ancestors, node];

  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'loc' ||
      key === 'start' ||
      key === 'end'
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === 'string') {
          walk(child, visit, nextAncestors);
        }
      }
    } else if (value && typeof value.type === 'string') {
      walk(value, visit, nextAncestors);
    }
  }
}

function propertyName(node) {
  if (!node || node.computed) {
    return null;
  }

  if (node.key?.type === 'Identifier') {
    return node.key.name;
  }

  if (
    node.key?.type === 'Literal' &&
    typeof node.key.value === 'string'
  ) {
    return node.key.value;
  }

  return null;
}

function callName(node) {
  if (
    node.type !== 'CallExpression' &&
    node.type !== 'NewExpression'
  ) {
    return null;
  }

  const callee = node.callee;

  if (callee?.type === 'Identifier') {
    return callee.name;
  }

  if (
    callee?.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property?.type === 'Identifier'
  ) {
    return callee.property.name;
  }

  return null;
}

function isTechnicalContext(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];

    if (
      ancestor.type === 'Property' ||
      ancestor.type === 'PropertyDefinition'
    ) {
      const name = propertyName(ancestor);

      if (TECHNICAL_FIELDS.has(name)) {
        return true;
      }

      if (TEXT_FIELDS.has(name)) {
        return false;
      }
    }
  }

  return false;
}

function isDisplayContext(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];

    if (
      ancestor.type === 'Property' ||
      ancestor.type === 'PropertyDefinition'
    ) {
      const name = propertyName(ancestor);

      if (TECHNICAL_FIELDS.has(name)) {
        return false;
      }

      if (TEXT_FIELDS.has(name)) {
        return true;
      }
    }

    const name = callName(ancestor);

    if (DISPLAY_CALLS.has(name)) {
      return true;
    }

    // Phaser: scene.add.text(x, y, text, style).
    if (
      name === 'text' &&
      ancestor.callee?.type === 'MemberExpression'
    ) {
      const object = ancestor.callee.object;

      if (
        object?.type === 'MemberExpression' &&
        !object.computed &&
        object.property?.name === 'add'
      ) {
        return true;
      }
    }
  }

  return false;
}

function isDiagnosticContext(ancestors) {
  return ancestors.some(node => {
    if (node.type === 'ThrowStatement') {
      return true;
    }

    if (node.type !== 'CallExpression') {
      return false;
    }

    const callee = node.callee;

    return (
      callee?.type === 'MemberExpression' &&
      callee.object?.type === 'Identifier' &&
      callee.object.name === 'console'
    );
  });
}

function looksLikeText(value) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    !/[A-Za-zÀ-ž]/u.test(value)
  ) {
    return false;
  }

  if (
    /^(https?:|data:|blob:)/i.test(value) ||
    /^[./]*[A-Za-z0-9_./-]+\.(js|mjs|json|png|jpg|jpeg|webp|mp3|ogg|wav)$/i.test(
      value
    )
  ) {
    return false;
  }

  return (
    /\s/.test(value) ||
    /[.!?…]/u.test(value) ||
    /^[A-Z][a-z]{2,}$/.test(value) ||
    /^(yes|no|okay|ok|hello|goodbye|thanks)$/i.test(value)
  );
}

function shouldExtract(value, ancestors) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    isTechnicalContext(ancestors) ||
    isDiagnosticContext(ancestors)
  ) {
    return false;
  }

  return isDisplayContext(ancestors) || looksLikeText(value);
}

function isSyntaxString(node, parent) {
  if (!parent) {
    return false;
  }

  if (
    (
      parent.type === 'ImportDeclaration' ||
      parent.type === 'ExportNamedDeclaration' ||
      parent.type === 'ExportAllDeclaration'
    ) &&
    parent.source === node
  ) {
    return true;
  }

  if (
    parent.type === 'ImportSpecifier' ||
    parent.type === 'ExportSpecifier' ||
    parent.type === 'ImportAttribute'
  ) {
    return true;
  }

  if (
    parent.type === 'ExpressionStatement' &&
    parent.directive
  ) {
    return true;
  }

  return (
    (
      parent.type === 'Property' ||
      parent.type === 'MethodDefinition' ||
      parent.type === 'PropertyDefinition'
    ) &&
    parent.key === node &&
    !parent.computed
  );
}

async function listSources(directory = ROOT) {
  const result = [];

  for (const entry of await fs.readdir(directory, {
    withFileTypes: true
  })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (
        EXCLUDED_DIRS.has(entry.name) ||
        /backup/i.test(entry.name)
      ) {
        continue;
      }

      result.push(...await listSources(absolute));
    } else if (
      entry.isFile() &&
      /\.(js|mjs)$/.test(entry.name) &&
      !/\.(test|spec)\.(js|mjs)$/.test(entry.name)
    ) {
      const relative = posix(path.relative(ROOT, absolute));

      if (relative !== RUNTIME_PATH) {
        result.push(relative);
      }
    }
  }

  return result.sort();
}

async function exists(relative) {
  try {
    await fs.access(path.join(ROOT, relative));
    return true;
  } catch {
    return false;
  }
}

async function loadCatalog() {
  if (!await exists(CATALOG_PATH)) {
    return {
      version: 1,
      sources: {}
    };
  }

  const data = JSON.parse(
    await fs.readFile(path.join(ROOT, CATALOG_PATH), 'utf8')
  );

  if (
    data?.version !== 1 ||
    !data.sources ||
    typeof data.sources !== 'object' ||
    Array.isArray(data.sources)
  ) {
    throw new Error(
      `Existing ${CATALOG_PATH} has an unsupported format.`
    );
  }

  for (const entries of Object.values(data.sources)) {
    if (
      !entries ||
      typeof entries !== 'object' ||
      Array.isArray(entries) ||
      Object.values(entries).some(value => typeof value !== 'string')
    ) {
      throw new Error(
        `Existing ${CATALOG_PATH} contains invalid entries.`
      );
    }
  }

  return data;
}

function textId(value) {
  return 't_' + crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 20);
}

function addText(catalog, file, value) {
  catalog.sources[file] ??= {};

  const entries = catalog.sources[file];
  const baseId = textId(value);

  let id = baseId;
  let suffix = 1;

  while (
    Object.hasOwn(entries, id) &&
    entries[id] !== value
  ) {
    id = `${baseId}_${suffix++}`;
  }

  if (!Object.hasOwn(entries, id)) {
    entries[id] = value;
    report.totals.newCatalogEntries++;
  }

  return id;
}

function helperImportPath(file) {
  let relative = posix(
    path.relative(
      path.dirname(file),
      RUNTIME_PATH
    )
  );

  if (!relative.startsWith('.')) {
    relative = './' + relative;
  }

  return relative;
}

function findReaderAlias(tree, file) {
  const importPath = helperImportPath(file);

  for (const node of tree.body) {
    if (
      node.type !== 'ImportDeclaration' ||
      node.source.value !== importPath
    ) {
      continue;
    }

    const specifier = node.specifiers.find(item => (
      item.type === 'ImportSpecifier' &&
      (
        item.imported.name === 'dialogueText' ||
        item.imported.value === 'dialogueText'
      )
    ));

    if (specifier) {
      return {
        name: specifier.local.name,
        existing: true
      };
    }
  }

  const identifiers = new Set();

  walk(tree, node => {
    if (node.type === 'Identifier') {
      identifiers.add(node.name);
    }
  });

  let name = '__dialogueText';
  let suffix = 1;

  while (identifiers.has(name)) {
    name = `__dialogueText${suffix++}`;
  }

  return {
    name,
    existing: false
  };
}

function applyEdits(source, edits) {
  const ascending = [...edits].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );

  for (let i = 1; i < ascending.length; i++) {
    if (ascending[i].start < ascending[i - 1].end) {
      throw new Error('Overlapping migration edits detected.');
    }
  }

  let result = source;

  for (const edit of ascending.reverse()) {
    result =
      result.slice(0, edit.start) +
      edit.text +
      result.slice(edit.end);
  }

  return result;
}

function sourceExcerpt(source, node) {
  return source
    .slice(node.start, node.end)
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

function migrateModule(file, source, catalog) {
  const tree = parseSource(source, file);

  const moduleFile = tree.body.some(node => (
    node.type === 'ImportDeclaration' ||
    node.type.startsWith('Export')
  ));

  if (!moduleFile) {
    report.review.push({
      file,
      reason: 'Classic script without import/export; left unchanged.'
    });

    return null;
  }

  report.totals.scannedModules++;

  const reader = findReaderAlias(tree, file);
  const edits = [];

  function lookup(value) {
    const id = addText(catalog, file, value);

    return (
      `${reader.name}(` +
      `${JSON.stringify(file)}, ${JSON.stringify(id)}` +
      ')'
    );
  }

  walk(tree, (node, ancestors) => {
    const parent = ancestors[ancestors.length - 1];

    // Nie migruj ponownie argumentów już wygenerowanych odczytów.
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === reader.name
    ) {
      return false;
    }

    if (
      node.type === 'Literal' &&
      typeof node.value === 'string'
    ) {
      if (
        !isSyntaxString(node, parent) &&
        shouldExtract(node.value, ancestors)
      ) {
        edits.push({
          start: node.start,
          end: node.end,
          text: lookup(node.value)
        });
      }

      return;
    }

    if (node.type !== 'TemplateLiteral') {
      return;
    }

    const tagged = (
      parent?.type === 'TaggedTemplateExpression' &&
      parent.quasi === node
    );

    const relevant = node.quasis.some(quasi => (
      shouldExtract(
        quasi.value.cooked ?? quasi.value.raw,
        ancestors
      )
    ));

    if (!relevant) {
      return;
    }

    if (tagged) {
      report.review.push({
        file,
        line: node.loc.start.line,
        reason: 'Tagged template: requires manual review.',
        excerpt: sourceExcerpt(source, node)
      });

      return;
    }

    // Przenosimy wyłącznie fragmenty tekstu.
    // Oryginalne ${wyrażenia} pozostają w JS.
    for (const quasi of node.quasis) {
      const value = quasi.value.cooked;

      if (typeof value !== 'string' || value.length === 0) {
        continue;
      }

      edits.push({
        start: quasi.start,
        end: quasi.end,
        text: '${' + lookup(value) + '}'
      });
    }
  });

  if (!edits.length) {
    return null;
  }

  let migrated = applyEdits(source, edits);

  if (!reader.existing) {
    const statement =
      `import { dialogueText as ${reader.name} } from ` +
      `${JSON.stringify(helperImportPath(file))};\n`;

    if (migrated.startsWith('#!')) {
      const newline = migrated.indexOf('\n');

      if (newline === -1) {
        throw new Error(`Cannot insert import into ${file}.`);
      }

      migrated =
        migrated.slice(0, newline + 1) +
        statement +
        migrated.slice(newline + 1);
    } else {
      migrated = statement + migrated;
    }
  }

  // Błąd składni zatrzyma cały przebieg przed zapisem.
  parseSource(migrated, file);

  report.changedFiles.push({
    file,
    extractedOccurrences: edits.length,
    catalogSection: file
  });

  report.totals.changedModules++;
  report.totals.extractedOccurrences += edits.length;

  return migrated;
}

function orderedCatalog(catalog) {
  const sources = {};

  for (const file of Object.keys(catalog.sources).sort()) {
    sources[file] = Object.fromEntries(
      Object.entries(catalog.sources[file]).sort(
        ([a], [b]) => a.localeCompare(b)
      )
    );
  }

  return {
    version: 1,
    sources
  };
}

async function writeWithBackup(changes) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const backupRoot = path.join(
    ROOT,
    'dialogue-json-backups',
    stamp
  );

  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    files: []
  };

  // Najpierw kompletna kopia, dopiero potem zmiany.
  for (const relative of changes.keys()) {
    const absolute = path.join(ROOT, relative);
    const existed = await exists(relative);

    manifest.files.push({
      path: relative,
      existed
    });

    if (existed) {
      const backup = path.join(backupRoot, relative);

      await fs.mkdir(path.dirname(backup), {
        recursive: true
      });

      await fs.copyFile(absolute, backup);
    }
  }

  await fs.mkdir(backupRoot, {
    recursive: true
  });

  await fs.writeFile(
    path.join(backupRoot, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  for (const [relative, content] of changes) {
    const absolute = path.join(ROOT, relative);

    await fs.mkdir(path.dirname(absolute), {
      recursive: true
    });

    await fs.writeFile(absolute, content, 'utf8');
  }

  return posix(path.relative(ROOT, backupRoot));
}

async function main() {
  const catalog = await loadCatalog();
  const files = await listSources();

  const changes = new Map();

  for (const file of files) {
    const source = await fs.readFile(
      path.join(ROOT, file),
      'utf8'
    );

    const migrated = migrateModule(file, source, catalog);

    if (migrated !== null) {
      changes.set(file, migrated);
    }
  }

  const finalCatalog = orderedCatalog(catalog);

  parseSource(runtimeSource, RUNTIME_PATH);

  const catalogContent =
    JSON.stringify(finalCatalog, null, 2) + '\n';

  // Sprawdzenie, czy wynik jest poprawnym JSON-em.
  JSON.parse(catalogContent);

  if (changes.size > 0) {
    changes.set(CATALOG_PATH, catalogContent);
    changes.set(RUNTIME_PATH, runtimeSource);
  }

  const reportContent =
    JSON.stringify(report, null, 2) + '\n';

  if (!WRITE) {
    console.log('PREVIEW — no game files changed.');
    console.log(JSON.stringify(report, null, 2));
    console.log(
      '\nTo apply: node tools/extract-dialogues.mjs --write'
    );

    return;
  }

  changes.set(REPORT_PATH, reportContent);

  const backup = await writeWithBackup(changes);

  console.log(
    `Updated modules: ${report.totals.changedModules}`
  );

  console.log(
    `Extracted occurrences: ${report.totals.extractedOccurrences}`
  );

  console.log(
    `New JSON entries: ${report.totals.newCatalogEntries}`
  );

  console.log(
    `Review items: ${report.review.length}`
  );

  console.log(`Backup: ${backup}`);
  console.log(`Report: ${REPORT_PATH}`);

  if (report.totals.changedModules > 0) {
    console.log(`Dialogue catalog: ${CATALOG_PATH}`);
  }
}

main().catch(error => {
  console.error('[Dialogue migration]', error);
  process.exitCode = 1;
});