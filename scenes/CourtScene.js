import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { COURT_CONFIG,buildCourtFacts,createCourtRecord,answerCourtQuestion,advanceCourt,validCourt } from '../systems/courtRapport.js';
import { currentChase,persistChase } from '../systems/chasePersistence.js';
import { paginateCourtText } from '../systems/courtTextPages.js';
const WIDTH=1920,HEIGHT=1080,BG_KEY='courtroom';
const sameId=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
export class CourtScene extends BaseScene {
 constructor(){super({key:'CourtScene'});}
 init(data={}){
  this.requestedSuspectId=data.suspectId??gameState.finalArrestSuspectId;
  this.record=null;this.root=null;this.notice=null;this.buttons=[];this.busy=false;this.inputLockUntil=0;
  this.infoTimer=null;this.infoText=null;this.hintModal=null;this.hintButton=null;
  this.keyHandler=null;this.pageHideHandler=null;this.visibilityHandler=null;this.resizeHandler=null;this.loadErrorHandler=null;
  this.backgroundFailed=false;this.pageIndex=0;this.pageCount=1;this.questionPages=[''];this.answerPages=[];this.hintPage=0;this.hintPages=[''];
 }
 preload(){
  this.loadErrorHandler=f=>{if(f.key===BG_KEY){this.backgroundFailed=true;console.error('[CourtScene] Background failed:',f.src);}};
  this.load.on('loaderror',this.loadErrorHandler);if(!this.textures.exists(BG_KEY))this.load.image(BG_KEY,'assets/local/courtroom.webp');
 }
 create(){
  super.create();this.load.off('loaderror',this.loadErrorHandler);EventBus.emit('hideHUD');
  for(const key of ['PlayerHudScene','UIScene','NewsHud']){const s=this.getRegisteredScene(key);s?.closeAllUIPanels?.();s?.hideHud?.();if(s)this.scene.setVisible(false,key);}
  audioManager.init(this);audioManager.stopAllMusic();audioManager.stopAllNonMusic();
  try{this.restoreOrCreateRecord();}catch(e){console.error('[CourtScene] Setup:',e);this.add.text(60,60,e.message,{fontFamily:'SpecialElite, monospace',fontSize:'26px',color:'#ffffff',wordWrap:{width:Math.max(200,this.scale.width-120)}});return;}
  this.cameras.main.setBackgroundColor('#12100e');this.root=this.add.container();this.fitRoot();this.drawCourtroom();this.createInterface();this.createOverlays();this.registerControls();this.registerLifecycle();this.save();this.render();
 }
 restoreOrCreateRecord(){
  const saved=gameState.courtState,belongs=saved&&sameId(saved.caseId,gameState.currentCaseId)&&saved.campaignId===gameState._createdAt&&sameId(saved.suspectId,this.requestedSuspectId);
  if(belongs){if(!validCourt(saved,gameState,this.requestedSuspectId))throw new Error('This trial save is inconsistent. It has not been reset or overwritten. Load a save from before the trial.');this.record=structuredClone(saved);return;}
  const facts=buildCourtFacts(gameState,this.requestedSuspectId);if(!facts.warrantMatches)throw new Error('A matching arrest warrant is required to begin this trial.');this.record=createCourtRecord(facts);
 }
 fitRoot(){if(!this.root)return;const scale=Math.min(this.scale.width/WIDTH,this.scale.height/HEIGHT);this.root.setScale(scale).setPosition((this.scale.width-WIDTH*scale)/2,(this.scale.height-HEIGHT*scale)/2);}
 rect(x,y,w,h,c,a=1){const r=this.add.rectangle(x,y,w,h,c,a);this.root.add(r);return r;}
 text(x,y,value,size=24,color='#f7e6bc',width=1600){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,align:'center',wordWrap:{width,useAdvancedWrap:true},lineSpacing:5}).setOrigin(0.5);this.root.add(t);return t;}
 drawCourtroom(){
  if(this.textures.exists(BG_KEY))this.root.add(this.add.image(960,540,BG_KEY).setDisplaySize(WIDTH,HEIGHT));
  else{this.backgroundFailed=true;this.rect(960,540,WIDTH,HEIGHT,0x29251f);this.rect(960,245,520,200,0x65462c);this.rect(350,290,480,180,0x4c3424);this.rect(1570,290,480,180,0x4c3424);}
  this.rect(960,57,WIDTH,114,0x15110e,0.9);
 }
 smallButton(parent,x,y,w,h,label,callback,size=20){
  const root=this.add.container(x,y),bg=this.add.rectangle(0,0,w,h,0x302218,1).setStrokeStyle(2,0xc7ad73).setInteractive({useHandCursor:true});
  const words=this.add.text(0,0,label,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#ffe3a0',align:'center',wordWrap:{width:w-16,useAdvancedWrap:true}}).setOrigin(0.5);
  root.add([bg,words]);parent.add(root);bg.on('pointerover',()=>{if(bg.input?.enabled)bg.setFillStyle(0x62472d);});bg.on('pointerout',()=>bg.setFillStyle(0x302218));bg.on('pointerdown',()=>{if(bg.input?.enabled)callback();});return {root,bg,label:words};
 }
 enableButton(b,enabled){if(!b)return;b.root.setAlpha(enabled?1:0.4);if(b.bg.input)b.bg.input.enabled=Boolean(enabled);}
 createInterface(){
  this.heading=this.text(760,35,'COURT HEARING',28,'#ffe3a0',1390);this.defendantText=this.text(760,78,`Defendant: ${this.record.facts.defendantName}`,22,'#f7e6bc',1390);this.createTrustMeter();
  this.rect(960,595,1780,180,0x1c1510,0.96).setStrokeStyle(2,0x9b8052);this.questionText=this.text(960,595,'',27,'#f7e6bc',1680);
  this.buttons=[this.makeAnswer(500,775,0),this.makeAnswer(1420,775,1),this.makeAnswer(500,945,2),this.makeAnswer(1420,945,3)];
  this.notice=this.text(960,1050,'',18,'#ffb28d',1770);this.text(1650,96,'1–4: answer | Enter: continue | ←/→: pages',14,'#d5c5a3',530);
  this.hintButton=this.smallButton(this.root,1780,38,190,48,'HINT [H]',()=>this.openHint(),22).bg;
  this.previousPage=this.smallButton(this.root,680,470,220,42,'PREVIOUS PAGE',()=>this.changePage(-1),18);this.nextPage=this.smallButton(this.root,1240,470,220,42,'NEXT PAGE',()=>this.changePage(1),18);this.pageLabel=this.text(960,470,'',19,'#ffe3a0',300);
 }
 createTrustMeter(){
  this.rect(1650,275,420,310,0x18130f,0.92).setStrokeStyle(2,0x9b8052);this.text(1650,145,"JUDGE'S CONFIDENCE",20,'#ffe3a0',390);this.meter=this.add.graphics();this.root.add(this.meter);this.trustValue=this.text(1650,323,'',30,'#ffe3a0',350);
  this.text(1650,366,`Conviction threshold: ${COURT_CONFIG.convictionThreshold}`,18,'#d5c5a3',390);const bonus=this.record.facts.courtRapportBonus??0,rapport=this.record.facts.courtRapport;
  this.rapportText=this.text(1650,402,rapport===undefined?'Rapport bonus: +0 (existing trial)':`Rapport ${rapport} | Starting bonus +${bonus}`,18,'#98d6b0',390);
 }
 drawTrustMeter(){
  const g=this.meter;if(!g)return;const cx=1650,cy=308,radius=135;const point=(v,r=radius)=>({x:cx+Math.cos(Math.PI+Math.PI*v/100)*r,y:cy+Math.sin(Math.PI+Math.PI*v/100)*r});g.clear();
  for(let v=0;v<100;v++){const a=point(v),b=point(v+1);g.lineStyle(18,v<35?0xb96150:v<COURT_CONFIG.convictionThreshold?0xd1aa56:0x79b68a,1);g.lineBetween(a.x,a.y,b.x,b.y);}
  for(let v=0;v<=100;v+=10){const a=point(v,radius-15),b=point(v,radius+12);g.lineStyle(2,0xf6e6c0,0.8);g.lineBetween(a.x,a.y,b.x,b.y);}
  const a=point(COURT_CONFIG.convictionThreshold,radius-23),b=point(COURT_CONFIG.convictionThreshold,radius+17);g.lineStyle(5,0xffffff,1);g.lineBetween(a.x,a.y,b.x,b.y);
  const value=Phaser.Math.Clamp(this.record.trust,0,100),needle=point(value,radius-28);g.lineStyle(5,0xffefb5,1);g.lineBetween(cx,cy,needle.x,needle.y);g.fillStyle(0xffefb5,1);g.fillCircle(cx,cy,8);this.trustValue.setText(`${value}/100`);
 }
 makeAnswer(x,y,index){
  const root=this.add.container(x,y),bg=this.add.rectangle(0,0,850,145,0x302218,0.98).setStrokeStyle(2,0xc7ad73).setInteractive({useHandCursor:true});const label=this.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:'23px',color:'#f7e6bc',align:'center',wordWrap:{width:790,useAdvancedWrap:true},lineSpacing:4}).setOrigin(0.5);
  root.add([bg,label]);this.root.add(root);bg.on('pointerdown',()=>this.press(index));bg.on('pointerover',()=>{if(!this.busy&&!this.hintModal&&bg.input?.enabled)bg.setFillStyle(0x62472d);});bg.on('pointerout',()=>bg.setFillStyle(0x302218));return {root,bg,label};
 }
 createOverlays(){this.infoText=this.text(760,415,'',20,'#ffe3a0',1250).setBackgroundColor('#1a1410').setPadding(12,8).setVisible(false);if(this.backgroundFailed)this.showInfo('Courtroom background unavailable. Check assets/local/courtroom.webp.');}
 showInfo(message){this.infoTimer?.remove(false);this.infoText?.setText(message).setVisible(true);this.infoTimer=this.time.delayedCall(5000,()=>{this.infoTimer=null;this.infoText?.setVisible(false);});}
 measuredPages(target,value,maxHeight){return paginateCourtText(value,candidate=>{target.setText(candidate);return target.height;},maxHeight);}
 render(){
  const r=this.record;if(!r)return;this.drawTrustMeter();this.pageIndex=0;this.answerPages=[];
  try{
   if(r.phase==='question'){
    const q=r.questions[r.index];if(!q||q.answers?.length!==4){this.showRenderError();return;}
    this.heading.setText(`${q.side==='prosecutor'?'PROSECUTION':'DEFENCE'} — ${r.index+1}/${r.questions.length}`);this.questionPages=this.measuredPages(this.questionText,q.text,158);this.answerPages=q.answers.map((a,i)=>this.measuredPages(this.buttons[i].label,`${i+1}. ${a.text}`,125));this.buttons.forEach((b,i)=>b.root.setPosition(i%2===0?500:1420,i<2?775:945).setVisible(true));
   }else{
    this.buttons.forEach(b=>b.root.setVisible(false));this.buttons[0].root.setPosition(960,835).setVisible(true);
    if(r.phase==='feedback'){this.heading.setText('TESTIMONY ASSESSED');this.questionPages=this.measuredPages(this.questionText,r.feedback,158);this.answerPages=[['CONTINUE / ENTER']];}
    else if(r.phase==='verdict'){const convicted=r.verdict==='convicted';this.heading.setText('VERDICT');const result=convicted?'The court finds the defendant guilty.':'The prosecution has not established the case. The defendant is released.';
     this.questionPages=this.measuredPages(this.questionText,result+(r.verdictExplanation?`\n\n${r.verdictExplanation}`:''),158);this.answerPages=[[convicted?'CLOSE CASE / ENTER':'GAME OVER / ENTER']];
    }else{this.showRenderError();return;}
   }
   this.pageCount=Math.max(this.questionPages.length,...this.answerPages.map(p=>p.length),1);this.renderPage();
  }catch(e){console.error('[CourtScene] Layout:',e);this.showRenderError();}
 }
 renderPage(){
  if(!this.record)return;const last=this.pageIndex===this.pageCount-1;this.questionText.setText(this.questionPages[Math.min(this.pageIndex,this.questionPages.length-1)]);
  this.buttons.forEach((b,i)=>{const pages=this.answerPages[i];if(!pages)return;b.label.setText(pages[Math.min(this.pageIndex,pages.length-1)]);b.bg.setFillStyle(0x302218);this.enableButton(b,last);});
  const multiple=this.pageCount>1;this.previousPage.root.setVisible(multiple);this.nextPage.root.setVisible(multiple);this.pageLabel.setVisible(multiple).setText(`PAGE ${this.pageIndex+1} / ${this.pageCount}`);this.enableButton(this.previousPage,this.pageIndex>0);this.enableButton(this.nextPage,!last);this.inputLockUntil=this.time.now+200;
 }
 changePage(delta){if(this.busy||this.hintModal||this.time.now<this.inputLockUntil)return;const next=Math.max(0,Math.min(this.pageCount-1,this.pageIndex+delta));if(next!==this.pageIndex){this.pageIndex=next;this.renderPage();}}
 getHintText(){
  const r=this.record;if(!r)return 'No trial is currently available.';
  if(r.phase==='verdict')return 'Read every page of the verdict. A release explains which final finding was missing or whether confidence was insufficient. Close this note and use the result button.';
  if(r.phase==='feedback')return 'Read the assessment before continuing. A weak answer and a missing final case finding are different problems. The final verdict will explain any unresolved finding.';
  if(r.version===3)return 'This hearing checks the FINAL Case Theory, not your three reconstruction attempts or discarded drafts.\n\nThe prosecution asks about motive, means and opportunity. The defence tests the identity chain and the other forensic match. At most one procedural objection can be added.\n\nExplain the collected finding, not just the conclusion. A forged-ID envelope establishes an alias; it did not directly reveal the real name.\n\nRead all pages before answering. Rapport helps but is not required. One weaker answer need not defeat a properly established case. This hint does not choose an answer.';
  return 'This is a previously started hearing. Its original questions and scoring have been preserved. Read every page and distinguish supported facts from assumptions. New hearings use the shorter final Case Theory format.';
 }
 openHint(){
  if(this.busy||this.hintModal||!this.record||!this.root||this._cleanupDone)return;const modal=this.add.container(0,0);this.root.add(modal);this.hintModal=modal;this.hintButton?.setFillStyle(0x302218);
  const shade=this.add.rectangle(960,540,WIDTH,HEIGHT,0x000000,0.78).setInteractive(),panel=this.add.rectangle(960,540,1120,700,0x211810,1).setStrokeStyle(3,0xc7ad73).setInteractive(),heading=this.add.text(960,245,'COURTROOM HINT',{fontFamily:'PressStart2P, monospace',fontSize:'22px',color:'#ffe3a0',align:'center'}).setOrigin(0.5);
  this.hintBody=this.add.text(960,520,'',{fontFamily:'SpecialElite, monospace',fontSize:'25px',color:'#f7e6bc',align:'center',wordWrap:{width:980,useAdvancedWrap:true},lineSpacing:9}).setOrigin(0.5);modal.add([shade,panel,heading,this.hintBody]);this.smallButton(modal,960,820,350,62,'BACK TO COURT / ESC',()=>this.closeHint(),24);
  this.hintPrevious=this.smallButton(modal,650,760,220,38,'PREVIOUS',()=>this.turnHintPage(-1),18);this.hintNext=this.smallButton(modal,1270,760,220,38,'NEXT',()=>this.turnHintPage(1),18);this.hintPageLabel=this.add.text(960,760,'',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#ffe3a0'}).setOrigin(0.5);modal.add(this.hintPageLabel);shade.on('pointerdown',()=>this.closeHint());this.hintPage=0;
  try{this.hintPages=this.measuredPages(this.hintBody,this.getHintText(),425);this.renderHintPage();}catch(e){console.error('[CourtScene] Hint:',e);this.closeHint();}
 }
 renderHintPage(){if(!this.hintModal)return;this.hintBody.setText(this.hintPages[this.hintPage]);const more=this.hintPages.length>1;this.hintPrevious.root.setVisible(more);this.hintNext.root.setVisible(more);this.hintPageLabel.setVisible(more).setText(`${this.hintPage+1} / ${this.hintPages.length}`);this.enableButton(this.hintPrevious,this.hintPage>0);this.enableButton(this.hintNext,this.hintPage<this.hintPages.length-1);}
 turnHintPage(delta){if(this.hintModal){this.hintPage=Math.max(0,Math.min(this.hintPages.length-1,this.hintPage+delta));this.renderHintPage();}}
 closeHint(){const modal=this.hintModal;this.hintModal=null;modal?.destroy(true);this.hintBody=null;this.inputLockUntil=this.time.now+200;}
 registerControls(){if(this.input.keyboard){this.keyHandler=e=>this.onKey(e);this.input.keyboard.on('keydown',this.keyHandler);}}
 onKey(e){
  const t=e.target;if(t?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t?.tagName)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(this.hintModal){if(['Escape','KeyH'].includes(e.code))this.closeHint();else if(['ArrowRight','PageDown'].includes(e.code))this.turnHintPage(1);else if(['ArrowLeft','PageUp'].includes(e.code))this.turnHintPage(-1);return;}
  if(e.code==='KeyH'){this.openHint();return;}if(['ArrowRight','PageDown','ArrowLeft','PageUp'].includes(e.code)){e.preventDefault();this.changePage(['ArrowRight','PageDown'].includes(e.code)?1:-1);return;}
  const m=e.code.match(/^(?:Digit|Numpad)([1-4])$/);if(m){this.press(Number(m[1])-1);return;}if(['Enter','NumpadEnter'].includes(e.code)&&this.record?.phase!=='question')this.press(0);
 }
 registerLifecycle(){
  this.pageHideHandler=()=>{if(!this.busy)this.save();};this.visibilityHandler=()=>{if(document.hidden&&!this.busy)this.save();};this.resizeHandler=()=>this.fitRoot();window.addEventListener('pagehide',this.pageHideHandler);document.addEventListener('visibilitychange',this.visibilityHandler);this.scale.on('resize',this.resizeHandler);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('pagehide',this.pageHideHandler);document.removeEventListener('visibilitychange',this.visibilityHandler);this.scale.off('resize',this.resizeHandler);if(this.keyHandler)this.input.keyboard?.off('keydown',this.keyHandler);if(this.loadErrorHandler)this.load.off('loaderror',this.loadErrorHandler);this.infoTimer?.remove(false);this.infoTimer=null;this.hintModal?.destroy(true);this.hintModal=null;});
 }
 save(){
  if(!this.record)return false;try{gameState.courtState=structuredClone(this.record);const chase=currentChase(),matches=chase&&chase.campaignId===this.record.campaignId&&sameId(chase.caseId,this.record.caseId)&&sameId(chase.suspectId,this.record.suspectId);let saved;
   if(matches){const checkpoint=structuredClone(chase);checkpoint.phase='review';checkpoint.terminalScene='CourtScene';saved=persistChase(checkpoint);}else saved=saveGameState();this.notice?.setText(saved===true?'':'Trial save failed. Keep this tab open.');return saved===true;
  }catch(e){console.error('[CourtScene] Save:',e);this.notice?.setText('Trial save failed. Keep this tab open.');return false;}
 }
 showRenderError(){this.busy=true;this.closeHint();this.buttons.forEach(b=>b.root.setVisible(false));this.previousPage?.root.setVisible(false);this.nextPage?.root.setVisible(false);this.pageLabel?.setVisible(false);this.heading.setText('TRIAL SAVE ERROR');this.questionText.setText('This stage cannot be displayed.\nDo not overwrite your saved game.');this.notice?.setText('Invalid question data, layout or trial phase.');}
 press(index){const r=this.record;if(!r||this.busy||this.hintModal||this.time.now<this.inputLockUntil||this.pageIndex!==this.pageCount-1)return;if(r.phase==='question'){if(answerCourtQuestion(r,index)){this.save();this.render();}return;}if(index!==0)return;if(r.phase==='feedback'){if(advanceCourt(r)){this.save();this.render();}return;}if(r.phase==='verdict')void this.finish();}
 applyVerdictToGameState(){const r=this.record,convicted=r.verdict==='convicted';gameState.finalArrestSuspectId=r.suspectId;gameState.finalArrestResult=convicted?'SUCCESS':'FAILURE';gameState.caseResolved=convicted;gameState.caseFailed=!convicted;gameState.isGameActive=false;gameState.gameOverReason=convicted?'':r.verdictExplanation||'The court released the defendant. The prosecution failed to establish the case.';}
 async finish(){
  const r=this.record;if(this.busy||this.hintModal||!r||r.phase!=='verdict')return;if(!validCourt(r,gameState,this.requestedSuspectId)){this.notice?.setText('The verdict cannot be committed: inconsistent trial data.');return;}this.busy=true;const convicted=r.verdict==='convicted';
  try{this.applyVerdictToGameState();r.resultCommitted=true;if(!this.save()){this.busy=false;this.notice?.setText('Verdict save failed. Press Enter to retry.');return;}
   const opened=await this.goto(convicted?'SuccessScene':'GameOverScene',{caseId:r.caseId,suspectId:r.suspectId,title:convicted?'CONVICTED':'DEFENDANT RELEASED',reasonCode:convicted?'court_conviction':'court_release',message:gameState.gameOverReason});if(!opened&&!this._cleanupDone){this.busy=false;this.notice?.setText('Could not open the result screen. Press Enter to retry.');}
  }catch(e){console.error('[CourtScene] Finish:',e);if(!this._cleanupDone){this.busy=false;this.notice?.setText('Could not finish the trial. Press Enter to retry.');}}
 }
}