import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsSource = await fs.readFile(path.join(root, 'config/AvatarParts.js'), 'utf8');
const partsURL = 'data:text/javascript;base64,' + Buffer.from(partsSource).toString('base64');
const parts = await import(partsURL);
const managerSource = await fs.readFile(path.join(root, 'managers/AvatarManager.js'), 'utf8');
const importPath = "'../config/AvatarParts.js'";
assert.ok(managerSource.includes(importPath), 'Expected AvatarManager config import.');
const managerURL = 'data:text/javascript;base64,' + Buffer.from(
  managerSource.replace(importPath, JSON.stringify(partsURL))
).toString('base64');
const { AvatarManager } = await import(managerURL);
const { APPEARANCE_OPTIONS: options, DEFAULT_APPEARANCE: defaults, findOption,
  normalizeAppearance, migrateLegacyAppearance, LAYER_ORDER, collectPlannedArt,
  getAppearanceSummary } = parts;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const manager = new AvatarManager();
manager.textures = { exists: () => true };
function enabled(pairs, fn) {
  const previous = pairs.map(([category,id]) => {
    const option = findOption(category,id); const ready = option.ready;
    option.ready = true; return [option,ready];
  });
  try { fn(); } finally { for (const [option,ready] of previous) option.ready=ready; }
}

test('default coat is an available no-art option', () => {
  assert.equal(defaults.coat,'none');
  assert.equal(manager.isOptionAvailable('coat',defaults.coat),true);
});
test('separate headwear category', () => {
  assert.equal(defaults.headwear,'none');
  assert.equal(findOption('hairStyle','hat'),null);
  assert.equal(findOption('headwear','hat').art[0].slot,'headwear');
  assert.ok(!findOption('headwear','hat').suppress.includes('hairFront'));
});
test('legacy hat migration is non-mutating and idempotent', () => {
  const original={hairStyle:'hat',hairColor:'red'};
  const migrated=normalizeAppearance(original);
  assert.equal(original.hairStyle,'hat');
  assert.equal(migrated.hairStyle,defaults.hairStyle);
  assert.equal(migrated.headwear,'hat');assert.equal(migrated.hairColor,'red');
  assert.deepEqual(normalizeAppearance(migrated),migrated);
});
test('hairstyle and headwear remain independent', () => {
  const a=normalizeAppearance({hairStyle:'long',headwear:'hat'});
  assert.equal(a.hairStyle,'long');assert.equal(a.headwear,'hat');
});
test('existing jewellery migration retained', () => {
  const a=normalizeAppearance({accessory:'earring'});
  assert.equal(a.accessory,'none');assert.equal(a.jewelry,'earring');
});
test('invalid appearance input is safe', () => {
  assert.deepEqual(normalizeAppearance(null),defaults);
  assert.deepEqual(normalizeAppearance([]),defaults);
});
test('clothing accessories preserve asset paths and keys', () => {
  for(const id of ['scarf','notebook']) {
    const layer=findOption('accessory',id).art[0];
    assert.equal(layer.key,'av_clothing_'+id);
    assert.equal(layer.file,`assets/avatar/clothing/${id}.webp`);
    assert.equal(layer.slot,'clothingAccessory');
    assert.ok(LAYER_ORDER.indexOf(layer.slot)>LAYER_ORDER.indexOf('clothing'));
  }
});
test('actual resolveLayers sorts scarf and notebook above coat', () => {
  enabled([['coat','trench'],['accessory','scarf'],['accessory','notebook']],()=>{
    for(const id of ['scarf','notebook']) {
      const {layers}=manager.resolveLayers({coat:'trench',accessory:id});
      const coat=layers.findIndex(layer=>layer.key==='av_clothing_trench');
      const accessory=layers.findIndex(layer=>layer.key==='av_clothing_'+id);
      assert.ok(coat>=0 && accessory>coat);
    }
  });
});
test('actual resolveLayers keeps hair beneath hat', () => {
  enabled([['headwear','hat']],()=>{
    const {layers}=manager.resolveLayers({hairStyle:'neat',headwear:'hat'});
    const hair=layers.findIndex(layer=>layer.key==='sketch_hair');
    const hat=layers.findIndex(layer=>layer.key==='av_headwear_hat');
    assert.ok(hair>=0 && hat>hair);
    assert.match(getAppearanceSummary({headwear:'hat'}),/Fedora/);
  });
});
test('planned art is not enabled by the fix', () => {
  for(const [category,id] of [['coat','trench'],['headwear','hat'],['accessory','scarf'],['accessory','notebook']]) {
    assert.equal(findOption(category,id).ready,false);
    assert.equal(manager.isOptionAvailable(category,id),false);
  }
  const todo=collectPlannedArt();
  assert.ok(todo.some(entry=>entry.category==='headwear'&&entry.option==='hat'));
});
test('existing misspelled asset filenames remain exact', () => {
  for(const [category,id,file] of [
    ['hairStyle','swept','big_forhead'],['facialHair','goatee','gotee'],
    ['jewelry','earring','earings'],['jewelry','necklace','neckles'],['tattoos','ink','tatoo']
  ]) {
    const entry=findOption(category,id).art[0];
    assert.equal(entry.file,`assets/ui/${file}.webp`);assert.equal(entry.key,file);
  }
});
test('manifest has valid default choices and drawing slots', () => {
  for(const [category,group] of Object.entries(options)) {
    assert.ok(findOption(category,defaults[category]),category);
    assert.equal(new Set(group.options.map(option=>option.id)).size,group.options.length);
    for(const option of group.options) for(const layer of option.art) {
      assert.ok(LAYER_ORDER.includes(layer.slot),layer.slot);
    }
  }
});
console.log(`${passed} tests passed; textures are mocked, no visual rendering test.`);
