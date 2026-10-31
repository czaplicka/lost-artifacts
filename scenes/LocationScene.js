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
import { resolveCityNpcTheme, getLocationBackgroundCandidates, getNpcTextureKey, getNpcLabel } from '../npcThemeHelper.js';

const LOCATION_SOUND_MAP={alley:'alleysound',bank:'banksound',hotel:'hotelsound',parking:'parkingsound',policehq:'policesound',restaurant:'restaurantsound'};
const TOPIC_LABELS={features:'Features',accent:'Accent',hair:'Hair',eyes:'Eyes',skills:'Skills',habitus:'Habits',currency:'Money',travel:'Where next?',motive:'What really happened?',flight:'Flight',findings:'Findings',banter:'Small talk'};
const PANEL_GOLD=0xd4af37, PANEL_GOLD_DIM=0x8a6d1f;

export class LocationScene extends BaseScene {
  constructor() {
    super({key:'LocationScene'});
    this.topicButtons=[];
    this.generatedNotes=[];
    this.askedTopics=new Set();
    this.typewriterEvent=null;
    this.locationAmbient=null;
  }

  init(data={}) {
    this.stopTypewriter();
    this.cityId=data.cityId || null;
    this.encounterId=data.encounterId || null;
    this.npcId=data.npcId || null;
    this.locationId=data.locationId || null;
    this.isRepeat=Boolean(data.isRepeat);
    const manager=gameState.routeManager;
    const expected=typeof manager?.getNextExpectedCity==='function' ? manager.getNextExpectedCity() : gameState.nextTargetCityId || null;
    const crime=Boolean(this.cityId && this.cityId===gameState.crimeCityId);
    const next=Boolean(this.cityId && this.cityId===expected);
    const reached=Boolean(this.cityId && this.cityId===gameState.justReachedCorrectCityId);
    this.isCrimeCity=data.isCrimeCity ?? crime;
    this.isNextTargetCity=data.isNextTargetCity ?? next;
    this.isCorrectCity=data.isCorrectCity ?? Boolean(crime || next || reached);
    this.generatedNotes=[];
    this.isFinishing=false;
    this.isFalseLead=!this.isCorrectCity;
    this.timeCostApplied=false;
    this.dialogueText=this.footerTextObject=this.npcNameText=null;
    this.dialoguePanel=this.panelBorder=this.portraitFrame=null;
    this.portraitImage=this.continueIndicator=this.leaveButton=null;
    this.topicButtons=[];
    this.encounterMemory=null;
    this.dialogueTargetCityId=data.dialogueTargetCityId || null;
    this.locationAmbient=null;
    this.npcTheme='default';
    this.fullDialogueString='';
    this.isTyping=false;
    this.npcController=null;
    this.availableTopics=[];
    this.askedTopics=new Set();
    this.entryEnergyPaid=false;
    this.entryBlocked=false;
    this.entryEnergyCost=null;
    this.banterSeen=new Set();
    this.newsSnapshot=null;
    this.ensureEncounterMemory();
    this.reputationAccess=getNpcAccess(this.npcId,{isCrimeCity:this.isCrimeCity});
  }

  preload() {
    const key=NPC_DIALOGUE_KEY_MAP[this.npcId],path=NPC_DIALOGUE_FILE_MAP[this.npcId];
    if(key && path && !this.cache.json.exists(key)) this.load.json(key,path);
  }

  ensureEncounterMemory() {
    if(!gameState.encounterMemory || typeof gameState.encounterMemory!=='object' || Array.isArray(gameState.encounterMemory)) gameState.encounterMemory={};
  }

  getEncounterEnergyCost() {
    const energy=getEnergyManager();
    const taxi=energy.getTravelCost('taxi'),interview=energy.getInterviewCost('medium');
    return {taxi,interview,total:taxi+interview};
  }

