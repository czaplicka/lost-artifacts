#!/usr/bin/env node
/**
 * check-imports.mjs — weryfikacja importów ES modułów (bez zależności).
 *
 * Wykrywa:
 *   MISSING_FILE        plik z importu nie istnieje (+ podpowiedź, gdzie leży teraz)
 *   CASE_MISMATCH       ścieżka różni się wielkością liter od pliku na dysku
 *                       (działa na Windows, wywala się na Linux/Netlify/GitHub Pages)
 *   DUPLICATE_MODULE    ten sam plik importowany pod różnymi zapisami wielkości liter
 *                       (przeglądarka ładuje go DWA razy → dwie instancje modułu)
 *   MISSING_EXTENSION   import bez ".js" (przeglądarka bez bundlera tego nie rozwiąże)
 *   DIRECTORY_IMPORT    import katalogu zamiast pliku (np. '../suspects')
 *   MISSING_EXPORT      importowana nazwa nie jest eksportowana przez docelowy plik
 *   HTML_MISSING        brakujący <script src> / <link href> w plikach .html
 *   BARE_SPECIFIER      import typu 'phaser' (ostrzeżenie, jeśli brak importmap)
 *
 * Użycie (z katalogu głównego projektu):
 *   node check-imports.mjs
 *   node check-imports.mjs --orphans          # dodatkowo pliki nieosiągalne z punktów wejścia
 *   node check-imports.mjs --fix              # naprawia jednoznaczne przypadki (zrób commit przed!)
 *   node check-imports.mjs --json > raport.json
 *   node check-imports.mjs --root C:\ścieżka\do\projektu --ignore legacy,tmp
 *
 * Kod wyjścia: 1 gdy są błędy (z --strict także ostrzeżenia), inaczej 0.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────

const HELP = `
check-imports.mjs — sprawdza względne importy ES modułów

Opcje:
  --root <katalog>   katalog projektu (domyślnie: bieżący)
  --orphans          pokaż pliki .js nieosiągalne z index.html / main.js
  --fix              zastosuj jednoznaczne poprawki (zmienia pliki!)
  --no-exports       pomiń sprawdzanie nazw importów/eksportów
  --strict           ostrzeżenia też dają kod wyjścia 1
  --json             wynik jako JSON
  --ignore a,b       dodatkowe katalogi do pominięcia
  -h, --help         ta pomoc
`;

const argv = process.argv.slice(2);
const flags = {
  json: false,
  exports: true,
  orphans: false,
  fix: false,
  strict: false,
  help: false
};
const extraIgnore = [];
let rootArg = null;

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];

  if (arg === '--json') flags.json = true;
  else if (arg === '--no-exports') flags.exports = false;
  else if (arg === '--orphans') flags.orphans = true;
  else if (arg === '--fix') flags.fix = true;
  else if (arg === '--strict') flags.strict = true;
  else if (arg === '-h' || arg === '--help') flags.help = true;
  else if (arg === '--root') rootArg = argv[(i += 1)];
  else if (arg === '--ignore') {
    extraIgnore.push(
      ...String(argv[(i += 1)] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );
  } else if (!arg.startsWith('-')) rootArg = arg;
  else {
    console.error(`Nieznana opcja: ${arg}\n${HELP}`);
    process.exit(2);
  }
}

if (flags.help) {
  console.log(HELP);
  process.exit(0);
}

const ROOT = path.resolve(rootArg ?? process.cwd());

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Katalog nie istnieje: ${ROOT}`);
  process.exit(2);
}

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'assets',
  'out',
  ...extraIgnore
]);

const SELF = path.resolve(process.argv[1] || '');

// ──────────────────────────────────────────────────────────────
// Kolory
// ──────────────────────────────────────────────────────────────

const useColor =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  !flags.json;

const paint = (code) => (text) =>
  useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text);

const red = paint('31');
const yellow = paint('33');
const green = paint('32');
const cyan = paint('36');
const dim = paint('2');
const bold = paint('1');

// ──────────────────────────────────────────────────────────────
// System plików (z rozróżnianiem wielkości liter niezależnie od OS)
// ──────────────────────────────────────────────────────────────

const dirCache = new Map();

function listDir(dir) {
  if (!dirCache.has(dir)) {
    try {
      dirCache.set(dir, fs.readdirSync(dir, { withFileTypes: true }));
    } catch {
      dirCache.set(dir, null);
    }
  }

  return dirCache.get(dir);
}

/**
 * Rozwiązuje ścieżkę segment po segmencie z dokładnym dopasowaniem
 * wielkości liter. Zwraca informację, czy trzeba było użyć dopasowania
 * bez rozróżniania wielkości (czyli czy zapis w kodzie jest błędny).
 */
