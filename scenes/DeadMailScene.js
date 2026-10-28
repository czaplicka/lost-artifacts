import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { STAFF, FACTS, DOCUMENTS, DEDUCTIONS } from '../assets/data/deadMailChapterTwo.js';
import { beginDeadMailPreview, getDeadMailProgress, setDeadMailStage, canUseDeadMailStage,
  recordDeadMailFact, chooseDeadMailSector, isDeadMailPreviewEnabled, inspectDeadMailObject,
  talkDeadMailStaff, inspectDeadMailDocument, compareDeadMailRecipients,
  solveDeadMailDeduction, finishDeadMailDay } from '../managers/DeadMailManager.js';

const KEY='DeadMailScene';
export function openDeadMailPreview(game=window.game){
  if(!isDeadMailPreviewEnabled())throw new Error('Local development preview only.');
  if(!game?.scene)throw new Error('The game is not ready.');
  if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailScene,false);
  if(!game.scene.isActive(KEY))game.scene.start(KEY);
  game.scene.bringToTop(KEY);
}
export class DeadMailScene extends BaseScene{
  constructor(){super({key:KEY});}
  create(){
    super.create();this.pausedKeys=[];this.hidden=[];this.page=null;this.feedback='';
    this.person='admin';this.documentId=null;this.deductionIndex=0;
    if(!isDeadMailPreviewEnabled()){this.scene.stop();return;}
    const state=beginDeadMailPreview();
    if(!canUseDeadMailStage(state.stage))setDeadMailStage('mail');
    this.events.once('shutdown',this.restore,this);
    for(const s of [...this.scene.manager.getScenes(true)]){
      const key=s.sys.settings.key;if(key!==KEY){this.pausedKeys.push(key);this.scene.pause(key);}
    }
    for(const selector of ['#hud-container','#agent-modal','#profile-modal']){
      const el=document.querySelector(selector);if(!el)continue;
      this.hidden.push([el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);
      el.style.setProperty('display','none','important');
    }
    this.scale.on('resize',this.fit,this);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());
    this.cameras.main.setBackgroundColor('#10131b');this.render();
  }
  restore(){
    flushAutosave();this.scale.off('resize',this.fit,this);
    for(const [el,value,priority]of this.hidden||[]){
      if(!el.isConnected)continue;if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');
    }
    for(const key of this.pausedKeys||[])if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
    this.hidden=[];this.pausedKeys=[];
  }
  fit(){if(!this.page)return;const s=Math.min(this.scale.width/1280,this.scale.height/800);
    this.page.setScale(s).setPosition((this.scale.width-1280*s)/2,(this.scale.height-800*s)/2);}
  text(x,y,value,size=24,color='#e8dbc0',width=1100){
    const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:7});
    this.page.add(t);return t;
  }
  rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
  button(x,y,label,callback,width=260,enabled=true){
    const r=this.rect(x,y,width,48,enabled?0x493c36:0x28272b).setStrokeStyle(1,0x927955);
    this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#8c8581',width-24);
    if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',callback)
      .on('pointerover',()=>r.setFillStyle(0x665046)).on('pointerout',()=>r.setFillStyle(0x493c36));
    return r;
  }
  go(stage){if(setDeadMailStage(stage)){this.feedback='';this.render();}}
  say(value){this.feedback=value;this.render();}
  render(){
    this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x141923);
    const s=getDeadMailProgress(),chapterTwo=['cemetery','staff','records','deduction','nightLead'].includes(s.stage);
    this.text(40,22,'DEAD MAIL',27,'#f5b75a');
    this.text(40,65,chapterTwo?'CHAPTER 2 / THE DAY SHIFT':'CHAPTER 1 / PROOF OF DELIVERY',17,'#baa88c');
    this.button(1040,24,'SAVE & EXIT',()=>this.scene.stop(),200);
    const tabs=chapterTwo?
      [['cemetery','GROUNDS'],['staff','STAFF'],['records','RECORDS'],['deduction','DEDUCTIONS']]:
      [['mail','MAIL'],['photo','PHOTO'],['client','FLORENCE'],['map','CEMETERY PLAN']];
    tabs.forEach(([id,label],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,canUseDeadMailStage(id)));
    const views={mail:()=>this.mail(),photo:()=>this.photo(),client:()=>this.client(),map:()=>this.map(),arrival:()=>this.arrival(),
      cemetery:()=>this.cemetery(),staff:()=>this.staff(),records:()=>this.records(),deduction:()=>this.deduction(),nightLead:()=>this.nightLead()};
    (views[s.stage]||views.mail)();
    this.text(40,765,'LOCAL DEVELOPMENT PREVIEW / placeholder art / no purchase or reward granted',14,'#a4978c');this.fit();
  }
  mail(){
    this.rect(40,178,1200,555,0xd9c8a4);
    this.text(70,202,'FROM: Florence Finch\nSUBJECT: Apparently, I am unavailable',23,'#392f2c');
    this.text(70,292,'Detective,\n\nYesterday a courier sent me a delivery confirmation. The parcel was addressed to me. The delivery address was Blackthorn Cemetery.\n\nI went there. There is a marker with my name, my correct date of birth, and tomorrow\'s date as the day I die.\n\nI would like this corrected before it becomes accurate.\n\nI have attached their delivery photograph. I can come to your office. I remain mobile.',22,'#392f2c',1110);
    this.button(70,665,'OPEN ATTACHMENT',()=>this.go('photo'),300);
  }
  photo(){
    const s=getDeadMailProgress();this.text(42,172,'Inspect the delivery photograph. Select three details worth following.',21);
    this.rect(40,218,790,420,0x303c3d);
    const g=this.add.graphics();this.page.add(g);g.fillStyle(0x202a29);g.fillRect(40,500,790,138);
    g.fillStyle(0x5d6863);g.fillRect(150,405,105,185);g.fillCircle(202,405,52);
    g.fillStyle(0x879187);g.fillTriangle(203,273,169,408,235,408);g.fillCircle(203,263,18);g.fillTriangle(180,300,111,271,166,360);
    g.lineStyle(4,0xb6b3a0);g.lineBetween(220,307,245,325);this.text(117,592,'DAMAGED ANGEL',14,'#bcbda9',200);
    this.rect(365,342,280,225,0xbdbbab);this.text(390,366,'FLORENCE FINCH\n1938 - TOMORROW',23,'#30332c',240);
    this.text(415,502,'PLOT 114',20,'#30332c',220);this.rect(638,529,161,96,0x9b7951);this.rect(654,540,130,71,0xe8dfbf);
    this.text(660,549,'SERVICE\nGATE B',15,'#352e28',120);
    for(const[id,x,y,w,h]of [['angel',100,245,175,300],['plot',390,489,230,64],['label',648,533,145,82]]){
      const found=s.clues.includes(id),hit=this.rect(x,y,w,h,0xd6a64a,found?0.12:0).setStrokeStyle(found?2:0,0xe1b55d);
      hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{recordDeadMailFact(id);this.say({angel:'The angel has only one wing. A useful landmark.',plot:'Plot 114. The marker is suspiciously new.',label:'The label names a service entrance, not the main gate.'}[id]);});
    }
    this.text(870,230,`DETAILS NOTED: ${s.clues.length}/3`,21,'#f5b75a',340);
    const labels={angel:'Damaged angel',plot:'Plot 114',label:'Service gate B'};
    this.text(870,290,s.clues.map(id=>'- '+labels[id]).join('\n')||'Click details in the photograph.',22,'#e8dbc0',320);
    this.text(870,462,'A photograph proves what was placed in front of a camera. Not that Florence is dead.',21,'#baa88c',320);
    this.text(40,656,this.feedback||'The photograph is evidence. The caption is a claim.',20,'#f5b75a',1160);
    this.button(870,584,'INTERVIEW FLORENCE',()=>this.go('client'),330,s.clues.length===3);
  }
  client(){
    const s=getDeadMailProgress();this.text(50,186,'FLORENCE FINCH / CLIENT INTERVIEW',24,'#f5b75a');
    this.text(50,242,'“I checked my pulse before coming here. Twice.\nI do not trust their customer service.”',27,'#e8dbc0',1100);
    [['pulse','Are you feeling all right?'],['order','Did you order or sign for anything?'],['work','Why were you watching the cemetery?']].forEach(([id,label],i)=>
      this.button(50,355+i*67,(s.questions.includes(id)?'[NOTED] ':'')+label,()=>{recordDeadMailFact(id);this.say({
        pulse:'FLORENCE: “My doctor says I am in excellent condition for someone allegedly buried.”',
        order:'FLORENCE: “No order. No signature. I never buy anything that needs a password and an apology.”',
        work:'FLORENCE: “I carried post for thirty years. I know a delivery route. Three vans used the service gate this week. Nobody carried flowers.”'}[id]);},1140));
    this.text(50,570,this.feedback||'Ask Florence about the photograph and the deliveries.',22,'#e8dbc0',1120);
    this.button(850,676,'COMPARE CEMETERY PLAN',()=>this.go('map'),370,s.questions.length===3);
  }
  map(){
    this.text(45,183,'Find the delivery location. All three photographic details must agree.',22);
    [['north','NORTH TERRACE','Plots 100–130\nIntact angel monument\nMain entrance A'],['west','WEST GARDEN','Plots 100–130\nOne-winged angel\nService gate B'],['east','EAST WALK','Plots 200–230\nOne-winged angel\nService gate C']].forEach(([id,title,desc],i)=>{
      const x=45+i*405;this.rect(x,245,380,330,0x303b35).setStrokeStyle(2,0x8c947c);this.text(x+22,272,title,22,'#f5b75a',335);
      this.text(x+22,344,desc,23,'#e0ddc4',330);this.button(x+20,505,'CHECK LOCATION',()=>{const r=chooseDeadMailSector(id);this.feedback=r.message||'';this.render();},340);
    });
    this.text(45,610,this.feedback||'Case notes: PLOT 114 / DAMAGED ANGEL / SERVICE GATE B',22,'#f5b75a',1170);
    this.text(45,688,'A wrong hypothesis does not cost money or restart the chapter.',17,'#baa88c');
  }
  arrival(){
    this.rect(40,190,1200,260,0x25322f);this.text(72,215,'BLACKTHORN CEMETERY / WEST GARDEN',23,'#f5b75a');
    this.rect(530,285,220,140,0x73776a);this.text(556,305,'FLORENCE\nFINCH',25,'#202b28',180);
    this.text(60,480,'The marker is real. The grave beneath it has not been dug.\n\nSomeone wanted Florence to see this.\nSomeone also wanted the courier to find it.\n\nFLORENCE: “Do I leave flowers for myself, or is that vain?”',24,'#e8dbc0',1130);
    this.button(810,690,'INVESTIGATE THE CEMETERY',()=>this.go('cemetery'),420);
  }
  cemetery(){
    const s=getDeadMailProgress();this.text(45,176,'WEST GARDEN / DAYLIGHT',23,'#f5b75a');
    this.text(45,216,'Inspect the marker, the discarded carton and the service gate.',20);
    this.rect(40,260,790,350,0x334039);this.rect(40,516,790,94,0x28352b);
    this.rect(120,352,190,210,0x8b9183);this.text(137,378,'FLORENCE\nFINCH\n\nPLOT 114',23,'#26332c',170);
    const marker=this.rect(112,344,206,228,0xe1b55d,0).setStrokeStyle(s.cemeteryFacts.includes('marker')?2:0,0xe1b55d);
    marker.setInteractive({useHandCursor:true}).on('pointerup',()=>{inspectDeadMailObject('marker');this.say(FACTS.marker[1]);});
    this.rect(430,492,155,94,0x94744b);this.text(443,510,'LENS KIT\nFRAGILE',19,'#201e19',140);
    const carton=this.rect(423,485,169,108,0xe1b55d,0).setStrokeStyle(s.cemeteryFacts.includes('carton')?2:0,0xe1b55d);
    carton.setInteractive({useHandCursor:true}).on('pointerup',()=>{inspectDeadMailObject('carton');this.say(FACTS.carton[1]);});
    for(let i=0;i<5;i++)this.rect(657+i*26,307,8,255,0x89918a);
    this.text(639,273,'GATE B',19,'#e8dbc0',180);this.rect(706,437,34,40,0xaca16e);
    this.rect(637,300,170,270,0xe1b55d,0).setStrokeStyle(s.cemeteryFacts.includes('lock')?2:0,0xe1b55d)
      .setInteractive({useHandCursor:true}).on('pointerup',()=>{inspectDeadMailObject('lock');this.say(FACTS.lock[1]);});
    this.text(865,272,'PEOPLE ON SITE',21,'#f5b75a',345);
    [['admin','ADMINISTRATOR'],['gravedigger','GROUNDSKEEPER'],['florist','FLORIST']].forEach(([id,label],i)=>
      this.button(865,330+i*78,label,()=>{this.person=id;this.go('staff');},350));
    this.text(45,638,this.feedback||'Florence: “Lovely place. Not moving in.”',21,'#e8dbc0',1160);
    this.text(45,720,`Scene details: ${['marker','carton','lock'].filter(id=>s.cemeteryFacts.includes(id)).length}/3`,17,'#baa88c');
  }
  staff(){
    const s=getDeadMailProgress(),p=STAFF[this.person]||STAFF.admin;
    [['admin','VALE'],['gravedigger','GRAVES'],['florist','THORNE']].forEach(([id,label],i)=>
      this.button(45+i*400,176,label,()=>{this.person=id;this.feedback='';this.render();},380));
    this.text(45,245,p.name,24,'#f5b75a');this.text(45,289,p.opening,23,'#e8dbc0',1170);
    p.topics.forEach(([id,label],i)=>{
      const read=s.staffTopics.includes(`${this.person}:${id}`);
      this.button(45,365+i*62,(read?'[ASKED] ':'')+label,()=>{
        const r=talkDeadMailStaff(this.person,id);this.say(r.message||'This topic is unavailable.');
      },1170);
    });
    this.text(45,565,this.feedback||'Statements are leads, not proof. Ask about access and the deliveries.',22,'#e8dbc0',1160);
    this.button(45,690,'BACK TO GROUNDS',()=>this.go('cemetery'),320);
    this.button(860,690,'INSPECT RECORDS',()=>this.go('records'),355,canUseDeadMailStage('records'));
  }
  records(){
    const s=getDeadMailProgress();
    Object.entries(DOCUMENTS).forEach(([id,d],i)=>this.button(45+i*400,176,({register:'BURIAL REGISTER',gateLog:'KEY LOG',manifest:'COURIER SHEET'})[id],()=>{
      inspectDeadMailDocument(id);this.documentId=id;this.feedback='';this.render();
    },380));
    const d=DOCUMENTS[this.documentId];
    this.rect(45,245,740,405,0xd9c8a4);
    this.text(68,267,d?.title||'PERMITTED DOCUMENT EXTRACTS',21,'#392f2c',694);
    this.text(68,319,d?.text||'Open each record above.\n\nCompare the names, plot numbers and access details.\n\nThe administrator has given permission to inspect these pages.',21,'#392f2c',694);
    this.text(820,252,'CROSS-REFERENCE',22,'#f5b75a',385);
    this.text(820,294,'Which recent recipients also appear in the burial register?',22,'#e8dbc0',385);
    const ready=['register','gateLog','manifest'].every(id=>s.cemeteryFacts.includes(id));
    [['four','All four, including Florence'],['three','Ada, Victor and Elsie'],['none','None of the recipients']].forEach(([id,label],i)=>
      this.button(820,398+i*65,label,()=>{const r=compareDeadMailRecipients(id);this.say(r.message||'Read the records first.');},390,ready));
    this.text(45,667,this.feedback||'Cross-reference the records. Do not treat a temporary marker as a burial entry.',20,'#e8dbc0',1160);
    this.button(865,712,'REVIEW DEDUCTIONS',()=>this.go('deduction'),350,canUseDeadMailStage('deduction'));
  }
  deduction(){
    const s=getDeadMailProgress();this.text(45,178,'BUILD A CASE, NOT A GHOST STORY',24,'#f5b75a');
    DEDUCTIONS.forEach((d,i)=>this.button(45+i*400,228,(s.deductions.includes(d.id)?'[SOLVED] ':'')+`QUESTION ${i+1}`,()=>{
      this.deductionIndex=i;this.feedback='';this.render();
    },380));
    const d=DEDUCTIONS[this.deductionIndex]||DEDUCTIONS[0];
    this.text(45,307,d.question,26,'#e8dbc0',1170);
    d.options.forEach((label,i)=>this.button(45,384+i*65,label,()=>{
      const r=solveDeadMailDeduction(d.id,i);this.say((r.ok?'SUPPORTED: ':'NOT ESTABLISHED: ')+(r.message||'Collect the missing evidence.'));
    },1170));
    this.text(45,594,this.feedback||'Choose the conclusion supported by your evidence. Nobody has been identified as the collector yet.',22,'#e8dbc0',1160);
    this.button(830,690,'PREPARE NIGHT OBSERVATION',()=>{if(finishDeadMailDay()){this.feedback='';this.render();}},385,s.deductions.length===3);
  }
  nightLead(){
    this.rect(45,188,1170,493,0x25322f);this.text(72,218,'DAY SHIFT COMPLETE',28,'#f5b75a');
    this.text(72,282,'Three dead recipients. One living client.\nThe same service gate. A parcel due at 21:10.\n\nYou have a route and a time, not a culprit.\n\nDuring the Last Walk, costumes will make faces hard to recognise. You will need to observe the collection itself.\n\nFLORENCE: “If I am attending my own haunting, I expect a complimentary ticket.”',26,'#e8dbc0',1100);
    this.text(45,705,'END OF CHAPTER 2 PREVIEW / Night surveillance is the next development step.',20,'#f5b75a',1160);
  }
}
