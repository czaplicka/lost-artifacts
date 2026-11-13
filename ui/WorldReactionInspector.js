import { gameState } from '../GameData.js';
import { buildWorldReactionSnapshot, worldInspectorEnabled } from '../systems/WorldReactionInspectorModel.js';

const installed=new WeakMap();
const CSS=`
.la-world-inspector{position:fixed;inset:0;z-index:2147483000;background:#071018e8;color:#f4e7c6;font:16px monospace;pointer-events:auto;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}
.la-world-inspector *{box-sizing:border-box}
.la-world-inspector section{background:#172532;border:2px solid #b69b64;width:min(1100px,100%);max-height:95vh;overflow:auto;padding:16px}
.la-world-inspector h2{margin:0 0 12px;font-size:20px}
.la-world-inspector button,.la-world-inspector select{font:inherit;color:#fff0ca;background:#263f50;border:1px solid #a58a58;padding:9px;margin:3px;min-height:38px;cursor:pointer}
.la-world-inspector button:focus-visible,.la-world-inspector select:focus-visible{outline:2px solid #ffe19a}
.la-world-inspector .world-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.la-world-inspector .world-list{display:grid;gap:7px;margin-top:12px}
.la-world-inspector .world-list button{text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}
.la-world-inspector pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101c25;padding:12px}
.la-world-inspector .world-warning{color:#ffbf9f;white-space:pre-wrap}
.la-world-inspector .world-note{color:#c1cece;font-size:13px;line-height:1.6}
`;
function node(tag,text){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;}

export function installWorldReactionInspector(game){
 if(typeof window==='undefined'||typeof document==='undefined'||!worldInspectorEnabled(window.location)||!game?.events)return null;
 if(installed.has(game))return installed.get(game);
 let dead=false,overlay=null,style=null,previousFocus=null,visibility='all',page=0;
 const close=()=>{
  overlay?.remove();style?.remove();overlay=null;style=null;
  if(previousFocus?.isConnected)previousFocus.focus?.();previousFocus=null;
 };
 const button=(label,action)=>{
  const b=node('button',label);b.type='button';b.addEventListener('click',event=>{event.stopPropagation();if(!dead)action();});return b;
 };
 function render(){
  if(!overlay)return;
  const section=node('section');section.setAttribute('role','dialog');section.setAttribute('aria-modal','true');section.setAttribute('aria-label','World reactions inspector');
  section.append(node('h2','WORLD REACTIONS — READ ONLY'));
  const note=node('p','Local developer tool. The game is NOT paused. Refresh reads the existing history; it does not run collectors, publish news, read mail or consume NPC reactions.');note.className='world-note';section.append(note);
  const tools=node('div');tools.className='world-tools';
  tools.append(button('Refresh',()=>{render();}),button('Close [F9 / Esc]',close));
  const filter=node('select');filter.setAttribute('aria-label','Visibility filter');
  for(const [value,label]of [['all','All visibility'],['public','Public'],['private','Private'],['agency','Agency only']]){
   const option=node('option',label);option.value=value;filter.append(option);
  }
  filter.value=visibility;filter.addEventListener('change',()=>{visibility=filter.value;page=0;render();});tools.append(filter);section.append(tools);
  try{
   const snapshot=buildWorldReactionSnapshot(gameState);
   section.append(node('p',`Campaign: ${snapshot.campaignId??'none'} | Events: ${snapshot.total} | Public: ${snapshot.counts.public} | Private: ${snapshot.counts.private} | Agency: ${snapshot.counts.agency}`));
   const ack=node('pre',JSON.stringify(snapshot.acknowledgements,null,2));section.append(ack);
   const warning=node('p',snapshot.warnings.length?snapshot.warnings.join('\n'):'No structural warnings in the stored history. This is not an end-to-end gameplay test.');warning.className='world-warning';section.append(warning);
   const rows=snapshot.rows.filter(row=>visibility==='all'||row.visibility===visibility);
   const pages=Math.max(1,Math.ceil(rows.length/15));page=Math.max(0,Math.min(page,pages-1));
   const pager=node('div');pager.className='world-tools';
   pager.append(button('<',()=>{page=Math.max(0,page-1);render();}),node('span',`${page+1}/${pages}`),button('>',()=>{page=Math.min(pages-1,page+1);render();}));section.append(pager);
   const detail=node('pre','Select a record to inspect its safe metadata. Original client letters, names from private reports and evidence bodies are not copied here.');
   const list=node('div');list.className='world-list';
   for(const row of rows.slice(page*15,(page+1)*15)){
    list.append(button(`[${row.visibility}] ${row.kind}\n${row.title} | case: ${row.caseId} | office acknowledged: ${row.officeAcknowledged} | NPC confirmed: ${row.npcAcknowledgements.length}${row.currentCampaign?'':' | OTHER CAMPAIGN'}`,()=>{detail.textContent=JSON.stringify(row,null,2);}));
   }
   if(!rows.length)list.append(node('p','No matching stored records.'));
   section.append(list,detail);
  }catch(error){
   const message=node('pre',String(error));message.className='world-warning';section.append(message);
  }
  overlay.replaceChildren(section);section.querySelector('button')?.focus();
 }
 const open=()=>{
  if(dead||overlay)return;
  previousFocus=document.activeElement;
  style=node('style',CSS);document.head.append(style);
  overlay=node('div');overlay.className='la-world-inspector';
  overlay.addEventListener('pointerdown',event=>event.stopPropagation());
  document.body.append(overlay);render();
 };
 const onKey=event=>{
  if(dead)return;
  if(event.code==='F9'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   event.preventDefault();event.stopImmediatePropagation();if(overlay)close();else open();return;
  }
  if(!overlay)return;
  event.stopImmediatePropagation();
  if(event.code==='Escape'){event.preventDefault();if(!event.repeat)close();return;}
  if(event.key==='Tab'){
   const items=[...overlay.querySelectorAll('button,select')].filter(item=>!item.disabled);
   const first=items[0],last=items.at(-1);
   if(!first){event.preventDefault();return;}
   if(!items.includes(document.activeElement)){event.preventDefault();first.focus();}
   else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 };
 const destroy=()=>{
  if(dead)return;dead=true;close();window.removeEventListener('keydown',onKey,true);
  game.events.off('destroy',destroy);installed.delete(game);
 };
 const api={open,close,destroy};installed.set(game,api);
 window.addEventListener('keydown',onKey,true);game.events.once('destroy',destroy);
 return api;
}
