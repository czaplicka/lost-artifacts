import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { NPCController } from '../dialogues/NPCController.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { BaseScene } from './BaseScene.js';
import { getNpcAccess } from '../managers/ReputationManager.js';
import { NPC_DIALOGUE_KEY_MAP, NPC_DIALOGUE_ROOT_MAP, NPC_DIALOGUE_FILE_MAP } from '../dialogues/dialogueKeys.js';
import { getLocationBackgroundCandidates, getNpcLabel } from '../npcThemeHelper.js';
import { queueLocationIcons, getLocationIconKey, getAvailableLocationIconKey } from '../locationIcons.js';
import { getPursuitCityContext, normalizePursuitCityId } from '../managers/PursuitCityContext.js';
import { getForgerInterviewQuote } from '../systems/ForgerObservation.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';

const T=id=>__dialogueText('scenes/LocationScene.js',id);
const LOCATION_SOUND_MAP={alley:'alleysound',bank:'banksound',hotel:'hotelsound',parking:'parkingsound',policehq:'policesound',restaurant:'restaurantsound'};
const TOPIC_LABELS={features:T('t_5697d03daef4de9cf8db'),accent:T('t_a5c6fb18c9af89b22a79'),hair:T('t_ababed4823ab79d226ba'),eyes:T('t_a39e9d9816a99fc02aa4'),skills:T('t_66d0f523a379b2de6f8d'),habitus:T('t_41243237651096193ccc'),currency:T('t_5ccc2e8715d7a17c3110'),travel:T('t_3e11abc63158d2afedac'),motive:T('t_59b1224dd97e71c0f8d8'),flight:T('t_26b4c6679365904b7971'),dish:T('t_4c53a089c88344b172cb'),cars:T('t_e287548a9db2e48f049f'),findings:T('t_e171c2ff25b55e5a2d63'),banter:T('t_124478a6674d3cb814fc')};
export class LocationScene extends BaseScene {
 constructor(){
  super({key:'LocationScene'});this.topicButtons=[];this.generatedNotes=[];this.askedTopics=new Set();
  this.typewriterEvent=null;this.locationAmbient=null;this.sharedDialogue=null;
 }
 get isTyping(){return this.sharedDialogue?.isTyping??this._locationTyping??false;}
 set isTyping(value){this._locationTyping=Boolean(value);}
 init(data={}){
  this.stopTypewriter();this.sharedDialogue?.destroy();this.sharedDialogue=null;
  this.cityId=normalizePursuitCityId(data.cityId);this.encounterId=data.encounterId||null;
  this.npcId=data.npcId||null;this.locationId=data.locationId||null;this.isRepeat=Boolean(data.isRepeat);
  const context=getPursuitCityContext(gameState,this.cityId);
  this.isCrimeCity=context.isCrimeCity;this.isNextTargetCity=context.isNextTargetCity;
  this.isCorrectCity=context.isCorrectCity;this.isFalseLead=!this.isCorrectCity;
  this.generatedNotes=[];this.isFinishing=false;this.timeCostApplied=false;
  this.dialogueText=null;this.footerTextObject=null;this.npcNameText=null;this.dialoguePanel=null;
  this.panelBorder=null;this.portraitFrame=null;this.portraitImage=null;this.continueIndicator=null;this.leaveButton=null;
  this.forgerBonusText=null;this.topicButtons=[];this.encounterMemory=null;
  this.dialogueTargetCityId=normalizePursuitCityId(context.targetCityId);this.locationAmbient=null;
  this.cityData=null;this.locationBackground=null;this.fullDialogueString='';this.isTyping=false;
  this.npcController=null;this.availableTopics=[];this.askedTopics=new Set();this.entryEnergyPaid=false;
  this.entryBlocked=false;this.entryEnergyCost=null;this.banterSeen=new Set();this.newsSnapshot=null;
  this.topicMenuLayout=null;this.expectedLocationIconKey=null;
  this.ensureEncounterMemory();this.reputationAccess=getNpcAccess(this.npcId,{isCrimeCity:this.isCrimeCity});
 }
 preload(){
  queueLocationIcons(this);
  if (this.locationId === 'museum') {
   const locations = this.cache.json.get('locations') || [];
   const city = locations.find(entry => normalizePursuitCityId(entry.id) === this.cityId);
   for (const key of getLocationBackgroundCandidates('museum', city)) {
    if (/^museum_[abhow]$/.test(key) && !this.textures.exists(key)) {
     this.load.image(key, `assets/local/${key}.webp`);
    }
   }
  }
  const key=NPC_DIALOGUE_KEY_MAP[this.npcId],path=NPC_DIALOGUE_FILE_MAP[this.npcId];
  if(key&&path&&!this.cache.json.exists(key))this.load.json(key,path);
 }
 ensureEncounterMemory(){
  if(!gameState.encounterMemory||typeof gameState.encounterMemory!=='object'||Array.isArray(gameState.encounterMemory))gameState.encounterMemory={};
 }
 getEncounterEnergyCost(){
  if(this.entryEnergyCost)return this.entryEnergyCost;const energy=getEnergyManager();
  this.entryEnergyCost=getForgerInterviewQuote({cityId:this.cityId,taxi:energy.getTravelCost('taxi'),interview:energy.getInterviewCost('medium')});return this.entryEnergyCost;
 }
 payEncounterEnergy(){
  if(this.isCrimeCity||this.entryEnergyPaid)return true;
  const energy=getEnergyManager(),cost=this.getEncounterEnergyCost();
  if(!energy.canAfford(cost.total).ok){this.entryBlocked=true;this.fullDialogueString=T('t_297469b36384f3455d3f');return false;}
  const label=cost.bonusActive?`${T('t_405dd93a8d505faace91')}${cost.taxi}${T('t_2e8d1caea3b6a2510409')}${cost.interview}`:`${T('t_b02b87d8d2a21b84b934')}${cost.taxi}${T('t_2e8d1caea3b6a2510409')}${cost.interview}`;
  const result=energy.consumeCustom(cost.total,label,{requireFullAmount:true,activityType:'escape_city_npc_visit'});
  if(!result.success){this.entryBlocked=true;this.fullDialogueString=T('t_abdd20cf525d719a080d')+T('t_d637f9a61370908fe327');return false;}
  this.entryEnergyPaid=true;saveGameState();return true;
 }
 create(){
  // Validate before charging energy or encounter time.
  if(typeof LocationDialoguePanel.prototype.advance!=='function')throw new Error('LocationScene requires LocationDialoguePanel from dialogue migration stage 1.');
  super.create();this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown,this);
  this.events.once(Phaser.Scenes.Events.DESTROY,this.handleShutdown,this);
  this.events.on('preupdate',this.hideLocationNews,this);this.hideLocationNews();audioManager.init(this);
  if(!audioManager.isMusicPlaying('themeGame'))audioManager.playMusic('themeGame',{loop:true});
  const sound=LOCATION_SOUND_MAP[this.locationId];
  if(sound&&this.cache.audio.exists(sound))this.locationAmbient=audioManager.playAmbient(sound,{volume:.22,loop:true});
  this.closeAllUIPanels();const{width,height}=this.scale;
  const suspects=this.cache.json.get('suspects')||[],locations=this.cache.json.get('locations')||[],countryFacts=this.cache.json.get('country_facts')||{};
  const cacheKey=NPC_DIALOGUE_KEY_MAP[this.npcId],rootKey=NPC_DIALOGUE_ROOT_MAP[this.npcId];
  const raw=cacheKey?this.cache.json.get(cacheKey):null,variants=raw?.[rootKey]?.locationVariants||{};
  const cityData=locations.find(city=>normalizePursuitCityId(city.id)===this.cityId)||null;this.cityData=cityData;
  const suspect=suspects.find(entry=>entry.id===gameState.currentThiefId)||gameState.currentThief||null;
  if(!cacheKey||!rootKey)console.warn(`[LocationScene] Unknown npcId "${this.npcId}".`);
  this.encounterMemory=this.encounterId?gameState.encounterMemory?.[this.encounterId]||null:null;
  this.askedTopics=new Set(Array.isArray(this.encounterMemory?.askedTopics)?this.encounterMemory.askedTopics:[]);
  this.reputationAccess=getNpcAccess(this.npcId,{isCrimeCity:this.isCrimeCity});
  if(!this.reputationAccess.allowed)this.fullDialogueString=this.reputationAccess.reason;
  else{
   try{
    this.npcController=new NPCController(variants,countryFacts,this.cityId,suspect||{},
     {targetCityId:this.dialogueTargetCityId,isCorrectCity:this.isCorrectCity,npcId:this.npcId});
    this.dialogueTargetCityId=this.npcController.targetCityId;
   }catch(error){console.warn('[LocationScene] Failed to build NPCController:',{npcId:this.npcId,cityId:this.cityId,error});this.npcController=null;}
   if(!this.npcController)this.fullDialogueString=T('t_cd5890b2d9d25776c798');
   else if(this.payEncounterEnergy()){
    this.availableTopics=this.npcController.getAvailableTopics();this.fullDialogueString=this.isFalseLead?this.npcController.getFalseLeadLine().text:this.nextBanterLine();
   }
  }
  const background=this.getLocationBackgroundKey(this.locationId,cityData);
  if(background)this.locationBackground=this.add.image(width/2,height/2,background).setDisplaySize(width,height);
  else if(cityData?.backgroundKey&&this.textures.exists(cityData.backgroundKey))this.locationBackground=this.add.image(width/2,height/2,cityData.backgroundKey).setDisplaySize(width,height);
  else this.cameras.main.setBackgroundColor('#1a1a1a');
  this.createDialoguePanel(width,height);this.createForgerBonusNotice(width,height);
  this.trackInputEvent(this.scale,'resize',this.layoutLocationDialogue);this.layoutLocationDialogue();
  ensureHud(this);this.refreshNotebook();
  if(!this.entryBlocked&&!this.timeCostApplied){
   this.timeCostApplied=true;const minutes=this.entryEnergyPaid?this.getEncounterEnergyCost().minutes:60;
   gameState.timeSpent=(Number(gameState.timeSpent)||0)+minutes/60;EventBus.emit('advanceTime',0,minutes);saveGameState();
  }
 }
 createForgerBonusNotice(width,height){
  const cost=this.entryEnergyCost;if(!this.entryEnergyPaid||!cost?.bonusActive||this.isCrimeCity)return;
  const savedEnergy=cost.normalInterview-cost.interview;
  this.forgerBonusText=this.add.text(18,height-278,
   `${T('t_da5d97c92b3a241792b4')}${cost.alias}${T('t_d9127a1f6676ea02f7fb')}${cost.minutes}${T('t_fb006fa9c3d865b97fcf')}`+`${T('t_6396c97ea812968be3e3')}${savedEnergy}`,
   {fontFamily:'SpecialElite',fontSize:'20px',color:'#ffe0a3',backgroundColor:'#201409ee',padding:{left:10,right:10,top:6,bottom:6},wordWrap:{width:Math.max(100,width-56)}}).setDepth(14);
 }
 hideLocationNews(){
  const news=this.scene.manager.keys.NewsHud;if(!news?.sys?.isActive())return;
  if(!this.newsSnapshot||this.newsSnapshot.scene!==news)this.newsSnapshot={scene:news,visible:news.sys.settings.visible,inputEnabled:news.input.enabled};
  news.closeMenu?.(true);news.scene.setVisible(false);news.input.enabled=false;
 }
 restoreLocationNews(){
  const saved=this.newsSnapshot;if(saved?.scene?.sys?.isActive()){saved.scene.scene.setVisible(saved.visible);saved.scene.input.enabled=saved.inputEnabled;}this.newsSnapshot=null;
 }
 nextBanterLine(){
  const pool=(this.npcController?.cityData?.banter||[]).filter(line=>typeof line==='string'&&line.trim());
  if(!pool.length)return this.npcController?.getBanterLine()||T('t_7b3091d59ac78a86348c');
  let unseen=pool.filter(line=>!this.banterSeen.has(line));if(!unseen.length){this.banterSeen.clear();unseen=pool;}
  const line=unseen[Math.floor(Math.random()*unseen.length)];this.banterSeen.add(line);return line;
 }
 refreshNotebook(){const hud=this.scene.manager.keys.PlayerHudScene;if(hud?.refreshNotebook)hud.refreshNotebook();else hud?.refreshUI?.();}
 createDialoguePanel(width,height){
  this.sharedDialogue?.destroy();
  const view=new LocationDialoguePanel(this,{depth:10,menuWidth:205,keyboard:false,
   leaveLabel:T('t_fc6e4a408d56be9670c1'),onLeave:()=>{void this.finishEncounter();}});
  this.sharedDialogue=view;
  // Keep tutorial-facing object references current after menu paging and resize.
  const renderTopics=view.renderTopics.bind(view);
  view.renderTopics=()=>{renderTopics();if(this.sharedDialogue===view)this.syncDialogueAliases();};
  this.expectedLocationIconKey=getLocationIconKey(this.locationId,this.cityData,this.npcId);
  this.refreshLocationSpeaker();this.textures.off('addtexture',this.onLocationTextureReady,this);
  this.textures.on('addtexture',this.onLocationTextureReady,this);
  this.topicMenuLayout={width,panelY:height-view.layout.panelHeight,panelHeight:view.layout.panelHeight,menuWidth:205};
  this.createTopicMenu(width,this.topicMenuLayout.panelY,this.topicMenuLayout.panelHeight,205);this.startTypewriter();this.syncDialogueAliases();
 }
 refreshLocationSpeaker(){
  this.sharedDialogue?.setSpeaker({name:getNpcLabel(this.npcId),portrait:{kind:'texture',
   key:getAvailableLocationIconKey(this,this.locationId,this.cityData,this.npcId)}});
 }
 onLocationTextureReady(key){if(key===this.expectedLocationIconKey&&this.sharedDialogue?.isOpen){this.refreshLocationSpeaker();this.syncDialogueAliases();}}
 locationTopics(){
  if(this.entryBlocked||this.isFalseLead||!this.reputationAccess.allowed||!this.npcController)return[];
  return['banter',...new Set(this.availableTopics.filter(id=>id!=='banter'))];
 }
 syncDialogueAliases(){
  const view=this.sharedDialogue;if(!view?.isOpen)return;
  this.dialogueText=view.text;this.footerTextObject=view.footer;this.npcNameText=view.nameText;this.dialoguePanel=view.background;
  this.panelBorder=view.border;this.portraitFrame=view.portraitFrame;this.portraitImage=view.portraitObjects[0]||null;
  this.leaveButton=view.leaveButton;this.dialogueMaxHeight=view.dialogueMaxHeight;
  this.topicButtons=view.pageTopics.map((topic,index)=>({topicId:topic.id,text:view.topicObjects[index]})).filter(button=>button.text);
  // ChaseTutorial reads topicButtons. If unasked topics are on another page,
  // highlight the real next-page control instead of incorrectly suggesting Leave.
  const visiblePending=this.topicButtons.some(button=>button.topicId!=='banter'&&!this.askedTopics.has(button.topicId));
  const hiddenPending=view.topics.find(topic=>topic.id!=='banter'&&!this.askedTopics.has(topic.id)&&!view.pageTopics.includes(topic));
  if(!visiblePending&&hiddenPending&&view.pageTopics.length<view.topics.length){
   const next=view.topicObjects.at(-1);if(next?.input?.enabled)this.topicButtons.push({topicId:hiddenPending.id,text:next});
  }
  const L=view.layout;this.topicMenuLayout={width:L.width,panelY:L.panelY,panelHeight:L.panelHeight,menuWidth:L.menuWidth};
 }
 layoutLocationDialogue(){
  const{width,height}=this.scale;this.locationBackground?.setPosition(width/2,height/2).setDisplaySize(width,height);
  const y=this.sharedDialogue?.layout.panelY??height-232;
  this.forgerBonusText?.setPosition(18,Math.max(0,y-46)).setWordWrapWidth(Math.max(100,width-56));this.syncDialogueAliases();
 }
 topicLabel(id){
  const meta=this.npcController?.getTopicMeta?.(id);if(meta?.label)return meta.label;if(TOPIC_LABELS[id])return TOPIC_LABELS[id];
  const label=String(id).replace(/[_-]+/g,' ');return label.charAt(0).toUpperCase()+label.slice(1);
 }
 createTopicMenu(_width,_panelY,_panelHeight,_menuWidth){
  this.sharedDialogue?.setTopics(this.locationTopics().map(id=>({id,label:this.topicLabel(id),
   state:this.askedTopics.has(id)?'used':'normal',onSelect:()=>this.handleTopicClick(id)})),{preservePage:true});
  this.syncDialogueAliases();
 }
 handleTopicClick(topicId){
  const energy=getEnergyManager();
  if(!this.npcController||this.isFinishing||this.entryBlocked||this.isFalseLead||!this.reputationAccess.allowed||energy.isForcedSleepActive()||energy.isManualSleepActive())return;
  if(topicId==='banter'){
   this.askedTopics.add('banter');this.fullDialogueString=this.nextBanterLine();this.startTypewriter();
   if(this.topicMenuLayout){const L=this.topicMenuLayout;this.createTopicMenu(L.width,L.panelY,L.panelHeight,L.menuWidth);}return;
  }
  this.availableTopics=this.npcController.getAvailableTopics();if(!this.availableTopics.includes(topicId))return;
  const meta=this.npcController.getTopicMeta?.(topicId),result=this.npcController.askTopic(topicId);if(!result)return;
  const note=this.npcController.toNote(result);
  if(note&&!this.hasClue(note)&&!this.generatedNotes.some(entry=>entry.id===note.id))this.generatedNotes.push(note);
  this.askedTopics.add(topicId);
  this.fullDialogueString=topicId==='motive'&&meta?.question?`${T('t_7b1aab937ca83cd9c085')}${meta.question}${T('t_75a11da44c802486bc6f')}${result.text}`:result.text;
  this.startTypewriter();this.refreshNotebook();this.availableTopics=this.npcController.getAvailableTopics();
  if(this.topicMenuLayout){const L=this.topicMenuLayout;this.createTopicMenu(L.width,L.panelY,L.panelHeight,L.menuWidth);}
 }
 stopTypewriter(){this.typewriterEvent?.remove(false);this.typewriterEvent=null;this.sharedDialogue?.stopTypewriter();this.isTyping=false;}
 startTypewriter(){
  this.stopTypewriter();this.fullDialogueString=String(this.fullDialogueString??'');
  this.sharedDialogue?.setText(this.fullDialogueString);this.syncDialogueAliases();
 }
 completeTypewriter(){this.sharedDialogue?.completeTypewriter();this.syncDialogueAliases();}
 closeAllUIPanels(){this.scene.manager.keys.PlayerHudScene?.closeAllUIPanels?.();}
 async finishEncounter(){
  if(this.isFinishing)return;this.isFinishing=true;this.completeTypewriter();
  const completed=Boolean(!this.entryBlocked&&this.reputationAccess.allowed&&this.npcController);
  if(completed){
   this.ensureEncounterMemory();if(this.encounterId)gameState.addEncounter(this.encounterId);
   if(!this.isFalseLead)for(const note of this.generatedNotes)if(note&&!this.hasClue(note))gameState.addClue(note);
   if(this.encounterId&&!this.isFalseLead){
    const previous=gameState.encounterMemory[this.encounterId]||{};
    gameState.encounterMemory={...gameState.encounterMemory,[this.encounterId]:{...previous,firstDialogueSeen:true,
     askedTopics:Array.from(this.askedTopics),dialogueTargetCityId:this.dialogueTargetCityId||null}};
   }
  }
  saveGameState();this.refreshNotebook();
  try{
   const started=await this.goto('CityScene',{cityId:this.cityId,cityCompleted:false,investigationStatus:null,pendingPhoneCall:false});
   if(!started&&!this._cleanupDone)this.isFinishing=false;
  }catch(error){console.error('[LocationScene] Return to city failed:',error);if(!this._cleanupDone)this.isFinishing=false;}
 }
 hasClue(newClue){
  if(!newClue)return false;const clues=Array.isArray(gameState.cluesCollected)?gameState.cluesCollected:[];
  return clues.some(existing=>existing&&((newClue.id!==undefined&&existing.id===newClue.id)||
   (existing.type===newClue.type&&existing.category===newClue.category&&existing.key===newClue.key&&existing.cityId===newClue.cityId&&existing.tag===newClue.tag&&existing.value===newClue.value)));
 }
 getLocationBackgroundKey(locationId,cityData=null){
  const candidates=getLocationBackgroundCandidates(locationId,cityData),key=candidates.find(candidate=>this.textures.exists(candidate));
  if(key)return key;console.warn('[LocationScene] No location background:',{cityId:this.cityId,locationId,candidates});return null;
 }
 addHoverEffect(button,baseScale=.8,hoverScale=.9){button.on('pointerover',()=>button.setScale(hoverScale));button.on('pointerout',()=>button.setScale(baseScale));}
 handleShutdown(){
  this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown,this);this.events.off(Phaser.Scenes.Events.DESTROY,this.handleShutdown,this);
  this.events.off('preupdate',this.hideLocationNews,this);this.textures.off('addtexture',this.onLocationTextureReady,this);
  this.restoreLocationNews();this.stopTypewriter();this.sharedDialogue?.destroy();this.sharedDialogue=null;
  if(this.locationAmbient){audioManager.releaseSound(this.locationAmbient);this.locationAmbient=null;}
  if(this.forgerBonusText){this.tweens.killTweensOf(this.forgerBonusText);this.forgerBonusText.destroy();}
  this.dialogueText=null;this.footerTextObject=null;this.npcNameText=null;this.dialoguePanel=null;this.panelBorder=null;
  this.portraitFrame=null;this.portraitImage=null;this.continueIndicator=null;this.leaveButton=null;this.forgerBonusText=null;
  this.topicButtons=[];this.generatedNotes=[];this.encounterMemory=null;this.npcController=null;this.cityData=null;this.locationBackground=null;
  this.availableTopics=[];this.askedTopics=new Set();this.banterSeen=new Set();this.reputationAccess={allowed:true,reason:''};
  this.isFinishing=false;this.topicMenuLayout=null;this.entryEnergyCost=null;this.expectedLocationIconKey=null;
 }
}
