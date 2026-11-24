import { supabase } from '../supabase-client.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { hintManager } from '../managers/HintManager.js';
import { moneyManager } from '../managers/MoneyManager.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { AgencyMailApp } from '../ui/mark-agency/AgencyMailApp.js';
import { EventBus } from '../EventBus.js';

const REWARDS = [
 {label:'$100 agency budget',kind:'cash',joke:'Agency funds. Your personal yacht remains unfunded.'},
 {label:'1 Coffee',kind:'coffee',joke:'For legal reasons, we call this coffee.'},
 {label:'1 Rest Voucher',kind:'rest',joke:'Permission to stop working. Temporarily.'},
 {label:'1 Hint',kind:'hint',joke:'One useful thought, courtesy of someone else.'},
 {label:'1 Free Transfer',kind:'transfer',joke:'Go somewhere. Preferably work-related.'}
];
const RECEIPTS='daily_login_reward_receipts_v1';
const PREFIX='lost-artefacts:daily-login-delivery:v1:';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const receipts=()=>MainStoryManager.getSideClue(RECEIPTS)||{};
const scope=()=>gameState._createdAt == null ? null : String(gameState._createdAt);
const idOf=r=>`daily_login:${r.user_id}:${r.day}`;
let installed=null;
function bounded(operation){
 let timer;
 return Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error('Connection timed out. Try again to resume delivery.')),15000);
 })]).finally(()=>clearTimeout(timer));
}

