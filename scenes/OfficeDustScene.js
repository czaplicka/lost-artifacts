import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { evaluateOfficeDust } from './archive/OfficeDustModel.js';
import { OfficeDustHelpController } from './archive/OfficeDustHelpController.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { preloadOfficeDustAudio,playOfficeDustAudio,stopOfficeDustAudio } from './archive/OfficeDustAudio.js';
const DATA=await loadJson('../assets/data/officeDustPuzzle.json',import.meta.url);
const STATE_KEY='chapter_two_office_dust',FLAG='office_dust_reconstructed';
const XP_REWARD_ID='story_puzzle_small',XP_EVENT_ID=JSON.stringify(['reward',XP_REWARD_ID,STATE_KEY]);
export class OfficeDustScene extends BaseScene{
 constructor(){super({key:'OfficeDustScene'});}
 init(data={}){
  this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
  this.placements={};this.missingTrace=null;this.selectedObject=null;this.selectedTrace=null;this.objects=[];this.traces=[];
  this.finished=false;this.closing=false;this.checking=false;this.checks=0;this.layerStates=[];this.parentPausedByMe=false;this.savedOk=null;this.xpGranted=0;this.help=null;
  this.caseKey='holly_missing_husband';this.stationId='chapter_two_office_dust';this.evidenceConfig={id:STATE_KEY};
 }
 preload(){preloadOfficeDustAudio(this);}
 create(){
  super.create();
  if(!this.preview){
   const saved=MainStoryManager.getSideClue(STATE_KEY),seen=new Set();
   for(const trace of DATA.traces){const id=saved?.placements?.[trace.id];if(DATA.objects.some(item=>item.id===id)&&!seen.has(id)){this.placements[trace.id]=id;seen.add(id);}}
   if(DATA.traces.some(trace=>trace.id===saved?.missingTrace))this.missingTrace=saved.missingTrace;
   this.checks=Number.isInteger(saved?.checks)&&saved.checks>=0?saved.checks:0;
   this.finished=MainStoryManager.hasFlag(FLAG);
   if(this.finished){this.placements=Object.fromEntries(DATA.traces.filter(trace=>trace.objectId).map(trace=>[trace.id,trace.objectId]));this.missingTrace=DATA.traces.find(trace=>!trace.objectId).id;}
  }
  this.cameras.main.setBackgroundColor('#171619');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,510,1440,1020,0x302729));
  this.label(720,44,DATA.title,20,'#f0ce88','PressStart2P');
  this.label(720,90,__dialogueText("scenes/OfficeDustScene.js", "t_918c2835963409e13673"),23);
  this.label(720,128,__dialogueText("scenes/OfficeDustScene.js", "t_7c2cffc318170752de04"),20,'#c5b59a');
  this.label(235,183,__dialogueText("scenes/OfficeDustScene.js", "t_417cdb3d4ac88a192c53"),21);this.label(920,183,__dialogueText("scenes/OfficeDustScene.js", "t_a2d1d2682a10ae13eda6"),21);
  this.root.add(this.add.rectangle(915,475,935,535,0x594333).setStrokeStyle(4,0x96704b));
  Phaser.Utils.Array.Shuffle([...DATA.objects]).forEach((object,index)=>this.buildObject(object,index));
  DATA.traces.forEach((trace,index)=>this.buildTrace(trace,index));
  this.message=this.label(720,815,__dialogueText("scenes/OfficeDustScene.js", "t_a71d5df6de6b602519d0"),22);
  this.missingButton=this.button(390,884,__dialogueText("scenes/OfficeDustScene.js", "t_d073627f6e1760e4db74"),()=>this.markMissing());
  this.clearButton=this.button(1035,884,__dialogueText("scenes/OfficeDustScene.js", "t_16ed5acf12fad6c026fb"),()=>this.clearTrace());
  this.checkButton=this.button(245,972,__dialogueText("scenes/OfficeDustScene.js", "t_6e6cd0d8f55af34ba1c3"),()=>this.checkDesk());this.button(1250,972,'BACK',()=>this.closeDesk());
  this.help=new OfficeDustHelpController(this);this.help.create();
  this.mode=this.label(625,972,this.preview?__dialogueText("scenes/OfficeDustScene.js", "t_123cdb99c2c73bc021fb"):'STORY',16,'#baa98e');
  this.refreshDesk();this.layout();if(this.finished)this.showSuccess();
  this.trackInputEvent(this.scale,'resize',this.layout);this.suspendBackground();
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{stopOfficeDustAudio(this);this.restoreBackground();this.onFinished=null;});
 }
 label(x,y,text,size=21,color='#e9dfc8',font='SpecialElite'){
  const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1320}}).setOrigin(.5);this.root.add(object);return object;
 }
 button(x,y,text,callback){
  const button=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#f1d89d',backgroundColor:'#4a3933',padding:{x:17,y:12}}).setOrigin(.5).setInteractive({useHandCursor:true});
  button.on('pointerdown',()=>{if(!this.closing&&!this.checking)callback();});this.root.add(button);return button;
 }
 drawDustTrace(graphics,shape){
  graphics.fillStyle(0xbda57e,.48);graphics.lineStyle(3,0xd9c6a1,1);
  const rect=(x,y,width,height)=>{graphics.fillRect(x,y,width,height);graphics.strokeRect(x,y,width,height);};
  if(shape==='mug'){graphics.fillCircle(-10,0,32);graphics.strokeCircle(-10,0,32);graphics.strokeRoundedRect(17,-16,24,32,6);}
  else if(shape==='book'){rect(-57,-36,114,72);graphics.lineBetween(-44,-36,-44,36);graphics.lineBetween(-30,-14,35,-14);graphics.lineBetween(-30,0,20,0);}
  else if(shape==='stapler'){rect(-57,-14,114,28);rect(-48,-19,84,12);graphics.lineBetween(-44,10,42,10);}
  else if(shape==='lamp'){graphics.fillEllipse(0,0,116,72);graphics.strokeEllipse(0,0,116,72);graphics.lineBetween(-10,0,34,-31);graphics.strokeCircle(-10,0,11);}
  else{rect(-37,-45,74,90);graphics.lineBetween(-37,-24,37,-24);graphics.lineBetween(-37,25,37,25);}
 }
 buildObject(object,index){
  const x=235,y=279+index*120;
  const box=this.add.rectangle(x,y,360,105,0xe2d4b6).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
  const text=this.add.text(x,y-8,object.label,{fontFamily:'SpecialElite, monospace',fontSize:'25px',color:'#413428',align:'center',wordWrap:{width:320}}).setOrigin(.5);
  const status=this.add.text(x,y+29,'',{fontFamily:'SpecialElite, monospace',fontSize:'15px',color:'#71634f',align:'center',wordWrap:{width:320}}).setOrigin(.5);
  this.root.add([box,text,status]);
  box.on('pointerdown',()=>{
   if(this.finished||this.closing||this.checking)return;
   this.selectedObject=this.selectedObject===object.id?null:object.id;this.selectedTrace=null;
   playOfficeDustAudio(this,'click');this.refreshDesk();
  });this.objects.push({id:object.id,box,text,status});
 }
 buildTrace(trace,index){
  const positions=[[615,345],[915,345],[1215,345],[765,595],[1065,595]],[x,y]=positions[index];
  const box=this.add.rectangle(x,y,246,205,0x604c3b).setStrokeStyle(2,0x8e7658).setInteractive({useHandCursor:true});
  const dust=this.add.graphics({x,y:y-12});this.drawDustTrace(dust,trace.shape);
  const title=this.add.text(x,y+77,trace.label,{fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#e4d0aa',align:'center',wordWrap:{width:230}}).setOrigin(.5);
  this.root.add([box,dust,title]);
  box.on('pointerdown',()=>{
   if(this.finished||this.closing||this.checking)return;
   const before=JSON.stringify([this.placements,this.missingTrace,this.selectedTrace,this.selectedObject]);
   this.selectedTrace=trace.id;
   if(this.selectedObject){
    const previous=Object.keys(this.placements).find(id=>this.placements[id]===this.selectedObject),displaced=this.placements[trace.id];
    if(previous&&previous!==trace.id){
     if(displaced)this.placements[previous]=displaced;else delete this.placements[previous];
     if(this.missingTrace===previous&&displaced)this.missingTrace=null;
    }
    this.placements[trace.id]=this.selectedObject;this.selectedObject=null;if(this.missingTrace===trace.id)this.missingTrace=null;this.persist();
   }
   if(JSON.stringify([this.placements,this.missingTrace,this.selectedTrace,this.selectedObject])!==before)playOfficeDustAudio(this,'click');
   this.refreshDesk();
  });this.traces.push({id:trace.id,box,dust,title});
 }
 refreshDesk(){
  this.objects.forEach(object=>{
   const traceId=Object.keys(this.placements).find(id=>this.placements[id]===object.id),trace=DATA.traces.find(item=>item.id===traceId),selected=this.selectedObject===object.id;
   object.box.setFillStyle(selected?0xf1dfb5:0xe2d4b6);object.box.setStrokeStyle(selected?4:2,selected?0xe7ac48:0x9b8662);
   object.status.setText(selected?__dialogueText("scenes/OfficeDustScene.js", "t_95f18192734b4fb0cbc5"):trace?`${__dialogueText("scenes/OfficeDustScene.js", "t_90b64ea6658ae0c48eab")}${trace.label}`:__dialogueText("scenes/OfficeDustScene.js", "t_0c50a7d15f1be9d2aff3"));
  });
  this.traces.forEach(trace=>{
   const item=DATA.objects.find(object=>object.id===this.placements[trace.id]),definition=DATA.traces.find(entry=>entry.id===trace.id);
   const selected=this.selectedTrace===trace.id,missing=this.missingTrace===trace.id;trace.dust.setAlpha(1);
   trace.box.setStrokeStyle(selected||missing?4:2,missing?0xce7560:selected?0xe7ac48:0x8e7658);
   trace.title.setText(`${definition.label}${__dialogueText("scenes/OfficeDustScene.js", "t_01ba4719c80b6fe911b0")}${missing?__dialogueText("scenes/OfficeDustScene.js", "t_ca9447fc7f45f26c9c14"):item?item.label:__dialogueText("scenes/OfficeDustScene.js", "t_433aa6d48c16e67a0b6d")}`);
  });
 }
 clearTrace(){
  if(this.finished||this.closing||this.checking||!this.selectedTrace)return;
  const changed=Boolean(this.placements[this.selectedTrace])||this.missingTrace===this.selectedTrace;
  delete this.placements[this.selectedTrace];if(this.missingTrace===this.selectedTrace)this.missingTrace=null;
  if(changed)playOfficeDustAudio(this,'click');this.refreshDesk();this.persist();
 }
 markMissing(){
  if(this.finished||this.closing||this.checking)return;
  if(!this.selectedTrace){this.message.setText(__dialogueText("scenes/OfficeDustScene.js", "t_eb7737d895501f002786"));return;}
  if(this.placements[this.selectedTrace]){this.message.setText(__dialogueText("scenes/OfficeDustScene.js", "t_a03b1d0d1e48753dcdcc"));return;}
  const changed=this.missingTrace!==this.selectedTrace||this.selectedObject!==null;
  this.missingTrace=this.selectedTrace;this.selectedObject=null;
  if(changed)playOfficeDustAudio(this,'click');this.refreshDesk();this.persist();
 }
 getForensicHelp(){
  const instructions=__dialogueText("scenes/OfficeDustScene.js", "t_7dbeb72b40b6f683af83");
  const wrong=DATA.traces.find(trace=>this.placements[trace.id]&&this.placements[trace.id]!==trace.objectId);
  if(wrong)return{id:`wrong_${wrong.id}`,instructions,text:__dialogueText("scenes/OfficeDustScene.js", "t_ea863170678fd94a4f0d"),targets:[this.traces.find(trace=>trace.id===wrong.id)?.box].filter(Boolean)};
  const pending=DATA.objects.find(object=>!Object.values(this.placements).includes(object.id));
  if(pending){
   const target=DATA.traces.find(trace=>trace.objectId===pending.id);
   return{id:`place_${pending.id}`,instructions,text:`${__dialogueText("scenes/OfficeDustScene.js", "t_f98025169f4a6789bf87")}${pending.label}${__dialogueText("scenes/OfficeDustScene.js", "t_87721689ee42f4415e4a")}${target.label}${__dialogueText("scenes/OfficeDustScene.js", "t_3850aeeaca0e2f226c85")}`,targets:[this.objects.find(item=>item.id===pending.id)?.box,this.traces.find(item=>item.id===target.id)?.box].filter(Boolean)};
  }
  const empty=DATA.traces.find(trace=>trace.objectId===null);
  return{id:'missing_footprint',instructions,text:__dialogueText("scenes/OfficeDustScene.js", "t_d9d405e236447b995095"),targets:[this.traces.find(item=>item.id===empty.id)?.box].filter(Boolean)};
 }
 setDialogue(text){this.message.setText(`${__dialogueText("scenes/OfficeDustScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(18);}
 persist(){
  if(this.preview)return;
  MainStoryManager.setSideClue(STATE_KEY,{version:1,placements:{...this.placements},missingTrace:this.missingTrace,checks:this.checks,completed:this.finished,missingObjectId:null});
  if(this.finished)MainStoryManager.setFlag(FLAG,true);
  try{this.savedOk=saveGameState();}catch(error){this.savedOk=false;console.error('[OfficeDust] Save failed:',error);}
 }
 grantCompletionXP(){
  let result;
  try{result=progressionManager.grantReward(XP_REWARD_ID,STATE_KEY,__dialogueText("scenes/OfficeDustScene.js", "t_0e06ce732c2e429508a0"));}
  catch(error){if(!progressionManager.hasReward(XP_EVENT_ID))throw error;console.error('[OfficeDust] Reward recorded, but grantReward threw:',error);result={success:false,reason:'already_granted'};}
  if(!result.success&&result.reason!=='already_granted')throw new Error(`XP settlement failed: ${result.reason||'unknown_error'}`);
  if(!progressionManager.hasReward(XP_EVENT_ID))throw new Error('The office dust XP reward was not recorded.');return result.success?result.grantedXP:0;
 }
 checkDesk(){
  if(this.finished||this.closing||this.checking)return;
  this.checks+=1;const result=evaluateOfficeDust(DATA,this.placements,this.missingTrace);
  if(!result.ok){
   if(result.traceId)this.selectedTrace=result.traceId;this.refreshDesk();this.message.setText(result.message).setFontSize(22);this.persist();playOfficeDustAudio(this,'wrong');return;
  }
  this.checking=true;
  try{
   if(!this.preview){
    try{this.xpGranted=this.grantCompletionXP();}
    catch(error){console.error('[OfficeDust] XP settlement failed:',error);this.message.setText(__dialogueText("scenes/OfficeDustScene.js", "t_897bbe8dfb407e12712c")).setFontSize(22);return;}
   }
   this.finished=true;this.selectedObject=null;this.selectedTrace=null;this.persist();this.showSuccess();playOfficeDustAudio(this,'success');
   if(!this.preview)this.emitBus('mainStory:officeDustCompleted',{flag:FLAG,missingObjectId:null});
  }finally{this.checking=false;}
 }
 showSuccess(){
  this.checkButton.setVisible(false);this.clearButton.setVisible(false);this.missingButton.setVisible(false);this.help?.hintButton?.setVisible(false);
  this.message.setText(DATA.success).setFontSize(20);
  if(this.preview)this.mode.setText(__dialogueText("scenes/OfficeDustScene.js", "t_da833d9e9d2d0546179e"));
  else{const xpText=this.xpGranted>0?`${__dialogueText("scenes/OfficeDustScene.js", "t_c13f23cc27f966a4eadf")}${this.xpGranted}${__dialogueText("scenes/OfficeDustScene.js", "t_a73feda6e2f76a6b740b")}`:'';this.mode.setText(this.savedOk===false?__dialogueText("scenes/OfficeDustScene.js", "t_1b607af4b610e36cc97c")+xpText:__dialogueText("scenes/OfficeDustScene.js", "t_8b406c33b9a7be5fe687")+xpText);}
  this.refreshDesk();
 }
 layout(){if(!this.root)return;const{width,height}=this.scale,scale=Math.min(width/1440,height/1020);this.root.setScale(scale).setPosition((width-1440*scale)/2,(height-1020*scale)/2);}
 suspendBackground(){
  this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
  if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
 }
 restoreBackground(){
  for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
  this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
 }
 closeDesk(){
  if(this.closing||this.checking)return;this.closing=true;stopOfficeDustAudio(this);this.help?.close();this.persist();
  const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
  try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
 }
}
