import { OfficeScene as OriginalOfficeScene } from './OfficeScene.js';
import { OfficeScreenAnimations } from './office/OfficeScreenAnimations.js';
import { OfficeElevatorAnimations } from './office/OfficeElevatorAnimations.js';
import { OfficeCabinetAnimations } from './office/OfficeCabinetAnimations.js';
import { OfficeStorageAnimations } from './office/OfficeStorageAnimations.js';
import { OfficePanelActions } from './office/OfficePanelActions.js';
import { installChapterTwoDeskEntry } from './office/ChapterTwoDeskEntry.js';
import { OfficeElevatorAccess,canAccessUpperOffice } from './office/OfficeElevatorAccess.js';

const LAMP_CONFIG={
  sourceKey:'office-desk-lamp-source-v1',textureKey:'office-desk-lamp-frames-v1',
  animationKey:'office-desk-lamp-flicker-v2',url:'assets/spritesheet/office/desk-lamp-flicker.png',
  sheetWidth:2064,sheetHeight:512,frameWidth:344,frameHeight:512,frameCount:6,
  x:1020,y:397,width:190,height:290,depth:1,minDelay:9000,maxDelay:22000,frameRate:4
};
export class OfficeScene extends OriginalOfficeScene {
  init(data={}){
    super.init(data);this.elevatorAccess=null;this._requestedEntryView=data.entryView??null;
  }
  preload(){
    super.preload();
    if(!this.textures.exists(LAMP_CONFIG.sourceKey))this.load.image(LAMP_CONFIG.sourceKey,LAMP_CONFIG.url);
    if(!this.textures.exists('elevator_close'))this.load.image('elevator_close','assets/local/elevator_close.webp');
  }
  createBackgrounds(width,height){
    super.createBackgrounds(width,height);
    this.refreshElevatorTexture();
  }
  refreshElevatorTexture(){
    const key=canAccessUpperOffice(this.gameState)?'elevator_open':'elevator_close';
    if(this.elevatorBackground?.active&&this.rooms?.elevator&&this.textures.exists(key)){
      this.elevatorBackground.setTexture(key).setDisplaySize(this.rooms.elevator.width,this.scale.height);
    }
  }
  refreshMissionProgressVisuals(){
    if(!this.isCurrentOfficeRun())return;
    this.refreshElevatorTexture();this.elevatorAccess?.refresh();
    this.hotspotManager?.refreshAvailability?.();this.refreshEntranceButtons();
  }
  onFirstMissionCompleted(){
    if(!this.isCurrentOfficeRun())return;
    // Preserve the tutorial flag, but do not open the elevator after case one.
    this.gameState.progress??={};this.gameState.progress.firstMissionCompleted=true;
    this.refreshMissionProgressVisuals();
  }
  refreshPanelLock(){
    super.refreshPanelLock();
    if(this.elevatorAccess?.busy)this.applyLock(true);
  }
  create(){
    this._officePanelRequest=null;super.create();
    this.deskLamp=null;this.deskLampTimer=null;
    this.officeScreens=null;this.elevatorEffects=null;this.cabinetEffects=null;this.storageEffects=null;
    this.events.once('shutdown',this.destroyDeskLamp,this);this.events.once('destroy',this.destroyDeskLamp,this);
    this.createDeskLamp();
    this.officeScreens=new OfficeScreenAnimations(this);
    this.elevatorEffects=new OfficeElevatorAnimations(this);
    this.cabinetEffects=new OfficeCabinetAnimations(this);
    this.storageEffects=new OfficeStorageAnimations(this);
    this.chapterTwoDeskEntry=installChapterTwoDeskEntry(this);
    this.elevatorAccess=new OfficeElevatorAccess(this);
    this.onBus('rank-changed',()=>this.refreshMissionProgressVisuals());
    if(this._requestedEntryView==='elevator')this.navigation?.goTo('elevator',false);
    this.refreshMissionProgressVisuals();
    console.info('[OfficeAnimations] Cabinet and globe-room effects initialized.');
  }
  getOfficeAnimationStatus(){return{cabinet:this.cabinetEffects?.debugStatus(),storage:this.storageEffects?.debugStatus()};}
  createDeskLamp(){
    if(!this.rooms?.office?.bg){console.warn('[OfficeLamp] Office background is unavailable.');return;}
    if(!this.prepareDeskLampTexture())return;this.prepareDeskLampAnimation();
    this.deskLamp=this.add.sprite(0,0,LAMP_CONFIG.textureKey,0).setOrigin(0,0).setDepth(LAMP_CONFIG.depth);
    this.positionDeskLamp();this.deskLamp.on(`animationcomplete-${LAMP_CONFIG.animationKey}`,this.onDeskLampFlickerComplete,this);
    this.scale.on('resize',this.positionDeskLamp,this);this.scheduleDeskLampFlicker();
  }
  prepareDeskLampTexture(){
    if(this.textures.exists(LAMP_CONFIG.textureKey))return true;
    if(!this.textures.exists(LAMP_CONFIG.sourceKey)){console.error('[OfficeLamp] Could not load:',LAMP_CONFIG.url);return false;}
    const source=this.textures.get(LAMP_CONFIG.sourceKey).getSourceImage();
    if(source.width!==LAMP_CONFIG.sheetWidth||source.height!==LAMP_CONFIG.sheetHeight){console.error('[OfficeLamp] Wrong spritesheet size.',source.width,source.height);return false;}
    this.textures.addSpriteSheet(LAMP_CONFIG.textureKey,source,{frameWidth:LAMP_CONFIG.frameWidth,frameHeight:LAMP_CONFIG.frameHeight,startFrame:0,endFrame:LAMP_CONFIG.frameCount-1,margin:0,spacing:0});return true;
  }
  prepareDeskLampAnimation(){
    if(this.anims.exists(LAMP_CONFIG.animationKey))return;
    this.anims.create({key:LAMP_CONFIG.animationKey,frames:this.anims.generateFrameNumbers(LAMP_CONFIG.textureKey,{start:0,end:LAMP_CONFIG.frameCount-1}),frameRate:LAMP_CONFIG.frameRate,repeat:0});
  }
  positionDeskLamp(){
    const bg=this.rooms?.office?.bg;if(!this.deskLamp?.active||!bg?.active)return;
    const sx=bg.displayWidth/1920,sy=bg.displayHeight/1080;
    this.deskLamp.setPosition(bg.x+LAMP_CONFIG.x*sx,bg.y+LAMP_CONFIG.y*sy).setDisplaySize(LAMP_CONFIG.width*sx,LAMP_CONFIG.height*sy);
  }
  scheduleDeskLampFlicker(){
    this.deskLampTimer?.remove(false);this.deskLampTimer=null;if(!this.deskLamp?.active)return;
    this.deskLampTimer=this.time.delayedCall(Phaser.Math.Between(LAMP_CONFIG.minDelay,LAMP_CONFIG.maxDelay),()=>{
      this.deskLampTimer=null;if(!this.deskLamp?.active)return;
      if(!this.sys.isActive()||this.currentView!=='office'){this.scheduleDeskLampFlicker();return;}
      this.deskLamp.play(LAMP_CONFIG.animationKey);
    });
  }
  onDeskLampFlickerComplete(){if(!this.deskLamp?.active)return;this.deskLamp.setFrame(0);this.scheduleDeskLampFlicker();}
  destroyDeskLamp(){
    this.events.off('shutdown',this.destroyDeskLamp,this);this.events.off('destroy',this.destroyDeskLamp,this);
    this.scale.off('resize',this.positionDeskLamp,this);
    this.elevatorAccess?.destroy();this.elevatorAccess=null;
    this.chapterTwoDeskEntry?.destroy();this.chapterTwoDeskEntry=null;
    this.officeScreens?.destroy();this.officeScreens=null;this.elevatorEffects?.destroy();this.elevatorEffects=null;
    this.cabinetEffects?.destroy();this.cabinetEffects=null;this.storageEffects?.destroy();this.storageEffects=null;
    this.deskLampTimer?.remove(false);this.deskLampTimer=null;
    if(this.deskLamp){this.deskLamp.off(`animationcomplete-${LAMP_CONFIG.animationKey}`,this.onDeskLampFlickerComplete,this);this.deskLamp.destroy();this.deskLamp=null;}
  }
}
Object.assign(OfficeScene.prototype,OfficePanelActions);
