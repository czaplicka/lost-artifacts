const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'assets/spritesheet/office/alex-storage.png';
const indexPath = path.join(ROOT, 'assets/manifests/index.json');
const officePath = path.join(ROOT, 'assets/manifests/office.json');
const registryPath = path.join(ROOT, 'sceneRegistry.js');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const backup = file => {
  const copy = file + '.before-alex-mouth.bak';
  if (!fs.existsSync(copy)) fs.copyFileSync(file, copy);
};
try {
  if (!fs.existsSync(path.join(ROOT, URL))) throw new Error(`Missing file ${URL}.`);
  const index = read(indexPath);
  const office = read(officePath);
  if (!Array.isArray(office.assets) || !Array.isArray(index.files)) throw new Error('Unexpected manifest format.');
  if (!index.files.includes('assets/manifests/office.json')) throw new Error('office.json is not included in index.json.');
  const assets = index.files.flatMap(file => read(path.resolve(ROOT, file)).assets || []);
  const matching = assets.filter(a => a.url === URL);
  if (matching.length > 1) throw new Error('The mouth image already has multiple definitions. Remove duplicates before installing.');
  let entry = matching[0];
  if (entry && entry.type !== 'image') throw new Error('Register alex-storage.png as image, not spritesheet.');
  if (!entry) {
    if (assets.some(a => a.key === 'alex-storage' && a.type === 'image')) throw new Error('image:alex-storage already refers to another file.');
    entry = { key: 'alex-storage', url: URL, type: 'image', groups: ['portraits'] };
    office.assets.push(entry);
  }
  const refs = index.bundles?.['scene:AgencyStorageScene'];
  if (!Array.isArray(refs)) throw new Error('Missing scene:AgencyStorageScene bundle.');
  const ref = `image:${entry.key}`;
  if (!refs.includes(ref)) refs.push(ref);
  const registry = fs.readFileSync(registryPath, 'utf8');
  let count = 0;
  const updatedRegistry = registry.replace(
    /(\bAgencyStorageScene\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"])(\.\/scenes\/AgencyStorageScene(?:WithAnimations)?\.js)(['"]\s*\))/g,
    (_m, before, _file, after) => { count++; return before + './scenes/AgencyStorageSceneWithAnimations.js' + after; }
  );
  if (count !== 1) throw new Error('Expected one AgencyStorageScene entry in sceneRegistry.js. Nothing changed.');
  const writes = [[officePath, JSON.stringify(office, null, 2) + '\n'],
    [indexPath, JSON.stringify(index, null, 2) + '\n'], [registryPath, updatedRegistry]];
  for (const [file, text] of writes) {
    if (fs.readFileSync(file, 'utf8') === text) continue;
    backup(file); fs.writeFileSync(file, text, 'utf8');
  }
  console.log(`Alex mouth enabled: ${ref}. Other bundles and registry entries preserved.`);
} catch (error) {
  console.error('[Alex mouth installer]', error.message);
  process.exitCode = 1;
}
