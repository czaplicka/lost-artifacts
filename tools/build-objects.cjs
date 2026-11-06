const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets/data/objects-source');
const read = name => JSON.parse(fs.readFileSync(path.join(source, name), 'utf8'));
const manifest = read('_manifest.json');
const scenes = manifest.scenes;
if (!Array.isArray(scenes) || new Set(scenes).size !== scenes.length) throw Error('Invalid scene manifest');
for (const scene of scenes) if (!/^[a-z0-9_]+$/.test(scene)) throw Error('Invalid scene ID: ' + scene);
const files = ['shared.json', ...scenes.map(scene => scene + '.json')];
const byId = new Map();
for (const file of files) {
  const items = read(file);
  if (!Array.isArray(items)) throw Error(file + ': expected an array');
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) throw Error(file + ': invalid ID');
    if (byId.has(item.id)) throw Error('Duplicate ID: ' + item.id);
    if (!Array.isArray(item.scene) || item.scene.some(scene => !scenes.includes(scene))) throw Error(item.id + ': invalid scene');
    if (new Set(item.scene).size !== item.scene.length) throw Error(item.id + ': duplicate scene');
    if (file !== 'shared.json' && (item.scene.length !== 1 || file !== item.scene[0] + '.json')) throw Error(item.id + ': move multi-scene items to shared.json');
    byId.set(item.id, item);
  }
}
const order = manifest.order;
if (!Array.isArray(order) || new Set(order).size !== order.length) throw Error('Invalid order manifest');
const missing = order.filter(id => !byId.has(id));
if (missing.length) throw Error('Missing original IDs (update manifest explicitly for deliberate removal): ' + missing.join(', '));
const all = [...order.map(id => byId.get(id)), ...[...byId.values()].filter(item => !order.includes(item.id))];
const outputs = new Map([['assets/data/objects.json', all]]);
for (const scene of scenes) outputs.set('assets/data/objects/' + scene + '.json', all.filter(item => item.scene.includes(scene)));
if (process.argv.includes('--check')) {
  for (const [file, value] of outputs) {
    const target = path.join(root, file);
    if (!fs.existsSync(target) || JSON.stringify(JSON.parse(fs.readFileSync(target, 'utf8'))) !== JSON.stringify(value)) throw Error('Outdated generated file: ' + file);
  }
  console.log('OK: generated JSON matches source files.');
} else {
  for (const [file, value] of outputs) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = target + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
    fs.renameSync(temporary, target);
  }
  console.log('Built ' + all.length + ' objects and ' + scenes.length + ' scene files.');
}
