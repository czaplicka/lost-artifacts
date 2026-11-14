import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getDeadMenMail } from '../../managers/DeadMenCallingService.js';
import { thiefdokuService } from '../../systems/thiefdoku/ThiefdokuService.js';
import { ComputerAudio } from './ComputerAudio.js';

const INSTALL = Symbol.for(__dialogueText("ui/pi-computer/PIComputerApps.js", "t_080e4508c59155384a34"));
const BASE = ['mail','ledger','classifieds','chat','office-shop','travel'];
const MANAGED = new Set([...BASE,'search','investigations','audio','photo','thiefdoku']);
const RECORDINGS = new Set(['dead_men_recording_1','dead_men_recording_2','dead_men_recording_3']);
const ICON_APPS = {
  'Mail':'mail','PersonalLedger':'ledger','Classifieds':'classifieds',
  'Investigations':'investigations','WorldTravel':'travel','IMEGO':'chat',
  'WebSearch':'search','OwlSearch':'search','OwlAudio':'audio',
  'Thiefdoku':'thiefdoku','OfficeShop':'office-shop'
};
const TITLES = {search:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_6f6ca128fbbdf22488f9"),investigations:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_21476f00fdcfab750c7e"),audio:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_5ddde5a18bc919b6ce35"),travel:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_53fb6f891d4e250ec47e"),photo:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_c17959fcc266deba71d6"),thiefdoku:__dialogueText("ui/pi-computer/PIComputerApps.js", "t_5cf46358ab38145b427c")};

function installed() {
  const value = gameState.piQuests?.installedComputerApps;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function remember(apps, reason) {
  const previous = installed();
  const added = apps.filter(app => MANAGED.has(app) && !previous[app]);
  if (!added.length) return [];
  const state = gameState.piQuests || {version:1,quests:{}};
  const next = {...previous};
  for (const app of added) next[app] = {reason};
  gameState.piQuests = {...state,installedComputerApps:next};
  requestAutosave();
  return added;
}
export function unlockPIComputerApp(app, reason='case_progress') {
  if (!MANAGED.has(app)) throw new Error(`[PIComputerApps] Unknown app: ${app}`);
  return remember([app],reason).length > 0;
}
// Compatibility with callers from the earlier version; travel is now a base app.
export function unlockPIWorldTravel(clueId='agency_access') {
  return unlockPIComputerApp('travel',`travel_access:${clueId}`);
}
function imageAttachment(message) {
  return Array.isArray(message?.attachments) && message.attachments.some(item =>
    item && (item.type === 'image' || /\.(webp|png|jpe?g)(?:[?#]|$)/i.test(item.imageUrl || item.url || ''))
  );
}
export function syncPIComputerApps(ui) {
  const eligible = [...BASE];
  const searchCases = Object.values(gameState.piKeywordSearch?.cases || {});
  if (searchCases.some(item => Array.isArray(item?.known) && item.known.length > 0)) eligible.push('search');
  const quests = Object.values(gameState.piQuests?.quests || {});
  if (quests.some(item => item && (item.acceptedAt || ['active','completed','failed'].includes(item.status)))) eligible.push('investigations');
  if (getDeadMenMail().some(message => RECORDINGS.has(message.id))) eligible.push('audio');
  if (thiefdokuService.isInstalled()) eligible.push('thiefdoku');
  if ((ui?.photoQuest?.accepted && ui.photoQuest.data?.photo) || ui?.documents?.getMail?.().some(imageAttachment)) eligible.push('photo');
  return remember(eligible,'existing_progress');
}
export function isPIComputerAppInstalled(app, ui=null) {
  if (!MANAGED.has(app)) return true;
  syncPIComputerApps(ui);
  return Boolean(installed()[app]);
}

export function installPIComputerApps(ui) {
  if (ui[INSTALL]) return ui[INSTALL];
  const restorers = [];
  let dead=false,lastCheck=-Infinity;
  function wrap(target,key,factory) {
    const original=target[key];
    const replacement=factory(original);
    target[key]=replacement;
    restorers.push(()=>{if(target[key]===replacement)target[key]=original;});
  }
  function available(app) {
    const ok=isPIComputerAppInstalled(app,ui);
    if(ok && app==='audio' && !ui.audioApp) ui.audioApp=new ComputerAudio(ui);
    return ok;
  }
  function blocked(app) {
    ui.menuOpen=false;
    ui.notice=`${TITLES[app] || __dialogueText("ui/pi-computer/PIComputerApps.js", "t_eb034a81e15da7e43f80")}${__dialogueText("ui/pi-computer/PIComputerApps.js", "t_a5f83d5d2e8d15ec47f9")}`;
    if(ui.isOpen&&!ui.suspended&&!ui.booting&&!ui.destroyed)ui.render();
  }
  wrap(ui.desktop,'createIcon',original=>function(...args){
    const label=String(args[3] || '').replace(/\s+/g,'');
    const app=ICON_APPS[label] || (args[4]==='audio'?'audio':null);
    if(app&&!available(app))return;
    return original.apply(this,args);
  });
  wrap(ui.shell,'drawStartMenu',original=>function(layout,items,...args){
    const filtered=items.filter(item=>!item.app||available(item.app));
    const clean=filtered.filter((item,index)=>!item.sep||(index>0&&!filtered[index-1].sep&&index<filtered.length-1));
    return original.call(this,layout,clean,...args);
  });
  wrap(ui,'openApp',original=>function(app,...args){
    if(this.destroyed||!this.isOpen||this.suspended||this.booting)return;
    if(!available(app)){blocked(app);return;}
    return original.call(this,app,...args);
  });
  wrap(ui.shell,'open',original=>function(app,...args){
    if(!available(app)){blocked(app);return false;}
    return original.call(this,app,...args);
  });
  wrap(ui.monitor,'renderApplication',original=>function(...args){
    if(!available(ui.app)){
      const box=ui.window||ui.layout;
      if(box)ui.drawing.text(box.x+20,box.y+54,__dialogueText("ui/pi-computer/PIComputerApps.js", "t_8c513ddbbef05929c07a"),16,'#e4dfc2',Math.max(100,box.w-40));
      return;
    }
    return original.apply(this,args);
  });
  wrap(ui.monitor,'render',original=>function(...args){
    if(!dead&&!ui.destroyed)syncPIComputerApps(ui);
    return original.apply(this,args);
  });
  for(const [name,app] of [['onOpenInvestigations','investigations'],['onOpenWorldTravel','travel']]){
    if(typeof ui.options[name]!=='function')continue;
    wrap(ui.options,name,original=>function(...args){
      if(!available(app)){blocked(app);return false;}
      return original.apply(this,args);
    });
  }
  function step(){
    if(dead||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting)return;
    const now=ui.scene.time?.now??Date.now();
    if(now-lastCheck<500)return;
    lastCheck=now;
    if(syncPIComputerApps(ui).length)ui.render();
  }
  function destroy(){
    if(dead)return;
    dead=true;
    ui.scene.events.off('update',step);
    ui.scene.events.off('shutdown',destroy);
    for(const restore of restorers.reverse())restore();
    delete ui[INSTALL];
  }
  const api={destroy};
  ui[INSTALL]=api;
  ui.scene.events.on('update',step);
  ui.scene.events.once('shutdown',destroy);
  wrap(ui,'destroy',original=>function(...args){destroy();return original.apply(this,args);});
  syncPIComputerApps(ui);
  return api;
}