import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getDeadMenMail } from '../../managers/DeadMenCallingService.js';
import { thiefdokuService } from '../../systems/thiefdoku/ThiefdokuService.js';
import { ComputerAudio } from './ComputerAudio.js';
import { installComputerWorldTime } from './ComputerWorldTime.js';
import { installComputerWeather } from './ComputerWeather.js';
import { installOpenSkiesComputer } from './OpenSkiesComputer.js';
import { COLORS } from './ComputerTheme.js';

const INSTALL = Symbol.for(__dialogueText("ui/pi-computer/PIComputerApps.js", "t_080e4508c59155384a34"));
const BASE = ['mail','ledger','classifieds','chat','office-shop','travel'];
const MANAGED = new Set([...BASE,'search','investigations','audio','photo','thiefdoku']);
const RECORDINGS = new Set(['dead_men_recording_1','dead_men_recording_2','dead_men_recording_3']);
const INSTALL_MS = 3000;
const INSTALL_LINES = [
  'Downloading from the agency server...',
  'Unpacking suspicious archives...',
  'Checking for owls...',
  'Registering desktop icon...',
  'Finishing up...'
];
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
  for (const app of added) next[app] = {reason, seen: BASE.includes(app)};
  gameState.piQuests = {...state,installedComputerApps:next};
  requestAutosave();return added;
}
function unseenApps() {
  const all = installed();
  return Object.keys(all).filter(app => MANAGED.has(app) && all[app]?.seen === false);
}
function markSeen(app) {
  const previous = installed();
  if (!previous[app]) return;
  const state = gameState.piQuests || {version:1,quests:{}};
  gameState.piQuests = {...state,installedComputerApps:{...previous,[app]:{...previous[app],seen:true}}};
  requestAutosave();
}
export function unlockPIComputerApp(app, reason='case_progress') {
  if (!MANAGED.has(app)) throw new Error(`[PIComputerApps] Unknown app: ${app}`);
  return remember([app],reason).length > 0;
}
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
  const entry = installed()[app];
  return Boolean(entry) && entry.seen !== false;
}
export function installPIComputerApps(ui) {
  if (ui[INSTALL]) return ui[INSTALL];
  const restorers = [],extraApps=[];
  let dead=false,lastCheck=-Infinity;
  let install=null,installTimer=null;
  function wrap(target,key,factory) {
    const original=target[key],replacement=factory(original);target[key]=replacement;
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
  function cancelInstall() {
    installTimer?.remove(false);installTimer=null;install=null;
  }
  function startInstall() {
    if(install||dead||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting)return;
    const app=unseenApps()[0];
    if(!app)return;
    const now=ui.scene.time?.now??0;
    install={app,start:now,duration:INSTALL_MS};
    installTimer=ui.scene.time.delayedCall(INSTALL_MS,finishInstall);
    ui.render();
  }
  function finishInstall() {
    const done=install;installTimer=null;install=null;
    if(!done||dead||ui.destroyed)return;
    markSeen(done.app);
    ui.options.onSfx?.('click');
    if(ui.isOpen&&!ui.suspended&&!ui.booting){
      ui.notice=`${TITLES[done.app] || done.app} is now installed. Look for its icon on your desktop.`;
      ui.render();
    }
  }
  function drawInstall() {
    const d=ui.drawing,{x,y,w,h}=ui.layout,dw=520,dh=210;
    const dx=x+Math.round((w-dw)/2),dy=y+Math.round((h-36-dh)/2);
    const title=TITLES[install.app] || install.app;
    d.rectangle(x,y,w,h-36,0x000000,0.45).setOrigin(0,0).setInteractive();
    d.rectangle(dx+8,dy+8,dw,dh,0x050a10,0.5);
    d.bevel(dx,dy,dw,dh,COLORS.window);
    d.rectangle(dx+4,dy+4,dw-8,28,COLORS.titlebar);
    d.pixel(dx+14,dy+12,'INSTALLING NEW SOFTWARE',10,COLORS.titleText);
    d.text(dx+24,dy+52,title,20,COLORS.text,dw-48);
    const status=d.text(dx+24,dy+88,INSTALL_LINES[0],14,'#3a3428',dw-48);
    const bx=dx+24,by=dy+130,bw=dw-48,inner=bw-6;
    d.bevel(bx,by,bw,26,0xc3c2b7,true);
    const bar=d.rectangle(bx+3,by+3,1,20,0x2b7a4b).setOrigin(0,0);
    const pct=d.text(bx+bw,by+34,'0%',13,'#3a3428').setOrigin(1,0);
    const now=ui.scene.time?.now??0;
    const start=Math.min(1,Math.max(0,(now-install.start)/install.duration));
    const paint=value=>{
      const ratio=Math.min(1,Math.max(0,value));
      bar.setSize(Math.max(1,Math.round(inner*ratio)),20);
      pct.setText(`${Math.round(ratio*100)}%`);
      status.setText(INSTALL_LINES[Math.min(INSTALL_LINES.length-1,Math.floor(ratio*INSTALL_LINES.length))]);
    };
    paint(start);
    const progress={p:start};
    ui.monitor.tween({
      targets:progress,p:1,
      duration:Math.max(50,Math.round(install.duration*(1-start))),
      ease:'Sine.easeInOut',
      onUpdate:()=>paint(progress.p)
    });
  }
  wrap(ui.desktop,'createIcon',original=>function(...args){
    const label=String(args[3] || '').replace(/\s+/g,'');
    const app=ICON_APPS[label] || (args[4]==='audio'?'audio':null);
    if(app&&!available(app))return;return original.apply(this,args);
  });
  wrap(ui.shell,'drawStartMenu',original=>function(layout,items,...args){
    const filtered=items.filter(item=>!item.app||available(item.app));
    const clean=filtered.filter((item,index)=>!item.sep||(index>0&&!filtered[index-1].sep&&index<filtered.length-1));
    return original.call(this,layout,clean,...args);
  });
  wrap(ui,'openApp',original=>function(app,...args){
    if(this.destroyed||!this.isOpen||this.suspended||this.booting)return;
    if(install)return;
    if(!available(app)){blocked(app);return;}return original.call(this,app,...args);
  });
  wrap(ui.shell,'open',original=>function(app,...args){
    if(!available(app)){blocked(app);return false;}return original.call(this,app,...args);
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
    const result=original.apply(this,args);
    if(!dead&&install&&ui.isOpen&&!ui.suspended&&!ui.booting&&ui.content)drawInstall();
    return result;
  });
  wrap(ui,'close',original=>function(...args){cancelInstall();return original.apply(this,args);});
  wrap(ui,'suspend',original=>function(...args){cancelInstall();return original.apply(this,args);});
  for(const [name,app] of [['onOpenInvestigations','investigations'],['onOpenWorldTravel','travel']]){
    if(typeof ui.options[name]!=='function')continue;
    wrap(ui.options,name,original=>function(...args){if(!available(app)){blocked(app);return false;}return original.apply(this,args);});
  }
  function step(){
    if(dead||ui.destroyed||!ui.isOpen||ui.suspended||ui.booting)return;
    const now=ui.scene.time?.now??Date.now();if(now-lastCheck<500)return;
    lastCheck=now;
    if(syncPIComputerApps(ui).length&&!install)ui.render();
    startInstall();
  }
  function destroy(){
    if(dead)return;dead=true;
    cancelInstall();
    for(const app of extraApps.slice().reverse())app.destroy();
    ui.scene.events.off('update',step);ui.scene.events.off('shutdown',destroy);
    for(const restore of restorers.reverse())restore();delete ui[INSTALL];
  }
  const api={destroy};ui[INSTALL]=api;
  ui.scene.events.on('update',step);ui.scene.events.once('shutdown',destroy);
  wrap(ui,'destroy',original=>function(...args){destroy();return original.apply(this,args);});
  extraApps.push(installComputerWorldTime(ui));
  extraApps.push(installComputerWeather(ui));
  extraApps.push(installOpenSkiesComputer(ui));
  syncPIComputerApps(ui);return api;
}