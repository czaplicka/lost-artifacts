// clean-manifests.js
// Reorder fields, sort assets by "key", and deduplicate entries in manifest JSON files.
// Manifest files are located in assets/manifests/*.json
const fs = require('fs');
const path = require('path');

const MANIFEST_DIR = path.join(__dirname, '..', 'assets', 'manifests');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(file, json, 'utf8');
}

function normalizeAsset(asset) {
  // Ensure field order: key, url, type, groups
  return {
    key: asset.key,
    url: asset.url,
    type: asset.type,
    groups: asset.groups,
  };
}

function processFile(filePath) {
  const data = loadJson(filePath);
  if (!Array.isArray(data.assets)) return;
  // deduplicate by key, keep first occurrence
  const seen = new Set();
  const uniq = [];
  for (const a of data.assets) {
    if (seen.has(a.key)) continue; // skip duplicate
    seen.add(a.key);
    uniq.push(normalizeAsset(a));
  }
  // sort by key alphabetically
  uniq.sort((a, b) => a.key.localeCompare(b.key));
  const out = { assets: uniq };
  saveJson(filePath, out);
}

fs.readdirSync(MANIFEST_DIR).forEach(file => {
  if (file.endsWith('.json')) {
    const full = path.join(MANIFEST_DIR, file);
    try {
      processFile(full);
      console.log(`Processed ${file}`);
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }
});
