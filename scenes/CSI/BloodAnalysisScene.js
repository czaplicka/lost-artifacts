import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { BaseForensicMinigame } from './BaseForensicMinigame.js';
const text=key=>__dialogueText('scenes/CSI/BloodAnalysisScene.js',key);
const BLOOD_PATTERN=Object.freeze({
  'A+':{a:true,b:false,rh:true},'A-':{a:true,b:false,rh:false},
  'B+':{a:false,b:true,rh:true},'B-':{a:false,b:true,rh:false},
  'AB+':{a:true,b:true,rh:true},'AB-':{a:true,b:true,rh:false},
  'O+':{a:false,b:false,rh:true},'O-':{a:false,b:false,rh:false}
});
const BLOOD_IMAGE_KEY={A:'blood_type_A',B:'blood_type_B',AB:'blood_type_AB',O:'blood_type_0'};
const BOTTLE_HIT_RADIUS=55,WELL_HIT_RADIUS=45;
function rejectBlood(message,value,code='INVALID_BLOOD_TYPE'){
  const error=Error(message);error.code=code;error.invalidValue=value;
  console.error('[BloodAnalysisScene]',message,{value},error);throw error;
}
function assertBloodType(value){
  const type=typeof value==='string'?value.trim().toUpperCase():'';
  if(!Object.prototype.hasOwnProperty.call(BLOOD_PATTERN,type))return rejectBlood('Unsupported or missing blood type.',value);
  return type;
}
export class BloodAnalysisScene extends BaseForensicMinigame {
  constructor(){
    super('BloodAnalysisScene');this._bloodConfigValid=false;this._bloodStageTweens=new Set();this._bloodStageCalls=new Set();
    this.evidenceBag=this.closedSwab=this.bloodSwab=this.slide=this.tweezers=this.pipette=null;
    this.reagentObjects=[];this.wells=[];this.loadedReagent=null;this.completedReagents=new Set();
    this.microscopeOpened=false;this.microscopeExamined=false;this.bloodChoicePanel=null;
  }
  init(data={}){
    this.clearBloodStageResources();
    super.init({...data,totalSteps:5});this._bloodConfigValid=false;this.correctValue=null;this.evidenceType='blood_type';
    this.evidenceBag=this.closedSwab=this.bloodSwab=this.slide=this.tweezers=this.pipette=null;
    this.reagentObjects=[];this.wells=[];this.loadedReagent=null;this.completedReagents=new Set();
    this.microscopeOpened=false;this.microscopeExamined=false;this.bloodChoicePanel=null;
    this.microscopeHotspot=null;this.microscopeHint=null;this.pipetteMarker=null;this._pipetteTip=null;
    this._bloodTransitioning=false;this._bloodStageToken=Symbol('blood-stage');this._bloodStageTweens=new Set();this._bloodStageCalls=new Set();
    const config=data.evidenceConfig||{};
    const values=[data.correctValue,config.correctValue,config.thief_value,config.value,config.normalizedValue].filter(value=>value!==undefined&&value!==null);
    const type=assertBloodType(values[0]);
    for(const value of values)if(assertBloodType(value)!==type)return rejectBlood('Conflicting blood types in the evidence configuration.',value,'CONFLICTING_BLOOD_TYPE');
    this.correctValue=type;this.evidenceConfig={...config,attribute:'blood_type',evidenceType:'blood_type',correctValue:type,thief_value:type};this._bloodConfigValid=true;
  }
  create(){if(!this._bloodConfigValid)return rejectBlood('Blood analysis has no validated evidence configuration.',null,'INVALID_BLOOD_CONFIGURATION');super.create();}
  getTitle(){return text('t_bc813b165df281793a95');}
  getSubtitle(){return text('t_9cbc7d75dbc15c79d08e');}
  getRetryHint(){return text('t_2a027d9d4c9ab39b919d');}
  createEvidenceFlow(){this.startStep1();}
  isBloodStageActive(token=this._bloodStageToken){return token===this._bloodStageToken&&!this.resolved&&!this._minigameClosing&&this.sys.isActive();}
  bloodLater(delay,callback){
    const token=this._bloodStageToken;
    const event=this.time.delayedCall(delay,()=>{this._bloodStageCalls.delete(event);if(this.isBloodStageActive(token))callback();});
    this._bloodStageCalls.add(event);return event;
  }
  createBloodStageTween(config){const tween=this.createTrackedTween(config);this._bloodStageTweens.add(tween);return tween;}
  stopBloodStageTween(tween){
    if(!tween)return;this._bloodStageTweens.delete(tween);this.removeTrackedTween(tween,{stop:true,remove:true});
  }
  clearBloodStageResources(){
    this._bloodStageToken=Symbol('blood-stage');
    for(const event of this._bloodStageCalls||[])event.remove(false);this._bloodStageCalls?.clear();
    for(const tween of this._bloodStageTweens||[])this.removeTrackedTween(tween,{stop:true,remove:true});this._bloodStageTweens?.clear();
  }
  clearStage(){
    // Stop updates BEFORE destroying their targets.
    this.clearBloodStageResources();super.clearStage();this._bloodTransitioning=false;
    this.microscopeHotspot=null;this.microscopeHint=null;this.bloodChoicePanel=null;this.pipetteMarker=null;
  }
  canManipulate(){return this.isBloodStageActive()&&!this._bloodTransitioning;}
  startStep1(){
    this.clearStage();this.setStep(0);this.setInstructions(text('t_d690a8d01cab188ba33f'));this.setDialogue(text('t_28e59084359193658315'));
    const {width,height}=this.scale;this.createDesk();
    this.evidenceBag=this.addStageObject(this.add.image(width*.91,height*.77,'evidence_bag').setOrigin(.5).setDisplaySize(340,270).setDepth(2));
    this.closedSwab=this.addStageObject(this.add.image(width*.85,height*.68,'blood_swab_closed').setOrigin(.5).setDisplaySize(180,130).setDepth(3).setVisible(false));
    this.createTweezers(width*.58,height*.53,(x,y)=>{
      if(!this.evidenceBag.getBounds().contains(x,y)){this.penalize(3);this.setDialogue(text('t_a3fde91f812076edcb8d'));return;}
      this._bloodTransitioning=true;this.closedSwab.setVisible(true).setPosition(this.tweezers.x-45,this.tweezers.y+50);
      this.evidenceBag.setAlpha(.6);this.tweezers.disableInteractive();this.setDialogue(text('t_f9a70222805117ed79c1'));this.bloodLater(450,()=>this.startStep2());
    });
  }
  startStep2(){
    this.clearStage();this.setStep(1);this.setInstructions(text('t_0bd678b0b3ba1e7de055'));this.setDialogue(text('t_58c63c8b8845e82216b0'));
    const {width,height}=this.scale;this.createDesk();
    this.closedSwab=this.addStageObject(this.add.image(width*.91,height*.77,'blood_swab_closed').setOrigin(.5).setDisplaySize(240,170).setDepth(2));
    const glow=this.addStageObject(this.add.circle(this.closedSwab.x,this.closedSwab.y,82,0x8bd1ff,.12).setStrokeStyle(2,0x8bd1ff,.75).setDepth(3));
    const tween=this.createBloodStageTween({targets:glow,alpha:{from:.12,to:.34},scale:{from:.92,to:1.08},duration:600,yoyo:true,repeat:-1});
    this.createTweezers(width*.58,height*.53,(x,y)=>{
      if(!this.closedSwab.getBounds().contains(x,y)){this.penalize(3);this.setDialogue(text('t_612eb832faa9f46b6f0e'));return;}
      this._bloodTransitioning=true;this.stopBloodStageTween(tween);glow.destroy();this.closedSwab.destroy();
      this.bloodSwab=this.addStageObject(this.add.image(width*.91,height*.77,'blood_swab').setOrigin(.5).setDisplaySize(230,165).setDepth(3));
      this.tweezers.disableInteractive().setVisible(false);this.setDialogue(text('t_51c043076287e7f8f7cd'));this.bloodLater(500,()=>this.startStep3());
    });
  }
  startStep3(){
    this.clearStage();this.setStep(2);this.setInstructions(text('t_acb06197445d6711363d'));this.setDialogue(text('t_95edbbba60c6d89fa5fd'));
    const {width,height}=this.scale;this.createDesk();
    this.slide=this.addStageObject(this.add.image(width*.39,670,'hair_board').setOrigin(.5).setDisplaySize(630,180).setDepth(1));
    const glow=this.addStageObject(this.add.ellipse(this.slide.x,this.slide.y,260,115,0x8bd1ff,.12).setStrokeStyle(2,0x8bd1ff,.7).setDepth(2));
    this.bloodSwab=this.addStageObject(this.add.image(width*.91,height*.77,'blood_swab').setOrigin(.5).setDisplaySize(230,165).setDepth(4).setInteractive({draggable:true,useHandCursor:true}));
    this.input.setDraggable(this.bloodSwab);
    this.bloodSwab.on('drag',(p,x,y)=>{if(this.canManipulate()&&this.bloodSwab?.active)this.bloodSwab.setPosition(x,y);});
    this.bloodSwab.on('dragend',()=>{
      if(!this.canManipulate()||!this.slide?.active)return;
      if(!this.slide.getBounds().contains(this.bloodSwab.x,this.bloodSwab.y)){this.penalize(3);this.setDialogue('The sample must be transferred onto the preparation board.');return;}
      this._bloodTransitioning=true;glow.destroy();this.bloodSwab.disableInteractive().setVisible(false);this.slide.setTexture('blood_microscope_slide').setDisplaySize(1100,300);
      this.setDialogue('Slide prepared. Apply Anti-A, Anti-B and Anti-Rh reagents.');this.bloodLater(500,()=>this.startStep4());
    });
  }
  startStep4(){
    this.clearStage();this.setStep(3);this.setInstructions(text('t_133034abd0f763579613'));this.setDialogue(text('t_6acec8e285e69a024428'));
    const {width,height}=this.scale;this.createDesk();this.loadedReagent=null;this.completedReagents=new Set();
    this.slide=this.addStageObject(this.add.image(width*.39,670,'blood_microscope_slide').setOrigin(.5).setDisplaySize(1100,300).setDepth(1));
    const reagents=[{id:'A',key:'blood_reagent_A',x:width*.21,y:height*.46,color:0x4d9cff},
      {id:'B',key:'blood_reagent_B',x:width*.21,y:height*.60,color:0xffbb3f},
      {id:'Rh',key:'blood_reagent_Rh',x:width*.21,y:height*.74,color:0x87d96b}];
    this.reagentObjects=reagents.map(data=>{
      const bottle=this.addStageObject(this.add.image(data.x,data.y,data.key).setOrigin(.5).setDisplaySize(400,250).setDepth(3));
      const label=this.addStageObject(this.add.text(data.x,data.y+75,`ANTI-${data.id}`,{fontFamily:'PressStart2P',fontSize:'10px',color:'#c30000'}).setOrigin(.5).setDepth(4));
      return {...data,bottle,label,used:false};
    });
    this.wells=[{id:'A',x:-125},{id:'B',x:0},{id:'Rh',x:125}].map(data=>{
      const x=this.slide.x+data.x,y=this.slide.y;
      const circle=this.addStageObject(this.add.circle(x,y,34,0x701313,.82).setStrokeStyle(3,0xe7d8bf,.85).setDepth(3));
      const label=this.addStageObject(this.add.text(x,y+54,data.id,{fontFamily:'PressStart2P',fontSize:'12px',color:'#c30000'}).setOrigin(.5).setDepth(4));
      return {...data,x,wellY:y,circle,label};
    });
    this.createPipette(width*.38,height*.28);
  }
  createTweezers(startX,startY,onValidDrop){
    this.tweezers=this.addStageObject(this.add.image(startX,startY,'tweezers').setOrigin(.5).setDisplaySize(350,280).setAngle(-125).setDepth(5).setInteractive({draggable:true,useHandCursor:true}));
    this.input.setDraggable(this.tweezers);
    this.tweezers.on('drag',(p,x,y)=>{if(this.canManipulate()&&this.tweezers?.active)this.tweezers.setPosition(x,y).setAngle(125);});
    this.tweezers.on('dragend',()=>{if(this.canManipulate()&&this.tweezers?.active)onValidDrop(this.tweezers.x-50,this.tweezers.y-50);});
  }
  createPipette(startX,startY,{tipX=0,tipY=.5}={}){
    if(!Number.isFinite(startX)||!Number.isFinite(startY)||![tipX,tipY].every(value=>Number.isFinite(value)&&value>=0&&value<=1))throw Error('BloodAnalysisScene: invalid pipette position or normalized tip.');
    this.pipette=this.addStageObject(this.add.image(startX,startY,'pipette').setDepth(6).setInteractive({draggable:true,useHandCursor:true}));
    this._pipetteTip={x:tipX,y:tipY};this.input.setDraggable(this.pipette);
    const tip=this.getPipetteTipPosition();
    const marker=this.addStageObject(this.add.circle(tip.x,tip.y,10,0xe7f7ff,.9).setStrokeStyle(2,0xffffff,1).setDepth(8));this.pipetteMarker=marker;
    this.pipette.on('drag',(p,x,y)=>{if(!this.canManipulate()||!this.pipette?.active)return;this.pipette.setPosition(x,y);this.updatePipetteMarker();});
    this.pipette.on('dragend',()=>{if(this.canManipulate()&&this.pipette?.active)this.handlePipetteDrop();});
  }
  getPipetteTipPosition(){
    const image=this.pipette,tip=this._pipetteTip;
    // Coordinates are relative to the texture and transformed by the actual
    // image scale, rotation and parent transform. No fixed pixel offsets.
    const localX=(tip.x-image.originX)*image.width,localY=(tip.y-image.originY)*image.height;
    return image.getWorldTransformMatrix().transformPoint(localX,localY);
  }
  updatePipetteMarker(){const tip=this.getPipetteTipPosition();this.pipetteMarker?.setPosition(tip.x,tip.y);return tip;}
  handlePipetteDrop(){
    const {x,y}=this.updatePipetteMarker(),distance=(a,b)=>Phaser.Math.Distance.Between(x,y,a,b);
    const bottle=this.reagentObjects.find(r=>!r.used&&distance(r.bottle.x,r.bottle.y)<=BOTTLE_HIT_RADIUS);
    if(bottle){this.loadedReagent=bottle.id;this.pipetteMarker.setFillStyle(bottle.color,1);this.setDialogue(`Anti-${bottle.id} loaded. Place it in the ${bottle.id} well.`);return;}
    const used=this.reagentObjects.find(r=>r.used&&distance(r.bottle.x,r.bottle.y)<=BOTTLE_HIT_RADIUS);
    if(used){this.setDialogue(`Anti-${used.id} has already been used.`);return;}
    const well=this.wells.find(w=>distance(w.circle.x,w.circle.y)<=WELL_HIT_RADIUS);
    if(!well){this.penalize(3);this.setDialogue('Aim the pipette at a reagent bottle or one of the slide wells.');return;}
    if(!this.loadedReagent){this.penalize(3);this.setDialogue('Load a reagent into the pipette first.');return;}
    if(this.loadedReagent!==well.id){this.penalize(5);this.setDialogue(`Wrong well. Anti-${this.loadedReagent} belongs in the ${this.loadedReagent} well.`);return;}
    if(this.completedReagents.has(well.id)){this.setDialogue(`The ${well.id} well already contains its reagent.`);return;}
    this.applyReagent(well,this.loadedReagent);this.loadedReagent=null;this.pipetteMarker.setFillStyle(0xe7f7ff,.9);
  }
  applyReagent(well,reagentId){
    if(!this.canManipulate()||this.completedReagents.has(reagentId))return;
    const key=reagentId==='Rh'?'rh':reagentId.toLowerCase(),reaction=BLOOD_PATTERN[assertBloodType(this.correctValue)][key];
    if(typeof reaction!=='boolean')throw Error('BloodAnalysisScene: unknown reagent.');
    this.completedReagents.add(reagentId);const bottle=this.reagentObjects.find(r=>r.id===reagentId);
    if(bottle){bottle.used=true;bottle.bottle.setAlpha(.35);bottle.label.setAlpha(.35);}
    well.circle.setFillStyle(reaction?0xa61111:0x6d1717,1).setStrokeStyle(4,reaction?0xffd0d0:0xe7d8bf,1);
    if(reaction)for(let i=0;i<7;i++){const angle=Math.PI*2*i/7;this.addStageObject(this.add.circle(well.circle.x+Math.cos(angle)*(i%2?12:19),well.circle.y+Math.sin(angle)*(i%2?12:19),4,0xffd4d4,.95).setDepth(5));}
    this.setDialogue(`${text('t_8a0ab6eb26fd649621db')}${reagentId}${text('t_3531afbecfec85c042ca')}${3-this.completedReagents.size}${text('t_208502f1bd0a5e774742')}`);
    if(this.completedReagents.size===3){this._bloodTransitioning=true;this.pipette.disableInteractive();this.bloodLater(600,()=>this.startClassification());}
  }
  startClassification(){
    this.clearStage();this.setStep(4);this.microscopeOpened=false;this.microscopeExamined=false;
    this.setInstructions(text('t_30b73040300e6184729e'));this.setDialogue(text('t_e94b93ec5dc493db881b'));
    const {width,height}=this.scale;this.createDesk();
    this.microscopeHotspot=this.addStageObject(this.add.zone(width*.36,height*.43,width*.42,height*.74).setOrigin(.5).setDepth(4).setInteractive({useHandCursor:true}));
    this.microscopeHint=this.addStageObject(this.add.text(width*.36,height*.82,'CLICK MICROSCOPE',{fontFamily:'PressStart2P',fontSize:'10px',color:'#ffe8a3',backgroundColor:'#15100d',padding:{left:8,right:8,top:6,bottom:6}}).setOrigin(.5).setDepth(5));
    this.microscopeHotspot.on('pointerdown',()=>{if(this.canManipulate()&&!this.microscopeOpened)this.showMicroscopeOverlay();});
    this.createBloodChoicePanel(width*.79,height*.50);
  }
  createBloodChoicePanel(x,y){
    const baseTypes=Phaser.Utils.Array.Shuffle([...new Set(Object.keys(BLOOD_PATTERN).map(type=>type.slice(0,-1)))]);
    this.bloodChoicePanel=this.add.container(0,0).setDepth(1).setVisible(false);
    const panel=this.add.rectangle(x,y,360,590,0x0d1713,.94).setStrokeStyle(2,0x39ff14,.6);
    const title=this.add.text(x,y-260,'REFERENCE PROFILES',{fontFamily:'SpecialElite',fontSize:'21px',color:'#ffe8a3'}).setOrigin(.5);this.bloodChoicePanel.add([panel,title]);
    baseTypes.forEach((base,index)=>{
      const optionY=y-165+index*112;
      this.bloodChoicePanel.add([this.add.image(x-100,optionY,BLOOD_IMAGE_KEY[base]).setOrigin(.5).setDisplaySize(105,66),
        this.add.text(x-100,optionY+46,`TYPE ${base}`,{fontFamily:'PressStart2P',fontSize:'9px',color:'#f4e6cf'}).setOrigin(.5)]);
      ['+','-'].forEach((rh,rhIndex)=>{
        const value=base+rh;
        const button=this.createButton(x+(rhIndex===0?20:100),optionY,72,52,value,()=>{
          if(!this.canManipulate()||this.microscopeOpened)return;
          if(!this.microscopeExamined){this.setDialogue(text('t_d3276bc41d873bd69ed8'));return;}
          this.resolveChoice(value,value===this.correctValue,10);
        },{optionValue:value,fontFamily:'PressStart2P',fontSize:'12px',bgColor:0x3a2920,borderColor:0x7cc89f,depth:4});
        this.bloodChoicePanel.add(button);
      });
    });this.addStageObject(this.bloodChoicePanel);
  }
  showMicroscopeOverlay(){
    if(!this.canManipulate()||this.microscopeOpened)return;
    this.microscopeOpened=true;this.microscopeExamined=true;this.microscopeHint?.setVisible(false);
    this.microscopeHotspot?.disableInteractive();this.bloodChoicePanel?.setVisible(false);
    const {width,height}=this.scale,type=assertBloodType(this.correctValue),base=type.slice(0,-1),pattern=BLOOD_PATTERN[type];
    const overlay=this.add.rectangle(width/2,height/2,width,height,0x000000,.88).setDepth(50).setInteractive({useHandCursor:true});
    const frame=this.add.image(width/2,height/2,'microscope_look').setOrigin(.5).setDisplaySize(width*.76,height*.76).setDepth(51);
    const image=this.add.image(width/2,height*.43,BLOOD_IMAGE_KEY[base]).setOrigin(.5).setDisplaySize(width*.36,height*.32).setDepth(52);
    const title=this.add.text(width/2,height*.13,'MICROSCOPE: REAGENT REACTIONS',{fontFamily:'PressStart2P',fontSize:'13px',color:'#ffe8a3'}).setOrigin(.5).setDepth(53);
    const reaction=this.add.text(width/2,height*.72,[`ANTI-A: ${pattern.a?'AGGLUTINATION':'NO REACTION'}`,`ANTI-B: ${pattern.b?'AGGLUTINATION':'NO REACTION'}`,
      `ANTI-Rh: ${pattern.rh?'AGGLUTINATION':'NO REACTION'}`,`Rh FACTOR: ${type.endsWith('+')?'POSITIVE':'NEGATIVE'}`].join('\n'),{fontFamily:'SpecialElite',fontSize:'24px',color:'#dff2de',align:'center',lineSpacing:7}).setOrigin(.5).setDepth(53);
    const hint=this.add.text(width/2,height-45,'CLICK ANYWHERE TO CLOSE',{fontFamily:'PressStart2P',fontSize:'10px',color:'#ffe8a3',backgroundColor:'#000000',padding:{left:10,right:10,top:7,bottom:7}}).setOrigin(.5).setDepth(54);
    const objects=[overlay,frame,image,title,reaction,hint];this.stageObjects.push(...objects);
    overlay.on('pointerdown',(p,x,y,event)=>{
      event?.stopPropagation();if(!this.microscopeOpened)return;
      this.microscopeOpened=false;objects.forEach(object=>object?.destroy?.());this.stageObjects=this.stageObjects.filter(object=>!objects.includes(object));
      if(!this.isBloodStageActive())return;
      this.bloodChoicePanel?.setVisible(true);this.microscopeHotspot?.setInteractive({useHandCursor:true});this.microscopeHint?.setVisible(true);
      this.setDialogue('Compare the reaction profile with the reference cards.');
    });
  }
  onCorrectChoice(value){super.onCorrectChoice(value);this.setStep(this.totalSteps);this.microscopeHotspot?.disableInteractive();}
  getResultPayload(){
    if(!this._bloodConfigValid)return rejectBlood('Cannot produce a result from invalid blood evidence.',this.correctValue,'INVALID_BLOOD_CONFIGURATION');
    assertBloodType(this.correctValue);return super.getResultPayload();
  }
  createDesk(){const {width,height}=this.scale;this.addStageObject(this.add.image(width/2,height/2,'desk1').setOrigin(.5).setDisplaySize(width,height).setDepth(0));}
  cleanup(){
    this.clearBloodStageResources();this._bloodConfigValid=false;super.cleanup();
    this.microscopeHotspot=this.microscopeHint=this.bloodChoicePanel=this.pipetteMarker=null;
    this.reagentObjects=[];this.wells=[];this.completedReagents.clear();this.loadedReagent=null;
  }
}
