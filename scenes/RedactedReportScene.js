import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';

const DATA = await loadJson('../assets/data/redactedReportPuzzle.json', import.meta.url);
const STATE_KEY = 'archive_redacted_report';
const FLAG = 'redacted_report_decoded';

export class RedactedReportScene extends BaseScene {
  constructor() { super({ key: 'RedactedReportScene' }); }
  init(data = {}) {
    this.preview = data.preview !== false;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.rows = []; this.layerStates = []; this.parentPausedByMe = false;
    this.finished = false; this.closing = false; this.checks = 0; this.savedOk = null;
    this.answers = {}; this.evidence = {}; this.focused = DATA.fields[0].id;
  }
  create() {
    super.create();
    if (!this.preview) {
      const saved = MainStoryManager.getSideClue(STATE_KEY);
      this.finished = MainStoryManager.hasFlag(FLAG);
      this.checks = Number.isInteger(saved?.checks) && saved.checks >= 0 ? saved.checks : 0;
      for (const field of DATA.fields) {
        const answer = saved?.answers?.[field.id];
        const evidence = saved?.evidence?.[field.id];
        if (field.choices.some(choice => choice.id === answer)) this.answers[field.id] = answer;
        if (DATA.evidence.some(source => source.id === evidence)) this.evidence[field.id] = evidence;
      }
    }
    if (this.finished) for (const field of DATA.fields) {
      this.answers[field.id] = field.answer; this.evidence[field.id] = field.evidence;
    }
    this.cameras.main.setBackgroundColor('#171619');
    this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(700, 470, 1400, 940, 0x302729));
    this.label(700, 42, DATA.title, 23, '#f0ce88', 'PressStart2P');
    this.label(700, 84, DATA.intro, 21);
    this.label(700, 119, '1. Select a field.  2. Choose its value.  3. Click an attachment to cite it.', 20, '#c7baa0');
    this.root.add(this.add.rectangle(345, 455, 620, 620, 0xe2d4b6).setStrokeStyle(2, 0x9b8662));
    this.label(345, 173, 'MARK AGENCY / JM-041', 24, '#42352a');
    DATA.fields.forEach((field, index) => this.buildField(field, index));
    this.buildSources();
    this.message = this.label(700, 805, 'No answer is complete without its supporting attachment.', 22);
    this.mode = this.label(700, 894, this.preview ? 'PREVIEW / no story progress changed' : 'ARCHIVE / evidence reconstruction', 17, '#baaa94');
    this.checkButton = this.button(365, 867, 'CHECK REPORT', () => this.checkReport());
    this.button(1120, 867, 'BACK', () => this.closeReport());
    this.updateRows(); this.layout();
    if (this.finished) this.showSuccess();
    this.trackInputEvent(this.scale, 'resize', this.layout);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.restoreBackground(); this.onFinished = null;
    });
  }
  label(x, y, text, size=21, color='#e9dfc8', font='SpecialElite') {
    const object = this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1300}}).setOrigin(0.5);
    this.root.add(object); return object;
  }
  button(x,y,text,callback) {
    const object = this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'21px',color:'#f1d89d',backgroundColor:'#4a3933',padding:{x:18,y:12}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',callback);this.root.add(object);return object;
  }
  buildField(field,index) {
    const y = 251 + index*134;
    const box = this.add.rectangle(345,y,584,122,0xd9c8a5).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
    this.root.add(box);
    box.on('pointerdown',()=>{if(!this.finished){this.focused=field.id;this.updateRows();}});
    this.label(345,y-41,field.label,18,'#5d4a36');
    const value = this.add.text(345,y-9,'',{fontFamily:'SpecialElite, monospace',fontSize:'24px',color:'#282321',align:'center',wordWrap:{width:430}}).setOrigin(0.5);
    const source = this.add.text(345,y+33,'',{fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#534532',align:'center',wordWrap:{width:480}}).setOrigin(0.5);
    this.root.add([value,source]);
    const left = this.button(93,y-6,'<',()=>this.cycle(field,-1));
    const right = this.button(597,y-6,'>',()=>this.cycle(field,1));
    this.rows.push({field,box,value,source,left,right});
  }
  buildSources() {
    this.sourceBoxes=[];
    DATA.evidence.forEach((source,index)=>{
      const y=207+index*98;
      const box=this.add.rectangle(1020,y,650,90,0xe2d4b6).setStrokeStyle(2,0x9b8662).setInteractive({useHandCursor:true});
      const title=this.add.text(708,y-37,source.label,{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#74463a'});
      const body=this.add.text(708,y-11,source.text,{fontFamily:'SpecialElite, monospace',fontSize:'17px',color:'#3d332c',wordWrap:{width:620}});
      this.root.add([box,title,body]);
      box.on('pointerdown',()=>{
        if(this.finished||this.closing)return;
        this.evidence[this.focused]=source.id;
        this.message.setText(`Attachment ${source.label.split(' / ')[0]} cited for ${DATA.fields.find(f=>f.id===this.focused).label}.`);
        this.updateRows();this.persist();
      });
      this.sourceBoxes.push({id:source.id,box});
    });
  }
  cycle(field,delta) {
    if(this.finished||this.closing)return;
    this.focused=field.id;
    const index=field.choices.findIndex(choice=>choice.id===this.answers[field.id]);
    const next=index<0?(delta>0?0:field.choices.length-1):(index+delta+field.choices.length)%field.choices.length;
    this.answers[field.id]=field.choices[next].id;
    this.updateRows();this.persist();
  }
  updateRows() {
    this.rows.forEach(({field,box,value,source})=>{
      const chosen=field.choices.find(choice=>choice.id===this.answers[field.id]);
      value.setText(chosen?.text??'[ REDACTED ]');
      const attachment=DATA.evidence.find(item=>item.id===this.evidence[field.id]);
      source.setText(attachment?`Evidence: ${attachment.label}`:'Evidence: select an attachment on the right');
      box.setStrokeStyle(this.focused===field.id&&!this.finished?4:2,this.focused===field.id&&!this.finished?0xbb7837:0x9b8662);
    });
    this.sourceBoxes?.forEach(item=>item.box.setStrokeStyle(this.evidence[this.focused]===item.id?4:2,this.evidence[this.focused]===item.id?0xbb7837:0x9b8662));
  }
  persist() {
    if(this.preview)return;
    MainStoryManager.setSideClue(STATE_KEY,{version:1,documentId:DATA.documentId,answers:{...this.answers},evidence:{...this.evidence},checks:this.checks,completed:this.finished});
    if(this.finished)MainStoryManager.setFlag(FLAG,true);
    this.savedOk=saveGameState();
  }
  checkReport() {
    if(this.finished||this.closing)return;
    const missing=DATA.fields.find(field=>!this.answers[field.id]||!this.evidence[field.id]);
    if(missing){this.focused=missing.id;this.updateRows();this.message.setText(`Complete ${missing.label}: choose a value AND a supporting attachment.`);return;}
    this.checks+=1;
    const wrong=DATA.fields.find(field=>this.answers[field.id]!==field.answer||this.evidence[field.id]!==field.evidence);
    if(wrong){
      this.focused=wrong.id;this.updateRows();this.persist();
      this.message.setText(`${wrong.label} is not supported by its attachment. Check cancellations, approval and what the log actually confirms.`);return;
    }
    this.finished=true;this.persist();this.showSuccess();
    if(!this.preview)this.emitBus('archive:redactedReportCompleted',{documentId:DATA.documentId,flag:FLAG});
  }
  showSuccess() {
    this.checkButton.setVisible(false);
    this.rows.forEach(row=>{row.box.disableInteractive();row.left.disableInteractive();row.right.disableInteractive();});
    this.sourceBoxes.forEach(item=>item.box.disableInteractive());
    this.message.setText(DATA.success).setFontSize(20).setWordWrapWidth(1290);
    this.mode.setText(this.preview?'PREVIEW COMPLETE / no story changes':this.savedOk===false?'Progress updated; saving failed. Save manually.':DATA.lead);
    this.updateRows();
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1400,height/940);this.root.setScale(s).setPosition((width-1400*s)/2,(height-940*s)/2);}
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
  closeReport(){
    if(this.closing)return;this.closing=true;this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
