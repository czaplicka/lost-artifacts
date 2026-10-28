import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { discoverSearchKeywords, getSearchProgress, validateSearchData } from './ComputerSearch.js';
import { ALIBI_SEARCH_ID, ALIBI_SEARCH_CASE, mergeAlibiSearch } from './AlibiCaseData.js';

const QUEST='pi_stolen_alibi',KEY='piBorrowedAlibi';
const DRAFT='alibi_box17_draft',SENT='alibi_box17_sent';
const VARIANTS=[
 {label:'PROFESSIONAL',body:'I am responding to your advertisement. Please forward the three original requests asking you to confirm the dinner, including sender details. Please also describe where and when you actually ate on Tuesday.'},
 {label:'FRIENDLY',body:'I can help investigate your unexpected social life. Please send the three original messages, with sender details, and tell me where and when you really had dinner on Tuesday.'},
 {label:'DIRECT',body:'Three dinner companions is a lot to acquire by accident. Please forward their original messages, including sender details. I also need the restaurant and the time of your actual Tuesday dinner.'}
];
const INCOMING=[
 {id:'alibi_arthur_reply',from:'Arthur Finch via Box 17',subject:'Re: Someone has been using my alibi',body:'Detective,\n\nMy name is Arthur Finch. Thank you for replying. I had dinner alone at The Copper Spoon on Tuesday, from about 7:00 to 8:00 p.m.\n\nI had a cheese sandwich and sparkling water. This is not a confession.\n\nI have forwarded the three requests separately. I do not know any of these people and have never agreed to confirm their stories.\n\nYou have my permission to release my receipt for that Tuesday visit. The classifieds relay may forward this signed authorisation to the restaurant with your request.\n\nApparently, we all had a delightful evening. Please establish whether I enjoyed myself.\n\nArthur Finch\n\nForwarded messages: Dinner confirmation — Nora Bell; Dinner confirmation — Simon Pike; Dinner confirmation — Evelyn Shaw.'},
 {id:'alibi_forward_nora',from:'Arthur Finch → forwarded: Nora Bell',subject:'Dinner confirmation — Nora Bell',body:'FORWARDED ORIGINAL MESSAGE\nFrom: Nora Bell <nora.bell@post.local>\nTo: Arthur Finch\nSubject: Tuesday dinner\n\nDear Mr Finch,\n\nIf anyone asks, could you confirm we had dinner at The Copper Spoon on Tuesday, from 7:00 to 9:00 p.m.?\n\nTable six, tomato soup, and the waiter saying, “Our chef believes in second chances.” You spilled red wine on the tablecloth.\n\nI would be very grateful. My sister can be quite persistent.\n\nNora Bell'},
 {id:'alibi_forward_simon',from:'Arthur Finch → forwarded: Simon Pike',subject:'Dinner confirmation — Simon Pike',body:'FORWARDED ORIGINAL MESSAGE\nFrom: Simon Pike <simon.pike@post.local>\nTo: Arthur Finch\nSubject: A small favour\n\nHello Arthur,\n\nPlease confirm our Tuesday dinner at The Copper Spoon if my employer calls. We were there from 7:00 to 9:00 p.m.\n\nTable six. Tomato soup. The waiter said, “Our chef believes in second chances.” Then you spilled red wine on the tablecloth.\n\nA very productive evening. Strategically speaking.\n\nSimon Pike'},
 {id:'alibi_forward_evelyn',from:'Arthur Finch → forwarded: Evelyn Shaw',subject:'Dinner confirmation — Evelyn Shaw',body:'FORWARDED ORIGINAL MESSAGE\nFrom: Evelyn Shaw <evelyn.shaw@post.local>\nTo: Arthur Finch\nSubject: Confirmation required\n\nMr Finch,\n\nPlease confirm that we dined at The Copper Spoon on Tuesday between 7:00 and 9:00 p.m.\n\nWe sat at table six and ordered tomato soup. The waiter said, “Our chef believes in second chances.” You spilled red wine on the tablecloth.\n\nThere is no need to provide details beyond those above.\n\nEvelyn Shaw'}
];
const RECEIPT={
 id:'alibi_copper_receipt',from:'The Copper Spoon — Manager',subject:'Authorised copy: Arthur Finch’s Tuesday receipt',
 body:'COPY — supplied with Arthur Finch’s permission\n\nTHE COPPER SPOON\nTuesday evening\nReceipt CS-TUE-061\nTable 6 — one guest\nOpened 19:04 | Paid 19:48\n\nCheese sandwich ........ $8.00\nSparkling water ....... $3.00\nTOTAL ................ $11.00\n\nDining-room cover record: one guest; no additional covers opened at this table during this visit.\n\nService note: kitchen failure. No hot food served throughout Tuesday evening.\n\nThe receipt records this customer’s visit and order. It does not establish where the three other people actually were.\n\nManager, The Copper Spoon'
};
const LEAD={
 id:'alibi_arthur_attachment',from:'Arthur Finch via Box 17',subject:'One more thing: the attachment from Evelyn Shaw',
 body:'Detective,\n\nWhile sorting my downloads for this absurd dinner business, I noticed a separate document attached to Evelyn Shaw’s original request. I had copied the message itself into my earlier forward, not this attachment.\n\nIt repeats the same dinner account. At the bottom it says:\n\nTuesday package — revision 2.\nRemove before forwarding.\n\nI have reproduced the footer exactly. Is this what people mean by a packaged social life?\n\nArthur Finch\n\nAttachment transcription retained with the original request. This footer identifies a document version, not the identity of the person who sold it.'
};
const SAMPLE={
 id:'alibi_club_sample',from:'Tuesday Alibi Club — Membership',subject:'Your free sample: Dinner Companion / TUE-DC-02',
 body:'DEMONSTRATION ONLY — NO PURCHASE\nTuesday Alibi Club\nDinner Companion package\nTuesday package — revision 2\nReference: TUE-DC-02\n\nClaimed companion: Arthur Finch\nVenue: The Copper Spoon\nDay: Tuesday\nTime: 7:00 to 9:00 p.m.\nTable: six\nMeal: tomato soup\nMemorable incident: Arthur spilled red wine on the tablecloth.\nWaiter’s remark: “Our chef believes in second chances.”\n\nThe package supplies an account to repeat. The named companion has not been contacted or asked to confirm it.\n\nThis is a demonstration sent at your request. No payment has been taken and no subscription has been opened.\n\nThis template does not disclose who purchased it or what they actually did on Tuesday.\n\nTuesday Alibi Club\nYesterday, improved.'
};
const MAIL_IDS=new Set([DRAFT,SENT,RECEIPT.id,LEAD.id,SAMPLE.id,...INCOMING.map(m=>m.id)]);

