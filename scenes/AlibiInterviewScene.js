import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { flushAutosave, requestAutosave } from '../gameStatePersistence.js';
import { getWitnessTestimony, markAlibiWitnessInterviewed, allWitnessesVisited } from '../alibi/AlibiEncounterSetup.js';
import { APPROACHES, RECOVERY_APPROACHES, CHALLENGES, COOPERATION_LABELS, getRapport,
 getInterviewView, applyApproach, repairCooperation, askWitness, challengeWitness, followUpChallenge } from '../alibi/AlibiCooperation.js';
import { LocationDialoguePanel } from '../ui/LocationDialoguePanel.js';

const C={desk:0x182428,shadow:0x0c1518,cover:0x394941,paper:0xeadfc4,light:0xf5ecd6,
 ink:'#302d27',muted:'#696353',gold:0xbc9254,green:0x526a51,red:0x843e35,edge:0xa99876,dark:0x293b37};
const PORTRAITS=['npc','npc1','npc2','npc3','npc4','npc5','npc6'];
function clock(n){return Number.isInteger(n)?`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:'--:--';}
export class AlibiScene extends BaseScene {
 constructor(){super({key:'AlibiScene'});}
 init(data={}){
  this.caseKey=data.caseKey||null;this.encounterId=data.encounterId||null;this.suspectId=data.suspectId||null;
  this.npcId=data.npcId||null;this.cityId=data.cityId||null;this.returnScene=data.returnScene||'CrimeCityScene';
  this.returnData=data.returnData||{cityId:this.cityId};this.root=null;this.view=null;this.entry=null;
  this.tab='questions';this.replyPage=0;this.historyIndex=-1;this.isLeaving=false;this.isSaving=false;
  this.error='';this.fileError=false;this.interviewHud=null;this.hudInputWasEnabled=null;
  this.dialoguePanel=null;this.actionTopics=[];this.guidance=[];this.operationTopics=[];this.statusText=null;
 }
 create(){
  super.create();this.stopSceneIfActive('NewsHud');this.bindInterviewHud();
  this.cameras.main.resetFX();this.cameras.main.setAlpha(1);this.cameras.main.setBackgroundColor(C.desk);
  this.trackInputEvent(this.scale,'resize',this.handleResize,this);
  this.events.once('shutdown',this.destroyInterviewPanel,this);this.events.once('destroy',this.destroyInterviewPanel,this);
  try{
   if(typeof LocationDialoguePanel.prototype.advance!=='function')throw new Error('Install LocationDialoguePanel from dialogue migration stage 1.');
   this.loadWitness();this.entry=this.view.state.transcript.at(-1)||{detective:'I would like to ask you about an alibi.',witness:this.view.personality.opening};this.render();
  }catch(error){console.error('[AlibiScene] Cannot open interview.',error);this.fileError=true;this.renderError();}
 }
 bindInterviewHud(){
  this.releaseInterviewHud();this.interviewHud=this.getRegisteredScene('PlayerHudScene');const hud=this.interviewHud;
  if(hud?.input)this.hudInputWasEnabled=hud.input.enabled;hud?.events?.on('hud-ready',this.hideInterviewHud,this);
  this.events.off('wake',this.hideInterviewHud,this);this.events.on('wake',this.hideInterviewHud,this);
  this.events.off('shutdown',this.releaseInterviewHud,this);this.events.once('shutdown',this.releaseInterviewHud,this);
  this.events.off('destroy',this.releaseInterviewHud,this);this.events.once('destroy',this.releaseInterviewHud,this);this.hideInterviewHud();
 }
 hideInterviewHud(){
  if(this._cleanupDone||this.isLeaving)return;const hud=this.interviewHud;if(!hud||hud._cleanupDone)return;
  hud.closeAllUIPanels?.();hud.setCurrentGameplayScene?.('AlibiScene');hud.hideHud?.();hud.scene?.setVisible(false);
  if(hud.input)hud.input.enabled=false;
 }
 releaseInterviewHud(){
  const hud=this.interviewHud;hud?.events?.off('hud-ready',this.hideInterviewHud,this);
  if(hud?.input&&this.hudInputWasEnabled!==null)hud.input.enabled=this.hudInputWasEnabled;
  this.events?.off('wake',this.hideInterviewHud,this);this.events?.off('shutdown',this.releaseInterviewHud,this);
  this.events?.off('destroy',this.releaseInterviewHud,this);this.interviewHud=null;this.hudInputWasEnabled=null;
 }
 loadWitness(){
  if(!this.caseKey||!this.encounterId||!this.suspectId||!this.npcId)throw new Error('Missing interview navigation data.');
  this.encounter=gameState.crimeCityEncounterState?.[this.caseKey]?.find(e=>e.id===this.encounterId);
  if(!this.encounter||this.encounter.suspectId!==this.suspectId||this.encounter.npcId!==this.npcId)throw new Error('Witness navigation mismatch.');
  this.view=getInterviewView(this.caseKey,this.encounterId);this.testimony=getWitnessTestimony(this.caseKey,this.suspectId,this.npcId);
  if(!this.testimony||this.testimony.encounterId!==this.encounterId)throw new Error('Missing witness testimony.');
 }
 handleResize(){if(this._cleanupDone||this.isLeaving)return;this.replyPage=0;if(this.fileError)this.renderError();else if(this.view)this.render();}
 layout(){
  const w=this.scale.width,h=this.scale.height,panelHeight=Math.min(h,w<700?340:232);
  return{w,h,narrow:w<700,panelY:h-panelHeight,panelHeight};
 }
 rect(x,y,w,h,fill,stroke=null,alpha=1){
  const o=this.add.rectangle(x+w/2,y+h/2,w,h,fill,alpha);if(stroke!==null)o.setStrokeStyle(2,stroke);this.root.add(o);return o;
 }
 text(x,y,content,width,options={}){
  const o=this.add.text(x,y,String(content??''),{fontFamily:'SpecialElite',fontSize:'23px',color:C.ink,wordWrap:{width,useAdvancedWrap:true},lineSpacing:4,...options});
  this.root.add(o);return o;
 }
 fitText(o,h,min=17){while(o.height>h&&parseInt(o.style.fontSize,10)>min)o.setFontSize(parseInt(o.style.fontSize,10)-1);return o;}
 label(x,y,content,width,color=C.muted){return this.text(x,y,content,width,{fontFamily:'PressStart2P',fontSize:'11px',lineSpacing:5,color});}
 button(x,y,w,title,callback,enabled=true,h=34,selected=false){
  const normal=!enabled?0xd2c8af:selected?C.green:C.dark;
  const bg=this.rect(x,y,w,h,normal,selected?C.gold:C.edge);
  const text=this.text(x+8,y+h/2,title,w-16,{fontSize:this.L.narrow?'14px':'18px',color:enabled?'#fff2d3':'#746e60',align:'center',lineSpacing:1}).setOrigin(0,.5);
  text.setFixedSize(w-16,0);this.fitText(text,h-8,11);
  if(enabled)bg.setInteractive({useHandCursor:true}).on('pointerover',()=>bg.setFillStyle(selected?0x627c60:0x42594e)).on('pointerout',()=>bg.setFillStyle(normal))
   .on('pointerdown',()=>{if(!this.isLeaving&&!this.isSaving&&!this._cleanupDone)callback();});
  return bg;
 }
 createRoot(){
  this.destroyInterviewPanel();this.root?.destroy(true);this.root=this.add.container(0,0);this.L=this.layout();this.statusText=null;
  this.rect(0,0,this.L.w,this.L.h,C.desk);
  if(this.L.panelY>82){
   this.label(16,12,'MARK AGENCY / WITNESS INTERVIEW',Math.max(20,this.L.w-32),'#f1ddb2');
   if(this.L.panelY>150)this.rect(14,86,this.L.w-28,this.L.panelY-98,C.paper,C.edge);
  }
 }
 render(){
  this.loadWitness();this.createRoot();this.actionTopics=[];this.guidance=[];this.operationTopics=[];
  this.renderWitness();
  if(this.tab==='menu'&&!this.view.state.pendingChallenge)this.renderTabs();
  else{
   this.renderActions();
   if(!this.view.state.pendingChallenge)this.actionTopics.push({id:'topics',label:'Topics',state:'accent',onSelect:()=>{this.tab='menu';this.render();}});
  }
  this.renderFooter();this.renderReply();
 }
 witnessContext(){
  const window=this.testimony.crimeWindow,level=this.view.state.level;
  return[`SUBJECT: ${this.testimony.suspectName}`,this.testimony.role||'Witness',
   window?`Crime: ${clock(window.startMinute)}–${clock(window.endMinute)}`:'Crime window unavailable',
   `COOPERATION: ${COOPERATION_LABELS[level]}`,
   this.view.detailsKnown?'Detailed account recorded. It may still be inaccurate.':'A basic statement is not a detailed alibi. Build cooperation, then ask for details.'];
 }
 renderWitness(){
  if(this.L.panelY<180)return;
  const lines=this.witnessContext(),room=this.L.panelY-146;
  const object=this.text(28,98,lines.slice(0,4).join('\n'),this.L.w-56,{fontSize:this.L.narrow?'16px':'22px'});
  this.fitText(object,Math.max(28,room),12);
  if(this.L.panelY>250){
   const gap=8,width=(this.L.w-56-gap*3)/4;
   for(let i=0;i<4;i++)this.rect(28+i*(width+gap),this.L.panelY-68,width,10,i<=this.view.state.level?C.green:0xbeb395);
  }
 }
 renderReply(){
  const entry=this.entry||{witness:this.view.personality.opening};
  const heading=this.historyIndex>=0?'INTERVIEW HISTORY':this.view.state.pendingChallenge?'FOLLOW-UP REQUIRED':'CURRENT EXCHANGE';
  const source=[entry.detective?`YOU: ${entry.detective}`:'',`WITNESS: ${entry.witness||''}`,entry.note?`NOTE: ${entry.note}`:''].filter(Boolean).join('\n\n');
  const body=[heading,source,...this.guidance,this.interviewStatus(),this.witnessContext().join('\n')].filter(Boolean).join('\n\n');
  const key=[this.encounter.portraitKey,this.testimony.portraitKey,...PORTRAITS].find(k=>typeof k==='string'&&this.textures.exists(k))||'portrait_fallback';
  const panel=new LocationDialoguePanel(this,{depth:6000,modal:false,keyboard:false,leaveLabel:'Leave',onLeave:()=>{void this.returnToCity();}});
  this.dialoguePanel=panel;panel.setSpeaker({name:this.testimony.role||'Witness',portrait:{kind:'texture',key}});panel.setText(body);
  panel.setTopics([...this.actionTopics,...this.operationTopics].map(topic=>({...topic,onSelect:()=>{
   if(this.dialoguePanel===panel&&topic.state!=='disabled'&&!this.isLeaving&&!this.isSaving&&!this._cleanupDone)topic.onSelect?.();
  }})));
 }
 renderTabs(){
  const tabs=[['questions','QUESTIONS'],['approaches','APPROACH'],['repair','CONCERN'],['challenge','CHALLENGE'],['notes','NOTES']];
  tabs.forEach(([id,label])=>this.actionTopics.push({id:`tab_${id}`,label,onSelect:()=>{this.tab=id;this.render();}}));
 }
 run(action){
  if(this.isLeaving||this.isSaving)return;
  try{const result=action();if(result){this.entry=result;this.replyPage=0;this.historyIndex=-1;}this.error='';}
  catch(error){console.error('[AlibiScene] Action failed.',error);this.error='Could not record that exchange.';}this.render();
 }
 choice(index,title,callback,enabled=true,tag=''){
  this.actionTopics.push({id:`action_${index}`,label:tag?`${title} / ${tag}`:title,
   state:!enabled||this.isSaving?'disabled':tag==='review'||tag==='used'?'used':'normal',onSelect:callback});
 }
 info(message){this.guidance.push(message);}
 actionHint(message,_rows=2){this.guidance.push(message);}
 renderActions(){
  const state=this.view.state,call=(fn,id)=>()=>this.run(()=>fn(this.caseKey,this.encounterId,id));
  if(state.pendingChallenge){
   [['space','Give them space'],['press','Ask precisely'],['pause','Pause this topic']].forEach(([id,title],i)=>this.choice(i,title,call(followUpChallenge,id)));
   this.actionHint('Read their response. A wrong follow-up costs 5 minutes; pressure may reduce cooperation.');return;
  }
  if(this.tab==='questions'){
   const asked=state.asked;
   const questions=[['statement','Ask for a basic account',true],['summary','Ask for the detailed account',state.level>=2&&asked.includes('statement')],
    ['person','Ask how they know the person',state.level>=1],['personal','Ask about their hesitation',state.level>=2&&asked.includes('person')],
    ['withheld','Ask what else they held back',state.level>=3&&this.view.detailsKnown]];
   questions.forEach(([id,title,enabled],i)=>{const review=state.transcript.some(e=>e.id===`question:${id}`);
    this.choice(i,title,call(askWitness,id),review||enabled,review?'review':enabled?'':'locked');});
   this.actionHint('Details need Cooperative or Open. Knowing the witness does not make their account true.',3);return;
  }
  if(this.tab==='approaches'){
   APPROACHES.forEach((a,i)=>{const used=state.usedApproaches.includes(a.id);this.choice(i,a.label,call(applyApproach,a.id),!used,used?'used':'');});
   this.choice(3,'Compare a collected account',call(applyApproach,'corroborate'),this.view.canCorroborate,state.usedApproaches.includes('corroborate')?'used':this.view.otherDetails?'':'need evidence');
   this.actionHint(getRapport()>=5?this.view.personality.hint:'Read their opening and reactions. Trying every approach does not guarantee cooperation. Use CONCERN to repair a bad exchange.');return;
  }
  if(this.tab==='repair'){
   if(!state.usedApproaches.length){this.info('Try an approach first. Listen to the response before deciding how to address their concern.');return;}
   if(state.level>=3){this.info('The witness is already open. Ask your questions; no further relationship work is needed.');return;}
   RECOVERY_APPROACHES.forEach((a,i)=>this.choice(i,a.label,call(repairCooperation,a.id),true,'5 min'));
   this.actionHint(this.view.personality.concern+' Each attempt takes 5 minutes. A good response restores cooperation; repeated repairs do not farm the Open level.');return;
  }
  if(this.tab==='challenge'){
   if(this.view.revisedStatement){this.info('A retraction is recorded. Review it alongside the original account; you still have to decide what it means.');return;}
   if(!this.view.canChallenge){this.info('A challenge needs this witness\'s detailed account, Cooperative or Open cooperation, and detailed accounts from the other two witnesses.');return;}
   CHALLENGES.forEach((c,i)=>{const t=state.confrontations?.[c.id];this.choice(i,c.label,call(challengeWitness,c.id),true,t?.resolved?'review':t?.stage?'resume':'');});return;
  }
  this.renderNotes();
 }
 renderNotes(){
  const history=this.view.state.transcript;
  this.choice(0,'Read recorded account',()=>{this.historyIndex=-1;this.replyPage=0;this.entry={detective:'Recorded account',witness:this.view.originalStatement,
   note:this.view.detailsKnown?'Recorded testimony, not verified fact.':'No detailed account obtained.'};this.render();},this.view.state.asked.includes('statement'));
  this.choice(1,'Read retraction',()=>{this.historyIndex=-1;this.replyPage=0;this.entry={detective:'Recorded retraction',witness:this.view.revisedStatement};this.render();},Boolean(this.view.revisedStatement));
  const browse=direction=>{this.historyIndex=this.historyIndex<0?(direction<0?history.length-1:0):(this.historyIndex+direction+history.length)%history.length;
   this.entry=history[this.historyIndex];this.replyPage=0;this.render();};
  this.choice(2,'Previous exchange',()=>browse(-1),history.length>0);this.choice(3,'Next exchange',()=>browse(1),history.length>0);
  this.actionHint(this.historyIndex>=0?`Exchange ${this.historyIndex+1} / ${history.length}`:`${history.length} exchanges recorded. Unasked details do not appear in notes.`);
 }
 interviewStatus(){
  return this.isSaving?'Saving...':this.error||(this.view.state.pendingChallenge?'Finish or pause the current challenge.':
   this.view.detailsKnown?'Detailed account recorded.':'Details missing: a basic visit does not unlock timeline facts.');
 }
 renderFooter(){
  const state=this.view.state,record=state.asked.includes('statement')&&!this.view.completed&&!state.pendingChallenge;
  const timeline=allWitnessesVisited(this.caseKey,this.suspectId);
  this.operationTopics=[{id:'record_visit',label:this.view.completed?'VISIT RECORDED':'RECORD VISIT',state:record&&!this.isSaving?'accent':'disabled',onSelect:()=>{void this.finishInterview();}},
   {id:'timeline',label:'OPEN TIMELINE',state:timeline&&!this.isSaving?'accent':'disabled',onSelect:()=>{void this.openBoard();}}];
  if(this.L.panelY<82)return;
  const gap=8,w=(this.L.w-32-gap*2)/3;
  this.button(16,40,w,'RETURN TO CITY',()=>void this.returnToCity());
  this.button(16+w+gap,40,w,this.view.completed?'VISIT RECORDED':'RECORD VISIT',()=>void this.finishInterview(),record,34,true);
  this.button(16+(w+gap)*2,40,w,'OPEN TIMELINE',()=>void this.openBoard(),timeline);
  if(this.L.panelY>150){this.statusText=this.text(28,this.L.panelY-42,this.interviewStatus(),this.L.w-56,{fontSize:'16px',color:this.error?'#843e35':C.muted});this.fitText(this.statusText,26,12);}
 }
 async finishInterview(){
  if(this.isSaving||this.isLeaving||this.view.completed||this.view.state.pendingChallenge||!this.view.state.asked.includes('statement'))return;
  this.isSaving=true;this.render();
  try{
   if(!markAlibiWitnessInterviewed(this.caseKey,this.encounterId))throw new Error('Could not record visit.');
   advanceCrimeTutorial(gameState,'talk_to_npcs');requestAutosave();flushAutosave();this.loadWitness();this.error='';
  }catch(error){console.error('[AlibiScene] Recording failed.',error);this.error='Visit could not be saved. Try again.';}
  finally{this.isSaving=false;if(!this._cleanupDone)this.render();}
 }
 renderError(){
  this.createRoot();this.text(24,Math.min(100,this.L.h*.2),'This witness file could not be opened. Return to the city and try again.',Math.max(40,this.L.w-48),{fontSize:'24px',color:'#fff2d3'});
  this.statusText=this.text(24,Math.min(240,this.L.h*.5),this.error,Math.max(40,this.L.w-48),{color:'#fff2d3'});
  this.button(24,Math.min(330,this.L.h-60),Math.min(300,this.L.w-48),'RETURN TO CITY',()=>void this.returnToCity());
 }
 async openBoard(){
  if(!allWitnessesVisited(this.caseKey,this.suspectId))return;
  await this.navigate('AlibiTimelineScene',{caseKey:this.caseKey,suspectId:this.suspectId,cityId:this.cityId,returnScene:this.returnScene,returnData:this.returnData});
 }
 async returnToCity(){await this.navigate(this.returnScene,this.returnData);}
 showNavigationError(){this.error='Could not leave. Please try again.';if(this.fileError)this.renderError();else this.render();}
 async navigate(key,data){
  if(this.isLeaving||this.isSaving||this._cleanupDone)return;this.isLeaving=true;const hud=this.interviewHud;
  try{
   flushAutosave();const opened=await this.goto(key,data);
   if(opened){this.releaseInterviewHud();if(hud&&!hud._cleanupDone&&hud.currentGameplaySceneKey==='AlibiScene')hud.setCurrentGameplayScene?.(key);}
   else if(!this._cleanupDone){this.isLeaving=false;this.hideInterviewHud();this.showNavigationError();}
  }catch(error){console.error('[AlibiScene] Navigation failed.',error);if(!this._cleanupDone){this.isLeaving=false;this.hideInterviewHud();this.showNavigationError();}}
 }
 destroyInterviewPanel(){this.dialoguePanel?.destroy();this.dialoguePanel=null;}
}
