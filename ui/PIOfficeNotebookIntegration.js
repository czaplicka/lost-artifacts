import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {gameState} from '../GameData.js';
import {installPlayerCloudNotebook} from './PlayerCloudNotebook.js';
import {getQuestHintOffer,purchaseQuestHint} from './pi-computer/QuestHintPurchase.js';

const INSTALL=Symbol.for(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_b834118c6720c73f857b"));
const OFFICE='DetectiveOfficeScene';
const ALLOWED_DEVICES=new Set([null,undefined,'phone','computer']);

function ensureOfficeRefresh(scene){
  if(typeof scene.refreshInteractions==='function')return;
  scene.refreshInteractions=function(){
    if(this.disposed||this._cleanupDone||!this.sys.isActive())return;
    this.update();
    if(!this.canUseOffice())this.tooltip?.setVisible(false);
  };
}

export function officeNotebookVisible(scene){
  return Boolean(scene?.sys?.settings?.key===OFFICE&&scene.sys.isActive()
    &&!scene.disposed&&!scene._cleanupDone&&!scene.navigating&&!scene.debugMode
    &&!scene.computerChild&&!scene.childLoading&&ALLOWED_DEVICES.has(scene.activeDevice));
}
export function createOfficeNotebookFacade(ui){
  const scene=ui.scene;
  const methods=new Map();
  const facadeScene=new Proxy(scene,{
    get(target,key){
      if(key==='activeDevice'&&target.activeDevice==='phone')return null;
      const value=Reflect.get(target,key,target);
      if(typeof value!=='function')return value;
      if(methods.get(key)?.original!==value)methods.set(key,{original:value,bound:value.bind(target)});
      return methods.get(key).bound;
    },
    set(target,key,value){return Reflect.set(target,key,value,target);}
  });
  return new Proxy(ui,{
    get(target,key,receiver){return key==='scene'?facadeScene:Reflect.get(target,key,receiver);},
    set(target,key,value){return Reflect.set(target,key,value,target);}
  });
}
export function phoneNotebookSignature(state,phone){
  const id=phone?.investigation?.active?.caseId;
  if(!phone?.isOpen||!id)return '';
  return JSON.stringify([id,state.piKeywordSearch?.cases?.[id]?.known||[],
    state.playerCloudNotebookV1?.cases?.[id]||null,
    state.piPhoneInvestigations?.cases?.[id]?.flags||[]]);
}
export function bindPhoneNotebookUpdates(ui,notebook){
  const scene=ui.scene;
  let dead=false,signature='',lastCollected=null,binding=null;
  function unbind(){
    if(binding&&binding.inv.collectFragment===binding.wrapper)binding.inv.collectFragment=binding.original;
    binding=null;
  }
  function attach(){
    const inv=scene.phoneUI?.investigation;
    if(inv===binding?.inv)return;
    unbind();
    if(!inv||typeof inv.collectFragment!=='function')return;
    const original=inv.collectFragment;
    const wrapper=function(id,fragments){
      const caseId=this.active?.caseId;
      const result=original.call(this,id,fragments);
      if(result&&caseId)lastCollected={caseId,keywordId:id};
      return result;
    };
    inv.collectFragment=wrapper;binding={inv,original,wrapper};
  }
  function step(){
    if(dead)return;attach();
    const phone=scene.phoneUI,next=phoneNotebookSignature(gameState,phone);
    if(next===signature)return;
    signature=next;
    if(phone?.isOpen&&!phone.destroyed&&phone.investigation?.active&&phone.built)phone.render();
  }
  function reveal(){
    if(dead)return false;
    const inv=scene.phoneUI?.investigation;
    const caseId=inv?.active?.caseId||lastCollected?.caseId||gameState.piKeywordSearch?.selectedCaseId;
    const ids=gameState.piKeywordSearch?.cases?.[caseId]?.known||[];
    const keywordId=lastCollected?.caseId===caseId?lastCollected.keywordId:ids.at(-1);
    return Boolean(caseId&&keywordId&&notebook?.revealKeyword?.(caseId,keywordId));
  }
  function destroy(){if(dead)return;dead=true;unbind();}
  return {step,reveal,destroy};
}
function element(tag,text,cls){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
}
const CSS=`${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_1db4d49fbe79e7ecbc1a")}`;
export function installPIOfficeNotebook(ui){
  const scene=ui.scene;
  ensureOfficeRefresh(scene);
  if(ui[INSTALL])return ui[INSTALL].notebook;
  const before=new Set(document.querySelectorAll(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_ac41b924aa2755fb032c")));
  const notebook=installPlayerCloudNotebook(createOfficeNotebookFacade(ui));
  const notesRoot=[...document.querySelectorAll(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_ac41b924aa2755fb032c"))].find(node=>!before.has(node))||null;
  const phoneSync=bindPhoneNotebookUpdates(ui,notebook);
  let dead=false,lastStep=-Infinity,modal=null,settingsBinding=null,settingsOpening=false;
  let offer=null,questId=null,message='',receipt=null,buying=false;
  const restorers=[];
  const style=element('style',CSS);document.head.append(style);
  const tools=element('nav',undefined,'pio-tools');tools.setAttribute('aria-label',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_61376a26de56a35af936"));
  const hint=element('button','HINT');hint.type='button';tools.append(hint);
  const settings=element('button',undefined,'pio-settings');settings.type='button';
  settings.title=__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_74a883a037bc227f9189");settings.setAttribute('aria-label',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_74a883a037bc227f9189"));
  settings.innerHTML=__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_925c2bdf9ef514f414ed");
  tools.append(settings);document.body.append(tools);
  scene.officeTitle?.destroy();scene.officeTitle=null;
  function wrap(target,key,factory){
    if(typeof target?.[key]!=='function')return;
    const original=target[key],replacement=factory(original);target[key]=replacement;
    restorers.push(()=>{if(target[key]===replacement)target[key]=original;});
  }
  const alive=()=>!dead&&!ui.destroyed&&!scene.disposed&&!scene._cleanupDone;
  function updateVisibility(){
    const active=alive()&&scene.sys.isActive();
    tools.hidden=!(active&&!scene.navigating&&!scene.debugMode&&!scene.activeDevice&&!scene.computerChild&&!scene.childLoading&&!settingsOpening);
    if(notesRoot){
      notesRoot.hidden=!(active&&officeNotebookVisible(scene)&&!ui.suspended);
      if(!notesRoot.hidden)notesRoot.style.removeProperty('display');
    }
  }
  function releaseDevice(type){
    if(scene.activeDevice===type)scene.activeDevice=null;
    if(!alive()||!scene.sys.isActive())return;
    scene.registry.set('currentSceneKey',OFFICE);scene.hideGameplayHud();scene.refreshInteractions();updateVisibility();
  }
  function closeHints(){
    if(!modal)return;
    modal.remove();modal=null;offer=null;receipt=null;message='';
    releaseDevice('office-hint');if(!tools.hidden)hint.focus();
  }
  function availableQuests(){
    return Object.entries(gameState.piQuests?.quests||{}).filter(([,quest])=>quest.status==='active')
      .map(([id,quest])=>({id,title:quest.title||quest.metadata?.title||id,offer:getQuestHintOffer(id)}));
  }
  function drawHints(){
    if(!modal||!alive())return;
    const oldFocus=document.activeElement?.dataset?.action;
    modal.replaceChildren();
    const article=element('article');article.setAttribute('role','dialog');article.setAttribute('aria-modal','true');article.setAttribute('aria-label',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_94d155e57600e9847461"));article.tabIndex=-1;
    modal.append(article);article.append(element('h2',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_dfbbedeca8c56f461882")));
    const quests=availableQuests();
    const select=element('select');select.setAttribute('aria-label',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_006165a612ceec8ab236"));
    for(const q of quests){const option=element('option',q.title);option.value=q.id;select.append(option);}
    if(!quests.some(q=>q.id===questId))questId=quests.find(q=>q.offer)?.id||quests[0]?.id||null;
    if(questId)select.value=questId;
    select.addEventListener('change',()=>{questId=select.value;offer=getQuestHintOffer(questId);receipt=null;message='';drawHints();});
    if(quests.length)article.append(select);
    function button(label,action,enabled=true,actionId=''){
      const node=element('button',label);node.type='button';node.disabled=!enabled||buying;
      if(actionId)node.dataset.action=actionId;
      node.addEventListener('click',()=>{if(alive()&&!node.disabled)action();});article.append(node);return node;
    }
    if(receipt){
      article.append(element('p',`${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_2e45f90106c67c1a90d1")}${receipt.level+1}${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_718ee80768851ce8bb89")}${receipt.text}`));
      button('BACK',()=>{receipt=null;offer=getQuestHintOffer(questId);message='';drawHints();},true,'back');
    }else{
      offer=getQuestHintOffer(questId);
      if(!offer)article.append(element('p',quests.length?__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_a544f11378aed9d0cd27"):__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_0aaa4110dea61890a376")));
      else if(offer.next){
        article.append(element('p',`${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_8f19bfc8a6eefa3f5daa")}${offer.level+1}${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_47e59b4d315635bfd321")}`));
        const free=button(`${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_9aa56441d1dbebae2beb")}${offer.freeCount}${__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_a1ebeeac4735943419f9")}`,()=>buy('free_hint'),offer.freeCount>0,'free');
        const options=element('div',undefined,'pio-options');article.append(options);options.append(free);
        options.append(button(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_5e957cc5f8d8df14b12b"),()=>buy('cut_corners'),true,'bad'));
        options.append(button(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_0095a272f9fc381dab77"),()=>buy('squad_help'),true,'good'));
      }else article.append(element('p',__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_1835ba6bab3d6f9e63fd")));
      if(offer?.latest)button(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_f1236cdfcdb05096096f"),()=>{receipt=offer.latest;message='';drawHints();},true,'review');
    }
    if(message)article.append(element('p',message,'pio-error'));
    button('CLOSE',closeHints,true,'close');
    if(oldFocus)article.querySelector(`[data-action="${oldFocus}"]`)?.focus();else article.focus();
  }
  function buy(method){
    if(buying||!modal||!offer)return;buying=true;
    try{
      const result=purchaseQuestHint(questId,method,offer,OFFICE);
      if(result.success){receipt=result.receipt;message=result.saved===false?__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_eaae88b433b75840d81b"):'';}
      else{message=result.message;offer=getQuestHintOffer(questId);}
    }catch(error){console.error('[PI office assistance]',error);message=__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_6a8f043127d7137baf3b");}
    finally{buying=false;drawHints();}
  }
  function openHints(){
    if(!alive()||!scene.canUseOffice()||modal)return;
    scene.activeDevice='office-hint';scene.refreshInteractions();
    modal=element('div',undefined,'pio-assist');
    modal.addEventListener('keydown',event=>{event.stopPropagation();if(event.key===__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_037c968467aa3fd7c059")){event.preventDefault();closeHints();}});
    for(const type of ['pointerdown','pointerup','click','wheel'])modal.addEventListener(type,event=>event.stopPropagation());
    document.body.append(modal);receipt=null;message='';drawHints();updateVisibility();
  }
  async function openSettings(){
    if(!alive()||!scene.canUseOffice()||settingsOpening)return;
    let child=null,onClose=null;
    try{
      settingsOpening=true;scene.activeDevice='office-settings';scene.refreshInteractions();updateVisibility();
      const {SettingsScene}=await import('../scenes/SettingsScene.js');
      if(!alive()||!scene.sys.isActive())return;
      if(!scene.game.scene.keys.SettingsScene)scene.game.scene.add('SettingsScene',SettingsScene,false);
      child=scene.game.scene.keys.SettingsScene;
      if(child.sys.isActive()||child.sys.isPaused()||child.sys.isSleeping())throw new Error('Settings are already open.');
      onClose=()=>{settingsBinding=null;settingsOpening=false;releaseDevice('office-settings');};
      settingsBinding={child,onClose};child.events.once('shutdown',onClose);
      scene.hideGameplayHud();scene.scene.launch('SettingsScene');scene.scene.bringToTop('SettingsScene');
    }catch(error){
      if(child&&onClose)child.events.off('shutdown',onClose);
      settingsBinding=null;
      if(alive()){scene.showFeedback(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_7be3fb5016c1c9153535"));console.error('[PI office settings]',error);}
    }finally{
      if(!settingsBinding){settingsOpening=false;releaseDevice('office-settings');}
    }
  }
  hint.addEventListener('click',openHints);settings.addEventListener('click',()=>void openSettings());
  wrap(scene,'deviceClosed',original=>function(...args){const result=original.apply(this,args);this.refreshInteractions();phoneSync.step();updateVisibility();return result;});
  wrap(scene,'deviceOpened',original=>function(...args){const result=original.apply(this,args);updateVisibility();return result;});
  function step(){
    if(!alive())return;updateVisibility();
    const now=scene.time?.now??Date.now();if(now-lastStep<120)return;lastStep=now;
    phoneSync.step();
  }
  const handle=notesRoot?.querySelector(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_19380311105cba9f2828"));
  function onNotesClick(){
    if(!scene.phoneUI?.isOpen)return;
    queueMicrotask(()=>{
      if(!alive())return;
      const paper=notesRoot?.querySelector(__dialogueText("ui/PIOfficeNotebookIntegration.js", "t_7161f0f9dc27778223ff"));
      if(paper&&!paper.hidden)phoneSync.reveal();
    });
  }
  handle?.addEventListener('click',onNotesClick);
  function destroy(){
    if(dead)return;dead=true;
    settingsBinding?.child.events.off('shutdown',settingsBinding.onClose);settingsBinding=null;
    modal?.remove();modal=null;tools.remove();style.remove();phoneSync.destroy();
    handle?.removeEventListener('click',onNotesClick);
    scene.events.off('update',step);scene.events.off('resume',updateVisibility);scene.events.off('wake',updateVisibility);
    scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);
    for(const restore of restorers.reverse())restore();
    if(ui[INSTALL]===api)delete ui[INSTALL];
  }
  const api={notebook,destroy};ui[INSTALL]=api;
  scene.events.on('update',step);scene.events.on('resume',updateVisibility);scene.events.on('wake',updateVisibility);
  scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
  wrap(ui,'destroy',original=>function(...args){destroy();return original.apply(this,args);});
  updateVisibility();queueMicrotask(()=>{if(alive())phoneSync.step();});
  return notebook;
}