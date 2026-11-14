#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const acorn = require('acorn');

const root = path.resolve(__dirname, '..');
const ignored = new Set([
  '.git', 'node_modules', 'vendor', 'dist', 'build', 'coverage',
  'manifest-backups', 'asset-audit-reports', 'import-audit-reports'
]);
const diskFiles = new Set();
const issues = [];
const slash = p => p.split(path.sep).join('/');
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) diskFiles.add(slash(path.relative(root, full)));
  }
}
walk(root);
let tracked;
try {
  tracked = new Set(execFileSync('git', ['ls-files', '-z'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).split('\0').filter(Boolean));
} catch {
  console.error('ERROR: Git is required. Run this tool inside the repository.');
  process.exit(2);
}
const lower = new Map();
for (const file of tracked) {
  const key = file.toLowerCase();
  if (!lower.has(key)) lower.set(key, []);
  lower.get(key).push(file);
}
const add = (level, code, file, line, message) =>
  issues.push({ level, code, file, line, message });
for (const files of lower.values()) {
  if (files.length > 1) add('error', 'CASE_COLLISION', files[0], 1,
    `Git tracks paths differing only by case: ${files.join(', ')}`);
}
let references = 0;
function checkReference(file, node, raw) {
  if (typeof raw !== 'string') return;
  if (!raw.startsWith('.') && !raw.startsWith('/')) return;
  references++;
  const line = node.loc.start.line;
  let clean;
  try { clean = decodeURIComponent(raw.split(/[?#]/)[0]); }
  catch { add('error', 'INVALID_URL', file, line, raw); return; }
  if (clean.includes('\\')) {
    add('error', 'BACKSLASH', file, line, `Use / in module URL: ${raw}`);
    return;
  }
  const target = path.posix.normalize(clean.startsWith('/')
    ? clean.slice(1) : path.posix.join(path.posix.dirname(file), clean));
  if (target === '..' || target.startsWith('../')) {
    add('error', 'OUTSIDE_ROOT', file, line, raw); return;
  }
  if (tracked.has(target)) {
    if (!fs.existsSync(path.join(root, target)))
      add('error', 'MISSING_ON_DISK', file, line, target);
    return;
  }
  const alternatives = lower.get(target.toLowerCase());
  if (alternatives) {
    add('error', 'WRONG_CASE', file, line,
      `Import: ${raw}; Git path: ${alternatives.join(', ')}`);
  } else if (diskFiles.has(target)) {
    add('error', 'NOT_TRACKED', file, line,
      `File exists locally but is not tracked by Git: ${target}`);
  } else {
    const diskMatch = [...diskFiles].find(p => p.toLowerCase() === target.toLowerCase());
    add('error', 'MISSING_FILE', file, line,
      `Cannot resolve: ${raw} -> ${target}${diskMatch ? `; local candidate: ${diskMatch}` : ''}`);
  }
}
function visit(node, file) {
  if (!node || typeof node !== 'object') return;
  if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
      && node.source) checkReference(file, node.source, node.source.value);
  if (node.type === 'ImportExpression') {
    const source = node.source;
    if (source.type === 'Literal' && typeof source.value === 'string')
      checkReference(file, source, source.value);
    else if (source.type === 'TemplateLiteral' && source.expressions.length === 0)
      checkReference(file, source, source.quasis[0].value.cooked);
    else add('warning', 'COMPUTED_IMPORT', file, node.loc.start.line,
      'Computed import requires runtime verification.');
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, file));
    else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value, file);
  }
}
const sources = [...diskFiles].filter(f => /\.(?:js|mjs|cjs)$/.test(f)
  && !/\.min\.js$/.test(f)).sort();
for (const file of sources) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  let ast;
  try {
    ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: file.endsWith('.cjs') ? 'script' : 'module', locations: true, allowHashBang: true });
  } catch (first) {
    if (file.endsWith('.mjs') || file.endsWith('.cjs')) {
      add('error', 'SYNTAX', file, first.loc?.line || 1, first.message); continue;
    }
    try {
      ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true });
    } catch {
      add('error', 'SYNTAX', file, first.loc?.line || 1, first.message); continue;
    }
  }
  visit(ast, file);
}
const errors = issues.filter(i => i.level === 'error').length;
const warnings = issues.length - errors;
console.log(`IMPORT AUDIT: ${sources.length} JS files, ${references} local references, ${errors} errors, ${warnings} warnings`);
for (const item of issues) {
  console.log(`${item.level.toUpperCase()} ${item.file}:${item.line} [${item.code}] ${item.message}`);
  if (process.env.GITHUB_ACTIONS) {
    const escape = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/,/g, '%2C').replace(/:/g, '%3A');
    console.log(`::${item.level === 'error' ? 'error' : 'warning'} file=${escape(item.file)},line=${item.line}::${escape(item.code + ': ' + item.message)}`);
  }
}
console.log('Scope: local ESM imports/re-exports and literal import(). No network requests or source changes.');
console.log('Not checked: HTML, CommonJS require(), external packages/URLs, named exports, computed import targets, hosting configuration.');
process.exitCode = errors ? 1 : 0;
