#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const acorn = require('acorn');
const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', 'coverage', 'manifest-backups', 'asset-audit-reports', 'import-audit-reports']);
const disk = new Set(), issues = [];
const slash = value => value.split(path.sep).join('/');
function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (ignored.has(e.name) || e.isSymbolicLink()) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile()) disk.add(slash(path.relative(root, full)));
  }
}
walk(root);
let tracked;
try {
  tracked = new Set(execFileSync('git', ['ls-files', '-z'], {cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe']}).split('\0').filter(Boolean));
} catch {
  console.error('ERROR: Git is required. Run inside the repository.');
  process.exit(2);
}
const lower = new Map();
for (const f of tracked) {
  const key = f.toLowerCase();
  if (!lower.has(key)) lower.set(key, []);
  lower.get(key).push(f);
}
const add = (level, code, file, line, message) => issues.push({level, code, file, line, message});
for (const paths of lower.values()) if (paths.length > 1)
  add('error', 'CASE_COLLISION', paths[0], 1, paths.join(', '));
let references = 0;
function check(file, node, raw) {
  if (typeof raw !== 'string' || (!raw.startsWith('.') && !raw.startsWith('/'))) return;
  references++;
  const line = node.loc.start.line;
  let clean;
  try { clean = decodeURIComponent(raw.split(/[?#]/)[0]); }
  catch { add('error','INVALID_URL',file,line,raw); return; }
  if (clean.includes('\\')) { add('error','BACKSLASH',file,line,raw); return; }
  const target = path.posix.normalize(clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(file),clean));
  if (target === '..' || target.startsWith('../')) { add('error','OUTSIDE_ROOT',file,line,raw); return; }
  if (tracked.has(target)) {
    try {
      if (!fs.statSync(path.join(root,target)).isFile()) add('error','NOT_A_FILE',file,line,target);
    } catch { add('error','MISSING_ON_DISK',file,line,target); }
    return;
  }
  const matches = lower.get(target.toLowerCase());
  if (matches) add('error','WRONG_CASE',file,line,`Import: ${raw}; Git path: ${matches.join(', ')}`);
  else if (disk.has(target)) add('error','NOT_TRACKED',file,line,`File exists locally but is not tracked by Git: ${target}`);
  else {
    const candidate = [...disk].find(f => f.toLowerCase() === target.toLowerCase());
    add('error','MISSING_FILE',file,line,`Cannot resolve: ${raw} -> ${target}${candidate ? '; local candidate: '+candidate : ''}`);
  }
}
function visit(node,file) {
  if (!node || typeof node !== 'object') return;
  if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type) && node.source)
    check(file,node.source,node.source.value);
  if (node.type === 'ImportExpression') {
    const s = node.source;
    if (s.type === 'Literal' && typeof s.value === 'string') check(file,s,s.value);
    else if (s.type === 'TemplateLiteral' && !s.expressions.length) check(file,s,s.quasis[0].value.cooked);
    else add('warning','COMPUTED_IMPORT',file,node.loc.start.line,'Computed import requires runtime verification.');
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child,file));
    else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value,file);
  }
}
const sources = [...disk].filter(f => /\.(js|mjs|cjs)$/.test(f) && !/\.min\.js$/.test(f)).sort();
for (const file of sources) {
  const text = fs.readFileSync(path.join(root,file),'utf8');
  const commonjs = file.endsWith('.cjs');
  const options = {ecmaVersion:'latest', locations:true, allowHashBang:true, allowReturnOutsideFunction:commonjs};
  let ast;
  try { ast = acorn.parse(text,{...options,sourceType:commonjs ? 'script' : 'module'}); }
  catch (first) {
    if (/\.(mjs|cjs)$/.test(file)) { add('error','SYNTAX',file,first.loc?.line || 1,first.message); continue; }
    try { ast = acorn.parse(text,{...options,sourceType:'script'}); }
    catch { add('error','SYNTAX',file,first.loc?.line || 1,first.message); continue; }
  }
  visit(ast,file);
}
const errors = issues.filter(i => i.level === 'error').length;
console.log(`IMPORT AUDIT: ${sources.length} JS files, ${references} local references, ${errors} errors, ${issues.length-errors} warnings`);
for (const i of issues) {
  console.log(`${i.level.toUpperCase()} ${i.file}:${i.line} [${i.code}] ${i.message}`);
  if (process.env.GITHUB_ACTIONS) {
    const esc = v => String(v).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A').replace(/,/g,'%2C').replace(/:/g,'%3A');
    console.log(`::${i.level === 'error' ? 'error' : 'warning'} file=${esc(i.file)},line=${i.line}::${esc(i.code+': '+i.message)}`);
  }
}
console.log('Scope: local ESM imports/re-exports and literal import(). No network requests or source changes.');
console.log('Not checked: HTML, require(), external URLs/packages, named exports, computed targets, hosting.');
process.exitCode = errors ? 1 : 0;
