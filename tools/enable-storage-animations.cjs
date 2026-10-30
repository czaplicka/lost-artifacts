const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'sceneRegistry.js');
const oldPath = './scenes/AgencyStorageScene.js';
const newPath = './scenes/AgencyStorageSceneWithAnimations.js';
try {
  const source = fs.readFileSync(file, 'utf8');
  const pattern = /(\bAgencyStorageScene\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"])(\.\/scenes\/AgencyStorageScene(?:WithAnimations)?\.js)(['"]\s*\))/g;
  let found = 0;
  const updated = source.replace(pattern, (match, before, current, after) => {
    found++;
    if (current !== oldPath && current !== newPath) throw new Error('Unexpected scene path.');
    return before + newPath + after;
  });
  if (found !== 1) throw new Error(`Expected exactly one AgencyStorageScene registry entry, found ${found}. Nothing changed.`);
  if (updated === source) {
    console.log('Storage animations are already enabled. No changes.');
  } else {
    const backup = file + '.before-storage-animations.bak';
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, source, 'utf8');
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Enabled AgencyStorageSceneWithAnimations. All other registry entries preserved.');
  }
} catch (error) {
  console.error('[Storage animation installer]', error.message);
  process.exitCode = 1;
}
