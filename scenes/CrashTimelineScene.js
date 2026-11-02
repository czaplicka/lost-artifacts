import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { evaluateCrashTimeline } from './archive/CrashTimelineModel.js';
import { getCrashTimelineHelp } from './archive/CrashTimelineHelp.js';
import { TimelineHelpController } from './archive/TimelineHelpController.js';

const DATA = await loadJson('../assets/data/crashTimelinePuzzle.json', import.meta.url);
const STATE_KEY = 'john_crash_timeline';
const FLAG = 'crash_timeline_reconstructed';

export class CrashTimelineScene extends BaseScene {
  constructor() { super({ key: 'CrashTimelineScene' }); }
  init(data = {}) {
    this.preview = data.preview !== false;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.slots = Array(DATA.slotCount).fill(null); this.conclusion = null;
    this.selected = null; this.selectedSlot = null; this.cards = []; this.slotObjects = [];
    this.conclusionButtons = []; this.checks = 0; this.finished = false; this.closing = false;
    this.layerStates = []; this.parentPausedByMe = false; this.savedOk = null;
    this.timelineHelp = null;
    // Stable main-case identity: unrelated agency missions must not reset purchased hints.
    this.caseKey = 'holly_missing_husband';
    this.stationId = 'john_last_operation';
    this.evidenceConfig = { id: 'john_crash_timeline' };
  }
  create() {
    super.create();
    const saved = this.preview ? null : MainStoryManager.getSideClue(STATE_KEY);
    if (saved?.version === 1 && Array.isArray(saved.slots) && saved.slots.length === DATA.slotCount) {
      const seen = new Set();
      this.slots = saved.slots.map(id => {
        if (!DATA.cards.some(card => card.id === id) || seen.has(id)) return null;
        seen.add(id); return id;
      });
    }
    if (DATA.conclusions.some(item => item.id === saved?.conclusion)) this.conclusion = saved.conclusion;
    this.checks = Number.isInteger(saved?.checks) && saved.checks >= 0 ? saved.checks : 0;
    this.finished = !this.preview && MainStoryManager.hasFlag(FLAG);
    if (this.finished) { this.slots = [...DATA.correctOrder]; this.conclusion = DATA.correctConclusion; }
    this.cameras.main.setBackgroundColor('#171619');
    this.root = this.add.container(0,0);
    this.root.add(this.add.rectangle(720,510,1440,1020,0x302729));
    this.label(720,42,DATA.title,25,'#f0ce88','PressStart2P');
    this.label(720,88,'Reconstruct JOHN\'S operation. Select an event, read its source, then choose a timeline position.',21);
    this.label(720,120,'Five events belong on the timeline. Stuck? Use HINT for assistance.',20,'#c5b59a');
    this.label(360,159,'EVENT CARDS',19,'#cdbb9a');
    this.label(1080,159,'LAST OPERATION / EARLIEST TO LATEST',19,'#cdbb9a');
    this.buildCards(); this.buildSlots();
    this.root.add(this.add.rectangle(720,736,1360,116,0xe2d4b6).setStrokeStyle(2,0x9b8662));
    this.sourceTitle = this.label(720,701,'SOURCE FOR THE SELECTED EVENT — NOT A HINT',18,'#74463a');
    this.sourceBody = this.label(720,750,'Click an event card above. This panel shows the document or testimony linked to that card.',21,'#3d332c');
    this.sourceBody.setWordWrapWidth(1300);
    this.label(720,819,'WHAT CAN YOU CONCLUDE?',19,'#cdbb9a');
    DATA.conclusions.forEach((item,index) => {
      const button = this.button(260+index*460,864,item.label,()=>{
        if(this.finished)return;
        this.conclusion=item.id;this.update();this.persist();
      });
      this.conclusionButtons.push({id:item.id,button});
    });
    this.message = this.label(720,918,'Select two timeline positions to swap them. CLEAR SLOT removes the selected event.',20);
    this.checkButton = this.button(265,972,'CHECK TIMELINE',()=>this.checkTimeline());
    this.clearButton = this.button(600,972,'CLEAR SLOT',()=>this.clearSlot());
    this.button(1235,972,'BACK',()=>this.closeTimeline());
    this.mode = this.label(720,1006,this.preview?'PREVIEW / hints are free test displays':'STORY',13,'#baa98e');
    this.timelineHelp = new TimelineHelpController(this);
    this.timelineHelp.create();
    this.update();this.layout();
    if(this.finished)this.showSuccess();
    this.trackInputEvent(this.scale,'resize',this.layout);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restoreBackground();this.onFinished=null;});
  }
  label(x,y,text,size=21,color='#e9dfc8',font='SpecialElite') {
    const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1350}}).setOrigin(0.5);
    this.root.add(object);return object;
  }
  button(x,y,text,callback) {
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'21px',color:'#f1d89d',backgroundColor:'#4a3933',padding:{x:17,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',()=>{if(!this.closing)callback();});this.root.add(object);return object;
  }
  buildCards() {
    const shuffled=Phaser.Utils.Array.Shuffle([...DATA.cards]);
    shuffled.forEach((card,index)=>{
      const x=193+(index%2)*344,y=243+Math.floor(index/2)*110;
      const box=this.add.rectangle(x,y,326,100,0xe2d4b6).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
      const title=this.add.text(x,y-29,card.title,{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#3f3126',align:'center',wordWrap:{width:304}}).setOrigin(0.5);
      const body=this.add.text(x,y+18,card.text,{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#534636',align:'center',wordWrap:{width:300}}).setOrigin(0.5);
      this.root.add([box,title,body]);
      box.on('pointerdown',()=>{
        this.inspect(card.id);
        if(this.finished)return;
        this.selected=this.selected===card.id?null:card.id;this.selectedSlot=null;this.update();
      });
      this.cards.push({id:card.id,box,title,body});
    });
  }
  buildSlots() {
    for(let index=0;index<DATA.slotCount;index++){
      const y=231+index*85;
      const box=this.add.rectangle(1080,y,630,75,0x493b35).setStrokeStyle(2,0x957a58).setInteractive({useHandCursor:true});
      const text=this.add.text(1080,y,'',{fontFamily:'SpecialElite, monospace',fontSize:'21px',color:'#f0dfbd',align:'center',wordWrap:{width:600}}).setOrigin(0.5);
      this.root.add([box,text]);box.on('pointerdown',()=>this.chooseSlot(index));
      this.slotObjects.push({box,text});
    }
  }
  inspect(cardId) {
    const card=DATA.cards.find(item=>item.id===cardId);
    const source=DATA.evidence.find(item=>item.id===card?.evidence);
    if(source){
      this.sourceTitle.setText(`SOURCE FOR: ${card.title} / ${source.title}`);
      this.sourceBody.setText(source.text);
    }
  }
  getForensicHelp() {
    const definition=getCrashTimelineHelp(DATA,this.slots,this.conclusion);
    const targets=[];
    if(definition.cardId)targets.push(this.cards.find(card=>card.id===definition.cardId)?.box);
    if(Number.isInteger(definition.slotIndex))targets.push(this.slotObjects[definition.slotIndex]?.box);
    if(definition.conclusionId)targets.push(this.conclusionButtons.find(item=>item.id===definition.conclusionId)?.button);
    return {...definition,targets:targets.filter(Boolean)};
  }
  setDialogue(text) { this.message?.setText(`HINT: ${text}`).setFontSize(18); }
  chooseSlot(index) {
    if(this.closing)return;
    if(this.slots[index])this.inspect(this.slots[index]);
    if(this.finished)return;
    if(this.selected){
      const origin=this.slots.indexOf(this.selected);
      if(origin===index){this.selected=null;this.selectedSlot=index;this.update();return;}
      const displaced=this.slots[index];
      this.slots[index]=this.selected;
      if(origin!==-1)this.slots[origin]=displaced;
      this.selected=null;this.selectedSlot=index;this.persist();
    }else if(this.selectedSlot!==null&&this.selectedSlot!==index){
      const first=this.selectedSlot;
      [this.slots[first],this.slots[index]]=[this.slots[index],this.slots[first]];
      this.selectedSlot=null;this.persist();
    }else this.selectedSlot=this.selectedSlot===index?null:index;
    this.update();
  }
  clearSlot() {
    if(this.finished||this.selectedSlot===null)return;
    this.slots[this.selectedSlot]=null;this.selectedSlot=null;this.selected=null;this.persist();this.update();
  }
  update() {
    if(!this.slotObjects)return;
    this.cards.forEach(card=>{
      const placed=this.slots.includes(card.id);
      card.box.setFillStyle(placed?0xc2c8ae:0xe2d4b6);
      card.box.setStrokeStyle(this.selected===card.id?4:2,this.selected===card.id?0xe7ac48:0x9b8662);
    });
    this.slotObjects.forEach(({box,text},index)=>{
      const card=DATA.cards.find(item=>item.id===this.slots[index]);
      text.setText(`${index+1}. ${card?.title??'[ select a card, then click here ]'}`);
      box.setStrokeStyle(this.selectedSlot===index?4:2,this.selectedSlot===index?0xe7ac48:0x957a58);
    });
    this.conclusionButtons?.forEach(({id,button})=>button.setBackgroundColor(this.conclusion===id?'#725337':'#4a3933'));
  }
  persist() {
    if(this.preview)return;
    MainStoryManager.setSideClue(STATE_KEY,{version:1,slots:[...this.slots],conclusion:this.conclusion,checks:this.checks,completed:this.finished});
    if(this.finished)MainStoryManager.setFlag(FLAG,true);
    this.savedOk=saveGameState();
  }
  checkTimeline() {
    if(this.finished||this.closing)return;
    const result=evaluateCrashTimeline(DATA,this.slots,this.conclusion);this.checks+=1;
    if(!result.ok){
      if(result.cardId)this.inspect(result.cardId);
      if(Number.isInteger(result.slotIndex))this.selectedSlot=result.slotIndex;
      this.message.setText(result.message).setFontSize(20);this.update();this.persist();return;
    }
    this.finished=true;this.selected=null;this.selectedSlot=null;this.persist();this.showSuccess();
    if(!this.preview)this.emitBus('mainStory:crashTimelineCompleted',{flag:FLAG,conclusion:DATA.correctConclusion});
  }
  showSuccess() {
    this.checkButton.setVisible(false);this.clearButton.setVisible(false);
    this.timelineHelp?.hintButton?.setVisible(false);
    this.conclusionButtons.forEach(item=>item.button.disableInteractive());
    this.message.setText(this.preview?'RECONSTRUCTION COMPLETE / preview only. Story progress was not changed.':this.savedOk===false?'Reconstruction complete. Saving failed; save manually.':'Reconstruction complete. The conversation with Holly is the next story step.').setFontSize(20);
    this.sourceTitle.setText('SUPPORTED CONCLUSION: PRESUMED DEAD');this.sourceBody.setText(DATA.success);this.update();
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1440,height/1020);this.root.setScale(s).setPosition((width-1440*s)/2,(height-1020*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{
      const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};
    });
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];
    if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);
    this.parentPausedByMe=false;
  }
  closeTimeline(){
    if(this.closing)return;this.closing=true;this.timelineHelp?.close();this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk,conclusion:this.conclusion});}finally{this.scene.stop();}
  }
}
