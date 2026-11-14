import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { evaluateTypewriter } from './archive/TypewriterComparisonModel.js';
import { TypewriterHelpController } from './archive/TypewriterHelpController.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { preloadTypewriterAudio,playTypewriterAudio,stopTypewriterAudio } from './archive/TypewriterComparisonAudio.js';
const DATA=await loadJson('../assets/data/typewriterComparison.json',import.meta.url);
const KEY='insurance_typewriter_comparison',FLAG='insurance_typewriter_mismatch_found';
const XP_REWARD_ID='story_puzzle_small',XP_EVENT_ID=JSON.stringify(['reward',XP_REWARD_ID,KEY]);
const GLYPHS={
 e:['00000','01110','10001','11111','10000','01110','00000'],
 a:['00000','01110','00001','01111','10001','01111','00000'],
 R:['11110','10001','10001','11110','10100','10010','10001'],
 t:['00100','00100','11111','00100','00100','00011','00000'],
 o:['00000','01110','10001','10001','10001','01110','00000'],
 n:['00000','10110','11001','10001','10001','10001','00000']
};
export class TypewriterComparisonScene extends BaseScene{
 constructor(){super({key:'TypewriterComparisonScene'});}
 init(data={}){
  this.preview=data.preview!==false;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
  this.selected=new Set();this.characters=[];this.textureKeys=[];this.checks=0;this.finished=false;this.closing=false;this.checking=false;
  this.layerStates=[];this.parentPausedByMe=false;this.savedOk=null;this.xpGranted=0;this.help=null;
  this.caseKey='holly_missing_husband';this.stationId='insurance_typewriter_comparison';this.evidenceConfig={id:KEY};
 }
 preload(){preloadTypewriterAudio(this);}
 create(){
  super.create();
  if(!this.preview){
   const saved=MainStoryManager.getSideClue(KEY);
   if(Array.isArray(saved?.selected))this.selected=new Set(saved.selected.filter(id=>DATA.characters.some(item=>item.id===id)));
   this.checks=Number.isInteger(saved?.checks)&&saved.checks>=0?saved.checks:0;
   this.finished=MainStoryManager.hasFlag(FLAG);if(this.finished)this.selected=new Set(DATA.correctIds);
  }
  this.cameras.main.setBackgroundColor('#111b16');this.root=this.add.container(0,0);
  this.root.add(this.add.rectangle(720,500,1440,1000,0x17271f));
  this.label(720,42,DATA.title,26,'#ffb347','PressStart2P');this.label(720,90,DATA.intro,22);
  this.root.add(this.add.rectangle(720,182,1350,126,0xe4d5b5).setStrokeStyle(3,0x99815b));
  this.label(720,149,__dialogueText("scenes/TypewriterComparisonScene.js", "t_f007b7845b0b086dd06e"),24,'#40372c');
  this.label(720,187,__dialogueText("scenes/TypewriterComparisonScene.js", "t_315e737fb271381cc0fd"),23,'#40372c');
  this.label(720,220,__dialogueText("scenes/TypewriterComparisonScene.js", "t_353ab0f05719330d010e"),20,'#715c43');
  this.count=this.label(720,280,'',21,'#cbdcbf');
  Phaser.Utils.Array.Shuffle([...DATA.characters]).forEach((item,index)=>this.buildCharacter(item,index));
  this.message=this.label(720,792,__dialogueText("scenes/TypewriterComparisonScene.js", "t_8aea5bfb0837e2e2cddc"),22);this.message.setWordWrapWidth(1310);
  this.detail=this.label(720,860,__dialogueText("scenes/TypewriterComparisonScene.js", "t_3221d4d19d6fd8aa84e9"),18,'#b8a487');
  this.checkButton=this.button(260,946,__dialogueText("scenes/TypewriterComparisonScene.js", "t_b9618544481b03fa6f70"),()=>this.checkComparison());
  this.button(1240,946,'BACK',()=>this.closeComparison());
  this.help=new TypewriterHelpController(this);this.help.create();
  this.mode=this.label(625,946,this.preview?'PREVIEW':'STORY',17,'#b8a487');
  this.refresh();this.layout();if(this.finished)this.showSuccess();
  this.trackInputEvent(this.scale,'resize',this.layout);this.suspendBackground();
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   stopTypewriterAudio(this);
   this.characters.forEach(item=>item.container.destroy());this.characters=[];
   this.textureKeys.forEach(key=>{if(this.textures.exists(key))this.textures.remove(key);});this.textureKeys=[];
   this.restoreBackground();this.onFinished=null;
  });
 }
 label(x,y,text,size=22,color='#e9dfc8',font='SpecialElite'){
  const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1330}}).setOrigin(.5);this.root.add(object);return object;
 }
 button(x,y,text,callback){
  const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'21px',color:'#ffdda1',backgroundColor:'#344332',padding:{x:18,y:12}}).setOrigin(.5).setInteractive({useHandCursor:true});
  object.on('pointerdown',()=>{if(!this.closing&&!this.checking)callback();});this.root.add(object);return object;
 }
 makeSample(item,questioned){
  const key=`typewriter-${item.id}-${questioned}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const texture=this.textures.createCanvas(key,170,150),c=texture.getContext();
  c.fillStyle='#ebdfc4';c.fillRect(0,0,170,150);
  for(let i=0;i<480;i++){c.fillStyle=i%2?__dialogueText("scenes/TypewriterComparisonScene.js", "t_b0b4b9f880285cbd1898"):__dialogueText("scenes/TypewriterComparisonScene.js", "t_40787498f88ffbcc4a3f");c.fillRect((i*37)%170,(i*71)%150,1,1);}
  c.strokeStyle='#948773';c.lineWidth=1;c.setLineDash([4,4]);c.beginPath();c.moveTo(9,115);c.lineTo(161,115);c.stroke();c.setLineDash([]);
  const grid=GLYPHS[item.id].map(row=>row.split(''));
  if(questioned&&item.defect==='broken_bar')grid[3][2]='0';
  if(questioned&&item.defect==='missing_leg'){grid[5][3]='0';grid[6][4]='0';}
  const offset=questioned&&item.defect==='low_baseline'?12:0;
  const alpha=questioned&&item.defect==='light_ink' ? 0.48:questioned&&item.defect==='dark_ink' ? 0.99 : 0.8;
  c.fillStyle=`rgba(48,41,32,${alpha})`;
  grid.forEach((row,y)=>row.forEach((cell,x)=>{if(cell==='1')c.fillRect(55+x*12,31+y*12+offset,12,12);}));
  texture.refresh();this.textureKeys.push(key);return key;
 }
 buildCharacter(item,index){
  const container=this.add.container(130+index*236,519);
  const box=this.add.rectangle(0,0,220,408,0xd2c3a3).setStrokeStyle(2,0x8f7856).setInteractive({useHandCursor:true});
  const title=this.add.text(0,-180,`${__dialogueText("scenes/TypewriterComparisonScene.js", "t_971fe722bd7075a87481")}${item.label}`,{fontFamily:'SpecialElite, monospace',fontSize:'22px',color:'#493a2b'}).setOrigin(.5);
  const reference=this.add.image(0,-73,this.makeSample(item,false)),suspect=this.add.image(0,112,this.makeSample(item,true));
  const refLabel=this.add.text(0,-155,__dialogueText("scenes/TypewriterComparisonScene.js", "t_30e7e41efab31a8beaa5"),{fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#68543c'}).setOrigin(.5);
  const qLabel=this.add.text(0,27,__dialogueText("scenes/TypewriterComparisonScene.js", "t_06e3558da2f0e3a20f3a"),{fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#68543c'}).setOrigin(.5);
  container.add([box,title,refLabel,reference,qLabel,suspect]);this.root.add(container);
  box.on('pointerdown',()=>{
   if(this.finished||this.closing||this.checking)return;
   if(this.selected.has(item.id))this.selected.delete(item.id);else this.selected.add(item.id);
   playTypewriterAudio(this,'click');
   const status=this.selected.has(item.id)?__dialogueText("scenes/TypewriterComparisonScene.js", "t_557f603907b129c5b5df"):'unmarked';
   this.message.setText(`${__dialogueText("scenes/TypewriterComparisonScene.js", "t_a71be3b2e2d552a460d1")}${item.label}${__dialogueText("scenes/TypewriterComparisonScene.js", "t_45822f54a0d0e030f756")}${status}${__dialogueText("scenes/TypewriterComparisonScene.js", "t_2c935c7c9b8f1e94aae7")}`).setFontSize(21);
   this.refresh();this.persist();
  });this.characters.push({id:item.id,container,box});
 }
 refresh(){
  this.count.setText(`${__dialogueText("scenes/TypewriterComparisonScene.js", "t_24526e08985e4d0eeaad")}${this.selected.size}${__dialogueText("scenes/TypewriterComparisonScene.js", "t_005e1574a2b5c8163046")}${DATA.correctIds.length}`);
  this.characters.forEach(item=>{const selected=this.selected.has(item.id);item.box.setStrokeStyle(selected?4:2,selected?0xc58035:0x8f7856);});
 }
 getForensicHelp(){
  const instructions=__dialogueText("scenes/TypewriterComparisonScene.js", "t_f797b0dad27234059df1");
  const wrong=DATA.characters.find(item=>this.selected.has(item.id)&&!DATA.correctIds.includes(item.id));
  if(wrong)return{id:`exclude_${wrong.id}`,instructions,text:wrong.hint,targets:[this.characters.find(item=>item.id===wrong.id)?.box].filter(Boolean)};
  const next=DATA.characters.find(item=>DATA.correctIds.includes(item.id)&&!this.selected.has(item.id));
  if(next)return{id:`find_${next.id}`,instructions,text:next.hint,targets:[this.characters.find(item=>item.id===next.id)?.box].filter(Boolean)};
  return{id:'ready_to_check',instructions,text:__dialogueText("scenes/TypewriterComparisonScene.js", "t_58d5ce15d4b59d46d326"),targets:[this.checkButton]};
 }
 setDialogue(text){this.message.setText(`${__dialogueText("scenes/TypewriterComparisonScene.js", "t_e0e94082545fdad681ba")}${text}`).setFontSize(19);}
 persist(){
  if(this.preview)return;
  MainStoryManager.setSideClue(KEY,{version:1,selected:[...this.selected],checks:this.checks,completed:this.finished,originalAmount:null,author:null});
  if(this.finished)MainStoryManager.setFlag(FLAG,true);
  try{this.savedOk=saveGameState();}catch(error){this.savedOk=false;console.error('[TypewriterComparison] Save failed:',error);}
 }
 grantCompletionXP(){
  let result;
  try{result=progressionManager.grantReward(XP_REWARD_ID,KEY,__dialogueText("scenes/TypewriterComparisonScene.js", "t_6abe6e8838bf1d06b7a9"));}
  catch(error){
   if(!progressionManager.hasReward(XP_EVENT_ID))throw error;
   console.error('[TypewriterComparison] Reward recorded, but grantReward threw:',error);result={success:false,reason:'already_granted'};
  }
  if(!result.success&&result.reason!=='already_granted')throw new Error(`XP settlement failed: ${result.reason||'unknown_error'}`);
  if(!progressionManager.hasReward(XP_EVENT_ID))throw new Error('The typewriter comparison XP reward was not recorded.');
  return result.success?result.grantedXP:0;
 }
 checkComparison(){
  if(this.finished||this.closing||this.checking)return;
  this.checks+=1;const result=evaluateTypewriter(DATA,[...this.selected]);this.message.setText(result.message).setFontSize(21);
  if(!result.ok){this.persist();playTypewriterAudio(this,'wrong');return;}
  this.checking=true;
  try{
   if(!this.preview){
    try{this.xpGranted=this.grantCompletionXP();}
    catch(error){console.error('[TypewriterComparison] XP settlement failed:',error);this.message.setText(__dialogueText("scenes/TypewriterComparisonScene.js", "t_1da09d4cd747b06b264a")).setFontSize(21);return;}
   }
   this.finished=true;this.persist();this.showSuccess();playTypewriterAudio(this,'success');
   if(!this.preview)this.emitBus('mainStory:typewriterMismatchFound',{flag:FLAG});
  }finally{this.checking=false;}
 }
 showSuccess(){
  this.checkButton.setVisible(false);this.help?.hintButton?.setVisible(false);this.characters.forEach(item=>item.box.disableInteractive());
  this.message.setText(DATA.success).setFontSize(20);
  if(this.preview)this.detail.setText(__dialogueText("scenes/TypewriterComparisonScene.js", "t_a9bfefbb315906852869"));
  else{
   const xpText=this.xpGranted>0?`${__dialogueText("scenes/TypewriterComparisonScene.js", "t_c13f23cc27f966a4eadf")}${this.xpGranted}${__dialogueText("scenes/TypewriterComparisonScene.js", "t_a73feda6e2f76a6b740b")}`:'';
   this.detail.setText(this.savedOk===false?__dialogueText("scenes/TypewriterComparisonScene.js", "t_f26a5c9f1bd10efaf735")+xpText:__dialogueText("scenes/TypewriterComparisonScene.js", "t_216e505c95d7f75580d6")+xpText);
  }this.refresh();
 }
 layout(){
  if(!this.root)return;const{width,height}=this.scale,scale=Math.min(width/1440,height/1000);
  this.root.setScale(scale).setPosition((width-1440*scale)/2,(height-1000*scale)/2);
 }
 suspendBackground(){
  this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{
   const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};
  });
  if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
 }
 restoreBackground(){
  for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
  this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
 }
 closeComparison(){
  if(this.closing||this.checking)return;this.closing=true;stopTypewriterAudio(this);this.help?.close();this.persist();
  const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
  try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
 }
}
