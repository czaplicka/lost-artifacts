import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { hollyFinaleData as DATA,getHollyFinale,performHollyFinale } from '../hollyFinaleService.js';
import { normalizeFinale,finaleAction } from './pi-office/HollyFinaleModel.js';
export class HollyFinaleScene extends WarsawMeetingScene{
 constructor(){super({key:'HollyFinaleScene'});}
 init(data={}){super.init(data);this.documentId=null;this.confirmExit=false;}
 create(){
  const story=getHollyFinale();this.allowed=this.preview||story.eligible;this.progress=normalizeFinale(DATA,this.preview?null:story);if(!this.preview&&story.endingSavePending)this.saved=false;
  this.cameras.main.setBackgroundColor('#122018');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x1b2b22));this.text(720,55,'HOLLY / THE FINAL DECISION',24,1320,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.returnButton=this.button(1210,910,'BACK',()=>this.requestBack(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code!=='Escape'||e.repeat)return;e.preventDefault();if(this.confirmExit){this.confirmExit=false;this.render();}else if(this.progress.candidate)this.change('cancel');else this.requestBack();};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);this.returnButton?.setText(this.progress.completed?'RETURN TO PI OFFICE':'BACK');
  if(!this.allowed){this.text(720,440,'Complete John\'s formal confrontation first. An already closed legacy case cannot be given a new ending here.',29);return;}
  if(this.confirmExit){this.text(720,260,'THE ENDING HAS NOT BEEN SAVED',29,1280,'#efd299');this.text(720,450,'Your choice is locked in memory, but saving failed. Leaving this screen does not make it safe to close the browser.',29,1250);this.button(400,720,'STAY / RETRY SAVE',()=>{this.confirmExit=false;this.change('retry_save');});this.button(1040,720,'LEAVE WITHOUT SAVING',()=>this.returnToOffice());this.footer();return;}
  if(this.progress.completed){const ending=DATA.endings[this.progress.outcome];this.text(720,220,ending.title,29,1290,'#efd299');this.text(720,435,ending.text,29,1260);this.text(720,675,ending.epilogue,25,1260);if(this.saved===false)this.button(720,810,'RETRY SAVE',()=>this.change('retry_save'));this.footer();return;}
  if(!this.progress.ready){
   this.text(720,125,`FINAL CASE REVIEW / ${this.progress.reviewed.length}/${DATA.review.length} READ`,22);DATA.review.forEach((r,i)=>{const b=this.button(300,280+i*135,(this.progress.reviewed.includes(r.id)?'[READ] ':'')+r.title,()=>{if(this.change('read',r.id)){this.documentId=r.id;this.render();}});b.setFontSize(20);});this.content.add(this.add.rectangle(990,470,770,600,0xe2d7bc).setStrokeStyle(3,0x9f875d));const doc=DATA.review.find(r=>r.id===this.documentId);this.text(990,230,doc?.title||'REVIEW THE CASE',25,700,'#684a31');this.text(990,485,doc?.text||'Read the three case-review pages before returning to Holly. Neither ending is selected by default.',28,695,'#302b25');this.button(720,820,'PREPARE FINAL DECISION',()=>this.change('prepare'));this.footer();return;
  }
  if(this.progress.line<DATA.dialogue.length){const line=DATA.dialogue[this.progress.line];this.text(720,230,line.speaker,27,1250,'#efd299');this.text(720,450,line.text,31,1260);this.button(720,760,'CONTINUE',()=>this.change('next'));this.footer();return;}
  if(this.progress.candidate){const choice=DATA.choices.find(c=>c.id===this.progress.candidate);this.text(720,230,choice.label,31,1250,'#efd299');this.text(720,450,choice.confirmation,30,1250);this.button(400,730,'CANCEL / GO BACK',()=>this.change('cancel'));this.button(1040,730,'CONFIRM THIS ENDING',()=>this.change('confirm',choice.id));this.footer();return;}
  this.text(720,235,'YOUR DECISION',32,1250,'#efd299');this.text(720,420,'The evidence and John\'s account are recorded. Choose what you do about Holly. You will be asked to confirm.',29,1250);DATA.choices.forEach((c,i)=>this.button(400+i*640,690,c.label,()=>this.change('choose',c.id)));this.footer();
 }
 footer(){this.text(720,854,this.feedback,19,1320,'#e5c58e');this.text(720,964,(this.preview?'PREVIEW / no ending is saved / ':'')+(this.saved===false?'SAVE FAILED / retry before closing the browser':this.progress.completed?'MAIN INVESTIGATION COMPLETE / agency cases remain available':'No ending is selected or committed without confirmation.'),16,1350,'#bec7aa');}
 change(action,id=null){let r;if(this.preview&&action==='retry_save')r={ok:true,state:this.progress,saved:null,message:''};else r=this.preview?finaleAction(DATA,this.progress,action,id):performHollyFinale(action,id);this.progress=normalizeFinale(DATA,r.state);this.feedback=r.message;if(typeof r.saved==='boolean')this.saved=r.saved;this.render();return r.ok;}
 requestBack(){if(this.progress.completed){if(!this.preview&&this.saved===false){this.confirmExit=true;this.render();}else this.returnToOffice();}else this.closeVisit();}
 returnToOffice(){
  const office=this.scene.manager.keys.DetectiveOfficeScene;if(!office||(!this.scene.isActive('DetectiveOfficeScene')&&!this.scene.isPaused('DetectiveOfficeScene'))){this.closeVisit();return;}
  const keys=['HollyFinaleScene','JohnConfrontationScene','JohnIncidentFilesScene','JohnPrimaryRecordsScene','JohnAccountReviewScene','WarsawMeetingScene'];const chain=keys.map(key=>({key,target:this.scene.manager.keys[key]})).filter(({key,target})=>target&&(this.scene.isActive(key)||this.scene.isPaused(key)));
  for(const{target}of chain)target.closing=true;for(const{key,target}of chain){target.restore?.();this.scene.stop(key);}
 }
 notifyFinished(){const callback=this.onFinished;this.onFinished=null;try{callback?.({preview:this.preview,completed:this.progress?.completed===true,outcome:this.progress?.outcome??null,saved:this.saved});}catch(error){console.error('[Holly finale] Completion callback failed:',error);}}
}
