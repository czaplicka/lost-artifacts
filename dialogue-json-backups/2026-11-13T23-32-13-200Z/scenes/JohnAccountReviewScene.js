import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { johnReviewData as DATA,getJohnAccountReview,updateJohnAccountReview } from '../johnAccountReviewService.js';
import { normalizeJohnReview,editJohnReview,evaluateJohnReview } from './pi-office/JohnAccountReviewModel.js';
export class JohnAccountReviewScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnAccountReviewScene'});}
 init(data={}){super.init(data);this.claimId=DATA.claims[0].id;this.sourceId=DATA.sources[0].id;this.recordsOpening=false;}
 create(){
  const story=getJohnAccountReview();this.allowed=this.preview||story.eligible;this.progress=normalizeJohnReview(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#102018');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x192b20));this.text(720,55,'JOHN / INDEPENDENT REVIEW',24,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code==='Escape'&&!e.repeat){e.preventDefault();this.closeVisit();}};this.input.keyboard?.on('keydown',this.keyHandler);
  this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,'Complete the Warsaw meeting and the earlier source enquiries first.',29);return;}
  if(this.progress.completed){this.text(720,260,'CORROBORATED / NOT A CULPRIT IDENTIFICATION',27,1300,'#efd299');this.text(720,450,DATA.success,29,1250);this.text(720,705,'Next: obtain the primary pre-flight incident records.\nNo accusation or arrest has been authorised.',25);this.button(720,820,'REQUEST PRIMARY RECORDS',()=>{void this.openPrimaryRecords();});this.footer();return;}
  this.text(720,115,'Select a claim, read and link a source, then mark what that source establishes.',22);
  DATA.claims.forEach((c,i)=>{
   const y=220+i*110,b=this.add.rectangle(345,y,650,98,this.claimId===c.id?0x52603c:0x2a4030).setStrokeStyle(2,0x8b9e75).setInteractive({useHandCursor:true});this.content.add(b);
   const source=DATA.sources.find(s=>s.id===this.progress.links[c.id]),verdict=DATA.verdicts.find(v=>v.id===this.progress.verdicts[c.id]);this.text(345,y,c.text+'\n'+(source?source.title:'[no linked source]')+' / '+(verdict?verdict.label:'[no verdict]'),19,615);
   b.on('pointerdown',()=>{if(this.closing||this.time.now<this.clickAfter)return;this.clickAfter=this.time.now+180;this.claimId=c.id;this.sourceId=this.progress.links[c.id]||DATA.sources[0].id;this.feedback='';this.render();});
  });
  DATA.sources.forEach((s,i)=>{const b=this.button(1070,190+i*60,s.title,()=>{this.sourceId=s.id;this.feedback='';this.render();});b.setFontSize(20);if(this.sourceId===s.id)b.setBackgroundColor('#6c5735');});this.button(1070,540,'LINK SELECTED SOURCE',()=>this.change({claimId:this.claimId,sourceId:this.sourceId}));
  this.content.add(this.add.rectangle(720,700,1360,160,0xe1d6b9).setStrokeStyle(2,0x99865e));const source=DATA.sources.find(s=>s.id===this.sourceId);this.text(720,640,source.title,21,1300,'#654a30');this.text(720,712,source.text,23,1300,'#342e25');DATA.verdicts.forEach((v,i)=>this.button(410+i*620,825,'MARK '+v.label,()=>this.change({claimId:this.claimId,verdictId:v.id})));this.button(300,910,'CHECK REVIEW',()=>this.change({check:true}));this.footer();
 }
 footer(){this.text(720,964,(this.preview?'PREVIEW / ':'')+(this.saved===false?'Saving failed. Save manually before closing.':this.feedback||'Sources are free to read. No penalty for revising your review.'),17,1350,'#d9c18f');}
 change(action){let result;if(this.preview){let state=editJohnReview(DATA,this.progress,action.claimId,action.sourceId,action.verdictId);result=action.check?evaluateJohnReview(DATA,state):{ok:true,message:''};if(action.check&&result.ok)state.completed=true;result={...result,state,saved:null};}else result=updateJohnAccountReview(action);this.progress=normalizeJohnReview(DATA,result.state);this.feedback=result.message;if(result.claimId)this.claimId=result.claimId;if(typeof result.saved==='boolean')this.saved=result.saved;this.render();}
 async openPrimaryRecords(){
  if(this.closing||this.recordsOpening||!this.progress.completed)return false;this.recordsOpening=true;
  try{const{openJohnPrimaryRecords}=await import('../johnPrimaryRecordsLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnPrimaryRecords(this.game,{preview:this.preview,returnSceneKey:'JohnAccountReviewScene',onFinished:()=>{this.recordsOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.recordsOpening=false;this.feedback='The primary-records request is unavailable or already open.';this.render();}return opened;}
  catch(error){this.recordsOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback='The primary-records request could not be opened.';this.render();}console.error('[Primary records]',error);return false;}
 }
}
