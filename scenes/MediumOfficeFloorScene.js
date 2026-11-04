import { MediumOfficeScene } from './MediumOfficeScene.js';
import { saveGameState } from '../gameStatePersistence.js';
import { MEDIUM_OFFICE_CONFIG } from '../config/mediumOfficeConfig.js';

export class MediumOfficeFloorScene extends MediumOfficeScene {
  init(data={}){super.init(data);this.hrOpening=false;this.hrEntry=null;}
  create(){
    super.create();
    this.hrEntry=this.add.text(MEDIUM_OFFICE_CONFIG.width-30,30,'HUMAN RESOURCES >',this.style(23))
      .setOrigin(1,0).setInteractive({useHandCursor:true});
    this.root.add(this.hrEntry);
    this.hrEntry.on('pointerover',()=>{if(!this.uiLocked)this.hrEntry.setColor('#ffffff');});
    this.hrEntry.on('pointerout',()=>this.hrEntry.setColor('#ffe5ae'));
    this.hrEntry.on('pointerdown',()=>{void this.openHR();});
    this.refreshPanelLock();
  }
  refreshPanelLock(){
    super.refreshPanelLock();
    if(this.hrOpening)this.applyLock(true);
    if(this.hrEntry){
      this.hrEntry.setVisible(this.allowed&&!this.debugMode);
      if(this.hrEntry.input)this.hrEntry.input.enabled=this.allowed&&!this.uiLocked&&!this.leaving&&!this.debugMode;
    }
  }
  async openHR(){
    if(!this.isOfficeActive()||!this.allowed||this.uiLocked||this.debugMode||this.hrOpening)return;
    const token=this._runToken;this.hrOpening=true;this.refreshPanelLock();this.tooltip?.setVisible(false);
    try{
      const{openMargeHR}=await import('../margeHRLauncher.js');
      if(!this.isCurrentOfficeRun(token)||!this.sys.isActive())return;
      const opened=openMargeHR(this.game,{preview:false,returnSceneKey:'MediumOfficeScene',onFinished:()=>{
        if(!this.isCurrentOfficeRun(token))return;
        this.hrOpening=false;this.registry.set('currentSceneKey','MediumOfficeScene');this.refreshPanelLock();
      }});
      if(!opened)throw new Error('HR is already open.');
    }catch(error){
      console.error('[MediumOfficeFloorScene] HR:',error);
      if(this.isCurrentOfficeRun(token)){this.hrOpening=false;this.refreshPanelLock();this.showOfficeStatusMessage(error.message||'HR could not be opened.');}
    }
  }
  async returnDownstairs(){
    if(!this.isOfficeActive()||this.uiLocked||this.debugMode||this.hrOpening)return;
    this.leaving=true;this.refreshPanelLock();saveGameState();
    try{
      const opened=await this.goto('OfficeScene',{gameState:this.gameState,entryView:'elevator'});
      if(opened===false&&!this.disposed){this.leaving=false;this.refreshPanelLock();this.showOfficeStatusMessage('The lower floor could not be opened.');}
    }catch(error){if(!this.disposed){this.leaving=false;this.refreshPanelLock();this.showOfficeStatusMessage(error.message);}}
  }
}
