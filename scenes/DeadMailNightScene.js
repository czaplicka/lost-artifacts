import { BaseScene } from './BaseScene.js';
import { flushAutosave } from '../gameStatePersistence.js';
import { NIGHT_EVENTS, NIGHT_FACTS, NIGHT_DEDUCTIONS, COURIER_TOPICS } from '../assets/data/deadMailNightData.js';
import { canStartDeadMailNight, beginDeadMailNight, getDeadMailNightProgress, setDeadMailNightStage,
  placeDeadMailEquipment, checkDeadMailCoverage, startDeadMailWatch, advanceDeadMailWatch,
  askDeadMailCourier, verifyDeadMailCourier, compareDeadMailCourierSheet,
  solveDeadMailNightDeduction, finishDeadMailNight } from '../managers/DeadMailNightManager.js';

const KEY='DeadMailNightScene';
export function openDeadMailNightPreview(game=window.game){
  if(!canStartDeadMailNight())throw new Error('Complete the day-shift preview first.');
  if(!game?.scene)throw new Error('The game is not ready.');
  if(!game.scene.keys[KEY])game.scene.add(KEY,DeadMailNightScene,false);
  if(!game.scene.isActive(KEY))game.scene.start(KEY);
  game.scene.bringToTop(KEY);
}
export class DeadMailNightScene extends BaseScene{
  constructor(){super({key:KEY});}
  create(){
    super.create();this.pausedKeys=[];this.hidden=[];this.page=null;this.feedback='';this.selectedEvent=null;
    this.courierPage='talk';this.deductionIndex=0;
    if(!canStartDeadMailNight()){this.scene.stop();return;}
    beginDeadMailNight();this.events.once('shutdown',this.restore,this);
    for(const s of [...this.scene.manager.getScenes(true)]){
      const k=s.sys.settings.key;if(k!==KEY){this.pausedKeys.push(k);this.scene.pause(k);}
    }
    for(const selector of ['#hud-container','#agent-modal','#profile-modal']){
      const el=document.querySelector(selector);if(!el)continue;
      this.hidden.push([el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);
      el.style.setProperty('display','none','important');
    }
    this.scale.on('resize',this.fit,this);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>this.scene.stop());
    this.cameras.main.setBackgroundColor('#0c101b');this.render();
  }
  restore(){
    flushAutosave();this.scale.off('resize',this.fit,this);
    for(const[el,value,priority]of this.hidden||[]){if(!el.isConnected)continue;
      if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');}
    for(const k of this.pausedKeys||[])if(this.scene.manager.keys[k]&&this.scene.isPaused(k))this.scene.resume(k);
    this.hidden=[];this.pausedKeys=[];
  }
  fit(){if(!this.page)return;const z=Math.min(this.scale.width/1280,this.scale.height/800);
    this.page.setScale(z).setPosition((this.scale.width-1280*z)/2,(this.scale.height-800*z)/2);}
  rect(x,y,w,h,color,alpha=1){const r=this.add.rectangle(x,y,w,h,color,alpha).setOrigin(0);this.page.add(r);return r;}
  text(x,y,value,size=22,color='#e8dbc0',width=1160){
    const t=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,wordWrap:{width},lineSpacing:7});this.page.add(t);return t;}
  button(x,y,label,fn,width=280,enabled=true){
    const r=this.rect(x,y,width,48,enabled?0x403844:0x24242e).setStrokeStyle(1,0x947956);
    this.text(x+12,y+12,label,17,enabled?'#f5e1ae':'#827c81',width-24);
    if(enabled)r.setInteractive({useHandCursor:true}).on('pointerup',fn)
      .on('pointerover',()=>r.setFillStyle(0x625064)).on('pointerout',()=>r.setFillStyle(0x403844));return r;
  }
  go(stage){if(setDeadMailNightStage(stage)){this.feedback='';this.render();}}
  say(message){this.feedback=message;this.render();}
  render(){
    this.page?.destroy(true);this.page=this.add.container(0,0);this.rect(0,0,1280,800,0x111522);
    const s=getDeadMailNightProgress();
    this.text(40,22,'DEAD MAIL / NIGHT SHIFT',27,'#f5b75a');
    this.text(40,65,'CHAPTER 3 / TWO PLACES AT ONCE',17,'#afa0b7');
    this.button(1040,24,'SAVE & EXIT',()=>this.scene.stop(),200);
    [['setup','EQUIPMENT',!s.started],['watch','TIMELINE',s.started],['courier','THE GHOST',s.eventIndex===NIGHT_EVENTS.length-1],
      ['review','DEDUCTIONS',s.verified&&s.compared]].forEach(([id,label,enabled],i)=>this.button(40+i*300,106,label,()=>this.go(id),280,enabled));
    const views={setup:()=>this.setupView(),watch:()=>this.watchView(),courier:()=>this.courierView(),review:()=>this.reviewView(),end:()=>this.endView()};
    (views[s.stage]||views.setup)();
    this.text(40,765,'LOCAL DEVELOPMENT PREVIEW / placeholder visuals / recorder uses text transcripts',14,'#998f9c');this.fit();
  }
  setupView(){
    const s=getDeadMailNightProgress();this.text(45,180,'REHEARSE COVERAGE BEFORE THE DELIVERY',23,'#f5b75a');
    this.text(45,224,'One camera. One recorder. Your own observation point. The camera cannot see around the chapel.',21);
    const locations=[['gate','SERVICE GATE B'],['chapel','CHAPEL'],['main','MAIN PATH']];
    locations.forEach(([id,label],i)=>{
      const x=45+i*405;this.rect(x,276,380,151,0x27323b).setStrokeStyle(1,0x63727c);
      this.text(x+18,295,label,21,'#e6b66d',340);
      const assigned=[s.camera===id?'CAMERA':null,s.recorder===id?'RECORDER':null,s.observer===id?'YOU':null].filter(Boolean).join(' / ');
      this.text(x+18,351,assigned||'No equipment assigned',19,'#d1c6d8',340);
    });
    [['camera','CAMERA'],['recorder','RECORDER'],['observer','YOUR POSITION']].forEach(([slot,label],row)=>{
      const y=451+row*60;this.text(45,y+10,label,18,'#baa9bf',185);
      locations.forEach(([id,place],i)=>this.button(245+i*330,y,(s[slot]===id?'[X] ':'')+place,()=>{placeDeadMailEquipment(slot,id);this.feedback='';this.render();},310));
    });
    this.text(45,648,this.feedback||'Rehearsing coverage does not advance time. Once the watch starts, positions are locked.',20,'#e8dbc0',1160);
    this.button(45,709,'CHECK COVERAGE',()=>this.say(checkDeadMailCoverage().message),340);
    this.button(850,709,'BEGIN WATCH',()=>{const r=startDeadMailWatch();this.feedback=r.message||'';this.render();},370);
  }
  drawNight(x,y,w,h,mode){
    this.rect(x,y,w,h,0x17202f);const g=this.add.graphics();this.page.add(g);
    g.fillStyle(0xbcbda4);g.fillCircle(x+w*.84,y+48,23);g.fillStyle(0x28342e);g.fillRect(x,y+h-75,w,75);
    if(mode==='gate'){
      for(let i=0;i<7;i++)this.rect(x+50+i*33,y+70,7,h-120,0x727f81);
      this.rect(x+260,y+h-116,75,60,0x9b7751);
      g.fillStyle(0x55565e);g.fillTriangle(x+300,y+75,x+260,y+h-80,x+350,y+h-80);g.fillCircle(x+300,y+65,17);
    }else if(mode==='chapel'){
      g.fillStyle(0x343d49);g.fillTriangle(x+165,y+34,x+75,y+125,x+255,y+125);g.fillRect(x+95,y+125,145,h-160);
      g.fillStyle(0xb6b8aa);g.fillTriangle(x+170,y+140,x+140,y+h-60,x+203,y+h-60);g.fillCircle(x+171,y+137,15);
    }
    this.text(x+14,y+h-36,mode==='gate'?'GATE CAMERA / FACE OBSCURED':mode==='chapel'?'CHAPEL / DIRECT OBSERVATION':'WAITING FOR RECORDED EVENT',15,'#aeb7bc',w-25);
  }
  watchView(){
    const s=getDeadMailNightProgress();
    NIGHT_EVENTS.forEach((e,i)=>this.button(45+i*240,176,e.time,()=>{this.selectedEvent=i;this.feedback='';this.render();},220,i<=s.eventIndex));
    const selected=this.selectedEvent!==null&&this.selectedEvent<=s.eventIndex?this.selectedEvent:s.eventIndex;
    const e=NIGHT_EVENTS[selected];
    this.drawNight(45,249,570,250,selected>=2?'gate':'empty');this.drawNight(645,249,570,250,selected>=1?'chapel':'empty');
    this.text(45,519,e?`${e.time} / ${e.title}`:'CLOCKS SYNCHRONISED / READY',23,'#f5b75a');
    this.text(45,563,e?.text||'Advance to the next event. Earlier entries remain available as recorded observations; reviewing them does not rewind the night.',22,'#e8dbc0',1160);
    const next=NIGHT_EVENTS[s.eventIndex+1];
    if(next)this.button(815,710,`WAIT UNTIL ${next.time}`,()=>{advanceDeadMailWatch();this.selectedEvent=null;this.feedback='';this.render();},400);
    else this.button(815,710,'SPEAK TO THE GHOST',()=>this.go('courier'),400);
    this.text(45,715,`Recorded events: ${s.eventIndex+1}/${NIGHT_EVENTS.length}`,17,'#afa0b7',650);
  }
  courierView(){
    const s=getDeadMailNightProgress();
    [['talk','INTERVIEW'],['verify','VERIFY IDENTITY'],['sheet','COMPARE RECORDS']].forEach(([id,label],i)=>
      this.button(45+i*405,176,label,()=>{this.courierPage=id;this.feedback='';this.render();},380));
    if(this.courierPage==='talk'){
      this.text(45,246,'TESSA WARD / THE APPARENTLY LIVING DEAD',24,'#f5b75a');
      COURIER_TOPICS.forEach(([id,label],i)=>this.button(45,301+i*60,(s.topics.includes(id)?'[ASKED] ':'')+label,()=>{
        const r=askDeadMailCourier(id);this.say(r.message||'This topic is unavailable.');
      },1170));
      this.text(45,557,this.feedback||'“Before you ask, haunting is not my primary occupation.”',20,'#e8dbc0',1160);
    }else if(this.courierPage==='verify'){
      this.text(45,247,'A BADGE IS A CLAIM. CHECK IT INDEPENDENTLY.',24,'#f5b75a');
      this.text(45,302,'Badge: Tessa Ward / PC-041 / Parcel & Circumstance\n\nChoose how to check the claim. This is a scripted contact prototype inside the scene, not yet the office phone interface.',23,'#e8dbc0',1160);
      [['badge','Accept the badge and costume'],['witness','Call only a number Tessa supplies'],['directory','Use the courier directory duty desk']].forEach(([id,label],i)=>
        this.button(45,451+i*60,label,()=>{const r=verifyDeadMailCourier(id);this.say(r.message||'Ask who she is first.');},1170,s.topics.includes('identity')));
      this.text(45,650,this.feedback||'Verification confirms employment and assignment, not innocence.',20,'#e8dbc0',1160);
    }else{
      this.rect(45,245,570,310,0xd9c8a4);this.rect(645,245,570,310,0xd9c8a4);
      this.text(65,263,'CEMETERY COURIER SHEET',20,'#392f2c',530);
      this.text(65,315,'MON / ADA BELL / 108 / GATE B\nTUE / VICTOR MOSS / 112 / GATE B\nWED / ELSIE PIKE / 119 / GATE B\nTHU / FLORENCE FINCH / 114 / GATE B\n\nPurchaser: not listed\nCollector: not identified',20,'#392f2c',530);
      this.text(665,263,'TESSA’S REDACTED ROUTE SHEET',20,'#392f2c',530);
      const available=s.verified&&s.topics.includes('records');
      this.text(665,315,available?'MON / ADA BELL / 108\nTUE / VICTOR MOSS / 112\nWED / ELSIE PIKE / 119\nTHU / FLORENCE FINCH / 114\n\nPayment data: not provided\nCollector identity: not recorded':'Verify Tessa’s employment and ask about her records before viewing this sheet.',20,'#392f2c',530);
      this.button(45,578,'MATCH: BUYER IDENTITY',()=>{const r=compareDeadMailCourierSheet('buyer');this.say(r.message||'Verify the source first.');},570,available);
      this.button(645,578,'MATCH: NAMES, DATES, PLOTS',()=>{const r=compareDeadMailCourierSheet('route');this.say(r.message||'Verify the source first.');},570,available);
      this.text(45,649,this.feedback||'What can these two documents actually establish?',20,'#e8dbc0',1160);
    }
    this.button(855,711,'REVIEW NIGHT EVIDENCE',()=>this.go('review'),360,s.verified&&s.compared);
  }
  reviewView(){
    const s=getDeadMailNightProgress();
    NIGHT_DEDUCTIONS.forEach((d,i)=>this.button(45+i*405,176,(s.deductions.includes(d.id)?'[SOLVED] ':'')+`QUESTION ${i+1}`,()=>{
      this.deductionIndex=i;this.feedback='';this.render();
    },380));
    const d=NIGHT_DEDUCTIONS[this.deductionIndex]||NIGHT_DEDUCTIONS[0];
    this.text(45,250,d.question,25,'#f5b75a');
    d.options.forEach((label,i)=>this.button(45,328+i*64,label,()=>{
      const r=solveDeadMailNightDeduction(d.id,i);this.say((r.ok?'SUPPORTED: ':'NOT ESTABLISHED: ')+(r.message||'Check the evidence first.'));
    },1170));
    this.text(45,554,this.feedback||'Two figures, not one. A verified witness, not an automatic alibi. The collector remains unidentified.',23,'#e8dbc0',1160);
    this.button(810,710,'PLAN CONTROLLED DELIVERY',()=>{if(finishDeadMailNight()){this.feedback='';this.render();}},405,s.deductions.length===3);
  }
  endView(){
    this.rect(45,188,1170,490,0x202d36);this.text(72,218,'NIGHT SHIFT COMPLETE',28,'#f5b75a');
    this.text(72,283,'The ghost is a person. The collector is another person.\nThat does not yet tell you who planned the deliveries.\n\nYou and Tessa agree to coordinate a marked parcel with the courier and police. The next operation must connect the collector to the parcel and establish identity.\n\nTESSA: “For the record, I would like a different undercover assignment.”\n\nDETECTIVE: “Something less conspicuous than a ghost?”\n\nTESSA: “A postbox.”',24,'#e8dbc0',1100);
    this.text(45,711,'END OF CHAPTER 3 PREVIEW / Controlled delivery and final resolution come next.',20,'#f5b75a',1160);
  }
}
