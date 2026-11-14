import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { ThiefdokuPuzzle } from './ThiefdokuPuzzle.js';

const KEY = 'thiefdokuService';
const PUZZLE_KEY = 'daily-puzzle';
const BACKUP_PREFIX = 'daily-backup:';

function localDay() {
  const now = new Date();
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
function read() {
  const saved=gameState[KEY];
  return {version:2,installed:false,medals:0,earned:0,issuedDay:null,rewardedCaseId:null,activeCaseId:null,caseCounter:0,puzzle:null,backups:{},...(saved&&typeof saved==='object'?saved:{})};
}
function write(state) {
  gameState[KEY]=state;
  requestAutosave();
  refreshProfile();
}
function addChiefMessage(text) {
  const chat=gameState.piChat||{version:1,selected:'commandant',contacts:{},unread:{}};
  chat.contacts||={};chat.unread||={};
  const conversation=chat.contacts.commandant||{messages:[],asked:[],facts:[]};
  conversation.messages=[...(conversation.messages||[]),{from:'commandant',text,at:Date.now()}];
  chat.contacts.commandant=conversation;
  chat.unread.commandant=(Number(chat.unread.commandant)||0)+1;
  gameState.piChat=chat;
}
function assignCase(state) {
  state.caseCounter=Math.max(0,Number(state.caseCounter)||0)+1;
  state.activeCaseId=`thiefdoku-${state.caseCounter}`;
  state.issuedDay=localDay();
  return state.activeCaseId;
}

export const thiefdokuService={
  isInstalled(){return read().installed===true;},
  install(){const state=read();if(state.installed)return false;state.installed=true;write(state);return true;},
  getMedals(){return Math.max(0,Number(read().medals)||0);},
  getTotalEarned(){return Math.max(0,Number(read().earned)||0);},
  canIssueCase(){const day=read().issuedDay;return !day||localDay()>day;},
  canTakeNewCase(){return thiefdokuService.canIssueCase();},
  markCaseTaken(){const state=read();if(state.activeCaseId)return false;assignCase(state);write(state);return true;},
  addMedal(amount=1){
    if(!Number.isInteger(amount)||amount!==1)return false;
    const state=read();
    if(!state.activeCaseId||state.rewardedCaseId===state.activeCaseId)return false;
    state.rewardedCaseId=state.activeCaseId;
    state.medals=Math.max(0,Number(state.medals)||0)+1;
    state.earned=Math.max(0,Number(state.earned)||0)+1;
    addChiefMessage('Case closed. One police medal has been credited to your profile. Do not spend it all on evidence.');
    write(state);return true;
  },
  spendMedals(amount){
    if(!Number.isInteger(amount)||amount<=0)return {ok:false,message:'Invalid medal amount.'};
    const state=read(),balance=Math.max(0,Number(state.medals)||0);
    if(balance<amount)return {ok:false,message:'Not enough police medals.'};
    state.medals=balance-amount;write(state);return {ok:true,balance:state.medals};
  }
};

function refreshProfile(){
  if(typeof document==='undefined')return;
  const modal=document.getElementById('profile-modal');if(!modal)return;
  let row=modal.querySelector('#profile-police-medals-row');
  if(!row){
    const anchor=modal.querySelector('#profile-points')?.closest('.profile-info');if(!anchor)return;
    row=document.createElement('p');row.id='profile-police-medals-row';row.className='profile-info';
    const label=document.createElement('strong');label.textContent='Police Medals:';
    const value=document.createElement('span');value.id='profile-police-medals';
    value.style.marginLeft='0.45em';value.style.color='#aa7d24';
    value.title='Currency earned by solving Thiefdoku cases.';
    row.append(label,document.createTextNode(' '),value);anchor.insertAdjacentElement('afterend',row);
  }
  const value=row.querySelector('#profile-police-medals'),balance=String(thiefdokuService.getMedals());
  if(value&&value.textContent!==balance)value.textContent=balance;
}
let profileObserver=null;
function watchProfile(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined'||profileObserver)return;
  const start=()=>{
    if(profileObserver||!document.body)return;
    refreshProfile();profileObserver=new MutationObserver(()=>refreshProfile());
    profileObserver.observe(document.body,{childList:true,subtree:true});
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
}
watchProfile();

function makeStorage(transaction){
  const stateNow=()=>transaction.active?transaction.state:read();
  const store=state=>{if(transaction.active)transaction.state=state;else write(state);};
  return {
    getItem(key){const state=stateNow();return key===PUZZLE_KEY?state.puzzle||null:state.backups?.[BACKUP_PREFIX+key]||null;},
    setItem(key,value){
      const state=stateNow();
      if(key===PUZZLE_KEY)state.puzzle=value;
      else state.backups={...(state.backups||{}),[BACKUP_PREFIX+key]:value};
      store(state);
    },
    removeItem(key){
      const state=stateNow();
      if(key===PUZZLE_KEY)state.puzzle=null;
      else{const backups={...(state.backups||{})};delete backups[BACKUP_PREFIX+key];state.backups=backups;}
      store(state);
    }
  };
}

export function prepareDailyPuzzle(ui){
  const app=ui?.thiefdoku;
  if(!app||app.destroyed)return null;
  if(app.dailyServiceInstalled&&app.puzzle)return app.puzzle;
  if(!thiefdokuService.isInstalled())return null;

  const initialState=read(),hadSavedPuzzle=Boolean(initialState.puzzle);
  const transaction={active:true,state:{...initialState,backups:{...(initialState.backups||{})}}};
  const puzzle=new ThiefdokuPuzzle({storage:makeStorage(transaction),storageKey:PUZZLE_KEY});
  if(!hadSavedPuzzle||!transaction.state.activeCaseId)assignCase(transaction.state);

  const originalSubmit=puzzle.submitGuess.bind(puzzle);
  const originalReset=app.reset.bind(app);
  puzzle.submitGuess=id=>{
    const wasCompleted=puzzle.completed;
    const result=originalSubmit(id);
    if(!wasCompleted&&result.status==='success'){
      if(thiefdokuService.addMedal(1))result.message=`${result.message||'Case closed.'} +1 police medal.`;
    }
    return result;
  };
  const reset=()=>{
    if(app.destroyed)return;
    if(!thiefdokuService.canIssueCase()){
      app.confirmNew=false;
      app.feedback='Today’s case has already been delivered. Next delivery after local midnight.';
      ui.render();return;
    }
    const previous=read();
    const before={...previous,backups:{...(previous.backups||{})}};
    const next={...previous,backups:{...(previous.backups||{})}};
    assignCase(next);write(next);
    try{return originalReset();}catch(error){write(before);throw error;}
  };

  // Commit the daily ID and constructor saves together, after successful creation.
  write(transaction.state);
  transaction.active=false;
  app.puzzle=puzzle;
  app.reset=reset;
  app.dailyServiceInstalled=true;
  app.confirmNew=false;
  app.feedback=puzzle.completed?'Case closed. Your medal is in your profile.':
    puzzle.failed?'Case closed. The thief escaped. Next delivery after local midnight.':
    puzzle.migrated?'New room rules loaded. Your solved-case progress was kept.':
    'Daily case received. Place everyone, then identify the thief.';
  return puzzle;
}

export function installThiefdokuIntegration(ui){
  if(ui.dailyThiefdokuIntegration)return ui.dailyThiefdokuIntegration;
  const originalOpenApp=ui.openApp,originalCreateIcon=ui.desktop.createIcon;
  const wrappedCreateIcon=function(x,y,width,label,kind,color,callback){
    if(label==='Thiefdoku'&&!thiefdokuService.isInstalled())return;
    return originalCreateIcon.call(this,x,y,width,label,kind,color,callback);
  };
  const wrappedOpenApp=function(app){
    if(this.destroyed||!this.isOpen||this.suspended||this.booting)return;
    if(app==='thiefdoku'){
      if(!thiefdokuService.isInstalled()){
        this.notice='THIEFDOKU is not installed. Check your IMEGO messages.';this.render();return;
      }
      try{prepareDailyPuzzle(this);}catch(error){
        console.error('[Thiefdoku] Daily case initialization failed:',error);
        this.notice='The Thiefdoku case file could not be opened. Please try again.';
        this.render();return;
      }
    }
    return originalOpenApp.call(this,app);
  };
  ui.desktop.createIcon=wrappedCreateIcon;ui.openApp=wrappedOpenApp;
  const integration={destroy(){
    if(ui.openApp===wrappedOpenApp)ui.openApp=originalOpenApp;
    if(ui.desktop.createIcon===wrappedCreateIcon)ui.desktop.createIcon=originalCreateIcon;
    delete ui.dailyThiefdokuIntegration;
  }};
  ui.dailyThiefdokuIntegration=integration;
  refreshProfile();return integration;
}