function resolveExact(absPath) {
  const rel = path.relative(ROOT, absPath);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    if (!fs.existsSync(absPath)) {
      return { exists: false };
    }

    return {
      exists: true,
      exactPath: absPath,
      caseMismatch: false,
      isDir: fs.statSync(absPath).isDirectory()
    };
  }

  let current = ROOT;
  let caseMismatch = false;

  for (const part of rel.split(path.sep).filter(Boolean)) {
    const entries = listDir(current);

    if (!entries) {
      return { exists: false };
    }

    let found = entries.find((entry) => entry.name === part);

    if (!found) {
      found = entries.find(
        (entry) => entry.name.toLowerCase() === part.toLowerCase()
      );

      if (found) {
        caseMismatch = true;
      }
    }

    if (!found) {
      return { exists: false };
    }

    current = path.join(current, found.name);
  }

  return {
    exists: true,
    exactPath: current,
    caseMismatch,
    isDir: fs.statSync(current).isDirectory()
  };
}

function walk(dir, out) {
  const entries = listDir(dir);

  if (!entries) {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) {
        continue;
      }

      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name));
    }
  }
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

function toSpecifier(fromFile, targetAbs) {
  let spec = path
    .relative(path.dirname(fromFile), targetAbs)
    .split(path.sep)
    .join('/');

  if (!spec.startsWith('.')) {
    spec = `./${spec}`;
  }

  return spec;
}

// ──────────────────────────────────────────────────────────────
// Skanowanie źródeł
// ──────────────────────────────────────────────────────────────

/**
 * Zamienia komentarze na spacje (zachowując numery linii i indeksy)
 * oraz zapamiętuje zakresy literałów tekstowych, żeby ignorować
 * "importy" wypisane wewnątrz stringów.
 */
function stripSource(src) {
  let out = '';
  const spans = [];
  let state = 'code';
  let quote = '';
  let spanStart = 0;
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];

    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        out += '  ';
        i += 2;
      } else if (c === '/' && d === '*') {
        state = 'block';
        out += '  ';
        i += 2;
      } else if (c === "'" || c === '"' || c === '`') {
        state = 'string';
        quote = c;
        spanStart = i;
        out += c;
        i += 1;
      } else {
        out += c;
        i += 1;
      }

      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      } else {
        out += ' ';
      }

      i += 1;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && d === '/') {
        state = 'code';
        out += '  ';
        i += 2;
      } else {
        out += c === '\n' ? '\n' : ' ';
        i += 1;
      }

      continue;
    }

    // state === 'string'
    if (c === '\\') {
      out += c + (d ?? '');
      i += 2;
      continue;
    }

    if (c === quote) {
      spans.push([spanStart, i]);
      state = 'code';
      out += c;
      i += 1;
      continue;
    }

    // zabezpieczenie przed regexem z apostrofem: nie dłużej niż do końca linii
    if (quote !== '`' && c === '\n') {
      state = 'code';
      out += c;
      i += 1;
      continue;
    }

    out += c;
    i += 1;
  }

  return { code: out, spans };
}

function isInsideSpan(spans, index) {
  let lo = 0;
  let hi = spans.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = spans[mid];

    if (index < start) hi = mid - 1;
    else if (index > end) lo = mid + 1;
    else return true;
  }

  return false;
}

function buildLineStarts(text) {
  const starts = [0];

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }

  return starts;
}

function lineOf(lineStarts, index) {
  let lo = 0;
  let hi = lineStarts.length - 1;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);

    if (lineStarts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }

  return lo + 1;
}

