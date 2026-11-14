import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { STAFF, FACTS, DOCUMENTS, DEDUCTIONS } from '../assets/data/deadMailChapterTwo.js';
import { DEAD_MAIL_ART, DEAD_MAIL_PORTRAITS, DEAD_MAIL_DAY_TEXTURES, containRect, referenceRect } from '../config/deadMailArtConfig.js';
import { acquireSideQuestAssets } from '../managers/SideQuestAssetScope.js';
import { requireCemeteryMapEntry, cemeteryMapParent } from './homeCity/CemeteryMapAccess.js';
import { beginDeadMailPreview,getDeadMailProgress,setDeadMailStage,canUseDeadMailStage,
 recordDeadMailFact,chooseDeadMailSector,isDeadMailPreviewEnabled,inspectDeadMailObject,
 talkDeadMailStaff,inspectDeadMailDocument,compareDeadMailRecipients,solveDeadMailDeduction,finishDeadMailDay } from '../managers/DeadMailManager.js';
const KEY='DeadMailScene',WORKER='__AssetWorkerScene';
const CEMETERY_STAGES=new Set(['arrival','cemetery','staff','records','deduction','nightLead']);
function officeMeetingAllowed(game){
 const p=getDeadMailProgress(),office=game?.scene?.keys?.DetectiveOfficeScene;
 return Boolean(office?.sys?.isActive?.()&&p.clues.length===3&&!p.chapterComplete&&!p.dayComplete&&!p.finale?.completed);
}
export function openDeadMailPreview(game=window.game,data={}){
 if(!isDeadMailPreviewEnabled())throw Error('Accept Dead Mail in the office first.');
 if(getDeadMailProgress().clues.length!==3)throw Error('Inspect Florence’s photo attachment first.');
 if(!game?.scene)throw Error('The game is not ready.');
 if(data.entrySource==='office-meeting'){
  if(!officeMeetingAllowed(game))throw Error('This office meeting is not available. Continue from the cemetery gate.');
 }else requireCemeteryMapEntry(game,'day',data);
 if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailScene,false);
 if(!game.scene.isActive(KEY))game.scene.start(KEY,data);game.scene.bringToTop(KEY);
}
export class DeadMailScene extends BaseScene{
 constructor(){super({key:KEY});}
 init(data={}){this.entrySource=data.entrySource||null;this.meetingMode=this.entrySource==='office-meeting';}
 create(){
  super.create();Object.assign(this,{pausedKeys:[],hidden:[],page:null,feedback:'',person:'admin',documentId:null,deductionIndex:0,
   disposed:false,artReady:false,loadingArt:false,loadError:'',assetScope:null,artToken:null,debugHotspots:false});
  const valid=this.meetingMode?officeMeetingAllowed(this.game):this.entrySource==='cemetery-map'&&cemeteryMapParent(this.game,'day');
  if(!valid||!isDeadMailPreviewEnabled()||getDeadMailProgress().clues.length!==3){this.scene.stop();return;}
  const p=beginDeadMailPreview();
  if(this.meetingMode){if(!['client','map'].includes(p.stage)||!canUseDeadMailStage(p.stage))setDeadMailStage(p.questions.length===3?'map':'client');}
  else if(!CEMETERY_STAGES.has(p.stage)||!canUseDeadMailStage(p.stage))setDeadMailStage('cemetery');
  this.events.once('shutdown',this.restore,this);
  for(const scene of [...this.scene.manager.getScenes(true)]){const key=scene.sys.settings.key;if(key!==KEY&&key!==WORKER){this.pausedKeys.push(key);this.scene.pause(key);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){const element=document.querySelector(selector);if(!element)continue;
   this.hidden.push([element,element.style.getPropertyValue('display'),element.style.getPropertyPriority('display')]);element.style.setProperty('display','none','important');}
  this.scale.on('resize',this.fit,this);
  if(this.input.keyboard){this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());this.trackInputEvent(this.input.keyboard,'keydown-H',()=>{if(this.artReady){this.debugHotspots=!this.debugHotspots;this.render();}});}
  this.cameras.main.setBackgroundColor('#10131b');void this.loadArt();
 }
 async loadArt(){
  if(this.disposed||this.loadingArt)return;const token=Symbol('dead-mail-art');this.artToken=token;this.loadingArt=true;this.loadError='';this.artReady=false;this.render();
  this.assetScope?.release();const scope=acquireSideQuestAssets(this.game);this.assetScope=scope;
  try{await scope.ready;if(this.disposed||this.artToken!==token){scope.release();return;}const missing=DEAD_MAIL_DAY_TEXTURES.filter(k=>!this.textures.exists(k));if(missing.length)throw Error(`Missing textures: ${missing.join(', ')}`);this.artReady=true;}
  catch(error){scope.release();if(this.disposed||this.artToken!==token)return;this.loadError=error.message||String(error);console.error('[DeadMailScene]',error);}
  finally{if(!this.disposed&&this.artToken===token){this.loadingArt=false;this.render();}}
 }
 restore(){
  if(this.disposed)return;this.disposed=true;this.artToken=null;this.scale.off('resize',this.fit,this);this.page?.destroy(true);this.page=null;this.assetScope?.release();this.assetScope=null;
  try{flushAutosave();}catch(e){console.error('[DeadMailScene] Autosave failed:',e);}
  for(const[element,value,priority]of this.hidden||[]){if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');}
  for(const key of this.pausedKeys||[])if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);this.hidden=[];this.pausedKeys=[];
 }
 fit(){if(!this.page)return;const s=Math.min(this.scale.width/1280,this.scale.height/800);this.page.setScale(s).setPosition((this.scale.width-1280*s)/2,(this.scale.height-800*s)/2);}
 text(x,y,value,size=24,color='#e8dbc0',width=1100){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:5});this.page.add(t);return t;}
 rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
 button(x,y,label,callback,width=260,enabled=true){const r=this.rect(x,y,width,48,enabled?0x493c36:0x28272b).setStrokeStyle(1,0x927955);const t=this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#8c8581',width-24);if(t.height>32)t.setFontSize(15);if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(!this.disposed)callback();}).on('pointerover',()=>r.setFillStyle(0x665046)).on('pointerout',()=>r.setFillStyle(0x493c36));return r;}
 imageFit(key,box){const src=this.textures.get(key).getSourceImage(),f=containRect(src.width,src.height,box);this.page.add(this.add.image(f.x,f.y,key).setOrigin(0).setDisplaySize(f.width,f.height));return f;}
 portrait(id,x=45,y=245,w=290,h=425){this.rect(x,y,w,h,0x20232b).setStrokeStyle(1,0x927955);this.imageFit(DEAD_MAIL_PORTRAITS[id],{x:x+5,y:y+5,width:w-10,height:h-10});}
 art(config,box){this.rect(box.x,box.y,box.width,box.height,0x171c23);const f=this.imageFit(config.key,box);for(const c of config.captions){const r=referenceRect(c.rect,config.reference,f);this.text(r.x+r.width/2,r.y+r.height/2,c.text,c.size*f.width/config.reference.width,c.color,r.width).setOrigin(0.5).setAlign('center').setLineSpacing(1);}return f;}
 hotspots(config,frame,found,onSelect){for(const def of config.hotspots){const r=referenceRect(def.rect,config.reference,frame),known=found.includes(def.id);const plate=this.rect(r.x,r.y,r.width,r.height,0xffc65c,this.debugHotspots?0.16:known?0.05:0).setName(`dm:${config.key}:${def.id}`).setStrokeStyle(this.debugHotspots||known?1:0,0xe7b867);plate.setInteractive({useHandCursor:true}).on('pointerover',()=>plate.setFillStyle(0xffc65c,0.13)).on('pointerout',()=>plate.setFillStyle(0xffc65c,this.debugHotspots?0.16:known?0.05:0)).on('pointerup',()=>{if(!this.disposed)onSelect(def.id);});if(this.debugHotspots)this.text(r.x+3,r.y+3,def.id,12,'#fff1aa',Math.max(20,r.width-6));}}
 go(stage){
  const permitted=this.meetingMode?['client','map'].includes(stage):CEMETERY_STAGES.has(stage);
  if(this.artReady&&permitted&&setDeadMailStage(stage)){this.feedback='';this.render();}
 }
 say(value){this.feedback=value;this.render();}
 render(){
  if(this.disposed)return;this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x141923);
  this.text(40,22,this.meetingMode?__dialogueText("scenes/DeadMailScene.js", "t_9ad3eda14ec3fee38273"):__dialogueText("scenes/DeadMailScene.js", "t_a7616c7ba997fccf970e"),25,'#f5b75a');this.button(1025,24,this.meetingMode?__dialogueText("scenes/DeadMailScene.js", "t_ff5f9aad3fd2c4689b70"):__dialogueText("scenes/DeadMailScene.js", "t_1a77240cbe32baeb7bd4"),()=>this.scene.stop(),215);
  if(!this.artReady){this.text(45,190,this.loadError?__dialogueText("scenes/DeadMailScene.js", "t_5e39289a23a88bad9516"):__dialogueText("scenes/DeadMailScene.js", "t_4f03f11b80f940cd889a"),25,'#f5b75a');this.text(45,265,this.loadError||__dialogueText("scenes/DeadMailScene.js", "t_bd8d843fa9071fd338a9"),22,'#e8dbc0',1160);if(this.loadError)this.button(45,550,__dialogueText("scenes/DeadMailScene.js", "t_72e79972bd5158ffebb8"),()=>void this.loadArt(),330,!this.loadingArt);this.fit();return;}
  const s=getDeadMailProgress();
  if(this.meetingMode){
   this.text(40,65,__dialogueText("scenes/DeadMailScene.js", "t_a42375e9a48b023ff4b7"),17,'#baa88c');
   if(s.chapterComplete)this.locationReady();
   else{[['client',__dialogueText("scenes/DeadMailScene.js", "t_c512b3d8349b215418c5")],['map',__dialogueText("scenes/DeadMailScene.js", "t_88ecf1798122d5c8c022")]].forEach(([id,label],i)=>this.button(40+i*600,106,label,()=>this.go(id),580,canUseDeadMailStage(id)));if(s.stage==='map')this.map();else this.client();}
  }else{
   this.text(40,65,__dialogueText("scenes/DeadMailScene.js", "t_b65542b2f67d43dfb5b1"),17,'#baa88c');
   [['cemetery','GROUNDS'],['staff','STAFF'],['records','RECORDS'],['deduction','DEDUCTIONS']].forEach(([id,label],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,canUseDeadMailStage(id)));
   const views={arrival:()=>this.arrival(),cemetery:()=>this.cemetery(),staff:()=>this.staff(),records:()=>this.records(),deduction:()=>this.deduction(),nightLead:()=>this.nightLead()};(views[s.stage]||views.cemetery)();
  }
  this.text(40,770,this.meetingMode?__dialogueText("scenes/DeadMailScene.js", "t_1cf50ed532aa809edae8"):__dialogueText("scenes/DeadMailScene.js", "t_da6b2f81373cad58fbe5"),13,'#a4978c');this.fit();
 }
 locationReady(){
  this.text(60,195,__dialogueText("scenes/DeadMailScene.js", "t_8e80b286b443e55c3abd"),27,'#f5b75a');
  this.text(60,275,__dialogueText("scenes/DeadMailScene.js", "t_bc04156710f4e46ae7db"),25,'#e8dbc0',1120);
  this.text(60,660,__dialogueText("scenes/DeadMailScene.js", "t_ce592b0acce8ff5a19bb"),21,'#baa88c',1120);
 }
 client(){
  const s=getDeadMailProgress();this.portrait('florence',45,235,290,440);this.text(370,185,__dialogueText("scenes/DeadMailScene.js", "t_f7d858a76dceda8716d8"),23,'#f5b75a',845);this.text(370,246,__dialogueText("scenes/DeadMailScene.js", "t_43ee834a6098f8bc5c6e"),24,'#e8dbc0',840);
  [['pulse',__dialogueText("scenes/DeadMailScene.js", "t_b16c8433df40dfd28520")],['order',__dialogueText("scenes/DeadMailScene.js", "t_90f5d9a04b264dcafa71")],['work',__dialogueText("scenes/DeadMailScene.js", "t_4fbe48d4a1946b606bf2")]].forEach(([id,label],i)=>this.button(370,365+i*65,(s.questions.includes(id)?__dialogueText("scenes/DeadMailScene.js", "t_07ed162e36bf602acc8d"):'')+label,()=>{recordDeadMailFact(id);this.say({pulse:__dialogueText("scenes/DeadMailScene.js", "t_065b9b4ba51e635d6527"),order:__dialogueText("scenes/DeadMailScene.js", "t_de8672c491f566fddd8c"),work:__dialogueText("scenes/DeadMailScene.js", "t_fa4a2c375dfe6c4a8649")}[id]);},845));
  this.text(370,581,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_72f55b13ba474357a9ce"),20,'#e8dbc0',840);this.button(850,697,__dialogueText("scenes/DeadMailScene.js", "t_bb0a3802ce451fd5470c"),()=>this.go('map'),370,s.questions.length===3);
 }
 map(){
  this.text(45,183,__dialogueText("scenes/DeadMailScene.js", "t_69f95b4664173b63d528"),22);
  [['north',__dialogueText("scenes/DeadMailScene.js", "t_4048541d59ac0ab0425d"),__dialogueText("scenes/DeadMailScene.js", "t_24cd1cf712f78ed16729")],['west',__dialogueText("scenes/DeadMailScene.js", "t_be5fbc45da2547f79d36"),__dialogueText("scenes/DeadMailScene.js", "t_cb3f38ff482ce5d7391c")],['east',__dialogueText("scenes/DeadMailScene.js", "t_f650a7f4894adb497138"),__dialogueText("scenes/DeadMailScene.js", "t_8c641e78d4aab7e80d55")]].forEach(([id,title,description],i)=>{const x=45+i*405;this.rect(x,245,380,330,0x303b35).setStrokeStyle(2,0x8c947c);this.text(x+22,272,title,22,'#f5b75a',335);this.text(x+22,344,description,23,'#e0ddc4',330);this.button(x+20,505,__dialogueText("scenes/DeadMailScene.js", "t_b480c98390927663090d"),()=>{const r=chooseDeadMailSector(id);this.feedback=r.message||'';this.render();},340);});
  this.text(45,610,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_f54ad3ddf9f1bba04095"),22,'#f5b75a',1170);this.text(45,688,__dialogueText("scenes/DeadMailScene.js", "t_e7c017382d4f80355b79"),17,'#baa88c');
 }
 arrival(){this.text(45,178,__dialogueText("scenes/DeadMailScene.js", "t_e3b9a261a87ac8629686"),23,'#f5b75a');this.art(DEAD_MAIL_ART.cemetery,{x:40,y:220,width:820,height:461});this.portrait('florence',900,220,300,360);this.text(900,598,__dialogueText("scenes/DeadMailScene.js", "t_8288f9b44aa9f0eb5a96"),22,'#e8dbc0',300);this.text(45,700,__dialogueText("scenes/DeadMailScene.js", "t_ae49113c58bec42fa390"),19,'#e8dbc0',720);this.button(810,700,__dialogueText("scenes/DeadMailScene.js", "t_b6036c4b5149c7b5e89f"),()=>this.go('cemetery'),420);}
 cemetery(){
  const s=getDeadMailProgress();this.text(45,176,__dialogueText("scenes/DeadMailScene.js", "t_beb8d0a67a0ffd5759b1"),23,'#f5b75a');this.text(45,208,__dialogueText("scenes/DeadMailScene.js", "t_43f95224a395db920c45"),18);const f=this.art(DEAD_MAIL_ART.cemetery,{x:40,y:242,width:835,height:469.6875});this.hotspots(DEAD_MAIL_ART.cemetery,f,s.cemeteryFacts,id=>{inspectDeadMailObject(id);this.say(FACTS[id][1]);});
  this.text(915,255,__dialogueText("scenes/DeadMailScene.js", "t_76b503bdd7e02def442a"),20,'#f5b75a',300);[['admin','ADMINISTRATOR'],['gravedigger','GROUNDSKEEPER'],['florist','FLORIST']].forEach(([id,label],i)=>this.button(905,310+i*75,label,()=>{this.person=id;this.go('staff');},310));this.text(915,568,`${__dialogueText("scenes/DeadMailScene.js", "t_3e295d4e3ce3997a86e2")}${['marker','carton','lock'].filter(id=>s.cemeteryFacts.includes(id)).length}${__dialogueText("scenes/DeadMailScene.js", "t_8d2cedfe81c77aaa05d9")}`,19,'#baa88c',290);this.text(45,723,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_4415344950bb10f3f990"),17,'#e8dbc0',1160);
 }
 staff(){
  const s=getDeadMailProgress(),person=Object.hasOwn(STAFF,this.person)?this.person:'admin',npc=STAFF[person];[['admin','VALE'],['gravedigger','GRAVES'],['florist','THORNE']].forEach(([id,label],i)=>this.button(45+i*400,176,label,()=>{this.person=id;this.feedback='';this.render();},380));this.portrait(person,45,245,290,420);this.text(370,246,npc.name,23,'#f5b75a',840);this.text(370,291,npc.opening,21,'#e8dbc0',840);
  npc.topics.forEach(([id,label],i)=>this.button(370,393+i*61,(s.staffTopics.includes(`${person}:${id}`)?__dialogueText("scenes/DeadMailScene.js", "t_e6af8d7ad5760ccf946b"):'')+label,()=>{const r=talkDeadMailStaff(person,id);this.say(r.message||__dialogueText("scenes/DeadMailScene.js", "t_bdd887161d022b7246cc"));},845));this.text(370,591,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_a51839e5f0fd680a0c25"),18,'#e8dbc0',835);this.button(45,698,__dialogueText("scenes/DeadMailScene.js", "t_93ff56e1c5e96c4dfdb9"),()=>this.go('cemetery'),320);this.button(860,698,__dialogueText("scenes/DeadMailScene.js", "t_d34597120c45c00d0858"),()=>this.go('records'),355,canUseDeadMailStage('records'));
 }
 records(){
  const s=getDeadMailProgress();this.imageFit('dead_mail_administration',{x:40,y:175,width:1200,height:570});this.rect(40,175,1200,570,0x10131b,0.42);Object.keys(DOCUMENTS).forEach((id,i)=>this.button(45+i*400,185,{register:__dialogueText("scenes/DeadMailScene.js", "t_b3e4c0cc9e55179c8b6b"),gateLog:__dialogueText("scenes/DeadMailScene.js", "t_830a92b9ebe4d5907264"),manifest:__dialogueText("scenes/DeadMailScene.js", "t_ad80bcbd19d89ee7fe62")}[id],()=>{inspectDeadMailDocument(id);this.documentId=id;this.feedback='';this.render();},380));
  const doc=DOCUMENTS[this.documentId];this.rect(45,253,740,393,0xd9c8a4);this.text(68,272,doc?.title||__dialogueText("scenes/DeadMailScene.js", "t_49c0c08206f99da34c07"),21,'#392f2c',694);this.text(68,324,doc?.text||__dialogueText("scenes/DeadMailScene.js", "t_e18231c3bce8a64729a9"),20,'#392f2c',694);this.rect(805,253,420,393,0x1b2026,0.95);this.text(825,273,'CROSS-REFERENCE',22,'#f5b75a',370);this.text(825,315,__dialogueText("scenes/DeadMailScene.js", "t_ddc97b9ffae90f76dc70"),22,'#e8dbc0',370);
  const ready=['register','gateLog','manifest'].every(id=>s.cemeteryFacts.includes(id));[['four',__dialogueText("scenes/DeadMailScene.js", "t_3ce2e93ea913f9952e9f")],['three',__dialogueText("scenes/DeadMailScene.js", "t_be7d30d458ca2d5569de")],['none',__dialogueText("scenes/DeadMailScene.js", "t_35ad26949a072e12ad56")]].forEach(([id,label],i)=>this.button(820,424+i*65,label,()=>{const r=compareDeadMailRecipients(id);this.say(r.message||__dialogueText("scenes/DeadMailScene.js", "t_8830c0e280dc0500da34"));},390,ready));this.text(45,660,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_0f0910dd01a0017720a0"),18,'#e8dbc0',1160);this.button(865,710,__dialogueText("scenes/DeadMailScene.js", "t_0948541afbd3cf38603c"),()=>this.go('deduction'),350,canUseDeadMailStage('deduction'));
 }
 deduction(){
  const s=getDeadMailProgress();this.text(45,178,__dialogueText("scenes/DeadMailScene.js", "t_c39352951dac9e31935a"),24,'#f5b75a');DEDUCTIONS.forEach((d,i)=>this.button(45+i*400,228,(s.deductions.includes(d.id)?__dialogueText("scenes/DeadMailScene.js", "t_cefb5974c0d93d670bb3"):'')+`${__dialogueText("scenes/DeadMailScene.js", "t_67f86c98b763a36c135d")}${i+1}`,()=>{this.deductionIndex=i;this.feedback='';this.render();},380));const d=DEDUCTIONS[this.deductionIndex]||DEDUCTIONS[0];this.text(45,307,d.question,26,'#e8dbc0',1170);
  d.options.forEach((label,i)=>this.button(45,384+i*65,label,()=>{const r=solveDeadMailDeduction(d.id,i);this.say((r.ok?__dialogueText("scenes/DeadMailScene.js", "t_1c7a19d407c779dcc15f"):__dialogueText("scenes/DeadMailScene.js", "t_fbf2505cc79141ea5005"))+(r.message||__dialogueText("scenes/DeadMailScene.js", "t_7f39fbb02506718dac9c")));},1170));this.text(45,594,this.feedback||__dialogueText("scenes/DeadMailScene.js", "t_e94c1206bb27e566ad6c"),22,'#e8dbc0',1160);this.button(830,690,__dialogueText("scenes/DeadMailScene.js", "t_c0a35a8412f8dbbba222"),()=>{if(finishDeadMailDay()){this.feedback='';this.render();}},385,s.deductions.length===3);
 }
 nightLead(){this.art(DEAD_MAIL_ART.cemetery,{x:45,y:190,width:710,height:399.375});this.text(790,205,__dialogueText("scenes/DeadMailScene.js", "t_f762738b451dded779a1"),25,'#f5b75a',425);this.text(790,271,__dialogueText("scenes/DeadMailScene.js", "t_36086147f43291edd8ad"),23,'#e8dbc0',425);this.text(45,620,__dialogueText("scenes/DeadMailScene.js", "t_28dfc65a4dac67003ad6"),23,'#e8dbc0',1160);this.text(45,703,__dialogueText("scenes/DeadMailScene.js", "t_52b4145835cea2d332dd"),20,'#f5b75a',1160);}
}
