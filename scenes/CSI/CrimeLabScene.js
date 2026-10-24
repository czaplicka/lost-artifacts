import {BaseScene} from '../BaseScene.js';
import {gameState} from '../../GameData.js';
import {CrimeLabManager} from './CrimeLabManager.js';
import {CrimeLabHUD} from './CrimeLabHUD.js';
import {CrimeLabView} from './CrimeLabView.js';
import {CrimeLabAudioController} from './CrimeLabAudioController.js';
import {EventBus} from '../../EventBus.js';
import {getLabOnboardingConfig} from './labOnboardingConfig.js';
import {CrimeLabEvidenceService} from './CrimeLabEvidenceService.js';
import {CrimeLabAssistantDialog} from './CrimeLabAssistantDialog.js';
import {CrimeLabTimeController} from './CrimeLabTimeController.js';
import {TicketAnalysisPanel} from './TicketAnalysisPanel.js';
import {advanceCrimeTutorial} from '../../CrimeCityTutorial.js';
const STATION_IDS=['identity','trace_0','trace_1'];

export class CrimeLabScene extends BaseScene {
  constructor(){
    super({key:'CrimeLabScene'});this.gameState=gameState;this.cityId=null;this.returnScene='CrimeCityScene';this.returnData={};
    this.currentView='lab_intro';this.labManager=this.evidenceService=this.timeController=this.audioController=null;
    this.labOnboarding=this.labView=this.hud=this.assistantDialog=this.assistantHotspot=null;this.ticketPanel=null;
    this.hotspots=[];this.debugTexts=[];this.DEBUG_HOTSPOTS=false;this.debugGraphics=null;
    this.leftArrow=this.rightArrow=this.navHint=this.introHint=null;this.navigationArrowStates=new Map();
    this.introHintTween=this.introHintTimer=this.greetingTimer=null;
    this.uiLocked=false;this.isExitingLab=false;this.completedCount=0;this.totalStations=STATION_IDS.length;
    this.activeMiniGameSession=this.miniGameLoadToken=this.labRunToken=null;this.labCleanupDone=false;
    this.boundMoveLeft=this.moveLeft.bind(this);this.boundMoveRight=this.moveRight.bind(this);
    this.boundForceUnlock=this.forceUnlock.bind(this);this.boundCheckMiniGameResults=this.checkMiniGameResults.bind(this);
    this.boundCleanupScene=this.cleanupScene.bind(this);
  }
  init(data={}){
    this.detachMiniGameListeners();this.ticketPanel?.destroy();this.ticketPanel=null;
    this.labCleanupDone=false;this.labRunToken={};this.miniGameLoadToken=null;
    this.gameState=data.gameState||gameState;this.cityId=data.cityId||this.gameState.currentMission?.city||this.gameState.crimeCityId||'paris';
    this.returnScene='CrimeCityScene';this.returnData={...(data.returnData||{}),cityId:this.cityId,gameState:this.gameState};
    this.labManager=new CrimeLabManager(this.gameState,this.cityId);this.labManager.ensureCaseForensics();this.labManager.ensureRandomTraceEvidence();
    this.evidenceService=new CrimeLabEvidenceService(this.gameState,this.labManager,this.cityId);
    this.timeController=new CrimeLabTimeController(this);this.labOnboarding=this.getLabOnboarding();
    this.evidenceService.ensureAssistantResults(this.getAssistantStationIds());
    this.currentView='lab_intro';this.hotspots=[];this.debugTexts=[];this.uiLocked=false;this.isExitingLab=false;
    this.completedCount=this.getCompletedRequiredStationCount();
  }
  create(){
    super.create();this.game.events.emit('setHudVisible',false);EventBus.emit('hideHUD');
    this.audioController=new CrimeLabAudioController(this);this.audioController.init();this.audioController.setupAudioUnlock();
    if(!this.sound.locked)this.audioController.playLabAmbient();
    const{width,height}=this.scale;
    this.labView=new CrimeLabView(this,{initialView:'lab_intro',introBackgroundKey:this.getIntroBackgroundKey(),onViewChanged:view=>{
      this.currentView=view;if(this.leftArrow&&this.rightArrow)this.updateNavVisibility();
      if(this.hotspots.length)this.updateRoomHotspots();this.ticketPanel?.refresh();this.hideNavHint();
    }});
    this.labView.create(width,height);this.createHotspots();this.createAssistantHotspot();this.createNavigationUI();
    this.hud=new CrimeLabHUD(this);this.hud.create();this.assistantDialog=new CrimeLabAssistantDialog(this);
    this.ticketPanel=new TicketAnalysisPanel(this);this.ticketPanel.create();this.createOptionalDebug();
    this.labView.showView('lab_intro');this.updateRoomHotspots();this.showIntroHint();this.hud.refreshFromScene();
    if(this.labOnboarding?.assistantPresent){
      const token=this.labRunToken;
      this.greetingTimer=this.time.delayedCall(250,()=>{
        this.greetingTimer=null;if(this.labRunToken===token&&!this.uiLocked&&!this.isExitingLab&&!this.assistantDialog?.isOpen())this.openAssistantDialogue('greeting');
      });
    }
    this.input.keyboard?.on('keydown-LEFT',this.boundMoveLeft);this.input.keyboard?.on('keydown-RIGHT',this.boundMoveRight);
    this.events.on(Phaser.Scenes.Events.WAKE,this.boundForceUnlock);this.events.on(Phaser.Scenes.Events.RESUME,this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.RESUME,this.boundCheckMiniGameResults);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.boundCleanupScene);this.events.once(Phaser.Scenes.Events.DESTROY,this.boundCleanupScene);
  }
  getLabOnboarding(){
    const m=this.gameState?.currentMission??{},index=String(m.caseIndex??m.index??this.gameState?.currentCaseIndex??this.gameState?.caseIndex??0);
    const schedule=m.onboarding??this.gameState?.currentOnboarding??this.gameState?.onboardingSchedule?.[index]??{lab:'call_only'};
    return getLabOnboardingConfig(schedule.lab??'call_only');
  }
  getIntroBackgroundKey(){return this.labOnboarding?.backgroundKey||'crimelab_point';}
  getPlayerGameCount(){const v=Number(this.labOnboarding?.playerGameCount);return Number.isFinite(v)?Phaser.Math.Clamp(Math.floor(v),0,this.totalStations):this.totalStations;}
  getAssistantResultCount(){const v=Number(this.labOnboarding?.assistantResultCount);return Number.isFinite(v)?Phaser.Math.Clamp(Math.floor(v),0,this.totalStations):0;}
  getLabStationAssignment(){
    const player=this.getPlayerGameCount(),assistant=this.getAssistantResultCount();
    if(player+assistant!==this.totalStations){
      console.warn('[CrimeLabScene] Invalid onboarding station counts.',{player,assistant});
      return{playerStationIds:STATION_IDS.slice(0,player),assistantStationIds:STATION_IDS.slice(player)};
    }
    return{playerStationIds:STATION_IDS.slice(0,player),assistantStationIds:STATION_IDS.slice(player,player+assistant)};
  }
  getRequiredStationIds(){return this.getLabStationAssignment().playerStationIds;}
  getAssistantStationIds(){return this.getLabStationAssignment().assistantStationIds;}
  isStationRequired(id){return this.getRequiredStationIds().includes(id);}
  getSavedStationResult(id){
    if(!STATION_IDS.includes(id)||!this.evidenceService)return null;
    let result=this.evidenceService.getStoredStationResult?.(id);
    if(!result){
      const state=this.labManager?.ensureCaseForensics();
      result=id==='identity'?state?.identityEvidenceResult:state?.traceEvidenceResults?.[Number(id.slice(-1))];
    }
    if(!result||result.aborted===true||result.completed===false||result.success===false)return null;
    if(result.caseKey!=null&&String(result.caseKey)!==String(this.labManager?.getCaseKey()))return null;
    const hasValue=[result.value,result.result,result.correctValue,result.selectedValue].some(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
    if(!hasValue)return null;
    return result;
  }
  getCompletedRequiredStationCount(){return this.getRequiredStationIds().filter(id=>this.getSavedStationResult(id)).length;}
  getPendingAssistantCount(){return this.getAssistantStationIds().filter(id=>!this.getSavedStationResult(id)).length;}
  isLabComplete(){return STATION_IDS.every(id=>Boolean(this.getSavedStationResult(id)));}
  getRemainingAnalysisCount(){return Math.max(0,this.getRequiredStationIds().length-this.getCompletedRequiredStationCount());}
  getEvidenceConfigForStation(id){return this.evidenceService?.getStationEvidenceConfig(id)||null;}
  getAssistantResultSummaries(){
    return this.getAssistantStationIds().map(stationId=>{
      const result=this.getSavedStationResult(stationId);if(!result)return null;
      const value=result.displayValue??result.value??result.result??result.correctValue??result.selectedValue;
      let text=result.clueText||result.description||result.clue?.text||'Report recorded.';
      const origin=result.sourceText||result.evidenceConfig?.sourceText||'';
      if(origin&&!text.includes(origin))text+=`\nSample origin: ${origin}`;
      return{stationId,label:result.label||result.evidenceConfig?.label||'Forensic Analysis',value,
        text:`Result: ${String(value).replace(/_/g,' ')}\n${text}`};
    }).filter(Boolean);
  }
  stationStatus(id){
    const complete=Boolean(this.getSavedStationResult(id)),required=this.isStationRequired(id);
    return{text:required?(complete?'[ COMPLETE ]':'[ ANALYZE ]'):(complete?'[ ASSISTANT RESULT ]':'[ REPORT PENDING ]'),
      color:complete?'#39ff14':'#ffcc00',complete};
  }
  openAssistantDialogue(startNodeId='greeting'){
    if(this.uiLocked||this.isExitingLab||!this.labOnboarding?.assistantPresent||this.assistantDialog?.isOpen())return;
    const dialogue=this.cache.json.get('crime_lab_assistant_dialogues');
    if(!dialogue?.nodes){this.showNavHint('LAB ASSISTANT DIALOGUE UNAVAILABLE');return;}
    const resolved=dialogue.nodes[startNodeId]?startNodeId:dialogue.defaultNodeId;
    if(!resolved||!dialogue.nodes[resolved]){this.showNavHint('DIALOGUE NODE MISSING');return;}
    const opened=this.assistantDialog.open({dialogue,startNodeId:resolved,onClose:()=>{if(!this.isExitingLab)this.applyLock(false);}});
    if(opened)this.applyLock(true);
  }
  createAssistantHotspot(){
    if(!this.labOnboarding?.assistantPresent)return;
    this.assistantHotspot=this.add.zone(220,340,230,410).setOrigin(0,0).setDepth(50).setInteractive({useHandCursor:true});
    this.assistantHotspot.on('pointerover',()=>{if(!this.uiLocked)this.showNavHint('Talk to Lab Assistant');});
    this.assistantHotspot.on('pointerout',()=>this.hideNavHint());this.assistantHotspot.on('pointerdown',()=>this.openAssistantDialogue('greeting'));
  }
  createHotspots(){
    const identity=this.labManager.getIdentityEvidenceConfig(),trace0=this.labManager.getTraceEvidenceConfig(0),trace1=this.labManager.getTraceEvidenceConfig(1);
    const action=(e,index,id)=>()=>this.enterMiniGame(e.minigame,{evidenceConfig:e,evidenceIndex:index,evidenceType:e.evidenceType,correctValue:e.correctValue,clueType:e.clueType,clueText:e.clueText},id);
    const list=[
      {id:'identity_station',stationId:'identity',room:'lab_a',x:320,y:490,width:250,height:320,label:identity.label,action:action(identity,null,'identity')},
      {id:'trace_a_station',stationId:'trace_0',room:'lab_b',x:480,y:420,width:350,height:300,label:trace0.label,action:action(trace0,0,'trace_0')},
      {id:'trace_b_station',stationId:'trace_1',room:'lab_c',x:480,y:420,width:350,height:300,label:trace1.label,action:action(trace1,1,'trace_1')},
      {id:'exit_lab',room:'lab_intro',x:40,y:40,width:200,height:60,label:'Exit Lab',alwaysVisible:true,action:()=>this.exitLab()}
    ];
    this.completedCount=this.getCompletedRequiredStationCount();
    list.forEach(data=>{
      data.completed=data.stationId?Boolean(this.getSavedStationResult(data.stationId)):false;
      const zone=this.add.zone(data.x,data.y,data.width,data.height).setOrigin(0,0).setDepth(50).setInteractive({useHandCursor:true});zone.hotspotData=data;
      if(data.id==='exit_lab'){
        const button=this.add.image(data.x+data.width/2,data.y+data.height/2,'btnExit').setScale(.5).setOrigin(.5).setDepth(55).setInteractive({useHandCursor:true});
        button.on('pointerover',()=>{if(!this.uiLocked){button.setScale(.6);this.showNavHint(data.label);}});
        button.on('pointerout',()=>{button.setScale(.5);this.hideNavHint();});
        button.on('pointerdown',()=>{if(!this.uiLocked&&!this.isExitingLab)data.action();});zone.exitBtn=button;
      }
      zone.on('pointerover',()=>this.onHotspotOver(data));zone.on('pointerout',()=>this.onHotspotOut());
      zone.on('pointerdown',()=>{
        if(this.uiLocked||this.isExitingLab||(data.completed&&!data.alwaysVisible)||(data.stationId&&!this.isStationRequired(data.stationId)))return;data.action();
      });this.hotspots.push(zone);
      if(!data.alwaysVisible){
        const status=this.stationStatus(data.stationId);
        zone.statusLabel=this.add.text(data.x+data.width/2,data.y+data.height+10,status.text,{fontFamily:'PressStart2P',fontSize:'8px',color:status.color}).setOrigin(.5).setDepth(60);
      }
    });this.updateRoomHotspots();
  }
  safeSetInteractive(object){if(!object||object.isDestroyed||!object.scene?.sys?.input)return;object.setInteractive?.({useHandCursor:true});}
  safeDisableInteractive(object){if(!object||object.isDestroyed||!object.input)return;object.disableInteractive?.();}
  updateRoomHotspots(){
    this.hotspots.forEach(zone=>{
      if(!zone||zone.isDestroyed)return;const data=zone.hotspotData,visible=data?.room===this.currentView,required=!data?.stationId||this.isStationRequired(data.stationId);
      zone.setVisible(visible);zone.statusLabel?.setVisible(visible);zone.exitBtn?.setVisible(visible);
      if(!visible||this.uiLocked||this.isExitingLab||!required||(data?.completed&&!data?.alwaysVisible)){this.safeDisableInteractive(zone);this.safeDisableInteractive(zone.exitBtn);return;}
      this.safeSetInteractive(zone);this.safeSetInteractive(zone.exitBtn);
    });
    if(this.assistantHotspot&&!this.assistantHotspot.isDestroyed){
      const visible=this.currentView==='lab_intro';this.assistantHotspot.setVisible(visible);
      if(visible&&!this.uiLocked&&!this.isExitingLab)this.safeSetInteractive(this.assistantHotspot);else this.safeDisableInteractive(this.assistantHotspot);
    }
  }
  createNavigationUI(){
    const{width,height}=this.scale,style={fontFamily:'SpecialElite',fontSize:'54px',color:'#39ff14',backgroundColor:'rgba(0,0,0,0.15)',padding:{left:8,right:8,top:8,bottom:8}};
    this.leftArrow=this.add.text(46,height/2,'◀',style).setOrigin(.5).setScrollFactor(0).setDepth(200).setAlpha(.75).setInteractive({useHandCursor:true});
    this.rightArrow=this.add.text(width-46,height/2,'▶',style).setOrigin(.5).setScrollFactor(0).setDepth(200).setAlpha(.75).setInteractive({useHandCursor:true});
    this.navHint=this.add.text(width/2,92,'',{fontFamily:'SpecialElite',fontSize:'20px',color:'#39ff14',backgroundColor:'#000000',padding:{left:10,right:10,top:8,bottom:8},wordWrap:{width:width-140,useAdvancedWrap:true},align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(220).setVisible(false);
    this.introHint=this.add.text(width/2,110,'Crime Lab — move right to inspect the analysis stations',{fontFamily:'SpecialElite',fontSize:'18px',color:'#fff4c7',backgroundColor:'#000000',padding:{left:12,right:12,top:8,bottom:8},wordWrap:{width:width-120,useAdvancedWrap:true},align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(220).setAlpha(0);
    this.setupNavigationArrow(this.leftArrow,()=>this.moveLeft(),()=>this.getLeftRoomLabel());
    this.setupNavigationArrow(this.rightArrow,()=>this.moveRight(),()=>this.getRightRoomLabel());this.updateNavVisibility();
  }
  setupNavigationArrow(arrow,move,getLabel){
    const tween=this.tweens.add({targets:arrow,alpha:{from:.55,to:.9},duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut',paused:true});
    const state={tween,hovered:false,hasDestination:false,originalSetVisible:arrow.setVisible};this.navigationArrowStates.set(arrow,state);
    arrow.setVisible=visible=>{state.originalSetVisible.call(arrow,visible);if(!visible){state.hovered=false;this.hideNavHint();}this.refreshNavigationArrow(arrow);return arrow;};
    arrow.on('pointerdown',p=>{p?.event?.stopPropagation?.();if(this.canUseNavigationArrow(arrow))move();})
      .on('pointerover',()=>{if(!this.canUseNavigationArrow(arrow))return;state.hovered=true;this.refreshNavigationArrow(arrow);this.showNavHint(getLabel());})
      .on('pointerout',()=>{state.hovered=false;this.refreshNavigationArrow(arrow);this.hideNavHint();});
  }
  canUseNavigationArrow(arrow){const state=this.navigationArrowStates.get(arrow);return Boolean(state&&state.hasDestination&&arrow?.scene&&arrow.visible&&!this.uiLocked&&!this.isExitingLab);}
  refreshNavigationArrow(arrow){
    const state=this.navigationArrowStates.get(arrow);if(!state||!arrow?.scene)return;
    const enabled=this.canUseNavigationArrow(arrow);if(arrow.input)arrow.input.enabled=enabled;
    if(!enabled||state.hovered){state.tween.pause();if(!enabled)state.hovered=false;arrow.setScale(enabled&&state.hovered?1.08:1).setAlpha(enabled?1:.35);return;}
    arrow.setScale(1);state.tween.resume();
  }
  destroyNavigationTweens(){for(const[arrow,state]of this.navigationArrowStates){state.tween.remove();arrow.setVisible=state.originalSetVisible;}this.navigationArrowStates.clear();}
  moveLeft(){if(this.uiLocked||this.isExitingLab)return;const target={lab_a:'lab_intro',lab_b:'lab_a',lab_c:'lab_b'}[this.currentView];if(target)this.goToView(target);}
  moveRight(){if(this.uiLocked||this.isExitingLab)return;const target={lab_intro:'lab_a',lab_a:'lab_b',lab_b:'lab_c'}[this.currentView];if(target)this.goToView(target);}
  goToView(name){this.labView?.showView(name);}
  updateNavVisibility(){this.updateNavigationArrow(this.leftArrow,this.currentView!=='lab_intro');this.updateNavigationArrow(this.rightArrow,this.currentView!=='lab_c');}
  updateNavigationArrow(arrow,hasDestination){const state=this.navigationArrowStates.get(arrow);if(!state||!arrow?.scene)return;state.hasDestination=hasDestination;arrow.setVisible(hasDestination);}
  updateProceedVisibility(){this.updateRoomHotspots();}
  getLeftRoomLabel(){return{lab_a:'Lab Entrance',lab_b:'Identity Lab',lab_c:'Trace Analysis'}[this.currentView]||'';}
  getRightRoomLabel(){return{lab_intro:'Identity Lab',lab_a:'Trace Analysis',lab_b:'Evidence Analysis'}[this.currentView]||'';}
  showNavHint(text){if(text&&this.navHint)this.navHint.setText(text).setVisible(true);}
  hideNavHint(){this.navHint?.setVisible(false);}
  onHotspotOver(data){
    if(!data?.label||this.uiLocked)return;
    this.showNavHint(data.stationId&&!this.isStationRequired(data.stationId)?
      (this.getSavedStationResult(data.stationId)?'RESULT COMPLETED BY LAB ASSISTANT':'DELEGATED REPORT PENDING'):data.label);
  }
  onHotspotOut(){this.hideNavHint();}
  clearIntroHintAnimation(){this.introHintTimer?.remove(false);this.introHintTimer=null;this.introHintTween?.remove();this.introHintTween=null;}
  showIntroHint(){
    if(!this.introHint?.scene)return;this.clearIntroHintAnimation();const token=this.labRunToken;this.introHint.setAlpha(0);
    this.introHintTween=this.tweens.add({targets:this.introHint,alpha:1,duration:350,ease:'Power2',onComplete:()=>{this.introHintTween=null;}});
    this.introHintTimer=this.time.delayedCall(2800,()=>{
      this.introHintTimer=null;if(this.labRunToken!==token||!this.introHint?.scene)return;
      this.introHintTween?.remove();this.introHintTween=this.tweens.add({targets:this.introHint,alpha:0,duration:500,ease:'Power2',onComplete:()=>{this.introHintTween=null;}});
    });
  }
  detachMiniGameListeners(){
    const session=this.activeMiniGameSession;if(!session)return;this.activeMiniGameSession=null;const events=session.scene?.events;
    events?.off('minigame-complete',session.onComplete);events?.off('minigame-closed',session.onClosed);
    events?.off(Phaser.Scenes.Events.SHUTDOWN,session.onStopped);events?.off(Phaser.Scenes.Events.DESTROY,session.onStopped);
  }
  attachMiniGameListeners(scene,sceneKey){
    this.detachMiniGameListeners();const session={scene,sceneKey,completed:false,onComplete:null,onClosed:null,onStopped:null};
    session.onComplete=payload=>{if(this.activeMiniGameSession!==session||session.completed||this.isExitingLab||!this.labRunToken)return;session.completed=true;this.handleMiniGameComplete(payload);};
    session.onClosed=()=>{if(this.activeMiniGameSession!==session)return;this.detachMiniGameListeners();this.returnFromMiniGame();};
    session.onStopped=session.onClosed;this.activeMiniGameSession=session;
    scene.events.once('minigame-complete',session.onComplete);scene.events.once('minigame-closed',session.onClosed);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,session.onStopped);scene.events.once(Phaser.Scenes.Events.DESTROY,session.onStopped);
  }
  async enterMiniGame(sceneKey,sceneData={},stationId=''){
    if(this.uiLocked||this.isExitingLab||this.activeMiniGameSession||!this.isStationRequired(stationId))return;
    if(!sceneKey){this.showNavHint('ANALYSIS STATION UNAVAILABLE');return;}
    const loadToken={},runToken=this.labRunToken;this.miniGameLoadToken=loadToken;this.applyLock(true);
    try{
      await this.game.sceneLoader.ensure(sceneKey);
      if(this.miniGameLoadToken!==loadToken||this.labRunToken!==runToken||this.isExitingLab||!this.sys.isActive())return;
      this.miniGameLoadToken=null;const data={...sceneData,stationId,cityId:this.cityId,caseKey:this.labManager.getCaseKey(),gameState:this.gameState};
      const scene=this.scene.get(sceneKey);if(!scene)throw new Error(`Minigame scene "${sceneKey}" not found.`);
      this.attachMiniGameListeners(scene,sceneKey);this.scene.pause();this.scene.launch(sceneKey,data);
    }catch(error){
      if(this.labRunToken!==runToken||!this.labRunToken)return;
      console.error(`[CrimeLabScene] Minigame "${sceneKey}" failed to start.`,error);this.miniGameLoadToken=null;this.detachMiniGameListeners();
      if(this.scene.isPaused(this.scene.key))this.scene.resume(this.scene.key);
      if(!this.isExitingLab){this.applyLock(false);this.showNavHint('ANALYSIS STATION UNAVAILABLE');}
    }
  }
  handleMiniGameComplete(payload={}){
    const result=this.evidenceService?.saveMiniGameResult(payload);if(!result?.saved)return;
    if(!result.wasAlreadyCompleted)this.timeController?.advanceForStation(result.stationId);
    this.completedCount=this.getCompletedRequiredStationCount();this.hud?.refreshFromScene();this.updateRoomHotspots();
  }
  returnFromMiniGame(){this.detachMiniGameListeners();if(this.isExitingLab||!this.labRunToken)return;if(this.scene.isPaused(this.scene.key))this.scene.resume(this.scene.key);this.applyLock(false);this.checkMiniGameResults();}
  checkMiniGameResults(){
    if(!this.evidenceService)return;this.completedCount=this.getCompletedRequiredStationCount();
    this.hotspots.forEach(zone=>{
      const data=zone?.hotspotData;if(!data||data.alwaysVisible||!data.stationId)return;
      const status=this.stationStatus(data.stationId);data.completed=status.complete;zone.statusLabel?.setText(status.text).setColor(status.color);
    });this.hud?.refreshFromScene();this.updateRoomHotspots();this.ticketPanel?.refresh();
  }
  applyLock(locked){this.uiLocked=Boolean(locked);this.updateNavVisibility();this.updateRoomHotspots();this.ticketPanel?.refresh();if(this.uiLocked)this.hideNavHint();}
  forceUnlock(){if(this.isExitingLab||this.miniGameLoadToken||this.activeMiniGameSession||this.assistantDialog?.isOpen()||this.ticketPanel?.isOpen||this.scene.isPaused(this.scene.key))return;this.applyLock(false);}
  exitLab(){
    if(this.uiLocked||this.isExitingLab||!this.sys.isActive())return;
    this.completedCount=this.getCompletedRequiredStationCount();const complete=this.isLabComplete(),token=this.labRunToken;
    this.isExitingLab=true;this.applyLock(true);
    const data={...this.returnData,cityId:this.cityId,caseKey:this.labManager.getCaseKey(),gameState:this.gameState,crimeLabCompleted:complete,showLabCompletionPhoneCall:complete,fromCrimeLab:true};
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,async()=>{
      try{
        await this.game.sceneLoader.ensure('CrimeCityScene');if(this.labRunToken!==token||!this.sys.isActive())return;
        if(complete){this.labManager.markCrimeLabCompleted();advanceCrimeTutorial(this.gameState,'crime_lab');}
        this.game.events.emit('setHudVisible',true);EventBus.emit('showHUD');
        const moved=await this.goto('CrimeCityScene',data);if(moved===false)throw new Error('Scene transition rejected.');
      }catch(error){
        console.error('[CrimeLabScene] Failed to return to CrimeCityScene:',error);
        if(this.labRunToken!==token||!this.sys.isActive())return;
        this.isExitingLab=false;this.applyLock(false);this.game.events.emit('setHudVisible',false);EventBus.emit('hideHUD');
        this.cameras.main.fadeIn(350,0,0,0);this.showNavHint('CRIME CITY UNAVAILABLE');
      }
    });this.cameras.main.fadeOut(350,0,0,0);
  }
  goToCrimeCity(){this.exitLab();}
  createOptionalDebug(){
    if(!this.DEBUG_HOTSPOTS)return;this.debugGraphics=this.add.graphics();this.debugGraphics.lineStyle(2,0x00ffcc,.95);
    const label=(x,y,text)=>this.debugTexts.push(this.add.text(x+8,y+8,text,{fontFamily:'Arial',fontSize:'16px',color:'#00ffcc',backgroundColor:'#000000',padding:{left:4,right:4,top:2,bottom:2}}).setDepth(999));
    this.hotspots.forEach(zone=>{const d=zone.hotspotData;this.debugGraphics.strokeRect(d.x,d.y,d.width,d.height);label(d.x,d.y,d.id);});
    if(this.assistantHotspot){const b=this.assistantHotspot.getBounds();this.debugGraphics.strokeRect(b.x,b.y,b.width,b.height);label(b.x,b.y,'assistant_hotspot');}
  }
  cleanupScene(){
    if(this.labCleanupDone)return;this.labCleanupDone=true;this.labRunToken=null;this.miniGameLoadToken=null;this.isExitingLab=true;
    this.greetingTimer?.remove(false);this.greetingTimer=null;this.ticketPanel?.destroy();this.ticketPanel=null;
    this.destroyNavigationTweens();this.clearIntroHintAnimation();
    const key=this.activeMiniGameSession?.sceneKey;this.detachMiniGameListeners();
    if(key&&(this.scene.isActive(key)||this.scene.isPaused(key)||this.scene.isSleeping(key)))this.scene.stop(key);
    this.input?.keyboard?.off('keydown-LEFT',this.boundMoveLeft);this.input?.keyboard?.off('keydown-RIGHT',this.boundMoveRight);
    this.events.off(Phaser.Scenes.Events.WAKE,this.boundForceUnlock);this.events.off(Phaser.Scenes.Events.RESUME,this.boundForceUnlock);
    this.events.off(Phaser.Scenes.Events.RESUME,this.boundCheckMiniGameResults);this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.boundCleanupScene);this.events.off(Phaser.Scenes.Events.DESTROY,this.boundCleanupScene);
    this.audioController?.destroy();this.audioController=null;this.assistantDialog?.destroy?.();this.assistantDialog=null;this.timeController?.destroy?.();this.timeController=null;
    this.hotspots.forEach(zone=>{
      if(!zone)return;zone.removeAllListeners?.();this.safeDisableInteractive(zone);zone.statusLabel?.destroy?.();
      if(zone.exitBtn){zone.exitBtn.removeAllListeners?.();this.safeDisableInteractive(zone.exitBtn);zone.exitBtn.destroy?.();}zone.destroy?.();
    });this.hotspots=[];
    if(this.assistantHotspot){this.assistantHotspot.removeAllListeners?.();this.safeDisableInteractive(this.assistantHotspot);this.assistantHotspot.destroy?.();this.assistantHotspot=null;}
    this.debugGraphics?.destroy?.();this.debugGraphics=null;this.debugTexts.forEach(t=>t?.destroy?.());this.debugTexts=[];this.hud?.destroy?.();this.hud=null;
    ['leftArrow','rightArrow','navHint','introHint'].forEach(property=>{const object=this[property];if(object){object.removeAllListeners?.();this.safeDisableInteractive(object);object.destroy?.();this[property]=null;}});
    this.labView?.destroy?.();this.labView=null;this.evidenceService=null;this.labManager=null;
  }
}
