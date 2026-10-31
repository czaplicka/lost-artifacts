import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { STAFF, FACTS, DOCUMENTS, DEDUCTIONS } from '../assets/data/deadMailChapterTwo.js';
import { DEAD_MAIL_ART, DEAD_MAIL_PORTRAITS, DEAD_MAIL_DAY_TEXTURES, containRect, referenceRect } from '../config/deadMailArtConfig.js';
import { acquireSideQuestAssets } from '../managers/SideQuestAssetScope.js';
import { beginDeadMailPreview,getDeadMailProgress,setDeadMailStage,canUseDeadMailStage,
 recordDeadMailFact,chooseDeadMailSector,isDeadMailPreviewEnabled,inspectDeadMailObject,
 talkDeadMailStaff,inspectDeadMailDocument,compareDeadMailRecipients,solveDeadMailDeduction,finishDeadMailDay } from '../managers/DeadMailManager.js';
const KEY='DeadMailScene',WORKER='__AssetWorkerScene';
const FIELD_STAGES=new Set(['client','map','arrival','cemetery','staff','records','deduction','nightLead']);
export function openDeadMailPreview(game=window.game){
 if(!isDeadMailPreviewEnabled())throw Error('Accept Dead Mail in the office first.');
 if(getDeadMailProgress().clues.length!==3)throw Error('Inspect Florence’s photo attachment in the office mailbox first.');
 if(!game?.scene)throw Error('The game is not ready.');
 if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailScene,false);
 if(!game.scene.isActive(KEY))game.scene.start(KEY);game.scene.bringToTop(KEY);
}
export class DeadMailScene extends BaseScene{
 constructor(){super({key:KEY});}
 create(){
  super.create();Object.assign(this,{pausedKeys:[],hidden:[],page:null,feedback:'',person:'admin',documentId:null,deductionIndex:0,
   disposed:false,artReady:false,loadingArt:false,loadError:'',assetScope:null,artToken:null,debugHotspots:false});
  if(!isDeadMailPreviewEnabled()||getDeadMailProgress().clues.length!==3){this.scene.stop();return;}
  const p=beginDeadMailPreview();
  if(!FIELD_STAGES.has(p.stage)||!canUseDeadMailStage(p.stage))setDeadMailStage(p.chapterComplete?'cemetery':p.questions.length===3?'map':'client');
  this.events.once('shutdown',this.restore,this);
  for(const scene of [...this.scene.manager.getScenes(true)]){const key=scene.sys.settings.key;if(key!==KEY&&key!==WORKER){this.pausedKeys.push(key);this.scene.pause(key);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){const element=document.querySelector(selector);if(!element)continue;
   this.hidden.push([element,element.style.getPropertyValue('display'),element.style.getPropertyPriority('display')]);element.style.setProperty('display','none','important');}
  this.scale.on('resize',this.fit,this);
  if(this.input.keyboard){this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());
   this.trackInputEvent(this.input.keyboard,'keydown-H',()=>{if(this.artReady){this.debugHotspots=!this.debugHotspots;this.render();}});}
  this.cameras.main.setBackgroundColor('#10131b');void this.loadArt();
 }
 async loadArt(){
  if(this.disposed||this.loadingArt)return;const token=Symbol('dead-mail-field-art');this.artToken=token;this.loadingArt=true;this.loadError='';this.artReady=false;this.render();
  this.assetScope?.release();const scope=acquireSideQuestAssets(this.game);this.assetScope=scope;
  try{await scope.ready;if(this.disposed||this.artToken!==token){scope.release();return;}
   const missing=DEAD_MAIL_DAY_TEXTURES.filter(k=>!this.textures.exists(k));if(missing.length)throw Error(`Missing textures: ${missing.join(', ')}`);this.artReady=true;
  }catch(error){scope.release();if(this.disposed||this.artToken!==token)return;this.loadError=error.message||String(error);console.error('[DeadMailScene]',error);}
  finally{if(!this.disposed&&this.artToken===token){this.loadingArt=false;this.render();}}
 }
 restore(){
  if(this.disposed)return;this.disposed=true;this.artToken=null;this.scale.off('resize',this.fit,this);this.page?.destroy(true);this.page=null;this.assetScope?.release();this.assetScope=null;
  try{flushAutosave();}catch(e){console.error('[DeadMailScene] Autosave failed:',e);}
  for(const[element,value,priority]of this.hidden||[]){if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');}
  for(const key of this.pausedKeys||[])if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
  this.hidden=[];this.pausedKeys=[];
 }
 fit(){if(!this.page)return;const s=Math.min(this.scale.width/1280,this.scale.height/800);this.page.setScale(s).setPosition((this.scale.width-1280*s)/2,(this.scale.height-800*s)/2);}
 text(x,y,value,size=24,color='#e8dbc0',width=1100){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:5});this.page.add(t);return t;}
 rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
 button(x,y,label,callback,width=260,enabled=true){
  const r=this.rect(x,y,width,48,enabled?0x493c36:0x28272b).setStrokeStyle(1,0x927955);
  const t=this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#8c8581',width-24);if(t.height>32)t.setFontSize(15);
  if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(!this.disposed)callback();}).on('pointerover',()=>r.setFillStyle(0x665046)).on('pointerout',()=>r.setFillStyle(0x493c36));return r;
 }
 imageFit(key,box){const src=this.textures.get(key).getSourceImage(),f=containRect(src.width,src.height,box);this.page.add(this.add.image(f.x,f.y,key).setOrigin(0).setDisplaySize(f.width,f.height));return f;}
 portrait(id,x=45,y=245,w=290,h=425){this.rect(x,y,w,h,0x20232b).setStrokeStyle(1,0x927955);this.imageFit(DEAD_MAIL_PORTRAITS[id],{x:x+5,y:y+5,width:w-10,height:h-10});}
 art(config,box){
  this.rect(box.x,box.y,box.width,box.height,0x171c23);const f=this.imageFit(config.key,box);
  for(const c of config.captions){const r=referenceRect(c.rect,config.reference,f);this.text(r.x+r.width/2,r.y+r.height/2,c.text,c.size*f.width/config.reference.width,c.color,r.width).setOrigin(0.5).setAlign('center').setLineSpacing(1);}return f;
 }
 hotspots(config,frame,found,onSelect){
  for(const def of config.hotspots){const r=referenceRect(def.rect,config.reference,frame),known=found.includes(def.id);
   const plate=this.rect(r.x,r.y,r.width,r.height,0xffc65c,this.debugHotspots?0.16:known?0.05:0).setName(`dm:${config.key}:${def.id}`).setStrokeStyle(this.debugHotspots||known?1:0,0xe7b867);
   plate.setInteractive({useHandCursor:true}).on('pointerover',()=>plate.setFillStyle(0xffc65c,0.13)).on('pointerout',()=>plate.setFillStyle(0xffc65c,this.debugHotspots?0.16:known?0.05:0)).on('pointerup',()=>{if(!this.disposed)onSelect(def.id);});
   if(this.debugHotspots)this.text(r.x+3,r.y+3,def.id,12,'#fff1aa',Math.max(20,r.width-6));
  }
 }
 go(stage){if(this.artReady&&FIELD_STAGES.has(stage)&&setDeadMailStage(stage)){this.feedback='';this.render();}}
 say(value){this.feedback=value;this.render();}
 render(){
  if(this.disposed)return;this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x141923);
  this.text(40,22,'DEAD MAIL / FIELD INVESTIGATION',25,'#f5b75a');this.button(1025,24,'BACK TO OFFICE',()=>this.scene.stop(),215);
  if(!this.artReady){this.text(45,190,this.loadError?'SCENE COULD NOT BE LOADED':'LOADING THE INVESTIGATION...',25,'#f5b75a');this.text(45,265,this.loadError||'Loading the cemetery case assets.',22,'#e8dbc0',1160);if(this.loadError)this.button(45,550,'RETRY LOADING',()=>void this.loadArt(),330,!this.loadingArt);this.fit();return;}
  const s=getDeadMailProgress(),chapterTwo=['cemetery','staff','records','deduction','nightLead'].includes(s.stage);
  this.text(40,65,chapterTwo?'THE DAY SHIFT':'MEET FLORENCE / ESTABLISH THE LOCATION',17,'#baa88c');
  const tabs=chapterTwo?[['cemetery','GROUNDS'],['staff','STAFF'],['records','RECORDS'],['deduction','DEDUCTIONS']]:[['client','INTERVIEW FLORENCE'],['map','CEMETERY PLAN']];
  tabs.forEach(([id,label],i)=>this.button(40+i*(chapterTwo?300:600),106,label,()=>this.go(id),chapterTwo?280:580,canUseDeadMailStage(id)));
  const views={client:()=>this.client(),map:()=>this.map(),arrival:()=>this.arrival(),cemetery:()=>this.cemetery(),staff:()=>this.staff(),records:()=>this.records(),deduction:()=>this.deduction(),nightLead:()=>this.nightLead()};(views[s.stage]||views.client)();
  this.text(40,770,'H: hotspot outlines / BACK TO OFFICE returns to Florence’s email',13,'#a4978c');this.fit();
 }
 client(){
  const s=getDeadMailProgress();this.portrait('florence',45,235,290,440);this.text(370,185,'FLORENCE FINCH / CLIENT INTERVIEW',23,'#f5b75a',845);
  this.text(370,246,'“I checked my pulse before coming here. Twice.\nI do not trust their customer service.”',24,'#e8dbc0',840);
  [['pulse','Are you feeling all right?'],['order','Did you order or sign for anything?'],['work','Why were you watching the cemetery?']].forEach(([id,label],i)=>this.button(370,365+i*65,(s.questions.includes(id)?'[NOTED] ':'')+label,()=>{recordDeadMailFact(id);this.say({pulse:'FLORENCE: “My doctor says I am in excellent condition for someone allegedly buried.”',order:'FLORENCE: “No order. No signature. I never buy anything that needs a password and an apology.”',work:'FLORENCE: “I carried post for thirty years. I know a delivery route. Three vans used the service gate this week. Nobody carried flowers.”'}[id]);},845));
  this.text(370,581,this.feedback||'Ask Florence about the photograph and the deliveries.',20,'#e8dbc0',840);this.button(850,697,'COMPARE CEMETERY PLAN',()=>this.go('map'),370,s.questions.length===3);
 }
 map(){
  this.text(45,183,'Find the delivery location. All three photographic details must agree.',22);
  [['north','NORTH TERRACE','Plots 100–130\nIntact angel monument\nMain entrance A'],['west','WEST GARDEN','Plots 100–130\nDamaged angel wing\nService gate B'],['east','EAST WALK','Plots 200–230\nDamaged angel wing\nService gate C']].forEach(([id,title,description],i)=>{
   const x=45+i*405;this.rect(x,245,380,330,0x303b35).setStrokeStyle(2,0x8c947c);this.text(x+22,272,title,22,'#f5b75a',335);this.text(x+22,344,description,23,'#e0ddc4',330);this.button(x+20,505,'CHECK LOCATION',()=>{const r=chooseDeadMailSector(id);this.feedback=r.message||'';this.render();},340);
  });this.text(45,610,this.feedback||'Case notes: PLOT 114 / DAMAGED ANGEL / SERVICE GATE B',22,'#f5b75a',1170);this.text(45,688,'A wrong hypothesis does not cost money or restart the chapter.',17,'#baa88c');
 }
 arrival(){
  this.text(45,178,'BLACKTHORN CEMETERY / WEST GARDEN',23,'#f5b75a');this.art(DEAD_MAIL_ART.cemetery,{x:40,y:220,width:820,height:461});this.portrait('florence',900,220,300,360);this.text(900,598,'“Do I leave flowers for myself, or is that vain?”',22,'#e8dbc0',300);this.text(45,700,'The marker is real. The ground has not been dug.',19,'#e8dbc0',720);this.button(810,700,'INVESTIGATE THE CEMETERY',()=>this.go('cemetery'),420);
 }
 cemetery(){
  const s=getDeadMailProgress();this.text(45,176,'WEST GARDEN / DAYLIGHT',23,'#f5b75a');this.text(45,208,'Inspect the marker, the carton and the lock.',18);
  const f=this.art(DEAD_MAIL_ART.cemetery,{x:40,y:242,width:835,height:469.6875});this.hotspots(DEAD_MAIL_ART.cemetery,f,s.cemeteryFacts,id=>{inspectDeadMailObject(id);this.say(FACTS[id][1]);});
  this.text(915,255,'PEOPLE ON SITE',20,'#f5b75a',300);[['admin','ADMINISTRATOR'],['gravedigger','GROUNDSKEEPER'],['florist','FLORIST']].forEach(([id,label],i)=>this.button(905,310+i*75,label,()=>{this.person=id;this.go('staff');},310));
  this.text(915,568,`Scene details: ${['marker','carton','lock'].filter(id=>s.cemeteryFacts.includes(id)).length}/3`,19,'#baa88c',290);this.text(45,723,this.feedback||'FLORENCE: “Lovely place. Not moving in.”',17,'#e8dbc0',1160);
 }
 staff(){
  const s=getDeadMailProgress(),person=Object.hasOwn(STAFF,this.person)?this.person:'admin',npc=STAFF[person];
  [['admin','VALE'],['gravedigger','GRAVES'],['florist','THORNE']].forEach(([id,label],i)=>this.button(45+i*400,176,label,()=>{this.person=id;this.feedback='';this.render();},380));
  this.portrait(person,45,245,290,420);this.text(370,246,npc.name,23,'#f5b75a',840);this.text(370,291,npc.opening,21,'#e8dbc0',840);
  npc.topics.forEach(([id,label],i)=>this.button(370,393+i*61,(s.staffTopics.includes(`${person}:${id}`)?'[ASKED] ':'')+label,()=>{const r=talkDeadMailStaff(person,id);this.say(r.message||'This topic is unavailable.');},845));
  this.text(370,591,this.feedback||'Statements are leads, not proof. Ask about access and the deliveries.',18,'#e8dbc0',835);this.button(45,698,'BACK TO GROUNDS',()=>this.go('cemetery'),320);this.button(860,698,'INSPECT RECORDS',()=>this.go('records'),355,canUseDeadMailStage('records'));
 }
 records(){
  const s=getDeadMailProgress();this.imageFit('dead_mail_administration',{x:40,y:175,width:1200,height:570});this.rect(40,175,1200,570,0x10131b,0.42);
  Object.keys(DOCUMENTS).forEach((id,i)=>this.button(45+i*400,185,{register:'BURIAL REGISTER',gateLog:'KEY LOG',manifest:'COURIER SHEET'}[id],()=>{inspectDeadMailDocument(id);this.documentId=id;this.feedback='';this.render();},380));
  const doc=DOCUMENTS[this.documentId];this.rect(45,253,740,393,0xd9c8a4);this.text(68,272,doc?.title||'PERMITTED DOCUMENT EXTRACTS',21,'#392f2c',694);this.text(68,324,doc?.text||'Open each record above.\n\nCompare the names, plot numbers and access details.\n\nThe administrator has given permission to inspect these pages.',20,'#392f2c',694);
  this.rect(805,253,420,393,0x1b2026,0.95);this.text(825,273,'CROSS-REFERENCE',22,'#f5b75a',370);this.text(825,315,'Which recent recipients also appear in the burial register?',22,'#e8dbc0',370);
  const ready=['register','gateLog','manifest'].every(id=>s.cemeteryFacts.includes(id));[['four','All four, including Florence'],['three','Ada, Victor and Elsie'],['none','None of the recipients']].forEach(([id,label],i)=>this.button(820,424+i*65,label,()=>{const r=compareDeadMailRecipients(id);this.say(r.message||'Read the records first.');},390,ready));
  this.text(45,660,this.feedback||'A temporary marker is not a burial entry.',18,'#e8dbc0',1160);this.button(865,710,'REVIEW DEDUCTIONS',()=>this.go('deduction'),350,canUseDeadMailStage('deduction'));
 }
 deduction(){
  const s=getDeadMailProgress();this.text(45,178,'BUILD A CASE, NOT A GHOST STORY',24,'#f5b75a');
  DEDUCTIONS.forEach((d,i)=>this.button(45+i*400,228,(s.deductions.includes(d.id)?'[SOLVED] ':'')+`QUESTION ${i+1}`,()=>{this.deductionIndex=i;this.feedback='';this.render();},380));
  const d=DEDUCTIONS[this.deductionIndex]||DEDUCTIONS[0];this.text(45,307,d.question,26,'#e8dbc0',1170);
  d.options.forEach((label,i)=>this.button(45,384+i*65,label,()=>{const r=solveDeadMailDeduction(d.id,i);this.say((r.ok?'SUPPORTED: ':'NOT ESTABLISHED: ')+(r.message||'Collect the missing evidence.'));},1170));
  this.text(45,594,this.feedback||'Choose the conclusion supported by your evidence. Nobody has been identified as the collector yet.',22,'#e8dbc0',1160);this.button(830,690,'PREPARE NIGHT OBSERVATION',()=>{if(finishDeadMailDay()){this.feedback='';this.render();}},385,s.deductions.length===3);
 }
 nightLead(){
  this.art(DEAD_MAIL_ART.cemetery,{x:45,y:190,width:710,height:399.375});this.text(790,205,'DAY SHIFT COMPLETE',25,'#f5b75a',425);this.text(790,271,'Three dead recipients. One living client.\nThe same service gate. A parcel due at 21:10.\n\nYou have a route and a time, not a culprit.',23,'#e8dbc0',425);
  this.text(45,620,'FLORENCE: “If I am attending my own haunting, I expect a complimentary ticket.”',23,'#e8dbc0',1160);this.text(45,703,'BACK TO OFFICE → Florence’s email → CONTINUE NIGHT.',20,'#f5b75a',1160);
 }
}
