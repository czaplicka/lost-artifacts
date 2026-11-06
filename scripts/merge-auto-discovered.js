// merge-auto-discovered.js
// Moves all assets from auto-discovered.json into other.json (or creates appropriate manifests).
const fs = require('fs');
const path = require('path');

const MANIFEST_DIR = path.join(__dirname, '..', 'assets', 'manifests');
const AUTO_PATH = path.join(MANIFEST_DIR, 'auto-discovered.json');
const OTHER_PATH = path.join(MANIFEST_DIR, 'other.json');

function load(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8'); }

const auto = load(AUTO_PATH);
const other = load(OTHER_PATH);

if (!Array.isArray(auto.assets) || !Array.isArray(other.assets)) {
  console.error('Invalid manifest structure');
  process.exit(1);
}

// Merge assets, dedupe by key (keep existing from other, then add new from auto)
const existingKeys = new Set(other.assets.map(a => a.key));
const merged = other.assets.slice();
for (const a of auto.assets) {
  if (!existingKeys.has(a.key)) {
    merged.push(a);
    existingKeys.add(a.key);
  }
}

// Sort by key
merged.sort((a, b) => a.key.localeCompare(b.key));

save(OTHER_PATH, { assets: merged });
// Optionally delete auto-discovered.json
fs.unlinkSync(AUTO_PATH);
console.log('Merged auto-discovered into other.json and removed auto-discovered.json');
