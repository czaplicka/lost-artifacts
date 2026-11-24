import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { courtState } from './court/CourtState.js';
import { courtPresentation } from './court/CourtPresentation.js';
import { courtHints } from './court/CourtHints.js';
import { courtRecovery } from './court/CourtRecovery.js';
import { courtRecoveryView } from './court/CourtRecoveryView.js';

export class CourtScene extends BaseScene {
  constructor(){super({key:'CourtScene'});}
  init(data={}){
    this.requestedSuspectId=data.suspectId??gameState.finalArrestSuspectId;
    Object.assign(this,{record:null,root:null,notice:null,buttons:[],busy:false,inputLockUntil:0,
      infoTimer:null,infoText:null,hintModal:null,hintButton:null,keyHandler:null,pageHideHandler:null,
      visibilityHandler:null,resizeHandler:null,loadErrorHandler:null,backgroundFailed:false,
      pageIndex:0,pageCount:1,questionPages:[''],answerPages:[],hintPage:0,hintPages:[''],dialogue:null,
      recoveryPlan:null,recoveryRecord:null,recoveryRoot:null,recoveryBusy:false,recoveryNotice:'',
      recoveryError:null,trail:null,trailSelection:{contact:0,reference:0},recoveryDialogue:null,recoveryMode:false});
  }
  preload(){
    this.loadErrorHandler=file=>{if(file.key==='courtroom'){this.backgroundFailed=true;console.error('[CourtScene] Background failed:',file.src);}};
    this.load.on('loaderror',this.loadErrorHandler);
    if(!this.textures.exists('courtroom'))this.load.image('courtroom','assets/local/courtroom.webp');
  }
  create(){if(this.tryCreateRecovery())return;this.createTrial();}
  startCourtScene(){
    super.create();this.load.off('loaderror',this.loadErrorHandler);EventBus.emit('hideHUD');
    for(const key of ['PlayerHudScene','UIScene','NewsHud']){
      const hud=this.getRegisteredScene(key);hud?.closeAllUIPanels?.();hud?.hideHud?.();
      if(hud)this.scene.setVisible(false,key);
    }
    audioManager.init(this);audioManager.stopAllMusic();audioManager.stopAllNonMusic();
  }
  createTrial(){
    this.startCourtScene();
    try{this.restoreOrCreateRecord();}
    catch(error){console.error('[CourtScene] Setup:',error);this.add.text(60,60,error.message,{
      fontFamily:'SpecialElite, monospace',fontSize:'26px',color:'#ffffff',wordWrap:{width:Math.max(200,this.scale.width-120)}});return;}
    this.cameras.main.setBackgroundColor('#12100e');this.root=this.add.container();
    this.fitRoot();this.drawCourtroom();this.createInterface();this.createOverlays();
    this.registerControls();this.registerLifecycle();this.save();this.render();
  }
  registerLifecycle(){
    this.pageHideHandler=()=>{if(this.record&&!this.busy)this.save();};
    this.visibilityHandler=()=>{if(document.hidden&&this.record&&!this.busy)this.save();};
    this.resizeHandler=()=>{if(this.recoveryMode)this.renderRecovery();else this.fitRoot();};
    window.addEventListener('pagehide',this.pageHideHandler);document.addEventListener('visibilitychange',this.visibilityHandler);
    this.scale.on('resize',this.resizeHandler);
    const cleanup=()=>{
      this.events.off('shutdown',cleanup);this.events.off('destroy',cleanup);
      window.removeEventListener('pagehide',this.pageHideHandler);document.removeEventListener('visibilitychange',this.visibilityHandler);
      this.scale.off('resize',this.resizeHandler);if(this.keyHandler)this.input.keyboard?.off('keydown',this.keyHandler);
      if(this.loadErrorHandler)this.load.off('loaderror',this.loadErrorHandler);
      this.infoTimer?.remove(false);this.infoTimer=null;this.hintModal?.destroy(true);this.hintModal=null;
      this.dialogue?.destroy();this.dialogue=null;this.clearRecoveryView();
    };
    this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
  }
}
Object.assign(CourtScene.prototype,courtState,courtPresentation,courtHints,courtRecovery,courtRecoveryView);
