import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { evaluateOfficeDust } from './archive/OfficeDustModel.js';
import { OfficeDustHelpController } from './archive/OfficeDustHelpController.js';

const DATA=await loadJson('../assets/data/officeDustPuzzle.json',import.meta.url);
const STATE_KEY='chapter_two_office_dust';
const FLAG='office_dust_reconstructed';

export class OfficeDustScene extends BaseScene {
  constructor(){super({key:'OfficeDustScene'});}
  init(data={}){
    this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;
    this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.placements={};this.missingTrace=null;this.selectedObject=null;this.selectedTrace=null;
    this.objects=[];this.traces=[];this.finished=false;this.closing=false;this.checks=0;
    this.layerStates=[];this.parentPausedByMe=false;this.savedOk=null;
    this.caseKey='holly_missing_husband';this.stationId='chapter_two_office_dust';this.evidenceConfig={id:STATE_KEY};
  }
  create(){
    super.create();
    if(!this.preview){
      const saved=MainStoryManager.getSideClue(STATE_KEY);const seen=new Set();
      for(const trace of DATA.traces){
        const id=saved?.placements?.[trace.id];
        if(DATA.objects.some(item=>item.id===id)&&!seen.has(id)){this.placements[trace.id]=id;seen.add(id);}
      }
      if(DATA.traces.some(trace=>trace.id===saved?.missingTrace))this.missingTrace=saved.missingTrace;
      this.checks=Number.isInteger(saved?.checks)&&saved.checks>=0?saved.checks:0;
      this.finished=MainStoryManager.hasFlag(FLAG);
      if(this.finished){
        this.placements=Object.fromEntries(DATA.traces.filter(trace=>trace.objectId).map(trace=>[trace.id,trace.objectId]));
        this.missingTrace=DATA.traces.find(trace=>!trace.objectId).id;
      }
    }
    this.cameras.main.setBackgroundColor('#171619');this.root=this.add.container(0,0);
    this.root.add(this.add.rectangle(720,510,1440,1020,0x302729));
    this.label(720,44,DATA.title,20,'#f0ce88','PressStart2P');
    this.label(720,90,'Select an object, then its dust footprint. All footprints show top-down views.',23);
    this.label(720,128,'After placing everything, select the unmatched footprint and mark it MISSING.',21,'#c5b59a');
    this.label(235,183,'MOVED OBJECTS',21);this.label(920,183,'THE DESK / OLD POSITIONS',21);
    this.root.add(this.add.rectangle(915,475,935,535,0x594333).setStrokeStyle(4,0x96704b));
    DATA.objects.forEach((object,index)=>this.buildObject(object,index));
    DATA.traces.forEach((trace,index)=>this.buildTrace(trace,index));
    this.message=this.label(720,815,'The dust remembers where things stood. It does not identify the visitor.',22);
    this.button(390,884,'MARK SELECTED TRACE MISSING',()=>this.markMissing());
    this.clearButton=this.button(1035,884,'CLEAR SELECTED TRACE',()=>this.clearTrace());
    this.checkButton=this.button(245,972,'CHECK DESK',()=>this.checkDesk());
    this.button(1250,972,'BACK',()=>this.closeDesk());
    this.help=new OfficeDustHelpController(this);this.help.create();
    this.mode=this.label(625,972,this.preview?'PREVIEW / no inventory changes':'STORY',16,'#baa98e');
    this.refreshDesk();this.layout();if(this.finished)this.showSuccess();
    this.trackInputEvent(this.scale,'resize',this.layout);this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restoreBackground();this.onFinished=null;});
  }
  label(x,y,text,size=21,color='#e9dfc8',font='SpecialElite'){
    const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1320}}).setOrigin(0.5);
    this.root.add(object);return object;
  }
  button(x,y,text,callback){
    const button=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#f1d89d',backgroundColor:'#4a3933',padding:{x:17,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    button.on('pointerdown',()=>{if(!this.closing)callback();});this.root.add(button);return button;
  }
  drawShape(graphics,shape,outline){
    const fill=outline?0xbda57e:0x7f9a9b,ink=outline?0xd9c6a1:0x26373c;
    graphics.fillStyle(fill,outline?0.48:1);graphics.lineStyle(3,ink,1);
    const rect=(x,y,w,h)=>{graphics.fillRect(x,y,w,h);graphics.strokeRect(x,y,w,h);};
    if(shape==='mug'){
      graphics.fillCircle(-10,0,32);graphics.strokeCircle(-10,0,32);
      graphics.strokeRoundedRect(17,-16,24,32,6);
      if(!outline){graphics.fillStyle(0x51372b);graphics.fillCircle(-10,0,23);}
    }else if(shape==='book'){
      rect(-57,-36,114,72);graphics.lineBetween(-44,-36,-44,36);
      graphics.lineBetween(-30,-14,35,-14);graphics.lineBetween(-30,0,20,0);
    }else if(shape==='stapler'){
      rect(-57,-14,114,28);rect(-48,-19,84,12);graphics.lineBetween(-44,10,42,10);
    }else if(shape==='lamp'){
      graphics.fillEllipse(0,0,116,72);graphics.strokeEllipse(0,0,116,72);
      graphics.lineBetween(-10,0,34,-31);graphics.strokeCircle(-10,0,11);
    }else{
      rect(-37,-45,74,90);graphics.lineBetween(-37,-24,37,-24);
      graphics.lineBetween(-37,25,37,25);
    }
  }
  buildObject(object,index){
    const x=235,y=279+index*120;
    const box=this.add.rectangle(x,y,360,105,0xe2d4b6).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
    const icon=this.add.graphics({x:x-100,y:y});this.drawShape(icon,object.shape,false);icon.setScale(0.65);
    const text=this.add.text(x+55,y,object.label,{fontFamily:'SpecialElite, monospace',fontSize:'21px',color:'#413428',align:'center',wordWrap:{width:190}}).setOrigin(0.5);
    this.root.add([box,icon,text]);
    box.on('pointerdown',()=>{
      if(this.finished)return;this.selectedObject=this.selectedObject===object.id?null:object.id;this.selectedTrace=null;this.refreshDesk();
    });
    this.objects.push({id:object.id,box,icon,text});
  }
  buildTrace(trace,index){
    const positions=[[615,345],[915,345],[1215,345],[765,595],[1065,595]];
    const[x,y]=positions[index];
    const box=this.add.rectangle(x,y,246,205,0x604c3b).setStrokeStyle(2,0x8e7658).setInteractive({useHandCursor:true});
    const dust=this.add.graphics({x,y:y-12});this.drawShape(dust,trace.shape,true);
    const object=this.add.graphics({x,y:y-12});
    const title=this.add.text(x,y+77,trace.label,{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#e4d0aa',align:'center',wordWrap:{width:230}}).setOrigin(0.5);
    this.root.add([box,dust,object,title]);
    box.on('pointerdown',()=>{
      if(this.finished)return;this.selectedTrace=trace.id;
      if(this.selectedObject){
        const previous=Object.keys(this.placements).find(id=>this.placements[id]===this.selectedObject);
        const displaced=this.placements[trace.id];
        if(previous&&previous!==trace.id){
          if(displaced)this.placements[previous]=displaced;else delete this.placements[previous];
        }
        this.placements[trace.id]=this.selectedObject;this.selectedObject=null;
        if(this.missingTrace===trace.id)this.missingTrace=null;
        this.persist();
      }
      this.refreshDesk();
    });
    this.traces.push({id:trace.id,box,dust,object,title});
  }
  refreshDesk(){
    this.objects.forEach(object=>{
      object.box.setFillStyle(Object.values(this.placements).includes(object.id)?0xc2c8ae:0xe2d4b6);
      object.box.setStrokeStyle(this.selectedObject===object.id?4:2,this.selectedObject===object.id?0xe7ac48:0x9b8662);
    });
    this.traces.forEach(trace=>{
      trace.object.clear();const item=DATA.objects.find(object=>object.id===this.placements[trace.id]);
      if(item)this.drawShape(trace.object,item.shape,false);
      trace.dust.setAlpha(item?0.35:1);
      trace.box.setStrokeStyle(this.selectedTrace===trace.id||this.missingTrace===trace.id?4:2,this.missingTrace===trace.id?0xce7560:this.selectedTrace===trace.id?0xe7ac48:0x8e7658);
      trace.title.setText(this.missingTrace===trace.id?'MARKED: MISSING':item?item.label:DATA.traces.find(item=>item.id===trace.id).label);
    });
  }
  clearTrace(){
    if(this.finished||!this.selectedTrace)return;
    delete this.placements[this.selectedTrace];if(this.missingTrace===this.selectedTrace)this.missingTrace=null;
    this.refreshDesk();this.persist();
  }
  markMissing(){
    if(this.finished||!this.selectedTrace)return;
    if(this.placements[this.selectedTrace]){this.message.setText('That footprint contains an object. Select an empty footprint.');return;}
    this.missingTrace=this.selectedTrace;this.selectedObject=null;this.refreshDesk();this.persist();
  }
  getForensicHelp(){
    const instructions='Select an object, then its dust footprint. Match the outline and proportions. Place all four objects, select the remaining empty footprint, mark it MISSING, then CHECK DESK.';
    const wrong=DATA.traces.find(trace=>this.placements[trace.id]&&this.placements[trace.id]!==trace.objectId);
    if(wrong)return{id:`wrong_${wrong.id}`,instructions,text:'This object does not fit the selected footprint. Clear it. The mug has a handle; the lamp base is oval; the stapler is long and narrow; the notebook is a broad rectangle.',targets:[this.traces.find(trace=>trace.id===wrong.id)?.box].filter(Boolean)};
    const pending=DATA.objects.find(object=>!Object.values(this.placements).includes(object.id));
    if(pending){
      const target=DATA.traces.find(trace=>trace.objectId===pending.id);
      return{id:`place_${pending.id}`,instructions,text:`Match ${pending.label} to ${target.label}. Compare the shape rather than the current position.`,targets:[this.objects.find(item=>item.id===pending.id)?.box,this.traces.find(item=>item.id===target.id)?.box].filter(Boolean)};
    }
    const empty=DATA.traces.find(trace=>trace.objectId===null);
    return{id:'missing_footprint',instructions,text:'The four movable objects are accounted for. Select the remaining empty rectangular footprint and click MARK SELECTED TRACE MISSING. The footprint alone does not tell you what the missing object was.',targets:[this.traces.find(item=>item.id===empty.id)?.box].filter(Boolean)};
  }
  setDialogue(text){this.message.setText(`HINT: ${text}`).setFontSize(18);}
  persist(){
    if(this.preview)return;
    MainStoryManager.setSideClue(STATE_KEY,{version:1,placements:{...this.placements},missingTrace:this.missingTrace,checks:this.checks,completed:this.finished,missingObjectId:null});
    if(this.finished)MainStoryManager.setFlag(FLAG,true);this.savedOk=saveGameState();
  }
  checkDesk(){
    if(this.finished)return;this.checks+=1;
    const result=evaluateOfficeDust(DATA,this.placements,this.missingTrace);
    if(!result.ok){if(result.traceId)this.selectedTrace=result.traceId;this.refreshDesk();this.message.setText(result.message).setFontSize(22);this.persist();return;}
    this.finished=true;this.selectedObject=null;this.selectedTrace=null;this.persist();this.showSuccess();
    if(!this.preview)this.emitBus('mainStory:officeDustCompleted',{flag:FLAG,missingObjectId:null});
  }
  showSuccess(){
    this.checkButton.setVisible(false);this.clearButton.setVisible(false);this.help.hintButton?.setVisible(false);
    this.message.setText(DATA.success).setFontSize(20);
    this.mode.setText(this.preview?'PREVIEW COMPLETE':this.savedOk===false?'Save failed: save manually.':'Observation recorded.');this.refreshDesk();
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1440,height/1020);this.root.setScale(s).setPosition((width-1440*s)/2,(height-1020*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
  }
  closeDesk(){
    if(this.closing)return;this.closing=true;this.help?.close();this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
