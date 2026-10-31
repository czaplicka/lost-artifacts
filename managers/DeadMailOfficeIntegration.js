import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { getDeadMailProgress, setDeadMailStage, canUseDeadMailStage } from './DeadMailManager.js';
import { DEAD_MAIL_MESSAGE, deadMailFieldReady } from './DeadMailCorrespondence.js';

export const DEAD_MAIL_OFFICE_QUEST='pi_dead_mail_preview';
const ADVERT='dead_mail';
export function syncDeadMailOfficeQuest(){
  const quest=getPIQuest(DEAD_MAIL_OFFICE_QUEST);
  if(!quest||quest.metadata?.contentId!=='dead_mail')return null;
  const p=gameState.deadMailPreview||{};
  const done={inspect_photo:Array.isArray(p.clues)&&p.clues.length===3&&p.chapterComplete===true,
    day_shift:p.dayComplete===true,night_shift:p.night?.complete===true,final_report:p.finale?.completed===true};
  const next={...quest,objectives:(quest.objectives||[]).map(o=>({...o,completed:o.completed===true||done[o.id]===true}))};
  if(p.finale?.completed===true){next.status='completed';next.completedAt=quest.completedAt||p.finale.completedAt||new Date().toISOString();}
  let changed=false;
  if(JSON.stringify(next)!==JSON.stringify(quest)){
    const s=gameState.piQuests;gameState.piQuests={...s,quests:{...s.quests,[DEAD_MAIL_OFFICE_QUEST]:next}};changed=true;
  }
  const s=gameState.piInvestigations,c=s?.cases?.[DEAD_MAIL_OFFICE_QUEST];
  if(c&&(c.title!=='Dead Mail'||(next.status==='completed'&&c.status!=='completed'))){
    gameState.piInvestigations={...s,cases:{...s.cases,[DEAD_MAIL_OFFICE_QUEST]:{...c,title:'Dead Mail',
      status:next.status==='completed'?'completed':c.status,board:{...c.board,meta:{...c.board?.meta,title:'Dead Mail'}}}}};changed=true;
  }
  if(changed)requestAutosave();return next;
}
export function deadMailOfficePart(){
  const p=gameState.deadMailPreview||{};
  if(p.dayComplete!==true)return 'day';return p.night?.complete===true?'finale':'night';
}
function officeAlive(ui){return !ui.destroyed&&ui.isOpen&&ui.scene?.sys?.isActive?.()!==false;}
function showClientMail(ui,message=''){
  syncDeadMailOfficeQuest();if(!officeAlive(ui))return;
  if(ui.suspended)ui.resume();
  ui.openApp('mail');ui.selectedId=DEAD_MAIL_MESSAGE;ui.listPage=0;ui.bodyPage=0;ui.notice=message;ui.render();
}
function queueComputerReturn(ui,game,message=''){
  let finished=false;const events=ui.scene.events;
  const cleanup=()=>{events?.off('resume',attempt);events?.off('wake',attempt);events?.off('shutdown',cancel);events?.off('destroy',cancel);game.events.off('poststep',attempt);game.events.off('destroy',cancel);};
  const cancel=()=>{if(!finished){finished=true;cleanup();}};
  const attempt=()=>{
    if(finished)return;if(ui.destroyed||!ui.isOpen){cancel();return;}if(!officeAlive(ui))return;
    finished=true;cleanup();showClientMail(ui,message);
  };
  events?.on('resume',attempt);events?.on('wake',attempt);events?.once('shutdown',cancel);events?.once('destroy',cancel);
  game.events.once('destroy',cancel);game.events.once('poststep',attempt);
}

// Advertisement acceptance now opens the EXISTING mailbox, never a scene pretending to be mail.
export async function openDeadMailFromOffice(ui,advert){
  if(!officeAlive(ui)||ui.suspended||ui.app!=='classifieds'||ui._deadMailLaunching)return false;
  ui._deadMailLaunching=true;
  try{
    if(!getPIQuest(DEAD_MAIL_OFFICE_QUEST))await ui.acceptMission(advert);
    const q=syncDeadMailOfficeQuest();
    if(!q||!['active','completed'].includes(q.status))return false;
    if(!officeAlive(ui)||ui.suspended||ui.app!=='classifieds'||ui.selectedId!==advert.id)return false;
    showClientMail(ui);return true;
  }catch(error){
    console.error('[Dead Mail] Mailbox entry failed:',error);
    if(officeAlive(ui))ui.notice='The client email could not be opened. Your accepted case is preserved.';return false;
  }finally{ui._deadMailLaunching=false;if(officeAlive(ui)&&!ui.suspended)ui.render();}
}

