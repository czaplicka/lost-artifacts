import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { WarsawMeetingScene } from './WarsawMeetingScene.js';
import { johnReviewData as DATA,getJohnAccountReview,updateJohnAccountReview } from '../johnAccountReviewService.js';
import { normalizeJohnReview,editJohnReview,evaluateJohnReview } from './pi-office/JohnAccountReviewModel.js';
export class JohnAccountReviewScene extends WarsawMeetingScene{
 constructor(){super({key:'JohnAccountReviewScene'});}
 init(data={}){super.init(data);this.claimId=DATA.claims[0].id;this.sourceId=DATA.sources[0].id;this.recordsOpening=false;}
 create(){
  const story=getJohnAccountReview();this.allowed=this.preview||story.eligible;this.progress=normalizeJohnReview(DATA,this.preview?null:story);
  this.cameras.main.setBackgroundColor('#102018');this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,490,1440,980,0x192b20));this.text(720,55,__dialogueText("scenes/JohnAccountReviewScene.js", "t_6d3638cbe83b4177088d"),24,1300,'#efd299',this.root,'PressStart2P');this.content=this.add.container(0,0);this.root.add(this.content);this.button(1210,910,'BACK',()=>this.closeVisit(),this.root);this.render();
  this.resize=()=>this.layout();this.scale.on('resize',this.resize);this.layout();this.keyHandler=e=>{if(e.code===__dialogueText("scenes/JohnAccountReviewScene.js", "t_037c968467aa3fd7c059")&&!e.repeat){e.preventDefault();this.closeVisit();}};this.input.keyboard?.on('keydown',this.keyHandler);
  this.suspend();this.events.once('shutdown',()=>{this.scale.off('resize',this.resize);this.input.keyboard?.off('keydown',this.keyHandler);this.restore();this.notifyFinished();});
 }
 render(){
  this.content.removeAll(true);if(!this.allowed){this.text(720,450,__dialogueText("scenes/JohnAccountReviewScene.js", "t_05d83f4207f3db9d879e"),29);return;}
  if(this.progress.completed){this.text(720,260,__dialogueText("scenes/JohnAccountReviewScene.js", "t_ba43e27831de1a661d14"),27,1300,'#efd299');this.text(720,450,DATA.success,29,1250);this.text(720,705,__dialogueText("scenes/JohnAccountReviewScene.js", "t_7ed398653eb11a4b398f"),25);this.button(720,820,__dialogueText("scenes/JohnAccountReviewScene.js", "t_5502081af2db4e47282c"),()=>{void this.openPrimaryRecords();});this.footer();return;}
  this.text(720,115,__dialogueText("scenes/JohnAccountReviewScene.js", "t_43339695cab0ee096ca5"),22);
  DATA.claims.forEach((c,i)=>{
   const y=220+i*110,b=this.add.rectangle(345,y,650,98,this.claimId===c.id?0x52603c:0x2a4030).setStrokeStyle(2,0x8b9e75).setInteractive({useHandCursor:true});this.content.add(b);
   const source=DATA.sources.find(s=>s.id===this.progress.links[c.id]),verdict=DATA.verdicts.find(v=>v.id===this.progress.verdicts[c.id]);this.text(345,y,c.text+'\n'+(source?source.title:__dialogueText("scenes/JohnAccountReviewScene.js", "t_892fb92df578731ffd4e"))+' / '+(verdict?verdict.label:__dialogueText("scenes/JohnAccountReviewScene.js", "t_a3d8b7ca3387a311a59e")),19,615);
   b.on('pointerdown',()=>{if(this.closing||this.time.now<this.clickAfter)return;this.clickAfter=this.time.now+180;this.claimId=c.id;this.sourceId=this.progress.links[c.id]||DATA.sources[0].id;this.feedback='';this.render();});
  });
  DATA.sources.forEach((s,i)=>{const b=this.button(1070,190+i*60,s.title,()=>{this.sourceId=s.id;this.feedback='';this.render();});b.setFontSize(20);if(this.sourceId===s.id)b.setBackgroundColor('#6c5735');});this.button(1070,540,__dialogueText("scenes/JohnAccountReviewScene.js", "t_a7b9066231965fef7428"),()=>this.change({claimId:this.claimId,sourceId:this.sourceId}));
  this.content.add(this.add.rectangle(720,700,1360,160,0xe1d6b9).setStrokeStyle(2,0x99865e));const source=DATA.sources.find(s=>s.id===this.sourceId);this.text(720,640,source.title,21,1300,'#654a30');this.text(720,712,source.text,23,1300,'#342e25');DATA.verdicts.forEach((v,i)=>this.button(410+i*620,825,__dialogueText("scenes/JohnAccountReviewScene.js", "t_09957cda44d53d385525")+v.label,()=>this.change({claimId:this.claimId,verdictId:v.id})));this.button(300,910,__dialogueText("scenes/JohnAccountReviewScene.js", "t_89e5a6b9966b6d79be0b"),()=>this.change({check:true}));this.footer();
 }
 footer(){this.text(720,964,(this.preview?__dialogueText("scenes/JohnAccountReviewScene.js", "t_50d1058f5474fe46bb88"):'')+(this.saved===false?__dialogueText("scenes/JohnAccountReviewScene.js", "t_d1085e77824b8b9592f6"):this.feedback||__dialogueText("scenes/JohnAccountReviewScene.js", "t_b193ba1b1c1cb01e9ba8")),17,1350,'#d9c18f');}
 change(action){let result;if(this.preview){let state=editJohnReview(DATA,this.progress,action.claimId,action.sourceId,action.verdictId);result=action.check?evaluateJohnReview(DATA,state):{ok:true,message:''};if(action.check&&result.ok)state.completed=true;result={...result,state,saved:null};}else result=updateJohnAccountReview(action);this.progress=normalizeJohnReview(DATA,result.state);this.feedback=result.message;if(result.claimId)this.claimId=result.claimId;if(typeof result.saved==='boolean')this.saved=result.saved;this.render();}
 async openPrimaryRecords(){
  if(this.closing||this.recordsOpening||!this.progress.completed)return false;this.recordsOpening=true;
  try{const{openJohnPrimaryRecords}=await import('../johnPrimaryRecordsLauncher.js');if(this.closing||!this.sys.isActive())return false;const opened=openJohnPrimaryRecords(this.game,{preview:this.preview,returnSceneKey:'JohnAccountReviewScene',onFinished:()=>{this.recordsOpening=false;if(!this.closing&&this.sys.isActive())this.render();}});if(!opened){this.recordsOpening=false;this.feedback=__dialogueText("scenes/JohnAccountReviewScene.js", "t_e995de8bcc08b6dd2d28");this.render();}return opened;}
  catch(error){this.recordsOpening=false;if(!this.closing&&this.sys.isActive()){this.feedback=__dialogueText("scenes/JohnAccountReviewScene.js", "t_6ffc38f36aacd7e2ab56");this.render();}console.error('[Primary records]',error);return false;}
 }
}
