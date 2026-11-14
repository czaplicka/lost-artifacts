import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { loadJson } from '../config/loadJson.js';
import { HollyChapterOneCallUI } from '../ui/HollyChapterOneCallUI.js';
import { HOLLY_CHAPTER_ONE_CALL, getHollyChapterOneState,
  saveHollyChapterOnePosition, completeHollyChapterOne } from '../hollyChapterOneService.js';

const DATA=await loadJson('../assets/data/hollyChapterOneFinale.json',import.meta.url);
const PORTRAIT_KEY='holly';
const DESK_KEY='pi_phone_desk';

export class HollyChapterOneFinaleScene extends BaseScene {
  constructor(){super({key:'HollyChapterOneFinaleScene'});}
  init(data={}){
    this.preview=data.preview!==false;
    this.returnSceneKey=data.returnSceneKey??null;
    this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.lineIndex=-1;this.finished=false;this.closing=false;
    this.layerStates=[];this.parentPausedByMe=false;this.savedOk=null;this.callUI=null;
  }
  preload(){
    if(!this.textures.exists(PORTRAIT_KEY))this.load.image(PORTRAIT_KEY,'assets/pi/holly.webp');
    if(!this.textures.exists(DESK_KEY))this.load.image(DESK_KEY,'assets/ui/pi-phone/desk.webp');
  }
  create(){
    super.create();this.cameras.main.setBackgroundColor('#050b08');
    this.callUI=new HollyChapterOneCallUI(this,{
      portraitKey:PORTRAIT_KEY,deskKey:DESK_KEY,onNext:()=>this.next(),onClose:()=>this.closeFinale()
    });
    this.allowed=this.preview||getHollyChapterOneState().canContact;
    this.callUI.showOffer(DATA.offer,this.preview);
    if(!this.allowed){
      this.callUI.showUnavailable(__dialogueText("scenes/HollyChapterOneFinaleScene.js", "t_509eee3d9d7f2e087b03"));
    }else if(!this.preview){
      const saved=MainStoryManager.getSideClue(HOLLY_CHAPTER_ONE_CALL);
      if(saved?.completed!==true&&Number.isInteger(saved?.lineIndex)&&saved.lineIndex>=0&&saved.lineIndex<DATA.lines.length){
        this.lineIndex=saved.lineIndex;this.renderLine();
      }
    }
    this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard){
      const advance=event=>{if(event.repeat)return;event.preventDefault();this.next();};
      this.trackInputEvent(this.input.keyboard,'keydown-SPACE',advance);
      this.trackInputEvent(this.input.keyboard,'keydown-ENTER',advance);
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{if(!event.repeat)this.closeFinale();});
    }
    this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.callUI?.destroy();this.callUI=null;this.restoreBackground();this.onFinished=null;
    });
  }
  next(){
    if(!this.allowed||this.finished||this.closing)return;
    if(this.callUI.finishCurrentTyping())return;
    if(this.lineIndex<DATA.lines.length-1){
      this.lineIndex+=1;
      if(!this.preview)this.savedOk=saveHollyChapterOnePosition(this.lineIndex);
      this.renderLine();return;
    }
    if(!this.preview){
      const result=completeHollyChapterOne();
      if(!result.success){this.callUI.addSystemNote(__dialogueText("scenes/HollyChapterOneFinaleScene.js", "t_57a5273b4fa1edfee491"));return;}
      this.savedOk=result.saved;
    }
    this.finished=true;
    const note=this.preview?__dialogueText("scenes/HollyChapterOneFinaleScene.js", "t_236c541bb1a2bd5ba4c0"):this.savedOk===false?DATA.saveWarning:__dialogueText("scenes/HollyChapterOneFinaleScene.js", "t_1b73b7bcc42ba4e3a531");
    this.callUI.showResult(DATA.chapterTitle,DATA.nextTitle,DATA.nextObjective,note);
    if(!this.preview)this.emitBus('mainStory:hollyChapterOneCompleted',{chapter:1,nextChapter:2});
  }
  renderLine(){this.callUI.showLine(DATA.lines,this.lineIndex);}
  layout(){this.callUI?.layout();}
  update(time){this.callUI?.update(time);}
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
    if(this.closing)return;this.closing=true;
    this.callUI?.destroy();this.callUI=null;
    const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({completed:this.finished,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
