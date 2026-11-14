import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { incidentFilesData as DATA,getJohnIncidentFiles,performIncidentAction } from '../johnIncidentFilesService.js';
import { normalizeIncidents,incidentAction } from './pi-office/JohnIncidentFilesModel.js';
import { preloadReaderAudio,playReaderAudio } from './archive/ReaderAudio.js';
export class JohnIncidentFilesScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnIncidentFilesScene'});}
 init(data={}){super.init(data);this.documentId=null;this.board=false;this.readOnlyBook=false;this.confrontationOpening=false;}
 preload(){preloadReaderAudio(this,['page','card','success']);}
 create(){
  const story=getJohnIncidentFiles();this.allowed=this.preview||story.eligible;this.progress=normalizeIncidents(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#122018');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x192b20));this.text(720,55,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_df55f339d6b8e181f7b2"),25,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code===__dialogueText("scenes/JohnIncidentFilesScene.js", "t_037c968467aa3fd7c059")&&!e.repeat){e.preventDefault();if(this.board){this.board=false;this.render();}else if(this.readOnlyBook){this.readOnlyBook=false;this.render();}else this.closeVisit();}};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_9414bd382ad35c84dd16"),29);return;}
  if(this.progress.completed&&!this.readOnlyBook){this.text(720,210,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_d23742d04b9037acf5de"),31,1250,'#efd299');this.text(720,445,DATA.success,29,1260);this.text(720,685,DATA.nextObjective,25,1260);this.button(400,800,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_606a2360dc981e1b7e5d"),()=>{this.readOnlyBook=true;this.board=false;this.render();});this.button(1040,800,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_741ae3f0e329f3cfb03f"),()=>{void this.openConfrontation();});this.footer();return;}
  if(!this.board){
   this.text(720,125,`${__dialogueText("scenes/JohnIncidentFilesScene.js", "t_d5329f77fa675eb1e511")}${this.progress.read.length}${__dialogueText("scenes/JohnIncidentFilesScene.js", "t_8a5edab282632443219e")}${DATA.documents.length}${__dialogueText("scenes/JohnIncidentFilesScene.js", "t_f3c19bd90c2be4a0378c")}`,21);DATA.documents.forEach((d,i)=>{const b=this.button(310,210+i*85,(this.progress.read.includes(d.id)?__dialogueText("scenes/JohnIncidentFilesScene.js", "t_78c78dd961773adf990b"):'')+d.title,()=>this.openDocument(d.id));b.setFontSize(20);});
   this.content.add(this.add.rectangle(1030,460,730,620,0xe1d6b9).setStrokeStyle(3,0x9d855c));const doc=DATA.documents.find(d=>d.id===this.documentId);this.text(1030,210,doc?.title||__dialogueText("scenes/JohnIncidentFilesScene.js", "t_402a68461e9c4565ea06"),25,675,'#684a31');this.text(1030,470,doc?.text||__dialogueText("scenes/JohnIncidentFilesScene.js", "t_2d22a7dc5f7a3fc05226"),26,655,'#302b25');
   if(this.progress.completed)this.button(720,835,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_d27595049bb48d849869"),()=>{this.readOnlyBook=false;this.render();});else this.button(720,835,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_c7e3c894eb31c69d3640"),()=>{if(!DATA.documents.every(d=>this.progress.read.includes(d.id))){this.feedback=__dialogueText("scenes/JohnIncidentFilesScene.js", "t_404e3883c13408cdc8ef");this.render();return;}this.board=true;this.feedback='';this.render();});
  }else{
   this.text(720,130,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_a841defadf12ced656d3"),23);this.text(360,205,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_f1d2dee956c2189080a9"),25,650,'#efd299');this.text(1080,205,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_119ad488bbcdccf9daee"),25,650,'#efd299');for(const[key,choices,x]of[['poison',DATA.poisonLinks,360],['gunshot',DATA.gunshotLinks,1080]])choices.forEach((c,i)=>{const b=this.button(x,285+i*90,c.label,()=>this.change(key,c.id));b.setFontSize(21);if(this.progress[key]===c.id)b.setBackgroundColor('#755932');});this.text(720,560,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_ad30f71ade680c28ce42"),24);DATA.identityChoices.forEach((c,i)=>{const b=this.button(720,635+i*78,c.label,()=>this.change('identity',c.id));b.setFontSize(21);if(this.progress.identity===c.id)b.setBackgroundColor('#755932');});this.button(300,910,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_96f4b04bf37a6cdc7cd4"),()=>this.change('check'));this.button(780,910,__dialogueText("scenes/JohnIncidentFilesScene.js", "t_513ac12c98088b218b84"),()=>{this.board=false;this.render();});
  }this.footer();
 }
 openDocument(id){
  const before=this.documentId;
  if(this.progress.completed){this.documentId=id;this.feedback='';this.render();}
  else if(this.change('read',id)){this.documentId=id;this.render();}
  if(this.documentId===id&&this.documentId!==before)playReaderAudio(this,'page');
 }
 footer(){this.text(720,963,(this.preview?__dialogueText("scenes/JohnIncidentFilesScene.js", "t_50d1058f5474fe46bb88"):'')+(this.saved===false?__dialogueText("scenes/JohnIncidentFilesScene.js", "t_d1085e77824b8b9592f6"):this.feedback||__dialogueText("scenes/JohnIncidentFilesScene.js", "t_5a94df71b24757e8d1ab")),17,1350,'#d2bf94');}
 change(action,id=null){
  const wasCompleted=this.progress.completed,previous=this.progress[action];
  const r=this.preview?incidentAction(DATA,this.progress,action,id):performIncidentAction(action,id);
  this.progress=normalizeIncidents(DATA,r.state);if(this.progress.completed)this.board=false;this.feedback=this.progress.completed?'':r.message;if(typeof r.saved==='boolean')this.saved=r.saved;
  if(r.ok){
   if(!wasCompleted&&this.progress.completed)playReaderAudio(this,'success');
   else if(['poison','gunshot','identity'].includes(action)&&this.progress[action]!==previous)playReaderAudio(this,'card');
  }
  this.render();return r.ok;
 }
 async openConfrontation(){
  if(this.closing||this.confrontationOpening||!this.progress.completed)return false;this.confrontationOpening=true;
  try{const{openJohnConfrontation}=await import('../johnConfrontationLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnConfrontation(this.game,{preview:this.preview,returnSceneKey:'JohnIncidentFilesScene',onFinished:()=>{this.confrontationOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.confrontationOpening=false;this.feedback=__dialogueText("scenes/JohnIncidentFilesScene.js", "t_6b13df3b19e40a78464b");this.render();}return opened;}
  catch(error){this.confrontationOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback=__dialogueText("scenes/JohnIncidentFilesScene.js", "t_f2696c12f457ed584fbc");this.render();}console.error('[John confrontation]',error);return false;}
 }
}
