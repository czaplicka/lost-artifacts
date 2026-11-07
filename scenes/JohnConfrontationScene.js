import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { johnConfrontationData as DATA,getJohnConfrontation,performJohnConfrontation } from '../johnConfrontationService.js';
import { normalizeConfrontation,confrontationAction } from './pi-office/JohnConfrontationModel.js';
export class JohnConfrontationScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnConfrontationScene'});}
 init(data={}){super.init(data);this.replayTopic=null;this.replayCursor=0;this.finaleOpening=false;}
 create(){
  const story=getJohnConfrontation();this.allowed=this.preview||story.eligible;this.progress=normalizeConfrontation(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#142019');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x1a2921));this.text(720,55,'WARSAW / HIS SIDE OF THE STORY',23,1320,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code!=='Escape'||e.repeat)return;e.preventDefault();if(this.sourceOpen){this.sourceOpen=false;this.render();}else if(this.replayTopic){this.replayTopic=null;this.render();}else this.closeVisit();};this.input.keyboard?.on('keydown',this.keyHandler);this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,'Complete the incident-file discovery before confronting John.',29);return;}
  if(this.sourceOpen){this.text(720,230,'CASE NOTES / KEEP SOURCES SEPARATE',27,1260,'#efd299');this.text(720,455,DATA.evidenceNotes,29,1250);this.button(720,760,'BACK TO CONVERSATION',()=>{this.sourceOpen=false;this.render();});this.footer();return;}
  this.button(240,910,'READ CASE NOTES',()=>{this.sourceOpen=true;this.render();});
  if(this.replayTopic){const topic=DATA.topics.find(t=>t.id===this.replayTopic);this.showLine(topic,topic.lines[this.replayCursor],true);return;}
  if(this.progress.completed){this.text(720,210,'CONFRONTATION RECORDED',31,1250,'#efd299');this.text(720,380,DATA.success,29,1250);this.text(720,510,DATA.nextObjective,24,1250);DATA.topics.forEach((t,i)=>this.button(720,590+i*70,'RE-READ '+t.title,()=>{this.replayTopic=t.id;this.replayCursor=0;this.render();}));this.button(720,820,'PREPARE FINAL REVIEW',()=>{void this.openFinalReview();});this.footer();return;}
  if(!this.progress.started){this.text(720,260,'RETURN TO JOHN',31,1250,'#efd299');this.text(720,450,DATA.intro,30,1250);this.button(720,730,'PRESENT THE INCIDENT FILES',()=>this.change('start'));this.footer();return;}
  const topic=DATA.topics.find(t=>t.id===this.progress.active);
  if(!topic){this.text(720,190,'CHOOSE WHAT TO CONFRONT HIM WITH',27,1250,'#efd299');DATA.topics.forEach((t,i)=>{const heard=this.progress.topics[t.id].heard;this.button(720,320+i*120,(heard?'[HEARD] ':'')+t.title,()=>{if(heard){this.replayTopic=t.id;this.replayCursor=0;this.render();}else this.change('topic',t.id);});});if(DATA.topics.every(t=>this.progress.topics[t.id].heard))this.button(720,760,'RECORD THE CONFRONTATION',()=>this.change('finish'));this.footer();return;}
  this.button(720,910,'TOPICS',()=>this.change('menu'));const state=this.progress.topics[topic.id];if(state.evidence!==topic.evidence){this.text(720,220,topic.title,30,1250,'#efd299');this.text(720,350,'Present the source that directly supports this topic.',27);DATA.evidence.forEach((e,i)=>this.button(720,465+i*85,e.label,()=>this.change('evidence',e.id)));this.footer();return;}this.showLine(topic,topic.lines[state.cursor],false);
 }
 showLine(topic,line,replay){this.text(720,210,topic.title,29,1250,'#efd299');this.text(720,300,line.speaker,23,1250,'#d1be91');this.text(720,470,line.text,30,1250);this.button(720,760,replay?'CONTINUE READING':'LISTEN',()=>{if(replay){this.replayCursor++;if(this.replayCursor>=topic.lines.length)this.replayTopic=null;this.render();}else this.change('next');});this.footer();}
 footer(){this.text(720,850,this.feedback,20,1320,'#e5c58e');this.text(720,964,(this.preview?'PREVIEW / ':'')+(this.saved===false?'Saving failed. Save manually before closing.':'John\'s account is recorded separately from the independent incident evidence.'),16,1350,'#b8c4a5');}
 change(action,id=null){const r=this.preview?confrontationAction(DATA,this.progress,action,id):performJohnConfrontation(action,id);this.progress=normalizeConfrontation(DATA,r.state);this.feedback=this.progress.completed?'':r.message;if(typeof r.saved==='boolean')this.saved=r.saved;this.render();return r.ok;}
 async openFinalReview(){
  if(this.closing||this.finaleOpening||!this.progress.completed)return false;this.finaleOpening=true;
  try{const{openHollyFinale}=await import('../hollyFinaleLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openHollyFinale(this.game,{preview:this.preview,returnSceneKey:'JohnConfrontationScene',onFinished:()=>{this.finaleOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.finaleOpening=false;this.feedback='The final review is unavailable or already open.';this.render();}return opened;}
  catch(error){this.finaleOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback='The final review could not be opened.';this.render();}console.error('[Holly finale]',error);return false;}
 }
}
