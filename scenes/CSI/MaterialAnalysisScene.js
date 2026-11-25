import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FiberAnalysisScene } from './FiberAnalysisScene.js';
import { BaseScene } from '../BaseScene.js';
import { TERM } from './LabTerminal.js';
import { getMaterialProfiles } from '../../suspects/MaterialEvidence.js';
import { materialText, MATERIAL_TEXTS_READY } from './MaterialAnalysisText.js';
const text=key=>__dialogueText('scenes/CSI/MaterialAnalysisScene.js',key);

export class MaterialAnalysisScene extends FiberAnalysisScene {
  constructor(){super('MaterialAnalysisScene');this.materialConfig=null;this.materialReport=null;this.materialSeconds=null;this._materialError=null;}
  init(data={}){
    const input=data&&typeof data==='object'&&!Array.isArray(data)?data:{};
    super.init(input);
    this.materialSeconds=null;this.materialConfig=null;this.materialReport=null;this._materialError=null;
    const config=input.evidenceConfig;
    this.stationId=input.stationId||config?.stationId||'trace_1';this.caseKey=input.caseKey??config?.caseKey??null;this.cityId=input.cityId??null;
    this.evidenceType='material_profile';
    if(!MATERIAL_TEXTS_READY){this._materialError={code:'material_texts_unavailable',key:'catalogueUnavailable'};return;}
    if(config!=null&&(typeof config!=='object'||Array.isArray(config))){this._materialError={code:'invalid_material_config',key:'invalidConfiguration'};return;}
    const source=config||{},value=input.correctValue??source.correctValue??source.thief_value;
    if(value==null||value===''){this._materialError={code:'missing_material_profile',key:'missingProfile'};return;}
    const declared=[input.correctValue,source.correctValue,source.thief_value].filter(v=>v!=null);
    if(declared.some(v=>v!==value)){this._materialError={code:'conflicting_material_profile',key:'conflictingProfile'};return;}
    let profile;
    try{profile=getMaterialProfiles().find(p=>p.id===value);}
    catch(error){console.error('[MaterialAnalysisScene] Cannot read profiles:',error);this._materialError={code:'invalid_material_config',key:'invalidConfiguration'};return;}
    if(!profile){this._materialError={code:'unsupported_material_profile',key:'unsupportedProfile',values:{profile:String(value)}};return;}
    this.correctValue=value;this.materialReport=profile;
    this.materialConfig={...source,attribute:'material_profile',evidenceType:'material_profile',correctValue:value,thief_value:value,
      minigame:'MaterialAnalysisScene',label:text('t_c7514017c0fce9a099d3'),clueType:'trace',clueText:source.clueText||profile.labText,isRedHerring:false};
    this.evidenceConfig=this.materialConfig;
    this.clue={id:source.id||`trace_${value}`,type:'trace',text:this.materialConfig.clueText,
      facts:{material:profile.material,...(value==='wool_lanolin'?{lanolinDetected:true}:{})}};
  }
  create(){
    if(!this.materialConfig||!this.materialReport||this._materialError){
      BaseScene.prototype.create.call(this);this._fiberDisposed=false;this._fiberSession+=1;
      if(!this._materialError)this._materialError={code:'missing_material_config',key:'missingProfile'};
      this.showMaterialError();return;
    }
    super.create();
  }
  showMaterialError(){
    const {width,height}=this.scale,session=this._fiberSession;
    const overlay=this.add.rectangle(0,0,width,height,0x000000,.96).setOrigin(0,0).setDepth(5000).setInteractive();
    const title=this.add.text(width/2,height*.30,materialText('errorTitle'),{fontFamily:'PressStart2P',fontSize:'13px',color:'#ffcc66',align:'center',wordWrap:{width:Math.max(100,width-60)}}).setOrigin(.5).setDepth(5001);
    const message=this.add.text(width/2,height*.48,materialText(this._materialError.key,this._materialError.values),{fontFamily:'SpecialElite',fontSize:'22px',color:'#fff4c7',align:'center',wordWrap:{width:Math.max(100,Math.min(700,width-60))}}).setOrigin(.5).setDepth(5001);
    const back=this.add.text(width/2,height*.72,materialText('returnToLab'),{fontFamily:'PressStart2P',fontSize:'11px',color:'#39ff14',backgroundColor:'#111111',padding:{left:14,right:14,top:14,bottom:14},align:'center',wordWrap:{width:Math.max(100,width-60)}}).setOrigin(.5).setDepth(5001).setInteractive({useHandCursor:true});
    this.readyOverlay=overlay;this.readyObjects=[overlay,title,message,back];
    back.on('pointerdown',(p,x,y,event)=>{event?.stopPropagation();if(session===this._fiberSession&&!this._fiberDisposed)this.closeMaterialError();});
  }
  closeMaterialError(){
    if(this.returningToLab||this._fiberDisposed)return;
    this.returningToLab=true;
    const payload={aborted:true,completed:false,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId,
      evidenceType:'material_profile',errorCode:this._materialError?.code||'invalid_material_config'};
    try{this.events.emit('minigame-closed',{schemaVersion:1,aborted:true,completed:false,payload});}
    finally{this.scene.stop();}
  }
  async showIntro(){
    const terminal=this.term,session=this._fiberSession;
    const printed=await this.printLines(session,terminal,[[materialText('introLoaded')],[materialText('introSequence')],[materialText('introMemory'),{color:TERM.amber}]]);
    if(printed&&!this.finished)this.showReadyScreen();
  }
  showReadyScreen(){
    const session=this._fiberSession;
    if(!this.isCurrentSession(session)||this.finished||this.gameStarted||this.readyOverlay)return;
    const {width,height}=this.scale,w=Math.min(width-24,760),h=Math.min(height-24,390),cx=width/2,cy=height/2;
    this.readyOverlay=this.add.rectangle(0,0,width,height,0x000000,.9).setOrigin(0,0).setDepth(5000).setInteractive();
    this.readyOverlay.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    const panel=this.add.rectangle(cx,cy,w,h,0x111827,1).setStrokeStyle(3,0x7df9ff).setDepth(5001);
    const title=this.add.text(cx,cy-h/2+34,materialText('briefingTitle'),{fontFamily:'PressStart2P',fontSize:width<=700?'11px':'15px',color:'#7df9ff',align:'center',wordWrap:{width:w-32,useAdvancedWrap:true}}).setOrigin(.5).setDepth(5002);
    const briefing=this.add.text(cx,cy-10,materialText('briefingBody'),{fontFamily:'SpecialElite',fontSize:width<=700?'20px':'24px',color:'#fff4c7',align:'center',wordWrap:{width:w-40,useAdvancedWrap:true}}).setOrigin(.5).setDepth(5002);
    briefing.setScale(Math.min(1,(h-150)/Math.max(1,briefing.height)));
    const start=this.add.text(cx,cy+h/2-40,materialText('startButton'),{fontFamily:'PressStart2P',fontSize:'11px',color:'#39ff14',backgroundColor:'#000000',padding:{left:12,right:12,top:12,bottom:12}}).setOrigin(.5).setDepth(5002).setInteractive({useHandCursor:true});
    this.readyObjects=[this.readyOverlay,panel,title,briefing,start];
    start.on('pointerdown',(p,x,y,event)=>{
      event?.stopPropagation();if(!this.isCurrentSession(session)||this.gameStarted||this.finished)return;
      this.gameStarted=true;start.disableInteractive();this.clearReadyScreen();this.startedAt=this.time.now;this.startRound();
    });
  }
  getSecondsElapsed(){return this.materialSeconds??super.getSecondsElapsed();}
  async finishAnalysis(){
    const terminal=this.term,session=this._fiberSession;
    if(this.finished||!this.materialConfig||!this.isCurrentSession(session,terminal))return;
    this.materialSeconds=super.getSecondsElapsed();this.finished=true;this.accepting=false;
    this.settlePlayback(false);this.cancelCall(this.nextRoundEvent);this.nextRoundEvent=null;
    const bonus=this.getTimeBonus();this.score=Math.min(120,this.score+bonus);this.disablePads();
    if(!await this.terminalAction(session,terminal,()=>terminal.progress(text('t_417cac3597812e93560c'),1800)))return;
    const lines=[[materialText('resultLine',{material:this.materialReport.label.toUpperCase()})],
      [materialText('reportLine',{report:this.materialReport.labText})],
      ...(this.materialConfig.sourceText?[[materialText('reportLine',{report:this.materialConfig.sourceText})]]:[]),
      [materialText('reportJoke'),{color:TERM.amber}]];
    if(bonus>0)lines.push([materialText('speedBonus',{bonus}),{color:TERM.amber}]);
    lines.push([materialText('clueReady'),{color:TERM.amber}]);
    if(!await this.printLines(session,terminal,lines))return;
    terminal.button(text('t_d8c6f6bc46d3b7948ad7'),TERM.green,()=>{if(this.isCurrentSession(session,terminal))this.returnResultToCrimeLab();});
  }
  returnResultToCrimeLab(){
    if(this.returningToLab||this._fiberDisposed||!this.finished||!this.materialConfig||this._materialError)return;
    this.returningToLab=true;
    const payload={aborted:false,completed:true,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId,
      evidenceType:'material_profile',evidenceConfig:this.materialConfig,correctValue:this.correctValue,value:this.correctValue,
      result:this.correctValue,selectedValue:this.correctValue,clueType:'trace',clueText:this.clue.text,label:text('t_c7514017c0fce9a099d3'),
      isValuable:false,score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed(),clue:this.clue,
      sourceConfirmed:this.materialConfig.sourceConfirmed===true,sourceText:this.materialConfig.sourceText||''};
    try{this.events.emit('minigame-complete',payload);}
    finally{
      try{this.events.emit('minigame-closed',{schemaVersion:1,aborted:false,completed:true,payload});}
      finally{this.scene.stop();}
    }
  }
}