function parseClause(clause) {
  const result = { default: null, named: [], namespace: null };

  if (!clause) {
    return result;
  }

  let rest = clause.trim();

  const ns = rest.match(/\*\s+as\s+([\w$]+)/);

  if (ns) {
    result.namespace = ns[1];
    rest = rest.replace(ns[0], '');
  }

  const braces = rest.match(/\{([^}]*)\}/);

  if (braces) {
    result.named = braces[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split(/\s+as\s+/)[0].trim());

    rest = rest.replace(braces[0], '');
  }

  const def = rest.replace(/,/g, ' ').trim();

  if (def) {
    result.default = def;
  }

  return result;
}

function extractImports(code, spans, lineStarts) {
  const found = [];

  const push = (match, specIndexInMatch, kind, extra = {}) => {
    if (isInsideSpan(spans, match.index)) {
      return;
    }

    const spec = match[specIndexInMatch];

    found.push({
      kind,
      spec,
      start: match.index + match[0].lastIndexOf(spec),
      line: lineOf(lineStarts, match.index),
      ...extra
    });
  };

  const staticRe =
    /\bimport\s+(?:([\w$*{}\s,]+?)\s+from\s+)?(['"])([^'"\n]+)\2/g;

  for (const match of code.matchAll(staticRe)) {
    push(match, 3, 'static', { clause: parseClause(match[1]) });
  }

  const reexportRe =
    /\bexport\s+(?:(\*(?:\s+as\s+[\w$]+)?)|(\{[^}]*\}))\s*from\s*(['"])([^'"\n]+)\3/g;

  for (const match of code.matchAll(reexportRe)) {
    const named = match[2]
      ? match[2]
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => item.split(/\s+as\s+/)[0].trim())
      : [];

    push(match, 4, 'reexport', {
      clause: { default: null, named, namespace: null }
    });
  }

  const dynamicRe = /\bimport\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)/g;

  for (const match of code.matchAll(dynamicRe)) {
    if (match[2].includes('${')) {
      continue;
    }

    push(match, 2, 'dynamic', {
      clause: { default: null, named: [], namespace: null }
    });
  }

  return found;
}

// ──────────────────────────────────────────────────────────────
// Eksporty modułów
// ──────────────────────────────────────────────────────────────

const exportsCache = new Map();

function getExports(absFile, stack = new Set()) {
  if (exportsCache.has(absFile)) {
    return exportsCache.get(absFile);
  }

  if (stack.has(absFile)) {
    return { names: new Set(), unknown: false };
  }

  stack.add(absFile);

  let text;

  try {
    text = fs.readFileSync(absFile, 'utf8');
  } catch {
    const failed = { names: new Set(), unknown: true };
    exportsCache.set(absFile, failed);
    return failed;
  }

  const { code } = stripSource(text);
  const names = new Set();
  let unknown = false;

  for (const m of code.matchAll(
    /\bexport\s+(?:async\s+)?function\s*\*?\s*([\w$]+)/g
  )) {
    names.add(m[1]);
  }

  for (const m of code.matchAll(/\bexport\s+class\s+([\w$]+)/g)) {
    names.add(m[1]);
  }

  for (const m of code.matchAll(
    /\bexport\s+(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[\w$]+)/g
  )) {
    const target = m[1];

    if (target[0] === '{' || target[0] === '[') {
      target
        .slice(1, -1)
        .split(',')
        .forEach((part) => {
          let name = part.replace(/=.*$/s, '').trim();

          if (name.includes(':')) {
            name = name.split(':')[1].trim();
          }

          name = name.replace(/^\.\.\./, '');

          if (name) {
            names.add(name);
          }
        });
    } else {
      names.add(target);
    }
  }

  if (/\bexport\s+default\b/.test(code)) {
    names.add('default');
  }

  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    m[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const bits = part.split(/\s+as\s+/);
        names.add((bits[1] || bits[0]).trim());
      });
  }

  for (const m of code.matchAll(
    /\bexport\s*\*\s*(?:as\s+([\w$]+)\s*)?from\s*(['"])([^'"\n]+)\2/g
  )) {
    if (m[1]) {
      names.add(m[1]);
      continue;
    }

    const spec = m[3].split(/[?#]/)[0];

    if (!/^(\.{1,2}\/|\/)/.test(spec)) {
      unknown = true;
      continue;
    }

    const abs = spec.startsWith('/')
      ? path.join(ROOT, spec)
      : path.resolve(path.dirname(absFile), spec);

    const resolved = resolveExact(abs);

    if (!resolved.exists || resolved.isDir) {
      unknown = true;
      continue;
    }

    const sub = getExports(resolved.exactPath, stack);

    sub.names.forEach((name) => {
      if (name !== 'default') {
        names.add(name);
      }
    });

    if (sub.unknown) {
      unknown = true;
    }
  }

  const result = { names, unknown };
  exportsCache.set(absFile, result);

  return result;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= b.length; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[a.length][b.length];
}

function closestName(name, names) {
  let best = null;
  let bestScore = 3;

  for (const candidate of names) {
    if (candidate === 'default') continue;

    const score =
      candidate.toLowerCase() === name.toLowerCase()
        ? 0
        : levenshtein(candidate.toLowerCase(), name.toLowerCase());

    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

// ──────────────────────────────────────────────────────────────
// Zbieranie plików
// ──────────────────────────────────────────────────────────────

const allFiles = [];
walk(ROOT, allFiles);

const isJs = (file) => /\.m?js$/i.test(file) && !/\.min\.m?js$/i.test(file);

const jsFiles = allFiles.filter(
  (file) => isJs(file) && path.resolve(file) !== SELF
);

const htmlFiles = allFiles.filter((file) => /\.html?$/i.test(file));

const byBasename = new Map();

allFiles
  .filter((file) => /\.(m?js|json)$/i.test(file))
  .forEach((file) => {
    const key = path.basename(file).toLowerCase();

    if (!byBasename.has(key)) {
      byBasename.set(key, []);
    }

    byBasename.get(key).push(file);
  });

// importmap (jeśli jest — importy "bare" nie są wtedy błędem)
const importMapKeys = new Set();

htmlFiles.forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(
    /<script[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!m) return;

  try {
    Object.keys(JSON.parse(m[1]).imports || {}).forEach((key) =>
      importMapKeys.add(key)
    );
  } catch {
    // niepoprawny importmap — ignorujemy
  }
});

function importMapAllows(spec) {
  for (const key of importMapKeys) {
    if (spec === key || (key.endsWith('/') && spec.startsWith(key))) {
      return true;
    }
  }

  return false;
}

// ──────────────────────────────────────────────────────────────
// Analiza
// ──────────────────────────────────────────────────────────────

const issues = [];
const edits = new Map(); // file → [{start,end,text}]
const edges = new Map(); // file → Set<file>
const typedVariants = new Map(); // lowerAbs → Map<typedAbs, [{file,line}]>
let importCount = 0;

const sourceCache = new Map();

function getSource(file) {
  if (!sourceCache.has(file)) {
    const text = fs.readFileSync(file, 'utf8');
    sourceCache.set(file, {
      text,
      lines: text.split(/\r?\n/)
    });
  }

  return sourceCache.get(file);
}

function addIssue(issue) {
  issues.push(issue);
}

function queueFix(file, entry, newSpec) {
  const suffixMatch = entry.spec.match(/[?#].*$/);
  const suffix = suffixMatch ? suffixMatch[0] : '';

  if (!edits.has(file)) {
    edits.set(file, []);
  }

  edits.get(file).push({
    start: entry.start,
    end: entry.start + entry.spec.length,
    text: newSpec + suffix
  });
}

function addEdge(from, to) {
  if (!edges.has(from)) {
    edges.set(from, new Set());
  }

  edges.get(from).add(to);
}

function checkEntry(file, entry) {
  importCount += 1;

  const clean = entry.spec.split(/[?#]/)[0];
  const snippet = getSource(file).lines[entry.line - 1]?.trim().slice(0, 170);

  const base = {
    file: rel(file),
    line: entry.line,
    spec: entry.spec,
    snippet
  };

  if (/^(https?:|data:|blob:|node:|\/\/)/i.test(clean)) {
    return;
  }

  if (!/^(\.{1,2}\/|\/)/.test(clean)) {
    if (!importMapAllows(clean)) {
      addIssue({
        ...base,
        severity: 'warn',
        code: 'BARE_SPECIFIER',
        message:
          `Import "${clean}" nie jest ścieżką względną. Przeglądarka bez ` +
          'bundlera ani importmap go nie rozwiąże.'
      });
    }

    return;
  }

  const abs = clean.startsWith('/')
    ? path.join(ROOT, clean)
    : path.resolve(path.dirname(file), clean);

  const resolved = resolveExact(abs);

  if (!resolved.exists) {
    if (!path.extname(clean)) {
      const withExt = resolveExact(`${abs}.js`);

      if (withExt.exists && !withExt.isDir) {
        const fixed = toSpecifier(file, withExt.exactPath);

        addIssue({
          ...base,
          severity: 'error',
          code: 'MISSING_EXTENSION',
          message:
            'Brak rozszerzenia .js (przeglądarka nie dopisuje go sama).',
          suggestion: fixed,
          fixable: true
        });

        queueFix(file, entry, fixed);
        return;
      }
    }

    const candidates = (byBasename.get(path.basename(clean).toLowerCase()) || [])
      .filter((candidate) => path.resolve(candidate) !== path.resolve(file))
      .map((candidate) => toSpecifier(file, candidate));

    addIssue({
      ...base,
      severity: 'error',
      code: 'MISSING_FILE',
      message: `Nie znaleziono pliku: ${rel(abs)}`,
      suggestion: candidates.length === 1 ? candidates[0] : null,
      candidates: candidates.slice(0, 5),
      fixable: candidates.length === 1
    });

    if (candidates.length === 1) {
      queueFix(file, entry, candidates[0]);
    }

    return;
  }

  if (resolved.isDir) {
    const index = resolveExact(path.join(abs, 'index.js'));

    const suggestion = index.exists
      ? `${clean.replace(/\/+$/, '')}/index.js`
      : null;

    addIssue({
      ...base,
      severity: 'error',
      code: 'DIRECTORY_IMPORT',
      message:
        'Import katalogu. Przeglądarka wymaga pełnej ścieżki do pliku.',
      suggestion,
      fixable: Boolean(suggestion)
    });

    if (suggestion) {
      queueFix(file, entry, suggestion);
    }

    return;
  }

  // Rejestr zapisów wielkości liter dla wykrywania duplikatów modułu.
  const lowerKey = abs.toLowerCase();

  if (!typedVariants.has(lowerKey)) {
    typedVariants.set(lowerKey, new Map());
  }

  const variants = typedVariants.get(lowerKey);

  if (!variants.has(abs)) {
    variants.set(abs, []);
  }

  variants.get(abs).push({ file: rel(file), line: entry.line });

  if (resolved.caseMismatch) {
    const fixed = toSpecifier(file, resolved.exactPath);

    addIssue({
      ...base,
      severity: 'error',
      code: 'CASE_MISMATCH',
      message:
        `Wielkość liter nie zgadza się z plikiem na dysku (${rel(resolved.exactPath)}). ` +
        'Na Windows działa, na Linuxie i w URL-ach nie.',
      suggestion: fixed,
      fixable: true
    });

    queueFix(file, entry, fixed);
  }

  if (isJs(resolved.exactPath)) {
    addEdge(file, resolved.exactPath);
  }

  if (
    !flags.exports ||
    entry.kind === 'dynamic' ||
    !isJs(resolved.exactPath)
  ) {
    return;
  }

  const exported = getExports(resolved.exactPath);

  if (exported.unknown) {
    return;
  }

  const wanted = [...entry.clause.named];

  if (entry.clause.default) {
    wanted.push('default');
  }

  wanted.forEach((name) => {
    if (exported.names.has(name)) {
      return;
    }

    const close = name === 'default' ? null : closestName(name, exported.names);

    addIssue({
      ...base,
      severity: 'error',
      code: 'MISSING_EXPORT',
      message:
        name === 'default'
          ? `${rel(resolved.exactPath)} nie ma eksportu domyślnego.`
          : `"${name}" nie jest eksportowane przez ${rel(resolved.exactPath)}.`,
      suggestion: close ? `czy chodziło o "${close}"?` : null
    });
  });
}

jsFiles.forEach((file) => {
  let source;

  try {
    source = getSource(file);
  } catch (error) {
    addIssue({
      file: rel(file),
      line: 0,
      severity: 'warn',
      code: 'UNREADABLE',
      message: `Nie można odczytać pliku: ${error.message}`
    });

    return;
  }

  const { code, spans } = stripSource(source.text);
  const lineStarts = buildLineStarts(source.text);

  extractImports(code, spans, lineStarts).forEach((entry) => {
    checkEntry(file, entry);
  });
});

// Duplikaty modułów przez różną wielkość liter.
typedVariants.forEach((variants) => {
  if (variants.size < 2) {
    return;
  }

  const spellings = [...variants.entries()].map(([typed, users]) => ({
    path: rel(typed),
    importers: users
  }));

  const first = spellings[0].importers[0];

  addIssue({
    file: first.file,
    line: first.line,
    severity: 'error',
    code: 'DUPLICATE_MODULE',
    spec: spellings.map((item) => item.path).join('  ≠  '),
    message:
      'Ten sam plik jest importowany pod różnymi zapisami. Przeglądarka ' +
      'załaduje go kilka razy (osobne instancje, podwójne listenery).',
    details: spellings.map(
      (item) =>
        `${item.path}  ←  ${item.importers
          .slice(0, 4)
          .map((user) => `${user.file}:${user.line}`)
          .join(', ')}${item.importers.length > 4 ? ', …' : ''}`
    )
  });
});

// Referencje w plikach HTML.
const htmlEntries = new Set();

htmlFiles.forEach((file) => {
  const html = getSource(file).text;
  const lineStarts = buildLineStarts(html);

  const patterns = [
    {
      re: /<script\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi,
      isScript: true
    },
    {
      re: /<link\b[^>]*?\shref\s*=\s*["']([^"']+)["']/gi,
      isScript: false
    }
  ];

  patterns.forEach(({ re, isScript }) => {
    for (const match of html.matchAll(re)) {
      const raw = match[1];
      const clean = raw.split(/[?#]/)[0];

      if (
        !clean ||
        /^(https?:|data:|blob:|mailto:|tel:|\/\/|#)/i.test(clean)
      ) {
        continue;
      }

      if (!isScript && !/\.(css|webmanifest|ico|png|svg|json)$/i.test(clean)) {
        continue;
      }

      importCount += 1;

      const abs = clean.startsWith('/')
        ? path.join(ROOT, clean)
        : path.resolve(path.dirname(file), clean);

      const resolved = resolveExact(abs);
      const line = lineOf(lineStarts, match.index);

      const base = {
        file: rel(file),
        line,
        spec: raw,
        snippet: getSource(file).lines[line - 1]?.trim().slice(0, 170)
      };

      if (!resolved.exists) {
        addIssue({
          ...base,
          severity: 'error',
          code: 'HTML_MISSING',
          message: `Nie znaleziono pliku: ${rel(abs)}`
        });

        continue;
      }

      if (resolved.caseMismatch) {
        addIssue({
          ...base,
          severity: 'error',
          code: 'CASE_MISMATCH',
          message:
            `Wielkość liter nie zgadza się z plikiem na dysku (${rel(resolved.exactPath)}).`,
          suggestion: toSpecifier(file, resolved.exactPath)
        });
      }

      if (isScript && isJs(resolved.exactPath)) {
        htmlEntries.add(resolved.exactPath);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────
// Osierocone pliki (opcjonalnie)
// ──────────────────────────────────────────────────────────────

let orphans = [];

if (flags.orphans) {
  const entries = new Set(htmlEntries);
  const mainJs = resolveExact(path.join(ROOT, 'main.js'));

  if (mainJs.exists) {
    entries.add(mainJs.exactPath);
  }

  const visited = new Set();
  const queue = [...entries];

  while (queue.length) {
    const current = queue.pop();

    if (visited.has(current)) continue;

    visited.add(current);
    (edges.get(current) || new Set()).forEach((next) => queue.push(next));
  }

  orphans = jsFiles
    .filter((file) => !visited.has(file))
    .filter((file) => !/\.(config|test|spec)\.m?js$/i.test(file))
    .map(rel)
    .sort();
}

// ──────────────────────────────────────────────────────────────
// Poprawki (--fix)
// ──────────────────────────────────────────────────────────────

let fixedCount = 0;

if (flags.fix) {
  edits.forEach((fileEdits, file) => {
    let text = getSource(file).text;

    [...fileEdits]
      .sort((a, b) => b.start - a.start)
      .forEach((edit) => {
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
        fixedCount += 1;
      });

    fs.writeFileSync(file, text);
  });
}

// ──────────────────────────────────────────────────────────────
// Raport
// ──────────────────────────────────────────────────────────────

const errors = issues.filter((issue) => issue.severity === 'error');
const warnings = issues.filter((issue) => issue.severity === 'warn');
const fixable = issues.filter((issue) => issue.fixable).length;

const summary = {
  root: ROOT,
  filesScanned: jsFiles.length + htmlFiles.length,
  referencesChecked: importCount,
  errors: errors.length,
  warnings: warnings.length,
  fixable,
  fixed: flags.fix ? fixedCount : 0
};

if (flags.json) {
  console.log(
    JSON.stringify({ summary, issues, orphans }, null, 2)
  );
} else {
  console.log(
    `${bold('check-imports')} ${dim(ROOT)}\n` +
      `${dim(
        `Pliki: ${summary.filesScanned}, sprawdzone odwołania: ${summary.referencesChecked}`
      )}\n`
  );

  const printGroup = (title, list, colorize) => {
    if (!list.length) return;

    console.log(colorize(bold(`${title} (${list.length})`)));
    console.log('');

    const byFile = new Map();

    list.forEach((issue) => {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, []);
      }

      byFile.get(issue.file).push(issue);
    });

    [...byFile.keys()].sort().forEach((file) => {
      byFile
        .get(file)
        .sort((a, b) => a.line - b.line)
        .forEach((issue) => {
          console.log(
            `${colorize('●')} ${cyan(`${issue.file}:${issue.line}`)}  ${dim(`[${issue.code}]`)}`
          );

          if (issue.snippet) {
            console.log(`    ${dim(issue.snippet)}`);
          }

          console.log(`    ${issue.message}`);

          (issue.details || []).forEach((line) => {
            console.log(`      ${dim(line)}`);
          });

          if (issue.suggestion) {
            console.log(`    ${green('→')} ${issue.suggestion}`);
          } else if (issue.candidates?.length > 1) {
            console.log(
              `    ${yellow('→')} kilka kandydatów: ${issue.candidates.join(', ')}`
            );
          }

          console.log('');
        });
    });
  };

  printGroup('BŁĘDY', errors, red);
  printGroup('OSTRZEŻENIA', warnings, yellow);

  if (flags.orphans) {
    console.log(bold(`NIEOSIĄGALNE Z index.html / main.js (${orphans.length})`));
    console.log(dim('(kandydaci do usunięcia; dynamiczne importy ze stałym tekstem są liczone)\n'));
    orphans.forEach((file) => console.log(`  ${file}`));
    console.log('');
  }

  const status = errors.length
    ? red(`✖ ${errors.length} błędów`)
    : green('✔ brak błędów');

  console.log(
    `${status}, ${warnings.length} ostrzeżeń` +
      (fixable && !flags.fix
        ? `  ${dim(`(${fixable} do automatycznej naprawy: uruchom z --fix)`)}`
        : '') +
      (flags.fix ? `  ${green(`naprawiono: ${fixedCount}`)}` : '')
  );

  if (!flags.orphans) {
    console.log(dim('Wskazówka: --orphans pokaże pliki, których nikt nie importuje.'));
  }
}

process.exit(errors.length || (flags.strict && warnings.length) ? 1 : 0);
