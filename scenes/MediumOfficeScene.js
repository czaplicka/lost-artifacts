import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { audioManager } from '../managers/AudioManager.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { installMarkAgencyComputer } from '../ui/markAgencyComputerInstaller.js';
import { MEDIUM_OFFICE_CONFIG as CONFIG } from '../config/mediumOfficeConfig.js';

const KEY='MediumOfficeScene',LAYOUT_KEY='medium_office_hotspot_layout';
const LOCAL_DEBUG=['localhost','127.0.0.1'].includes(window.location.hostname);
const PANEL_LOADERS={
  crimeboard:()=>import('../ui/CrimeBoardUI.js').then(m=>m.CrimeBoardUI),
  casefile:()=>import('../ui/CaseFileUI.js').then(m=>m.CaseFileUI),
  telephone:()=>import('../ui/PhonebookUI.js').then(m=>m.PhonebookUI),
  travel:()=>import('../ui/DestinationsUI.js').then(({DestinationsUI})=>class MediumOfficeDestinationsUI extends DestinationsUI {
    getNavigationScene(){
      const owner=this.scene;
      if(!owner?.sys?.isActive()||owner._cleanupDone)return null;
      owner.registry.set('currentSceneKey',KEY);
      return owner;
    }
  })
};

export class MediumOfficeScene extends BaseScene {
  constructor(){super({key:KEY});}
  init(data={}){
    this.gameState=data.gameState??gameState;
    this.allowLockedForTesting=data.allowLockedForTesting===true&&LOCAL_DEBUG;
    this.returnSceneKey=data.returnSceneKey||'OfficeScene';
    this._runToken=Symbol('medium-office');this.disposed=false;this.busy=false;this.leaving=false;
    this.uiLocked=false;this._officePanelRequest=null;this._tvOpen=false;
    this.debugMode=false;this.selectedIndex=0;this.hotspots=[];
    this.localPanels=new Map();this.phoneDialogManager=null;this.currentPanel=null;
    this.overlayStates=[];this.feedbackTimer=null;this.feedback=null;
    this.currentView='office';this.rooms={office:{x:0}};
    this.definitions=CONFIG.hotspots.map(item=>({...item}));
    const saved=MainStoryManager.getSideClue(LAYOUT_KEY);
    if(Array.isArray(saved?.hotspots))for(const def of this.definitions){
      const item=saved.hotspots.find(item=>item.id===def.id);
      if(item&&['x','y','w','h'].every(key=>Number.isFinite(item[key]))&&item.w>=10&&item.h>=10){
        for(const key of ['x','y','w','h'])def[key]=item[key];
      }
    }
  }
  preload(){
    if(!this.textures.exists(CONFIG.backgroundKey))this.load.image(CONFIG.backgroundKey,CONFIG.backgroundUrl);
    const manifest=this.cache.json.get('assetManifest');
    const needed=new Set(['phonebook','mapbg','television','tv_anchor_generic','tv_anchor_genericf',
      'hq','home','csi','informant','holmes','watson','portrait_accounting','portrait_fallback']);
    const queued=new Set();
    const walk=value=>{
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)){value.forEach(walk);return;}
      if(needed.has(value.key)&&typeof value.url==='string'&&!queued.has(value.key)&&!this.textures.exists(value.key)){
        if(/\.(webp|png|jpe?g)(\?|$)/i.test(value.url)){this.load.image(value.key,value.url);queued.add(value.key);}
      }
      Object.values(value).forEach(child=>{if(child&&typeof child==='object')walk(child);});
    };
    walk(manifest);
  }
  create(){
    super.create();audioManager.init(this);
    this.registry.set('currentSceneKey',KEY);this.registry.set('currentCity','hq');this.registry.set('currentCityId','hq');
    this.registry.set('gameState',this.gameState);this.registry.set('activeMission',this.gameState.currentMission||null);
    this.cameras.main.setBackgroundColor('#080b08');
    this.root=this.add.container(0,0);
    if(this.textures.exists(CONFIG.backgroundKey))this.root.add(this.add.image(CONFIG.width/2,CONFIG.height/2,CONFIG.backgroundKey).setDisplaySize(CONFIG.width,CONFIG.height));
    else this.showOfficeStatusMessage(`${__dialogueText("scenes/MediumOfficeScene.js", "t_f895ad1e350f3f056ab7")}${CONFIG.backgroundUrl}`);
    this.allowed=this.allowLockedForTesting||Number(this.gameState.casesSolved||0)>=CONFIG.minimumCases;
    this.highlight=this.add.graphics();this.root.add(this.highlight);
    this.tooltip=this.add.text(0,0,'',this.style(20)).setOrigin(0.5,1).setVisible(false);this.root.add(this.tooltip);
    this.debugText=this.add.text(22,CONFIG.height-220,'',this.style(17)).setVisible(false);this.root.add(this.debugText);
    this.back=this.add.text(20,CONFIG.height-25,__dialogueText("scenes/MediumOfficeScene.js", "t_cd46626128fc8436fdce"),this.style(22)).setOrigin(0,1).setInteractive({useHandCursor:true});
    this.root.add(this.back);this.back.on('pointerdown',()=>{void this.returnDownstairs();});
    this.navigation={hideHint:()=>this.tooltip?.setVisible(false)};
    this.computerController=installMarkAgencyComputer(this);
    this.definitions.forEach((def,index)=>this.createHotspot(def,index));
    this.root.bringToTop(this.tooltip);this.root.bringToTop(this.debugText);this.root.bringToTop(this.back);
    this.saveUI=new OfficeSaveUI(this,{locationType:'office',locationCode:'agency_medium_office',cityCode:'hq'});this.saveUI.createButton();
    this.pauseSharedOverlays();this.layoutOffice();this.refreshPanelLock();
    this.trackInputEvent(this.scale,'resize',this.layoutOffice);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanupMedium,this);
    if(!this.allowed)this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_28eb275d05e17269cfc8"));
  }
  style(size=20){return{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#ffe5ae',backgroundColor:'#17251c',padding:{x:10,y:7}};}
  isCurrentOfficeRun(token=this._runToken){return Boolean(!this.disposed&&!this._cleanupDone&&token&&token===this._runToken);}
  isOfficeActive(){return this.isCurrentOfficeRun()&&this.sys.isActive()&&!this.leaving;}
  isCrimeBoardAvailable(){return this.allowed&&this.isOfficeActive();}
  setupOfficeUiLayers(){return Promise.resolve(this.isOfficeActive());}
  getPlayerHud(){return this.getRegisteredScene('PlayerHudScene');}
  pauseSharedOverlays(){
    for(const key of ['PlayerHudScene','UIScene','NewsHud']){
      if(!this.isSceneActive(key))continue;const overlay=this.getRegisteredScene(key);
      overlay.closeAllUIPanels?.();this.overlayStates.push({key,overlay,visible:overlay.sys.settings.visible});
      this.scene.setVisible(false,key);this.scene.pause(key);
    }
  }
  restoreSharedOverlays(){
    for(const entry of this.overlayStates){
      if(this.getRegisteredScene(entry.key)!==entry.overlay)continue;
      this.scene.setVisible(entry.visible,entry.key);if(this.isScenePaused(entry.key))this.scene.resume(entry.key);
    }
    this.overlayStates=[];
  }
  panelIsOpen(panel){return Boolean(panel?.isOpen||panel?.isVisible);}
  closeAllUIPanels(){for(const panel of this.localPanels.values())panel.close?.();this.phoneDialogManager?.dialogUI?.close?.();}
  applyLock(locked){
    this.uiLocked=Boolean(locked);
    for(const hotspot of this.hotspots)if(hotspot.zone.input)hotspot.zone.input.enabled=this.allowed&&!this.uiLocked&&!this.leaving;
    this.saveUI?.setLocked(this.uiLocked);
    if(this.back?.input)this.back.input.enabled=!this.uiLocked&&!this.leaving;
    if(this.uiLocked)this.tooltip?.setVisible(false);
  }
  refreshPanelLock(){
    this.applyLock(this.busy||this._tvOpen||this.saveUI?.isOpen||this.agencyComputerUI?.isOpen||
      [...this.localPanels.values()].some(panel=>this.panelIsOpen(panel))||this.phoneDialogManager?.dialogUI?.isOpen);
  }
  update(){
    if(this.disposed)return;
    // Panels emit showHUD on close; the medium office owns its own panel inputs.
    for(const entry of this.overlayStates)if(this.getRegisteredScene(entry.key)===entry.overlay)this.scene.setVisible(false,entry.key);
    if(!this.busy&&this.currentPanel&&!this.panelIsOpen(this.currentPanel)&&!this.phoneDialogManager?.dialogUI?.isOpen){
      this.disposeLocalPanels();
    }
    this.refreshPanelLock();
  }
  createHotspot(def,index){
    const zone=this.add.zone(def.x,def.y,def.w,def.h).setSize(def.w,def.h).setInteractive({useHandCursor:true});this.root.add(zone);
    const hotspot={def,zone,index,hover:false};this.hotspots.push(hotspot);
    zone.on('pointerover',()=>{
      if(this.uiLocked||!this.allowed)return;hotspot.hover=true;this.drawHotspots();
      this.tooltip.setText(def.label).setPosition(def.x,def.y-def.h/2-12).setVisible(true);
    });
    zone.on('pointerout',()=>{hotspot.hover=false;this.tooltip.setVisible(false);this.drawHotspots();});
    zone.on('pointerdown',()=>{
      if(this.uiLocked||!this.allowed)return;
      if(this.debugMode){this.selectedIndex=index;this.updateDebug();return;}
      void this.activate(def.action);
    });
    zone.on('drag',pointer=>{
      if(!this.debugMode||this.uiLocked)return;
      const local=this.root.getWorldTransformMatrix().applyInverse(pointer.worldX,pointer.worldY);
      def.x=Math.round(local.x);def.y=Math.round(local.y);this.selectedIndex=index;this.syncHotspot(hotspot);this.updateDebug();
    });
    this.input.setDraggable(zone,false);
  }
  syncHotspot(hotspot){
    const{def,zone}=hotspot;zone.setPosition(def.x,def.y).setSize(def.w,def.h);
    zone.input?.hitArea?.setTo(0,0,def.w,def.h);this.drawHotspots();
  }
  drawHotspots(){
    if(!this.highlight)return;this.highlight.clear();
    for(const hotspot of this.hotspots){
      if(!this.debugMode&&!hotspot.hover)continue;const d=hotspot.def;
      this.highlight.fillStyle(this.debugMode?0x00ff88:0xffd166,this.debugMode?0.18:0.12);
      this.highlight.fillRect(d.x-d.w/2,d.y-d.h/2,d.w,d.h);
      this.highlight.lineStyle(2,this.debugMode&&hotspot.index===this.selectedIndex?0xff44ff:0xffd166,1);
      this.highlight.strokeRect(d.x-d.w/2,d.y-d.h/2,d.w,d.h);
    }
  }
  async activate(action){
    if(!this.allowed||!this.isOfficeActive()||this.uiLocked||this.debugMode)return;
    this.tooltip.setVisible(false);
    if(action==='computer'){await this.computerController.open();this.refreshPanelLock();return;}
    if(action==='tv'){
      this._tvOpen=true;this.refreshPanelLock();
      const opened=await this.launchOverlay('TvBroadcastScene',{
        returnSceneKey:KEY,pauseBelowScene:true,onClose:()=>{this._tvOpen=false;this.refreshPanelLock();}
      });
      if(!opened){this._tvOpen=false;this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_37996ae75dbc062121fb"));this.refreshPanelLock();}return;
    }
    const loader=PANEL_LOADERS[action];if(!loader)return;
    const token=this._runToken;this.busy=true;this.refreshPanelLock();
    try{
      const Panel=await loader();if(!this.isCurrentOfficeRun(token)||!this.sys.isActive())return;
      const panel=action==='telephone'?new Panel(this,this.gameState):new Panel(this);
      this.localPanels.set(action,panel);this.currentPanel=panel;
      if(action==='telephone'){
        const {DialogManager}=await import('../dialogues/DialogManager.js');
        if(!this.isCurrentOfficeRun(token))return;
        this.phoneDialogManager=new DialogManager(this,this.gameState);
        panel.setOnCall((key,contact)=>this.phoneDialogManager?.startDialog(key,contact));
      }
      const mission=this.gameState.currentMission||{};
      const data=action==='casefile'?{artifact:mission.artifact||__dialogueText("scenes/MediumOfficeScene.js", "t_51b01e8422efd81865f3"),city:mission.city||__dialogueText("scenes/MediumOfficeScene.js", "t_031708f5a6c18e0a6279"),country:mission.country||__dialogueText("scenes/MediumOfficeScene.js", "t_e282dbbdd7a0fe3f46f5"),description:mission.description||'',significance:mission.significance||'',clue:mission.clue||'',artifactKey:mission.artifactKey||''}:this.gameState;
      const opened=await panel.open(data);
      if(this.isCurrentOfficeRun(token)&&opened===false&&!this.panelIsOpen(panel)){
        this.disposeLocalPanels();this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_80bf0d30bfb458927d8e"));
      }
    }catch(error){
      console.error('[MediumOfficeScene] Panel opening failed:',action,error);
      if(this.isCurrentOfficeRun(token)){this.disposeLocalPanels();this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_094dc77c200f940d3cf1"));}
    }finally{if(this.isCurrentOfficeRun(token)){this.busy=false;this.refreshPanelLock();}}
  }
  disposeLocalPanels(){
    for(const panel of this.localPanels.values())try{panel.destroy?.();}catch(error){console.warn('[MediumOfficeScene] Panel cleanup:',error);}
    this.localPanels.clear();this.currentPanel=null;
    this.phoneDialogManager?.dialogUI?.destroy?.();this.phoneDialogManager=null;
  }
  layoutOffice(){
    if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/CONFIG.width,height/CONFIG.height);
    this.root.setScale(s).setPosition((width-CONFIG.width*s)/2,(height-CONFIG.height*s)/2);
  }
  setDebugMode(value){
    if(!LOCAL_DEBUG||this.uiLocked)return;this.debugMode=Boolean(value);this.tooltip.setVisible(false);
    this.hotspots.forEach(item=>{item.hover=false;this.input.setDraggable(item.zone,this.debugMode);});this.updateDebug();
  }
  updateDebug(){
    const def=this.definitions[this.selectedIndex];this.drawHotspots();
    this.debugText.setVisible(this.debugMode).setText(this.debugMode?[
      `${__dialogueText("scenes/MediumOfficeScene.js", "t_cb40a67f6cdee4b5ad52")}${def.id}${__dialogueText("scenes/MediumOfficeScene.js", "t_005e1574a2b5c8163046")}${def.label}`,
      `${__dialogueText("scenes/MediumOfficeScene.js", "t_51e33c7c7efbc350d26f")}${def.x}${__dialogueText("scenes/MediumOfficeScene.js", "t_8278a5c11d3d9380f821")}${def.y}${__dialogueText("scenes/MediumOfficeScene.js", "t_1b89a9604b178452218e")}${def.w}${__dialogueText("scenes/MediumOfficeScene.js", "t_3f4674b8e35cc249a199")}${def.h}${__dialogueText("scenes/MediumOfficeScene.js", "t_64488f47a88552abcd3b")}`,
      __dialogueText("scenes/MediumOfficeScene.js", "t_aef33d0f414bc9e9fda5"),
      __dialogueText("scenes/MediumOfficeScene.js", "t_ac9d2554a903fdc8993d"),
      __dialogueText("scenes/MediumOfficeScene.js", "t_cdcee01d4aa0d097da44")
    ].join(__dialogueText("scenes/MediumOfficeScene.js", "t_01ba4719c80b6fe911b0")):'');
  }
  onKey(event){
    const target=event.target;
    if(event.repeat&&['KeyD','KeyC','KeyS'].includes(event.code))return;
    if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||event.ctrlKey||event.metaKey||this.uiLocked||!this.allowed)return;
    if(event.code==='KeyD'){event.preventDefault();this.setDebugMode(!this.debugMode);return;}
    if(!this.debugMode)return;
    if(event.code===__dialogueText("scenes/MediumOfficeScene.js", "t_037c968467aa3fd7c059")){event.preventDefault();this.setDebugMode(false);return;}
    if(event.code===__dialogueText("scenes/MediumOfficeScene.js", "t_90ddf1963abb36c9921c")){event.preventDefault();this.selectedIndex=(this.selectedIndex+(event.shiftKey?-1:1)+this.definitions.length)%this.definitions.length;this.updateDebug();return;}
    if(event.code==='KeyC'){
      console.log('COPY INTO config/mediumOfficeConfig.js -> hotspots:',JSON.stringify(this.definitions,null,2));this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_aa538dbe205dd1955c2a"));return;
    }
    if(event.code==='KeyS'){
      MainStoryManager.setSideClue(LAYOUT_KEY,{version:1,hotspots:this.definitions.map(item=>({...item}))});
      const saved=saveGameState();this.showOfficeStatusMessage(saved?__dialogueText("scenes/MediumOfficeScene.js", "t_6daeebe02d8e52f61f19"):__dialogueText("scenes/MediumOfficeScene.js", "t_82fc62efa4b5b71a72e6"));return;
    }
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))return;
    event.preventDefault();const def=this.definitions[this.selectedIndex],horizontal=['ArrowLeft','ArrowRight'].includes(event.code);
    const direction=['ArrowLeft','ArrowUp'].includes(event.code)?-1:1;
    const key=event.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');def[key]+=direction*(event.altKey?1:5);
    def.w=Math.max(10,def.w);def.h=Math.max(10,def.h);this.syncHotspot(this.hotspots[this.selectedIndex]);this.updateDebug();
  }
  showOfficeStatusMessage(text){
    if(this.disposed)return;this.feedbackTimer?.remove(false);this.feedback?.destroy();
    this.feedback=this.add.text(this.scale.width/2,95,text,{...this.style(20),align:'center',wordWrap:{width:Math.max(140,this.scale.width-70)}}).setOrigin(0.5,0).setDepth(30000);
    this.feedbackTimer=this.time.delayedCall(6500,()=>{this.feedback?.destroy();this.feedback=null;this.feedbackTimer=null;});
  }
  async returnDownstairs(){
    if(!this.isOfficeActive()||this.uiLocked)return;this.leaving=true;this.refreshPanelLock();saveGameState();
    try{const opened=await this.goto(this.returnSceneKey,{gameState:this.gameState});if(opened===false&&!this.disposed){this.leaving=false;this.refreshPanelLock();this.showOfficeStatusMessage(__dialogueText("scenes/MediumOfficeScene.js", "t_288e37be0f0f2573f5eb"));}}
    catch(error){if(!this.disposed){this.leaving=false;this.refreshPanelLock();this.showOfficeStatusMessage(error.message);}}
  }
  cleanupMedium(){
    if(this.disposed)return;this.disposed=true;this._runToken=null;
    this.feedbackTimer?.remove(false);this.saveUI?.destroy();this.disposeLocalPanels();this.restoreSharedOverlays();
    this.feedback?.destroy();this.feedback=null;
  }
}
