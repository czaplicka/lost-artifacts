import {FiberAnalysisScene} from './FiberAnalysisScene.js';
import {TERM} from './LabTerminal.js';
import {getMaterialProfiles} from '../../suspects/MaterialEvidence.js';

// Reuses the sequence game, but supplies its own material briefing/report.
export class MaterialAnalysisScene extends FiberAnalysisScene {
  constructor(){super();this.sys.settings.key='MaterialAnalysisScene';}
  init(data={}){
    super.init(data);this.materialSeconds=null;
    const config=data.evidenceConfig||{},value=data.correctValue??config.correctValue??config.thief_value;
    if(value==null){this.materialConfig=null;this.materialReport=null;return;}
    const profile=getMaterialProfiles().find(p=>p.id===value);
    if(!profile)throw new Error(`MaterialAnalysisScene: unsupported profile ${value}`);
    this.correctValue=value;this.evidenceType='material_profile';this.stationId=data.stationId||config.stationId||'trace_1';
    this.caseKey=data.caseKey??null;this.cityId=data.cityId??null;this.materialReport=profile;
    this.materialConfig={...config,attribute:'material_profile',evidenceType:'material_profile',correctValue:value,thief_value:value,
      minigame:'MaterialAnalysisScene',label:'Material Analysis',clueType:'trace',clueText:config.clueText||profile.labText,isRedHerring:false};
    this.clue={id:config.id||`trace_${value}`,type:'trace',text:this.materialConfig.clueText,
      facts:{material:profile.material,...(value==='wool_lanolin'?{lanolinDetected:true}:{})}};
  }
  create(){if(!this.materialConfig)throw new Error('Material analysis needs evidence configuration.');super.create();}
  async showIntro(){
    const terminal=this.term,session=this._fiberSession;
    const printed=await this.printLines(session,terminal,[
      ['> MATERIAL SAMPLE LOADED. DO NOT SNEEZE.'],
      ['> REPEAT THE REAGENT SEQUENCE EXACTLY.'],
      ['> THE MACHINE HAS A MEMORY. IT EXPECTS YOU TO HAVE ONE TOO.',{color:TERM.amber}]
    ]);
    if(printed&&!this.finished)this.showReadyScreen();
  }
  showReadyScreen(){
    const session=this._fiberSession;
    if(!this.isCurrentSession(session)||this.finished||this.gameStarted||this.readyOverlay)return;
    const{width,height}=this.scale;
    const w=Math.min(width-24,760),h=Math.min(height-24,390),cx=width/2,cy=height/2;
    this.readyOverlay=this.add.rectangle(0,0,width,height,0x000000,.9).setOrigin(0,0).setDepth(5000).setInteractive();
    this.readyOverlay.on('pointerdown',(p,x,y,event)=>event?.stopPropagation());
    const panel=this.add.rectangle(cx,cy,w,h,0x111827,1).setStrokeStyle(3,0x7df9ff).setDepth(5001);
    const title=this.add.text(cx,cy-h/2+34,'MATERIAL IDENTIFICATION PROTOCOL',{
      fontFamily:'PressStart2P',fontSize:width<=700?'11px':'15px',color:'#7df9ff',align:'center',wordWrap:{width:w-32,useAdvancedWrap:true}
    }).setOrigin(.5).setDepth(5002);
    const briefing=this.add.text(cx,cy-10,'Watch the scanner.\nRepeat the colour sequence.\n\nIdentify the material.\nLeave the accusations to the detective.',{
      fontFamily:'SpecialElite',fontSize:width<=700?'20px':'24px',color:'#fff4c7',align:'center',wordWrap:{width:w-40,useAdvancedWrap:true}
    }).setOrigin(.5).setDepth(5002);
    const scale=Math.min(1,(h-150)/Math.max(1,briefing.height));briefing.setScale(scale);
    const start=this.add.text(cx,cy+h/2-40,'[ I AM FOCUSED ]',{
      fontFamily:'PressStart2P',fontSize:'11px',color:'#39ff14',backgroundColor:'#000000',padding:{left:12,right:12,top:12,bottom:12}
    }).setOrigin(.5).setDepth(5002).setInteractive({useHandCursor:true});
    this.readyObjects=[this.readyOverlay,panel,title,briefing,start];
    start.on('pointerdown',(p,x,y,event)=>{
      event?.stopPropagation();if(!this.isCurrentSession(session)||this.gameStarted||this.finished)return;
      this.gameStarted=true;start.disableInteractive();this.clearReadyScreen();this.startedAt=this.time.now;this.startRound();
    });
  }
  getSecondsElapsed(){return this.materialSeconds??super.getSecondsElapsed();}
  async finishAnalysis(){
    const terminal=this.term,session=this._fiberSession;if(this.finished||!this.isCurrentSession(session,terminal))return;
    this.materialSeconds=super.getSecondsElapsed();this.finished=true;this.accepting=false;
    this.settlePlayback(false);this.cancelCall(this.nextRoundEvent);this.nextRoundEvent=null;
    const bonus=this.getTimeBonus();this.score=Math.min(120,this.score+bonus);this.disablePads();
    if(!await this.terminalAction(session,terminal,()=>terminal.progress('MATERIAL ANALYSIS',1800)))return;
    const lines=[[`> RESULT: ${this.materialReport.label.toUpperCase()}.`],[`> ${this.materialReport.labText}`],
      ...(this.materialConfig.sourceText?[[`> ${this.materialConfig.sourceText}`]]:[]),
      ['> THE MACHINE HAS IDENTIFIED THE MATERIAL. DETECTIVE WORK SOLD SEPARATELY.',{color:TERM.amber}]];
    if(bonus>0)lines.push([`> SPEED BONUS: +${bonus} PTS.`,{color:TERM.amber}]);lines.push(['> CLUE READY FOR CASE FILE.',{color:TERM.amber}]);
    if(!await this.printLines(session,terminal,lines))return;
    terminal.button('ADD TO CASE FILE',TERM.green,()=>{if(this.isCurrentSession(session,terminal))this.returnResultToCrimeLab();});
  }
  returnResultToCrimeLab(){
    if(this.returningToLab||this._fiberDisposed||!this.finished)return;this.returningToLab=true;
    const payload={aborted:false,completed:true,stationId:this.stationId,caseKey:this.caseKey,cityId:this.cityId,
      evidenceType:'material_profile',evidenceConfig:this.materialConfig,correctValue:this.correctValue,value:this.correctValue,
      result:this.correctValue,selectedValue:this.correctValue,clueType:'trace',clueText:this.clue.text,label:'Material Analysis',
      isValuable:false,score:this.score,mistakes:this.mistakes,secondsElapsed:this.getSecondsElapsed(),clue:this.clue,
      sourceConfirmed:this.materialConfig.sourceConfirmed===true,sourceText:this.materialConfig.sourceText||''};
    this.events.emit('minigame-complete',payload);this.events.emit('minigame-closed',{aborted:false,payload});this.scene.stop();
  }
}
