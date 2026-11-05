import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { discoverSearchKeywords, getSearchProgress } from './ComputerSearchCore.js';
import { ALIBI_SEARCH_ID, ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { bindKeywordStyle, keywordSurface, refreshKeywordStyles } from './KeywordStyle.js';

const QUEST='pi_stolen_alibi';
const KEYWORD='alibi_box17_email';
const EMAIL='box17@classifieds.local';
const DRAFT='alibi_box17_draft';
const SENT='alibi_box17_sent';
const INSTALLATION=Symbol.for('lostArtifacts.alibiAdvertEmailFlow');

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
      ui.notice='Address saved. Accept this case before writing to Box 17.';refresh();return false;
    }
    const sent=Boolean(gameState.piBorrowedAlibi?.sent);
    if (!sent && !active()) {
      ui.notice='This enquiry is no longer active.';refresh();return false;
    }
    selectAlibiCase();
    const generic=ui.photoQuest?.contactMail;
    if (generic) generic.composing=false;
    Object.assign(ui,{app:'mail',selectedId:sent ? SENT : DRAFT,listPage:0,bodyPage:0,
      notice:sent ? 'Your Box 17 reply has already been sent.' : 'Draft opened. Choose a tone, then click SEND REPLY.'});
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
      ui.notice='The address could not be added yet. Reopen the advertisement after the case notes finish loading.';
      refresh();return;
    }
    if (getPIQuest(QUEST)) {openMessage();return;}
    ui.notice='Address saved. Accept this case first, then click the address again or open the draft in Mail.';
    revealSavedAddress();
  }
  function collectAddress() {
    if (!alive() || loadingAddress) return;
    if (rememberAddress()) {finishAddressClick();return;}
    if (typeof ui.search?.load!=='function') {finishAddressClick();return;}
    loadingAddress=true;
    const context={app:ui.app,id:ui.selectedId,token:ui.viewToken};
    ui.notice='Loading the Box 17 contact…';refresh();
    Promise.resolve().then(()=>alive() ? ui.search.load() : null).then(()=>{
      if (!alive()) return;
      ensureDefinitions();rememberAddress();
      // Do not jump back to this draft if the player opened another application.
      if (!ui.isOpen || ui.suspended || ui.app!==context.app || ui.selectedId!==context.id || ui.viewToken!==context.token) return;
      finishAddressClick();
    }).catch(error=>{
      console.error('[AlibiAdvertEmailFlow] Contact load failed:',error);
      if (alive() && ui.app===context.app && ui.selectedId===context.id && ui.viewToken===context.token) {
        ui.notice='Box 17 could not be opened. Reopen the advertisement and try again.';refresh();
      }
    }).finally(()=>{loadingAddress=false;});
  }
  function bindNotebookAddress() {
    if (!alive() || !known() || ui.caseCloudNotebook?.collapsed) return;
    const paper=ui.root?.list?.find(container=>Array.isArray(container.list) && container.list.some(child=>child.text==='PRIVATE INVESTIGATIONS'));
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
      .map(message=>message.id===DRAFT ? {...message,from:`You → ${EMAIL}`,
        subject:'Draft: Someone has been using my alibi',
        body:String(message.body || '').replace('TO: Box 17 — Classifieds forwarding service',`TO: ${EMAIL}`)} : message));
    wrap(documents,'renderPagedText',original=>(content,x,y,width,height)=>{
      if (!alive() || !isAdvert()) return original(content,x,y,width,height);
      const reserved=70;
      original(content,x,y,width,Math.max(35,height-reserved));
      const d=ui.drawing,labelY=y+Math.max(35,height-reserved)+7;
      const label=d.text(x,labelY,EMAIL,16,'#000000',width);
      bindKeywordStyle(ui.scene,label,{isKnown:known,surface:()=>keywordSurface(ui,label)});
      label.setName('Write to Box 17').setInteractive({useHandCursor:true});
      label.on('pointerdown',(pointer,lx,ly,event)=>{
        event?.stopPropagation();ui.options.onSfx?.('click');collectAddress();
      });
      const caption=getPIQuest(QUEST)
        ? gameState.piBorrowedAlibi?.sent ? 'Click to open your sent reply.' : 'Click to write a reply. Nothing is sent automatically.'
        : 'Save the address, then accept this case to write a reply.';
      d.text(x,labelY+label.height+5,caption,12,'#5b6558',width);
    });
    wrap(ui.drawing,'button',original=>(x,y,label,...args)=>{
      if (alive() && label==='REPLY TO AD' && isAdvert()) {
        return original(x,y,'WRITE TO BOX 17',collectAddress,active() || Boolean(gameState.piBorrowedAlibi?.sent));
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
