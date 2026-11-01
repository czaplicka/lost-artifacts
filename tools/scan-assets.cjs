#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const EXT = { '.png':'image', '.jpg':'image', '.jpeg':'image', '.webp':'image', '.gif':'image',
  '.svg':'image', '.avif':'image', '.bmp':'image', '.mp3':'audio', '.ogg':'audio', '.wav':'audio',
  '.m4a':'audio', '.aac':'audio', '.flac':'audio', '.mp4':'video', '.webm':'video', '.ogv':'video',
  '.json':'json', '.css':'css', '.html':'html', '.htm':'html' };
const GROUP = { image:'backgrounds', audio:'audio', json:'json', tilemap:'tilemaps',
  video:'videos', css:'css', html:'html' };
const INDEX = 'assets/manifests/index.json';
const AUTO = 'assets/manifests/auto-discovered.json';
const slash = value => value.split(path.sep).join('/');
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const format = value => JSON.stringify(value, null, 2) + '\n';

function scanAssets({ root = path.resolve(__dirname, '..'), write = true } = {}) {
  root = fs.realpathSync(root);
  const warnings = [], skipped = [], added = [], bindings = [];
  const docs = new Map();
  const inside = file => {
    const relative = path.relative(root, file);
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  };
  function full(relative) {
    const file = path.resolve(root, relative);
    if (!inside(file)) throw Error('Path outside project: ' + relative);
    return file;
  }
  function safeExisting(relative) {
    const file = full(relative);
    if (!inside(fs.realpathSync(file)) || fs.lstatSync(file).isSymbolicLink()) {
      throw Error('Unsafe symbolic link: ' + relative);
    }
    return file;
  }
  function read(relative) {
    if (docs.has(relative)) return docs.get(relative).data;
    const original = fs.readFileSync(safeExisting(relative), 'utf8');
    const data = JSON.parse(original.replace(/^\uFEFF/, ''));
    docs.set(relative, { original, data });
    return data;
  }
  function localUrl(url) {
    if (typeof url !== 'string' || !url) throw Error('Invalid asset URL.');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return null;
    const clean = decodeURIComponent(url.split(/[?#]/)[0]).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
    return slash(path.relative(root, full(clean)));
  }
  const index = read(INDEX);
  if (index.version !== 2 || !Array.isArray(index.files) || !plain(index.bundles) || !plain(index.startup)) {
    throw Error('Invalid manifest index. Nothing changed.');
  }
  const listed = new Set();
  for (const raw of index.files) {
    const file = localUrl(raw);
    if (!file?.startsWith('assets/manifests/') || path.posix.dirname(file) !== 'assets/manifests') {
      throw Error('Invalid manifest location: ' + raw);
    }
    listed.add(file);
    if (!Array.isArray(read(file)?.assets)) throw Error('Invalid manifest: ' + file);
  }
  // Register manifest parts that are already on disk but missing from index.files.
  for (const entry of fs.readdirSync(safeExisting('assets/manifests'), { withFileTypes:true }).sort((a,b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) { warnings.push('Manifest symlink skipped: ' + entry.name); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue;
    const file = 'assets/manifests/' + entry.name;
    const data = read(file);
    if (Array.isArray(data?.assets)) listed.add(file);
  }
  index.files = [...listed];
  const catalog = new Map(), byUrl = new Map();
  for (const file of index.files) {
    for (const asset of docs.get(file).data.assets) {
      if (!plain(asset) || !GROUP[asset.type] || typeof asset.key !== 'string' || !asset.key || !asset.url) {
        throw Error('Invalid asset entry in ' + file);
      }
      const id = asset.type + ':' + asset.key;
      if (catalog.has(id)) throw Error('Duplicate existing key: ' + id + '. Nothing changed.');
      catalog.set(id, asset);
      const urls = Array.isArray(asset.url) ? asset.url : [asset.url];
      for (const raw of urls) {
        const url = localUrl(raw);
        if (!url) continue;
        if (!byUrl.has(url)) byUrl.set(url, []);
        byUrl.get(url).push(id);
        if (!fs.existsSync(full(url))) warnings.push('Existing manifest file missing: ' + url + ' [' + id + ']');
      }
    }
  }
  function bundle(name, refs) {
    if (index.bundles[name] !== undefined && !Array.isArray(index.bundles[name])) throw Error('Invalid bundle: ' + name);
    const old = index.bundles[name] || [];
    const next = [...new Set([...old, ...refs])];
    if (next.length !== old.length) bindings.push({ bundle:name, added:next.filter(id => !old.includes(id)) });
    index.bundles[name] = next;
  }
  const files = [];
  function walk(relative) {
    for (const entry of fs.readdirSync(safeExisting(relative), { withFileTypes:true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const file = relative + '/' + entry.name;
      if (entry.isSymbolicLink()) { skipped.push({ file, reason:'symbolic link' }); continue; }
      if (entry.name.startsWith('.')) { skipped.push({ file, reason:'hidden entry' }); continue; }
      if (entry.isDirectory()) {
        if (file === 'assets/manifests' || /^(node_modules|backups?|manifest-backups)$/i.test(entry.name)) continue;
        walk(file);
      } else if (entry.isFile()) files.push(file);
    }
  }
  walk('assets');
  for (const file of files) {
    let type = EXT[path.posix.extname(file).toLowerCase()];
    if (!type) { skipped.push({ file, reason:'unsupported by current manifest loader' }); continue; }
    if (fs.statSync(safeExisting(file)).size === 0) { skipped.push({ file, reason:'empty file' }); continue; }
    if (type === 'json') {
      try {
        const value = JSON.parse(fs.readFileSync(full(file), 'utf8').replace(/^\uFEFF/, ''));
        if (value?.type === 'map' && Array.isArray(value.layers) && Array.isArray(value.tilesets)) type = 'tilemap';
        else if (value?.frames || value?.textures) warnings.push('Possible atlas JSON registered as data; atlas configuration is not inferred: ' + file);
      } catch (error) { skipped.push({ file, reason:'invalid JSON: ' + error.message }); continue; }
    }
    let refs = byUrl.get(file);
    if (!refs) {
      const stem = path.posix.basename(file, path.posix.extname(file));
      let key = stem;
      if (catalog.has(type + ':' + key)) {
        const base = file.slice(7, -path.posix.extname(file).length).replace(/[^a-zA-Z0-9_-]+/g, '__');
        key = base;
        if (catalog.has(type + ':' + key)) key = base + '__' + crypto.createHash('sha256').update(file).digest('hex').slice(0, 10);
        let number = 2;
        const initial = key;
        while (catalog.has(type + ':' + key)) key = initial + '__' + number++;
      }
      const asset = { key, url:file, type, groups:[GROUP[type]] };
      if (type === 'video') asset.noAudio = false;
      if (!docs.has(AUTO)) docs.set(AUTO, { original:null, data:{ assets:[] } });
      const auto = docs.get(AUTO).data;
      if (!Array.isArray(auto.assets)) throw Error('Invalid ' + AUTO);
      auto.assets.push(asset);
      if (!index.files.includes(AUTO)) index.files.push(AUTO);
      refs = [type + ':' + key];
      catalog.set(refs[0], asset); byUrl.set(file, refs); added.push(asset);
    }
    // Every scanned supported file has index references, without eager startup loading.
    bundle('auto:assets', refs);
    bundle('auto:folder:' + path.posix.dirname(file).slice(7), refs);
    // Explicit project-specific rule; arbitrary scene names cannot be inferred from filenames.
    if (file.startsWith('assets/pi/office/')) bundle('scene:DetectiveOfficeScene', refs);
  }
  for (const [name, refs] of Object.entries(index.bundles)) {
    if (!Array.isArray(refs)) throw Error('Invalid bundle: ' + name);
    for (const id of refs) if (!catalog.has(id)) throw Error('Unknown bundle reference: ' + id + ' in ' + name);
  }
  for (const [group, refs] of Object.entries(index.startup)) {
    if (!Array.isArray(refs)) throw Error('Invalid startup group: ' + group);
    for (const id of refs) if (!catalog.has(id)) throw Error('Unknown startup reference: ' + id);
  }
  const pending = [...docs].filter(([file, doc]) => {
    if (file !== INDEX && !index.files.includes(file)) return false;
    return doc.original === null || JSON.stringify(JSON.parse(doc.original.replace(/^\uFEFF/, ''))) !== JSON.stringify(doc.data);
  });
  let backup = null;
  if (write && pending.length) {
    for (const [file, doc] of pending) {
      if (doc.original === null ? fs.existsSync(full(file)) : fs.readFileSync(safeExisting(file), 'utf8') !== doc.original) {
        throw Error('Manifest changed during scan: ' + file);
      }
    }
    const backupRoot = full('manifest-backups');
    if (fs.existsSync(backupRoot)) safeExisting('manifest-backups');
    fs.mkdirSync(backupRoot, { recursive:true });
    backup = fs.mkdtempSync(path.join(backupRoot, 'scan-assets-'));
    for (const [file, doc] of pending) {
      if (doc.original === null) continue;
      const target = path.join(backup, file);
      fs.mkdirSync(path.dirname(target), { recursive:true });
      fs.writeFileSync(target, doc.original);
    }
    fs.writeFileSync(path.join(backup, 'changes.json'), format(pending.map(([file,doc]) => ({ file, existed:doc.original !== null }))));
    const staged = [], written = [];
    try {
      for (const [file, doc] of pending.sort(([a],[b]) => Number(a === INDEX) - Number(b === INDEX))) {
        const temporary = full(file) + `.scan-${process.pid}.tmp`;
        fs.writeFileSync(temporary, format(doc.data), { flag:'wx' });
        staged.push({ file, doc, temporary });
      }
      for (const entry of staged) { fs.renameSync(entry.temporary, full(entry.file)); written.push(entry); }
    } catch (error) {
      for (const { file, doc } of written.reverse()) {
        if (doc.original === null) fs.rmSync(full(file), { force:true });
        else fs.writeFileSync(full(file), doc.original);
      }
      throw error;
    } finally {
      for (const { temporary } of staged) if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return { scanned:files.length, added, bindings, warnings:[...new Set(warnings)], skipped,
    changedFiles:pending.map(([file]) => file), applied:write && pending.length > 0, backup };
}
function main() {
  const options = {}, args = process.argv.slice(2);
  for (let i=0; i<args.length; i++) {
    if (args[i] === '--check') options.write = false;
    else if (args[i] === '--root') { if (!args[i+1]) throw Error('Missing project root.'); options.root = args[++i]; }
    else if (args[i] === '--help') {
      console.log('node tools/scan-assets.cjs [--check] [--root PROJECT]\nDefault: add missing assets and bundle references. No deletion, conversion or key renaming.'); return;
    } else throw Error('Unknown argument: ' + args[i]);
  }
  const result = scanAssets(options);
  console.log(`Scanned: ${result.scanned} files; new assets: ${result.added.length}; changed manifests: ${result.changedFiles.length}`);
  console.log(options.write === false ? 'CHECK ONLY - no manifest writes.' : result.applied ? 'MANIFESTS UPDATED.' : 'Already up to date.');
  for (const asset of result.added) console.log(`ADD ${asset.type}:${asset.key} -> ${asset.url}`);
  for (const warning of result.warnings) console.warn('WARNING ' + warning);
  for (const item of result.skipped) console.log(`SKIP ${item.file}: ${item.reason}`);
  if (result.backup) console.log('Backup: ' + result.backup);
  console.log('No images were deleted. No game code or startup loading was changed.');
  if (options.write === false && result.changedFiles.length) process.exitCode = 1;
}
module.exports = { scanAssets };
if (require.main === module) {
  try { main(); } catch (error) { console.error('[scan-assets] ' + error.message); process.exitCode = 2; }
}
