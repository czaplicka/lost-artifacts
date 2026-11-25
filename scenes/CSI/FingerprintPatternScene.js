import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { BaseForensicMinigame } from './BaseForensicMinigame.js';
import { getForensicFieldConfig } from '../../suspects/suspectFactory.js';
const text=key=>__dialogueText('scenes/CSI/FingerprintPatternScene.js',key);
// Procedural renderers currently implemented by this scene, not a substitute
// for the generator's configured vocabulary.
const SUPPORTED_PATTERNS=new Set(['LOOP','WHORL','ARCH']);
const normalize=value=>typeof value==='string'?value.trim().toUpperCase():'';
function invalid(message,value,code='UNSUPPORTED_FINGERPRINT_PATTERN'){
  const error=Error(message);error.code=code;error.invalidValue=value;
  console.error('[FingerprintPatternScene]',message,{value},error);throw error;
}
function assertPattern(value){const result=normalize(value);if(!SUPPORTED_PATTERNS.has(result))return invalid('Unsupported or missing fingerprint pattern.',value);return result;}

export class FingerprintPatternScene extends BaseForensicMinigame {
  constructor(){super('FingerprintPatternScene');this.progressLabel=null;this.patternLayout=null;this.patternBackdrop=null;this.patternChoices=[];this._patternConfigValid=false;}
  init(data={}){
    this._patternConfigValid=false;this.correctValue=null;
    const config=data.evidenceConfig||{};
    let values;
    try{values=getForensicFieldConfig()?.fingerprint_pattern?.values;}
    catch(error){return invalid('The fingerprint dictionary could not be read: '+error.message,null,'INVALID_FINGERPRINT_DICTIONARY');}
    if(!Array.isArray(values)||!values.length)return invalid('The fingerprint dictionary is empty or invalid.',values,'INVALID_FINGERPRINT_DICTIONARY');
    const choices=values.map(normalize);
    if(new Set(choices).size!==choices.length||choices.some(pattern=>!SUPPORTED_PATTERNS.has(pattern)))return invalid('The fingerprint dictionary contains duplicate or unsupported patterns. A renderer and puzzle rules are required for each new pattern.',values,'INVALID_FINGERPRINT_DICTIONARY');
    const declared=[data.correctValue,config.correctValue,config.thief_value,config.value,config.normalizedValue].filter(value=>value!==null&&value!==undefined);
    const value=assertPattern(declared[0]);
    for(const raw of declared)if(assertPattern(raw)!==value)return invalid('Conflicting fingerprint patterns in the evidence configuration.',raw,'CONFLICTING_FINGERPRINT_PATTERN');
    if(!choices.includes(value))return invalid('The assigned fingerprint pattern is absent from the generator dictionary.',value,'FINGERPRINT_DICTIONARY_MISMATCH');
    super.init({...data,totalSteps:3,stationId:data.stationId||config.stationId||'identity',evidenceType:'fingerprint_pattern',correctValue:value,
      clueType:data.clueType||config.clueType||'identity',
      clueText:data.clueText||config.clueText||`${text('t_371caa94a173dbf65a05')}${value.toLowerCase()}${text('t_edc1830c9c0a4114af47')}`,
      evidenceConfig:{...config,evidenceType:'fingerprint_pattern',attribute:'fingerprint_pattern',correctValue:value,thief_value:value}});
    this.patternChoices=choices;this._patternConfigValid=true;this.progressLabel=null;this.patternLayout=null;
  }
  create(){if(!this._patternConfigValid)return invalid('Cannot start a fingerprint puzzle without validated evidence.',null,'INVALID_FINGERPRINT_CONFIGURATION');super.create();}
  getTitle(){return text('t_cedd7d7d9d881319b0a5');}
  getSubtitle(){return text('t_78c2d4df4acb731cf724');}
  getRetryHint(){return text('t_08c4855246478c8426c5');}
  toDisplayText(value){return String(value??'').toUpperCase();}
  createBackdrop(){
    this.patternBackdrop?.destroy();const {width,height}=this.scale;
    // Scene-scoped: clearStage() must leave the background in place.
    this.patternBackdrop=this.add.rectangle(0,0,width,height,0x07110d,1).setOrigin(0,0).setDepth(-10);
  }
  createHeader(){
    const {width}=this.scale;
    this.titleText=this.add.text(width/2,24,this.getTitle(),{fontFamily:'PressStart2P',fontSize:width<=700?'9px':'13px',color:'#39ff14',align:'center',wordWrap:{width:width-64,useAdvancedWrap:true}}).setOrigin(.5,0).setDepth(110);
    this.subtitleText=this.add.text(width/2,58,this.getSubtitle(),{fontFamily:'SpecialElite',fontSize:'17px',color:'#d5e6dc'}).setOrigin(.5,0).setDepth(110);
    this.instructionsBg=this.add.rectangle(width/2,108,width-24,52,0x101c15,1).setDepth(109);
    this.instructionsText=this.add.text(width/2,108,'',{fontFamily:'SpecialElite',fontSize:'16px',color:'#ffe8a3',align:'center',wordWrap:{width:width-48,useAdvancedWrap:true}}).setOrigin(.5).setDepth(110);
    this.progressLabel=this.add.text(width/2,142,'',{fontFamily:'PressStart2P',fontSize:'8px',color:'#8df7b4'}).setOrigin(.5).setDepth(110);this.setStep(0);
  }
  createFrame(){
    const {width,height}=this.scale,top=160,actionY=height-154,span=Math.max(180,actionY-top);
    const sampleY=top+span*.32,referenceY=Math.min(top+span*.78,actionY-84);
    const sampleHeight=Math.max(36,Math.min(160,span*.43,(referenceY-50-sampleY-24)*2));
    this.patternLayout={centerX:width/2,sampleY,sampleWidth:Math.min(240,width-72),sampleHeight,referenceY,actionY};
    this.playArea=this.add.container(0,0).setDepth(-1);
    this.playAreaBg=this.add.rectangle(width/2,(top+actionY)/2,width-24,Math.max(180,actionY-top+40),0x122019,.95).setStrokeStyle(1,0x5da17f).setDepth(-1);this.playArea.add(this.playAreaBg);
    this.dialogueBg=this.add.rectangle(width/2,height-86,width-24,72,0x07110d,1).setStrokeStyle(1,0x39ff14).setDepth(120);
    this.dialogueText=this.add.text(width/2,height-86,'',{fontFamily:'SpecialElite',fontSize:'16px',color:'#f3f3f3',align:'center',wordWrap:{width:width-44,useAdvancedWrap:true}}).setOrigin(.5).setDepth(121);
  }
  createFooter(){
    const {width,height}=this.scale,style={fontFamily:'PressStart2P',fontSize:'8px',color:'#ffcc00'};
    this.scoreText=this.add.text(16,height-28,'',style).setDepth(130);this.timerText=this.add.text(width-16,height-28,'Time: 00',style).setOrigin(1,0).setDepth(130);this.setScore(this.score);
  }
  setStep(index){this.currentStep=Math.max(0,Math.min(this.totalSteps,index));this.progressLabel?.setText(`${text('t_292e12948d7f29dc1024')}${this.currentStep}${text('t_8a5edab282632443219e')}${this.totalSteps}`);}
  createButton(x,y,w,h,label,callback,opts={}){
    // The base class marks the final button with allowAfterResolve. Never use
    // a translated caption as a control identifier.
    if(opts.role==='complete'||opts.allowAfterResolve===true){x=this.scale.width/2;y=this.patternLayout?.actionY??this.scale.height-154;w=Math.min(w,this.scale.width-32);}
    return super.createButton(x,y,w,h,label,callback,opts);
  }
  drawPattern(raw,x,y,width,height,alpha=1){
    const pattern=assertPattern(raw),graphics=this.add.graphics().setPosition(x,y).setDepth(151);graphics.lineStyle(2,0xc5ead1,alpha);
    for(let ridge=0;ridge<8;ridge++){
      const rx=width*(.45-ridge*.04),ry=height*(.45-ridge*.04);
      if(pattern==='WHORL'){graphics.strokeEllipse(0,0,rx*2,ry*2);continue;}
      graphics.beginPath();
      for(let point=0;point<=50;point++){
        const t=point/50;let px,py;
        if(pattern==='LOOP'){const angle=-2.75+t*5.5;px=Math.cos(angle)*rx+width*.06;py=Math.sin(angle)*ry;}
        else{px=(t*2-1)*width*.45;py=height*(.35-ridge*.075)-Math.sin(t*Math.PI)*height*.3;}
        if(point===0)graphics.moveTo(px,py);else graphics.lineTo(px,py);
      }graphics.strokePath();
    }return this.addStageObject(graphics);
  }
  showSample(alpha=1,obscured=false){
    const L=this.patternLayout;this.drawPattern(this.correctValue,L.centerX,L.sampleY,L.sampleWidth,L.sampleHeight,alpha);
    if(obscured){
      const cover=this.add.graphics().setDepth(152);cover.lineStyle(5,0x34463b,.9);
      for(let i=0;i<10;i++){const y=L.sampleY-L.sampleHeight/2+i*L.sampleHeight/9;cover.lineBetween(L.centerX-L.sampleWidth/2,y,L.centerX+L.sampleWidth/2,y+12);}
      this.addStageObject(cover);
    }
    this.addStageObject(this.add.text(L.centerX,L.sampleY+L.sampleHeight/2+12,'RECOVERED SAMPLE',{fontFamily:'PressStart2P',fontSize:'8px',color:'#9db9a7'}).setOrigin(.5).setDepth(153));
  }
  createEvidenceFlow(){this.startPreparation();}
  startPreparation(){
    this.clearStage();this.setStep(0);this.showSample(.35,true);this.setInstructions(text('t_2b081e8567f1b86b00c4'));this.setDialogue(text('t_b61d78619124f64c6f77'));
    this.createButton(this.scale.width/2,this.patternLayout.actionY,Math.min(300,this.scale.width-32),46,text('t_da414544c720fd6062ae'),()=>this.startFocus(),{fontFamily:'PressStart2P',fontSize:'10px'});
  }
  startFocus(){
    if(this.resolved||this._minigameClosing)return;
    this.clearStage();this.setStep(1);this.showSample(.55);this.setInstructions(text('t_62e415ecc779b96ec1e9'));this.setDialogue(text('t_224c378fc6bb38dcee40'));
    this.createButton(this.scale.width/2,this.patternLayout.actionY,Math.min(300,this.scale.width-32),46,text('t_d25fdf5c2cc258e551f2'),()=>this.startClassification(),{fontFamily:'PressStart2P',fontSize:'10px'});
  }
  startClassification(){
    if(this.resolved||this._minigameClosing)return;
    this.clearStage();this.setStep(2);this.showSample(1);this.setInstructions(text('t_6ececfa4d3ab3cece53d'));this.setDialogue(text('t_f9c22150377d60426cba'));
    const width=this.scale.width,gap=8,count=this.patternChoices.length,cardWidth=Math.min(170,(width-32-gap*(count-1))/count);
    const left=width/2-(cardWidth*count+gap*(count-1))/2+cardWidth/2;
    this.patternChoices.forEach((pattern,index)=>{
      const x=left+index*(cardWidth+gap),y=this.patternLayout.referenceY;
      const button=this.createButton(x,y,cardWidth,100,pattern,()=>this.resolveChoice(pattern,pattern===this.correctValue,10),{
        optionValue:pattern,fontFamily:'PressStart2P',fontSize:'9px'});
      button.text.setY(33);this.drawPattern(pattern,x,y-12,cardWidth-18,55,.9);
    });
  }
  onCorrectChoice(value){
    // Keep the cards visible so the base-class highlight actually remains visible.
    super.onCorrectChoice(value);this.setStep(this.totalSteps);this.setInstructions(text('t_8f163bd328021bff9976'));
  }
  getResultPayload(){
    if(!this._patternConfigValid)return invalid('Cannot produce a result from invalid fingerprint evidence.',this.correctValue,'INVALID_FINGERPRINT_CONFIGURATION');
    assertPattern(this.correctValue);return super.getResultPayload();
  }
  getSuccessMessage(value,bonus=0){return `${text('t_a46d6075e7e391338944')}${value}${text('t_cdb4ee2aea69cc6a8333')}${bonus?`${text('t_28832618483a10e804ba')}${bonus}${text('t_cdb4ee2aea69cc6a8333')}`:''}${text('t_d39e74783335b794c9e1')}`;}
  cleanup(){
    this.patternBackdrop?.destroy();this.patternBackdrop=null;this.progressLabel?.destroy();this.progressLabel=null;
    this._patternConfigValid=false;super.cleanup();this.patternLayout=null;this.patternChoices=[];
  }
}
