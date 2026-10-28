import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { OPERATION_EVENTS, DISCLOSURES, REPORT_FIELDS, PHONE_MESSAGES } from '../assets/data/deadMailFinaleData.js';
import { canStartDeadMailFinale, beginDeadMailFinale, getDeadMailFinale, setDeadMailFinaleStage,
 chooseDeadMailPlan, checkDeadMailPlan, startDeadMailOperation, advanceDeadMailOperation, readDeadMailDisclosure,
 chooseDeadMailReport, submitDeadMailReport, claimDeadMailReward, playDeadMailMessage, saveDeadMailFinale } from '../managers/DeadMailFinaleManager.js';
const KEY='DeadMailFinaleScene';
export function openDeadMailFinalePreview(game=window.game){
 if(!canStartDeadMailFinale())throw new Error('Complete the night-shift preview first.');
 if(!game?.scene)throw new Error('The game is not ready.');
 if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailFinaleScene,false);
 if(!game.scene.isActive(KEY))game.scene.start(KEY);game.scene.bringToTop(KEY);
}
export class DeadMailFinaleScene extends BaseScene{
 constructor(){super({key:KEY});}
 create(){
  super.create();this.pausedKeys=[];this.hidden=[];this.page=null;this.feedback='';this.eventView=null;this.disclosureId=null;this.reportIndex=0;this.messageView=null;
  if(!canStartDeadMailFinale()){this.scene.stop();return;}beginDeadMailFinale();
  this.events.once('shutdown',this.restore,this);
  for(const s of [...this.scene.manager.getScenes(true)]){const k=s.sys.settings.key;if(k!==KEY){this.pausedKeys.push(k);this.scene.pause(k);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){
   const el=document.querySelector(selector);if(!el)continue;
   this.hidden.push([el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);el.style.setProperty('display','none','important');
  }
  this.scale.on('resize',this.fit,this);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());
  this.cameras.main.setBackgroundColor('#10131b');this.render();
 }
 restore(){
  flushAutosave();this.scale.off('resize',this.fit,this);
  for(const[el,value,priority]of this.hidden||[]){if(!el.isConnected)continue;if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');}
  for(const k of this.pausedKeys||[])if(this.scene.manager.keys[k]&&this.scene.isPaused(k))this.scene.resume(k);
  this.hidden=[];this.pausedKeys=[];
 }
 fit(){if(!this.page)return;const z=Math.min(this.scale.width/1280,this.scale.height/800);this.page.setScale(z).setPosition((this.scale.width-1280*z)/2,(this.scale.height-800*z)/2);}
 rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
 text(x,y,value,size=22,color='#e8dbc0',width=1160){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:7});this.page.add(t);return t;}
 button(x,y,label,fn,width=280,enabled=true){
  const r=this.rect(x,y,width,48,enabled?0x493b3e:0x25252c).setStrokeStyle(1,0x947956);this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#827c81',width-24);
  if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',fn).on('pointerover',()=>r.setFillStyle(0x625054)).on('pointerout',()=>r.setFillStyle(0x493b3e));return r;
 }
 go(stage){if(setDeadMailFinaleStage(stage)){this.feedback='';this.render();}}
 say(message){this.feedback=message;this.render();}
 render(){
  this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x151721);const s=getDeadMailFinale();
  this.text(40,22,'DEAD MAIL / RETURN TO SENDER',26,'#f5b75a');this.text(40,65,'CHAPTER 4 / THE LAST DELIVERY',17,'#bba4b4');
  this.button(1040,24,'SAVE & EXIT',()=>this.scene.stop(),200);
  [['plan','OPERATION PLAN',!s.started],['operation','DELIVERY',s.started],['records','DISCLOSURES',s.eventIndex===OPERATION_EVENTS.length-1],['report','FINAL REPORT',s.facts.length===8&&!s.completed]].forEach(([id,label,enabled],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,enabled));
  const views={plan:()=>this.planView(),operation:()=>this.operationView(),records:()=>this.recordsView(),report:()=>this.reportView(),epilogue:()=>this.epilogueView()};(views[s.stage]||views.plan)();
  if(s.completed&&s.stage!=='epilogue')this.button(45,706,'BACK TO EPILOGUE',()=>this.go('epilogue'),320);
  this.text(40,765,'DEVELOPMENT PREVIEW / grants a real local achievement and inventory souvenir on completion',14,'#a497a2');this.fit();
 }
 planView(){
  const s=getDeadMailFinale();this.text(45,180,'NEXT ARRANGED DELIVERY EVENING / FICTIONAL COURIER + POLICE OPERATION',21,'#f5b75a');
  const groups=[['mark','PARCEL PREPARATION',[['none','Ordinary unrecorded parcel'],['recorded','Record code, seal and contents']]],
   ['coverage','CAMERA COVERAGE',[['main','Costume contest only'],['continuous','Handover through shed approach']]],
   ['intervention','WHEN SHOULD THE TEAM ACT?',[['costume','First person wearing a cloak'],['handover','Handover, with no identity'],['documented','After identity and handling recorded']]]];
  groups.forEach(([field,title,options],row)=>{
   const y=243+row*132;this.text(45,y,title,20,'#d8bd95');
   options.forEach(([value,label],i)=>this.button(45+i*400,y+39,(s[field]===value?'[X] ':'')+label,()=>{chooseDeadMailPlan(field,value);this.feedback='';this.render();},380));
  });
  this.text(45,643,this.feedback||'The operation does not begin until the plan is checked. Wrong preparation does not consume money or replay earlier chapters.',20,'#e8dbc0',1160);
  this.button(45,709,'CHECK PLAN',()=>this.say(checkDeadMailPlan().message),320);
  this.button(855,709,'BEGIN OPERATION',()=>{const r=startDeadMailOperation();this.feedback=r.message||'';this.render();},360);
 }
 operationView(){
  const s=getDeadMailFinale();OPERATION_EVENTS.forEach((e,i)=>this.button(45+i*240,176,e.time,()=>{this.eventView=i;this.render();},220,i<=s.eventIndex));
  const i=this.eventView!==null&&this.eventView<=s.eventIndex?this.eventView:s.eventIndex,e=OPERATION_EVENTS[i];
  this.rect(45,247,1170,260,0x26342f);this.rect(140,355,210,110,0x4a5554);this.text(161,373,'PARCEL\nDM-114',25,'#e0c491',175);
  if(i>=2){this.rect(755,289,290,180,0x545c54);this.text(780,318,'SHED CAMERA\nEDWIN VALE\nFACE VISIBLE',25,'#efe0bc',250);}
  else this.text(690,330,'NO FACE IDENTIFIED YET',25,'#bcc6bf',460);
  this.text(45,532,e?`${e.time} / ${e.title}`:'OPERATION READY',23,'#f5b75a');
  this.text(45,582,e?.text||'Advance through the arranged delivery. Earlier entries remain available as a review, not a rewind.',22,'#e8dbc0',1160);
  const next=OPERATION_EVENTS[s.eventIndex+1];
  if(next)this.button(820,710,`CONTINUE TO ${next.time}`,()=>{advanceDeadMailOperation();this.eventView=null;this.render();},395);
  else this.button(820,710,'REVIEW LATER DISCLOSURES',()=>this.go('records'),395);
 }
 recordsView(){
  const s=getDeadMailFinale();Object.keys(DISCLOSURES).forEach((id,i)=>this.button(45+i*405,176,({orders:'ORDER RECORDS',resale:'RESALE LEDGER',marker:'MARKER ORDER'})[id],()=>{readDeadMailDisclosure(id);this.disclosureId=id;this.render();},380));
  const d=DISCLOSURES[this.disclosureId];this.rect(45,247,1170,392,0xd9c8a4);
  this.text(70,268,d?.title||'LATER / POLICE DISCLOSURE',24,'#392f2c',1120);
  this.text(70,328,d?.text||'The operation identified the collector of DM-114.\n\nThe earlier deliveries, financial motive and marker require separate records.\n\nThese are scripted disclosures in the fictional case, not live database access or real police communications.',23,'#392f2c',1110);
  this.text(45,662,'Do not use the new delivery alone as proof of every earlier allegation.',20,'#bba4b4',1160);
  this.button(850,711,'PREPARE FINAL REPORT',()=>this.go('report'),365,s.facts.length===8);
 }
 reportView(){
  const s=getDeadMailFinale();REPORT_FIELDS.forEach((d,i)=>this.button(45+i*300,176,`${i+1}. ${s.report[d.id]===undefined?'CHOOSE':'SELECTED'}`,()=>{this.reportIndex=i;this.feedback='';this.render();},280));
  const d=REPORT_FIELDS[this.reportIndex]||REPORT_FIELDS[0];this.text(45,260,d.title,24,'#f5b75a');
  d.options.forEach((label,i)=>this.button(45,336+i*69,(s.report[d.id]===i?'[X] ':'')+label,()=>{chooseDeadMailReport(d.id,i);this.feedback='';this.render();},1170));
  this.text(45,586,this.feedback||'Complete all four fields. Claims must match the operation, order records, ledger and marker order.',23,'#e8dbc0',1160);
  this.button(850,710,'SUBMIT FINAL REPORT',()=>{const r=submitDeadMailReport();this.feedback=r.message||'Report could not be submitted.';this.render();},365,REPORT_FIELDS.every(d=>s.report[d.id]!==undefined));
 }
 epilogueView(){
  const s=getDeadMailFinale();this.text(45,181,'CASE CLOSED / RETURN TO SENDER',26,'#f5b75a');
  this.text(45,236,'Vale used the dead as delivery recipients and the cemetery as a collection point. The marked delivery identified him; the separate records connected him to the earlier orders, resale and Florence’s marker.\n\nFlorence’s burial record remains exactly as it should be: nonexistent.',23,'#e8dbc0',1160);
  this.rect(45,393,330,225,0x252e35);this.rect(118,493,185,73,0x090d12);this.rect(97,460,225,35,0x111820);
  this.text(72,411,'THE LAST RINGTONE',21,'#f5b75a',300);this.text(90,579,'EXCLUSIVE SOUVENIR',17,'#aea4b4',270);
  PHONE_MESSAGES.forEach(([name],i)=>this.button(410,392+i*57,`${i+1}. ${name}`,()=>{const m=playDeadMailMessage(i);if(m){this.messageView=m;this.feedback='';this.render();}},805));
  this.text(45,638,this.feedback||(this.messageView?`${this.messageView[0]}: ${this.messageView[1]}`:'FLORENCE: “They removed my headstone. I asked to keep it. Marble is expensive.”'),20,'#e8dbc0',1160);
  this.button(45,710,s.rewardClaimed?'PHONE ALREADY CLAIMED':'CLAIM SOUVENIR PHONE',()=>{const r=claimDeadMailReward();this.say(r.message||'Reward could not be claimed.');},430,!s.rewardClaimed);
  this.button(855,710,'SAVE AGAIN',()=>this.say(saveDeadMailFinale()?'Progress saved.':'Saving failed. Keep this session open and check browser storage.'),360);
 }
}
