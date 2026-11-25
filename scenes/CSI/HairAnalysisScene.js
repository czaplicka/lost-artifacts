import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { ForensicHelpController } from './ForensicHelpController.js';
import { gameState } from '../../GameData.js';
import { getForensicHairColorDefinitions, assertForensicHairColor, getHairStrandTexture, rejectHairColor } from '../../config/ForensicHairColors.js';
import { hairText } from './HairAnalysisText.js';
const text=key=>__dialogueText('scenes/CSI/HairAnalysisScene.js',key);
const TWEEZER_MISS_PENALTY=3;

export class HairAnalysisScene extends BaseForensicMinigame {
  constructor(){super('HairAnalysisScene');this.help=null;this._hairConfigValid=false;}
  init(data={}){
    super.init({...data,totalSteps:3});
    this._hairConfigValid=false;this._hairRunToken=Symbol('hair-run');
    this.evidenceType='hair_color';this.correctValue=null;
    this.help=null;this.bag=this.slide=this.tweezers=this.pipette=this.preparedStrand=null;
    this.hasStrandOnTweezers=false;this.hasStrandOnSlide=false;this.reagentApplied=false;
    this.microscopeOpened=false;this.microscopeExamined=false;this.stageTransitioning=false;
    this.sampleViews=[];this.microscopeHotspot=null;this.swatchValues=[];this.pendingStageCalls=[];
    this.hairColorDefinitions=getForensicHairColorDefinitions();
    const config=data.evidenceConfig||{};
    const declared=[data.correctValue,config.correctValue,config.thief_value,config.value,config.normalizedValue].filter(value=>value!==undefined&&value!==null);
    const incoming=assertForensicHairColor(declared[0],this.hairColorDefinitions);
    for(const value of declared)if(assertForensicHairColor(value,this.hairColorDefinitions)!==incoming)return rejectHairColor('Conflicting hair colours in the evidence configuration.',value,'CONFLICTING_FORENSIC_HAIR_COLOR');
    this.correctValue=incoming;
    this.evidenceConfig={...config,evidenceType:'hair_color',attribute:'hair_color',correctValue:incoming,thief_value:incoming};
    this._hairConfigValid=true;
  }
  create(){
    if(!this._hairConfigValid)return rejectHairColor('Hair analysis has no validated evidence configuration.',null,'INVALID_HAIR_CONFIGURATION');
    super.create();this.help=new ForensicHelpController(this);this.help.create();
  }
  getTitle(){return text('t_89f69eee43f406e44c54');}
  getSubtitle(){return text('t_7e59d815872c6ae46305');}
  getRetryHint(){return text('t_c958698d74e4da6ba2e8');}
  createEvidenceFlow(){this.startStep1();}
  createDesk(){const {width,height}=this.scale;this.addStageObject(this.add.image(width/2,height/2,'desk1').setOrigin(.5).setDisplaySize(width,height).setDepth(0));}
  later(delay,callback){
    const run=this._hairRunToken;
    const event=this.time.delayedCall(delay,()=>{
      this.pendingStageCalls=this.pendingStageCalls.filter(item=>item!==event);
      if(this._hairRunToken===run&&!this.resolved&&!this._minigameClosing&&this.sys.isActive())callback();
    });this.pendingStageCalls.push(event);return event;
  }
  tweezerMiss(){
    this.penalize(TWEEZER_MISS_PENALTY);
    this.setDialogue(hairText(this.hasStrandOnTweezers?'missedSlide':'missedBag'));
    const tweezers=this.tweezers,token=Symbol('tweezer-flash');
    if(tweezers){tweezers.flashToken=token;tweezers.setTint(0xff6666);}
    this.later(220,()=>{if(tweezers?.active&&tweezers.flashToken===token)tweezers.clearTint();});
  }
  startStep1(){
    this.clearStage();this.stageTransitioning=false;this.hasStrandOnTweezers=false;this.hasStrandOnSlide=false;this.setStep(0);
    this.setInstructions(text('t_c02ab252a5654e8ba10c'));this.setDialogue(text('t_4c85778a0f332c7aad95'));this.createDesk();
    const {width,height}=this.scale;
    this.bag=this.addStageObject(this.add.image(width*.92,height*.78,'evidence_bag').setDisplaySize(320,260).setDepth(2));
    this.slide=this.addStageObject(this.add.image(width*.4,670,'hair_board').setDisplaySize(430,180).setDepth(1));
    this.tweezers=this.addStageObject(this.add.image(width*.59,570,'tweezers').setDisplaySize(350,280).setDepth(3).setAngle(-125).setInteractive({draggable:true,useHandCursor:true}));
    this.input.setDraggable(this.tweezers);const dx=-45,dy=50;
    this.tweezers.on('drag',(pointer,x,y)=>{
      if(this.resolved||this.stageTransitioning||this._minigameClosing)return;
      this.tweezers.setPosition(x,y).setAngle(125);
      if(this.hasStrandOnTweezers)this.preparedStrand?.setPosition(x+dx,y+dy);
    });
    this.tweezers.on('dragend',()=>{
      if(this.resolved||this.stageTransitioning||this._minigameClosing)return;
      const x=this.tweezers.x+dx,y=this.tweezers.y+dy;
      if(!this.hasStrandOnTweezers&&this.bag.getBounds().contains(x,y)){
        this.hasStrandOnTweezers=true;
        this.preparedStrand=this.addStageObject(this.add.image(x,y,this.getHairStrandKey()).setDisplaySize(200,150).setDepth(4));
        this.setDialogue(hairText('strandPickedUp'));
      }else if(this.hasStrandOnTweezers&&this.slide.getBounds().contains(x,y)){
        this.hasStrandOnTweezers=false;this.hasStrandOnSlide=true;this.stageTransitioning=true;
        this.preparedStrand.setPosition(this.slide.x,this.slide.y).setDepth(2);this.tweezers.disableInteractive().setVisible(false);
        this.setDialogue(hairText('strandPlaced'));this.later(350,()=>this.startStep2());
      }else this.tweezerMiss();
    });
  }
  startStep2(){
    this.clearStage();this.stageTransitioning=false;this.reagentApplied=false;this.setStep(1);
    this.setInstructions(text('t_c0f5e3037d6ba67c8e19'));this.setDialogue(text('t_6c0f5f1e9ddfb2f461e4'));this.createDesk();
    const {width}=this.scale;
    this.slide=this.addStageObject(this.add.image(width*.4,670,'hair_board').setDisplaySize(430,180).setDepth(1));
    this.preparedStrand=this.addStageObject(this.add.image(this.slide.x,this.slide.y,this.getHairStrandKey()).setDisplaySize(200,150).setDepth(2));
    const target=this.addStageObject(this.add.circle(this.slide.x,this.slide.y,75,0x8bd1ff,.12).setStrokeStyle(2,0x8bd1ff,.75).setDepth(3));
    this.pipette=this.addStageObject(this.add.image(width*.63,580,'pipette').setDepth(4).setInteractive({draggable:true,useHandCursor:true}));
    this.input.setDraggable(this.pipette);const dx=-290,dy=-10;
    const marker=this.addStageObject(this.add.circle(this.pipette.x+dx,this.pipette.y+dy,11,0x8bd1ff,.8).setStrokeStyle(2,0xe4f8ff).setDepth(6));
    this.pipette.on('drag',(pointer,x,y)=>{if(this.resolved||this.stageTransitioning||this._minigameClosing)return;this.pipette.setPosition(x,y);marker.setPosition(x+dx,y+dy);});
    this.pipette.on('dragend',()=>{
      if(this.resolved||this.stageTransitioning||this._minigameClosing)return;
      const x=this.pipette.x+dx,y=this.pipette.y+dy;
      if(Phaser.Math.Distance.Between(x,y,this.slide.x,this.slide.y)<=75){
        this.reagentApplied=true;this.stageTransitioning=true;this.setDialogue(hairText('reagentApplied'));
        target.setVisible(false);marker.setVisible(false);this.pipette.disableInteractive().setVisible(false);this.later(500,()=>this.startStep3());
      }else{
        this.penalize(5);this.setDialogue(hairText('missedReagent'));this.pipette.setPosition(width*.63,580);marker.setPosition(this.pipette.x+dx,this.pipette.y+dy);
      }
    });
  }
  getHairOptions(){
    const colors=this.hairColorDefinitions.map(entry=>entry.id);
    const receipt=Object.values(gameState.forensicHintReceipts||{}).find(item=>item.sceneId===this.scene.key&&item.caseKey===this.caseKey&&item.stationId===this.stationId&&item.stepId==='compare_samples'&&item.evidenceId===(this.evidenceConfig?.id||this.evidenceType));
    const excluded=receipt?.excludedValue;
    const pool=Phaser.Utils.Array.Shuffle(colors.filter(value=>value!==this.correctValue&&value!==excluded));
    const wrong=colors.includes(excluded)&&excluded!==this.correctValue?[excluded,...pool.slice(0,2)]:pool.slice(0,3);
    return Phaser.Utils.Array.Shuffle([this.correctValue,...wrong]);
  }
  startStep3(){
    this.clearStage();this.stageTransitioning=false;this.microscopeOpened=false;this.microscopeExamined=false;this.sampleViews=[];this.setStep(2);
    this.setInstructions(text('t_c1c9a90c99ed4881fa47'));this.setDialogue(text('t_ded3c25f8c7a89dbe00c'));this.createDesk();
    const {width,height}=this.scale;
    this.microscopeHotspot=this.addStageObject(this.add.zone(width*.4,height*.37,400,720).setDepth(5).setInteractive({useHandCursor:true}));
    this.microscopeHotspot.on('pointerdown',()=>{if(!this.resolved&&!this.microscopeOpened&&!this._minigameClosing)this.showMicroscopeOverlay();});
    const x=width*.85,y=height*.5;
    this.addStageObject(this.add.rectangle(x,y,380,420,0x0d1713,.95).setStrokeStyle(2,0x39ff14,.6).setDepth(1));
    this.addStageObject(this.add.text(x,y-180,hairText('referenceSamples'),{fontFamily:'SpecialElite',fontSize:'20px',color:'#ffe8a3'}).setOrigin(.5).setDepth(2));
    this.swatchValues=this.getHairOptions();
    this.swatchValues.forEach((value,index)=>{
      const sampleY=y-100+index*90;
      const image=this.addStageObject(this.add.image(x,sampleY,this.getHairStrandKey(value)).setDisplaySize(320,76).setDepth(2).setInteractive({useHandCursor:true}));
      const label=this.addStageObject(this.add.text(x,sampleY+32,this.toDisplayText(value),{fontFamily:'SpecialElite',fontSize:'15px',color:'#f0e3c6'}).setOrigin(.5).setDepth(3));
      this.sampleViews.push({value,image,label});
      image.on('pointerdown',()=>{
        if(this.resolved||this.microscopeOpened||this._minigameClosing)return;
        if(!this.microscopeExamined){this.setDialogue(hairText('inspectFirst'));return;}
        this.resolveChoice(value,value===this.correctValue,10);
      });
    });
    const definition=this.getForensicHelp(),receipt=definition&&this.help?.receipt(definition);if(receipt)this.applyForensicHint(receipt);
  }
  showMicroscopeOverlay(){
    this.microscopeOpened=true;this.microscopeExamined=true;const {width,height}=this.scale;
    const overlay=this.addStageObject(this.add.rectangle(width/2,height/2,width,height,0x000000,.9).setDepth(500).setInteractive());
    const frame=this.addStageObject(this.add.image(width/2,height/2,'microscope_look').setDisplaySize(width*.7,height*.7).setDepth(501));
    const strand=this.addStageObject(this.add.image(width/2,height/2,this.getHairStrandKey()).setDisplaySize(760,300).setDepth(502));
    const label=this.addStageObject(this.add.text(width/2,height-100,hairText('closeMicroscope'),{fontFamily:'PressStart2P',fontSize:'10px',color:'#ffe8a3'}).setOrigin(.5).setDepth(503));
    const objects=[overlay,frame,strand,label];
    overlay.on('pointerdown',(pointer,x,y,event)=>{
      event?.stopPropagation();objects.forEach(object=>object.destroy());this.stageObjects=this.stageObjects.filter(object=>!objects.includes(object));
      this.microscopeOpened=false;this.setDialogue(hairText('compareSamples'));
    });
  }
  getForensicHelp(){
    if(this.resolved||this.stageTransitioning||this._minigameClosing)return null;
    if(this.currentStep===0)return this.hasStrandOnTweezers?{id:'place_strand',instructions:text('t_b9f8a23262627e29faa9'),text:text('t_662ba258f207cd0424c7'),targets:[this.slide]}:
      {id:'pick_up_strand',instructions:text('t_5f441846ae7b1ca2a0f3'),text:text('t_5efd81de080df40ae469'),targets:[this.tweezers,this.bag]};
    if(this.currentStep===1)return {id:'apply_reagent',instructions:text('t_1e219a18568dda9fb993'),text:text('t_daaf07bd17cae416d73f'),targets:[this.preparedStrand]};
    if(this.currentStep===2){
      if(!this.microscopeExamined)return {id:'inspect_strand',instructions:text('t_03d7fd661330e9e9135e'),text:text('t_5324ae34b800e3ebd55b'),targets:[this.microscopeHotspot]};
      const excluded=[...this.swatchValues].filter(value=>value!==this.correctValue).sort()[0];
      return {id:'compare_samples',instructions:text('t_0248d964a559161483f6'),text:text('t_65400d1d56949336de9b'),excludedValue:excluded,targets:[]};
    }
    return null;
  }
  applyForensicHint(receipt){
    if(!receipt.excludedValue)return;const sample=this.sampleViews.find(item=>item.value===receipt.excludedValue);
    if(sample&&sample.value!==this.correctValue){sample.image.disableInteractive().setAlpha(.25);sample.label.setText(`${this.toDisplayText(sample.value)}${text('t_a607de78b71c7e823e7e')}`).setAlpha(.55);}
  }
  flashWrongSelection(value){
    const sample=this.sampleViews.find(item=>item.value===value);if(!sample?.image?.active)return;
    const token=Symbol('hair-flash');sample.flashToken=token;sample.image.setTint(0xff6666);
    this.later(250,()=>{if(sample.flashToken===token&&sample.image?.active)sample.image.clearTint();});
  }
  onCorrectChoice(value){super.onCorrectChoice(value);for(const sample of this.sampleViews){sample.image.disableInteractive();if(sample.value===value)sample.image.setTint(0x88ff88);}}
  getResultPayload(){
    if(!this._hairConfigValid)return rejectHairColor('Cannot produce a result from invalid hair evidence.',this.correctValue,'INVALID_HAIR_CONFIGURATION');
    assertForensicHairColor(this.correctValue,this.hairColorDefinitions);
    const receipts=this.help?.getReceipts()||[];
    return {...super.getResultPayload(),hintsUsed:receipts.length,hintHistoryEntryIds:receipts.map(receipt=>receipt.historyEntryId),
      assistanceMethods:[...new Set(receipts.map(receipt=>receipt.method))],proceduralIssues:receipts.filter(receipt=>receipt.proceduralIssue).map(receipt=>({stepId:receipt.stepId,issue:receipt.proceduralIssue,historyEntryId:receipt.historyEntryId}))};
  }
  cleanup(){
    this._hairRunToken=null;this.help?.destroy();this.help=null;
    for(const event of this.pendingStageCalls||[])event.remove(false);this.pendingStageCalls=[];
    super.cleanup();this._hairConfigValid=false;this.bag=this.slide=this.tweezers=this.pipette=this.preparedStrand=null;
    this.microscopeHotspot=null;this.sampleViews=[];this.swatchValues=[];
  }
  getHairStrandKey(value=this.correctValue){return getHairStrandTexture(value,this.hairColorDefinitions);}
}
