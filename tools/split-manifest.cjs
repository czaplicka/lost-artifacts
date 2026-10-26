const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const input = path.resolve(ROOT, process.argv[2] || 'assets/data/assetManifest.json');
const output = path.join(ROOT, 'assets/manifests');
const TYPES = { audio: 'audio', json: 'json', tilemaps: 'tilemap', videos: 'video', css: 'css', html: 'html' };
const GROUPS = ['sidequests', 'backgrounds', 'npcPortraits', 'ui', 'artifacts', 'newspapers',
  'suspects', 'wantedPosters', 'suspectThumbnails', 'csi', 'portraits', 'videos', 'audio', 'css', 'json', 'tilemaps', 'html'];
const defaultGroup = type => ({ image: 'backgrounds', tilemap: 'tilemaps', video: 'videos' }[type] || type);
const idOf = a => `${a.type}:${a.key}`;
const same = (a, b) => {
  const normalize = value => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])]));
    return value;
  };
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
};
function main() {
  if (fs.existsSync(output)) throw new Error('assets/manifests already exists. Move it aside before running this one-time migration.');
  const old = JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, ''));
  if (old.bundleVersion !== 1 || !Array.isArray(old.assetCatalog) || !old.bundles || !old.startup) {
    throw new Error('Expected the current bundleVersion: 1 manifest. No files changed.');
  }
  const assets = new Map();
  const add = (asset, group, origin) => {
    if (!asset.key || !asset.url || !asset.type) throw new Error(`Invalid entry in ${origin}.`);
    const id = idOf(asset);
    const current = assets.get(id);
    if (current) {
      for (const key of Object.keys(asset)) {
        if (key in current.asset && !same(current.asset[key], asset[key])) {
          throw new Error(`Conflicting ${key} for ${id} in ${origin}. Resolve before migration.`);
        }
      }
      Object.assign(current.asset, asset);
    }
    if (!current) assets.set(id, { asset, groups: new Set() });
    if (group) assets.get(id).groups.add(group);
  };
  for (const asset of old.assetCatalog) {
    if (assets.has(idOf(asset))) throw new Error(`Duplicate catalog entry: ${idOf(asset)}`);
    add(asset, null, 'assetCatalog');
  }
  for (const group of GROUPS) for (const entry of old[group] || []) {
    add({ ...entry, type: TYPES[group] || 'image' }, group, group);
  }
  const startup = {};
  for (const [group, entries] of Object.entries(old.startup)) {
    if (!GROUPS.includes(group) || !Array.isArray(entries)) throw new Error(`Unknown startup group ${group}.`);
    startup[group] = [];
    for (const entry of entries) {
      const asset = { ...entry, type: TYPES[group] || 'image' };
      add(asset, group, `startup.${group}`);
      startup[group].push(idOf(asset));
    }
  }
  for (const [bundle, refs] of Object.entries(old.bundles)) {
    if (!Array.isArray(refs)) throw new Error(`Invalid bundle ${bundle}.`);
    for (const ref of refs) if (!assets.has(ref)) throw new Error(`Unknown ${ref} in ${bundle}.`);
  }
  const office = new Set(Object.entries(old.bundles).filter(([k]) => /scene:(OfficeScene|ArchiveScene|AgencyStorageScene)$/.test(k)).flatMap(([, v]) => v));
  const labs = new Set(Object.entries(old.bundles).filter(([k]) => /scene:.*(Lab|Forensic|Fingerprint|Blood|Hair|DNA|Dna)/.test(k)).flatMap(([, v]) => v));
  const cities = new Set(Object.entries(old.bundles).filter(([k]) => /^(city:|crime:)/.test(k)).flatMap(([, v]) => v));
  const parts = Object.fromEntries(['core', 'office', 'crime-lab', 'cities', 'suspects', 'newspapers', 'story', 'other'].map(k => [k, { assets: [] }]));
  const classify = (id, groups) => {
    if (groups.some(g => ['suspects', 'wantedPosters', 'suspectThumbnails'].includes(g))) return 'suspects';
    if (groups.includes('newspapers') || /^(json:newspaper_|image:paper_)/.test(id)) return 'newspapers';
    if (groups.includes('csi') || labs.has(id)) return 'crime-lab';
    if (office.has(id) || id.includes('desk-lamp')) return 'office';
    if (groups.includes('sidequests')) return 'story';
    if (cities.has(id)) return 'cities';
    if (groups.some(g => ['ui', 'css', 'html', 'videos', 'audio'].includes(g))) return 'core';
    return 'other';
  };
  for (const [id, { asset, groups }] of assets) {
    const tags = groups.size ? [...groups] : [defaultGroup(asset.type)];
    parts[classify(id, tags)].assets.push({ ...asset, groups: tags });
  }
  const index = { version: 2, files: Object.keys(parts).map(k => `assets/manifests/${k}.json`), startup, bundles: old.bundles };
  const render = value => JSON.stringify(value, null, 2) + '\n';
  const ready = Object.entries(parts).map(([name, value]) => [name + '.json', render(value)]);
  ready.push(['index.json', render(index)]);
  fs.mkdirSync(output, { recursive: true });
  for (const [name, text] of ready) fs.writeFileSync(path.join(output, name), text, 'utf8');
  console.log(`Created ${ready.length} manifests from ${assets.size} unique assets. Original manifest preserved.`);
}
try { main(); } catch (error) { console.error('[Manifest migration]', error.message); process.exitCode = 1; }
