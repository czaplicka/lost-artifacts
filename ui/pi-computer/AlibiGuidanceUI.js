import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { commitPhoneRule } from '../pi-phone/PhoneInvestigation.js';
import { resolveAlibiGuidance } from './AlibiGuidanceRules.js';

const MARKER=Symbol.for('lostArtifacts.alibiGuidanceV3');
const QUEST='pi_stolen_alibi',CASE='borrowed_alibi',STATE='piAlibiGuidanceV3';
const QUESTION_ID='alibi_arthur_wording_request',REPLY_ID='alibi_arthur_wording_reply';
const DELAY=12000;
export function requestArthurWording(state=gameState,now=Date.now(),save=requestAutosave){
 if(state.piQuests?.quests?.[QUEST]?.status!=='active'||!state.piBorrowedAlibi?.sent||state.piBorrowedAlibi.replyReceived===false)return false;
 if(state[STATE]?.arthurFollowup)return false;
 state[STATE]={...(state[STATE]||{}),arthurFollowup:{sentAt:now,dueAt:now+DELAY,received:false}};save();return true;
}
export function deliverArthurWording(state=gameState,now=Date.now(),save=requestAutosave){
 const followup=state[STATE]?.arthurFollowup;
 if(state.piQuests?.quests?.[QUEST]?.status!=='active'||!followup||followup.received||!Number.isFinite(followup.dueAt)||now<followup.dueAt)return false;
 state[STATE]={...state[STATE],arthurFollowup:{...followup,received:true,receivedAt:now}};save();return true;
}
export function arthurWordingMessages(state=gameState){
 const f=state[STATE]?.arthurFollowup;if(!f||!state.piQuests?.quests?.[QUEST])return [];
 const sent={id:QUESTION_ID,from:'You → Arthur Finch via Box 17',subject:'Sent: Did you supply the dinner details?',date:'Sent',inReplyTo:'alibi_arthur_reply',
  body:'Arthur,\n\nDid you give any of these three people the table, meal or incident details in their requests? Please distinguish anything you supplied from what they sent you.\n\nPrivate Investigator'};
 if(!f.received)return [sent];
 return [{id:REPLY_ID,from:'Arthur Finch via Box 17',subject:'Re: Did you supply the dinner details?',date:'Reply to your question',inReplyTo:QUESTION_ID,
  body:'Detective,\n\nNo. I did not tell them about a table, soup, wine or a waiter. Those details were already in the messages they sent me. I forwarded the originals without rewriting them.\n\nI do not know where they obtained those details. None of them asked me before sending a request.\n\nMy contribution to the evening was a sandwich.\n\nArthur Finch'},sent];
}
export function installAlibiGuidance(ui,documents){
 if(ui[MARKER])return ui[MARKER];
 let dead=false,timer=null,queued=false;const restorers=[],hooked=new WeakSet();
 const alive=()=>!dead&&!ui.destroyed;
 const active=()=>gameState.piQuests?.quests?.[QUEST]?.status==='active';
 const wrap=(target,key,factory)=>{
  if(typeof target?.[key]!=='function')return;
  const original=target[key],replacement=factory(original.bind(target));target[key]=replacement;
  restorers.push(()=>{if(target[key]===replacement)target[key]=original;});
 };
 const refresh=()=>{if(!alive()||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(alive()&&ui.isOpen&&!ui.suspended&&!ui.booting)ui.render();});};
 function schedule(){
  clearTimeout(timer);timer=null;const f=gameState[STATE]?.arthurFollowup;
  if(!alive()||!active()||!f||f.received||!Number.isFinite(f.dueAt))return;
  if(f.dueAt<=Date.now()){if(deliverArthurWording())refresh();return;}
  timer=setTimeout(()=>{timer=null;schedule();},Math.min(f.dueAt-Date.now(),2147483647));
 }
 function ensurePhone(){
  if(!alive())return;
  const phone=ui.scene.phoneUI,inv=phone?.investigation;
  if(!inv||hooked.has(inv)||typeof inv.ask!=='function'||typeof phone.render!=='function')return;
  hooked.add(inv);let committing=false;
  wrap(inv,'ask',original=>(...args)=>{
   if(!active()||inv.active?.caseId!==CASE||inv.phase!=='choose'||phone.directoryOpen)return original(...args);
   // 428 has its own dialogue selector, including footer and silence-offer topics.
   if(inv.active.number==='428')return original(...args);
   const rule=resolveAlibiGuidance(inv.active.number,inv.selected,gameState);
   if(!rule)return original(...args);
   inv.pending={...rule,_alibiGuidanceV3:true};
   inv.play(rule.lines,'response');return true;
  });
  wrap(phone,'render',original=>(...args)=>{
   const result=original(...args),topic=inv.pending,last=phone.lines?.[phone.lines.length-1],bubble=phone.logItems?.[phone.logItems.length-1];
   if(committing||!active()||inv.dead||inv.active?.caseId!==CASE||inv.phase!=='response'||!topic?._alibiGuidanceV3
    ||!phone.isOpen||phone.destroyed||phone.directoryOpen||phone.state!=='connected'||phone.typingItem
    ||!last||phone.lineIndex!==phone.lines.length-1||!bubble||bubble.typing||bubble.full!==last.text)return result;
   committing=true;
   try{commitPhoneRule(CASE,topic,phone.lines);inv.pending=null;}
   finally{committing=false;}
   return result;
  });
 }
 wrap(documents,'getMail',original=>(...args)=>{
  schedule();const extra=arthurWordingMessages(),ids=new Set(extra.map(m=>m.id));
  return [...extra,...original(...args).filter(m=>!ids.has(m.id))];
 });
 wrap(documents,'renderPagedText',original=>(content,x,y,w,h)=>{
  const reserve=alive()&&active()&&ui.app==='mail'&&ui.selectedId==='alibi_arthur_reply';
  return original(content,x,y,w,reserve?Math.max(45,h-55):h);
 });
 wrap(documents,'render',original=>(...args)=>{
  ensurePhone();schedule();const result=original(...args);
  if(alive()&&active()&&ui.app==='mail'&&ui.selectedId==='alibi_arthur_reply'&&ui.window){
   const b=ui.window,f=gameState[STATE]?.arthurFollowup;
   ui.drawing.button(b.x+b.w-240,b.y+b.h-120,f?(f.received?'QUESTION SENT':'WAITING FOR REPLY'):'ASK ABOUT WORDING',()=>{
    if(!alive()||ui.app!=='mail'||ui.selectedId!=='alibi_arthur_reply')return;
    if(requestArthurWording()){ui.notice='Question sent through Box 17. Arthur will reply.';schedule();refresh();}
   },!f);
  }
  return result;
 });
 function destroy(){
  if(dead)return;dead=true;clearTimeout(timer);timer=null;
  ui.scene.events.off('update',ensurePhone);ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);
  for(const restore of restorers.reverse())restore();if(ui[MARKER]===api)delete ui[MARKER];
 }
 const api={destroy};ui[MARKER]=api;
 ui.scene.events.on('update',ensurePhone);ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);
 wrap(ui,'destroy',original=>(...args)=>{destroy();return original(...args);});
 queueMicrotask(()=>{if(alive()){ensurePhone();schedule();}});return api;
}
