import {gameState} from '../../GameData.js';
import {requestAutosave} from '../../gameStatePersistence.js';
import {getSearchProgress,discoverSearchKeywords,validateSearchData} from './ComputerSearchShared.js';
const CASE='pi_open_skies',KEY=Symbol.for('lost-artifacts.open-skies.research.v1');
const URL='assets/data/web/missions/open-skies/search.json';
export const OPEN_SKIES_SOUND_TERMS=[['traffic','Traffic'],['bells','Church bells'],['rain','Rain'],['sea','Sea'],['train','Train'],['thunder','Thunderstorm'],['voices','Crowd'],['siren','Siren']];
const progress=()=>gameState.piQuests?.quests?.[CASE]?.metadata?.openSkies;
export function mergeOpenSkiesSearch(data,definition){
 if(!Array.isArray(data?.cases))return data;
 const filtered=data.cases.filter(d=>d.id!==CASE);
 return {...data,cases:definition?[...filtered,JSON.parse(JSON.stringify(definition))]:filtered};
}
export function installOpenSkiesResearch(ui){
 if(ui[KEY])return ui[KEY];
 const search=ui.search,restorers=[];
 let dead=false,definition=null,pending=null,controller=null,error='',regionIndex=0,status='';
 const wrap=(target,key,factory)=>{const old=target[key],next=factory(old);target[key]=next;restorers.push(()=>{if(target[key]===next)target[key]=old;});};
 const available=()=>!!progress()?.collectedAt;
 function refresh(){if(!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting)ui.render();}
 function sync(){
  if(!search.data)return;
  const existing=search.data.cases?.find(d=>d.id===CASE),want=available()?definition:null;
  if((!want&&!existing)||(want&&existing?.revision===want.revision))return;
  search.data=mergeOpenSkiesSearch(search.data,want);
 }
 async function load(){
  if(dead||definition||!available())return definition;
  if(pending)return pending;
  error='';controller=new AbortController();
  pending=(async()=>{
   try{const response=await fetch(URL,{signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const raw=validateSearchData(await response.json()),entry=raw.cases.find(d=>d.id===CASE);
    if(!entry)throw new Error('Open Skies search definition missing');if(dead)return null;
    definition=entry;sync();return definition;
   }catch(e){if(!dead&&e.name!=='AbortError'){console.error('[OpenSkiesResearch]',e);error='Search pages could not be loaded.';}return null;}
   finally{pending=null;refresh();}
  })();return pending;
 }
 function addTerm(id){
  if(!available()||!definition?.keywords.some(k=>k.id===id))return false;
  const p=progress(),terms=Array.isArray(p.researchTerms)?p.researchTerms:[];
  if(!terms.includes(id)){
   const root=gameState.piQuests,q=root.quests[CASE];gameState.piQuests={...root,quests:{...root.quests,[CASE]:{...q,metadata:{...q.metadata,openSkies:{...p,researchTerms:[...terms,id]}}}}};
   requestAutosave();
  }
  const known=getSearchProgress().cases[CASE]?.known||[];if(!known.includes(id))discoverSearchKeywords(CASE,[id]);return true;
 }
 function known(id){return getSearchProgress().cases[CASE]?.known?.includes(id)||false;}
 async function openSearch(){
  if(!available()||dead)return;
  if(!(getSearchProgress().cases[CASE]?.known||[]).length){status='Choose at least one research term first.';refresh();return;}
  status='';if(!await load()||!available()||dead)return;
  await search.load();if(dead||!available()||ui.destroyed||!ui.isOpen||ui.suspended)return;
  sync();if(!search.data?.cases.some(d=>d.id===CASE))return;
  ui.openApp('search');search.selectCase(CASE);
 }
 function recordVisit(){
  if(ui.app!=='search'||!available()||search.definition?.id!==CASE||search.view!=='page'||!definition?.pages.some(p=>p.id===search.pageId))return;
  const p=progress(),visited=Array.isArray(p.visitedPages)?p.visitedPages:[];if(visited.includes(search.pageId))return;
  const root=gameState.piQuests,q=root.quests[CASE];gameState.piQuests={...root,quests:{...root.quests,[CASE]:{...q,metadata:{...q.metadata,openSkies:{...p,visitedPages:[...visited,search.pageId]}}}}};requestAutosave();
 }
 wrap(search,'load',old=>async function(...args){const result=await old.apply(this,args);await load();if(!dead)sync();return result;});
 wrap(search,'render',old=>function(...args){sync();const result=old.apply(this,args);recordVisit();return result;});
 function render(box){
  const d=ui.drawing,x=box.x,y=box.y,w=box.w;
  const button=(bx,by,bw,label,fn,active=false)=>{
   d.bevel(bx,by,bw,29,active?0xb3c6ae:0xe4dcc8);d.text(bx+bw/2,by+7,label,14,'#293936').setOrigin(.5,0);
   d.rectangle(bx,by,bw,29,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(dead)return;ui.options.onSfx?.('click');fn();});
  };
  if(!definition){d.text(x,y,error||'Loading research pages...',17,'#514837',w);
   if(error)button(x,y+45,100,'RETRY',()=>void load());else void load();return;}
  d.text(x,y,'Choose your own research terms. No sound is identified automatically.',16,'#514837',w);
  button(x,y+57,w,'Open Skies Foundation',()=>{addTerm('foundation');refresh();},known('foundation'));
  d.text(x,y+105,'Sound hypotheses',17,'#273f4b');
  OPEN_SKIES_SOUND_TERMS.forEach(([id,label],i)=>{const bw=(w-12)/2,bx=x+(i%2)*(bw+12),by=y+139+Math.floor(i/2)*37;
   button(bx,by,bw,label,()=>{addTerm(id);refresh();},known(id));});
  const regions=definition.keywords.filter(k=>k.id.startsWith('region_')).sort((a,b)=>a.label.localeCompare(b.label,'en'));regionIndex=Math.min(regionIndex,regions.length-1);
  const region=regions[regionIndex];
  d.text(x,y+302,'Region to research',17,'#273f4b');
  button(x,y+335,35,'<',()=>{regionIndex=(regionIndex+regions.length-1)%regions.length;refresh();});
  d.text(x+48,y+342,region.label,14,'#38332c',w-96);
  button(x+w-35,y+335,35,'>',()=>{regionIndex=(regionIndex+1)%regions.length;refresh();});
  button(x,y+380,180,'ADD REGION',()=>{addTerm(region.id);refresh();},known(region.id));
  button(x+195,y+380,150,'OPEN OWL',()=>void openSearch());
  if(status)d.text(x,y+426,status,14,'#75462f',w);
 }
 let disposed=false;function destroy(){if(disposed)return;disposed=true;dead=true;controller?.abort();for(const undo of restorers.reverse())undo();ui.scene.events.off('shutdown',destroy);delete ui[KEY];}
 const api={render,destroy,load,addTerm,openSearch};ui[KEY]=api;ui.scene.events.once('shutdown',destroy);return api;
}
