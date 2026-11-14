import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords, getSearchProgress } from './ComputerSearchCore.js';
import { ALIBI_SEARCH_ID, ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { bindKeywordStyle, keywordSurface, refreshKeywordStyles } from './KeywordStyle.js';

const QUEST='pi_stolen_alibi';
const KEYWORD='alibi_box17_email';
const EMAIL=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_f4d154b677024c7400e6");
const DRAFT='alibi_box17_draft';
const SENT='alibi_box17_sent';
const INSTALLATION=Symbol.for(__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_0f93ead1f44697c922af"));

function ensureKeyword(definition) {
  if (!definition || definition.id!==ALIBI_SEARCH_ID) return;
  definition.keywords ??= [];
  if (definition.keywords.some(item=>item.id===KEYWORD)) return;
  const cloudId=definition.keywords.find(item=>item.id==='arthur_finch')?.cloudId || definition.clouds?.[0]?.id;
  if (cloudId) definition.keywords.push({id:KEYWORD,label:EMAIL,email:EMAIL,cloudId});
}
ensureKeyword(ALIBI_SEARCH_CASE);

export function installAlibiAdvertEmailFlow(ui,documents) {
  if (ui[INSTALLATION]) return ui[INSTALLATION];
  let dead=false,installed=false,bindingQueued=false,loadingAddress=false;
  const restorers=[];
  const alive=()=>!dead && !ui.destroyed;
  const known=()=>(getSearchProgress().cases[ALIBI_SEARCH_ID]?.known || []).includes(KEYWORD);
  const active=()=>getPIQuest(QUEST)?.status==='active';
  const isAdvert=()=>ui.app==='classifieds' && documents.getClassifieds().some(item=>item.id===ui.selectedId && item.missionId===QUEST);
  const refresh=()=>{if (alive() && ui.isOpen && !ui.suspended && !ui.booting) ui.render();};
  const wrap=(target,method,factory)=>{
    if (typeof target?.[method]!=='function') return;
    const original=target[method],wrapped=factory(original.bind(target));
    target[method]=wrapped;
    restorers.push(()=>{if (target[method]===wrapped) target[method]=original;});
  };
  const ensureDefinitions=()=>{
    ensureKeyword(ALIBI_SEARCH_CASE);
    for (const definition of ui.search?.data?.cases || []) ensureKeyword(definition);
  };
  function selectAlibiCase() {
    const progress=getSearchProgress();
    if (progress.selectedCaseId!==ALIBI_SEARCH_ID) {
      gameState.piKeywordSearch={...progress,selectedCaseId:ALIBI_SEARCH_ID};
      requestAutosave();
    }
  }
  function rememberAddress() {
    if (!alive()) return false;
    ensureDefinitions();
    if (known()) return true;
    discoverSearchKeywords(ALIBI_SEARCH_ID,[KEYWORD]);
    if (!known()) return false;
    selectAlibiCase();requestAutosave();return true;
  }
  function onAccepted(advert) {
    if (advert?.missionId!==QUEST || !getPIQuest(QUEST)) return;
    rememberAddress();
  }
  function openMessage() {
    if (!alive() || !known()) return false;
    if (!getPIQuest(QUEST)) {
      ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_bc9bfa56c76f0e3c6c2f");refresh();return false;
    }
    const sent=Boolean(gameState.piBorrowedAlibi?.sent);
    if (!sent && !active()) {
      ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_920aa756e97c3dc46d7b");refresh();return false;
    }
    selectAlibiCase();
    const generic=ui.photoQuest?.contactMail;
    if (generic) generic.composing=false;
    Object.assign(ui,{app:'mail',selectedId:sent ? SENT : DRAFT,listPage:0,bodyPage:0,
      notice:sent ? __dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_1510931cd15be60e08f5") : __dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_98749c04581c9da7e265")});
    ui.viewToken=(Number(ui.viewToken)||0)+1;
    refresh();return true;
  }
  function revealSavedAddress() {
    if (ui.caseCloudNotebook?.revealKeyword?.(ALIBI_SEARCH_ID,KEYWORD)) return;
    ui.caseCloudNotebook?.show(false);
    refresh();
  }
  function finishAddressClick() {
    refreshKeywordStyles(ui.scene);
    if (!known()) {
      ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_ed4691bfb2b87af6c01b");
      refresh();return;
    }
    if (getPIQuest(QUEST)) {openMessage();return;}
    ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_9afb6b5a35fcd1cb25c8");
    revealSavedAddress();
  }
  function collectAddress() {
    if (!alive() || loadingAddress) return;
    if (rememberAddress()) {finishAddressClick();return;}
    if (typeof ui.search?.load!=='function') {finishAddressClick();return;}
    loadingAddress=true;
    const context={app:ui.app,id:ui.selectedId,token:ui.viewToken};
    ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_a627d78db648a0662772");refresh();
    Promise.resolve().then(()=>alive() ? ui.search.load() : null).then(()=>{
      if (!alive()) return;
      ensureDefinitions();rememberAddress();
      // Do not jump back to this draft if the player opened another application.
      if (!ui.isOpen || ui.suspended || ui.app!==context.app || ui.selectedId!==context.id || ui.viewToken!==context.token) return;
      finishAddressClick();
    }).catch(error=>{
      console.error('[AlibiAdvertEmailFlow] Contact load failed:',error);
      if (alive() && ui.app===context.app && ui.selectedId===context.id && ui.viewToken===context.token) {
        ui.notice=__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_5a4575c4714282572aca");refresh();
      }
    }).finally(()=>{loadingAddress=false;});
  }
  function bindNotebookAddress() {
    if (!alive() || !known() || ui.caseCloudNotebook?.collapsed) return;
    const paper=ui.root?.list?.find(container=>Array.isArray(container.list) && container.list.some(child=>child.text===__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_bbc638660cdde9fbfde6")));
    if (!paper?.visible) return;
    for (const label of paper.list || []) {
      if (label.text!==EMAIL || typeof label.setInteractive!=='function') continue;
      label.setColor('#000000');label.removeAllListeners('pointerdown');label.setInteractive({useHandCursor:true});
      label.on('pointerdown',(pointer,lx,ly,event)=>{
        event?.stopPropagation();ui.options.onSfx?.('click');openMessage();
      });
    }
  }
  function queueNotebookBinding() {
    if (!alive() || bindingQueued) return;
    bindingQueued=true;
    // Run after all render wrappers, including the notebook's own renderer.
    queueMicrotask(()=>{
      bindingQueued=false;
      if (alive() && ui.isOpen && !ui.suspended && !ui.booting) bindNotebookAddress();
    });
  }
  function install() {
    if (!alive() || installed) return;
    installed=true;ensureDefinitions();
    if (getPIQuest(QUEST)) rememberAddress();
    wrap(documents,'getMail',original=>(...args)=>original(...args)
      // Keep the unsent reply discoverable in Mail/Drafts, not only after a note click.
      .filter(message=>message.id!==DRAFT || known())
      .map(message=>message.id===DRAFT ? {...message,from:`${__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_a6cd4a7f9ea8eb99f4a2")}${EMAIL}`,
        subject:__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_dd43633ae5a8ee5b2eb7"),
        body:String(message.body || '').replace(__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_c0058d0eacc5a1981b04"),`${__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_013494bb6bb97590ddac")}${EMAIL}`)} : message));
    wrap(documents,'renderPagedText',original=>(content,x,y,width,height)=>{
      if (!alive() || !isAdvert()) return original(content,x,y,width,height);
      const reserved=70;
      original(content,x,y,width,Math.max(35,height-reserved));
      const d=ui.drawing,labelY=y+Math.max(35,height-reserved)+7;
      const label=d.text(x,labelY,EMAIL,16,'#000000',width);
      bindKeywordStyle(ui.scene,label,{isKnown:known,surface:()=>keywordSurface(ui,label)});
      label.setName(__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_c0c0802accc2cc8e7196")).setInteractive({useHandCursor:true});
      label.on('pointerdown',(pointer,lx,ly,event)=>{
        event?.stopPropagation();ui.options.onSfx?.('click');collectAddress();
      });
      const caption=getPIQuest(QUEST)
        ? gameState.piBorrowedAlibi?.sent ? __dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_4d3c1e4110572ac90455") : __dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_b7ade6e8202e2fad85ca")
        : __dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_4176ad5ce0a5f5327b31");
      d.text(x,labelY+label.height+5,caption,12,'#5b6558',width);
    });
    wrap(ui.drawing,'button',original=>(x,y,label,...args)=>{
      if (alive() && label===__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_3759b2884c0dcf2e68c3") && isAdvert()) {
        return original(x,y,__dialogueText("ui/pi-computer/AlibiAdvertEmailFlow.js", "t_759a747a4b432b6d18e6"),collectAddress,active() || Boolean(gameState.piBorrowedAlibi?.sent));
      }
      return original(x,y,label,...args);
    });
    wrap(ui.search,'selectKeyword',original=>(id,...args)=>{
      if (alive() && id===KEYWORD && known()) {openMessage();return;}
      return original(id,...args);
    });
    wrap(ui.search,'load',original=>async(...args)=>{
      const result=await original(...args);
      if (alive()) {ensureDefinitions();queueNotebookBinding();}
      return result;
    });
    for (const target of [ui.monitor,ui]) wrap(target,'render',original=>(...args)=>{
      if (alive()) ensureDefinitions();
      const result=original(...args);queueNotebookBinding();return result;
    });
    wrap(ui,'destroy',original=>(...args)=>{destroy();return original(...args);});
    queueNotebookBinding();
  }
  function destroy() {
    if (dead) return;
    dead=true;
    ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);
    for (const restore of restorers.reverse()) restore();
    if (ui[INSTALLATION]===api) delete ui[INSTALLATION];
  }
  const api={destroy,onAccepted};ui[INSTALLATION]=api;
  ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);
  queueMicrotask(install);return api;
}
