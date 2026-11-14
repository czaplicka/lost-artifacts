import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
const EVELYN = 'alibi_forward_evelyn';
const LEGACY_ATTACHMENT = 'alibi_arthur_attachment';
const REPLY_DELAY_MS = 10000;
const VARIANTS = [
  { label: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_4d06f42d4f337548ffed"), body: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_8c9e768e46f41b3676c3") },
  { label: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_e2220ace54b5605cdfdd"), body: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_75e319312082ddf705b7") },
  { label: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_5b196d41da99d8a63f73"), body: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_c2c05f9a0bd424560a56") }
];
const EVELYN_DOCUMENT = `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_ac4946c583aa992f77a4")}`;
const INCOMING = [
  { id: 'alibi_arthur_reply', from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_178bf8d7d14682ceb2df"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_59fd9fdf8f7cdc3b8386"), body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_fc75be98139b2a2383ef")}` },
  { id: 'alibi_forward_nora', from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_2550c07939561a84d7fb"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_991253d67f22cfcc5e63"), body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_3986d81e88a159a19af3")}` },
  { id: 'alibi_forward_simon', from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_54caa2a0a70a171c141a"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_e8cd7d1d43f8f965818b"), body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_ca1c7bf8414a7bc23084")}` },
  { id: EVELYN, from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_6b1d205a3f4ca4e3c625"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_54df1c620fc385e2b5eb"),
    attachments: [{ id: 'evelyn_dinner_document', name: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_876f83c4b96bb990de33"), type: 'text', body: EVELYN_DOCUMENT }],
    body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_a905a3fa1b38d5efa7d1")}${EVELYN_DOCUMENT}${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_6dbf7b030cf3c274bca8")}` }
];
const RECEIPT = {
  id: 'alibi_copper_receipt', from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_7568bf152928ba221688"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_d6e970c92c63cc3f72c7"),
  body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_04da0f6a3c8cbc44dbe2")}`
};
const SAMPLE = {
  id: 'alibi_club_sample', from: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_e3b7fbadff64acdaace3"), subject: __dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_bb2ea4fd38957e3becaa"),
  body: `${__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_002a2a2781898dd8291b")}`
};
const MAIL_IDS = new Set([DRAFT, SENT, RECEIPT.id, LEGACY_ATTACHMENT, SAMPLE.id, ...INCOMING.map(m => m.id)]);