class DailyRewards {
 constructor(game){
  this.game=game;this.row=null;this.userId=null;this.busy=false;
  this.checking=null;this.lastCheck=0;this.error='';this.disposed=false;
  this.listeners=new Set();this.epoch=0;
 }
 notify(){for(const ui of this.listeners){if(!ui.destroyed&&ui.isOpen)ui.render();}}
 async user(){
  const {data,error}=await bounded(()=>supabase.auth.getUser());
  if(error)throw error;
  if(!data?.user?.id||data.user.is_anonymous!==false)throw Error('Sign in to a registered account to collect daily rewards.');
  return data.user.id;
 }
 async rpc(action,userId,args={}){
  const {data,error}=await bounded(()=>supabase.rpc('daily_login_reward',{
   p_action:action,p_expected_user_id:userId,...args
  }));
  if(error){const e=Error(error.code==='PGRST202'?'Install the daily rewards SQL migration first.':error.message);e.code=error.code;throw e;}
  if(!data||data.user_id!==userId||!Number.isInteger(data.index)||!REWARDS[data.index]
   ||!/^\d{4}-\d{2}-\d{2}$/.test(data.day)||!['offered','reserved','delivered'].includes(data.state)){
   throw Error('Invalid reward response.');
  }
  return data;
 }
 clearAccount(){this.epoch++;this.row=null;this.userId=null;this.lastCheck=0;this.error='';this.notify();}
 refresh(force=false){
  if(this.disposed||this.busy||!gameState.isGameActive)return Promise.resolve();
  if(this.checking)return this.checking;
  if(!force&&Date.now()-this.lastCheck<60000)return Promise.resolve();
  this.lastCheck=Date.now();
  const epoch=this.epoch;
  this.checking=(async()=>{
   try{
    const userId=await this.user();
    const row=await this.rpc('status',userId);
    if(this.disposed||epoch!==this.epoch)return;
    const current=await this.user();
    if(current!==userId||epoch!==this.epoch)return;
    this.userId=userId;this.row=row;this.error='';
   }catch(error){
    if(epoch===this.epoch){this.row=null;this.error=error.message;}
   }finally{this.checking=null;if(!this.disposed)this.notify();}
  })();
  return this.checking;
 }
 mail(){
  const r=this.row;if(!r)return [];
  const reward=REWARDS[r.index],done=r.state==='delivered';
  return [{id:idOf(r),from:'Mark Agency // Human Resources',
   subject:`Attendance bonus: ${reward.label}`,date:r.day+' UTC',category:'memo',priority:10000,
   body:`You showed up again. We appreciate your commitment, or your inability to find the exit.\n\nAttendance reward ${r.index+1} of ${REWARDS.length}: ${reward.label}.\n\n${reward.joke}\n\n${done?'Reward collected. HR has filed the paperwork.':'Collect your reward below. Money is added to your agency budget, not your personal cash. Coffee is delivered to your inventory; vouchers and hints are added to your existing resources.'}\n\nMissed a day? Your place in the rotation is safe.\n\nHuman Resources\nMark Agency`,
   action:{type:'daily_login_reward',label:done?'Collected':this.busy?'Collecting...':'Claim reward'},
   actionEnabled:!done&&!this.busy}];
 }
 pending(userId){
  const raw=localStorage.getItem(PREFIX+userId);if(!raw)return null;
  const p=JSON.parse(raw);
  if(p.userId!==userId||!UUID.test(p.token)||typeof p.scope!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)){
   throw Error('Invalid pending reward. Do not clear browser storage; contact support.');
  }
  return p;
 }
 journal(p){
  const text=JSON.stringify(p),key=PREFIX+p.userId;
  localStorage.setItem(key,text);
  if(localStorage.getItem(key)!==text)throw Error('Cannot save delivery journal.');
 }
 async claim(messageId){
  if(this.busy)throw Error('A reward is already being collected.');
  this.busy=true;this.notify();
  try{
   const locks=globalThis.navigator?.locks;
   const run=()=>this.performClaim(messageId);
   return await (locks?.request?locks.request('lost-artefacts:daily-login-reward',run):run());
  }finally{this.busy=false;this.lastCheck=0;this.notify();}
 }
 async performClaim(messageId){
  if(!gameState.isGameActive)throw Error('Load a game before collecting your reward.');
  const userId=await this.user(),campaign=scope();
  if(!campaign)throw Error('No active campaign.');
  let p=this.pending(userId);
  if(p&&p.scope!==campaign)throw Error('Finish the pending reward in its original campaign.');
  let r;
  if(!p){
   r=await this.rpc('status',userId);
   if(idOf(r)!==messageId)throw Error('The daily offer changed. Refresh your mail.');
   if(r.state==='delivered')throw Error('Reward already collected.');
   if(r.state==='reserved')throw Error('Finish the pending delivery in the browser where you started it.');
   if(REWARDS[r.index].kind==='coffee'){
    await ItemsLoader.load();this.checkCoffee();
   }
   if(saveGameState()!==true)throw Error('Save failed. Reward was not collected.');
   p={userId,scope:campaign,day:r.day,token:crypto.randomUUID()};this.journal(p);
  }
  const args={p_scope:p.scope,p_token:p.token,p_day:p.day};
  try{r=await this.rpc('reserve',userId,args);}catch(error){if(error.code==='P0002')localStorage.removeItem(PREFIX+userId);throw error;}
  if(await this.user()!==userId||scope()!==campaign||!gameState.isGameActive)throw Error('Account or campaign changed. Return to the original game to finish delivery.');
  const grantId=idOf(r);
  if(r.state==='delivered'){localStorage.removeItem(PREFIX+userId);this.row=r;return REWARDS[r.index].label+' (previously collected)';}
  if(!Object.prototype.hasOwnProperty.call(receipts(),grantId)){
   if(REWARDS[r.index].kind==='coffee'){await ItemsLoader.load();this.checkCoffee();}
   if(await this.user()!==userId||scope()!==campaign)throw Error('Account or campaign changed.');
   this.apply(r);
  }else if(saveGameState()!==true)throw Error('Save failed. Try collecting again.');
  const ack=await this.rpc('ack',userId,args);
  if(await this.user()!==userId||scope()!==campaign)throw Error('Account or campaign changed after delivery.');
  localStorage.removeItem(PREFIX+userId);
  this.row=ack;this.userId=userId;this.error='';
  return REWARDS[r.index].label;
 }
 checkCoffee(){
  const item=ItemsLoader.get('consumables','coffee');
  if(!item?.id)throw Error('Coffee is missing from the item catalogue.');
  const current=inventoryManager.getItem(item.id);
  if(current&&(!current.stackable||current.quantity>=999))throw Error('Your coffee stack is full.');
  if(!current&&inventoryManager.getCapacity().current>=inventoryManager.getCapacity().max)throw Error('Inventory full. Make room, then collect your coffee.');
 }
 apply(r){
  const grantId=idOf(r),kind=REWARDS[r.index].kind;
  const before={cash:gameState.cash,agencyBudget:gameState.agencyBudget,moneyLog:structuredClone(gameState.moneyLog||[]),
   restVouchers:gameState.restVouchers,freeTransfers:gameState.freeTransfers,
   hintState:structuredClone(gameState.hintState??null),inventory:inventoryManager.exportState(),
   receipts:structuredClone(receipts())};
  try{
   // Keep the existing receipt IDs to prevent duplicate deliveries.
   MainStoryManager.setSideClue(RECEIPTS,{...before.receipts,[grantId]:{day:r.day,index:r.index}});
   if(kind==='cash')moneyManager.addAgencyBudget(100,{category:'daily_login',description:'HR attendance bonus',metadata:{grantId}});
   if(kind==='coffee'&&!inventoryManager.addItem({...structuredClone(ItemsLoader.get('consumables','coffee')),quantity:1}))throw Error('Could not add coffee.');
   if(kind==='rest')gameState.updateState({restVouchers:Number(gameState.restVouchers||0)+1});
   if(kind==='transfer')gameState.updateState({freeTransfers:Number(gameState.freeTransfers||0)+1});
   if(kind==='hint'){
    const h=hintManager.readState();
    if(!h.bonusGrants.some(g=>g.id===grantId))h.bonusGrants.push({id:grantId,amount:1,label:'HR attendance bonus'});
    gameState.updateState({hintState:h});
   }
   if(saveGameState()!==true)throw Error('Reward could not be saved. Try again.');
  }catch(error){
   gameState.updateState({cash:before.cash,agencyBudget:before.agencyBudget,moneyLog:before.moneyLog,restVouchers:before.restVouchers,
    freeTransfers:before.freeTransfers,hintState:before.hintState});
   inventoryManager.importState(before.inventory);
   MainStoryManager.setSideClue(RECEIPTS,before.receipts);
   throw error;
  }
  EventBus.emit('hints:changed',hintManager.buildSummary(hintManager.readState()));
 }
}

