import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { buildWorldReactionSnapshot, worldInspectorEnabled } from '../systems/WorldReactionInspectorModel.js';

const installed=new WeakMap();
const CSS=`${__dialogueText("ui/WorldReactionInspector.js", "t_10b10da2aade1869aa3e")}`;
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
  const section=node('section');section.setAttribute('role','dialog');section.setAttribute('aria-modal','true');section.setAttribute('aria-label',__dialogueText("ui/WorldReactionInspector.js", "t_751dd16fbf74d6e2c072"));
  section.append(node('h2',__dialogueText("ui/WorldReactionInspector.js", "t_b998ad2a3f8b1820df8c")));
  const note=node('p',__dialogueText("ui/WorldReactionInspector.js", "t_6d6306796537984f2f7e"));note.className='world-note';section.append(note);
  const tools=node('div');tools.className='world-tools';
  tools.append(button(__dialogueText("ui/WorldReactionInspector.js", "t_0e91610117029a62a478"),()=>{render();}),button(__dialogueText("ui/WorldReactionInspector.js", "t_2f34be1460443fb706cd"),close));
  const filter=node('select');filter.setAttribute('aria-label',__dialogueText("ui/WorldReactionInspector.js", "t_919f4e806ff43bb39fd9"));
  for(const [value,label]of [['all',__dialogueText("ui/WorldReactionInspector.js", "t_bbf571dc1bdafdf7d275")],['public',__dialogueText("ui/WorldReactionInspector.js", "t_591935b15b1c88e2d5f6")],['private',__dialogueText("ui/WorldReactionInspector.js", "t_c63eb6720c6e88493897")],['agency',__dialogueText("ui/WorldReactionInspector.js", "t_e9af7825227d6907c9ff")]]){
   const option=node('option',label);option.value=value;filter.append(option);
  }
  filter.value=visibility;filter.addEventListener('change',()=>{visibility=filter.value;page=0;render();});tools.append(filter);section.append(tools);
  try{
   const snapshot=buildWorldReactionSnapshot(gameState);
   section.append(node('p',`${__dialogueText("ui/WorldReactionInspector.js", "t_702c5cb5f24df18db5e4")}${snapshot.campaignId??'none'}${__dialogueText("ui/WorldReactionInspector.js", "t_138517a878cb2f60d333")}${snapshot.total}${__dialogueText("ui/WorldReactionInspector.js", "t_c2e0442edf2dca25b6d0")}${snapshot.counts.public}${__dialogueText("ui/WorldReactionInspector.js", "t_6309e07584ecaedbbd24")}${snapshot.counts.private}${__dialogueText("ui/WorldReactionInspector.js", "t_c38a02b95a809b544f76")}${snapshot.counts.agency}`));
   const ack=node('pre',JSON.stringify(snapshot.acknowledgements,null,2));section.append(ack);
   const warning=node('p',snapshot.warnings.length?snapshot.warnings.join('\n'):__dialogueText("ui/WorldReactionInspector.js", "t_536b5e0987fe27a76929"));warning.className='world-warning';section.append(warning);
   const rows=snapshot.rows.filter(row=>visibility==='all'||row.visibility===visibility);
   const pages=Math.max(1,Math.ceil(rows.length/15));page=Math.max(0,Math.min(page,pages-1));
   const pager=node('div');pager.className='world-tools';
   pager.append(button('<',()=>{page=Math.max(0,page-1);render();}),node('span',`${page+1}/${pages}`),button('>',()=>{page=Math.min(pages-1,page+1);render();}));section.append(pager);
   const detail=node('pre',__dialogueText("ui/WorldReactionInspector.js", "t_5a176ffffcc8db38075a"));
   const list=node('div');list.className='world-list';
   for(const row of rows.slice(page*15,(page+1)*15)){
    list.append(button(`${__dialogueText("ui/WorldReactionInspector.js", "t_245843abef9e72e7efac")}${row.visibility}${__dialogueText("ui/WorldReactionInspector.js", "t_1ae2bcbc6c0f178c5b74")}${row.kind}${__dialogueText("ui/WorldReactionInspector.js", "t_01ba4719c80b6fe911b0")}${row.title}${__dialogueText("ui/WorldReactionInspector.js", "t_ff204966c0f631683297")}${row.caseId}${__dialogueText("ui/WorldReactionInspector.js", "t_5030e09e479735831710")}${row.officeAcknowledged}${__dialogueText("ui/WorldReactionInspector.js", "t_a0c9076e08bb577fc3c5")}${row.npcAcknowledgements.length}${row.currentCampaign?'':__dialogueText("ui/WorldReactionInspector.js", "t_6894cab04d3aa9b62c77")}`,()=>{detail.textContent=JSON.stringify(row,null,2);}));
   }
   if(!rows.length)list.append(node('p',__dialogueText("ui/WorldReactionInspector.js", "t_b3cbea739ec8047a6f52")));
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
  if(event.code===__dialogueText("ui/WorldReactionInspector.js", "t_037c968467aa3fd7c059")){event.preventDefault();if(!event.repeat)close();return;}
  if(event.key===__dialogueText("ui/WorldReactionInspector.js", "t_90ddf1963abb36c9921c")){
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
