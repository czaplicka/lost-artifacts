import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { flushAutosave, requestAutosave } from '../gameStatePersistence.js';
import { getWitnessTestimony, markAlibiWitnessInterviewed, allWitnessesVisited } from '../alibi/AlibiEncounterSetup.js';
import { APPROACHES, RECOVERY_APPROACHES, CHALLENGES, COOPERATION_LABELS, getRapport,
  getInterviewView, applyApproach, repairCooperation, askWitness, challengeWitness, followUpChallenge } from '../alibi/AlibiCooperation.js';

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
  }
  create(){
    super.create();this.stopSceneIfActive('NewsHud');this.bindInterviewHud();
    this.cameras.main.resetFX();this.cameras.main.setAlpha(1);this.cameras.main.setBackgroundColor(C.desk);
    this.trackInputEvent(this.scale,'resize',this.handleResize,this);
    try{this.loadWitness();this.entry=this.view.state.transcript.at(-1)||{detective:'I would like to ask you about an alibi.',witness:this.view.personality.opening};this.render();}
    catch(error){console.error('[AlibiScene] Cannot open interview.',error);this.fileError=true;this.renderError();}
  }
  bindInterviewHud(){
    this.releaseInterviewHud();this.interviewHud=this.getRegisteredScene('PlayerHudScene');const hud=this.interviewHud;
    if(hud?.input)this.hudInputWasEnabled=hud.input.enabled;
    hud?.events?.on('hud-ready',this.hideInterviewHud,this);
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
    this.view=getInterviewView(this.caseKey,this.encounterId);
    this.testimony=getWitnessTestimony(this.caseKey,this.suspectId,this.npcId);
    if(!this.testimony||this.testimony.encounterId!==this.encounterId)throw new Error('Missing witness testimony.');
  }
  handleResize(){if(this._cleanupDone||this.isLeaving)return;this.replyPage=0;if(this.fileError)this.renderError();else if(this.view)this.render();}
  layout(){
    const narrow=this.scale.width/Math.max(1,this.scale.height)<1.15;
    return narrow?{narrow,w:780,h:1320,side:{x:28,y:90,w:724,h:300},main:{x:28,y:410,w:724,h:374},tabsY:804,actionsY:870,actionsH:240,footerY:1145}:
      {narrow,w:1440,h:1040,side:{x:30,y:100,w:360,h:764},main:{x:416,y:100,w:994,h:416},tabsY:540,actionsY:608,actionsH:245,footerY:916};
  }
  rect(x,y,w,h,fill,stroke=null,alpha=1){const o=this.add.rectangle(x+w/2,y+h/2,w,h,fill,alpha);if(stroke!==null)o.setStrokeStyle(2,stroke);this.root.add(o);return o;}
  text(x,y,content,width,options={}){
    const o=this.add.text(x,y,String(content??''),{fontFamily:'SpecialElite',fontSize:'23px',color:C.ink,wordWrap:{width,useAdvancedWrap:true},lineSpacing:4,...options});
    this.root.add(o);return o;
  }
  fitText(o,h,min=17){while(o.height>h&&parseInt(o.style.fontSize,10)>min)o.setFontSize(parseInt(o.style.fontSize,10)-1);return o;}
  label(x,y,content,width,color=C.muted){return this.text(x,y,content,width,{fontFamily:'PressStart2P',fontSize:'11px',lineSpacing:5,color});}
  button(x,y,w,title,callback,enabled=true,h=54,selected=false){
    const normal=!enabled?0xd2c8af:selected?C.green:C.dark;
    this.rect(x+3,y+4,w,h,C.shadow,null,0.22);const bg=this.rect(x,y,w,h,normal,selected?C.gold:C.edge);
    const text=this.text(x+12,y+h/2,title,w-24,{fontSize:'21px',color:enabled?'#fff2d3':'#746e60',align:'center',lineSpacing:1}).setOrigin(0,0.5);
    text.setFixedSize(w-24,0);this.fitText(text,h-12,16);if(!enabled)return;
    bg.setInteractive({useHandCursor:true}).on('pointerover',()=>bg.setFillStyle(selected?0x627c60:0x42594e)).on('pointerout',()=>bg.setFillStyle(normal))
      .on('pointerdown',()=>{if(!this.isLeaving&&!this.isSaving&&!this._cleanupDone)callback();});
  }
  createRoot(){
    this.root?.destroy(true);this.root=this.add.container(0,0);this.L=this.layout();const {w,h}=this.L;
    this.rect(14,20,w-28,h-34,C.shadow);this.rect(8,8,w-28,h-32,C.cover,C.edge);this.rect(20,70,w-40,h-92,C.paper);
    for(let y=78;y<h-30;y+=11)this.rect(22,y,w-44,1,0x7f735a,null,0.035);
    this.label(32,29,'MARK AGENCY / WITNESS INTERVIEW',w-80,'#f1ddb2');
    const scale=Math.min(this.scale.width/w,this.scale.height/h);
    this.root.setScale(scale).setPosition((this.scale.width-w*scale)/2,(this.scale.height-h*scale)/2);
  }
  render(){this.loadWitness();this.createRoot();this.renderWitness();this.renderReply();this.renderTabs();this.renderActions();this.renderFooter();}
  renderWitness(){
    const {side:s,narrow}=this.L;this.rect(s.x+4,s.y+5,s.w,s.h,C.shadow,null,0.13);this.rect(s.x,s.y,s.w,s.h,0xdcd0b1,C.edge);
    const px=s.x+18,py=s.y+18,pw=narrow?210:s.w-36,ph=narrow?264:342;
    this.rect(px,py,pw,ph,C.light,C.edge);this.rect(px+8,py+8,pw-16,ph-32,C.dark);
    const key=[this.encounter.portraitKey,this.testimony.portraitKey,...PORTRAITS].find(k=>typeof k==='string'&&this.textures.exists(k));
    if(key){const image=this.add.image(px+pw/2,py+(ph-24)/2,key);image.setScale(Math.min((pw-20)/image.width,(ph-36)/image.height));this.root.add(image);}
    else this.label(px+16,py+50,'WITNESS',pw-32,'#eee0bd');
    this.label(px+10,py+ph-20,'ALIBI CONTACT',pw-20);
    const tx=narrow?px+pw+22:px,ty=narrow?py+10:py+ph+20,tw=narrow?s.w-pw-62:pw;
    this.label(tx,ty,'SUBJECT',tw);this.fitText(this.text(tx,ty+23,this.testimony.suspectName,tw,{fontSize:'27px'}),55,19);
    this.fitText(this.text(tx,ty+86,this.testimony.role||'Witness',tw,{fontSize:'20px',color:C.muted}),42,17);
    const cy=ty+(narrow?138:142),window=this.testimony.crimeWindow;
    this.text(tx,cy,window?`Crime: ${clock(window.startMinute)}–${clock(window.endMinute)}`:'Crime window unavailable',tw,{fontSize:'18px',color:'#843e35'});
    const level=this.view.state.level;
    if(narrow){
      this.text(tx,cy+32,`COOPERATION: ${COOPERATION_LABELS[level]}`,tw,{fontSize:'20px'});
      this.text(tx,cy+62,this.view.detailsKnown?'Detailed account recorded':'Details not obtained',tw,{fontSize:'18px',color:this.view.detailsKnown?'#35633b':'#843e35'});return;
    }
    this.rect(px,cy+36,pw,2,C.edge);this.label(px,cy+55,'COOPERATION',pw);
    this.text(px,cy+80,COOPERATION_LABELS[level],pw,{fontSize:'25px'});
    for(let i=0;i<4;i++)this.rect(px+i*((pw+8)/4),cy+116,(pw-24)/4,12,i<=level?C.green:0xbeb395);
    this.fitText(this.text(px,cy+145,this.view.detailsKnown?'Detailed account recorded. It may still be inaccurate.':'A basic statement is not a detailed alibi. Build cooperation, then ask for details.',pw,{fontSize:'19px',color:C.muted}),95,17);
  }
  paginate(object,content,maxHeight){
    const pages=[];let current='';for(const line of object.getWrappedText(content)){
      const candidate=current?`${current}\n${line}`:line;object.setText(candidate);
      if(object.height>maxHeight&&current){pages.push(current);current=line;}else current=candidate;
    }pages.push(current||'No entry.');return pages;
  }
  renderReply(){
    const {main:m,narrow}=this.L,e=this.entry||{witness:this.view.personality.opening};
    this.rect(m.x+4,m.y+5,m.w,m.h,C.shadow,null,0.12);this.rect(m.x,m.y,m.w,m.h,C.light,C.edge);
    this.rect(m.x,m.y,6,m.h,this.view.state.pendingChallenge?C.red:C.green);
    this.label(m.x+24,m.y+18,this.historyIndex>=0?'INTERVIEW HISTORY':this.view.state.pendingChallenge?'FOLLOW-UP REQUIRED':'CURRENT EXCHANGE',m.w-48);
    const source=[e.detective?`YOU: ${e.detective}`:'',`WITNESS: ${e.witness||''}`,e.note?`NOTE: ${e.note}`:''].filter(Boolean).join('\n\n');
    const body=this.text(m.x+24,m.y+51,'',m.w-48,{fontSize:narrow?'23px':'25px',lineSpacing:6});
    const pages=this.paginate(body,source,m.h-120);this.replyPage=Math.max(0,Math.min(this.replyPage,pages.length-1));body.setText(pages[this.replyPage]);
    this.rect(m.x+24,m.y+m.h-60,m.w-48,1,C.edge);
    this.button(m.x+24,m.y+m.h-47,110,'BACK',()=>{this.replyPage--;this.render();},this.replyPage>0,34);
    this.text(m.x+150,m.y+m.h-41,`${this.replyPage+1} / ${pages.length}`,m.w-300,{fontSize:'18px',align:'center',color:C.muted});
    this.button(m.x+m.w-134,m.y+m.h-47,110,'NEXT',()=>{this.replyPage++;this.render();},this.replyPage<pages.length-1,34);
  }
  renderTabs(){
    const {main:m,tabsY}=this.L;
    const tabs=[['questions','QUESTIONS'],['approaches','APPROACH'],['repair','CONCERN'],['challenge','CHALLENGE'],['notes','NOTES']];
    const gap=8,width=(m.w-gap*4)/5;
    tabs.forEach(([id,title],i)=>this.button(m.x+i*(width+gap),tabsY,width,title,()=>{this.tab=id;this.render();},!this.view.state.pendingChallenge,50,this.tab===id));
  }
  run(action){
    if(this.isLeaving||this.isSaving)return;
    try{const result=action();if(result){this.entry=result;this.replyPage=0;this.historyIndex=-1;}this.error='';}
    catch(error){console.error('[AlibiScene] Action failed.',error);this.error='Could not record that exchange.';}this.render();
  }
  choice(index,title,callback,enabled=true,tag=''){
    const {main:m,actionsY}=this.L,width=(m.w-14)/2;
    this.button(m.x+index%2*(width+14),actionsY+Math.floor(index/2)*66,width,tag?`${title} / ${tag}`:title,callback,enabled,56);
  }
  info(message){const {main:m,actionsY}=this.L;this.fitText(this.text(m.x+12,actionsY+12,message,m.w-24,{fontSize:'23px',lineSpacing:7}),205,18);}
  actionHint(message,rows=2){const {main:m,actionsY}=this.L;this.fitText(this.text(m.x+4,actionsY+rows*66+8,message,m.w-8,{fontSize:'19px',color:C.muted}),rows===3?42:90,16);}
  renderActions(){
    const state=this.view.state,call=(fn,id)=>()=>this.run(()=>fn(this.caseKey,this.encounterId,id));
    if(state.pendingChallenge){
      [['space','Give them space'],['press','Ask precisely'],['pause','Pause this topic']].forEach(([id,title],i)=>this.choice(i,title,call(followUpChallenge,id)));
      this.actionHint('Read their response. A wrong follow-up costs 5 minutes; pressure may reduce cooperation.');return;
    }
    if(this.tab==='questions'){
      const asked=state.asked;
      const questions=[
        ['statement','Ask for a basic account',true],
        ['summary','Ask for the detailed account',state.level>=2&&asked.includes('statement')],
        ['person','Ask how they know the person',state.level>=1],
        ['personal','Ask about their hesitation',state.level>=2&&asked.includes('person')],
        ['withheld','Ask what else they held back',state.level>=3&&this.view.detailsKnown]
      ];
      questions.forEach(([id,title,enabled],i)=>{const review=state.transcript.some(e=>e.id===`question:${id}`);
        this.choice(i,title,call(askWitness,id),review||enabled,review?'review':enabled?'':'locked');});
      this.actionHint('Details need Cooperative or Open. Knowing the witness does not make their account true.',3);return;
    }
    if(this.tab==='approaches'){
      APPROACHES.forEach((a,i)=>{const used=state.usedApproaches.includes(a.id);this.choice(i,a.label,call(applyApproach,a.id),!used,used?'used':'');});
      this.choice(3,'Compare a collected account',call(applyApproach,'corroborate'),this.view.canCorroborate,
        state.usedApproaches.includes('corroborate')?'used':this.view.otherDetails?'':'need evidence');
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
  renderFooter(){
    const {w,footerY:y,narrow}=this.L,state=this.view.state;this.rect(30,y-10,w-60,2,C.edge);
    const status=this.isSaving?'Saving...':this.error||(state.pendingChallenge?'Finish or pause the current challenge.':
      this.view.detailsKnown?'Detailed account recorded.':'Details missing: a basic visit does not unlock timeline facts.');
    this.statusText=this.text(32,y+2,status,w-64,{fontSize:'19px',color:this.error?'#843e35':C.muted});this.fitText(this.statusText,narrow?43:30,17);
    const gap=14,width=(w-64-gap*2)/3,by=y+(narrow?53:40);
    this.button(32,by,width,'RETURN TO CITY',()=>void this.returnToCity(),true,52);
    this.button(32+width+gap,by,width,this.view.completed?'VISIT RECORDED':'RECORD VISIT',()=>void this.finishInterview(),
      state.asked.includes('statement')&&!this.view.completed&&!state.pendingChallenge,52,true);
    this.button(32+(width+gap)*2,by,width,'OPEN TIMELINE',()=>void this.openBoard(),allWitnessesVisited(this.caseKey,this.suspectId),52);
  }
  async finishInterview(){
    if(this.isSaving||this.isLeaving||this.view.completed||this.view.state.pendingChallenge||!this.view.state.asked.includes('statement'))return;
    this.isSaving=true;this.render();
    try{if(!markAlibiWitnessInterviewed(this.caseKey,this.encounterId))throw new Error('Could not record visit.');
      advanceCrimeTutorial(gameState,'talk_to_npcs');requestAutosave();flushAutosave();this.loadWitness();this.error='';}
    catch(error){console.error('[AlibiScene] Recording failed.',error);this.error='Visit could not be saved. Try again.';}
    finally{this.isSaving=false;if(!this._cleanupDone)this.render();}
  }
  renderError(){this.createRoot();this.text(48,180,'This witness file could not be opened. Return to the city and try again.',this.L.w-96,{fontSize:'29px'});
    this.statusText=this.text(48,360,'',this.L.w-96);this.button(48,440,300,'RETURN TO CITY',()=>void this.returnToCity());}
  async openBoard(){if(!allWitnessesVisited(this.caseKey,this.suspectId))return;
    await this.navigate('AlibiTimelineScene',{caseKey:this.caseKey,suspectId:this.suspectId,cityId:this.cityId,returnScene:this.returnScene,returnData:this.returnData});}
  async returnToCity(){await this.navigate(this.returnScene,this.returnData);}
  async navigate(key,data){
    if(this.isLeaving||this.isSaving||this._cleanupDone)return;this.isLeaving=true;const hud=this.interviewHud;
    try{flushAutosave();const opened=await this.goto(key,data);
      if(opened){this.releaseInterviewHud();if(hud&&!hud._cleanupDone&&hud.currentGameplaySceneKey==='AlibiScene')hud.setCurrentGameplayScene?.(key);}
      else if(!this._cleanupDone){this.isLeaving=false;this.hideInterviewHud();this.statusText?.setText('Could not leave. Please try again.');}}
    catch(error){console.error('[AlibiScene] Navigation failed.',error);if(!this._cleanupDone){this.isLeaving=false;this.hideInterviewHud();this.statusText?.setText('Could not leave. Please try again.');}}
  }
}
