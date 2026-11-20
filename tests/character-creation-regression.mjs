import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const patchSource=await fs.readFile(path.join(root,'ui/characterCreation/patchCharacterCreationDOM.js'),'utf8');
const {patchCharacterCreationDOM:patch}=await load(patchSource);
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}

// Small DOM fixture: identity/attribute/child reconciliation, not a browser layout engine.
class Node {
 constructor(tag=null,value=''){
  this.nodeType=tag?1:3;this.tagName=tag;this.nodeValue=value;this.attrs=new Map();this.childNodes=[];this.parentNode=null;
  this._value='';this.valueWrites=0;this.attributeWrites=0;this.checked=false;
 }
 get attributes(){return [...this.attrs].map(([name,value])=>({name,value}));}
 get id(){return this.getAttribute('id')||'';}
 get firstChild(){return this.childNodes[0]||null;}
 get nextSibling(){if(!this.parentNode)return null;const list=this.parentNode.childNodes;return list[list.indexOf(this)+1]||null;}
 get value(){return this._value;}set value(value){this.valueWrites++;this._value=value;}
 hasAttribute(name){return this.attrs.has(name);}
 getAttribute(name){return this.attrs.get(name)??null;}
 setAttribute(name,value){this.attributeWrites++;this.attrs.set(name,String(value));}
 removeAttribute(name){this.attrs.delete(name);}
 insertBefore(node,before){
  if(node===before)return node;
  if(node.parentNode)node.parentNode.removeChild(node);
  const index=before===null?this.childNodes.length:this.childNodes.indexOf(before);
  assert.ok(index>=0);this.childNodes.splice(index,0,node);node.parentNode=this;return node;
 }
 removeChild(node){const index=this.childNodes.indexOf(node);assert.ok(index>=0);this.childNodes.splice(index,1);node.parentNode=null;return node;}
 append(...nodes){for(const node of nodes)this.insertBefore(node,null);return this;}
 cloneNode(deep){const node=new Node(this.tagName,this.nodeValue);node.attrs=new Map(this.attrs);node._value=this._value;node.checked=this.checked;if(deep)for(const child of this.childNodes)node.append(child.cloneNode(true));return node;}
}
function el(tag,attrs={},...children){const node=new Node(tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node.append(...children);}
const text=value=>new Node(null,value);
const chip=(value,selected)=>el('BUTTON',{'data-appearance-category':'hairStyle','data-appearance-value':value,'aria-pressed':String(selected)},text(value));
await test('chip nodes remain identical while selection changes',()=>{
 const first=chip('neat',true),second=chip('long',false),root=el('DIV',{},first,second);
 second.customState={focus:true};patch(root,el('DIV',{},chip('neat',false),chip('long',true)));
 assert.equal(root.childNodes[1],second);assert.equal(root.childNodes[0],first);
 assert.equal(second.getAttribute('aria-pressed'),'true');assert.equal(second.customState.focus,true);
});
await test('unchanged input does not rewrite its value or caret fixture',()=>{
 const input=el('INPUT',{'data-character-name':''});input._value='Sam';input.selectionStart=2;
 const next=input.cloneNode(true);const writes=input.valueWrites;patch(input,next);
 assert.equal(input.valueWrites,writes);assert.equal(input.selectionStart,2);
});
await test('changed model updates the existing input node',()=>{
 const input=el('INPUT',{'data-character-name':''});input._value='Sam';const next=input.cloneNode(true);next._value='Alex';
 patch(input,next);assert.equal(input.value,'Alex');
});
await test('unchanged canvas is retained and its size is not reset',()=>{
 const canvas=el('CANVAS',{'data-avatar-canvas':'',width:'358',height:'512'});canvas.bitmap='existing';
 const root=el('DIV',{},canvas);const writes=canvas.attributeWrites;patch(root,root.cloneNode(true));
 assert.equal(root.childNodes[0],canvas);assert.equal(canvas.bitmap,'existing');assert.equal(canvas.attributeWrites,writes);
});
await test('persistent status remains while stale children are removed',()=>{
 const old=el('P',{},text('old'));const status=el('DIV',{'data-character-persistent':'avatar-status'});
 const root=el('DIV',{},old,status);patch(root,el('DIV',{},el('SPAN',{},text('new'))));
 assert.ok(root.childNodes.includes(status));assert.ok(!root.childNodes.includes(old));
});
await test('switching steps replaces only the keyed panel',()=>{
 const navigation=el('BUTTON',{'data-step':'0'}),panel=el('DIV',{'data-step-panel':'0'});
 const root=el('DIV',{},navigation,panel);patch(root,el('DIV',{},navigation.cloneNode(true),el('DIV',{'data-step-panel':'1'})));
 assert.equal(root.childNodes[0],navigation);assert.notEqual(root.childNodes[1],panel);assert.equal(root.childNodes[1].getAttribute('data-step-panel'),'1');
});
await test('incompatible root is rejected',()=>assert.throws(()=>patch(el('DIV'),el('SECTION'))));

const sceneSource=await fs.readFile(path.join(root,'scenes/CharacterCreationScene.js'),'utf8');
const tree=parse(sceneSource,{ecmaVersion:'latest',sourceType:'module'});
let stripped=sceneSource;
for(const node of tree.body.filter(node=>node.type==='ImportDeclaration').reverse())stripped=stripped.slice(0,node.start)+stripped.slice(node.end);
const stubs=`
class BaseScene {constructor(){this._cleanupDone=false;this.sys={isActive:()=>true};}}
const createDefaultPlayerData=()=>({name:'Sam',alias:'Alias',profile:'analyst',difficulty:'field',appearance:{hairStyle:'neat'},stats:{observation:1,deduction:1,rapport:1,resourcefulness:1}});
const STAT_IDS=['observation','deduction','rapport','resourcefulness'];
const __dialogueText=(source,id)=>id;
const AVATAR_CONFIG={CROP_KEY:'base'};
export const avatarManager={failed:new Set(),bind(){},hasTexture(){return false;},isOptionAvailable(){return true;},ensureLoaded:async()=>({ok:false,missing:['base']})};
const getAppearanceSummary=()=>'',getWitnessLine=()=>'',createRandomIdentity=()=>({name:'Alex',alias:'A'}),randomAppearance=()=>({hairStyle:'long'});
`;
const {CharacterCreationScene:Scene,avatarManager}=await load(stubs+stripped);
function prepared(){
 const s=new Scene();s.init();s.domElement={node:{}};s.refreshed=0;s.previewUpdates=0;
 s.refresh=()=>s.refreshed++;s.updateAvatarPreview=()=>s.previewUpdates++;
 s.game={scene:{keys:{}}};s.load={list:{entries:[]},inflight:{entries:[]},queue:{entries:[]}};
 return s;
}
await test('refresh no longer calls Phaser setHTML',()=>assert.ok(!/\.setHTML\s*\(/.test(sceneSource)));
await test('error result ends loading and enables a retry',async()=>{
 const s=prepared();avatarManager.failed.clear();avatarManager.hasTexture=()=>false;
 avatarManager.ensureLoaded=async()=>({ok:false,missing:['base']});
 await s.ensureAvatarAssets();assert.equal(s._avatarLoadState,'error');assert.equal(s._avatarLoadPromise,null);assert.match(s._avatarLoadMessage,/retry/i);
});
await test('successful result leaves ready state',async()=>{
 const s=prepared();avatarManager.hasTexture=()=>true;avatarManager.ensureLoaded=async()=>({ok:true,missing:[]});
 await s.ensureAvatarAssets();assert.equal(s._avatarLoadState,'ready');assert.equal(s._avatarLoadPromise,null);
});
await test('concurrent scene requests reuse one promise',async()=>{
 const s=prepared();let finish,calls=0;
 avatarManager.ensureLoaded=()=>{calls++;return new Promise(resolve=>finish=resolve);};
 const a=s.ensureAvatarAssets(),b=s.ensureAvatarAssets();assert.equal(a,b);
 await Promise.resolve();assert.equal(calls,1);finish({ok:true,missing:[]});await a;
});
await test('late load completion does not refresh an ended run',async()=>{
 const s=prepared();let finish;avatarManager.ensureLoaded=()=>new Promise(resolve=>finish=resolve);
 const pending=s.ensureAvatarAssets();await Promise.resolve();s._runToken=null;
 finish({ok:true,missing:[]});await pending;assert.equal(s.refreshed,0);
});
await test('retry releases only completed failures across all scene loaders',()=>{
 const s=prepared();avatarManager.failed=new Set(['done','live']);
 s.game.scene.keys.other={load:{inflight:{entries:[{key:'live',type:'image'}]}}};
 s._releaseCompletedAvatarFailures();assert.ok(!avatarManager.failed.has('done'));assert.ok(avatarManager.failed.has('live'));
 assert.deepEqual(s._avatarRetryDeferred,['live']);
});
await test('unavailable appearance option is ignored',()=>{
 const s=prepared();avatarManager.isOptionAvailable=()=>false;
 s._handleCharacterButton({dataset:{appearanceCategory:'hairStyle',appearanceValue:'long'}});
 assert.equal(s.playerData.appearance.hairStyle,'neat');assert.equal(s.refreshed,0);
 avatarManager.isOptionAvailable=()=>true;
});
console.log(passed+' regression cases passed (DOM/scene fixtures, not a real browser).');
