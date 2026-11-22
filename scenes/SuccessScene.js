import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { ScoreManager } from '../managers/ScoreManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { checkAndAwardAchievements } from '../managers/AchievementManager.js';
import { applyReputationEvent } from '../managers/ReputationManager.js';
import { ensureMissionReport, moveStateToHeadquarters } from '../archiveReportService.js';
const WIDTH=1920,HEIGHT=1080,CORRECT_ARREST_BONUS=500,SUCCESS_SFX_KEY='sfx_result_success';
const text=key=>__dialogueText('scenes/SuccessScene.js',key);
const MISSION_LABEL=text('t_769817202f01df1eb863'),JUSTICE_LABEL=text('t_d45f9973c429f508ec75');
const ASSETS=[['Success__background','background'],['banner','banner'],['medalion_officer','medalion_officer'],['medalion','medalion'],['money_bag_left','money_bag_left'],['money_bag_right','money_bag_right'],['Success__police_car','police_car'],['police_left','police_left'],['police_right','police_right'],['police_right02','police_right02'],['suspect','suspect'],['treasures','treasures'],['Success__wall','wall']];
const isValidId=v=>(typeof v==='string'&&v.trim().length>0)||(typeof v==='number'&&Number.isFinite(v));
const isPlainObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export class SuccessScene extends BaseScene{
 constructor(){super({key:'SuccessScene'});}
 init(data={}){
  this.caseId=isValidId(data.caseId)?String(data.caseId):null;
  this.isLeaving=false;this.introComplete=false;this.soundPlayed=false;this.statusText=null;this.nextBtn=null;
  this.layers={};this.introTimers=[];this.introTweens=[];this.activeSparkles=new Set();
  this._successRun=Symbol('success-run');this.successSaved=false;
 }
 isCurrentRun(run){return this._successRun===run&&!this._cleanupDone&&this.sys.isActive();}
 preload(){
  if(!this.cache.audio.exists(SUCCESS_SFX_KEY))this.load.audio(SUCCESS_SFX_KEY,'assets/audio/success.mp3');
  for(const [key,filename]of ASSETS)if(!this.textures.exists(key))this.load.image(key,`${text('t_80a8ddfed068875abd4c')}${filename}${text('t_ed140d91e29553b83699')}`);
 }
 create(){
  super.create();this.hideGameplayInterface();audioManager.init(this);audioManager.stopAllMusic();audioManager.stopAllAmbient();audioManager.stopAllVoice();audioManager.stopAllSfx();
  this.scoreManager=new ScoreManager();this.registerSuccessRewards();this.registerCaseSuccess();this.registerFirstMissionSuccess();this.unlockOfficeAfterFirstMission();
  const id=this.getCurrentCaseId();if(id!==null)gameState.currentCaseId=id;
  const report=ensureMissionReport();this.successSaved=this.persistSuccess();
  this.scene.manager.keys.PlayerHudScene?.refreshUI?.();this.cameras.main.setBackgroundColor('#101216');
  this.stage=this.add.container(0,0);this.buildStreet();this.buildMedallion();this.buildBanner();this.buildResults(report);
  this.skipHint=this.add.text(960,1017,'CLICK TO SKIP INTRO',{fontFamily:'SpecialElite',fontSize:'20px',color:'#e4d0a6',stroke:'#171819',strokeThickness:4}).setOrigin(0.5);
  this.stage.add(this.skipHint);this.layoutStage();this.onSuccessResize=()=>this.layoutStage();this.onSkipIntro=()=>{if(!this.introComplete)this.finishIntro();};
  this.scale.on('resize',this.onSuccessResize);this.input.on('pointerdown',this.onSkipIntro);this.startSiren();this.playIntro();
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.cleanupSuccessScene());
 }
 saveMissionRanking(){
  if(gameState.scoreSaved===true)return true;
  const caseId=this.getCurrentCaseId();
  if(caseId===null){console.error('[SuccessScene] Cannot save ranking: missing case ID.');return false;}
  try{
   const result=this.scoreManager.saveScore(gameState.playerName||gameState.agentName||text('t_11b39c93777e8f1f3983'),Number.isFinite(gameState.score)?gameState.score:0,gameState.difficulty,{caseId});
   if(result?.saved!==true)return false;
   gameState.scoreSaved=true;return true;
  }catch(error){console.error('[SuccessScene] Ranking save failed:',error);return false;}
 }
 persistSuccess(){
  const rankingSaved=this.saveMissionRanking();
  try{requestAutosave();const stateSaved=flushAutosave()===true;return rankingSaved&&stateSaved;}
  catch(error){console.error('[SuccessScene] Success checkpoint failed:',error);return false;}
 }
 hideGameplayInterface(){
  EventBus.emit('hideHUD');const hud=this.scene.manager.keys.PlayerHudScene;hud?.closeAllUIPanels?.();hud?.hideHud?.();
  const news=this.scene.manager.keys.NewsHud;news?.events?.emit('setButtonsVisible',false);news?.events?.emit('setNewspaperVisible',false);news?.events?.emit('setTvVisible',false);
  if(this.scene.manager.keys.UIScene)this.scene.sleep('UIScene');
 }
 layoutStage(){if(!this.stage)return;const w=this.scale.width,h=this.scale.height,s=Math.min(w/WIDTH,h/HEIGHT);this.stage.setScale(s).setPosition((w-WIDTH*s)/2,(h-HEIGHT*s)/2);}
 addLayer(key,parent=this.stage,x=0,y=0){
  if(!this.textures.exists(key)){console.error(`[SuccessScene] Missing texture: ${key}`);return null;}
  const image=this.add.image(x,y,key).setOrigin(0,0).setDisplaySize(WIDTH,HEIGHT);parent.add(image);this.layers[key]=image;return image;
 }
 buildStreet(){
  for(const k of ['Success__background','Success__wall','treasures','money_bag_left','money_bag_right','Success__police_car'])this.addLayer(k);
  this.redGlow=this.createGlow(1630,714,140,0xff4040);this.blueGlow=this.createGlow(1695,721,140,0x439bff);this.stage.add([this.redGlow,this.blueGlow]);
  this.redBulb=this.add.ellipse(1630,712,43,17,0xff6654,0);this.blueBulb=this.add.ellipse(1695,721,48,17,0x82d8ff,0);this.stage.add([this.redBulb,this.blueBulb]);
  for(const k of ['suspect','police_left','police_right','police_right02'])this.addLayer(k);
  this.streetShade=this.add.rectangle(960,540,1810,980,0x080d19,0.65);this.stage.add(this.streetShade);
 }
 createGlow(x,y,r,color){const g=this.add.graphics();for(let i=10;i>=1;i--){g.fillStyle(color,0.018);g.fillCircle(x,y,r*i/10);}return g.setAlpha(0);}
 buildMedallion(){
  this.medallionGroup=this.add.container(960,-260).setAlpha(0);this.stage.add(this.medallionGroup);
  this.medallionGroup.add(this.add.ellipse(7,-2,555,555,0x30302e,1));
  this.addLayer('medalion',this.medallionGroup,-960,-440);this.addLayer('medalion_officer',this.medallionGroup,-960,-440);
  this.justiceGroup=this.add.container(0,170).setAlpha(0).setScale(1.35);this.medallionGroup.add(this.justiceGroup);
  const style={fontFamily:'SpecialElite',fontSize:'86px',color:'#e5e5d9',stroke:'#111419',strokeThickness:10,align:'center',padding:{x:18,y:14}};
  this.justiceText=this.add.text(0,0,JUSTICE_LABEL,style).setOrigin(0.5);this.justiceText.setShadow(5,7,'#080b10',0,true,true);
  this.justiceBaseScale=Math.min(1,850/this.justiceText.width);this.justiceText.setScale(this.justiceBaseScale);
  this.justiceFlash=this.add.text(0,0,JUSTICE_LABEL,{...style,color:'#ffffff',stroke:'#ffffff'}).setOrigin(0.5).setScale(this.justiceBaseScale).setAlpha(0);
  this.justiceGroup.add([this.justiceText,this.justiceFlash]);
 }
 buildBanner(){
  this.bannerGroup=this.add.container(0,-20).setAlpha(0);this.stage.add(this.bannerGroup);this.addLayer('banner',this.bannerGroup);
  this.bannerText=this.add.text(321,185,'',{fontFamily:'SpecialElite',fontSize:'30px',color:'#2c1d11',stroke:'#8a653a',strokeThickness:1,align:'center',padding:{x:4,y:5}}).setOrigin(0.5);
  this.bannerGroup.add(this.bannerText);this.bannerText.setText(MISSION_LABEL);this.bannerTextScale=Math.min(1,395/this.bannerText.width);this.bannerText.setScale(this.bannerTextScale);this.bannerText.setText('');
 }
 getReportMessage(report){
  if(report.status==='draft')return text('t_01b9d37698c4cae5f3ca');if(report.status==='full')return text('t_0f64121ad0b30dbb7d39');
  if(report.status==='unavailable')return text('t_85b0d3cecff827f02b55');return text('t_47704fadc4ac8f697b02');
 }
 buildResults(report){
  this.resultPanel=this.add.container(0,0).setAlpha(0).setVisible(false);this.stage.add(this.resultPanel);
  const panel=this.add.rectangle(1585,355,490,520,0x141d2b,0.95).setStrokeStyle(2,0xb79a61,0.95);
  const heading=this.add.text(1585,125,'CASE SOLVED',{fontFamily:'PressStart2P',fontSize:'22px',color:'#eaca83',align:'center'}).setOrigin(0.5,0);
  const captured=this.add.text(1585,177,`You captured:\n${gameState.currentThief?.name||'Unknown suspect'}`,{fontFamily:'SpecialElite',fontSize:'27px',color:'#f5ead4',align:'center',lineSpacing:6,wordWrap:{width:425}}).setOrigin(0.5,0);
  const summary=this.add.text(1585,Math.max(275,captured.y+captured.height+20),'The artefact is safe.\nThe paperwork is just beginning.',{fontFamily:'SpecialElite',fontSize:'23px',color:'#d4dbe6',align:'center',lineSpacing:7,wordWrap:{width:425}}).setOrigin(0.5,0);
  this.scoreLabel=this.add.text(1585,summary.y+summary.height+22,'',{fontFamily:'PressStart2P',fontSize:'19px',color:'#eaca83',align:'center',wordWrap:{width:425}}).setOrigin(0.5,0);
  this.updateScoreLabel(Number.isFinite(gameState.score)?gameState.score:0);
  const y=this.scoreLabel.y+this.scoreLabel.height+22;
  this.statusText=this.add.text(1585,y,this.successSaved?this.getReportMessage(report):'Saving failed. Check browser storage, then press RETURN TO OFFICE to retry.',{fontFamily:'SpecialElite',fontSize:'21px',color:'#e8d5ac',align:'center',lineSpacing:5,wordWrap:{width:425}}).setOrigin(0.5,0);
  const h=Math.max(35,515-y);if(this.statusText.height>h)this.statusText.setScale(h/this.statusText.height);
  this.resultPanel.add([panel,heading,captured,summary,this.scoreLabel,this.statusText]);
  const bg=this.add.rectangle(1585,565,425,60,0x303c4b,1).setStrokeStyle(2,0xb79a61,1);
  const label=this.add.text(1585,565,'RETURN TO OFFICE',{fontFamily:'PressStart2P',fontSize:'16px',color:'#f8e7c4'}).setOrigin(0.5);
  this.nextBtn=bg;this.resultPanel.add([bg,label]);
  bg.on('pointerover',()=>{if(!this.isLeaving)bg.setFillStyle(0x49576a);});bg.on('pointerout',()=>bg.setFillStyle(0x303c4b));
  bg.on('pointerdown',(_p,_x,_y,e)=>{e?.stopPropagation();if(this.introComplete)void this.returnToOffice(bg);});
 }
 updateScoreLabel(v){this.scoreLabel?.setText(`${text('t_7b583c4a16427458fe73')}${Math.max(0,Math.floor(v))}`);}
 introAfter(delay,callback){const timer=this.time.delayedCall(delay,()=>{if(!this.introComplete)callback();});this.introTimers.push(timer);return timer;}
 introTween(config){const tween=this.tweens.add(config);this.introTweens.push(tween);return tween;}
 playIntro(){
  this.introTween({targets:this.streetShade,alpha:0,duration:850,ease:'Sine.easeOut'});
  this.introAfter(300,()=>this.introTween({targets:this.bannerGroup,y:0,alpha:1,duration:450,ease:'Back.easeOut'}));
  this.introAfter(700,()=>this.startBannerTyping());
  this.introAfter(450,()=>{this.medallionGroup.setAlpha(1);this.introTween({targets:this.medallionGroup,y:440,duration:950,ease:'Bounce.easeOut'});});
  this.introAfter(1550,()=>{this.playSuccessSound();this.animateJusticeStamp();for(const key of ['money_bag_left','money_bag_right']){const bag=this.layers[key];if(bag)this.introTween({targets:bag,y:-18,duration:180,yoyo:true,ease:'Sine.easeOut'});}});
  this.introAfter(2100,()=>{this.spawnSparkle(849,821);this.spawnSparkle(1107,850);});this.introAfter(2800,()=>this.finishIntro());
 }
 startBannerTyping(){let index=0;const timer=this.time.addEvent({delay:55,repeat:MISSION_LABEL.length-1,callback:()=>{if(!this.introComplete)this.bannerText.setText(MISSION_LABEL.slice(0,++index));}});this.introTimers.push(timer);}
 animateJusticeStamp(){
  this.justiceGroup.setPosition(0,156).setScale(1.35).setAlpha(0);this.introTween({targets:this.justiceGroup,alpha:1,duration:130});
  this.introTween({targets:this.justiceGroup,y:170,scaleX:1,scaleY:1,duration:480,ease:'Back.easeOut'});
  this.introAfter(280,()=>{this.justiceFlash.setAlpha(0.75);this.introTween({targets:this.justiceFlash,alpha:0,duration:320,ease:'Sine.easeOut'});});
 }
 cancelIntro(){for(const timer of this.introTimers)timer.remove(false);for(const tween of this.introTweens)tween.stop();this.introTimers=[];this.introTweens=[];}
 finishIntro(){
  if(this.introComplete)return;this.introComplete=true;this.cancelIntro();this.streetShade.setAlpha(0);
  this.medallionGroup.setPosition(960,440).setAlpha(1);this.bannerGroup.setPosition(0,0).setAlpha(1);this.bannerText.setText(MISSION_LABEL);
  this.justiceGroup.setPosition(0,170).setScale(1).setAlpha(1);this.justiceFlash.setAlpha(0);this.layers.money_bag_left?.setY(0);this.layers.money_bag_right?.setY(0);
  this.skipHint.setVisible(false);this.playSuccessSound();this.resultPanel.setVisible(true).setAlpha(0);this.tweens.add({targets:this.resultPanel,alpha:1,duration:350});
  this.nextBtn.setInteractive({useHandCursor:true});this.animateScore();this.startTreasureSparkles();
 }
 playSuccessSound(){
  if(this.soundPlayed||this.isLeaving||this._cleanupDone||!this.sys.isActive())return;this.soundPlayed=true;if(!this.cache.audio.exists(SUCCESS_SFX_KEY))return;
  try{audioManager.init(this);audioManager.playSfx(SUCCESS_SFX_KEY,{gain:0.45,volume:audioManager.getSfxVolume()*0.45});}catch(e){console.debug('[SuccessScene] Success sound unavailable:',e);}
 }
 animateScore(){const finalScore=Number.isFinite(gameState.score)?gameState.score:0,counter={value:0};this.updateScoreLabel(0);this.tweens.add({targets:counter,value:finalScore,duration:1100,ease:'Cubic.easeOut',onUpdate:()=>this.updateScoreLabel(counter.value),onComplete:()=>this.updateScoreLabel(finalScore)});}
 startSiren(){let phase=0;this.time.addEvent({delay:180,loop:true,callback:()=>{phase=(phase+1)%8;const red=phase===0||phase===2,blue=phase===4||phase===6;this.redGlow.setAlpha(red?1:0);this.blueGlow.setAlpha(blue?1:0);this.redBulb.setAlpha(red?0.8:0);this.blueBulb.setAlpha(blue?0.8:0);}});}
 spawnSparkle(x,y){
  if(this.isLeaving||!this.stage?.active)return;const s=this.add.container(x,y),h=this.add.rectangle(0,0,28,4,0xffefb3),v=this.add.rectangle(0,0,4,28,0xffefb3),c=this.add.rectangle(0,0,7,7,0xffffff).setAngle(45);
  s.add([h,v,c]).setScale(0.1).setAlpha(0);this.stage.add(s);this.activeSparkles.add(s);
  this.tweens.add({targets:s,alpha:1,scaleX:1,scaleY:1,angle:35,duration:330,yoyo:true,ease:'Sine.easeInOut',onComplete:()=>{this.activeSparkles.delete(s);s.destroy(true);}});
 }
 startTreasureSparkles(){const points=[[849,821],[884,885],[968,917],[1109,851],[1030,960],[815,924]];let i=0;this.time.addEvent({delay:1400,loop:true,callback:()=>{const[x,y]=points[i++%points.length];this.spawnSparkle(x,y);}});}
 async returnToOffice(button){
  if(this.isLeaving||this._cleanupDone)return;const run=this._successRun;this.isLeaving=true;button.disableInteractive();
  try{
   moveStateToHeadquarters(this.cache.json.get('locations')||[]);
   this.successSaved=this.persistSuccess();if(!this.successSaved)throw Error('Ranking or success checkpoint could not be saved.');
   if(!this.isCurrentRun(run))return;
   audioManager.stopSfx(SUCCESS_SFX_KEY);audioManager.stopAllNonMusic();audioManager.stopAllMusic();
   const result=await this.goto('OfficeScene',{gameState});if(!this.isCurrentRun(run))return;if(result===false)throw Error('OfficeScene could not be opened.');
  }catch(error){
   console.error('[SuccessScene] Return to office failed:',error);if(!this.isCurrentRun(run))return;
   this.isLeaving=false;button.setInteractive({useHandCursor:true});this.statusText?.setText(this.successSaved?text('t_ce48c0204acfad02e624'):'Saving failed. Check browser storage, then press RETURN TO OFFICE to retry.');
  }
 }
 registerSuccessRewards(){
  const caseId=this.getCurrentCaseId();if(caseId===null){console.error('[SuccessScene] Cannot grant rewards: missing case ID.');return;}
  const result=applyReputationEvent('correct_arrest',{eventId:`case:${caseId}:final-arrest`,context:{caseId,suspectId:gameState.finalArrestSuspectId??null,source:'SuccessScene'}});
  if(!result.applied)return;gameState.score=Math.max(0,Number.isFinite(gameState.score)?gameState.score:0)+CORRECT_ARREST_BONUS;requestAutosave();
 }
 registerCaseSuccess(){
  const caseId=this.getCurrentCaseId();gameState.caseResolved=true;gameState.caseFailed=false;gameState.finalArrestResult='SUCCESS';gameState.isGameActive=false;gameState.gameOverReason='';
  if(caseId===null){console.warn('[SuccessScene] Cannot save dossier statistics: missing case ID.');return;}
  const completed=Array.isArray(gameState.completedCaseIds)?gameState.completedCaseIds:[],arrests=Array.isArray(gameState.successfulArrestCaseIds)?gameState.successfulArrestCaseIds:[];let changed=false;
  if(!completed.some(id=>String(id)===caseId)){gameState.completedCaseIds=[...completed,caseId];gameState.casesSolved=gameState.completedCaseIds.length;changed=true;}
  if(!arrests.some(id=>String(id)===caseId)){gameState.successfulArrestCaseIds=[...arrests,caseId];gameState.arrests=gameState.successfulArrestCaseIds.length;changed=true;}
  const badges=checkAndAwardAchievements();if(badges.length)console.log('[Achievements] New badges:',badges.map(i=>i.title));
  if(changed){requestAutosave();EventBus.emit('agentStatsChanged',{casesSolved:gameState.casesSolved,arrests:gameState.arrests});}
 }
 registerFirstMissionSuccess(){
  const progress=isPlainObject(gameState.progress)?gameState.progress:{},onboarding=isPlainObject(gameState.onboarding)?gameState.onboarding:{},firstCase=isPlainObject(onboarding.firstCase)?onboarding.firstCase:{};
  const already=progress.firstMissionSuccess===true,count=Number.isFinite(firstCase.successCount)?firstCase.successCount:0;
  gameState.progress={...progress,firstMissionSuccess:true};gameState.onboarding={...onboarding,firstCase:{...firstCase,successCount:Math.max(1,count)}};
  if(already)return;requestAutosave();EventBus.emit('firstMissionSuccess');
 }
 unlockOfficeAfterFirstMission(){const progress=isPlainObject(gameState.progress)?gameState.progress:{};if(progress.firstMissionCompleted)return;gameState.progress={...progress,firstMissionCompleted:true};requestAutosave();EventBus.emit('firstMissionCompleted');}
 getCurrentCaseId(){const raw=[this.caseId,gameState.currentCaseId,gameState.currentMission?.caseId,gameState.currentMission?.id,gameState.currentMission?.missionId].find(isValidId);return raw===undefined?null:String(raw);}
 cleanupSuccessScene(){
  this._successRun=null;this.scale.off('resize',this.onSuccessResize);this.input.off('pointerdown',this.onSkipIntro);this.cancelIntro();this.time.removeAllEvents();this.tweens.killAll();
  for(const s of this.activeSparkles)s.destroy(true);this.activeSparkles.clear();audioManager.stopSfx(SUCCESS_SFX_KEY);this.nextBtn=null;this.statusText=null;this.layers={};
 }
}
