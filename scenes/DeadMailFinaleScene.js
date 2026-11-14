import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { OPERATION_EVENTS, DISCLOSURES, REPORT_FIELDS, PHONE_MESSAGES } from '../assets/data/deadMailFinaleData.js';
import { requireCemeteryMapEntry, cemeteryMapParent } from './homeCity/CemeteryMapAccess.js';
import { canStartDeadMailFinale,beginDeadMailFinale,getDeadMailFinale,setDeadMailFinaleStage,
 chooseDeadMailPlan,checkDeadMailPlan,startDeadMailOperation,advanceDeadMailOperation,readDeadMailDisclosure,
 chooseDeadMailReport,submitDeadMailReport,claimDeadMailReward,playDeadMailMessage,saveDeadMailFinale } from '../managers/DeadMailFinaleManager.js';
const KEY='DeadMailFinaleScene';
export function openDeadMailFinalePreview(game=window.game,data={}){
 if(!canStartDeadMailFinale())throw Error('Complete the night-shift investigation first.');requireCemeteryMapEntry(game,'finale',data);
 if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailFinaleScene,false);
 if(!game.scene.isActive(KEY))game.scene.start(KEY,data);game.scene.bringToTop(KEY);
}
export class DeadMailFinaleScene extends BaseScene{
 constructor(){super({key:KEY});}
 init(data={}){this.entrySource=data.entrySource||null;}
 create(){
  super.create();this.pausedKeys=[];this.hidden=[];this.page=null;this.feedback='';this.eventView=null;this.disclosureId=null;this.reportIndex=0;this.messageView=null;
  if(this.entrySource!=='cemetery-map'||!cemeteryMapParent(this.game,'finale')||!canStartDeadMailFinale()){this.scene.stop();return;}
  beginDeadMailFinale();this.events.once('shutdown',this.restore,this);
  for(const s of [...this.scene.manager.getScenes(true)]){const k=s.sys.settings.key;if(k!==KEY&&k!=='__AssetWorkerScene'){this.pausedKeys.push(k);this.scene.pause(k);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){const el=document.querySelector(selector);if(!el)continue;this.hidden.push([el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);el.style.setProperty('display','none','important');}
  this.scale.on('resize',this.fit,this);if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());this.cameras.main.setBackgroundColor('#10131b');this.render();
 }
 restore(){
  this.scale.off('resize',this.fit,this);this.page?.destroy(true);this.page=null;try{flushAutosave();}catch(e){console.error('[DeadMailFinaleScene] Autosave failed:',e);}
  for(const[el,value,priority]of this.hidden||[]){if(!el.isConnected)continue;if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');}
  for(const k of this.pausedKeys||[])if(this.scene.manager.keys[k]&&this.scene.isPaused(k))this.scene.resume(k);this.hidden=[];this.pausedKeys=[];
 }
 fit(){if(!this.page)return;const z=Math.min(this.scale.width/1280,this.scale.height/800);this.page.setScale(z).setPosition((this.scale.width-1280*z)/2,(this.scale.height-800*z)/2);}
 rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
 text(x,y,value,size=22,color='#e8dbc0',width=1160){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:7});this.page.add(t);return t;}
 button(x,y,label,fn,width=280,enabled=true){const r=this.rect(x,y,width,48,enabled?0x493b3e:0x25252c).setStrokeStyle(1,0x947956);this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#827c81',width-24);if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',fn).on('pointerover',()=>r.setFillStyle(0x625054)).on('pointerout',()=>r.setFillStyle(0x493b3e));return r;}
 go(stage){if(setDeadMailFinaleStage(stage)){this.feedback='';this.render();}}
 say(message){this.feedback=message;this.render();}
 render(){
  this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x151721);const s=getDeadMailFinale();this.text(40,22,__dialogueText("scenes/DeadMailFinaleScene.js", "t_e2f7a080f60577e3c9c2"),26,'#f5b75a');this.text(40,65,__dialogueText("scenes/DeadMailFinaleScene.js", "t_bca664b516b67eae85a9"),17,'#bba4b4');this.button(1040,24,__dialogueText("scenes/DeadMailFinaleScene.js", "t_1a77240cbe32baeb7bd4"),()=>this.scene.stop(),200);
  [['plan',__dialogueText("scenes/DeadMailFinaleScene.js", "t_4ff4528f55eec577cf17"),!s.started],['operation','DELIVERY',s.started],['records','DISCLOSURES',s.eventIndex===OPERATION_EVENTS.length-1],['report',__dialogueText("scenes/DeadMailFinaleScene.js", "t_fcb9436872aeba716773"),s.facts.length===8&&!s.completed]].forEach(([id,label,enabled],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,enabled));
  const views={plan:()=>this.planView(),operation:()=>this.operationView(),records:()=>this.recordsView(),report:()=>this.reportView(),epilogue:()=>this.epilogueView()};(views[s.stage]||views.plan)();if(s.completed&&s.stage!=='epilogue')this.button(45,706,__dialogueText("scenes/DeadMailFinaleScene.js", "t_a7d102fca57529107262"),()=>this.go('epilogue'),320);this.text(40,765,__dialogueText("scenes/DeadMailFinaleScene.js", "t_24835a8917e7a63d2021"),14,'#a497a2');this.fit();
 }
 planView(){
  const s=getDeadMailFinale();this.text(45,180,__dialogueText("scenes/DeadMailFinaleScene.js", "t_68df0d65392dc3ffb5ff"),21,'#f5b75a');
  const groups=[['mark',__dialogueText("scenes/DeadMailFinaleScene.js", "t_faee0f43365f602e44f3"),[['none',__dialogueText("scenes/DeadMailFinaleScene.js", "t_b65935b96912394fb229")],['recorded',__dialogueText("scenes/DeadMailFinaleScene.js", "t_59e7c4363b30d17fc80e")]]],['coverage',__dialogueText("scenes/DeadMailFinaleScene.js", "t_5a0ab31f8f903b8b0980"),[['main',__dialogueText("scenes/DeadMailFinaleScene.js", "t_97304a64e5691d89efb1")],['continuous',__dialogueText("scenes/DeadMailFinaleScene.js", "t_4737d5d8788918720382")]]],['intervention',__dialogueText("scenes/DeadMailFinaleScene.js", "t_c3bfd3ec32aabd5f6a09"),[['costume',__dialogueText("scenes/DeadMailFinaleScene.js", "t_ee4564d65feb97a2e658")],['handover',__dialogueText("scenes/DeadMailFinaleScene.js", "t_f58a328748d65135d38a")],['documented',__dialogueText("scenes/DeadMailFinaleScene.js", "t_82e4d0293c91ff65d748")]]]];
  groups.forEach(([field,title,options],row)=>{const y=243+row*132;this.text(45,y,title,20,'#d8bd95');options.forEach(([value,label],i)=>this.button(45+i*400,y+39,(s[field]===value?__dialogueText("scenes/DeadMailFinaleScene.js", "t_b3f8c4646fdce7641c55"):'')+label,()=>{chooseDeadMailPlan(field,value);this.feedback='';this.render();},380));});
  this.text(45,643,this.feedback||__dialogueText("scenes/DeadMailFinaleScene.js", "t_8508375c8dcec69c4f91"),20,'#e8dbc0',1160);this.button(45,709,__dialogueText("scenes/DeadMailFinaleScene.js", "t_3da44af96652d1185f78"),()=>this.say(checkDeadMailPlan().message),320);this.button(855,709,__dialogueText("scenes/DeadMailFinaleScene.js", "t_020f7d92ae287e4a6398"),()=>{const r=startDeadMailOperation();this.feedback=r.message||'';this.render();},360);
 }
 operationView(){
  const s=getDeadMailFinale();OPERATION_EVENTS.forEach((e,i)=>this.button(45+i*240,176,e.time,()=>{this.eventView=i;this.render();},220,i<=s.eventIndex));const i=this.eventView!==null&&this.eventView<=s.eventIndex?this.eventView:s.eventIndex,e=OPERATION_EVENTS[i];this.rect(45,247,1170,260,0x26342f);this.rect(140,355,210,110,0x4a5554);this.text(161,373,__dialogueText("scenes/DeadMailFinaleScene.js", "t_18af3901386528ba8700"),25,'#e0c491',175);
  if(i>=2){this.rect(755,289,290,180,0x545c54);this.text(780,318,__dialogueText("scenes/DeadMailFinaleScene.js", "t_3a4b852ad48d5e557849"),25,'#efe0bc',250);}else this.text(690,330,__dialogueText("scenes/DeadMailFinaleScene.js", "t_177a933812b90005a33d"),25,'#bcc6bf',460);
  this.text(45,532,e?`${e.time} / ${e.title}`:__dialogueText("scenes/DeadMailFinaleScene.js", "t_7845515ff1268a58edd6"),23,'#f5b75a');this.text(45,582,e?.text||__dialogueText("scenes/DeadMailFinaleScene.js", "t_35eca4c28e1badb67693"),22,'#e8dbc0',1160);const next=OPERATION_EVENTS[s.eventIndex+1];if(next)this.button(820,710,`${__dialogueText("scenes/DeadMailFinaleScene.js", "t_b19d1c97b2459db2ad02")}${next.time}`,()=>{advanceDeadMailOperation();this.eventView=null;this.render();},395);else this.button(820,710,__dialogueText("scenes/DeadMailFinaleScene.js", "t_0247ac846fb13630a6a4"),()=>this.go('records'),395);
 }
 recordsView(){
  const s=getDeadMailFinale();Object.keys(DISCLOSURES).forEach((id,i)=>this.button(45+i*405,176,({orders:__dialogueText("scenes/DeadMailFinaleScene.js", "t_a63f68b88f4998d5f7d8"),resale:__dialogueText("scenes/DeadMailFinaleScene.js", "t_68836d1e18aa99da5999"),marker:__dialogueText("scenes/DeadMailFinaleScene.js", "t_2cbdfb7780fc2ba0e6c9")})[id],()=>{readDeadMailDisclosure(id);this.disclosureId=id;this.render();},380));const d=DISCLOSURES[this.disclosureId];this.rect(45,247,1170,392,0xd9c8a4);this.text(70,268,d?.title||__dialogueText("scenes/DeadMailFinaleScene.js", "t_a2beabcda1e090ea8a0d"),24,'#392f2c',1120);this.text(70,328,d?.text||__dialogueText("scenes/DeadMailFinaleScene.js", "t_512fcf7b8143b3915560"),23,'#392f2c',1110);this.text(45,662,__dialogueText("scenes/DeadMailFinaleScene.js", "t_d74a95222a34833c75e8"),20,'#bba4b4',1160);this.button(850,711,__dialogueText("scenes/DeadMailFinaleScene.js", "t_5e4caadd24b1c6092cd5"),()=>this.go('report'),365,s.facts.length===8);
 }
 reportView(){
  const s=getDeadMailFinale();REPORT_FIELDS.forEach((d,i)=>this.button(45+i*300,176,`${i+1}. ${s.report[d.id]===undefined?'CHOOSE':'SELECTED'}`,()=>{this.reportIndex=i;this.feedback='';this.render();},280));const d=REPORT_FIELDS[this.reportIndex]||REPORT_FIELDS[0];this.text(45,260,d.title,24,'#f5b75a');d.options.forEach((label,i)=>this.button(45,336+i*69,(s.report[d.id]===i?__dialogueText("scenes/DeadMailFinaleScene.js", "t_b3f8c4646fdce7641c55"):'')+label,()=>{chooseDeadMailReport(d.id,i);this.feedback='';this.render();},1170));this.text(45,586,this.feedback||__dialogueText("scenes/DeadMailFinaleScene.js", "t_eef5103d4a4414289949"),23,'#e8dbc0',1160);this.button(850,710,__dialogueText("scenes/DeadMailFinaleScene.js", "t_7653c1d0253b4ff7b687"),()=>{const r=submitDeadMailReport();this.feedback=r.message||__dialogueText("scenes/DeadMailFinaleScene.js", "t_d15a4d1539fa07c77061");this.render();},365,REPORT_FIELDS.every(d=>s.report[d.id]!==undefined));
 }
 epilogueView(){
  const s=getDeadMailFinale();this.text(45,181,__dialogueText("scenes/DeadMailFinaleScene.js", "t_9517ab2818f8f126a67e"),26,'#f5b75a');this.text(45,236,__dialogueText("scenes/DeadMailFinaleScene.js", "t_85c148839c2d60d2eacf"),23,'#e8dbc0',1160);this.rect(45,393,330,225,0x252e35);this.rect(118,493,185,73,0x090d12);this.rect(97,460,225,35,0x111820);this.text(72,411,__dialogueText("scenes/DeadMailFinaleScene.js", "t_9f83cbbd305f2cad52bb"),21,'#f5b75a',300);this.text(90,579,__dialogueText("scenes/DeadMailFinaleScene.js", "t_f951c3d4429c228aee8c"),17,'#aea4b4',270);
  PHONE_MESSAGES.forEach(([name],i)=>this.button(410,392+i*57,`${i+1}. ${name}`,()=>{const m=playDeadMailMessage(i);if(m){this.messageView=m;this.feedback='';this.render();}},805));this.text(45,638,this.feedback||(this.messageView?`${this.messageView[0]}: ${this.messageView[1]}`:__dialogueText("scenes/DeadMailFinaleScene.js", "t_4c1a6c633db1f2984e4e")),20,'#e8dbc0',1160);this.button(45,710,s.rewardClaimed?__dialogueText("scenes/DeadMailFinaleScene.js", "t_1e4f9f11fb07a74bea5e"):__dialogueText("scenes/DeadMailFinaleScene.js", "t_93a0c7ee9bb872e122d2"),()=>{const r=claimDeadMailReward();this.say(r.message||__dialogueText("scenes/DeadMailFinaleScene.js", "t_57ea421e1b03f1ebc9fa"));},430,!s.rewardClaimed);this.button(855,710,__dialogueText("scenes/DeadMailFinaleScene.js", "t_cbf4c93246dc8ef7ef89"),()=>this.say(saveDeadMailFinale()?__dialogueText("scenes/DeadMailFinaleScene.js", "t_13d802933193c7b1c7af"):__dialogueText("scenes/DeadMailFinaleScene.js", "t_7d2d6cd2d75512f4da0f")),360);
 }
}
