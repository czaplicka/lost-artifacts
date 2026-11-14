import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { NIGHT_EVENTS, NIGHT_FACTS, NIGHT_DEDUCTIONS, COURIER_TOPICS } from '../assets/data/deadMailNightData.js';
import { requireCemeteryMapEntry, cemeteryMapParent } from './homeCity/CemeteryMapAccess.js';
import { canStartDeadMailNight,beginDeadMailNight,getDeadMailNightProgress,setDeadMailNightStage,
 placeDeadMailEquipment,checkDeadMailCoverage,startDeadMailWatch,advanceDeadMailWatch,askDeadMailCourier,
 verifyDeadMailCourier,compareDeadMailCourierSheet,solveDeadMailNightDeduction,finishDeadMailNight } from '../managers/DeadMailNightManager.js';
const KEY='DeadMailNightScene';
export function openDeadMailNightPreview(game=window.game,data={}){
 if(!canStartDeadMailNight())throw Error('Complete the day-shift investigation first.');
 requireCemeteryMapEntry(game,'night',data);
 if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailNightScene,false);
 if(!game.scene.isActive(KEY))game.scene.start(KEY,data);game.scene.bringToTop(KEY);
}
export class DeadMailNightScene extends BaseScene{
 constructor(){super({key:KEY});}
 init(data={}){this.entrySource=data.entrySource||null;}
 create(){
  super.create();this.pausedKeys=[];this.hidden=[];this.page=null;this.feedback='';this.selectedEvent=null;this.courierPage='talk';this.deductionIndex=0;
  if(this.entrySource!=='cemetery-map'||!cemeteryMapParent(this.game,'night')||!canStartDeadMailNight()){this.scene.stop();return;}
  beginDeadMailNight();this.events.once('shutdown',this.restore,this);
  for(const s of [...this.scene.manager.getScenes(true)]){const k=s.sys.settings.key;if(k!==KEY&&k!=='__AssetWorkerScene'){this.pausedKeys.push(k);this.scene.pause(k);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){const el=document.querySelector(selector);if(!el)continue;this.hidden.push([el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);el.style.setProperty('display','none','important');}
  this.scale.on('resize',this.fit,this);if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());this.cameras.main.setBackgroundColor('#0c101b');this.render();
 }
 restore(){
  this.scale.off('resize',this.fit,this);this.page?.destroy(true);this.page=null;
  try{flushAutosave();}catch(e){console.error('[DeadMailNightScene] Autosave failed:',e);}
  for(const[el,value,priority]of this.hidden||[]){if(!el.isConnected)continue;if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');}
  for(const k of this.pausedKeys||[])if(this.scene.manager.keys[k]&&this.scene.isPaused(k))this.scene.resume(k);this.hidden=[];this.pausedKeys=[];
 }
 fit(){if(!this.page)return;const z=Math.min(this.scale.width/1280,this.scale.height/800);this.page.setScale(z).setPosition((this.scale.width-1280*z)/2,(this.scale.height-800*z)/2);}
 rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
 text(x,y,value,size=22,color='#e8dbc0',width=1160){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:7});this.page.add(t);return t;}
 button(x,y,label,fn,width=280,enabled=true){const r=this.rect(x,y,width,48,enabled?0x403844:0x24242e).setStrokeStyle(1,0x947956);this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#827c81',width-24);if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',fn).on('pointerover',()=>r.setFillStyle(0x625064)).on('pointerout',()=>r.setFillStyle(0x403844));return r;}
 go(stage){if(setDeadMailNightStage(stage)){this.feedback='';this.render();}}
 say(message){this.feedback=message;this.render();}
 render(){
  this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x111522);const s=getDeadMailNightProgress();this.text(40,22,__dialogueText("scenes/DeadMailNightScene.js", "t_4dff5a69fe94fba2c225"),27,'#f5b75a');this.text(40,65,__dialogueText("scenes/DeadMailNightScene.js", "t_f856431b97e692f53c07"),17,'#afa0b7');this.button(1040,24,__dialogueText("scenes/DeadMailNightScene.js", "t_1a77240cbe32baeb7bd4"),()=>this.scene.stop(),200);
  [['setup','EQUIPMENT',!s.started],['watch','TIMELINE',s.started],['courier',__dialogueText("scenes/DeadMailNightScene.js", "t_f5fbfc987e38c6562708"),s.eventIndex===NIGHT_EVENTS.length-1],['review','DEDUCTIONS',s.verified&&s.compared]].forEach(([id,label,enabled],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,enabled));
  const views={setup:()=>this.setupView(),watch:()=>this.watchView(),courier:()=>this.courierView(),review:()=>this.reviewView(),end:()=>this.endView()};(views[s.stage]||views.setup)();this.text(40,765,__dialogueText("scenes/DeadMailNightScene.js", "t_6e7d72b1a5ada118e34d"),14,'#998f9c');this.fit();
 }
 setupView(){
  const s=getDeadMailNightProgress();this.text(45,180,__dialogueText("scenes/DeadMailNightScene.js", "t_ca1232228722b283635f"),23,'#f5b75a');this.text(45,224,__dialogueText("scenes/DeadMailNightScene.js", "t_e676777fcae1efd620e6"),21);
  const locations=[['gate',__dialogueText("scenes/DeadMailNightScene.js", "t_38ec8466af0db726388d")],['chapel','CHAPEL'],['main',__dialogueText("scenes/DeadMailNightScene.js", "t_734da819d3039972588f")]];locations.forEach(([id,label],i)=>{const x=45+i*405;this.rect(x,276,380,151,0x27323b).setStrokeStyle(1,0x63727c);this.text(x+18,295,label,21,'#e6b66d',340);const assigned=[s.camera===id?'CAMERA':null,s.recorder===id?'RECORDER':null,s.observer===id?'YOU':null].filter(Boolean).join(' / ');this.text(x+18,351,assigned||__dialogueText("scenes/DeadMailNightScene.js", "t_4138bdbbe6ee3bd8f9f2"),19,'#d1c6d8',340);});
  [['camera','CAMERA'],['recorder','RECORDER'],['observer',__dialogueText("scenes/DeadMailNightScene.js", "t_69cb6153ee1e9aac0a15")]].forEach(([slot,label],row)=>{const y=451+row*60;this.text(45,y+10,label,18,'#baa9bf',185);locations.forEach(([id,place],i)=>this.button(245+i*330,y,(s[slot]===id?__dialogueText("scenes/DeadMailNightScene.js", "t_b3f8c4646fdce7641c55"):'')+place,()=>{placeDeadMailEquipment(slot,id);this.feedback='';this.render();},310));});
  this.text(45,648,this.feedback||__dialogueText("scenes/DeadMailNightScene.js", "t_e7cd40685245b52fe5df"),20,'#e8dbc0',1160);this.button(45,709,__dialogueText("scenes/DeadMailNightScene.js", "t_268df2ffc745a282ed0c"),()=>this.say(checkDeadMailCoverage().message),340);this.button(850,709,__dialogueText("scenes/DeadMailNightScene.js", "t_aeae39ca0ae5f096d17e"),()=>{const r=startDeadMailWatch();this.feedback=r.message||'';this.render();},370);
 }
 drawNight(x,y,w,h,mode){
  this.rect(x,y,w,h,0x17202f);const g=this.add.graphics();this.page.add(g);g.fillStyle(0xbcbda4);g.fillCircle(x+w*.84,y+48,23);g.fillStyle(0x28342e);g.fillRect(x,y+h-75,w,75);
  if(mode==='gate'){for(let i=0;i<7;i++)this.rect(x+50+i*33,y+70,7,h-120,0x727f81);this.rect(x+260,y+h-116,75,60,0x9b7751);g.fillStyle(0x55565e);g.fillTriangle(x+300,y+75,x+260,y+h-80,x+350,y+h-80);g.fillCircle(x+300,y+65,17);}
  else if(mode==='chapel'){g.fillStyle(0x343d49);g.fillTriangle(x+165,y+34,x+75,y+125,x+255,y+125);g.fillRect(x+95,y+125,145,h-160);g.fillStyle(0xb6b8aa);g.fillTriangle(x+170,y+140,x+140,y+h-60,x+203,y+h-60);g.fillCircle(x+171,y+137,15);}
  this.text(x+14,y+h-36,mode==='gate'?__dialogueText("scenes/DeadMailNightScene.js", "t_0ff88355ebb945ff3a27"):mode==='chapel'?__dialogueText("scenes/DeadMailNightScene.js", "t_5b819a5d4857c216f618"):__dialogueText("scenes/DeadMailNightScene.js", "t_cb69c896a1216548e4fc"),15,'#aeb7bc',w-25);
 }
 watchView(){
  const s=getDeadMailNightProgress();NIGHT_EVENTS.forEach((e,i)=>this.button(45+i*240,176,e.time,()=>{this.selectedEvent=i;this.feedback='';this.render();},220,i<=s.eventIndex));const selected=this.selectedEvent!==null&&this.selectedEvent<=s.eventIndex?this.selectedEvent:s.eventIndex,e=NIGHT_EVENTS[selected];
  this.drawNight(45,249,570,250,selected>=2?'gate':'empty');this.drawNight(645,249,570,250,selected>=1?'chapel':'empty');this.text(45,519,e?`${e.time} / ${e.title}`:__dialogueText("scenes/DeadMailNightScene.js", "t_de69a851e2b6ec19d11a"),23,'#f5b75a');this.text(45,563,e?.text||__dialogueText("scenes/DeadMailNightScene.js", "t_a52b6274bcfe329d8eca"),22,'#e8dbc0',1160);
  const next=NIGHT_EVENTS[s.eventIndex+1];if(next)this.button(815,710,`${__dialogueText("scenes/DeadMailNightScene.js", "t_9fbc9f1e0440445e2f9a")}${next.time}`,()=>{advanceDeadMailWatch();this.selectedEvent=null;this.feedback='';this.render();},400);else this.button(815,710,__dialogueText("scenes/DeadMailNightScene.js", "t_0c5bd905ac37ea881be9"),()=>this.go('courier'),400);this.text(45,715,`${__dialogueText("scenes/DeadMailNightScene.js", "t_1a8aa08769f4737825f3")}${s.eventIndex+1}${__dialogueText("scenes/DeadMailNightScene.js", "t_8a5edab282632443219e")}${NIGHT_EVENTS.length}`,17,'#afa0b7',650);
 }
 courierView(){
  const s=getDeadMailNightProgress();[['talk','INTERVIEW'],['verify',__dialogueText("scenes/DeadMailNightScene.js", "t_839883d29eb44537a6a9")],['sheet',__dialogueText("scenes/DeadMailNightScene.js", "t_ed2f605040b125889036")]].forEach(([id,label],i)=>this.button(45+i*405,176,label,()=>{this.courierPage=id;this.feedback='';this.render();},380));
  if(this.courierPage==='talk'){
   this.text(45,246,__dialogueText("scenes/DeadMailNightScene.js", "t_01ddf74b8711b7b4224e"),24,'#f5b75a');COURIER_TOPICS.forEach(([id,label],i)=>this.button(45,301+i*60,(s.topics.includes(id)?__dialogueText("scenes/DeadMailNightScene.js", "t_e6af8d7ad5760ccf946b"):'')+label,()=>{const r=askDeadMailCourier(id);this.say(r.message||__dialogueText("scenes/DeadMailNightScene.js", "t_bdd887161d022b7246cc"));},1170));this.text(45,557,this.feedback||__dialogueText("scenes/DeadMailNightScene.js", "t_8892a78269b41e62b2c6"),20,'#e8dbc0',1160);
  }else if(this.courierPage==='verify'){
   this.text(45,247,__dialogueText("scenes/DeadMailNightScene.js", "t_c2bd0eebcdd8725a28c3"),24,'#f5b75a');this.text(45,302,__dialogueText("scenes/DeadMailNightScene.js", "t_6e036d99320b19f4d4ae"),23,'#e8dbc0',1160);
   [['badge',__dialogueText("scenes/DeadMailNightScene.js", "t_16425d596bbc29d2aa02")],['witness',__dialogueText("scenes/DeadMailNightScene.js", "t_812e3cfb05bb0c5ab165")],['directory',__dialogueText("scenes/DeadMailNightScene.js", "t_0f90b4ebf64c2a38cb1c")]].forEach(([id,label],i)=>this.button(45,451+i*60,label,()=>{const r=verifyDeadMailCourier(id);this.say(r.message||__dialogueText("scenes/DeadMailNightScene.js", "t_8e2b10bfd3dd35e683af"));},1170,s.topics.includes('identity')));this.text(45,650,this.feedback||__dialogueText("scenes/DeadMailNightScene.js", "t_0f0c4aeac167fb8d93ba"),20,'#e8dbc0',1160);
  }else{
   this.rect(45,245,570,310,0xd9c8a4);this.rect(645,245,570,310,0xd9c8a4);this.text(65,263,__dialogueText("scenes/DeadMailNightScene.js", "t_ef4fa004ec0b843bec2c"),20,'#392f2c',530);this.text(65,315,__dialogueText("scenes/DeadMailNightScene.js", "t_20bc50cdfb271bc4a2a7"),20,'#392f2c',530);this.text(665,263,__dialogueText("scenes/DeadMailNightScene.js", "t_f8f81fd27ae71273d5c1"),20,'#392f2c',530);
   const available=s.verified&&s.topics.includes('records');this.text(665,315,available?__dialogueText("scenes/DeadMailNightScene.js", "t_68906c17f40eeca659dc"):__dialogueText("scenes/DeadMailNightScene.js", "t_e3bb296d93c34c37d041"),20,'#392f2c',530);
   this.button(45,578,__dialogueText("scenes/DeadMailNightScene.js", "t_6eb6d56e9cb125c6e969"),()=>{const r=compareDeadMailCourierSheet('buyer');this.say(r.message||__dialogueText("scenes/DeadMailNightScene.js", "t_ee4b96ac4df739113503"));},570,available);this.button(645,578,__dialogueText("scenes/DeadMailNightScene.js", "t_ea7c23daed5859727f9e"),()=>{const r=compareDeadMailCourierSheet('route');this.say(r.message||__dialogueText("scenes/DeadMailNightScene.js", "t_ee4b96ac4df739113503"));},570,available);this.text(45,649,this.feedback||__dialogueText("scenes/DeadMailNightScene.js", "t_1acce0c94d73a09b9e0f"),20,'#e8dbc0',1160);
  }this.button(855,711,__dialogueText("scenes/DeadMailNightScene.js", "t_cc8adb9d8147d36487d5"),()=>this.go('review'),360,s.verified&&s.compared);
 }
 reviewView(){const s=getDeadMailNightProgress();NIGHT_DEDUCTIONS.forEach((d,i)=>this.button(45+i*405,176,(s.deductions.includes(d.id)?__dialogueText("scenes/DeadMailNightScene.js", "t_cefb5974c0d93d670bb3"):'')+`${__dialogueText("scenes/DeadMailNightScene.js", "t_67f86c98b763a36c135d")}${i+1}`,()=>{this.deductionIndex=i;this.feedback='';this.render();},380));const d=NIGHT_DEDUCTIONS[this.deductionIndex]||NIGHT_DEDUCTIONS[0];this.text(45,250,d.question,25,'#f5b75a');d.options.forEach((label,i)=>this.button(45,328+i*64,label,()=>{const r=solveDeadMailNightDeduction(d.id,i);this.say((r.ok?__dialogueText("scenes/DeadMailNightScene.js", "t_1c7a19d407c779dcc15f"):__dialogueText("scenes/DeadMailNightScene.js", "t_fbf2505cc79141ea5005"))+(r.message||__dialogueText("scenes/DeadMailNightScene.js", "t_5dcdb9f6938b54921065")));},1170));this.text(45,554,this.feedback||__dialogueText("scenes/DeadMailNightScene.js", "t_ea83765c8ebe9ecd955d"),23,'#e8dbc0',1160);this.button(810,710,__dialogueText("scenes/DeadMailNightScene.js", "t_ff18329c32a073f07738"),()=>{if(finishDeadMailNight()){this.feedback='';this.render();}},405,s.deductions.length===3);}
 endView(){this.rect(45,188,1170,490,0x202d36);this.text(72,218,__dialogueText("scenes/DeadMailNightScene.js", "t_40a94e9c87edbe3a0be0"),28,'#f5b75a');this.text(72,283,__dialogueText("scenes/DeadMailNightScene.js", "t_3cca0c192ced6992a13a"),24,'#e8dbc0',1100);this.text(45,711,__dialogueText("scenes/DeadMailNightScene.js", "t_06b8626d026e0d75caf3"),20,'#f5b75a',1160);}
}
