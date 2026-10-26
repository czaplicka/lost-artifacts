const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const source = fs.readFileSync(path.join(ROOT, 'managers/ManifestLoader.js'), 'utf8');
  const { compileManifest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifests/index.json'), 'utf8'));
  const parts = index.files.map(file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')));
  const manifest = compileManifest(index, parts);
  console.log(`OK: ${manifest.assetCatalog.length} assets, ${Object.keys(manifest.bundles).length} bundles.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
