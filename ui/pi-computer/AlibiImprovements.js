import './AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { discoverSearchKeywords } from './ComputerSearch.js';
import { ALIBI_CONTACTS, contactFor, saveAlibiContact } from './AlibiContactBook.js';
import { nextQuestHint } from './QuestHintSystem.js';
import { renderSocialPage } from './SocialProfileTemplate.js';
const QUEST='pi_stolen_alibi';
export function installAlibiImprovements(ui,documents){
 let dead=false,searchInstalled=false,hint=null;
 const restorers=[];
 const wrap=(target,key,factory)=>{
  if(typeof target?.[key]!=='function')return false;
  const old=target[key],next=factory(old.bind(target));target[key]=next;
  restorers.push(()=>{if(target[key]===next)target[key]=old;});return true;
 };
 const save=(c,kind)=>{
  saveAlibiContact(c,kind);
  discoverSearchKeywords('borrowed_alibi',[kind==='email'?c.keyword.replace('_phone','_email'):c.keyword]);
  ui.notice=`Saved ${c.name}: ${kind==='email'?c.email:c.number}`;
  if(!dead&&!ui.destroyed&&ui.isOpen&&!ui.suspended)ui.render();
 };
 wrap(ui.drawing,'text',original=>(x,y,value,...args)=>{
  const object=original(x,y,value,...args);
  if(dead||!gameState.piQuests?.quests?.[QUEST])return object;
  const raw=String(value).trim();
  const contact=contactFor(raw)||ALIBI_CONTACTS.find(c=>raw===`${c.number} — ${c.name}`);
  if(!contact)return object;
  const kind=raw===contact.email?'email':'phone';
  object.setColor('#ffe56c');
  const bg=ui.drawing.rectangle(object.x-2,object.y,object.width+4,Math.max(23,object.height),0x344841);
  ui.content?.moveBelow(bg,object);
  object.setName(`Add ${contact.name}’s ${kind==='email'?'email':'number'}`);
  object.setInteractive({useHandCursor:true}).on('pointerdown',()=>save(contact,kind));
  return object;
 });
 const mail=documents.getMail.bind(documents);
 documents.getMail=()=>mail().map(message=>{
  if(!message.id?.startsWith('alibi_'))return message;
  const state=gameState.piBorrowedAlibi||{};
  const advert=documents.getClassifieds().find(a=>a.missionId===QUEST);
  const original=advert?.description||'Someone has been using my alibi. Please reply through Box 17.';
  if(message.id==='alibi_box17_sent')return {...message,threadId:QUEST,body:message.body+'\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n'+original};
  if(message.id==='alibi_arthur_reply')return {...message,threadId:QUEST,inReplyTo:'alibi_box17_sent',body:message.body+'\n\n----- YOUR PREVIOUS REPLY -----\n'+(state.sentBody||'Reply sent through Box 17.')+'\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n'+original};
  return message;
 });
 restorers.push(()=>{documents.getMail=mail;});
 const installSearch=()=>{
  const s=ui.search;if(searchInstalled||!s)return;searchInstalled=true;
  wrap(s,'render',original=>(...args)=>{
   const page=s.view==='page'?s.definition?.pages.find(p=>p.id===s.pageId):null;
   if(page?.socialProfile)return renderSocialPage(ui,s,page);
   return original(...args);
  });
 };
 const originalRender=documents.render.bind(documents);
 documents.render=(...args)=>{
  installSearch();
  if(!gameState.piQuests?.quests?.[QUEST])return originalRender(...args);
  const d=ui.drawing,b=ui.window;
  if(hint){
   d.rectangle(b.x+15,b.y+50,b.w-30,b.h-100,0xeee1b7);
   d.text(b.x+35,b.y+75,'CASE HINT — THE BORROWED ALIBI',19,'#344b3a',b.w-70);
   d.text(b.x+35,b.y+125,`Hint ${hint.level+1}/3\n\n${hint.text}`,18,'#344b3a',b.w-70);
   d.button(b.x+35,b.y+b.h-100,'BACK',()=>{hint=null;ui.render();});
   d.button(b.x+160,b.y+b.h-100,'MORE HELP',()=>{hint=nextQuestHint(QUEST);ui.render();},hint.level<2);
   return;
  }
  const result=originalRender(...args);
  d.button(b.x+180,b.y+b.h-77,'HINT',()=>{hint=nextQuestHint(QUEST);ui.render();});
  return result;
 };
 restorers.push(()=>{documents.render=originalRender;});
 queueMicrotask(installSearch);
 const destroy=()=>{if(dead)return;dead=true;for(const restore of restorers.reverse())restore();};
 ui.scene.events.once('shutdown',destroy);
 return {destroy};
}
