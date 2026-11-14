import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { HollySurvivalCallUI } from '../ui/HollySurvivalCallUI.js';
import { StoryCallAudio } from './phone/StoryCallAudio.js';
export class HollyCaseCallScene extends BaseScene{
  constructor(key,hooks){super({key});this.callHooks=hooks;}
  init(data={}){
    this.storyCallAudio?.destroy();this.storyCallAudio=null;
    this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.progress=null;this.finished=false;this.closing=false;this.savedOk=null;this.callUI=null;this.silenceUntil=0;this.inputLockedUntil=0;
    this.layerStates=[];this.parentPausedByMe=false;
  }
  preload(){
    if(!this.textures.exists('holly'))this.load.image('holly','assets/pi/holly.webp');
    if(!this.textures.exists('pi_phone_desk'))this.load.image('pi_phone_desk','assets/ui/pi-phone/desk.webp');
    StoryCallAudio.preload(this);
  }
  create(){
    super.create();this.cameras.main.setBackgroundColor('#050b08');const h=this.callHooks,DATA=h.data,status=h.getState();this.allowed=this.preview||status.canContact;
    this.progress=h.normalize(DATA,this.preview?null:status);
    this.storyCallAudio=new StoryCallAudio(this,{started:this.progress.lineIndex>=0||Boolean(this.progress.completed)});
    this.callUI=new HollySurvivalCallUI(this,{portraitKey:'holly',deskKey:'pi_phone_desk',onNext:()=>this.next(),onClose:()=>this.closeCall()});
    this.callUI.showOffer(DATA.offer,this.preview);
    if(!this.allowed)this.callUI.showUnavailable(DATA.unavailable||__dialogueText("scenes/HollyCaseCallScene.js", "t_bd515abacb0590e9d0fc"));
    else if(this.progress.lineIndex>=0)this.renderLine();
    this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard){
      for(const name of ['keydown-SPACE','keydown-ENTER'])this.trackInputEvent(this.input.keyboard,name,event=>{if(!event.repeat){event.preventDefault();this.next();}});
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{if(!event.repeat)this.closeCall();});
    }
    this.suspendBackground();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.storyCallAudio?.destroy();this.storyCallAudio=null;
      this.callUI?.destroy();this.callUI=null;this.restoreBackground();this.onFinished=null;
    });
  }
  persist(){
    if(this.preview||!this.allowed)return true;const result=this.callHooks.save(this.progress);this.savedOk=result.saved;
    if(!result.success){this.callUI?.addSystemNote(__dialogueText("scenes/HollyCaseCallScene.js", "t_d07943911a2176f6e9fc"));return false;}return true;
  }
  next(){
    if(!this.allowed||this.finished||this.closing||this.time.now<this.inputLockedUntil)return;this.inputLockedUntil=this.time.now+180;
    if(this.callUI.finishCurrentTyping())return;
    const h=this.callHooks,DATA=h.data,result=h.advance(DATA,this.progress,Math.max(0,this.silenceUntil-this.time.now));if(!result.ok)return;
    const before=this.progress;this.progress=result.state;if(!this.persist()){this.progress=before;return;}
    if(before.lineIndex<0&&this.progress.lineIndex>=0)this.storyCallAudio?.connected();
    if(this.progress.completed){this.finished=true;this.callUI.setSilenceUntil(0);this.callUI.showResult(DATA.resultTitle,DATA.nextTitle,DATA.objective,this.preview?__dialogueText("scenes/HollyCaseCallScene.js", "t_4699a004d54fcc73b5ef"):this.savedOk===false?DATA.messages.saveFailed:__dialogueText("scenes/HollyCaseCallScene.js", "t_68bc020e28fc01cd59e9"));}
    else this.renderLine();
  }
  renderLine(){const DATA=this.callHooks.data;this.callUI.showLine(DATA.lines,this.progress.lineIndex);this.silenceUntil=this.time.now+(DATA.lines[this.progress.lineIndex]?.silenceMs||0);this.callUI.setSilenceUntil(this.silenceUntil);}
  layout(){this.callUI?.layout();}
  update(time){this.callUI?.update(time);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;}
  closeCall(){
    if(this.closing)return;this.closing=true;this.storyCallAudio?.destroy();this.storyCallAudio=null;
    this.persist();this.callUI?.destroy();this.callUI=null;const callback=this.onFinished;this.onFinished=null;this.restoreBackground();try{callback?.({preview:this.preview,completed:this.finished,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