// Only meetings / field investigation / night / finale use Phaser scenes.
export async function openDeadMailFieldFromOffice(ui){
  if(!officeAlive(ui)||ui.suspended||ui.app!=='mail'||ui.selectedId!==DEAD_MAIL_MESSAGE||ui._deadMailLaunching)return false;
  const quest=syncDeadMailOfficeQuest();if(!quest||!['active','completed'].includes(quest.status))return false;
  const part=deadMailOfficePart();if(part==='day'&&!deadMailFieldReady())return false;
  ui._deadMailLaunching=true;let target=null,onExit=null,key=null;
  try{
    let module,SceneClass,open;
    if(part==='finale'){
      module=await import('../scenes/DeadMailFinaleScene.js');key='DeadMailFinaleScene';SceneClass=module.DeadMailFinaleScene;open=module.openDeadMailFinalePreview;
    }else if(part==='night'){
      module=await import('../scenes/DeadMailNightScene.js');key='DeadMailNightScene';SceneClass=module.DeadMailNightScene;open=module.openDeadMailNightPreview;
    }else{
      const p=getDeadMailProgress();
      const fieldStages=['client','map','arrival','cemetery','staff','records','deduction'];
      if(!fieldStages.includes(p.stage)||!canUseDeadMailStage(p.stage)){
        const stage=p.chapterComplete?'cemetery':p.questions.length===3?'map':'client';
        if(!setDeadMailStage(stage))throw Error('The meeting is not unlocked.');
      }
      module=await import('../scenes/DeadMailScene.js');key='DeadMailScene';SceneClass=module.DeadMailScene;open=module.openDeadMailPreview;
    }
    if(!officeAlive(ui)||ui.suspended||ui.app!=='mail'||ui.selectedId!==DEAD_MAIL_MESSAGE)return false;
    if(typeof open!=='function'||typeof SceneClass!=='function')throw Error('Dead Mail scene files are incomplete.');
    const game=ui.scene.game;if(!game.scene.keys[key])game.scene.add(key,SceneClass,false);target=game.scene.keys[key];
    let returned=false;onExit=()=>{
      if(returned)return;returned=true;target.events.off('shutdown',onExit);target.events.off('destroy',onExit);queueComputerReturn(ui,game);
    };
    target.events.once('shutdown',onExit);target.events.once('destroy',onExit);ui.suspend();open(game);return true;
  }catch(error){
    console.error('[Dead Mail] Field entry failed:',error);
    if(target&&onExit){target.events.off('shutdown',onExit);target.events.off('destroy',onExit);}
    if(key&&ui.scene.game.scene.isActive(key))ui.scene.game.scene.stop(key);
    const message='The investigation could not be opened. Your email and progress are preserved.';
    if(officeAlive(ui))showClientMail(ui,message);else queueComputerReturn(ui,ui.scene.game,message);return false;
  }finally{ui._deadMailLaunching=false;if(officeAlive(ui)&&!ui.suspended)ui.render();}
}

export function renderDeadMailOfficeButton(ui,selected,x,y){
  if(selected.id!==ADVERT||selected.missionId!==DEAD_MAIL_OFFICE_QUEST)return false;
  const q=syncDeadMailOfficeQuest(),connected=typeof ui.options.onAcceptMission==='function',busy=ui.accepting||ui._deadMailLaunching;
  const permitted=!q||['active','completed'].includes(q.status);
  const label=!connected?'APPLICATIONS UNAVAILABLE':busy?'PLEASE WAIT...':!permitted?'CASE CLOSED':!q?'ACCEPT CASE':'OPEN CLIENT EMAIL';
  ui.drawing.button(x,y,label,()=>void openDeadMailFromOffice(ui,selected),connected&&permitted&&!busy);return true;
}
export function deadMailMailActionHeight(width){return deadMailFieldReady()&&width<540?100:54;}
export function renderDeadMailMailActions(ui,x,y,width){
  const ready=deadMailFieldReady(),busy=ui._deadMailLaunching;
  ui.drawing.button(x,y,'OPEN PHOTO',()=>void ui.deadMailAttachment?.open(),!busy);
  if(!ready)return;
  const part=deadMailOfficePart(),p=getDeadMailProgress();
  const label=p.finale?.completed?'VIEW EPILOGUE':part==='finale'?'CONTINUE FINALE':part==='night'?'CONTINUE NIGHT':p.questions.length===3?'CONTINUE INVESTIGATION':'MEET FLORENCE';
  ui.drawing.button(width<540?x:x+210,width<540?y+45:y,label,()=>void openDeadMailFieldFromOffice(ui),!busy);
}
