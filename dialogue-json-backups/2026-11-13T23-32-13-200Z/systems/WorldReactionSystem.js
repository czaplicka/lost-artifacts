import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { installPIWorldReactionMail } from '../ui/PIWorldReactionMail.js';
import { installWorldNpcReactions } from '../ui/WorldNpcReactionHooks.js';
import { installWorldTownReactions } from '../ui/WorldTownReactionHooks.js';
import {
  captureWorldOutcomes,latestOfficeReaction,officeReactionSeen,
  markOfficeReactionSeen,worldOfficeText
} from './WorldReactionModel.js';

const games=new WeakMap();
const scheduledScenes=new WeakSet();
const activeScene=scene=>Boolean(scene&&!scene._cleanupDone&&scene.sys?.isActive?.());

export function readWorldOperationContext(game){
  const keys=game?.scene?.keys||{},context={};
  const apartment=keys.ApartmentScene;
  if(activeScene(apartment)&&typeof apartment.getProgress==='function'){
    context.apartment={active:true,caseKey:apartment.caseKey,suspectId:apartment.suspectId,
      missionId:apartment.mission?.id??null,visit:apartment.getProgress()?.arrestVisit??null};
  }
  const gameOver=keys.GameOverScene;
  if(activeScene(gameOver))context.gameOver={active:true,caseId:gameOver.caseId,reasonCode:gameOver.reasonCode};
  return context;
}
export function syncWorldReactions(game=null){
  const events=captureWorldOutcomes(gameState,Date.now(),readWorldOperationContext(game));
  if(events.length&&gameState.caseFailed!==true)requestAutosave();
  return events;
}
function connectPIComputer(game){
  const scene=game.scene?.keys?.DetectiveOfficeScene;
  if(scene?.computerUI&&!scene._cleanupDone)installPIWorldReactionMail(scene.computerUI);
}
export function installWorldReactions(game){
  if(!game?.events)return null;
  if(games.has(game)){games.get(game).sync();return games.get(game);}
  let dead=false,last=-Infinity;
  const sync=()=>{
    if(dead)return[];
    try{
      const events=syncWorldReactions(game);
      connectPIComputer(game);
      installWorldNpcReactions(game);
      installWorldTownReactions(game);
      return events;
    }catch(error){console.error('[WorldReactions]',error);return[];}
  };
  const step=()=>{const now=Date.now();if(now-last<200)return;last=now;sync();};
  const destroy=()=>{
    if(dead)return;dead=true;
    game.events.off('poststep',step);game.events.off('destroy',destroy);games.delete(game);
  };
  const api={sync,destroy};games.set(game,api);
  game.events.on('poststep',step);game.events.once('destroy',destroy);
  sync();return api;
}
function showOfficeBulletin(scene,event){
  const width=Math.max(220,Math.min(880,scene.scale.width-32));
  const font=Math.max(16,Math.min(28,Math.round(scene.scale.width/60)));
  const root=scene.add.container(0,0).setDepth(1900).setScrollFactor(0);
  const text=scene.add.text(0,0,worldOfficeText(event),{
    fontFamily:'SpecialElite, monospace',fontSize:`${font}px`,color:'#f4e3bc',
    wordWrap:{width:width-44},lineSpacing:5,align:'left'
  }).setOrigin(0.5,0);
  const height=text.height+86;
  const background=scene.add.rectangle(0,0,width,height,0x172532,0.97).setOrigin(0.5,0).setStrokeStyle(2,0xb69b64);
  text.setPosition(0,18);
  const close=scene.add.text(0,height-42,'CLOSE',{
    fontFamily:'SpecialElite, monospace',fontSize:`${font}px`,color:'#ffe3a0'
  }).setOrigin(0.5,0).setInteractive({useHandCursor:true});
  root.add([background,text,close]);
  const layout=()=>root.setPosition(scene.scale.width/2,Math.max(16,Math.min(140,scene.scale.height-height-20)));
  let dead=false,timer=null;
  const dispose=()=>{
    if(dead)return;dead=true;timer?.remove(false);
    scene.scale.off('resize',layout);scene.events.off('shutdown',dispose);root.destroy(true);
  };
  close.on('pointerdown',(pointer,x,y,event)=>{event?.stopPropagation();dispose();});
  scene.scale.on('resize',layout);scene.events.once('shutdown',dispose);
  timer=scene.time.delayedCall(12000,dispose);layout();return root;
}
export function queueWorldOfficeReaction(scene){
  const key=scene?.sys?.settings?.key;
  const system=key==='OfficeScene'?'agency':key==='DetectiveOfficeScene'?'pi':null;
  if(!system||scheduledScenes.has(scene))return;
  scheduledScenes.add(scene);
  const present=()=>{
    if(scene._cleanupDone||!scene.sys.isActive())return;
    try{
      syncWorldReactions(scene.game);
      if(system==='pi'&&scene.computerUI)installPIWorldReactionMail(scene.computerUI);
      const event=latestOfficeReaction(gameState,system);
      if(!event||officeReactionSeen(gameState,event.id))return;
      showOfficeBulletin(scene,event);
      if(markOfficeReactionSeen(gameState,event.id)&&gameState.caseFailed!==true)requestAutosave();
    }catch(error){console.error('[WorldReactions] Office reaction failed:',error);}
  };
  const schedule=()=>scene.time.delayedCall(180,present);
  const dispose=()=>{
    scheduledScenes.delete(scene);scene.events.off('wake',schedule);scene.events.off('resume',schedule);
  };
  scene.events.on('wake',schedule);scene.events.on('resume',schedule);scene.events.once('shutdown',dispose);
  schedule();
}