export function installDailyLoginRewards(game){
 if(installed)return installed;
 const service=new DailyRewards(game);installed=service;
 const originalGetMail=AgencyMailApp.prototype.getMail;
 const originalBar=AgencyMailApp.prototype.renderActionBar;
 AgencyMailApp.prototype.getMail=function(){
  if(!service.listeners.has(this.ui)){
   service.listeners.add(this.ui);
   this.ui.scene.events.once('shutdown',()=>service.listeners.delete(this.ui));
   this.ui.scene.events.once('destroy',()=>service.listeners.delete(this.ui));
  }
  // Never render asynchronously inside the synchronous render path.
  return [...service.mail(),...originalGetMail.call(this)];
 };
 AgencyMailApp.prototype.renderActionBar=function(selected,paper,barY,x0){
  if(selected.action?.type!=='daily_login_reward')return originalBar.call(this,selected,paper,barY,x0);
  const ui=this.ui,d=ui.drawing;
  d.rectangle(paper.x,barY,paper.w,50,0xe6ddbb);
  d.rectangle(paper.x,barY,paper.w,2,0xd4af37,.7);
  const button=d.button(x0,barY+10,selected.action.label,async()=>{
   if(service.busy||ui.destroyed)return;
   const epoch=service.epoch,campaign=scope();
   try{
    const reward=await service.claim(selected.id);
    if(!ui.destroyed&&service.epoch===epoch&&scope()===campaign)ui.notice=`Collected: ${reward}.`;
   }catch(error){if(!ui.destroyed&&service.epoch===epoch)ui.notice=error.message;}
   finally{if(!ui.destroyed&&ui.isOpen)ui.render();}
  },selected.actionEnabled&&!ui.nextAssignmentBusy);
  const x=button.x+button.width+14;
  d.text(x,barY+10,ui.notice||'One reward per real day. Reset: 00:00 UTC.',13,'#665535',Math.max(80,paper.x+paper.w-x-12));
 };
 const tick=()=>{if(document.visibilityState!=='hidden')void service.refresh();};
 const ready=()=>{service.lastCheck=0;tick();};
 const focus=()=>{service.lastCheck=0;tick();};
 game.events.on('player-entry-started',ready);
 game.events.on('player-authenticated',ready);
 window.addEventListener('focus',focus);
 const timer=window.setInterval(tick,15000);
 const {data}=supabase.auth.onAuthStateChange(()=>{
  service.clearAccount();setTimeout(()=>void service.refresh(true),0);
 });
 game.events.once('destroy',()=>{
  service.disposed=true;clearInterval(timer);data.subscription.unsubscribe();
  window.removeEventListener('focus',focus);
  game.events.off('player-entry-started',ready);game.events.off('player-authenticated',ready);
  AgencyMailApp.prototype.getMail=originalGetMail;AgencyMailApp.prototype.renderActionBar=originalBar;
  service.listeners.clear();installed=null;
 });
 tick();return service;
}
