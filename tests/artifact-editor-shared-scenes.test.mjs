import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan, catalog, load} from '../supabase/functions/artifact-editor/engine.mjs';
function fixture(){
 const original={city:'Paris',country:'France',scene:'louvre',location:'The Louvre Museum',artifact:'Original',artifactKey:'artifact_original'};
 const items=Array.from({length:6},(_,i)=>({id:'item_'+i,scene:['louvre']}));
 const fs=new Map(Object.entries({
 'assets/data/locations.json':JSON.stringify([{id:'paris',city:'Paris',country:'France',isCrimeCity:true}]),
 'assets/data/missions.json':JSON.stringify([original]),
 'assets/data/objects.json':JSON.stringify(items),
 'assets/crimes/louvre.json':JSON.stringify({layers:[{name:'HiddenObjects',objects:items.map(o=>({name:o.id}))}]}),
 'assets/manifests/index.json':JSON.stringify({version:2,files:[],bundles:{shared:[]}}),
 'assets/artifacts/spoon.webp':'fixture-image'
 }));
 const read=async p=>fs.get(p)??null;
 const form={artifactId:'paris_spoon',cityId:'paris',sceneId:'louvre',name:'Ceremonial Spoon',description:'Description',significance:'Significance',clue:'A clue',narrative:'Story',image:{path:'assets/artifacts/spoon.webp'}};
 const apply=plan=>plan.files.forEach(f=>fs.set(f.path,f.content));
 return {fs,read,form,original,apply};
}
test('adds a mission without changing the original or shared scene',async()=>{
 const {read,form,original}=fixture(),plan=await buildPlan(form,read);
 const missions=JSON.parse(plan.files.find(f=>f.path==='assets/data/missions.json').content);
 assert.equal(missions.length,2);assert.deepEqual(missions[0],original);
 assert.equal(missions[1].scene,'louvre');assert.equal(missions[1].image,form.image.path);assert.equal(missions[1].artifactImage,form.image.path);
 assert(!plan.files.some(f=>f.path==='assets/data/locations.json'||f.path.includes('/crimes/')||f.path.includes('/objects')));
});
test('supports multiple artifacts sharing one scene',async()=>{
 const {read,form,apply}=fixture();apply(await buildPlan(form,read));
 apply(await buildPlan({...form,artifactId:'paris_fork',name:'Fork'},read));
 const c=await catalog(read);assert.equal(c.scenes.length,1);assert.equal(c.allArtifacts.length,3);
});
test('editing does not duplicate the mission and replaces stale image aliases',async()=>{
 const {read,form,apply}=fixture();apply(await buildPlan(form,read));
 const loaded=await load(read,form.artifactId);loaded.name='Edited spoon';
 const plan=await buildPlan(loaded,read);apply(plan);
 const missions=JSON.parse(await read('assets/data/missions.json'));
 assert.equal(missions.length,2);assert.equal(missions[1].artifact,'Edited spoon');
 assert.equal(missions[1].image,form.image.path);
});
test('rejects artifact ID reuse without explicitly loading it',async()=>{
 const {read,form,apply}=fixture();apply(await buildPlan(form,read));
 await assert.rejects(buildPlan(form,read),/zajęte/);
});
test('rejects unknown scenes',async()=>{
 const {read,form}=fixture();await assert.rejects(buildPlan({...form,sceneId:'new_room'},read),/istniejące/);
});
test('rejects missing images',async()=>{
 const {read,form}=fixture();await assert.rejects(buildPlan({...form,image:{path:'assets/artifacts/missing.webp'}},read),/grafiki/);
});
