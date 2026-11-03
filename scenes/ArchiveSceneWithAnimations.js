import { ArchiveScene as OriginalArchiveScene } from './ArchiveScene.js';
import { ArchiveAnimations } from './archive/ArchiveAnimations.js';
import { saveGameState } from '../gameStatePersistence.js';
import { isReportSubmitted } from '../archiveReportService.js';
import { archiveStoryConfig as storyConfig, getMissingReportState,
  startMissingReportVisit, searchMissingReportCatalogue,
  discoverShredderFragments } from '../archiveMissingReportService.js';
import { thirdMissionConfig, getThirdMissionStory, markFrankReferral } from '../thirdMissionStoryService.js';
import { insuranceStoryConfig, getInsuranceArchiveStory,
  markInsuranceDocumentsReceived, markInsuranceDiscussion } from '../insuranceArchiveStoryService.js';

export class ArchiveScene extends OriginalArchiveScene {
  init(data={}){super.init(data);this.storyButtons=null;this._documentOpening=false;}
  create(){
    super.create();this.archiveAnimations=new ArchiveAnimations(this);this.createStoryButtons();
    startMissingReportVisit(this.gameState);this.refreshArchive();
    if(getMissingReportState(this.gameState).active)this.showStatus(storyConfig.messages.absent);
  }
  createStoryButtons(){
    const make=(text,action)=>{
      const button=this.add.text(0,0,text,{fontFamily:'SpecialElite',fontSize:'22px',color:'#f2d477',backgroundColor:'#17110e',padding:{x:14,y:10}})
        .setOrigin(0.5,0).setDepth(100).setVisible(false).setInteractive({useHandCursor:true});
      button.on('pointerdown',action);button.on('pointerover',()=>button.setColor('#ffffff'));button.on('pointerout',()=>button.setColor('#f2d477'));return button;
    };
    this.storyButtons={
      catalogue:make(storyConfig.buttons.catalogue,()=>this.searchCatalogue()),
      shredder:make(storyConfig.buttons.shredder,()=>{void this.openRecoveredDocument(false);}),
      read:make(storyConfig.buttons.read,()=>{void this.openRecoveredDocument(true);}),
      redacted:make(thirdMissionConfig.buttons.decode,()=>{void this.openRedactedDocument();}),
      insurance:make(insuranceStoryConfig.buttons.compare,()=>{void this.openInsuranceDocument();})
    };
  }
  refreshArchive(){
    super.refreshArchive();if(this._archiveDisposed)return;
    const story=getMissingReportState(this.gameState);
    if(story.active){
      this.frankPresent=false;this.frankHotspot?.setVisible(false);
      if(this.frankHotspot?.input)this.frankHotspot.input.enabled=false;
      this.frankLabel?.setVisible(false);this.frankHighlight?.clear();this.puzzleButton?.setVisible(false);
      if(this.puzzleButton?.input)this.puzzleButton.input.enabled=false;
      this.nextMissionButton?.setVisible(false);if(this.nextMissionButton?.input)this.nextMissionButton.input.enabled=false;
      if(this.textures.exists('archive')){
        if(!this.background)this.background=this.add.image(0,0,'archive').setOrigin(0).setDepth(0);else this.background.setTexture('archive');
        this.background.setVisible(true);
      }else this.background?.setVisible(false);
    }
    if(this.storyButtons){
      this.setStoryButton(this.storyButtons.catalogue,story.active);
      this.setStoryButton(this.storyButtons.shredder,story.active&&story.searched);
      this.setStoryButton(this.storyButtons.read,story.completed);
      const third=getThirdMissionStory(this.gameState);
      this.storyButtons.redacted.setText(third.decoded?thirdMissionConfig.buttons.read:thirdMissionConfig.buttons.decode);
      this.setStoryButton(this.storyButtons.redacted,!story.active&&third.canDecode);
      const insurance=getInsuranceArchiveStory(this.gameState);
      this.storyButtons.insurance.setText(insurance.examined?insuranceStoryConfig.buttons.review:insuranceStoryConfig.buttons.compare);
      this.setStoryButton(this.storyButtons.insurance,!story.active&&insurance.canCompare);
    }
    this.layoutArchive();
  }
  setStoryButton(button,visible){button.setVisible(visible);if(button.input)button.input.enabled=visible;}
  interactWithFrank(){
    if(getMissingReportState(this.gameState).active)return;
    if(this.canInteract()&&this.frankPresent&&isReportSubmitted(this.gameState)){
      const insurance=getInsuranceArchiveStory(this.gameState);
      if(insurance.needsOffer){
        this.openConversation({lines:insuranceStoryConfig.offerLines},()=>{
          const result=markInsuranceDocumentsReceived(this.gameState);this.refreshArchive();
          this.showStatus(result.success?insuranceStoryConfig.messages.received+(result.saved?'':` ${insuranceStoryConfig.messages.saveFailed}`):'The story requirements changed. Please talk to Frank again.');
        });return;
      }
      if(insurance.needsDiscussion){
        this.openConversation({lines:insuranceStoryConfig.discussionLines},()=>{
          const result=markInsuranceDiscussion(this.gameState);this.refreshArchive();
          this.showStatus(result.success?insuranceStoryConfig.messages.discussed+(result.saved?'':` ${insuranceStoryConfig.messages.saveFailed}`):'Complete the document comparison first.');
        });return;
      }
      if(insurance.canCompare&&!insurance.examined){this.showStatus(insuranceStoryConfig.messages.received);return;}
      if(insurance.discussed){this.showStatus(insuranceStoryConfig.messages.discussed);return;}
      const third=getThirdMissionStory(this.gameState);
      if(third.needsFrank){
        this.openConversation({lines:thirdMissionConfig.frankLines},()=>{
          const saved=markFrankReferral(this.gameState);this.refreshArchive();
          this.showStatus(thirdMissionConfig.messages.referred+(saved?'':` ${thirdMissionConfig.messages.saveFailed}`));
        });return;
      }
    }
    super.interactWithFrank();
  }
  startReportConversation(item){
    if(getMissingReportState(this.gameState).active){this.showStatus(storyConfig.messages.absent);return;}
    super.startReportConversation(item);
  }
  handleItemDrop(drop){if(!getMissingReportState(this.gameState).active)super.handleItemDrop(drop);}
  openNextMission(){return getMissingReportState(this.gameState).active?Promise.resolve(false):super.openNextMission();}
  canInteract(){return super.canInteract()&&!this._documentOpening;}
  searchCatalogue(){
    if(!this.canInteract()||!getMissingReportState(this.gameState).active)return;
    const saved=searchMissingReportCatalogue(this.gameState);this.refreshArchive();
    this.showStatus(storyConfig.messages.missing+(saved?'':` ${storyConfig.messages.saveFailed}`));
  }
  async openRecoveredDocument(readOnlyVisit=false){
    const story=getMissingReportState(this.gameState);
    if(!this.canInteract()||(readOnlyVisit?!story.completed:!(story.active&&story.searched)))return;
    await this.openStoryDocument('shredded',()=>{if(!readOnlyVisit)discoverShredderFragments(this.gameState);});
  }
  async openRedactedDocument(){
    if(!this.canInteract()||!getThirdMissionStory(this.gameState).canDecode)return;
    await this.openStoryDocument('redacted');
  }
  async openInsuranceDocument(){
    if(!this.canInteract()||!getInsuranceArchiveStory(this.gameState).canCompare)return;
    await this.openStoryDocument('insurance');
  }
  async openStoryDocument(kind,beforeLaunch=null){
    const token=this._archiveRunToken;this._documentOpening=true;this._puzzleOpen=true;
    try{
      await this._uiSetupPromise;if(this._archiveDisposed||token!==this._archiveRunToken)return;
      this.getPlayerHudScene()?.closeAllUIPanels?.();
      let module,key;
      if(kind==='shredded'){module=await import('./ShreddedReportScene.js');key='ShreddedReportScene';}
      else if(kind==='redacted'){module=await import('./RedactedReportScene.js');key='RedactedReportScene';}
      else if(kind==='insurance'){module=await import('./TypewriterComparisonScene.js');key='TypewriterComparisonScene';}
      else throw new Error(`Unknown document type: ${kind}`);
      if(this._archiveDisposed||token!==this._archiveRunToken)return;
      if(!this.hasScene(key))this.scene.manager.add(key,module[key],false);
      if(this.isSceneRunning(key))throw new Error('Document scene is already open.');beforeLaunch?.();
      this.scene.launch(key,{preview:false,returnSceneKey:'ArchiveScene',onFinished:()=>this.finishStoryDocument(token,kind)});
      this.scene.bringToTop(key);
    }catch(error){
      console.error('[ArchiveScene] Document launch failed:',error);
      if(this._archiveDisposed||token!==this._archiveRunToken)return;
      this._documentOpening=false;this._puzzleOpen=false;void this.setupArchiveUiLayers();
      this.showStatus(kind==='insurance'?insuranceStoryConfig.messages.loadFailed:kind==='shredded'?storyConfig.messages.failed:thirdMissionConfig.messages.loadFailed);
    }
  }
  finishStoryDocument(token,kind){
    if(this._archiveDisposed||token!==this._archiveRunToken)return;
    this._documentOpening=false;this._puzzleOpen=false;
    const saved=saveGameState();this.refreshArchive();void this.setupArchiveUiLayers();
    if(kind==='insurance'){
      const insurance=getInsuranceArchiveStory(this.gameState);
      this.showStatus((insurance.discussed?insuranceStoryConfig.messages.discussed:insurance.examined?insuranceStoryConfig.messages.examined:insuranceStoryConfig.messages.unfinished)+(saved?'':` ${insuranceStoryConfig.messages.saveFailed}`));
    }else if(kind==='redacted'){
      this.showStatus((getThirdMissionStory(this.gameState).decoded?thirdMissionConfig.messages.decoded:thirdMissionConfig.messages.unfinished)+(saved?'':` ${thirdMissionConfig.messages.saveFailed}`));
    }else{
      this.showStatus(getMissingReportState(this.gameState).completed?storyConfig.messages.restored+(saved?'':` ${storyConfig.messages.saveFailed}`):storyConfig.messages.found);
    }
  }
  layoutArchive(){
    super.layoutArchive();this.archiveAnimations?.layout();if(!this.storyButtons)return;
    const{width,height}=this.scale;const font=width<600?'14px':'22px';Object.values(this.storyButtons).forEach(button=>button.setFontSize(font));
    const y=Math.max(165,height*0.28);
    this.storyButtons.catalogue.setPosition(width/2,y);this.storyButtons.shredder.setPosition(width/2,y+62);
    this.storyButtons.read.setPosition(width/2,y);this.storyButtons.redacted.setPosition(width/2,y+62);this.storyButtons.insurance.setPosition(width/2,y+124);
  }
  cleanupArchive(){
    if(this._archiveDisposed)return;if(this.storyButtons)Object.values(this.storyButtons).forEach(button=>button.removeAllListeners());
    this.storyButtons=null;this.archiveAnimations?.destroy();this.archiveAnimations=null;super.cleanupArchive();
  }
}
