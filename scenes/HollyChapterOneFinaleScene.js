import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { loadJson } from '../config/loadJson.js';
import { HOLLY_CHAPTER_ONE_CALL, getHollyChapterOneState,
  saveHollyChapterOnePosition, completeHollyChapterOne } from '../hollyChapterOneService.js';

const DATA = await loadJson('../assets/data/hollyChapterOneFinale.json', import.meta.url);

export class HollyChapterOneFinaleScene extends BaseScene {
  constructor() { super({ key: 'HollyChapterOneFinaleScene' }); }
  init(data = {}) {
    this.preview = data.preview !== false;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.lineIndex = -1; this.finished = false; this.closing = false;
    this.layerStates = []; this.parentPausedByMe = false; this.savedOk = null;
  }
  create() {
    super.create();
    this.cameras.main.setBackgroundColor('#161417');
    this.root = this.add.container(0,0);
    this.root.add(this.add.rectangle(600,400,1200,800,0x242025));
    this.root.add(this.add.rectangle(600,405,1090,610,0x332b2b).setStrokeStyle(3,0x9b7952));
    this.heading = this.label(600,145,DATA.title,25,'#f1d28a','PressStart2P');
    this.speaker = this.label(600,242,'CASE UPDATE',25,'#e5b879');
    this.body = this.label(600,382,DATA.offer,29,'#eee1c6');
    this.body.setWordWrapWidth(930).setLineSpacing(10);
    this.progress = this.label(600,558,'',18,'#b7a58d');
    this.nextButton = this.button(600,633,'CALL HOLLY',()=>this.next());
    this.backButton = this.button(600,714,'LATER',()=>this.closeFinale());
    this.mode = this.label(600,770,this.preview?'PREVIEW / no story changes':'STORY / chapter I finale',16,'#a99a83');
    this.allowed = this.preview || getHollyChapterOneState().canContact;
    if (!this.allowed) {
      this.speaker.setText('NOT AVAILABLE');
      this.body.setText('Finish the fourth mission, hear Alex\'s account and complete the reconstruction first. A completed chapter cannot be completed twice.');
      this.nextButton.setVisible(false);this.backButton.setText('BACK');
    } else if (!this.preview) {
      const saved = MainStoryManager.getSideClue(HOLLY_CHAPTER_ONE_CALL);
      if (saved?.completed !== true && Number.isInteger(saved?.lineIndex) &&
          saved.lineIndex >= 0 && saved.lineIndex < DATA.lines.length) {
        this.lineIndex = saved.lineIndex;this.renderLine();
      }
    }
    this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restoreBackground();this.onFinished=null;});
  }
  label(x,y,text,size=24,color='#eee1c6',font='SpecialElite') {
    const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1040}}).setOrigin(0.5);
    this.root.add(object);return object;
  }
  button(x,y,text,callback) {
    const object=this.add.text(x,y,text,{fontFamily:'SpecialElite, monospace',fontSize:'23px',color:'#f1d89d',backgroundColor:'#4b3932',padding:{x:24,y:13}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',()=>{if(!this.closing)callback();});this.root.add(object);return object;
  }
  next() {
    if(!this.allowed||this.finished||this.closing)return;
    if(this.lineIndex < DATA.lines.length-1){
      this.lineIndex+=1;
      if(!this.preview)this.savedOk=saveHollyChapterOnePosition(this.lineIndex);
      this.renderLine();
      return;
    }
    if(!this.preview){
      const result=completeHollyChapterOne();
      if(!result.success){this.progress.setText('The story requirements changed. Return and reopen the call.');return;}
      this.savedOk=result.saved;
    }
    this.finished=true;
    this.heading.setText(DATA.chapterTitle).setFontSize(22);
    this.speaker.setText(DATA.nextTitle).setFontSize(24);
    this.body.setText(DATA.nextObjective);
    this.progress.setText(this.preview?'Preview complete. The actual chapter was not changed.':this.savedOk===false?DATA.saveWarning:'New objective recorded. Chapter II is unlocked.').setWordWrapWidth(950);
    this.nextButton.setVisible(false);this.backButton.setText('RETURN');
    if(!this.preview)this.emitBus('mainStory:hollyChapterOneCompleted',{chapter:1,nextChapter:2});
  }
  renderLine() {
    const line=DATA.lines[this.lineIndex];
    this.speaker.setText(line.speaker);this.body.setText(line.text);
    this.progress.setText(`CONVERSATION ${this.lineIndex+1} / ${DATA.lines.length}`);
    this.nextButton.setText(this.lineIndex===DATA.lines.length-1?'END CHAPTER I':'CONTINUE');
    this.backButton.setText('PAUSE CALL');
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1200,height/800);this.root.setScale(s).setPosition((width-1200*s)/2,(height-800*s)/2);}
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
  closeFinale(){
    if(this.closing)return;this.closing=true;const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
