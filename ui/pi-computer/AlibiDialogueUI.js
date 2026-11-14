import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { getSearchProgress } from './ComputerSearchCore.js';
import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { ensureAlibiDialogueDefinitions, COPPER_EMAIL } from './AlibiDialogueData.js';
import { sendReceiptRequest, deliverReceiptReply, receiptRequestState, restaurantMessages,
  hasArthurAuthorisation, forwardedArthurMessage, forwardArthurAuthorisation, removeArthurForward,
  COPPER_DRAFT, COPPER_SENT, COPPER_REPLY } from './AlibiReceiptService.js';

const KEY=Symbol.for(__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_56dd81d3a5ec0a99278e"));
const REVIEW='alibi_final_report_draft';

export function ensureRestaurantWebsiteEmail(definition=ALIBI_SEARCH_CASE) {
  if(definition?.id!=='borrowed_alibi')return;
  ensureAlibiDialogueDefinitions(definition);
  const page=definition.pages?.find(item=>item.id==='copper_contact');
  if(!page)return;
  page.blocks ??= [];
  if(!page.blocks.some(block=>Array.isArray(block)&&block.some(part=>part?.keywordId==='copper_email'))){
    page.blocks.push([__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_5e1a4f8528db1a3f1f89"),{keywordId:'copper_email',text:COPPER_EMAIL}]);
    page.blocks.push([__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_1a0230604fa8c3488123")]);
  }
}
ensureRestaurantWebsiteEmail();

export function installAlibiDialogueUI(ui,docs) {
  if(ui[KEY])return ui[KEY];
  let dead=false,timer=null,refreshQueued=false;
  const restorers=[],mailHooks=new WeakSet(),searchHooks=new WeakSet();
  const live=()=>!dead&&!ui.destroyed;
  const active=()=>gameState.piQuests?.quests?.pi_stolen_alibi?.status==='active';
  const known=()=>(getSearchProgress().cases.borrowed_alibi?.known||[]).includes('copper_email');
  const wrap=(target,name,factory)=>{
    if(typeof target?.[name]!=='function')return;
    const original=target[name],replacement=factory(original.bind(target));target[name]=replacement;
    restorers.push(()=>{if(target[name]===replacement)target[name]=original;});
  };
  const refresh=()=>{
    if(!live()||refreshQueued)return;refreshQueued=true;
    queueMicrotask(()=>{refreshQueued=false;if(live()&&ui.isOpen&&!ui.suspended&&!ui.booting)ui.render();});
  };
  function scheduleReply(){
    clearTimeout(timer);timer=null;
    const state=receiptRequestState();
    if(!live()||state?.status!=='pending'||!active()||!Number.isFinite(state.dueAt))return;
    const wait=state.dueAt-Date.now();
    if(wait<=0){if(deliverReceiptReply())refresh();return;}
    timer=setTimeout(()=>{timer=null;if(live())scheduleReply();},Math.min(wait,2147483647));
  }
  function ensureDefinitions(){
    ensureRestaurantWebsiteEmail();
    for(const definition of ui.search?.data?.cases||[])ensureRestaurantWebsiteEmail(definition);
  }
  function openDraft(){
    if(!live()||!known())return false;
    if(!active()){ui.notice=__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_f8f967eb8946af9baad4");refresh();return false;}
    if(ui.photoQuest?.contactMail)ui.photoQuest.contactMail.composing=false;
    const received=(gameState.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[]).includes('receipt_received');
    const pending=receiptRequestState()?.status==='pending';
    Object.assign(ui,{app:'mail',selectedId:received?COPPER_REPLY:pending?COPPER_SENT:COPPER_DRAFT,
      listPage:0,bodyPage:0,notice:received?__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_67ab780bff596cb545f1"):''});
    ui.viewToken=(Number(ui.viewToken)||0)+1;refresh();return true;
  }
  function ensureHooks(){
    const mail=ui.photoQuest?.contactMail;
    if(mail&&!mailHooks.has(mail)&&typeof mail.selectRecipient==='function'){
      mailHooks.add(mail);
      wrap(mail,'selectRecipient',original=>(id,...args)=>{
        if(live()&&id==='copper_email'&&known()){openDraft();return;}
        return original(id,...args);
      });
    }
    const search=ui.search;
    if(!search||searchHooks.has(search))return;
    searchHooks.add(search);
    wrap(search,'collect',original=>(id,...args)=>{
      const isRestaurant=search.definition?.id==='borrowed_alibi'&&id==='copper_email';
      const result=original(id,...args);
      if(live()&&isRestaurant&&known())openDraft();
      return result;
    });
    wrap(search,'selectKeyword',original=>(id,...args)=>{
      if(live()&&id==='copper_email'&&known()){openDraft();return;}
      return original(id,...args);
    });
    wrap(search,'load',original=>async(...args)=>{
      const result=await original(...args);if(live())ensureDefinitions();return result;
    });
  }
  function renderDraft(){
    const d=ui.drawing,b=ui.window;
    const x=b.x+24,y=b.y+56,w=b.w-48,bottom=b.y+b.h-48;
    d.rectangle(b.x+9,b.y+48,b.w-18,b.h-95,0xf2ecd6).setInteractive();
    const title=d.text(x,y,__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_5f062d695bf491858113"),21,'#303d35',w);
    const address=d.text(x,title.y+title.height+10,COPPER_EMAIL,17,'#183b63',w);
    const forwarded=forwardedArthurMessage();
    const note=forwarded?__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_d626bc3a32bf41969e72"):
      hasArthurAuthorisation()?__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_a0073c5f4895bdc83d42"):__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_fbfa0fa487154cf45c03");
    const caption=d.text(x,address.y+address.height+10,note,14,'#705a35',w);
    const draft=restaurantMessages().find(item=>item.id===COPPER_DRAFT);
    const bodyY=caption.y+caption.height+12;
    docs.renderPagedText(draft?.body||__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_5d115973d87588cb07d6"),x,bodyY,w,Math.max(50,bottom-bodyY-106));
    d.button(x,bottom-76,forwarded?__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_8be645bcb8a43d447d76"):__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_274726e175aa6d4dc8de"),()=>{
      if(!live()||ui.app!=='mail'||ui.selectedId!==COPPER_DRAFT)return;
      if(forwarded){removeArthurForward();ui.notice=__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_63844c515ad5d430ec47");}
      else{
        const message=docs.getMail().find(item=>item.id==='alibi_arthur_reply');
        ui.notice=forwardArthurAuthorisation(message).message;
      }
      ui.bodyPage=0;refresh();
    },Boolean(draft)&&(Boolean(forwarded)||hasArthurAuthorisation()));
    d.button(x,bottom-30,'BACK',()=>{ui.selectedId=null;ui.bodyPage=0;refresh();});
    d.button(x+w-190,bottom-30,__dialogueText("ui/pi-computer/AlibiDialogueUI.js", "t_107735911597e96e0964"),()=>{
      if(!live()||ui.app!=='mail'||ui.selectedId!==COPPER_DRAFT)return;
      const result=sendReceiptRequest();ui.notice=result.message;
      if(result.ok){ui.selectedId=COPPER_SENT;ui.bodyPage=0;scheduleReply();}
      refresh();
    },Boolean(draft)&&hasArthurAuthorisation()&&Boolean(forwarded));
  }
  wrap(docs.alibiFinale,'mail',original=>(...args)=>original(...args).filter(message=>message.id!==REVIEW));
  wrap(docs,'getMail',original=>(...args)=>{
    ensureDefinitions();ensureHooks();scheduleReply();
    const messages=restaurantMessages(),ids=new Set(messages.map(item=>item.id));
    return [...messages,...original(...args).filter(message=>message.id!==REVIEW&&!ids.has(message.id))];
  });
  wrap(docs,'render',original=>(...args)=>{
    if(!live())return original(...args);
    ensureDefinitions();ensureHooks();scheduleReply();
    if(ui.app==='mail'&&ui.selectedId===COPPER_DRAFT&&active()&&ui.window){renderDraft();return;}
    if(ui.selectedId===REVIEW)ui.selectedId=null;
    return original(...args);
  });
  function destroy(){
    if(dead)return;dead=true;clearTimeout(timer);timer=null;
    ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);ui.scene.events.off('update',ensureHooks);
    for(const restore of restorers.reverse())restore();
    if(ui[KEY]===api)delete ui[KEY];
  }
  const api={destroy,openDraft};ui[KEY]=api;
  ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);ui.scene.events.on('update',ensureHooks);
  wrap(ui,'destroy',original=>(...args)=>{destroy();return original(...args);});
  ensureDefinitions();ensureHooks();scheduleReply();return api;
}
