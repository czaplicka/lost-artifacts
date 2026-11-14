import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { primaryRecordsData as DATA,getJohnPrimaryRecords,performPrimaryRecordsAction } from '../johnPrimaryRecordsService.js';
import { normalizePrimary,primaryAction } from './medical/JohnPrimaryRecordsModel.js';
import { preloadReaderAudio,playReaderAudio } from './archive/ReaderAudio.js';
export class JohnPrimaryRecordsScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnPrimaryRecordsScene'});}
 init(data={}){super.init(data);this.documentId=null;this.readOnlyFolder=false;this.incidentsOpening=false;}
 preload(){preloadReaderAudio(this,['page','card','success']);if(!this.textures.exists(DATA.background.key))this.load.image(DATA.background.key,DATA.background.url);}
 create(){
  const story=getJohnPrimaryRecords();this.allowed=this.preview||story.eligible;this.progress=normalizePrimary(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#142019');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x18281e));if(this.textures.exists(DATA.background.key))this.root.add(this.add.image(720,440,DATA.background.key).setDisplaySize(1440,804));this.root.add(this.add.rectangle(720,490,1440,980,0x0a150d,.73));this.text(720,55,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_c27369dabeb84dc9bb1e"),24,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1220,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code!==__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_037c968467aa3fd7c059")||e.repeat)return;e.preventDefault();if(this.documentId){this.documentId=null;this.render();}else if(this.readOnlyFolder){this.readOnlyFolder=false;this.render();}else this.closeVisit();};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_f8cdf5e4c71e26f1e208"),29);return;}
  const doc=DATA.documents.find(d=>d.id===this.documentId);
  if(doc){this.content.add(this.add.rectangle(720,470,1360,650,0xe3d8bd).setStrokeStyle(3,0x9f875b));this.text(720,220,doc.title,30,1250,'#684a30');this.text(720,445,doc.text,29,1250,'#302c25');this.text(720,660,doc.reference?__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_55d4b591b5f4097a7dbe")+doc.reference:__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_8610dfd0b5276f9b2ec8"),24,1250,'#684a30');this.button(720,780,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_1f08b18be98c5bcd34ff"),()=>{this.documentId=null;this.render();});this.footer();return;}
  if(this.progress.completed&&!this.readOnlyFolder){this.text(720,240,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_6770a41244cc2c10ee3a"),31,1250,'#efd299');this.text(720,450,DATA.success,30,1250);this.text(720,650,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_67fa1896f89c543d61bc"),26);this.button(430,790,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_ce0da4ae6eea8e8e5ef3"),()=>{this.readOnlyFolder=true;this.render();});this.button(1010,790,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_940bb7ea80c5871a4e3a"),()=>{void this.openIncidentFiles();});this.footer();return;}
  if(!this.progress.permission){this.text(720,300,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_a2f111f04e0bc58ff43c"),31,1250,'#efd299');this.text(720,455,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_aeb1edd6117d79931ec3"),30,1250);this.button(720,685,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_9bf4628cb57b2bac87a6"),()=>this.change('permission'));}
  else if(!this.progress.doctorBriefed){this.text(720,300,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_db5336478281bfa78f03"),31,1250,'#efd299');this.text(720,460,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_2271bb81aef97add6fac"),29,1250);this.button(720,685,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_5a5063fa8be1b1f96968"),()=>this.change('doctor'));}
  else if(!this.progress.folder){this.text(720,160,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_2f8d9234f291dbaff065"),25,1300,'#efd299');DATA.folders.forEach((f,i)=>this.button(720,300+i*145,f.label,()=>this.change('folder',f.id)));}
  else{this.text(720,150,`${__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_135eca59aa428caeb216")}${this.progress.read.length}${__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_8a5edab282632443219e")}${DATA.documents.length}${__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_03ec43e80c26808ecd25")}`,24,1320,'#efd299');DATA.documents.forEach((d,i)=>this.button(720,260+i*105,(this.progress.read.includes(d.id)?__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_78c78dd961773adf990b"):'')+d.title,()=>this.openDocument(d.id)));if(this.progress.completed)this.button(720,745,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_d27595049bb48d849869"),()=>{this.readOnlyFolder=false;this.render();});else if(DATA.documents.every(d=>this.progress.read.includes(d.id))){this.text(720,535,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_cce76d412947da452c90"),24);DATA.conclusions.forEach((c,i)=>this.button(720,610+i*75,c.label,()=>this.change('conclusion',c.id)));}else this.text(720,670,__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_8053b257c70ebca89be5"),25);}this.footer();
 }
 footer(){this.text(720,850,this.progress.completed?'':this.feedback,20,1320,'#e7c58c');this.text(720,964,(this.preview?__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_50d1058f5474fe46bb88"):'')+(this.saved===false?__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_d1085e77824b8b9592f6"):__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_99c33ee39696672ab288")),16,1350,'#b6c5a5');if(this.progress.completed&&this.feedback)this.text(720,855,this.feedback,19,1320,'#e7c58c');}
 change(action,id=null){
  const completed=this.progress.completed,folder=this.progress.folder;
  const r=this.preview?primaryAction(DATA,this.progress,action,id):performPrimaryRecordsAction(action,id);
  this.progress=normalizePrimary(DATA,r.state);this.feedback=r.state.completed?'':r.message;if(typeof r.saved==='boolean')this.saved=r.saved;
  if(r.ok){
   if(!completed&&this.progress.completed)playReaderAudio(this,'success');
   else if(action==='folder'&&this.progress.folder!==folder)playReaderAudio(this,'card');
  }
  this.render();return r.ok;
 }
 openDocument(id){
  if(!DATA.documents.some(d=>d.id===id))return;
  const before=this.documentId;
  if(this.progress.completed||this.change('read',id)){
   this.documentId=id;this.feedback='';this.render();
   if(this.documentId!==before)playReaderAudio(this,'page');
  }
 }
 async openIncidentFiles(){
  if(this.closing||this.incidentsOpening||!this.progress.completed)return false;this.incidentsOpening=true;
  try{const{openJohnIncidentFiles}=await import('../johnIncidentFilesLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnIncidentFiles(this.game,{preview:this.preview,returnSceneKey:'JohnPrimaryRecordsScene',onFinished:()=>{this.incidentsOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.incidentsOpening=false;this.feedback=__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_8625c5457e1d401266d8");this.render();}return opened;}
  catch(error){this.incidentsOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback=__dialogueText("scenes/JohnPrimaryRecordsScene.js", "t_c554ca4385cdd38ef2c5");this.render();}console.error('[Incident files]',error);return false;}
 }
}