export class BorrowedAlibiMail{
 constructor(ui){this.ui=ui;this.searchInstalled=false;this.install();queueMicrotask(()=>{if(!ui.destroyed)this.installSearch();});}
 get state(){const s=gameState[KEY]||{};return{...s,version:1,variant:Number.isInteger(s.variant)&&s.variant>=0&&s.variant<VARIANTS.length?s.variant:0,sent:Boolean(s.sent),read:Array.isArray(s.read)?s.read:[]};}
 get active(){return getPIQuest(QUEST)?.status==='active';}
 get flags(){return gameState.piPhoneInvestigations?.cases?.[ALIBI_SEARCH_ID]?.flags||[];}
 get receivedReceipt(){return this.state.sent&&this.flags.includes('receipt_received');}
 get leadAvailable(){return this.receivedReceipt&&this.flags.includes('no_hot_food')&&this.state.read.includes(RECEIPT.id);}
 get sampleAvailable(){return this.state.sent&&this.flags.includes('club_sample_received');}
 update(patch){gameState[KEY]={...this.state,...patch,version:1};requestAutosave();}
 refresh(){const u=this.ui;if(u.isOpen&&!u.destroyed&&!u.suspended)u.render();}
 isDraft(){return this.ui.app==='mail'&&this.ui.selectedId===DRAFT&&this.active&&!this.state.sent;}
 isEvidence(){return this.ui.app==='mail'&&this.state.sent&&MAIL_IDS.has(this.ui.selectedId)&&this.ui.selectedId!==DRAFT&&this.ui.selectedId!==SENT;}
 ensureSearch(){
  const search=this.ui.search;if(!search?.data||!getPIQuest(QUEST))return;
  if(search.data.cases.find(c=>c.id===ALIBI_SEARCH_ID)!==ALIBI_SEARCH_CASE)search.data=validateSearchData(mergeAlibiSearch(search.data));
  if(!getSearchProgress().cases[ALIBI_SEARCH_ID])discoverSearchKeywords(ALIBI_SEARCH_ID,[]);
 }
 installSearch(){
  if(this.searchInstalled||!this.ui.search||!this.ui.monitor)return;
  this.searchInstalled=true;const u=this.ui,s=u.search;
  const load=s.load.bind(s);s.load=async()=>{await load();if(!u.destroyed){this.ensureSearch();s.refresh();}};
  const refresh=s.refresh.bind(s);s.refresh=()=>{this.ensureSearch();if(this.isEvidence())this.refresh();else refresh();};
  const render=u.monitor.render.bind(u.monitor);
  u.monitor.render=()=>{render();if(this.isEvidence()&&u.isOpen&&!u.destroyed&&!u.suspended&&!u.booting&&s.data){this.selectSearchCase();s.renderNotebook();u.pin?.();}};
 }
 selectSearchCase(){
  const old=getSearchProgress();if(old.selectedCaseId===ALIBI_SEARCH_ID)return;
  gameState.piKeywordSearch={...old,selectedCaseId:ALIBI_SEARCH_ID};requestAutosave();
  Object.assign(this.ui.search,{terms:[],submitted:[],results:[],view:'home',pageId:null,resultPage:0,bodyPage:0,notePage:0,trail:[]});
 }
 collect(id){
  if(!this.isEvidence()||!ALIBI_SEARCH_CASE.keywords.some(k=>k.id===id))return;
  discoverSearchKeywords(ALIBI_SEARCH_ID,[id]);this.selectSearchCase();this.refresh();
 }
 fragments(text){
  const keys=[...ALIBI_SEARCH_CASE.keywords].sort((a,b)=>b.label.length-a.label.length);
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('('+keys.map(k=>escape(k.label)).join('|')+')','gi');
  return String(text).split('\n').map(line=>line.split(re).filter(Boolean).map(t=>{const key=keys.find(k=>k.label.toLowerCase()===t.toLowerCase());return key?{text:t,keywordId:key.id}:t;}));
 }
 renderEvidence(content,x,y,w,h,fallback){
  const u=this.ui,s=u.search;this.installSearch();this.ensureSearch();
  if(!s?.data){fallback(content,x,y,w,h);return;}
  this.selectSearchCase();const layouts=s.paginate(this.fragments(content),w,Math.max(25,h-44));
  u.bodyPage=Math.max(0,Math.min(u.bodyPage,layouts.length-1));const d=u.drawing;
  for(const item of layouts[u.bodyPage]||[]){
   const known=(getSearchProgress().cases[ALIBI_SEARCH_ID]?.known||[]).includes(item.keywordId);
   const t=d.text(x+item.x,y+item.y,item.text,16,item.keywordId?'#ffe56c':'#343e35');
   if(item.keywordId){const bg=d.rectangle(t.x-1,t.y,t.width+2,23,known?0x596150:0x344841);u.content.moveBelow(bg,t);t.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.collect(item.keywordId));}
  }
  if(layouts.length>1){const yy=y+h-34;d.button(x,yy,'<',()=>{u.bodyPage--;this.refresh();},u.bodyPage>0);d.pixel(x+56,yy+10,`${u.bodyPage+1}/${layouts.length}`,9,'#343e35');d.button(x+116,yy,'>',()=>{u.bodyPage++;this.refresh();},u.bodyPage<layouts.length-1);}
 }
 install(){
  const u=this.ui,docs=u.documents,mail=docs.getMail.bind(docs);
  docs.getMail=()=>{
   const items=mail();if(!getPIQuest(QUEST))return items;
   const s=this.state,own=s.sent?[
    ...(this.sampleAvailable?[{...SAMPLE,date:'Received after your club enquiry'}]:[]),
    ...(this.leadAvailable?[{...LEAD,date:'Follow-up from Arthur Finch'}]:[]),
    ...(this.receivedReceipt?[{...RECEIPT,date:'Received after restaurant enquiry'}]:[]),
    ...INCOMING.map(m=>({...m,date:'Received after your Box 17 enquiry'})),
    {id:SENT,from:'You → Classifieds relay, Box 17',subject:'Sent: Enquiry about your alibi',date:'Sent',body:s.sentBody||VARIANTS[s.variant].body}
   ]:this.active?[{id:DRAFT,from:'Classifieds reply service',subject:'Write to Box 17',date:'Unsent draft',body:'TO: Box 17 — Classifieds forwarding service\nSUBJECT: Enquiry about your alibi\n\n'+VARIANTS[s.variant].body+'\n\n— Private Investigator\n\nChoose a tone below, then press SEND. The relay will forward your message without revealing the advertiser’s address.'}]:[];
   return[...own,...items.filter(m=>!MAIL_IDS.has(m.id))];
  };
  const paged=docs.renderPagedText.bind(docs);
  docs.renderPagedText=(c,x,y,w,h)=>this.isEvidence()?this.renderEvidence(c,x,y,w,h,paged):paged(c,x,y,w,this.isDraft()?Math.max(40,h-50):h);
  const render=docs.render.bind(docs);
  docs.render=()=>{
   this.installSearch();this.ensureSearch();render();
   if(this.isEvidence()&&!u.search?.data&&!u.search?.loading&&!u.search?.error)void u.search?.load();
   if(this.isDraft()){
    const b=u.window,y=b.y+b.h-90;
    u.drawing.button(b.x+298,y,'TONE: '+VARIANTS[this.state.variant].label,()=>{this.update({variant:(this.state.variant+1)%VARIANTS.length});u.bodyPage=0;this.refresh();});
    u.drawing.button(b.x+b.w-110,y,'SEND',()=>this.send());
   }
   if(this.isEvidence()&&!this.state.read.includes(u.selectedId))this.update({read:[...this.state.read,u.selectedId]});
   if(u.app==='classifieds'&&this.active&&!this.state.sent&&docs.getClassifieds().find(a=>a.id===u.selectedId)?.missionId===QUEST){
    const b=u.window;u.drawing.button(b.x+b.w-270,b.y+b.h-101,'WRITE TO BOX 17',()=>{u.app='mail';u.selectedId=DRAFT;u.listPage=0;u.bodyPage=0;u.notice='';u.viewToken++;this.refresh();});
   }
  };
 }
 send(){
  if(!this.active||this.state.sent)return;
  this.update({sent:true,sentBody:VARIANTS[this.state.variant].body+'\n\n— Private Investigator',sentAt:new Date().toISOString(),read:[]});
  const q=getPIQuest(QUEST);gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[QUEST]:{...q,objectives:q.objectives.map(o=>o.id==='contact_client'?{...o,completed:true}:o)}}};requestAutosave();
  const u=this.ui;u.selectedId='alibi_arthur_reply';u.listPage=0;u.bodyPage=0;u.viewToken++;u.notice='Arthur Finch has replied with three forwarded messages.';u.options.onSfx?.('click');void u.search?.load();this.refresh();
 }
}
