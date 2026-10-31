import './AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { discoverSearchKeywords, getSearchProgress, validateSearchData } from './ComputerSearchCore.js';
import { ALIBI_SEARCH_ID, ALIBI_SEARCH_CASE, mergeAlibiSearch } from './AlibiCaseData.js';
const QUEST = 'pi_stolen_alibi';
const KEY = 'piBorrowedAlibi';
const DRAFT = 'alibi_box17_draft';
const SENT = 'alibi_box17_sent';
const REPLY_DELAY_MS = 12000;
const VARIANTS = [
  { label: 'PROFESSIONAL', body: 'I am responding to your advertisement. Please forward all three original requests, including sender details and any attachments. Please describe where and when you actually ate on Tuesday.' },
  { label: 'FRIENDLY', body: 'I can help investigate your unexpected social life. Please send the three original messages and any attached documents. Tell me where and when you really had dinner on Tuesday.' },
  { label: 'DIRECT', body: 'Three dinner companions is a lot to acquire by accident. Forward their original messages, with sender details and attachments. I also need the restaurant and time of your actual dinner.' }
];
const INCOMING = [
  { id: 'alibi_arthur_reply', from: 'Arthur Finch via Box 17', subject: 'Re: Someone has been using my alibi', body: `Detective,

My name is Arthur Finch. I had dinner alone at The Copper Spoon on Tuesday, from about 7:00 to 8:00 p.m. A cheese sandwich and sparkling water. This is not a confession.

I have forwarded the three requests separately. I do not know these people and never agreed to confirm their stories.

IMPORTANT: Evelyn also attached a document. I have sent its contents in a separate message titled “Attachment: Evelyn’s dinner document — footer included”. There is a strange instruction at the bottom. Please check that as well as the three emails.

You have my permission to release my receipt for that Tuesday visit. The classifieds relay may forward this signed authorisation to the restaurant with your request.

Apparently we all had a delightful evening. Please establish whether I enjoyed myself.

Arthur Finch

Enclosures: Nora Bell’s request; Simon Pike’s request; Evelyn Shaw’s request; Evelyn’s attached dinner document.` },
  { id: 'alibi_forward_nora', from: 'Arthur Finch → forwarded: Nora Bell', subject: 'Dinner confirmation — Nora Bell', body: `FORWARDED ORIGINAL MESSAGE
From: Nora Bell <nora.bell@post.local>
To: Arthur Finch
Subject: Tuesday dinner

Dear Mr Finch,

If anyone asks, could you confirm we had dinner at The Copper Spoon on Tuesday, from 7:00 to 9:00 p.m.?

Table six, tomato soup, and the waiter saying, “Our chef believes in second chances.” You spilled red wine on the tablecloth.

I would be very grateful. My sister can be quite persistent.

Nora Bell` },
  { id: 'alibi_forward_simon', from: 'Arthur Finch → forwarded: Simon Pike', subject: 'Dinner confirmation — Simon Pike', body: `FORWARDED ORIGINAL MESSAGE
From: Simon Pike <simon.pike@post.local>
To: Arthur Finch
Subject: A small favour

Hello Arthur,

Please confirm our Tuesday dinner at The Copper Spoon if my employer calls. We were there from 7:00 to 9:00 p.m.

Table six. Tomato soup. The waiter said, “Our chef believes in second chances.” Then you spilled red wine on the tablecloth.

A very productive evening. Strategically speaking.

Simon Pike` },
  { id: 'alibi_forward_evelyn', from: 'Arthur Finch → forwarded: Evelyn Shaw', subject: 'Dinner confirmation — Evelyn Shaw', body: `FORWARDED ORIGINAL MESSAGE
From: Evelyn Shaw <evelyn.shaw@post.local>
To: Arthur Finch
Subject: Confirmation required

Mr Finch,

Please confirm that we dined at The Copper Spoon on Tuesday between 7:00 and 9:00 p.m.

We sat at table six and ordered tomato soup. The waiter said, “Our chef believes in second chances.” You spilled red wine on the tablecloth.

There is no need to provide details beyond those above.

Evelyn Shaw

ATTACHED DOCUMENT: reproduced in Arthur’s separate “Attachment: Evelyn’s dinner document — footer included” message.` }
];
const LEAD = {
  id: 'alibi_arthur_attachment', from: 'Arthur Finch via Box 17',
  subject: 'Attachment: Evelyn’s dinner document — footer included',
  body: `ATTACHED DOCUMENT — TRANSCRIPTION
DOCUMENT FOOTER: Tuesday package — revision 2. Remove before forwarding.

Detective,

That is the instruction printed at the bottom of Evelyn Shaw’s attachment. I have put it at the top of this message so neither of us misses it. The full document is reproduced below; there is no separate download to open.

----- DOCUMENT CONTENT -----
Tuesday dinner, 7:00–9:00 p.m.
The Copper Spoon, table six.
Companion: Arthur Finch.
Meal: tomato soup.
The waiter says: “Our chef believes in second chances.”
Arthur spills red wine on the tablecloth.

----- DOCUMENT FOOTER -----
Tuesday package — revision 2.
Remove before forwarding.
----- END DOCUMENT -----

I did not agree to appear in this document. Is this what people mean by a packaged social life?

Arthur Finch

The footer identifies a document version, not the identity of the person who sold it.`
};
const RECEIPT = {
  id: 'alibi_copper_receipt', from: 'The Copper Spoon — Manager', subject: 'Authorised copy: Arthur Finch’s Tuesday receipt',
  body: `COPY — supplied with Arthur Finch’s permission

THE COPPER SPOON
Tuesday evening
Receipt CS-TUE-061
Table 6 — one guest
Opened 19:04 | Paid 19:48

Cheese sandwich ........ $8.00
Sparkling water ....... $3.00
TOTAL ................ $11.00

Dining-room cover record: one guest; no additional covers opened at this table during this visit.

Service note: kitchen failure. No hot food served throughout Tuesday evening.

The receipt records this customer’s visit and order. It does not establish where the three other people actually were.

Manager, The Copper Spoon`
};
const SAMPLE = {
  id: 'alibi_club_sample', from: 'Tuesday Alibi Club — Membership', subject: 'Your free sample: Dinner Companion / TUE-DC-02',
  body: `DEMONSTRATION ONLY — NO PURCHASE
Tuesday Alibi Club
Dinner Companion package
Tuesday package — revision 2
Reference: TUE-DC-02

Claimed companion: Arthur Finch
Venue: The Copper Spoon
Day: Tuesday
Time: 7:00 to 9:00 p.m.
Table: six
Meal: tomato soup
Memorable incident: Arthur spilled red wine on the tablecloth.
Waiter’s remark: “Our chef believes in second chances.”

The package supplies an account to repeat. The named companion has not been contacted or asked to confirm it.

This demonstration was sent at your request. No payment has been taken and no subscription opened.

This template does not disclose who purchased it or what they actually did on Tuesday.

Tuesday Alibi Club
Yesterday, improved.`
};
const MAIL_IDS = new Set([DRAFT, SENT, RECEIPT.id, LEAD.id, SAMPLE.id, ...INCOMING.map(m => m.id)]);
export class BorrowedAlibiMail {
  constructor(ui) {
    Object.assign(this, { ui, searchInstalled: false, searchHook: null, replyTimer: null, replyTimerDueAt: null, disposed: false, restorers: [] });
    this.onSceneShutdown = () => this.destroy();
    this.install();
    ui.scene.events.once('shutdown', this.onSceneShutdown);
    queueMicrotask(() => { if (this.isAlive()) { this.installSearch(); this.syncReplyDelivery(); } });
  }
  get state() {
    const saved = gameState[KEY] || {};
    const variant = Number.isInteger(saved.variant) && saved.variant >= 0 && saved.variant < VARIANTS.length ? saved.variant : 0;
    return { ...saved, version: 1, variant, sent: Boolean(saved.sent), read: Array.isArray(saved.read) ? saved.read : [] };
  }
  get active() { return getPIQuest(QUEST)?.status === 'active'; }
  get flags() { return gameState.piPhoneInvestigations?.cases?.[ALIBI_SEARCH_ID]?.flags || []; }
  get replyReceived() { return this.state.sent && this.state.replyReceived !== false; }
  get receivedReceipt() { return this.replyReceived && this.flags.includes('receipt_received'); }
  get leadAvailable() { return this.replyReceived; }
  get sampleAvailable() { return this.replyReceived && this.flags.includes('club_sample_received'); }
  isAlive() { return !this.disposed && !this.ui.destroyed; }
  update(patch) { gameState[KEY] = { ...this.state, ...patch, version: 1 }; requestAutosave(); }
  refresh() {
    const u = this.ui;
    if (this.isAlive() && u.isOpen && !u.suspended && !u.booting) u.render();
  }
  isDraft() { return this.ui.app === 'mail' && this.ui.selectedId === DRAFT && this.active && !this.state.sent; }
  isEvidence() {
    return this.ui.app === 'mail' && this.replyReceived && MAIL_IDS.has(this.ui.selectedId) && ![DRAFT,SENT].includes(this.ui.selectedId);
  }
  wrap(target, method, factory) {
    if (typeof target?.[method] !== 'function') return false;
    const original = target[method], wrapped = factory(original.bind(target));
    target[method] = wrapped;
    this.restorers.push(() => { if (target[method] === wrapped) target[method] = original; });
    return true;
  }
  ensureSearch() {
    const search = this.ui.search;
    if (!this.isAlive() || !search?.data || !getPIQuest(QUEST)) return;
    if (search.data.cases.find(c => c.id === ALIBI_SEARCH_ID) !== ALIBI_SEARCH_CASE) {
      search.data = validateSearchData(mergeAlibiSearch(search.data));
    }
    if (!getSearchProgress().cases[ALIBI_SEARCH_ID]) discoverSearchKeywords(ALIBI_SEARCH_ID, []);
  }
  installSearch() {
    const u = this.ui, search = u.search;
    if (!this.isAlive() || !search || typeof search.load !== 'function') return false;
    if (this.searchInstalled && this.searchHook === search) return true;
    this.searchInstalled = true; this.searchHook = search;
    this.wrap(search, 'load', original => async (...args) => {
      const result = await original(...args);
      if (this.isAlive() && u.search === search) { this.ensureSearch(); search.refresh(); }
      return result;
    });
    this.wrap(search, 'refresh', original => (...args) => {
      if (!this.isAlive()) return;
      this.ensureSearch();
      if (this.isEvidence()) return this.refresh();
      return original(...args);
    });
    const target = typeof u.monitor?.render === 'function' ? u.monitor : u;
    this.wrap(target, 'render', original => (...args) => {
      const result = original(...args);
      if (this.isAlive() && this.isEvidence() && u.isOpen && !u.suspended && !u.booting && search.data) {
        search.renderNotebook?.(); u.pin?.();
      }
      return result;
    });
    this.ensureSearch(); return true;
  }
  selectSearchCase() {
    const state = getSearchProgress();
    if (state.selectedCaseId === ALIBI_SEARCH_ID) return;
    gameState.piKeywordSearch = { ...state, selectedCaseId: ALIBI_SEARCH_ID };
    requestAutosave();
    if (this.ui.search) Object.assign(this.ui.search, { terms: [], submitted: [], results: [], view: 'home', pageId: null, resultPage: 0, bodyPage: 0, notePage: 0, trail: [] });
  }
  collect(id) {
    if (!this.isEvidence() || !ALIBI_SEARCH_CASE.keywords.some(k => k.id === id)) return;
    discoverSearchKeywords(ALIBI_SEARCH_ID, [id]); this.selectSearchCase(); this.refresh();
  }
  fragments(value) {
    const keys = [...ALIBI_SEARCH_CASE.keywords].sort((a,b) => b.label.length - a.label.length);
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp('(' + keys.map(k => escape(k.label)).join('|') + ')', 'gi');
    return String(value).split('\n').map(line => line.split(expression).filter(Boolean).map(part => {
      const key = keys.find(k => k.label.toLowerCase() === part.toLowerCase());
      return key ? { text: part, keywordId: key.id } : part;
    }));
  }
  renderEvidence(content, x, y, width, height, fallback) {
    this.installSearch(); this.ensureSearch();
    const u = this.ui, search = u.search;
    if (!search?.data || typeof search.paginate !== 'function') return fallback(content,x,y,width,height);
    this.selectSearchCase();
    const pages = search.paginate(this.fragments(content), width, Math.max(25,height-44));
    u.bodyPage = Math.max(0,Math.min(Number(u.bodyPage)||0,Math.max(0,pages.length-1)));
    const d = u.drawing, known = getSearchProgress().cases[ALIBI_SEARCH_ID]?.known || [];
    for (const item of pages[u.bodyPage] || []) {
      const collected = item.keywordId && known.includes(item.keywordId);
      const label = d.text(x+item.x,y+item.y,item.text,16,item.keywordId ? (collected ? '#d5f0cb' : '#ffe56c') : '#343e35');
      if (!item.keywordId) continue;
      const bg = d.rectangle(label.x-1,label.y,label.width+2,Math.max(23,label.height),collected ? 0x355c43 : 0x344841);
      u.content.moveBelow(bg,label);
      if (!collected) label.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.collect(item.keywordId));
    }
    if (pages.length > 1) {
      const bottom = y+height-34;
      d.button(x,bottom,'<',()=>{u.bodyPage--;this.refresh();},u.bodyPage>0);
      d.pixel(x+56,bottom+10,`${u.bodyPage+1}/${pages.length}`,9,'#343e35');
      d.button(x+116,bottom,'>',()=>{u.bodyPage++;this.refresh();},u.bodyPage<pages.length-1);
    }
  }
  clearReplyTimer() {
    if (this.replyTimer !== null) clearTimeout(this.replyTimer);
    this.replyTimer = null; this.replyTimerDueAt = null;
  }
  syncReplyDelivery() {
    if (!this.isAlive()) return;
    const state = this.state;
    if (!state.sent || this.replyReceived) { this.clearReplyTimer(); return; }
    let due = Number(state.replyDueAt);
    if (!Number.isFinite(due) || due <= 0) {
      const at = Date.parse(state.sentAt);
      due = (Number.isFinite(at) ? at : Date.now()) + REPLY_DELAY_MS;
      this.update({replyDueAt:due});
    }
    const remaining = due-Date.now();
    if (remaining<=0) { this.deliverReply(); return; }
    if (this.replyTimer !== null && this.replyTimerDueAt===due) return;
    this.clearReplyTimer(); this.replyTimerDueAt=due;
    this.replyTimer=setTimeout(()=>{this.replyTimer=null;this.replyTimerDueAt=null;if(this.isAlive())this.syncReplyDelivery();},Math.min(remaining,2147483647));
  }
  deliverReply() {
    if (!this.isAlive() || !this.state.sent || this.replyReceived) return;
    this.clearReplyTimer();
    this.update({replyReceived:true,replyReceivedAt:new Date().toISOString()});
    this.ui.notice='Arthur replied: three forwarded requests and Evelyn’s attachment are now in Mail.';
    // getMail may be called during render; avoid recursive rendering.
    queueMicrotask(()=>this.refresh());
  }
  install() {
    const u=this.ui, docs=u.documents;
    if (typeof docs?.getMail!=='function' || typeof docs.renderPagedText!=='function' || typeof docs.render!=='function') throw new TypeError('[BorrowedAlibiMail] Incompatible documents UI');
    this.wrap(docs,'getMail',original=>(...args)=>{
      const items=original(...args);
      if(!this.isAlive() || !getPIQuest(QUEST)) return items;
      this.syncReplyDelivery();
      const state=this.state, own=[];
      if(state.sent){
        if(this.replyReceived){
          if(this.sampleAvailable)own.push({...SAMPLE,date:'Received after your club enquiry'});
          if(this.receivedReceipt)own.push({...RECEIPT,date:'Received after restaurant enquiry'});
          own.push({...LEAD,date:'Enclosed with Arthur’s reply'});
          own.push(...INCOMING.map(m=>({...m,date:'Received after your Box 17 reply'})));
        }
        own.push({id:SENT,from:'You → Classifieds relay, Box 17',subject:'Re: Someone has been using my alibi',date:'Sent',body:state.sentBody||VARIANTS[state.variant].body});
      }else if(this.active){
        own.push({id:DRAFT,from:'Reply via Classifieds — Box 17',subject:'Re: Someone has been using my alibi',date:'Draft reply',body:'TO: Box 17 — Classifieds forwarding service\n\n'+VARIANTS[state.variant].body+'\n\n— Private Investigator\n\nChoose a tone, then SEND REPLY.'});
      }
      return [...own,...items.filter(m=>!MAIL_IDS.has(m.id))];
    });
    this.wrap(docs,'renderPagedText',original=>(content,x,y,w,h)=>{
      if(!this.isAlive())return original(content,x,y,w,h);
      if(this.isEvidence())return this.renderEvidence(content,x,y,w,h,original);
      return original(content,x,y,w,this.isDraft()?Math.max(40,h-50):h);
    });
    this.wrap(docs,'render',original=>(...args)=>{
      if(!this.isAlive())return original(...args);
      this.installSearch();this.ensureSearch();this.syncReplyDelivery();
      const result=original(...args);
      if(this.isEvidence()&&!u.search?.data&&!u.search?.loading&&!u.search?.error)this.loadSearch();
      if(this.isDraft()){
        const b=u.window, by=b.y+b.h-90;
        u.drawing.button(b.x+298,by,'TONE: '+VARIANTS[this.state.variant].label,()=>{this.update({variant:(this.state.variant+1)%VARIANTS.length});u.bodyPage=0;this.refresh();});
        u.drawing.button(b.x+b.w-190,by,'SEND REPLY',()=>this.send());
      }
      if(this.isEvidence()&&!this.state.read.includes(u.selectedId))this.update({read:[...this.state.read,u.selectedId]});
      if(u.app==='classifieds'&&this.active&&!this.state.sent&&docs.getClassifieds?.().find(a=>a.id===u.selectedId)?.missionId===QUEST){
        const b=u.window;
        u.drawing.button(b.x+b.w-270,b.y+b.h-101,'REPLY TO AD',()=>{
          Object.assign(u,{app:'mail',selectedId:DRAFT,listPage:0,bodyPage:0,notice:''});u.viewToken=(Number(u.viewToken)||0)+1;this.refresh();
        });
      }
      return result;
    });
  }
  loadSearch() {
    if(typeof this.ui.search?.load!=='function')return;
    Promise.resolve().then(()=>{if(this.isAlive())return this.ui.search.load();}).catch(error=>{if(this.isAlive())console.error('[BorrowedAlibiMail] Search load failed:',error);});
  }
  send() {
    if(!this.isAlive()||!this.active||this.state.sent)return;
    const now=Date.now();
    this.update({sent:true,sentBody:VARIANTS[this.state.variant].body+'\n\n— Private Investigator',sentAt:new Date(now).toISOString(),replyDueAt:now+REPLY_DELAY_MS,replyReceived:false,replyReceivedAt:null,read:[]});
    const quest=getPIQuest(QUEST);
    if(quest){
      const state=gameState.piQuests||{};
      gameState.piQuests={...state,quests:{...(state.quests||{}),[QUEST]:{...quest,objectives:Array.isArray(quest.objectives)?quest.objectives.map(o=>o.id==='contact_client'?{...o,completed:true}:o):quest.objectives}}};
      requestAutosave();
    }
    Object.assign(this.ui,{selectedId:SENT,listPage:0,bodyPage:0,notice:'Reply sent. Arthur will forward the original messages and attachments.'});
    this.syncReplyDelivery();this.refresh();
  }
  destroy() {
    if(this.disposed)return;
    this.disposed=true;this.clearReplyTimer();
    this.ui.scene?.events?.off('shutdown',this.onSceneShutdown);
    for(const restore of this.restorers.reverse())restore();
    this.restorers=[];this.searchHook=null;
  }
}
