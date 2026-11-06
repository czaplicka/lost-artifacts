import { DetectiveOfficeScene as OriginalOfficeScene } from './DetectiveOfficeScene.js';
import { PIOfficeAnimations } from './pi-office/PIOfficeAnimations.js';
import { getHollySurvivalState,hollySurvivalData } from '../hollySurvivalUpdateService.js';
import { getHollyFinancialState,hollyFinancialData } from '../hollyFinancialLeadService.js';
import { getFinancialTraceStory } from '../financialTraceService.js';
export class DetectiveOfficeScene extends OriginalOfficeScene{
 init(data={}){super.init(data);this._hollyUpdateOpening=false;this.financeEntry=null;}
 create(){super.create();this.piOfficeAnimations=new PIOfficeAnimations(this);this.financeEntry=this.add.text(0,20,'FINANCIAL TRAIL',{fontFamily:'SpecialElite',fontSize:'20px',color:'#ffe2ae',backgroundColor:'#193023',padding:{x:14,y:10}}).setOrigin(1,0).setDepth(1400).setVisible(false).setInteractive({useHandCursor:true});this.financeEntry.on('pointerdown',()=>{void this.openFinancialTrace();});this.layoutOffice();}
 update(){super.update();if(this.financeEntry&&!this.disposed){const s=getFinancialTraceStory(),visible=s.eligible&&this.canUseOffice()&&!this.debugMode;this.financeEntry.setText(s.companyCompleted?'REVIEW FINANCIAL TRAIL':'FINANCIAL TRAIL').setVisible(visible);if(this.financeEntry.input)this.financeEntry.input.enabled=visible;}}
 openPhone(){if(this._hollyUpdateOpening||!this.canUseOffice()||this.debugMode)return;if(getHollySurvivalState().canContact){void this.openHollyCaseCall('survival');return;}if(getHollyFinancialState().canContact){void this.openHollyCaseCall('financial');return;}super.openPhone();}
 openHollyUpdate(){return this.openHollyCaseCall('survival');}openHollyFinancialLead(){return this.openHollyCaseCall('financial');}
 async openHollyCaseCall(kind){
  const financial=kind==='financial',getState=financial?getHollyFinancialState:getHollySurvivalState,DATA=financial?hollyFinancialData:hollySurvivalData;
  if(this._hollyUpdateOpening||!this.canUseOffice()||this.debugMode||!getState().canContact)return false;
  const token=this.runToken;this._hollyUpdateOpening=true;this.activeDevice='holly-case-call';this.refreshInteractions();
  const release=()=>{if(this.disposed||this.runToken!==token)return;this._hollyUpdateOpening=false;if(this.activeDevice==='holly-case-call')this.activeDevice=null;if(this.sys.isActive()){this.hideGameplayHud();this.refreshInteractions();}};
  try{const module=financial?await import('../hollyFinancialLeadLauncher.js'):await import('../hollySurvivalUpdateLauncher.js');if(!this.isCurrent(token))return false;const open=financial?module.openHollyFinancialLead:module.openHollySurvivalUpdate;
   const opened=open(this.game,{preview:false,returnSceneKey:'DetectiveOfficeScene',onFinished:r=>{release();if(this.isCurrent(token))this.showFeedback(r.completed?DATA.messages.complete:'Call paused. Use the telephone to resume.');}});if(!opened){release();this.showFeedback('The call is already open or no longer available.');return false;}return true;
  }catch(error){release();if(this.isCurrent(token))this.showFeedback(DATA.messages.loadFailed);console.error('[DetectiveOfficeScene] Holly call:',error);return false;}
 }
 async openFinancialTrace(){
  if(!this.canUseOffice()||this.debugMode||!getFinancialTraceStory().eligible)return;
  const token=this.runToken;this.activeDevice='financial-trace';this.refreshInteractions();
  const release=()=>{if(this.disposed||this.runToken!==token)return;if(this.activeDevice==='financial-trace')this.activeDevice=null;if(this.sys.isActive()){this.hideGameplayHud();this.refreshInteractions();}};
  try{const{openFinancialTrace}=await import('../financialTraceLauncher.js');if(!this.isCurrent(token))return;
   if(!openFinancialTrace(this.game,{preview:false,returnSceneKey:'DetectiveOfficeScene',onFinished:r=>{release();if(this.isCurrent(token)&&r.companyUnlocked&&!r.completed)this.showFeedback('Use your telephone directory to contact Second Opinion Tracing.');}})){release();this.showFeedback('The financial trail is already open or unavailable.');}
  }catch(error){release();if(this.isCurrent(token))this.showFeedback('The financial trail could not be opened.');console.error('[Financial trace]',error);}
 }
 layoutOffice(){super.layoutOffice();this.piOfficeAnimations?.layout();this.financeEntry?.setPosition(this.scale.width-20,20);}
 cleanupOffice(){this._hollyUpdateOpening=false;this.financeEntry?.removeAllListeners();this.financeEntry=null;this.piOfficeAnimations?.destroy();this.piOfficeAnimations=null;super.cleanupOffice();}
}
