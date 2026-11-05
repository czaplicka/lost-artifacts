import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { knownWords,cloudCase,namingOptions,createCloud,nameCloud,addCloudWords,removeCloudWords,deleteCloud,linkClouds,unlinkClouds,unsortedWords,cloudTitle } from './PlayerCloudModel.js';
import { useCloudKeyword } from './PlayerCloudContacts.js';
const CSS=`
.pcn{position:fixed;z-index:11000;left:8px;right:8px;bottom:0;font-family:SpecialElite,'Special Elite',monospace;color:#345b68;pointer-events:none}
.pcn *{box-sizing:border-box}.pcn button,.pcn select,.pcn input{font:inherit;touch-action:manipulation}
.pcn button{border:1px solid #b2a77c;background:#f6edc8;color:#345b68;padding:6px 9px;min-height:34px;cursor:pointer}
.pcn button:hover,.pcn button:focus-visible{background:#fff8dd;outline:2px solid #a46843}.pcn button:disabled{opacity:.4;cursor:default}
.pcn .pcn-handle{display:block;margin:auto;pointer-events:auto;min-width:210px;background:#e9e2b2}
.pcn .pcn-paper{position:relative;pointer-events:auto;background:#e9e2b2;box-shadow:0 -4px 18px #0006;border:2px solid #a6986f;border-left:12px dotted #6e6b56;height:min(46vh,440px);min-height:250px;display:flex;flex-direction:column;padding:8px 12px}
.pcn [hidden]{display:none!important}.pcn .pcn-top{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:7px}
.pcn select{padding:5px;max-width:240px;background:#fbf3d7;color:#345b68;border:1px solid #a99d79}
.pcn .pcn-title{font-size:13px;margin-right:auto}.pcn .pcn-tabs{display:flex;gap:6px}.pcn .pcn-selected{background:#d7cfa0;border-color:#345b68}
.pcn .pcn-work{display:grid;grid-template-columns:minmax(180px,25%) 1fr;gap:12px;min-height:0;flex:1}
.pcn .pcn-bank{overflow:auto;border-right:1px solid #b3a574;padding-right:10px}.pcn .pcn-bank h3{margin:2px 0 8px;font-size:15px}
.pcn .pcn-words{display:flex;flex-direction:column;gap:4px}.pcn .pcn-word{display:flex;align-items:center;gap:7px;font-size:14px;min-height:30px;padding:3px;cursor:pointer}
.pcn .pcn-word input{width:17px;height:17px;flex-shrink:0}.pcn .pcn-word button{text-align:left;width:100%;border:0;background:transparent;min-height:28px;padding:2px 4px}
.pcn .pcn-board{overflow:auto;min-width:0}.pcn .pcn-clouds{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;padding:5px}
.pcn .pcn-cloud{border:2px solid #57717a;border-radius:47% 53% 45% 55% / 32% 36% 64% 68%;padding:18px 24px 22px;min-height:138px;background:#eee7bb}
.pcn .pcn-cloud.pcn-active{border-color:#a15e39;background:#f4ebc5}.pcn .pcn-cloud-title{display:block;width:100%;border:0;font-size:15px;background:transparent;min-height:28px}
.pcn .pcn-cloud .pcn-word{font-size:13px;min-height:25px}.pcn .pcn-cloud .pcn-word button{font-size:13px}
.pcn .pcn-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 0 0;border-top:1px solid #b3a574;margin-top:6px;font-size:13px}
.pcn .pcn-dialog{position:absolute;inset:12px;background:#f3eacb;border:2px solid #65767a;padding:14px;overflow:auto;z-index:3}
.pcn .pcn-names{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.pcn .pcn-status{font-size:12px;min-height:18px;margin-top:5px}
@media(max-width:650px){.pcn .pcn-paper{height:55vh;padding:7px;min-height:280px}.pcn .pcn-work{grid-template-columns:minmax(120px,34%) 1fr;gap:6px}.pcn .pcn-clouds{grid-template-columns:1fr}.pcn .pcn-top select{max-width:170px}.pcn .pcn-title{display:none}.pcn .pcn-tools button{font-size:12px;padding:5px}}
`;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
export function notebookKeywordLocation(definition,keywordId){
 const word=knownWords(gameState,definition).find(w=>w.id===keywordId);if(!word)return null;
 const clouds=cloudCase(gameState,definition.id).clouds;
 const i=clouds.findIndex(c=>c.words.includes(keywordId));return {cloudId:i<0?'unsorted':clouds[i].id,cloudPage:0,wordPage:0};
}
export function installPlayerCloudNotebook(ui){
 if(ui.caseCloudNotebook)return ui.caseCloudNotebook;
 const state=ui.state||gameState;
 let dead=false,collapsed=state.playerCloudViewV1?.collapsed===true,caseId=null,activeId=null,mode='organise',all=false,dialogId=null;
 let bankSelection=new Set(),memberSelection=new Set(),message='',signature='',busy=false;
 const root=el('section',undefined,'pcn'),style=el('style',CSS);document.head.append(style);document.body.append(root);
 const handle=el('button','CASE NOTES','pcn-handle');handle.type='button';
 const paper=el('section',undefined,'pcn-paper');root.append(handle,paper);
 const live=()=>!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended;
 const definitions=()=>Array.isArray(ui.search?.data?.cases)?ui.search.data.cases:[];
 const cases=()=>definitions().filter(d=>knownWords(state,d).length||cloudCase(state,d.id).clouds.length);
 const selected=()=>definitions().find(d=>d.id===caseId);
 function changed(){requestAutosave();bankSelection.clear();memberSelection.clear();signature='';draw();}
 function button(label,action,disabled=false){
  const n=el('button',label);n.type='button';n.disabled=disabled;
  n.addEventListener('click',e=>{e.stopPropagation();if(live()&&!n.disabled)action();});return n;
 }
 function setCollapsed(value){collapsed=Boolean(value);state.playerCloudViewV1={...(state.playerCloudViewV1||{}),collapsed};requestAutosave();draw();}
 handle.onclick=()=>setCollapsed(!collapsed);
 root.addEventListener('pointerdown',e=>e.stopPropagation());
 root.addEventListener('keydown',e=>{
  e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(dialogId){dialogId=null;draw();}else setCollapsed(true);}
 });
 function checkbox(word,set){
  const label=el('label',undefined,'pcn-word'),input=document.createElement('input');input.type='checkbox';input.checked=set.has(word.id);
  input.onchange=()=>{if(input.checked)set.add(word.id);else set.delete(word.id);draw();};label.append(input,el('span',word.label));return label;
 }
 function use(word,definition){
  if(busy)return;busy=true;
  Promise.resolve(useCloudKeyword(ui,definition,word)).catch(error=>{console.error('[PlayerCloudNotebook]',error);message='This action could not be opened.';}).finally(()=>{busy=false;draw();});
 }
 function wordRow(word,set,definition){return mode==='organise'?checkbox(word,set):(()=>{const row=el('div',undefined,'pcn-word');row.append(button(word.label,()=>use(word,definition)));return row;})();}
 function draw(){
  if(dead)return;root.hidden=!live();if(!live())return;
  handle.textContent=collapsed?'▲ CASE NOTES':'▼ HIDE NOTES';handle.setAttribute('aria-expanded',String(!collapsed));paper.hidden=collapsed;
  if(collapsed)return;
  const available=cases();let definition=selected();
  if(!definition||!available.some(d=>d.id===definition.id)){caseId=available[0]?.id||null;definition=selected();activeId=null;}
  paper.replaceChildren();
  const top=el('div',undefined,'pcn-top');top.append(el('span','PRIVATE INVESTIGATIONS','pcn-title'));
  const select=document.createElement('select');select.setAttribute('aria-label','Case');
  for(const d of available){const option=el('option',d.title);option.value=d.id;option.selected=d.id===caseId;select.append(option);}
  select.onchange=()=>{caseId=select.value;activeId=null;dialogId=null;bankSelection.clear();memberSelection.clear();draw();};top.append(select);
  const organise=button('ORGANISE',()=>{mode='organise';draw();}),useButton=button('USE WORDS',()=>{mode='use';dialogId=null;draw();});
  (mode==='organise'?organise:useButton).classList.add('pcn-selected');top.append(organise,useButton);paper.append(top);
  if(!definition){paper.append(el('p','Collect a clue to start your notes.'));return;}
  const progress=cloudCase(state,caseId),words=knownWords(state,definition),map=new Map(words.map(w=>[w.id,w]));
  if(!progress.clouds.some(c=>c.id===activeId))activeId=null;
  const work=el('div',undefined,'pcn-work'),bank=el('aside',undefined,'pcn-bank'),board=el('div',undefined,'pcn-board');
  bank.append(el('h3',all?'ALL COLLECTED WORDS':'UNSORTED'),button(all?'SHOW UNSORTED':'SHOW ALL',()=>{all=!all;bankSelection.clear();draw();}));
  const bankWords=all?words:unsortedWords(state,definition),list=el('div',undefined,'pcn-words');
  for(const word of bankWords)list.append(wordRow(word,bankSelection,definition));
  if(!bankWords.length)list.append(el('p','No words here.'));bank.append(list);
  const grid=el('div',undefined,'pcn-clouds');
  for(const cloud of progress.clouds){
   const card=el('article',undefined,'pcn-cloud'+(cloud.id===activeId?' pcn-active':''));card.dataset.cloud=cloud.id;
   const title=button(cloudTitle(state,definition,cloud)+(cloud.titleKey?' ?':''),()=>{activeId=cloud.id;memberSelection.clear();draw();});title.className='pcn-cloud-title';card.append(title);
   const members=cloud.words.map(id=>map.get(id)).filter(Boolean);
   for(const word of members){
    if(mode==='organise'&&cloud.id!==activeId){card.append(el('div',word.label,'pcn-word'));}
    else card.append(wordRow(word,memberSelection,definition));
   }
   if(!members.length)card.append(el('p','Empty cloud'));
   const linked=progress.links.filter(l=>l.from===cloud.id||l.to===cloud.id).map(l=>progress.clouds.find(c=>c.id===(l.from===cloud.id?l.to:l.from))).filter(Boolean);
   if(linked.length)card.append(el('small','↔ '+linked.map(c=>cloudTitle(state,definition,c)).join(', ')));
   grid.append(card);
  }
  if(!progress.clouds.length)grid.append(el('p','Select words and create your first cloud. Nothing is grouped automatically.'));
  board.append(grid);work.append(bank,board);paper.append(work);
  const tools=el('div',undefined,'pcn-tools'),active=progress.clouds.find(c=>c.id===activeId);
  if(mode==='organise'){
   tools.append(button('CREATE CLOUD',()=>{activeId=createCloud(state,definition,[...bankSelection]);changed();}));
   tools.append(button('ADD SELECTED',()=>{addCloudWords(state,definition,activeId,[...bankSelection]);changed();},!active||!bankSelection.size));
   tools.append(button('REMOVE FROM CLOUD',()=>{removeCloudWords(state,caseId,activeId,[...memberSelection]);changed();},!active||!memberSelection.size));
   tools.append(button('NAME CLOUD',()=>{dialogId=activeId;draw();},!active));
   tools.append(button('DELETE CLOUD',()=>{deleteCloud(state,caseId,activeId);activeId=null;dialogId=null;changed();},!active));
   if(active&&progress.clouds.length>1){
    const targets=document.createElement('select');targets.setAttribute('aria-label','Link another cloud');
    for(const c of progress.clouds.filter(c=>c.id!==activeId)){const option=el('option',cloudTitle(state,definition,c));option.value=c.id;targets.append(option);}
    tools.append(targets,button('LINK',()=>{linkClouds(state,caseId,activeId,targets.value);changed();}),button('UNLINK',()=>{unlinkClouds(state,caseId,activeId,targets.value);changed();}));
   }
  }else tools.append(el('span','Click a word to search, dial a discovered number or use an email address.'));
  paper.append(tools,el('div',message||'Names are hypotheses. The notebook does not mark them right or wrong.','pcn-status'));
  if(dialogId){
   const cloud=progress.clouds.find(c=>c.id===dialogId);if(!cloud){dialogId=null;return;}
   const dialog=el('section',undefined,'pcn-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','Name cloud');
   dialog.append(el('h3','Choose a hypothesis'),el('p','Only names you have encountered are offered. You can change your mind.'));
   const names=el('div',undefined,'pcn-names');
   for(const option of namingOptions(state,definition))names.append(button(option.label,()=>{nameCloud(state,definition,dialogId,option.id);dialogId=null;changed();}));
   dialog.append(names,button('CLEAR NAME',()=>{nameCloud(state,definition,dialogId,null);dialogId=null;changed();}),button('CANCEL',()=>{dialogId=null;draw();}));paper.append(dialog);
  }
 }
 function revealKeyword(id,keywordId){
  const d=definitions().find(d=>d.id===id);if(!d||!knownWords(state,d).some(w=>w.id===keywordId))return false;
  caseId=id;all=true;collapsed=false;dialogId=null;state.playerCloudViewV1={collapsed:false};requestAutosave();draw();return true;
 }
 const originalRenderNotebook=ui.search.renderNotebook;ui.search.renderNotebook=()=>{};ui.search.notesOpen=false;
 const originalWorkspace=ui.monitor.calculateWorkspace;
 ui.monitor.calculateWorkspace=()=>{
  const {width,height}=ui.scene.scale,scale=Math.max(.001,Math.min(Math.max(1,width-16)/1120,Math.max(1,height-16)/800));
  return {scale,left:(width-1120*scale)/2,top:(height-800*scale)/2};
 };
 const host=ui.monitor,originalRender=host.render;
 const wrapped=function(...args){const result=originalRender.apply(this,args);draw();return result;};host.render=wrapped;
 const originals=[];
 for(const key of ['close','suspend','resume'])if(typeof ui[key]==='function'){
  const original=ui[key],wrapper=function(...args){const result=original.apply(this,args);draw();return result;};ui[key]=wrapper;originals.push([key,original,wrapper]);
 }
 let last=-Infinity;
 const tick=()=>{
  if(!live()){root.hidden=true;return;}
  if(!ui.booting&&!ui.search.data&&!ui.search.loading&&!ui.search.error){
   Promise.resolve(ui.search.load()).then(()=>{if(live())draw();}).catch(error=>console.error('[PlayerCloudNotebook] Search load failed:',error));
  }
  if(ui.scene.time.now-last<250)return;last=ui.scene.time.now;
  const next=JSON.stringify([state.piKeywordSearch,state.playerCloudNotebookV1,ui.app,ui.booting]);
  if(next!==signature){signature=next;draw();}
 };
 ui.scene.game.events.on('poststep',tick);
 const resize=()=>draw();ui.scene.scale.on('resize',resize);
 const oldRetro=ui.search.retroButton;
 if(typeof oldRetro==='function')ui.search.retroButton=function(x,y,w,h,label,callback,...rest){return oldRetro.call(this,x,y,w,h,label,label==='NOTES'?()=>setCollapsed(!collapsed):callback,...rest);};
 function destroy(){
  if(dead)return;dead=true;ui.scene.game.events.off('poststep',tick);ui.scene.scale.off('resize',resize);
  ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);root.remove();style.remove();
  if(host.render===wrapped)host.render=originalRender;
  for(const [key,original,wrapper] of originals)if(ui[key]===wrapper)ui[key]=original;
  ui.search.renderNotebook=originalRenderNotebook;ui.monitor.calculateWorkspace=originalWorkspace;
 }
 ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);
 const originalDestroy=ui.destroy;ui.destroy=function(...args){destroy();return originalDestroy.apply(this,args);};
 const api={scope:'pi',revealKeyword,hide:()=>setCollapsed(true),show:()=>setCollapsed(false),toggle:()=>setCollapsed(!collapsed),get collapsed(){return collapsed;},destroy};
 ui.caseCloudNotebook=api;
 draw();return api;
}
