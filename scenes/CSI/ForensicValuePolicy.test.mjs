import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
const fixture=`
const getForensicHairColorDefinitions=()=>[{id:'brown'},{id:'blonde'},{id:'grey'}];
const normalizeForensicHairColor=v=>v.trim().toLowerCase()==='blond'?'blonde':v.trim().toLowerCase();
const getDustProfiles=()=>[{id:'limestone_dust'},{id:'brick_dust'}];
const getMaterialProfiles=()=>[{id:'wool_lanolin'},{id:'cotton_fiber'}];
const TEXT={title:'BLOCKED',body:'NO RESULT',back:'BACK',toast:'BLOCKED'};
`;
const raw=readFileSync(new URL('./ForensicValuePolicy.js',import.meta.url),'utf8');
const source=fixture+raw.replace(/^import .*;\r?\n/gm,'');
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {normalizeEvidenceValue,normalizeCorrectValue,installForensicValidation}=mod;
let count=0;
const check=(ok,label)=>{assert.ok(ok,label);count++;};
const throws=(fn,code)=>{assert.throws(fn,e=>e.code===code);count++;};
const allowed=['small','medium','large'],normalize=v=>v.trim().toLowerCase();
for(const v of allowed) check(normalizeEvidenceValue({correctValue:v},allowed,normalize)===v,'known value');
check(normalizeEvidenceValue({correctValue:' LARGE ',evidenceConfig:{value:'large'}},allowed,normalize)==='large','safe normalization');
for(const v of ['xl','extra large','',null,undefined,42,{},false]) throws(()=>normalizeEvidenceValue({correctValue:v},allowed,normalize),'CSI_UNSUPPORTED_VALUE');
throws(()=>normalizeEvidenceValue({},allowed,normalize),'CSI_MISSING_VALUE');
throws(()=>normalizeEvidenceValue({correctValue:'large',evidenceConfig:{thief_value:'small'}},allowed,normalize),'CSI_CONFLICTING_VALUES');
throws(()=>normalizeEvidenceValue({correctValue:'large'},allowed,normalize,'medium'),'CSI_DEFAULT_VALUE_FORBIDDEN');
for(const list of [[],['large','xl'],['small'],['large','large'],null]) throws(()=>normalizeEvidenceValue({correctValue:'large',allowedValues:list},allowed,normalize),'CSI_INVALID_ALLOWED_VALUES');
throws(()=>normalizeEvidenceValue({correctValue:'large',evidenceConfig:null},allowed,normalize),'CSI_INVALID_EVIDENCE_CONFIG');
const target={_forensicValueInput:{correctValue:' LARGE '},_forensicValueNormalizer:normalize};
check(normalizeCorrectValue.call(target,allowed)==='large'&&target.correctValue==='large','base helper contract');
function decorate(scene) {
  const objects=[];
  const object=()=>{const o=new EventEmitter();o.scene=scene;o.destroy=()=>{o.scene=null;};
    for(const m of ['setOrigin','setDepth','setInteractive'])o[m]=()=>o;
    objects.push(o);return o;};
  scene.events=new EventEmitter();scene.input={keyboard:new EventEmitter()};scene.scale={width:1000,height:720};
  scene.add={rectangle:object,text:object};scene.objects=objects;scene.stops=0;scene.toasts=[];
  scene.scene={manager:{keys:{CrimeLabScene:{showToast:message=>scene.toasts.push(message),labManager:{getCaseKey:()=> 'case-1'}}}},
    stop(){scene.stops++;scene.events.emit('shutdown');}};
  return scene;
}
function make(key) {
  class MockBase {
    constructor(){decorate(this);installForensicValidation(this,key,()=>{this.baseCreated=true;});}
    normalizeCorrectValue(values,fallback=null){return normalizeCorrectValue.call(this,values,fallback);}
  }
  class MockScene extends MockBase {
    init(data){this.originalInitCalls=(this.originalInitCalls||0)+1;this.correctValue=data.correctValue||'BAD_FALLBACK';
      this.evidenceConfig=data.evidenceConfig;this.clue={};if(this.failInit)throw Error('dictionary unavailable');}
    create(){this.originalCreateCalls=(this.originalCreateCalls||0)+1;}
    finishMinigame(){this.finishedCalls=(this.finishedCalls||0)+1;}
    returnResultToCrimeLab(){this.resultCalls=(this.resultCalls||0)+1;}
  }
  return new MockScene();
}
const cases=[['HairAnalysisScene','hair_color','brown'],['BloodAnalysisScene','blood_type','O+'],
 ['DnaGenderScene','dna_gender','XY'],['FingerprintPatternScene','fingerprint_pattern','ARCH'],
 ['ShoeprintScene','shoe_size_category','large'],['ToolmarkAnalysisScene','handedness','left'],
 ['ToolmarkAnalysisScene','dust_profile','limestone_dust'],['ChemicalResidueScene','dust_profile','brick_dust'],
 ['MaterialAnalysisScene','material_profile','wool_lanolin']];
