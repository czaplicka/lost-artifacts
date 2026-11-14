import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { getKnownApartmentIdentityClues } from '../../scenes/apartament/ApartmentIdentityEvidence.js';
import { MIN_TRAITS } from '../../ui/warrant/warrantConfig.js';
import { ChaseTutorialOverlay } from './ChaseTutorialOverlay.js';
import { getHud,getPanel,menuTarget,npcTargets,hotelTargets,boardTargets } from './ChaseTutorialTargets.js';

const TUTORIAL_SCENES=new Set(['CityScene','LocationScene','HotelScene','ArrestSelectionScene']);
const NON_BLOCKING_SCENES=new Set(['PlayerHudScene','UIScene','NewsHud','EnergyHudScene','__LostArtifactsAudioHost','__AssetWorkerScene']);

export function installChaseTutorial(game){
  if(game.chaseTutorial)return game.chaseTutorial;
  const tutorial=new ChaseTutorial(game);game.chaseTutorial=tutorial;return tutorial;
}

class ChaseTutorial {
  constructor(game){
    this.game=game;this.lastTick=0;this.context=null;
    this.overlay=new ChaseTutorialOverlay(game,()=>this.skipCurrentTutorial());
    this.tickBound=time=>{if(time-this.lastTick<120)return;this.lastTick=time;this.tick();};
    game.events.on('poststep',this.tickBound);game.events.once('destroy',()=>this.destroy());
  }
  get state(){return gameState.onboarding?.chase;}
  save(){requestAutosave();}
  ensureOnboarding(){
    if(!gameState.onboarding||typeof gameState.onboarding!=='object'||Array.isArray(gameState.onboarding))gameState.onboarding={};
    return gameState.onboarding;
  }
  ensureChaseState(scene){
    const onboarding=this.ensureOnboarding();
    if(!onboarding.chase){
      onboarding.chase={version:3,cityId:scene.cityId,step:'npc',interviewed:[],completed:false,skipped:false,
        warrantOpened:false,warrantChanged:false,boardSeen:false,theoryIntroduced:false,identityEnvelopeViewed:false};
      this.save();
    }
    const state=onboarding.chase;
    if(state.version!==3){
      state.interviewed=Array.isArray(state.interviewed)?state.interviewed:[];
      state.warrantOpened??=false;state.warrantChanged??=false;state.boardSeen??=false;
      state.theoryIntroduced??=false;state.identityEnvelopeViewed??=false;
      if(state.step==='board_close')state.step='theory';
      if(!state.completed&&!state.skipped&&state.step==='warrant'&&!state.warrantChanged)state.step='inventory';
      state.version=3;this.save();
    }
    return state;
  }
  ensureArrestState(){
    const onboarding=this.ensureOnboarding();
    if(!onboarding.arrestSelection){onboarding.arrestSelection={version:1,step:'arrest',completed:false,skipped:false};this.save();}
    return onboarding.arrestSelection;
  }
  step(next){if(!this.state||this.state.step===next)return;this.state.step=next;this.save();}
  finish(skipped=false){if(!this.state)return;Object.assign(this.state,{completed:true,skipped,step:'finished'});this.save();this.overlay.hide();}
  finishArrest(skipped=false){Object.assign(this.ensureArrestState(),{completed:true,skipped,step:'finished'});this.save();this.overlay.hide();}
  skipCurrentTutorial(){if(this.context==='arrest')this.finishArrest(true);else if(this.context==='chase')this.finish(true);}
  activeScene(){
    const scenes=this.game.scene.getScenes(true);
    const foreign=scenes.some(scene=>{
      const key=scene.sys.settings.key;
      if(TUTORIAL_SCENES.has(key)||NON_BLOCKING_SCENES.has(key))return false;
      if(key==='LoadingOverlayScene'&&scene.sys.settings.visible===false)return false;
      return true;
    });
    if(foreign)return null;
    return [...scenes].reverse().find(scene=>TUTORIAL_SCENES.has(scene.sys.settings.key)&&scene.sys.settings.visible!==false)||null;
  }
  syncWitnesses(scene){
    if(scene.sys.settings.key!=='CityScene'||typeof scene.getEncounters!=='function')return;
    const ids=new Set(this.state.interviewed);
    for(const entry of scene.getEncounters())if(entry.npcId&&gameState.encounterMemory?.[entry.id]?.askedTopics?.length)ids.add(entry.npcId);
    if(ids.size!==this.state.interviewed.length){this.state.interviewed=[...ids];this.save();}
  }
  identityEnvelope(){
    const known=new Set(getKnownApartmentIdentityClues().map(clue=>clue.id));
    return inventoryManager.getAllItems().find(item=>{
      const original=item?.metadata?.apartment?.item;
      return Number(item?.quantity??1)>0&&original?.isIdentityLead===true&&
        original.identityLead?.field==='eyes'&&known.has(original.id);
    })||null;
  }
  renderEnvelopeTutorial(hud,count){
    const envelope=this.identityEnvelope();
    if(!envelope){this.overlay.render('envelope_missing',count);return;}
    if(!inventoryManager.isOpen){
      this.overlay.render('inventory',count,menuTarget(hud,'inventory'));return;
    }
    const selected=inventoryManager.getSelectedItem();
    if(selected?.id===envelope.id&&!this.state.identityEnvelopeViewed){
      this.state.identityEnvelopeViewed=true;this.save();
    }
    if(this.state.identityEnvelopeViewed){
      this.overlay.render('envelope_done',count);return;
    }
    this.overlay.render('envelope',count);
  }
  issueTargets(warrant){
    const targets=[];
    const walk=object=>{
      if(object?.type===__dialogueText("tutorials/chase/ChaseTutorial.js", "t_71988c4d8e0803ba4519")&&object.input?.enabled&&/^\[\s*ISSUE\s*\]$/.test(object.text||''))targets.push(object);
      if(Array.isArray(object?.list))object.list.forEach(walk);
    };
    (warrant.results?.objects||[]).forEach(walk);return targets;
  }
  renderWarrantTutorial(warrant,count){
    if(!this.state.warrantOpened){this.state.warrantOpened=true;this.save();}
    if(warrant._issued){
      if(!this.state.warrantChanged){this.state.warrantChanged=true;this.save();}
      this.overlay.render('warrant_issued',count);return;
    }
    const countTraits=Object.values(warrant.currentFilters||{}).filter(value=>value>0).length;
    const clue=getKnownApartmentIdentityClues().find(entry=>entry.category==='eyes');
    const eyeValue=warrant.traitsData?.eyes?.[warrant.currentFilters?.eyes];
    const eyesMatch=clue&&String(eyeValue).trim().toUpperCase()===String(clue.value).trim().toUpperCase();
    if(countTraits<MIN_TRAITS||!eyesMatch){
      this.overlay.render('warrant_edit',count,[
        ...(warrant.traitValueTexts||[]).map(entry=>entry.textObj),warrant.identityBtn
      ].filter(Boolean));return;
    }
    if(warrant._searching){this.overlay.render('warrant_searching',count);return;}
    const targets=this.issueTargets(warrant);
    if(targets.length){this.overlay.render('warrant_issue',count,targets);return;}
    const hasResults=Boolean(warrant.results?.objects?.length);
    this.overlay.render(hasResults?'warrant_no_match':'warrant_search',count,[warrant.searchBtn]);
  }
  getTheoryElements(board){
    const root=board?.boardApi?.board?.root;
    const host=root?.closest?.(__dialogueText("tutorials/chase/ChaseTutorial.js", "t_5f4a8917bd85d04d9691"))?.parentElement;
    if(!host)return{tab:null,panel:null,visible:false};
    const tab=[...host.querySelectorAll(__dialogueText("tutorials/chase/ChaseTutorial.js", "t_1aa45dc7f5ac81c3a830"))].find(button=>button.textContent.trim()===__dialogueText("tutorials/chase/ChaseTutorial.js", "t_43071101a92f96747165"));
    const panel=host.querySelector(__dialogueText("tutorials/chase/ChaseTutorial.js", "t_1376a2cbb0911e97b614"));
    return{tab,panel,visible:Boolean(panel&&!panel.hidden&&panel.getClientRects().length)};
  }
  renderBoardTutorial(board,count){
    if(!board?.boardApi){this.overlay.hide();return;}
    if(!this.state.boardSeen){this.state.boardSeen=true;this.save();}
    const theory=this.getTheoryElements(board);
    if(this.state.theoryIntroduced){this.overlay.render('return',count);return;}
    if(theory.visible){
      this.step('theory');this.overlay.render('theory_edit',count,[],{
        nextLabel:__dialogueText("tutorials/chase/ChaseTutorial.js", "t_501721f0699ef8abe8d4"),onNext:()=>{
          if(!this.state||this.state.completed)return;this.state.theoryIntroduced=true;this.step('return');
        }
      });return;
    }
    if(this.state.step==='theory'){this.overlay.render('theory_open',count,[theory.tab]);return;}
    this.overlay.render('board_edit',count,[theory.tab],{nextLabel:__dialogueText("tutorials/chase/ChaseTutorial.js", "t_1ff57a29d7c9d11bdf61"),onNext:()=>this.step('theory')});
  }
  tickArrest(scene){
    this.context='arrest';const state=this.ensureArrestState();
    if(state.completed||scene.isLeaving||scene.resultCommitted||scene.selectionLocked||scene.confirmOpen||
      scene.zoomOverlay?.visible||!scene.arrestButton||!scene.displaySuspects?.length){this.overlay.hide();return;}
    if(state.step==='arrest_theory'){
      this.overlay.render('arrest_theory',null,[],{nextLabel:__dialogueText("tutorials/chase/ChaseTutorial.js", "t_c3424f902d041d5fc16d"),onNext:()=>this.finishArrest(false)});return;
    }
    const targets=[scene.leftArrow,scene.rightArrow].filter(target=>target&&typeof target.getBounds==='function');
    this.overlay.render('arrest',null,targets,{nextLabel:__dialogueText("tutorials/chase/ChaseTutorial.js", "t_1ff57a29d7c9d11bdf61"),onNext:()=>{state.step='arrest_theory';this.save();}});
  }
  tick(){
    const scene=this.activeScene();
    if(!scene||scene._cleanupDone){this.context=null;this.overlay.hide();return;}
    const key=scene.sys.settings.key;
    if(key==='ArrestSelectionScene'){this.tickArrest(scene);return;}
    this.context='chase';
    if(!this.state){
      if(key!=='CityScene'||!scene.uiReady||scene.isFinalShowdown||scene.cityId===gameState.crimeCityId){this.overlay.hide();return;}
    }
    const state=this.ensureChaseState(scene);
    if(state.completed||state.skipped){this.overlay.hide();return;}
    if(key==='CityScene'&&scene.cityId!==state.cityId){this.finish(false);return;}
    if(scene.cityId!==state.cityId||scene.isFinalShowdown||scene.cityDebug?.enabled){this.overlay.hide();return;}
    const hud=getHud(this.game);
    if(!hud||(key==='CityScene'&&(!scene.uiReady||scene.activePopup||scene.isTransitioning))){this.overlay.hide();return;}
    this.syncWitnesses(scene);
    const count=Math.min(3,state.interviewed.length);
    const warrant=getPanel(hud,'warrantUI'),board=getPanel(hud,'crimeBoardUI'),destinations=getPanel(hud,'destinationsUI');
    const openPanels=hud.getOpenPanels().filter(name=>name!=='playerMenu');
    const inventoryStep=state.step==='inventory';
    if(openPanels.some(name=>!['warrantUI','crimeBoardUI','destinationsUI'].includes(name)&&
      !(inventoryStep&&inventoryManager.isOpen&&/inventory/i.test(name)))){this.overlay.hide();return;}
    if(state.step==='npc'&&count>0&&!state.warrantChanged){this.step('inventory');}
    if(state.step==='inventory'){
      if(state.identityEnvelopeViewed&&!inventoryManager.isOpen)this.step('warrant');
      else{
        if(warrant?.isOpen||board?.isOpen||destinations?.isOpen){this.overlay.hide();return;}
        if(key==='CityScene'){this.renderEnvelopeTutorial(hud,count);return;}
      }
    }
    if(warrant?.isOpen){
      if(state.step==='warrant')this.renderWarrantTutorial(warrant,count);
      else this.overlay.hide();return;
    }
    if(state.step==='warrant'&&state.warrantOpened&&gameState.arrestWarrantIssued){
      state.warrantChanged=true;this.step('hotel');
    }
    if(board?.isOpen){
      if(['hotel','board','theory','return','board_close'].includes(state.step))this.renderBoardTutorial(board,count);
      else this.overlay.hide();return;
    }
    if(state.step==='return'&&key==='CityScene')this.step('npc');
    if(key==='LocationScene'){
      if(scene.entryBlocked||scene.isFalseLead||!scene.reputationAccess?.allowed||!scene.npcController){this.overlay.hide();return;}
      const remaining=(scene.topicButtons||[]).filter(button=>!scene.askedTopics?.has(button.topicId));
      this.overlay.render(remaining.length?'dialogue':'leave',count,
        remaining.length?remaining.map(button=>button.text):[scene.leaveButton]);return;
    }
    if(key==='HotelScene'){
      if(scene.isChoosingHotel){this.overlay.render('booking',count);return;}
      if(scene.isHotelInteractionBlocked()){this.overlay.hide();return;}
      if(['hotel','board','theory','board_close'].includes(state.step)){
        if(state.step==='hotel')this.step('board');
        this.overlay.render('board',count,boardTargets(scene));return;
      }
      const targets=(scene.hotspotUI?.zones||[]).filter(entry=>entry.cfg.id==='hotel-window-exit').map(entry=>entry.zone);
      this.overlay.render('return',count,targets);return;
    }
    if(key!=='CityScene'){this.overlay.hide();return;}
    if(state.step==='warrant'){this.overlay.render('warrant',count,menuTarget(hud,'warrant'));return;}
    if(['hotel','board','theory','board_close'].includes(state.step)){this.overlay.render('hotel',count,hotelTargets(scene));return;}
    if(count>=3){
      this.step('travel');this.overlay.render(destinations?.isOpen?'travel_choose':'travel',count,
        destinations?.isOpen?[]:menuTarget(hud,'plane'));return;
    }
    if(destinations?.isOpen){this.overlay.hide();return;}
    this.overlay.render('npc',count,npcTargets(scene,state.interviewed));
  }
  destroy(){this.game.events.off('poststep',this.tickBound);this.overlay.destroy();if(this.game.chaseTutorial===this)this.game.chaseTutorial=null;}
}
