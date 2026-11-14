import {gameState} from '../GameData.js';
import {installPlayerCloudNotebook} from './PlayerCloudNotebook.js';
import {getQuestHintOffer,purchaseQuestHint} from './pi-computer/QuestHintPurchase.js';

const INSTALL=Symbol.for('lostArtifacts.piOfficeNotebookIntegration.v1');
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
const CSS=`
.pio-tools{position:fixed;right:16px;top:16px;z-index:10500;display:flex;gap:10px;align-items:center}
.pio-tools[hidden],.pio-assist[hidden]{display:none!important}
.pio-tools button,.pio-assist button,.pio-assist select{font-family:SpecialElite,'Special Elite',monospace;font-size:18px;color:#fff1ce;background:#28231c;border:2px solid #bd9e4c;padding:10px 14px;cursor:pointer;min-height:44px}
.pio-tools button:hover,.pio-assist button:hover{background:#493b25}
.pio-tools button:focus-visible,.pio-assist button:focus-visible,.pio-assist select:focus-visible{outline:3px solid #ffe28a;outline-offset:3px}
.pio-tools .pio-settings{width:48px;padding:8px;display:flex;align-items:center;justify-content:center}
.pio-settings svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2}
.pio-assist{position:fixed;inset:0;z-index:13000;background:#000b;display:flex;justify-content:center;align-items:center;padding:16px;box-sizing:border-box}
.pio-assist *{box-sizing:border-box}
.pio-assist article{background:#eee1b7;color:#344b3a;border:3px solid #b18c37;box-shadow:0 12px 50px #0009;padding:24px;width:min(720px,100%);max-height:calc(100vh - 32px);overflow:auto;font-family:SpecialElite,'Special Elite',monospace;font-size:19px;line-height:1.5}
.pio-assist h2{margin:0 0 16px;font-size:25px}.pio-assist p{white-space:pre-wrap}
.pio-assist select{width:100%;margin:0 0 16px}.pio-assist button{margin:6px 8px 6px 0;font-size:17px}
.pio-assist button:disabled{opacity:.45;cursor:default}.pio-assist .pio-options{display:grid;gap:10px}
.pio-assist .pio-options button{width:100%;text-align:left;margin:0}.pio-assist .pio-error{color:#8a362a}
@media(max-width:600px){.pio-tools{top:8px;right:8px;gap:6px}.pio-tools button{font-size:14px;padding:8px}.pio-assist article{padding:16px;font-size:17px}}
`;
export function installPIOfficeNotebook(ui){
  const scene=ui.scene;
  ensureOfficeRefresh(scene);
  if(ui[INSTALL])return ui[INSTALL].notebook;
  const before=new Set(document.querySelectorAll('.pcn'));
  const notebook=installPlayerCloudNotebook(createOfficeNotebookFacade(ui));
  const notesRoot=[...document.querySelectorAll('.pcn')].find(node=>!before.has(node))||null;
  const phoneSync=bindPhoneNotebookUpdates(ui,notebook);
  let dead=false,lastStep=-Infinity,modal=null,settingsBinding=null,settingsOpening=false;
  let offer=null,questId=null,message='',receipt=null,buying=false;
  const restorers=[];
  const style=element('style',CSS);document.head.append(style);
  const tools=element('nav',undefined,'pio-tools');tools.setAttribute('aria-label','PI office controls');
  const hint=element('button','HINT');hint.type='button';tools.append(hint);
  const settings=element('button',undefined,'pio-settings');settings.type='button';
  settings.title='Settings';settings.setAttribute('aria-label','Settings');
  settings.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m13 3 6 0 1 4 3 2 4-1 3 5-3 3v3l3 3-3 5-4-1-3 2-1 4h-6l-1-4-3-2-4 1-3-5 3-3v-3l-3-3 3-5 4 1 3-2z" transform="translate(1 -1) scale(.94)"/><circle cx="16" cy="16" r="5"/></svg>';
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
    const article=element('article');article.setAttribute('role','dialog');article.setAttribute('aria-modal','true');article.setAttribute('aria-label','Case assistance');article.tabIndex=-1;
    modal.append(article);article.append(element('h2','CASE ASSISTANCE'));
    const quests=availableQuests();
    const select=element('select');select.setAttribute('aria-label','Active case');
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
      article.append(element('p',`Hint ${receipt.level+1}/3\n\n${receipt.text}`));
      button('BACK',()=>{receipt=null;offer=getQuestHintOffer(questId);message='';drawHints();},true,'back');
    }else{
      offer=getQuestHintOffer(questId);
      if(!offer)article.append(element('p',quests.length?'No assistance is available for this case at this stage.':'There are no active cases.'));
      else if(offer.next){
        article.append(element('p',`Next hint: ${offer.level+1}/3.\nFree hints use your shared supply. No money, energy or time cost in Home Town.`));
        const free=button(`USE FREE HINT (${offer.freeCount}) — integrity unchanged`,()=>buy('free_hint'),offer.freeCount>0,'free');
        const options=element('div',undefined,'pio-options');article.append(options);options.append(free);
        options.append(button('CUT CORNERS — integrity -1',()=>buy('cut_corners'),true,'bad'));
        options.append(button('DOCUMENTED HELP — integrity +1',()=>buy('squad_help'),true,'good'));
      }else article.append(element('p','All hints for this step have been obtained. You can review the latest hint for free.'));
      if(offer?.latest)button('REVIEW LATEST — FREE',()=>{receipt=offer.latest;message='';drawHints();},true,'review');
    }
    if(message)article.append(element('p',message,'pio-error'));
    button('CLOSE',closeHints,true,'close');
    if(oldFocus)article.querySelector(`[data-action="${oldFocus}"]`)?.focus();else article.focus();
  }
  function buy(method){
    if(buying||!modal||!offer)return;buying=true;
    try{
      const result=purchaseQuestHint(questId,method,offer,OFFICE);
      if(result.success){receipt=result.receipt;message=result.saved===false?'Autosave failed. Your progress may not survive a reload.':'';}
      else{message=result.message;offer=getQuestHintOffer(questId);}
    }catch(error){console.error('[PI office assistance]',error);message='Could not obtain assistance. Reopen hints to check your latest receipt.';}
    finally{buying=false;drawHints();}
  }
  function openHints(){
    if(!alive()||!scene.canUseOffice()||modal)return;
    scene.activeDevice='office-hint';scene.refreshInteractions();
    modal=element('div',undefined,'pio-assist');
    modal.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closeHints();}});
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
      if(alive()){scene.showFeedback('Settings could not be opened.');console.error('[PI office settings]',error);}
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
  const handle=notesRoot?.querySelector('.pcn-handle');
  function onNotesClick(){
    if(!scene.phoneUI?.isOpen)return;
    queueMicrotask(()=>{
      if(!alive())return;
      const paper=notesRoot?.querySelector('.pcn-paper');
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