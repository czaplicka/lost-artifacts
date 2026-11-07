import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { incidentFilesData as DATA,getJohnIncidentFiles,performIncidentAction } from '../johnIncidentFilesService.js';
import { normalizeIncidents,incidentAction } from './pi-office/JohnIncidentFilesModel.js';
export class JohnIncidentFilesScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnIncidentFilesScene'});}
 init(data={}){super.init(data);this.documentId=null;this.board=false;this.readOnlyBook=false;this.confrontationOpening=false;}
 create(){
  const story=getJohnIncidentFiles();this.allowed=this.preview||story.eligible;this.progress=normalizeIncidents(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#122018');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x192b20));this.text(720,55,'INC-P17 / INC-G04',25,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(this.board){this.board=false;this.render();}else if(this.readOnlyBook){this.readOnlyBook=false;this.render();}else this.closeVisit();}};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,'Inspect the primary clinical records and complete the earlier story milestones first.',29);return;}
  if(this.progress.completed&&!this.readOnlyBook){this.text(720,210,'THE THREAT AT HOME',31,1250,'#efd299');this.text(720,445,DATA.success,29,1260);this.text(720,685,DATA.nextObjective,25,1260);this.button(400,800,'RE-READ INCIDENT SOURCES',()=>{this.readOnlyBook=true;this.board=false;this.render();});this.button(1040,800,'RETURN TO JOHN',()=>{void this.openConfrontation();});this.footer();return;}
  if(!this.board){
   this.text(720,125,`SOURCE FILES / ${this.progress.read.length}/${DATA.documents.length} READ / TEXT RECORDS`,21);DATA.documents.forEach((d,i)=>{const b=this.button(310,210+i*85,(this.progress.read.includes(d.id)?'[READ] ':'')+d.title,()=>{if(this.progress.completed){this.documentId=d.id;this.feedback='';this.render();}else if(this.change('read',d.id)){this.documentId=d.id;this.render();}});b.setFontSize(20);});
   this.content.add(this.add.rectangle(1030,460,730,620,0xe1d6b9).setStrokeStyle(3,0x9d855c));const doc=DATA.documents.find(d=>d.id===this.documentId);this.text(1030,210,doc?.title||'SELECT A SOURCE',25,675,'#684a31');this.text(1030,470,doc?.text||'Read the witness, comparison and recovery records for each incident, plus the identity cross-reference. No audio or video is attached to these pages.',26,655,'#302b25');
   if(this.progress.completed)this.button(720,835,'BACK TO FINDINGS',()=>{this.readOnlyBook=false;this.render();});else this.button(720,835,'ASSEMBLE EVIDENCE LINKS',()=>{if(!DATA.documents.every(d=>this.progress.read.includes(d.id))){this.feedback='Read all seven source pages first.';this.render();return;}this.board=true;this.feedback='';this.render();});
  }else{
   this.text(720,130,'MATCH EXHIBITS / THEN RESOLVE THE IDENTITY',23);this.text(360,205,'INC-P17 / POISONING',25,650,'#efd299');this.text(1080,205,'INC-G04 / SHOOTING',25,650,'#efd299');for(const[key,choices,x]of[['poison',DATA.poisonLinks,360],['gunshot',DATA.gunshotLinks,1080]])choices.forEach((c,i)=>{const b=this.button(x,285+i*90,c.label,()=>this.change(key,c.id));b.setFontSize(21);if(this.progress[key]===c.id)b.setBackgroundColor('#755932');});this.text(720,560,'WHO DO THE TWO INCIDENT NAMES IDENTIFY?',24);DATA.identityChoices.forEach((c,i)=>{const b=this.button(720,635+i*78,c.label,()=>this.change('identity',c.id));b.setFontSize(21);if(this.progress.identity===c.id)b.setBackgroundColor('#755932');});this.button(300,910,'CHECK FINDINGS',()=>this.change('check'));this.button(780,910,'READ SOURCES',()=>{this.board=false;this.render();});
  }this.footer();
 }
 footer(){this.text(720,963,(this.preview?'PREVIEW / ':'')+(this.saved===false?'Saving failed. Save manually before closing.':this.feedback||'Source records and exhibit links must be considered together.'),17,1350,'#d2bf94');}
 change(action,id=null){const r=this.preview?incidentAction(DATA,this.progress,action,id):performIncidentAction(action,id);this.progress=normalizeIncidents(DATA,r.state);if(this.progress.completed)this.board=false;this.feedback=this.progress.completed?'':r.message;if(typeof r.saved==='boolean')this.saved=r.saved;this.render();return r.ok;}
 async openConfrontation(){
  if(this.closing||this.confrontationOpening||!this.progress.completed)return false;this.confrontationOpening=true;
  try{const{openJohnConfrontation}=await import('../johnConfrontationLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnConfrontation(this.game,{preview:this.preview,returnSceneKey:'JohnIncidentFilesScene',onFinished:()=>{this.confrontationOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.confrontationOpening=false;this.feedback='Complete the incident discovery before confronting John.';this.render();}return opened;}
  catch(error){this.confrontationOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback='The confrontation could not be opened.';this.render();}console.error('[John confrontation]',error);return false;}
 }
}
