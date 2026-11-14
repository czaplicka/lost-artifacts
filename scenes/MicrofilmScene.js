import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { storageRoomDialogues as DIALOGUES } from '../storageRoomDialogueService.js';
import { BaseScene } from './BaseScene.js';
import { microfilmData as DATA,getMicrofilmStory,storeMicrofilm } from '../johnMicrofilmService.js';
import { normalizeMicrofilm,receiveMicrofilm,microfilmAligned,microfilmFocused,markMicrofilmDifference,chooseMicrofilmCity } from './archive/MicrofilmModel.js';
import { preloadReaderAudio,playReaderAudio } from './archive/ReaderAudio.js';
import { preloadMicrofilmTransport,playMicrofilmTransport,stopMicrofilmTransport } from './archive/MicrofilmTransportAudio.js';
export class MicrofilmScene extends BaseScene{
 constructor(){super({key:'MicrofilmScene'});}
 init(data={}){this.preview=data.preview===true;this.mode=data.mode==='receive'?'receive':'compare';this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;this.progress=null;this.closing=false;this.savedOk=null;this.lockUntil=0;this.message='';this.activeReel='left';this.layers=[];this.parentPaused=false;}
 preload(){preloadReaderAudio(this,['click','evidence','success']);preloadMicrofilmTransport(this);}
 create(){
  super.create();const story=getMicrofilmStory();this.allowed=this.preview||(story.eligible&&(this.mode==='receive'||story.copyReceived));this.progress=normalizeMicrofilm(DATA,this.preview?null:story);if(this.preview&&this.mode==='compare')this.progress.copyReceived=true;
  this.cameras.main.setBackgroundColor('#101811');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(800,500,1600,1000,0x19291f));
  this.text(740,50,this.mode==='receive'?__dialogueText("scenes/MicrofilmScene.js", "t_f8b8a41bd97be4f50f1e"):__dialogueText("scenes/MicrofilmScene.js", "t_a66193a27d70843be3f2"),25,1300,'#f0d091',this.root,'PressStart2P');this.button(1450,50,__dialogueText("scenes/MicrofilmScene.js", "t_a31e9f98f863454d2602"),()=>this.closeVisit(),this.root);
  this.content=this.add.container(0,0);this.root.add(this.content);this.render();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',e=>{
   if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code===__dialogueText("scenes/MicrofilmScene.js", "t_037c968467aa3fd7c059")){e.preventDefault();this.closeVisit();return;}if(!this.allowed||this.mode!=='compare'||this.progress.completed)return;
   if(e.code===__dialogueText("scenes/MicrofilmScene.js", "t_90ddf1963abb36c9921c")){e.preventDefault();this.activeReel=this.activeReel==='left'?'right':'left';this.render();return;}
   if(['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();this.moveReel(this.activeReel,e.code==='ArrowLeft'?-1:1);}
  });
  this.suspend();this.events.once('shutdown',()=>{stopMicrofilmTransport(this);this.restore();this.onFinished=null;});
 }
 text(x,y,value,size=25,width=1400,color='#eee0bf',parent=this.content,font='SpecialElite'){const t=this.add.text(x,y,value,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:6}).setOrigin(.5);parent.add(t);return t;}
 button(x,y,value,callback,parent=this.content){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:'23px',color:'#ffe2ae',backgroundColor:'#36513d',padding:{x:16,y:11}}).setOrigin(.5).setInteractive({useHandCursor:true});t.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation();if(!this.closing&&this.time.now>=this.lockUntil){this.lockUntil=this.time.now+140;callback();}});parent.add(t);return t;}
 persist(){if(this.preview)return true;if(!this.allowed)return false;const result=storeMicrofilm(this.progress);this.savedOk=result.saved;if(!result.success)this.message=__dialogueText("scenes/MicrofilmScene.js", "t_4df945541fa084b296ef");return result.success;}
 render(){
  this.content.removeAll(true);
  if(!this.allowed){this.text(800,460,__dialogueText("scenes/MicrofilmScene.js", "t_31e96044efbec19a1d71"),29);return;}
  if(this.mode==='receive'){
   this.text(800,260,__dialogueText("scenes/MicrofilmScene.js", "t_54852f7a3d22807c3cd1"),29,1200,'#f0d091');
   this.text(800,470,this.progress.copyReceived?DIALOGUES.microfilm.received:DATA.intro[this.progress.introLine],31,1340);
   this.button(800,760,this.progress.copyReceived?__dialogueText("scenes/MicrofilmScene.js", "t_acbd88a81a5caacdc5b8"):this.progress.introLine===DATA.intro.length-1?__dialogueText("scenes/MicrofilmScene.js", "t_ab1ba57ba08cd8180819"):'CONTINUE',()=>{
    if(this.progress.copyReceived){this.closeVisit();return;}this.advanceReceipt();
   });this.footer();return;
  }
  if(this.progress.completed){this.text(800,270,__dialogueText("scenes/MicrofilmScene.js", "t_36bc87daa47d3ed96e15"),32,1300,'#f0d091');this.text(800,465,DATA.success,31,1320);this.text(800,655,__dialogueText("scenes/MicrofilmScene.js", "t_63bb355d1a58f0d7ada0"),27);this.button(800,810,__dialogueText("scenes/MicrofilmScene.js", "t_23ed4bfb47639cd1866b"),()=>this.closeVisit());this.footer();return;}
  this.text(800,115,__dialogueText("scenes/MicrofilmScene.js", "t_bc96ed2c380646dac907"),22);
  this.drawFrame('left',430,DATA.leftFrames[this.progress.left],this.progress.left,DATA.leftFrames.length);
  this.drawFrame('right',1170,DATA.rightFrames[this.progress.right],this.progress.right,DATA.rightFrames.length);
  this.button(200,745,__dialogueText("scenes/MicrofilmScene.js", "t_5232601d2fc57152e2b6"),()=>this.moveReel('left',-1));this.button(650,745,__dialogueText("scenes/MicrofilmScene.js", "t_3534ecae490921758cb2"),()=>this.moveReel('left',1));this.button(940,745,__dialogueText("scenes/MicrofilmScene.js", "t_08fc9a0a091d6adf4c01"),()=>this.moveReel('right',-1));this.button(1400,745,__dialogueText("scenes/MicrofilmScene.js", "t_f45ec974ade4f296920e"),()=>this.moveReel('right',1));
  this.button(380,825,__dialogueText("scenes/MicrofilmScene.js", "t_31db3d45f386fa107b6e"),()=>this.changeFocus(-.1));this.text(800,823,`${__dialogueText("scenes/MicrofilmScene.js", "t_076256bbd3dd4d1b47ce")}${Math.round(this.progress.focus*100)}${__dialogueText("scenes/MicrofilmScene.js", "t_85f76cc69cfab7e1dc11")}${microfilmFocused(DATA,this.progress)?'READABLE':'ADJUST'}`,23);
  this.button(1220,825,__dialogueText("scenes/MicrofilmScene.js", "t_43bfd0dc534f3c1015d1"),()=>this.changeFocus(.1));this.button(800,880,__dialogueText("scenes/MicrofilmScene.js", "t_bc4edcba87e4cfa50569"),()=>this.autoFocus());
  if(DATA.differenceFields.every(k=>this.progress.differences.includes(k))){DATA.destinations.forEach((d,i)=>this.button(370+i*430,930,d.label,()=>this.chooseCity(d.id)));}
  else this.text(800,930,this.message||`${__dialogueText("scenes/MicrofilmScene.js", "t_bf4c120babea31073da3")}${this.progress.differences.length}${__dialogueText("scenes/MicrofilmScene.js", "t_5ae60b97f457e43ed6f0")}`,21);
  this.footer();
 }
 footer(){const feedback=!this.progress.completed&&this.message?this.message:'';this.text(800,979,feedback?((this.preview?__dialogueText("scenes/MicrofilmScene.js", "t_50d1058f5474fe46bb88"):'')+feedback):this.preview?__dialogueText("scenes/MicrofilmScene.js", "t_db1d7313ec962ed15287"):this.savedOk===false?DATA.messages.saveFailed:__dialogueText("scenes/MicrofilmScene.js", "t_2aa863ce46ace0c1dd14"),16,1520,'#baa98e');}
 drawFrame(side,x,frame,index,total){
  this.text(x,185,(side==='left'?__dialogueText("scenes/MicrofilmScene.js", "t_b8af4f20a05e5a3cf2e9"):__dialogueText("scenes/MicrofilmScene.js", "t_4f285ac1907a12fa8c17"))+` / ${index+1}/${total}`+(this.activeReel===side?' *':''),25,690,'#f0d091');
  const g=this.add.graphics();g.fillStyle(0x060c07,1).fillRect(x-345,235,690,455);g.lineStyle(2,0x819573).strokeRect(x-345,235,690,455);
  for(let xx=x-325;xx<x+330;xx+=35){g.fillStyle(0xc8c9a3,1).fillRect(xx,247,18,15).fillRect(xx,662,18,15);}this.content.add(g);
  this.text(x,295,`${frame.id.toUpperCase()} / ${frame.title}`,22,650,'#d8dcba');
  const focus=microfilmFocused(DATA,this.progress),same=microfilmAligned(DATA,this.progress);
  Object.entries(DATA.labels).forEach(([field,label],i)=>{
   const y=365+i*72,marked=same&&this.progress.differences.includes(field);
   const bg=this.add.rectangle(x,y,635,63,marked?0x52613a:0x203423).setInteractive({useHandCursor:true});this.content.add(bg);
   this.text(x-150,y,label,20,290,'#adb995').setAlpha(focus?1:.5);this.text(x+145,y,frame.rows[field],23,310,'#f1edca').setAlpha(focus?1:.4);
   bg.on('pointerdown',()=>{if(this.closing||this.time.now<this.lockUntil)return;this.lockUntil=this.time.now+140;this.activeReel=side;this.markDifference(field);});
  });
 }
 advanceReceipt(){
  const received=this.progress.copyReceived;
  this.progress=receiveMicrofilm(DATA,this.progress);const committed=this.persist();
  if(committed!==false&&!received&&this.progress.copyReceived)playReaderAudio(this,'evidence');
  this.render();
 }
 markDifference(field){
  const already=this.progress.differences.includes(field);
  const r=markMicrofilmDifference(DATA,this.progress,field);this.progress=r.state;this.message=r.message;const committed=this.persist();
  if(committed!==false&&r.ok&&!already&&this.progress.differences.includes(field))playReaderAudio(this,'evidence');
  this.render();
 }
 chooseCity(id){
  const completed=this.progress.completed;
  const r=chooseMicrofilmCity(DATA,this.progress,id);this.progress=r.state;this.message=r.message;const committed=this.persist();
  if(committed!==false&&r.ok&&!completed&&this.progress.completed)playReaderAudio(this,'success');
  this.render();
 }
 moveReel(side,delta){
  if(this.progress.completed)return;const frames=side==='left'?DATA.leftFrames:DATA.rightFrames;
  const before=this.progress[side];this.activeReel=side;this.progress[side]=(this.progress[side]+delta+frames.length)%frames.length;this.message='';this.persist();
  if(this.progress[side]!==before)playMicrofilmTransport(this);this.render();
 }
 changeFocus(delta){
  const before=this.progress.focus;
  this.progress.focus=Math.max(0,Math.min(1,Math.round((this.progress.focus+delta)*10)/10));this.persist();
  if(this.progress.focus!==before)playReaderAudio(this,'click');this.render();
 }
 autoFocus(){
  const before=this.progress.focus;this.progress.focus=DATA.focusTarget;this.persist();
  if(this.progress.focus!==before)playReaderAudio(this,'click');this.render();
 }
 layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1600,height/1000);this.root.setScale(s).setPosition((width-1600*s)/2,(height-1000*s)/2);}
 suspend(){this.layers=['PlayerHudScene','UIScene','NewsHud'].filter(k=>this.isSceneActive(k)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPaused=true;this.scene.pause(this.returnSceneKey);}}
 restore(){for(const{key,visible}of this.layers){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}this.layers=[];if(this.parentPaused&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPaused=false;}
 closeVisit(){if(this.closing)return;this.closing=true;stopMicrofilmTransport(this);this.persist();const callback=this.onFinished;this.onFinished=null;this.restore();try{callback?.({preview:this.preview,completed:this.progress.completed,copyReceived:this.progress.copyReceived,saved:this.savedOk,cityId:this.progress.completed?'warsaw':null});}finally{this.scene.stop();}}
}
