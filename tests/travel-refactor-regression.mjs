import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const acornPath = require.resolve('acorn');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'travel-refactor-test-'));
const fixtures = {"gameSetup.js": "import {createUnifiedTravelManager} from './managers/UnifiedTravelManager.js';\nexport function setupNewGame(){createUnifiedTravelManager().init();return 'ready';}\n", "managers/TravelManager.js": "import {getEnergyManager} from './EnergyManager.js';\nexport function calculateTravelValues(distance,type){const config={minHours:1,hoursPerMapPixel:0.1,baseCost:10,costPerHour:5,energyPerHour:20};const baseTravelHours=Math.max(config.minHours,Math.round(config.minHours+distance*config.hoursPerMapPixel));return {baseTravelHours,moneySpent:Math.round(config.baseCost+baseTravelHours*config.costPerHour),estimatedEnergyChange:-Math.max(2,Math.round(baseTravelHours*config.energyPerHour))};}\n", "gameState/defaultState.js": "export const defaultGameState={energy:100,moneyLog:[],travelHistory:[],unifiedTravelManagerState:null};\n", "gameState/importExport.js": "import {defaultGameState} from './defaultState.js';\nfunction normalizeCaseSuspects(state){state.normalized=true;}\nexport function normalizeImportedState(source){const state={...defaultGameState,...source};normalizeCaseSuspects(state);return state;}\n", "managers/UnifiedTravelManager.js": "export function createUnifiedTravelManager(){return {init(){}};}\n", "managers/EnergyManager.js": "export function getEnergyManager(){return {getTravelCost:type=>type==='plane'?3:5};}\n", "scenes/crimeCity/CrimeCityProgressService.js": "export const untouched=true;\n", "gameStatePersistence.js": "export const untouched=true;\n"};
const runtimeTests = "import assert from 'node:assert/strict';\nimport {migrateLegacyTravelState as migrate} from './gameState/legacyTravelMigration.js';\nimport {normalizeImportedState} from './gameState/importExport.js';\nimport {defaultGameState} from './gameState/defaultState.js';\nimport {calculateTravelValues} from './managers/TravelManager.js';\nimport {setupNewGame} from './gameSetup.js';\nlet count=0;\nconst check=(name,fn)=>{fn();count++;};\ncheck('fresh save',()=>{const s={moneyLog:[],travelHistory:[]};migrate(s);assert.equal(s.legacyTravelArchive,null);});\ncheck('nested old save',()=>{const ledger=[{amount:20}];const s={unifiedTravelManagerState:{costLedger:ledger,lastTravelData:{to:'Paris'}},moneyLog:[{amount:20}],travelHistory:[{to:'Paris'}],energy:77,cash:50};migrate(s);assert.equal(s.legacyTravelArchive.snapshots[0].costLedger[0].amount,20);assert.equal(s.moneyLog.length,1);assert.equal(s.travelHistory.length,1);assert.equal(s.energy,77);assert.equal(s.cash,50);assert.ok(!('unifiedTravelManagerState'in s));ledger[0].amount=99;assert.equal(s.legacyTravelArchive.snapshots[0].costLedger[0].amount,20);});\ncheck('flat old save',()=>{const s={costLedger:[{amount:10}],lastTravelData:{to:'Rome'},lastTravel:{to:'London'}};migrate(s);assert.equal(s.legacyTravelArchive.snapshots[0].origin,'legacyRootFields');assert.equal(s.lastTravel.to,'London');assert.ok(!('costLedger'in s));assert.ok(!('lastTravelData'in s));});\ncheck('both old formats preserved',()=>{const s={costLedger:[{amount:1}],unifiedTravelManagerState:{costLedger:[{amount:2}]}};migrate(s);assert.equal(s.legacyTravelArchive.snapshots.length,2);});\ncheck('idempotent',()=>{const s={costLedger:[{amount:1}]};migrate(s);const once=JSON.stringify(s);migrate(s);assert.equal(JSON.stringify(s),once);});\ncheck('empty old fields',()=>{const s={costLedger:[],unifiedTravelManagerState:null};migrate(s);assert.equal(s.legacyTravelArchive,null);assert.ok(!('costLedger'in s));});\ncheck('future archive rejected without mutation',()=>{const s={legacyTravelArchive:{version:2,snapshots:[]},costLedger:[{}]};const before=structuredClone(s);assert.throws(()=>migrate(s));assert.deepEqual(s,before);});\ncheck('null state rejected',()=>assert.throws(()=>migrate(null)));\ncheck('load normalization calls migration',()=>{const s=normalizeImportedState({costLedger:[{amount:7}],energy:33});assert.equal(s.legacyTravelArchive.snapshots[0].costLedger[0].amount,7);assert.equal(s.normalized,true);assert.equal(s.energy,33);assert.ok(!('costLedger'in s));});\ncheck('new game defaults clean',()=>{assert.equal(defaultGameState.legacyTravelArchive,null);assert.ok(!('unifiedTravelManagerState'in defaultGameState));assert.equal(setupNewGame(),'ready');});\ncheck('single energy cost source',()=>{assert.equal(calculateTravelValues(1,'plane').estimatedEnergyChange,-3);assert.equal(calculateTravelValues(1000,'plane').estimatedEnergyChange,-3);assert.equal(calculateTravelValues(1,'train').estimatedEnergyChange,-5);});\nconsole.log(JSON.stringify({testsPassed:count}));\n";
async function put(file, content) {
  const absolute = path.join(temp, file);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, 'utf8');
}
function run(...args) {
  return execFileSync(process.execPath, [path.join(temp, 'tools/retire-unified-travel.mjs'), ...args], {
    encoding: 'utf8', timeout: 30000
  });
}
try {
  for (const file of ['tools/retire-unified-travel.mjs', 'gameState/legacyTravelMigration.js']) {
    await put(file, await fs.readFile(path.join(project, file), 'utf8'));
  }
  await put('node_modules/acorn/package.json', JSON.stringify({ type: 'module', exports: './index.mjs' }));
  await put('node_modules/acorn/index.mjs',
    `import {createRequire} from 'node:module';const require=createRequire(import.meta.url);export const parse=require(${JSON.stringify(acornPath)}).parse;`);
  for (const [file, source] of Object.entries(fixtures)) await put(file, source);
  run();
  for (const [file, source] of Object.entries(fixtures)) {
    assert.equal(await fs.readFile(path.join(temp, file), 'utf8'), source);
  }
  await put('extra.js', "import U from './managers/UnifiedTravelManager.js';");
  const rejected = spawnSync(process.execPath, [path.join(temp, 'tools/retire-unified-travel.mjs'), '--write'], { encoding: 'utf8' });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Additional UnifiedTravelManager reference/);
  assert.equal(await fs.readFile(path.join(temp, 'gameSetup.js'), 'utf8'), fixtures['gameSetup.js']);
  await fs.unlink(path.join(temp, 'extra.js'));
  run('--write');
  await assert.rejects(fs.access(path.join(temp, 'managers/UnifiedTravelManager.js')));
  assert.match(run('--write'), /Already applied/);
  for (const file of ['scenes/crimeCity/CrimeCityProgressService.js', 'gameStatePersistence.js']) {
    assert.equal(await fs.readFile(path.join(temp, file), 'utf8'), fixtures[file]);
  }
  await put('package.json', '{"type":"module"}');
  await put('runtime-tests.mjs', runtimeTests);
  const result = execFileSync(process.execPath, [path.join(temp, 'runtime-tests.mjs')], {
    encoding: 'utf8', timeout: 30000
  });
  console.log(result.trim());
  console.log('PASS: installer preview, unknown-reference guard, backup/removal, repeat-run guard, untouched service/persistence.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
