import { ArchiveScene as OriginalArchiveScene } from './ArchiveScene.js';
import { ArchiveAnimations } from './archive/ArchiveAnimations.js';
import { saveGameState } from '../gameStatePersistence.js';
import { isReportSubmitted } from '../archiveReportService.js';
import { archiveStoryConfig as storyConfig,getMissingReportState,startMissingReportVisit,searchMissingReportCatalogue,discoverShredderFragments } from '../archiveMissingReportService.js';
import { thirdMissionConfig,getThirdMissionStory,markFrankReferral } from '../thirdMissionStoryService.js';
import { insuranceStoryConfig,getInsuranceArchiveStory,markInsuranceDocumentsReceived,markInsuranceDiscussion } from '../insuranceArchiveStoryService.js';
import { crashFollowupData,getCrashFollowupStory } from '../archiveCrashFollowupService.js';
import { radioSpliceData,getRadioSpliceStory } from '../radioSpliceService.js';
import { microfilmData,getMicrofilmStory } from '../johnMicrofilmService.js';
const DOCS={shredded:[()=>import('./ShreddedReportScene.js'),'ShreddedReportScene'],redacted:[()=>import('./RedactedReportScene.js'),'RedactedReportScene'],insurance:[()=>import('./TypewriterComparisonScene.js'),'TypewriterComparisonScene'],followup:[()=>import('./ArchiveCrashFollowupScene.js'),'ArchiveCrashFollowupScene'],radio:[()=>import('./RadioSpliceScene.js'),'RadioSpliceScene'],microfilm:[()=>import('./MicrofilmScene.js'),'MicrofilmScene']};
export class ArchiveScene extends OriginalArchiveScene{
 init(data={}){super.init(data);this.storyButtons=null;this.storyPager=null;this.storyPage=0;this._documentOpening=false;}
 create(){super.create();this.archiveAnimations=new ArchiveAnimations(this);this.createStoryButtons();startMissingReportVisit(this.gameState);this.refreshArchive();if(getMissingReportState(this.gameState).active)this.showStatus(storyConfig.messages.absent);}
 createStoryButtons(){
  const make=(text,action)=>{const b=this.add.text(0,0,text,{fontFamily:'SpecialElite',fontSize:'22px',color:'#f2d477',backgroundColor:'#17110e',padding:{x:14,y:10}}).setOrigin(.5,0).setDepth(100).setVisible(false).setInteractive({useHandCursor:true});b.on('pointerdown',action);b.on('pointerover',()=>b.setColor('#ffffff'));b.on('pointerout',()=>b.setColor('#f2d477'));return b;};
  this.storyButtons={microfilm:make('COMPARE MICROFILM',()=>{void this.openMicrofilm();}),radio:make('RADIO TRANSCRIPT',()=>{void this.openRadioSplice();}),followup:make('FOLLOW-UP RECORDS',()=>{void this.openCrashFollowup();}),catalogue:make(storyConfig.buttons.catalogue,()=>this.searchCatalogue()),shredder:make(storyConfig.buttons.shredder,()=>{void this.openRecoveredDocument(false);}),read:make(storyConfig.buttons.read,()=>{void this.openRecoveredDocument(true);}),redacted:make(thirdMissionConfig.buttons.decode,()=>{void this.openRedactedDocument();}),insurance:make(insuranceStoryConfig.buttons.compare,()=>{void this.openInsuranceDocument();})};
  this.storyPager={previous:make('< DOCUMENTS',()=>{if(this.canInteract()){this.storyPage=Math.max(0,this.storyPage-1);this.layoutArchive();}}),next:make('DOCUMENTS >',()=>{if(this.canInteract()){this.storyPage++;this.layoutArchive();}})};
 }
 refreshArchive(){
  super.refreshArchive();if(this._archiveDisposed)return;const story=getMissingReportState(this.gameState);
  if(story.active){this.frankPresent=false;this.frankHotspot?.setVisible(false);if(this.frankHotspot?.input)this.frankHotspot.input.enabled=false;this.frankLabel?.setVisible(false);this.frankHighlight?.clear();this.puzzleButton?.setVisible(false);if(this.puzzleButton?.input)this.puzzleButton.input.enabled=false;this.nextMissionButton?.setVisible(false);if(this.nextMissionButton?.input)this.nextMissionButton.input.enabled=false;if(this.textures.exists('archive')){if(!this.background)this.background=this.add.image(0,0,'archive').setOrigin(0).setDepth(0);else this.background.setTexture('archive');this.background.setVisible(true);}else this.background?.setVisible(false);}
  if(this.storyButtons){
   this.setStoryButton(this.storyButtons.catalogue,story.active);this.setStoryButton(this.storyButtons.shredder,story.active&&story.searched);this.setStoryButton(this.storyButtons.read,story.completed);
   const third=getThirdMissionStory(this.gameState);this.storyButtons.redacted.setText(third.decoded?thirdMissionConfig.buttons.read:thirdMissionConfig.buttons.decode);this.setStoryButton(this.storyButtons.redacted,!story.active&&third.canDecode);
   const insurance=getInsuranceArchiveStory(this.gameState);this.storyButtons.insurance.setText(insurance.examined?insuranceStoryConfig.buttons.review:insuranceStoryConfig.buttons.compare);this.setStoryButton(this.storyButtons.insurance,!story.active&&insurance.canCompare);
   const follow=getCrashFollowupStory(this.gameState);this.storyButtons.followup.setText(follow.verified?'REVIEW FOLLOW-UP RECORDS':'FOLLOW-UP RECORDS');this.setStoryButton(this.storyButtons.followup,!story.active&&this.frankPresent&&follow.eligible);
   const radio=getRadioSpliceStory(this.gameState);this.storyButtons.radio.setText(radio.completed?'REVIEW RADIO TRANSCRIPT':'RADIO TRANSCRIPT');this.setStoryButton(this.storyButtons.radio,!story.active&&this.frankPresent&&radio.eligible);
   const micro=getMicrofilmStory(this.gameState);this.storyButtons.microfilm.setText(micro.completed?'REVIEW WARSAW LEAD':'COMPARE MICROFILM');this.setStoryButton(this.storyButtons.microfilm,!story.active&&this.frankPresent&&micro.eligible&&micro.copyReceived);
  }this.layoutArchive();
 }
 setStoryButton(b,visible){b._storyAvailable=visible;b.setVisible(visible);if(b.input)b.input.enabled=visible;}
 interactWithFrank(){
  if(getMissingReportState(this.gameState).active)return;
  if(this.canInteract()&&this.frankPresent){const micro=getMicrofilmStory(this.gameState);if(micro.eligible){if(micro.copyReceived)void this.openMicrofilm();else this.showStatus('Ask Alex in Storage for his retained reel, then bring it to the archive reader.');return;}if(getRadioSpliceStory(this.gameState).eligible){void this.openRadioSplice();return;}if(getCrashFollowupStory(this.gameState).eligible){void this.openCrashFollowup();return;}}
  if(this.canInteract()&&this.frankPresent&&isReportSubmitted(this.gameState)){
   const insurance=getInsuranceArchiveStory(this.gameState);
   if(insurance.needsOffer){this.openConversation({lines:insuranceStoryConfig.offerLines},()=>{const r=markInsuranceDocumentsReceived(this.gameState);this.refreshArchive();this.showStatus(r.success?insuranceStoryConfig.messages.received+(r.saved?'':` ${insuranceStoryConfig.messages.saveFailed}`):'The story requirements changed. Please talk to Frank again.');});return;}
   if(insurance.needsDiscussion){this.openConversation({lines:insuranceStoryConfig.discussionLines},()=>{const r=markInsuranceDiscussion(this.gameState);this.refreshArchive();this.showStatus(r.success?insuranceStoryConfig.messages.discussed+(r.saved?'':` ${insuranceStoryConfig.messages.saveFailed}`):'Complete the document comparison first.');});return;}
   if(insurance.canCompare&&!insurance.examined){this.showStatus(insuranceStoryConfig.messages.received);return;}if(insurance.discussed){this.showStatus(insuranceStoryConfig.messages.discussed);return;}
   if(getThirdMissionStory(this.gameState).needsFrank){this.openConversation({lines:thirdMissionConfig.frankLines},()=>{const saved=markFrankReferral(this.gameState);this.refreshArchive();this.showStatus(thirdMissionConfig.messages.referred+(saved?'':` ${thirdMissionConfig.messages.saveFailed}`));});return;}
  }super.interactWithFrank();
 }
 startReportConversation(item){if(getMissingReportState(this.gameState).active){this.showStatus(storyConfig.messages.absent);return;}super.startReportConversation(item);}
 handleItemDrop(drop){if(!getMissingReportState(this.gameState).active)super.handleItemDrop(drop);}
 openNextMission(){return getMissingReportState(this.gameState).active?Promise.resolve(false):super.openNextMission();}
 canInteract(){return super.canInteract()&&!this._documentOpening;}
 searchCatalogue(){if(!this.canInteract()||!getMissingReportState(this.gameState).active)return;const saved=searchMissingReportCatalogue(this.gameState);this.refreshArchive();this.showStatus(storyConfig.messages.missing+(saved?'':` ${storyConfig.messages.saveFailed}`));}
 async openRecoveredDocument(readOnly=false){const s=getMissingReportState(this.gameState);if(!this.canInteract()||(readOnly?!s.completed:!(s.active&&s.searched)))return;await this.openStoryDocument('shredded',()=>{if(!readOnly)discoverShredderFragments(this.gameState);});}
 async openRedactedDocument(){if(this.canInteract()&&getThirdMissionStory(this.gameState).canDecode)await this.openStoryDocument('redacted');}
 async openInsuranceDocument(){if(this.canInteract()&&getInsuranceArchiveStory(this.gameState).canCompare)await this.openStoryDocument('insurance');}
 async openCrashFollowup(){if(this.canInteract()&&this.frankPresent&&!getMissingReportState(this.gameState).active&&getCrashFollowupStory(this.gameState).eligible)await this.openStoryDocument('followup');}
 async openRadioSplice(){if(this.canInteract()&&this.frankPresent&&!getMissingReportState(this.gameState).active&&getRadioSpliceStory(this.gameState).eligible)await this.openStoryDocument('radio');}
 async openMicrofilm(){const s=getMicrofilmStory(this.gameState);if(this.canInteract()&&this.frankPresent&&!getMissingReportState(this.gameState).active&&s.eligible&&s.copyReceived)await this.openStoryDocument('microfilm');}
 async openStoryDocument(kind,beforeLaunch=null){
  const token=this._archiveRunToken;this._documentOpening=true;this._puzzleOpen=true;
  try{await this._uiSetupPromise;if(this._archiveDisposed||token!==this._archiveRunToken)return;this.getPlayerHudScene()?.closeAllUIPanels?.();const spec=DOCS[kind];if(!spec)throw new Error(`Unknown document type: ${kind}`);const module=await spec[0](),key=spec[1];if(this._archiveDisposed||token!==this._archiveRunToken)return;if(!this.hasScene(key))this.scene.manager.add(key,module[key],false);if(this.isSceneRunning(key))throw new Error('Document scene is already open.');beforeLaunch?.();this.scene.launch(key,{preview:false,mode:'compare',returnSceneKey:'ArchiveScene',onFinished:()=>this.finishStoryDocument(token,kind)});this.scene.bringToTop(key);}
  catch(error){console.error('[ArchiveScene] Document launch failed:',error);if(this._archiveDisposed||token!==this._archiveRunToken)return;this._documentOpening=false;this._puzzleOpen=false;void this.setupArchiveUiLayers();this.showStatus(kind==='microfilm'?microfilmData.messages.loadFailed:kind==='radio'?radioSpliceData.messages.loadFailed:kind==='followup'?crashFollowupData.messages.loadFailed:kind==='insurance'?insuranceStoryConfig.messages.loadFailed:kind==='shredded'?storyConfig.messages.failed:thirdMissionConfig.messages.loadFailed);}
 }
 finishStoryDocument(token,kind){
  if(this._archiveDisposed||token!==this._archiveRunToken)return;this._documentOpening=false;this._puzzleOpen=false;const saved=saveGameState();this.refreshArchive();void this.setupArchiveUiLayers();
  if(kind==='microfilm')this.showStatus((getMicrofilmStory(this.gameState).completed?microfilmData.messages.complete:microfilmData.messages.unfinished)+(saved?'':` ${microfilmData.messages.saveFailed}`));
  else if(kind==='radio')this.showStatus((getRadioSpliceStory(this.gameState).completed?radioSpliceData.messages.complete:radioSpliceData.messages.unfinished)+(saved?'':` ${radioSpliceData.messages.saveFailed}`));
  else if(kind==='followup')this.showStatus((getCrashFollowupStory(this.gameState).verified?crashFollowupData.messages.complete:crashFollowupData.messages.unfinished)+(saved?'':` ${crashFollowupData.messages.saveFailed}`));
  else if(kind==='insurance'){const s=getInsuranceArchiveStory(this.gameState);this.showStatus((s.discussed?insuranceStoryConfig.messages.discussed:s.examined?insuranceStoryConfig.messages.examined:insuranceStoryConfig.messages.unfinished)+(saved?'':` ${insuranceStoryConfig.messages.saveFailed}`));}
  else if(kind==='redacted')this.showStatus((getThirdMissionStory(this.gameState).decoded?thirdMissionConfig.messages.decoded:thirdMissionConfig.messages.unfinished)+(saved?'':` ${thirdMissionConfig.messages.saveFailed}`));
  else this.showStatus(getMissingReportState(this.gameState).completed?storyConfig.messages.restored+(saved?'':` ${storyConfig.messages.saveFailed}`):storyConfig.messages.found);
 }
 layoutArchive(){
  super.layoutArchive();this.archiveAnimations?.layout();if(!this.storyButtons)return;const{width,height}=this.scale,font=width<600?14:22,buttons=Object.values(this.storyButtons),available=buttons.filter(b=>b._storyAvailable),y=Math.max(150,height*.28),capacity=Math.max(1,Math.floor((height-(width<400?190:170)-y)/62)),pages=Math.max(1,Math.ceil(available.length/capacity));
  this.storyPage=Math.max(0,Math.min(pages-1,this.storyPage));const shown=available.slice(this.storyPage*capacity,(this.storyPage+1)*capacity);buttons.forEach(b=>{const i=shown.indexOf(b);b.setFontSize(font).setVisible(i!==-1);if(b.input)b.input.enabled=i!==-1;if(i!==-1)b.setPosition(width/2,y+i*62);});
  if(this.storyPager){const p=this.storyPager.previous,n=this.storyPager.next,yy=y+shown.length*62+6;p.setFontSize(font).setPosition(width/2-100,yy).setVisible(pages>1&&this.storyPage>0);n.setFontSize(font).setPosition(width/2+100,yy).setVisible(pages>1&&this.storyPage<pages-1);if(p.input)p.input.enabled=p.visible;if(n.input)n.input.enabled=n.visible;}
 }
 cleanupArchive(){if(this._archiveDisposed)return;for(const b of[...Object.values(this.storyButtons||{}),...Object.values(this.storyPager||{})])b.removeAllListeners();this.storyButtons=null;this.storyPager=null;this.archiveAnimations?.destroy();this.archiveAnimations=null;super.cleanupArchive();}
}
