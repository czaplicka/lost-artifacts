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
  this.cameras.main.setBackgroundColor('#142019');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x18281e));if(this.textures.exists(DATA.background.key))this.root.add(this.add.image(720,440,DATA.background.key).setDisplaySize(1440,804));this.root.add(this.add.rectangle(720,490,1440,980,0x0a150d,.73));this.text(720,55,'LECTER / PRIMARY RECORDS',24,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1220,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code!=='Escape'||e.repeat)return;e.preventDefault();if(this.documentId){this.documentId=null;this.render();}else if(this.readOnlyFolder){this.readOnlyFolder=false;this.render();}else this.closeVisit();};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,'Complete the independent review before requesting the primary entries.',29);return;}
  const doc=DATA.documents.find(d=>d.id===this.documentId);
  if(doc){this.content.add(this.add.rectangle(720,470,1360,650,0xe3d8bd).setStrokeStyle(3,0x9f875b));this.text(720,220,doc.title,30,1250,'#684a30');this.text(720,445,doc.text,29,1250,'#302c25');this.text(720,660,doc.reference?'External incident reference: '+doc.reference:'Register / external attachments',24,1250,'#684a30');this.button(720,780,'BACK TO FOLDER',()=>{this.documentId=null;this.render();});this.footer();return;}
  if(this.progress.completed&&!this.readOnlyFolder){this.text(720,240,'PRIMARY FILE INSPECTED',31,1250,'#efd299');this.text(720,450,DATA.success,30,1250);this.text(720,650,'Next: obtain incident files INC-P17 and INC-G04.\nThe clinic does not hold their attachments.',26);this.button(430,790,'READ PRIMARY PAGES',()=>{this.readOnlyFolder=true;this.render();});this.button(1010,790,'OPEN INCIDENT FILES',()=>{void this.openIncidentFiles();});this.footer();return;}
  if(!this.progress.permission){this.text(720,300,'A LIMITED REQUEST',31,1250,'#efd299');this.text(720,455,'Ask John for permission to inspect only the pre-flight incident entries and their attachment references.',30,1250);this.button(720,685,'ASK JOHN FOR LIMITED RELEASE',()=>this.change('permission'));}
  else if(!this.progress.doctorBriefed){this.text(720,300,'THE DOCTOR IS IN',31,1250,'#efd299');this.text(720,460,"You have John's limited release. Explain that you need the primary incident entries, not another annual examination.",29,1250);this.button(720,685,'REQUEST THE PRIMARY FILE',()=>this.change('doctor'));}
  else if(!this.progress.folder){this.text(720,160,'CABINET INDEX / SELECT THE MATCHING FILE',25,1300,'#efd299');DATA.folders.forEach((f,i)=>this.button(720,300+i*145,f.label,()=>this.change('folder',f.id)));}
  else{this.text(720,150,`JOHN MCCLANE / PRE-FLIGHT INCIDENTS / ${this.progress.read.length}/${DATA.documents.length} READ`,24,1320,'#efd299');DATA.documents.forEach((d,i)=>this.button(720,260+i*105,(this.progress.read.includes(d.id)?'[READ] ':'')+d.title,()=>this.openDocument(d.id)));if(this.progress.completed)this.button(720,745,'BACK TO FINDINGS',()=>{this.readOnlyFolder=false;this.render();});else if(DATA.documents.every(d=>this.progress.read.includes(d.id))){this.text(720,535,'WHAT DO THESE PAGES SUPPORT?',24);DATA.conclusions.forEach((c,i)=>this.button(720,610+i*75,c.label,()=>this.change('conclusion',c.id)));}else this.text(720,670,'Inspect both primary entries and the attachment register.',25);}this.footer();
 }
 footer(){this.text(720,850,this.progress.completed?'':this.feedback,20,1320,'#e7c58c');this.text(720,964,(this.preview?'PREVIEW / ':'')+(this.saved===false?'Saving failed. Save manually before closing.':'Limited inspection / no money, energy or agency-route changes'),16,1350,'#b6c5a5');if(this.progress.completed&&this.feedback)this.text(720,855,this.feedback,19,1320,'#e7c58c');}
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
  try{const{openJohnIncidentFiles}=await import('../johnIncidentFilesLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnIncidentFiles(this.game,{preview:this.preview,returnSceneKey:'JohnPrimaryRecordsScene',onFinished:()=>{this.incidentsOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.incidentsOpening=false;this.feedback='Complete the earlier story milestones before opening the incident files.';this.render();}return opened;}
  catch(error){this.incidentsOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback='The incident files could not be opened.';this.render();}console.error('[Incident files]',error);return false;}
 }
}