const originalError=console.error;console.error=()=>{};
try {
 for(const [key,field,value] of cases) {
  const scene=make(key),data={correctValue:value,evidenceType:field,evidenceConfig:{thief_value:value,attribute:field},caseKey:'case-1'};
  const before=JSON.stringify(data);scene.init(data);scene.create();
  check(scene.originalInitCalls===1&&scene.originalCreateCalls===1,key+' runs');
  check(scene.correctValue===value,key+' retains canonical value');
  check(JSON.stringify(data)===before,key+' does not mutate input');
  scene.finishMinigame();check(scene.finishedCalls===1,key+' completes valid analysis');
  const bad=make(key);bad.init({...data,correctValue:'NOT_A_VALUE'});bad.create();
  check(!bad.originalInitCalls&&!bad.originalCreateCalls,key+' blocks before legacy init');
  check(bad.correctValue===null,key+' cannot invent a value');
  bad.finishMinigame();bad.returnResultToCrimeLab();
  check(!bad.finishedCalls&&!bad.resultCalls,key+' blocks success');
  const emitted=[];bad.events.on('minigame-closed',e=>emitted.push(e));bad.events.on('minigame-complete',()=>assert.fail('unexpected completion'));
  bad.input.keyboard.emit('keydown-ESC',{});bad.input.keyboard.emit('keydown-ESC',{});
  check(bad.stops===1&&emitted.length===1,key+' closes once');
  check(emitted[0].aborted&&emitted[0].completed===false&&emitted[0].schemaVersion===1,key+' abort envelope');
  check(!('value' in emitted[0].payload)&&!('evidenceConfig' in emitted[0].payload),key+' no secret in error');
  check(bad.toasts.length===1,key+' laboratory feedback');
  bad.init(data);bad.create();check(bad.originalCreateCalls===1,key+' can restart after error');
 }
 const mutated=make('ShoeprintScene');mutated.init({correctValue:'large'});mutated.create();mutated.correctValue='medium';mutated.returnResultToCrimeLab();
 check(!mutated.resultCalls,'post-init mutation blocked');
 const throwing=make('BloodAnalysisScene');throwing.failInit=true;throwing.init({correctValue:'A+'});throwing.create();
 check(throwing.baseCreated&&!throwing.originalCreateCalls,'derived initialization exception becomes recoverable UI');
 const unrelated={init(){return 'original';},create(){return 'original';}};
 const before=unrelated.init;installForensicValidation(unrelated,'CityScene',()=>{});
 check(unrelated.init===before,'non-CSI scenes untouched');
 const p=make('ChemicalResidueScene');p.init({preview:true});p.create();
 check(p.originalCreateCalls===1,'explicit training remains available');
} finally {console.error=originalError;}
console.log(`${count} assertions passed; mocked catalogs and Phaser lifecycle.`);