  payEncounterEnergy() {
    if(this.isCrimeCity || this.entryEnergyPaid) return true;
    const energy=getEnergyManager(),cost=this.getEncounterEnergyCost();
    this.entryEnergyCost=cost;
    if(!energy.canAfford(cost.total).ok) {
      this.entryBlocked=true;
      this.fullDialogueString='You need some rest before this visit. Return to the city first.';
      return false;
    }
    const result=energy.consumeCustom(cost.total,
      `NPC visit: taxi -${cost.taxi}, conversation -${cost.interview}`,
      {requireFullAmount:true,activityType:'escape_city_npc_visit'});
    if(!result.success) {
      this.entryBlocked=true;
      this.fullDialogueString='This visit cannot begin yet. Return to the city and try again after resting.';
      return false;
    }
    this.entryEnergyPaid=true;
    saveGameState();
    return true;
  }

  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown,this);
    this.events.once(Phaser.Scenes.Events.DESTROY,this.handleShutdown,this);
    this.events.on('preupdate',this.hideLocationNews,this);
    this.hideLocationNews();
    audioManager.init(this);
    if(!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame',{loop:true});
    const sound=LOCATION_SOUND_MAP[this.locationId];
    if(sound && this.cache.audio.exists(sound)) this.locationAmbient=audioManager.playAmbient(sound,{volume:0.22,loop:true});
    this.closeAllUIPanels();
    const {width,height}=this.scale;
    const suspects=this.cache.json.get('suspects') || [];
    const locations=this.cache.json.get('locations') || [];
    const countryFacts=this.cache.json.get('country_facts') || {};
    const cacheKey=NPC_DIALOGUE_KEY_MAP[this.npcId],rootKey=NPC_DIALOGUE_ROOT_MAP[this.npcId];
    const raw=cacheKey ? this.cache.json.get(cacheKey) : null;
    const variants=raw?.[rootKey]?.locationVariants || {};
    const cityData=locations.find(city=>city.id===this.cityId) || null;
    this.npcTheme=resolveCityNpcTheme(cityData);
    const suspect=suspects.find(entry=>entry.id===gameState.currentThiefId) || gameState.currentThief || null;
    if(!cacheKey || !rootKey) console.warn(`[LocationScene] Unknown npcId "${this.npcId}".`);
    this.encounterMemory=this.encounterId ? gameState.encounterMemory?.[this.encounterId] || null : null;
    this.askedTopics=new Set(Array.isArray(this.encounterMemory?.askedTopics) ? this.encounterMemory.askedTopics : []);
    const manager=gameState.routeManager;
    const expected=typeof manager?.getNextExpectedCity==='function' ? manager.getNextExpectedCity() : gameState.nextTargetCityId || null;
    this.dialogueTargetCityId=this.dialogueTargetCityId || expected || this.encounterMemory?.dialogueTargetCityId || null;
    if(this.dialogueTargetCityId===this.cityId) this.dialogueTargetCityId=expected || null;
    this.reputationAccess=getNpcAccess(this.npcId,{isCrimeCity:this.isCrimeCity});
    if(!this.reputationAccess.allowed) this.fullDialogueString=this.reputationAccess.reason;
    else {
      try {
        this.npcController=new NPCController(variants,countryFacts,this.cityId,suspect || {},{
          targetCityId:this.dialogueTargetCityId,isCorrectCity:this.isCorrectCity,npcId:this.npcId
        });
      } catch(error) {
        console.warn('[LocationScene] Failed to build NPCController:',{npcId:this.npcId,cityId:this.cityId,error});
        this.npcController=null;
      }
      if(!this.npcController) this.fullDialogueString='There is nobody here who remembers anything useful.';
      else if(this.payEncounterEnergy()) {
        this.availableTopics=this.npcController.getAvailableTopics();
        this.fullDialogueString=this.isFalseLead ? this.npcController.getFalseLeadLine().text : this.nextBanterLine();
      }
    }
    const bg=this.getLocationBackgroundKey(this.locationId,cityData);
    if(bg) this.add.image(width/2,height/2,bg).setDisplaySize(width,height);
    else if(cityData?.backgroundKey && this.textures.exists(cityData.backgroundKey)) {
      this.add.image(width/2,height/2,cityData.backgroundKey).setDisplaySize(width,height);
    } else this.cameras.main.setBackgroundColor('#1a1a1a');
    this.createDialoguePanel(width,height);
    ensureHud(this);
    this.refreshNotebook();
    if(!this.entryBlocked && !this.timeCostApplied) {
      this.timeCostApplied=true;
      EventBus.emit('advanceTime',1,0);
      gameState.timeSpent=(gameState.timeSpent || 0)+1;
    }
  }

  hideLocationNews() {
    const news=this.scene.manager.keys.NewsHud;
    if(!news?.sys?.isActive()) return;
    if(!this.newsSnapshot || this.newsSnapshot.scene!==news) {
      this.newsSnapshot={scene:news,visible:news.sys.settings.visible,inputEnabled:news.input.enabled};
    }
    news.closeMenu?.(true);
    news.scene.setVisible(false);
    news.input.enabled=false;
  }

  restoreLocationNews() {
    const saved=this.newsSnapshot;
    if(saved?.scene?.sys?.isActive()) {
      saved.scene.scene.setVisible(saved.visible);
      saved.scene.input.enabled=saved.inputEnabled;
    }
    this.newsSnapshot=null;
  }

  nextBanterLine() {
    const pool=(this.npcController?.cityData?.banter || []).filter(line=>typeof line==='string' && line.trim());
    if(!pool.length) return this.npcController?.getBanterLine() || 'What would you like to know?';
    let unseen=pool.filter(line=>!this.banterSeen.has(line));
    if(!unseen.length) {this.banterSeen.clear();unseen=pool;}
    const line=unseen[Math.floor(Math.random()*unseen.length)];
    this.banterSeen.add(line);
    return line;
  }

  refreshNotebook() {
    const hud=this.scene.manager.keys.PlayerHudScene;
    if(hud?.refreshNotebook) hud.refreshNotebook(); else hud?.refreshUI?.();
  }

  createDialoguePanel(width,height) {
    const panelHeight=232,panelY=height-panelHeight;
    const portraitSize=190,portraitX=18,portraitY=panelY+12;
    const centerX=portraitX+portraitSize/2,centerY=portraitY+portraitSize/2;
    const textX=portraitX+portraitSize+30,menuWidth=205,textEndX=width-menuWidth-20;
    this.dialoguePanel=this.add.rectangle(0,panelY,width,panelHeight,0x201409,0.92).setOrigin(0).setDepth(10);
    this.panelBorder=this.add.graphics().setDepth(10);
    this.panelBorder.lineStyle(4,PANEL_GOLD,1);
    this.panelBorder.strokeRect(6,panelY+6,width-12,panelHeight-12);
    this.panelBorder.lineStyle(1,PANEL_GOLD_DIM,0.9);
    this.panelBorder.strokeRect(12,panelY+12,width-24,panelHeight-24);
    this.panelBorder.lineStyle(1,PANEL_GOLD_DIM,0.6);
    this.panelBorder.lineBetween(textEndX,panelY+16,textEndX,panelY+panelHeight-16);
    const portraitKey=getNpcTextureKey(this.npcId,this.npcTheme);
    if(portraitKey && this.textures.exists(portraitKey)) {
      this.portraitImage=this.add.image(centerX,centerY,portraitKey).setDepth(12);
      const frame=this.portraitImage.frame;
      const w=frame.realWidth || frame.width,h=frame.realHeight || frame.height;
      if(w>0 && h>0) this.portraitImage.setScale(Math.min(portraitSize/w,portraitSize/h));
      else this.portraitImage.setDisplaySize(portraitSize,portraitSize);
    } else this.portraitImage=this.add.text(centerX,centerY,'?',{
      fontFamily:'PressStart2P',fontSize:'48px',color:'#d4af37'
    }).setOrigin(0.5).setDepth(12);
    this.npcNameText=this.add.text(centerX,portraitY+portraitSize+8,getNpcLabel(this.npcId),{
      fontFamily:'PressStart2P',fontSize:'12px',color:'#ffd86b',align:'center',wordWrap:{width:portraitSize+20}
    }).setOrigin(0.5,0).setDepth(12);
    this.portraitImage.x=centerX-90;
    this.portraitImage.alpha=0;
    this.tweens.add({targets:this.portraitImage,x:centerX,alpha:1,duration:480,delay:120,ease:'Back.Out'});
    this.npcNameText.alpha=0;
    this.tweens.add({targets:this.npcNameText,alpha:1,duration:260,delay:480});
    this.dialogueText=this.add.text(textX,panelY+26,'',{
      fontFamily:'SpecialElite',fontSize:'22px',color:'#f4ecd8',lineSpacing:6,
      wordWrap:{width:Math.max(80,textEndX-textX-20)}
    }).setDepth(12).setInteractive();
    this.dialogueText.on('pointerdown',()=>{if(this.isTyping) this.completeTypewriter();});
    this.dialogueMaxHeight=panelHeight-52;
    this.createTopicMenu(width,panelY,panelHeight,menuWidth);
    this.startTypewriter();
  }

  topicLabel(id) {
    if(TOPIC_LABELS[id]) return TOPIC_LABELS[id];
    const label=String(id).replace(/[_-]+/g,' ');
    return label.charAt(0).toUpperCase()+label.slice(1);
  }

  createTopicMenu(width,panelY,panelHeight,menuWidth) {
    for(const button of this.topicButtons) button.text?.destroy();
    this.topicButtons=[];
    this.leaveButton?.destroy();
    const menuX=width-menuWidth+10;
    if(!this.entryBlocked && !this.isFalseLead && this.reputationAccess.allowed && this.npcController) {
      const topics=['banter',...new Set(this.availableTopics.filter(id=>id!=='banter'))];
      const top=panelY+21;
      const availableHeight=panelHeight-78;
      const step=Math.min(29,availableHeight/Math.max(1,topics.length));
      for(const [index,topicId] of topics.entries()) {
        const button=this.add.text(menuX,top+index*step,this.topicLabel(topicId),{
          fontFamily:'SpecialElite',fontSize:`${Math.min(18,Math.max(11,step-4))}px`,
          color:this.askedTopics.has(topicId) ? '#7a7160' : '#ffd86b'
        }).setDepth(13).setInteractive({useHandCursor:true});
        if(button.width>menuWidth-22) button.setScale((menuWidth-22)/button.width);
        button.on('pointerover',()=>button.setColor('#ffffff'));
        button.on('pointerout',()=>button.setColor(this.askedTopics.has(topicId) ? '#7a7160' : '#ffd86b'));
        button.on('pointerdown',()=>this.handleTopicClick(topicId));
        this.topicButtons.push({topicId,text:button});
      }
    }
    this.leaveButton=this.add.text(menuX,panelY+panelHeight-34,'Leave',{
      fontFamily:'SpecialElite',fontSize:'18px',color:'#d4af37'
    }).setDepth(13).setInteractive({useHandCursor:true});
    this.leaveButton.on('pointerover',()=>this.leaveButton?.setColor('#ffffff'));
    this.leaveButton.on('pointerout',()=>this.leaveButton?.setColor('#d4af37'));
    this.leaveButton.on('pointerdown',()=>void this.finishEncounter());
  }

  handleTopicClick(topicId) {
    const energy=getEnergyManager();
    if(!this.npcController || this.isFinishing || this.entryBlocked || this.isFalseLead ||
      !this.reputationAccess.allowed || energy.isForcedSleepActive() || energy.isManualSleepActive()) return;
    if(topicId==='banter') {
      this.fullDialogueString=this.nextBanterLine();
      this.startTypewriter();
      return;
    }
    if(!this.availableTopics.includes(topicId)) return;
    const result=this.npcController.askTopic(topicId);
    if(!result) return;
    if(!this.askedTopics.has(topicId)) {
      const note=this.npcController.toNote(result);
      if(note && !this.hasClue(note)) this.generatedNotes.push(note);
      this.askedTopics.add(topicId);
    }
    this.fullDialogueString=result.text;
    this.startTypewriter();
    for(const {topicId:id,text} of this.topicButtons) text.setColor(this.askedTopics.has(id) ? '#7a7160' : '#ffd86b');
  }

  stopTypewriter() {
    this.typewriterEvent?.remove(false);
    this.typewriterEvent=null;
    this.isTyping=false;
  }

  startTypewriter() {
    this.stopTypewriter();
    if(!this.dialogueText) return;
    this.fullDialogueString=String(this.fullDialogueString ?? '');
    const fullText=this.fullDialogueString;
    this.dialogueText.setFontSize(22).setText(fullText);
    while(this.dialogueText.height>this.dialogueMaxHeight && parseInt(this.dialogueText.style.fontSize,10)>13) {
      this.dialogueText.setFontSize(parseInt(this.dialogueText.style.fontSize,10)-1);
    }
    this.dialogueText.setText('');
    if(!fullText.length) return;
    let index=0;
    this.isTyping=true;
    this.typewriterEvent=this.time.addEvent({delay:54,loop:true,callback:()=>{
      if(!this.dialogueText || this.isFinishing) {this.stopTypewriter();return;}
      index=Math.min(index+3,fullText.length);
      this.dialogueText.setText(fullText.slice(0,index));
      if(index>=fullText.length) this.stopTypewriter();
    }});
  }

  completeTypewriter() {
    this.stopTypewriter();
    this.dialogueText?.setText(String(this.fullDialogueString ?? ''));
  }
  closeAllUIPanels() {this.scene.manager.keys.PlayerHudScene?.closeAllUIPanels?.();}

  async finishEncounter() {
    if(this.isFinishing) return;
    this.isFinishing=true;
    this.completeTypewriter();
    const completed=Boolean(!this.entryBlocked && this.reputationAccess.allowed && this.npcController);
    if(completed) {
      this.ensureEncounterMemory();
      if(this.encounterId) gameState.addEncounter(this.encounterId);
      if(!this.isFalseLead) {
        for(const note of this.generatedNotes) if(note && !this.hasClue(note)) gameState.addClue(note);
      }
      if(this.encounterId && !this.isFalseLead) {
        const previous=gameState.encounterMemory[this.encounterId] || {};
        gameState.encounterMemory={...gameState.encounterMemory,[this.encounterId]:{
          ...previous,firstDialogueSeen:true,askedTopics:Array.from(this.askedTopics),
          dialogueTargetCityId:previous.dialogueTargetCityId || this.dialogueTargetCityId || null
        }};
      }
    }
    saveGameState();
    this.refreshNotebook();
    try {
      const started=await this.goto('CityScene',{
        cityId:this.cityId,cityCompleted:false,investigationStatus:null,pendingPhoneCall:false
      });
      if(!started && !this._cleanupDone) this.isFinishing=false;
    } catch(error) {
      console.error('[LocationScene] Return to city failed:',error);
      if(!this._cleanupDone) this.isFinishing=false;
    }
  }

  hasClue(newClue) {
    if(!newClue) return false;
    const clues=Array.isArray(gameState.cluesCollected) ? gameState.cluesCollected : [];
    return clues.some(existing=>existing && ((newClue.id!==undefined && existing.id===newClue.id) ||
      (existing.type===newClue.type && existing.category===newClue.category && existing.key===newClue.key &&
       existing.cityId===newClue.cityId && existing.tag===newClue.tag && existing.value===newClue.value)));
  }

  getLocationBackgroundKey(locationId,cityData=null) {
    const candidates=getLocationBackgroundCandidates(locationId,resolveCityNpcTheme(cityData));
    const key=candidates.find(candidate=>this.textures.exists(candidate));
    if(key) return key;
    console.warn('[LocationScene] No location background:',{cityId:this.cityId,locationId,candidates});
    return null;
  }
  addHoverEffect(button,baseScale=0.8,hoverScale=0.9) {
    button.on('pointerover',()=>button.setScale(hoverScale));
    button.on('pointerout',()=>button.setScale(baseScale));
  }

  handleShutdown() {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown,this);
    this.events.off(Phaser.Scenes.Events.DESTROY,this.handleShutdown,this);
    this.events.off('preupdate',this.hideLocationNews,this);
    this.restoreLocationNews();
    this.stopTypewriter();
    if(this.locationAmbient) {audioManager.releaseSound(this.locationAmbient);this.locationAmbient=null;}
    const objects=[this.dialogueText,this.footerTextObject,this.npcNameText,this.dialoguePanel,
      this.panelBorder,this.portraitFrame,this.portraitImage,this.continueIndicator,
      ...this.topicButtons.map(button=>button.text),this.leaveButton];
    for(const object of objects) {
      if(!object) continue;
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.dialogueText=this.footerTextObject=this.npcNameText=null;
    this.dialoguePanel=this.panelBorder=this.portraitFrame=null;
    this.portraitImage=this.continueIndicator=this.leaveButton=null;
    this.topicButtons=[];
    this.generatedNotes=[];
    this.encounterMemory=null;
    this.npcController=null;
    this.availableTopics=[];
    this.askedTopics=new Set();
    this.banterSeen=new Set();
    this.reputationAccess={allowed:true,reason:''};
    this.isFinishing=false;
  }
}