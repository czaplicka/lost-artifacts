import assert from 'node:assert/strict';
import {parseLockpickPrice,planLockpickShop,ORIGINAL_STOCK,LOCKPICK_STOCK} from './pi-lockpick-shop-model.mjs';
let checks=0;const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
for(const invalid of ['',null,'0','-1','1.5','free','NaN','9007199254740992']){assert.throws(()=>parseLockpickPrice(invalid));checks++;}
equal(parseLockpickPrice(' 75 '),75);
const catalog={evidence:{lockpick:{id:'evidence_lockpick',name:'Lockpick Set',type:'evidence',stackable:false},rope:{id:'rope'}},equipment:{camera:{id:'camera'}}};
const input={catalogText:JSON.stringify(catalog),locationsText:"const L={company:'Custom name',lockpicksItemId:null};",stockText:ORIGINAL_STOCK,productText:null};
const plan=planLockpickShop(input,75);equal(plan.price,75);equal(JSON.parse(plan.files['assets/data/ItemsCatalog.json']).equipment.lockpick.id,'evidence_lockpick');equal(JSON.parse(plan.files['assets/data/ItemsCatalog.json']).equipment.lockpick.type,'tool');
equal(plan.files['config/TableForThreeLocations.js'].includes('Custom name'),true);equal(plan.files['config/spyShopStock.js'],LOCKPICK_STOCK);
const again=planLockpickShop({catalogText:plan.files['assets/data/ItemsCatalog.json'],locationsText:plan.files['config/TableForThreeLocations.js'],stockText:plan.files['config/spyShopStock.js'],productText:plan.files['config/piLockpickProduct.js']},75);equal(again.files,plan.files);
assert.throws(()=>planLockpickShop({...input,stockText:'custom stock logic'},75));checks++;
assert.throws(()=>planLockpickShop({...input,productText:'custom product'},75));checks++;
console.log(JSON.stringify({checks,result:'PASS'}));