export class BorrowedAlibiMail {
  constructor(ui) {
    Object.assign(this, { ui, searchInstalled: false, searchHook: null, replyTimer: null, replyTimerDueAt: null, disposed: false, restorers: [] });
    this.migrateAttachment();
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

  migrateAttachment() {
    let changed = false;
    const saved = gameState[KEY];
    if (saved && saved.evelynAttachmentLayout !== 1) {
      const read = Array.isArray(saved.read) ? saved.read : [];
      // An old opened Evelyn email did not yet contain the document.
      gameState[KEY] = {
        ...saved,
        evelynAttachmentLayout: 1,
        read: read.includes(LEGACY_ATTACHMENT) ? read : read.filter(id => id !== EVELYN)
      };
      changed = true;
    }
    const box = gameState.piMailboxV1;
    if (box && Array.isArray(box.records)) {
      const evelyn = INCOMING.find(message => message.id === EVELYN);
      let boxChanged = false;
      const records = box.records.filter(record => {
        if (record.id !== LEGACY_ATTACHMENT) return true;
        boxChanged = true; return false;
      }).map(record => {
        if (!record.copy) return record;
        if (record.id === EVELYN && record.copy.body !== evelyn.body) {
          boxChanged = true;
          return { ...record, copy: { ...record.copy, ...evelyn } };
        }
        const arthur = INCOMING[0];
        if (record.id === arthur.id && record.copy.body !== arthur.body) {
          boxChanged = true;
          return { ...record, copy: { ...record.copy, body: arthur.body } };
        }
        return record;
      });
      const archived = (box.archived || []).filter(id => id !== LEGACY_ATTACHMENT);
      const deleted = (box.deleted || []).filter(id => id !== LEGACY_ATTACHMENT);
      if (boxChanged || archived.length !== (box.archived || []).length || deleted.length !== (box.deleted || []).length) {
        gameState.piMailboxV1 = { ...box, records, archived, deleted };
        changed = true;
      }
    }
    if (changed) requestAutosave();
  }

  refresh() {
    const u = this.ui;
    if (this.isAlive() && u.isOpen && !u.suspended && !u.booting) u.render();
  }
  isDraft() { return this.ui.app === 'mail' && this.ui.selectedId === DRAFT && this.active && !this.state.sent; }
  isEvidence() {
    return this.ui.app === 'mail' && this.replyReceived && MAIL_IDS.has(this.ui.selectedId) && ![DRAFT,SENT,LEGACY_ATTACHMENT].includes(this.ui.selectedId);
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
    const sentAt = Date.parse(state.sentAt);
    let due = Number(state.replyDueAt);
    const normalizedDue = Number.isFinite(sentAt) ? sentAt + REPLY_DELAY_MS : null;
    if (normalizedDue !== null && due !== normalizedDue) {
      due = normalizedDue;
      this.update({replyDueAt:due});
    } else if (!Number.isFinite(due) || due <= 0) {
      due = Date.now() + REPLY_DELAY_MS;
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
    this.ui.notice=__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_697d793c7e423554303d");
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
          if(this.sampleAvailable)own.push({...SAMPLE,date:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_1e7fbd89bf9ba9783032")});
          if(this.receivedReceipt)own.push({...RECEIPT,date:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_49b48aedb5bc77f8f750")});
          own.push(...INCOMING.map(m=>({...m,date:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_31fafdd0f4fd5f7accbd")})));
        }
        own.push({id:SENT,from:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_5c39cb758999eab795c0"),subject:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_59fd9fdf8f7cdc3b8386"),date:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_c16bc82bf1f04ede04d1"),body:state.sentBody||VARIANTS[state.variant].body});
      }else if(this.active){
        own.push({id:DRAFT,from:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_39ea6080e43854221604"),subject:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_59fd9fdf8f7cdc3b8386"),date:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_0206396e59af519ae2d7"),body:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_a4fe6ab1bf6a2dc83671")+VARIANTS[state.variant].body+__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_59a8dc6f42f61b95a216")});
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
      this.migrateAttachment();
      if (u.selectedId === LEGACY_ATTACHMENT) { u.selectedId=EVELYN; u.bodyPage=0; }
      this.installSearch();this.ensureSearch();this.syncReplyDelivery();
      const result=original(...args);
      if(this.isEvidence()&&!u.search?.data&&!u.search?.loading&&!u.search?.error)this.loadSearch();
      if(this.isDraft()){
        const b=u.window, by=b.y+b.h-90;
        u.drawing.button(b.x+298,by,__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_c0d765f8cbee13ced336")+VARIANTS[this.state.variant].label,()=>{this.update({variant:(this.state.variant+1)%VARIANTS.length});u.bodyPage=0;this.refresh();});
        u.drawing.button(b.x+b.w-190,by,__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_bd79fc30a8d3407b51d7"),()=>this.send());
      }
      if(this.isEvidence()) {
        const read = this.state.read;
        const additions = u.selectedId === EVELYN ? [EVELYN,LEGACY_ATTACHMENT] : [u.selectedId];
        if (additions.some(id=>!read.includes(id))) this.update({read:[...new Set([...read,...additions])]});
      }
      if(u.app==='classifieds'&&this.active&&!this.state.sent&&docs.getClassifieds?.().find(a=>a.id===u.selectedId)?.missionId===QUEST){
        const b=u.window;
        u.drawing.button(b.x+b.w-270,b.y+b.h-101,__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_3759b2884c0dcf2e68c3"),()=>{
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
    this.update({sent:true,sentBody:VARIANTS[this.state.variant].body+__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_c8bf4236243a3cec24e1"),sentAt:new Date(now).toISOString(),replyDueAt:now+REPLY_DELAY_MS,replyReceived:false,replyReceivedAt:null,read:[],evelynAttachmentLayout:1});
    const quest=getPIQuest(QUEST);
    if(quest){
      const state=gameState.piQuests||{};
      gameState.piQuests={...state,quests:{...(state.quests||{}),[QUEST]:{...quest,objectives:Array.isArray(quest.objectives)?quest.objectives.map(o=>o.id==='contact_client'?{...o,completed:true}:o):quest.objectives}}};
      requestAutosave();
    }
    Object.assign(this.ui,{selectedId:SENT,listPage:0,bodyPage:0,notice:__dialogueText("ui/pi-computer/BorrowedAlibiMail.js", "t_49ff1f58db7c36e718be")});
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
