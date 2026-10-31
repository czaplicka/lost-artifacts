import { gameState } from '../GameData.js';

const DEBUG_NEWS_HUD = false;
const NEWSSTAND_KEY = 'NewsstandScene';
const TV_KEY = 'TvBroadcastScene';

export class NewsHud extends Phaser.Scene {
  constructor() {
    super({key:'NewsHud'});
    this.clearObjectReferences();
    this.menuOpen=false;
    this.isAnimating=false;
    this.isShutDown=true;
    this.uiReady=false;
    this.panelWidth=176;
    this.panelY=0;
    this.hudEnabled=true;
    this.newsButtonsVisible=true;
    this.newspaperEnabled=true;
    this.tvEnabled=true;
    this.loadingOverlays=new Set();
    this.pendingHudVisible=null;
    this.pendingButtonsVisible=null;
    this.pendingNewspaperVisible=null;
    this.pendingTvVisible=null;
    this.runToken=null;
    this.tvShutdownScene=null;
    this.tvShutdownCallback=null;
    this.locationBlocked=false;
  }

  clearObjectReferences() {
    this.menuTab=this.menuPanel=this.menuBlocker=null;
    this.newspaperButton=this.newspaperLabel=null;
    this.tvButton=this.tvLabel=null;
  }

  create() {
    const {width,height}=this.cameras.main;
    this.runToken=Symbol('news-hud');
    this.isShutDown=false;
    this.uiReady=false;
    this.menuOpen=false;
    this.isAnimating=false;
    this.locationBlocked=false;
    this.hudEnabled=this.pendingHudVisible ?? true;
    this.newsButtonsVisible=this.pendingButtonsVisible ?? true;
    this.newspaperEnabled=this.pendingNewspaperVisible ?? this.newsButtonsVisible;
    this.tvEnabled=this.pendingTvVisible ?? this.newsButtonsVisible;
    this.pendingHudVisible=this.pendingButtonsVisible=null;
    this.pendingNewspaperVisible=this.pendingTvVisible=null;
    this.loadingOverlays.clear();
    this.panelY=height*0.70;
    this.panelWidth=Math.max(156,Math.round(width*0.10));
    this.createNewsMenu(width,height);
    this.uiReady=true;
    this.events.on('setNewspaperVisible',this.setNewspaperVisible,this);
    this.events.on('setTvVisible',this.setTvVisible,this);
    this.events.on('setButtonsVisible',this.setButtonsVisible,this);
    this.game.events.on('setHudVisible',this.setHudVisible,this);
    this.input.keyboard?.on('keydown-ESC',this.handleEscape,this);
    this.events.on('preupdate',this.syncLocationVisibility,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.onShutdown,this);
    this.setHudVisible(this.hudEnabled);
  }

  isLocationOpen() {
    const location=this.scene.manager.keys.LocationScene;
    return Boolean(location?.sys?.settings?.visible &&
      (location.sys.isActive() || location.sys.isPaused() || location.sys.isTransitioning?.()));
  }

  syncLocationVisibility() {
    if(!this.isUiReady()) return;
    const blocked=this.isLocationOpen();
    if(blocked===this.locationBlocked) return;
    this.locationBlocked=blocked;
    this.renderHudVisibility();
  }

  renderHudVisibility() {
    if(!this.isUiReady()) return;
    this.locationBlocked=this.isLocationOpen();
    const visible=this.hudEnabled && !this.locationBlocked;
    if(!visible) {
      this.closeMenu(true);
      this.menuTab.setVisible(false).disableInteractive();
      this.menuPanel.setVisible(false);
      if(this.locationBlocked) this.scene.setVisible(false);
    } else {
      this.scene.setVisible(true);
      this.menuTab.setVisible(true).setInteractive({useHandCursor:true});
      this.menuPanel.setVisible(true);
    }
    this.applyButtonState();
  }

  isLiveObject(object) {
    return Boolean(object && object.scene===this && object.scene.sys?.input);
  }
  isUiReady() {
    return this.uiReady && !this.isShutDown && this.isLiveObject(this.menuTab) &&
      this.isLiveObject(this.menuPanel) && this.isLiveObject(this.menuBlocker) &&
      this.isLiveObject(this.newspaperButton) && this.isLiveObject(this.tvButton);
  }
  isCurrent(token) {return token===this.runToken && !this.isShutDown;}

  detachTvShutdown() {
    if(this.tvShutdownScene && this.tvShutdownCallback) {
      this.tvShutdownScene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.tvShutdownCallback);
    }
    this.tvShutdownScene=null;
    this.tvShutdownCallback=null;
  }

  onShutdown() {
    this.isShutDown=true;
    this.uiReady=false;
    this.runToken=null;
    this.input.keyboard?.off('keydown-ESC',this.handleEscape,this);
    this.game.events.off('setHudVisible',this.setHudVisible,this);
    this.events.off('setNewspaperVisible',this.setNewspaperVisible,this);
    this.events.off('setTvVisible',this.setTvVisible,this);
    this.events.off('setButtonsVisible',this.setButtonsVisible,this);
    this.events.off('preupdate',this.syncLocationVisibility,this);
    this.detachTvShutdown();
    this.loadingOverlays.clear();
    if(this.menuPanel) this.tweens.killTweensOf(this.menuPanel);
    if(this.menuTab) this.tweens.killTweensOf(this.menuTab);
    this.menuOpen=false;
    this.isAnimating=false;
    this.locationBlocked=false;
    this.clearObjectReferences();
  }

  handleEscape() {if(this.menuOpen) this.closeMenu();}

  createNewsMenu(width,height) {
    const panelHeight=Math.round(height*0.22);
    const hiddenX=-this.panelWidth,visibleX=0;
    this.menuBlocker=this.add.rectangle(0,0,width,height,0x000000,0)
      .setOrigin(0,0).setDepth(9990).setVisible(false).setInteractive();
    this.menuBlocker.disableInteractive();
    this.menuBlocker.on('pointerup',()=>this.closeMenu());
    this.menuPanel=this.add.container(hiddenX,this.panelY).setDepth(9995);
    const panelBackground=this.add.rectangle(this.panelWidth/2,panelHeight/2,this.panelWidth,panelHeight,0x17120f,0.95)
      .setStrokeStyle(3,0xd4af37,0.9);
    const title=this.add.text(this.panelWidth/2,17,'LOCAL NEWS',{
      fontFamily:'PressStart2P',fontSize:'10px',color:'#f6dc8c'
    }).setOrigin(0.5,0);
    const divider=this.add.rectangle(this.panelWidth/2,42,this.panelWidth-20,2,0xd4af37,0.6).setOrigin(0.5);
    const iconSize=Math.round(this.panelWidth*0.35);
    this.newspaperButton=this.add.image(this.panelWidth*0.28,panelHeight*0.61,'news')
      .setOrigin(0.5).setDisplaySize(iconSize,iconSize).setInteractive({useHandCursor:true});
    this.newspaperLabel=this.add.text(this.panelWidth*0.28,panelHeight*0.84,'PAPER',{
      fontFamily:'PressStart2P',fontSize:'8px',color:'#ffffff'
    }).setOrigin(0.5);
    this.tvButton=this.add.image(this.panelWidth*0.72,panelHeight*0.61,'tv')
      .setOrigin(0.5).setDisplaySize(iconSize,iconSize).setInteractive({useHandCursor:true});
    this.tvLabel=this.add.text(this.panelWidth*0.72,panelHeight*0.84,'TV',{
      fontFamily:'PressStart2P',fontSize:'8px',color:'#ffffff'
    }).setOrigin(0.5);
    this.menuPanel.add([panelBackground,title,divider,this.newspaperButton,this.newspaperLabel,this.tvButton,this.tvLabel]);
    this.menuTab=this.add.text(0,this.panelY+24,'NEWS\n▶',{
      fontFamily:'PressStart2P',fontSize:'10px',color:'#f6dc8c',backgroundColor:'#17120f',
      padding:{left:10,right:9,top:11,bottom:11},align:'center',stroke:'#000000',strokeThickness:3
    }).setOrigin(0,0).setDepth(10000).setInteractive({useHandCursor:true});
    this.menuTab.on('pointerup',()=>this.toggleMenu());
    this.newspaperButton.on('pointerover',()=>this.newspaperLabel?.setColor('#ffe066'));
    this.newspaperButton.on('pointerout',()=>this.newspaperLabel?.setColor('#ffffff'));
    this.tvButton.on('pointerover',()=>this.tvLabel?.setColor('#ffe066'));
    this.tvButton.on('pointerout',()=>this.tvLabel?.setColor('#ffffff'));
    this.newspaperButton.on('pointerup',()=>void this.openNewspaper());
    this.tvButton.on('pointerup',()=>void this.openTv());
    this.menuPanel.setData({hiddenX,visibleX});
  }

  applyButtonState() {
    if(!this.isUiReady()) return;
    const paperVisible=this.newsButtonsVisible && this.newspaperEnabled;
    const tvVisible=this.newsButtonsVisible && this.tvEnabled;
    this.newspaperButton.setVisible(paperVisible);
    this.newspaperLabel.setVisible(paperVisible);
    this.tvButton.setVisible(tvVisible);
    this.tvLabel.setVisible(tvVisible);
    this.newspaperButton.disableInteractive();
    this.tvButton.disableInteractive();
    if(!this.hudEnabled || this.isLocationOpen()) return;
    if(paperVisible) this.newspaperButton.setInteractive({useHandCursor:true});
    if(tvVisible) this.tvButton.setInteractive({useHandCursor:true});
  }

  _restoreButtonsGate() {
    this.newsButtonsVisible=true;
    if(!this.isUiReady()) this.pendingButtonsVisible=true;
  }
  setNewspaperVisible(visible) {
    this.newspaperEnabled=Boolean(visible);
    if(this.newspaperEnabled) this._restoreButtonsGate();
    if(!this.isUiReady()) this.pendingNewspaperVisible=this.newspaperEnabled;
    this.applyButtonState();
  }
  setTvVisible(visible) {
    this.tvEnabled=Boolean(visible);
    if(this.tvEnabled) this._restoreButtonsGate();
    if(!this.isUiReady()) this.pendingTvVisible=this.tvEnabled;
    this.applyButtonState();
  }
  setButtonsVisible(visible) {
    const value=Boolean(visible);
    this.newsButtonsVisible=value;
    this.newspaperEnabled=value;
    this.tvEnabled=value;
    if(!this.isUiReady()) {
      this.pendingButtonsVisible=value;
      this.pendingNewspaperVisible=value;
      this.pendingTvVisible=value;
      return;
    }
    if(!value && this.menuOpen) this.closeMenu(true);
    this.applyButtonState();
  }

  toggleMenu() {
    if(!this.isUiReady() || !this.hudEnabled || this.isLocationOpen()) return;
    if(this.menuOpen) this.closeMenu(); else this.openMenu();
  }
  openMenu() {
    if(!this.isUiReady() || !this.hudEnabled || this.isLocationOpen() || this.menuOpen || this.isAnimating) return;
    this.isAnimating=true;
    this.menuOpen=true;
    this.menuBlocker.setVisible(true).setInteractive();
    this.menuTab.setText('NEWS\n◀');
    const token=this.runToken;
    this.tweens.add({targets:this.menuPanel,x:this.menuPanel.getData('visibleX'),duration:220,ease:'Cubic.Out',
      onComplete:()=>{if(this.isCurrent(token)) this.isAnimating=false;}});
  }
  closeMenu(force=false) {
    if(!this.isUiReady()) {this.menuOpen=false;this.isAnimating=false;return;}
    if(!this.menuOpen && !force) return;
    if(this.isAnimating && !force) return;
    const hiddenX=this.menuPanel.getData('hiddenX');
    this.menuOpen=false;
    this.menuTab.setText('NEWS\n▶');
    if(force) {
      this.tweens.killTweensOf(this.menuPanel);
      this.menuPanel.x=hiddenX;
      this.isAnimating=false;
      this.menuBlocker.disableInteractive().setVisible(false);
      return;
    }
    this.isAnimating=true;
    const token=this.runToken;
    this.tweens.add({targets:this.menuPanel,x:hiddenX,duration:170,ease:'Cubic.In',onComplete:()=>{
      if(!this.isCurrent(token) || !this.isUiReady()) return;
      this.menuBlocker.disableInteractive().setVisible(false);
      this.isAnimating=false;
    }});
  }

  setHudVisible(visible) {
    this.hudEnabled=Boolean(visible);
    if(!this.isUiReady()) {this.pendingHudVisible=this.hudEnabled;return;}
    this.renderHudVisibility();
  }

  isOverlayActive(sceneKey) {
    return Boolean(this.scene?.manager?.keys?.[sceneKey]) && this.scene.isActive(sceneKey);
  }
  async toggleLazyOverlay(sceneKey,data={}) {
    if(!this.isUiReady() || this.isLocationOpen()) return 'error';
    if(this.isOverlayActive(sceneKey)) {this.scene.stop(sceneKey);return 'closed';}
    if(this.loadingOverlays.has(sceneKey)) return 'loading';
    const token=this.runToken;
    this.loadingOverlays.add(sceneKey);
    try {
      if(this.game.sceneLoader) {
        const launched=await this.game.sceneLoader.launch(this,sceneKey,data);
        if(launched===false) return 'error';
      } else if(this.scene.manager.keys[sceneKey]) this.scene.launch(sceneKey,data);
      else {
        console.error(`[NewsHud] Cannot open "${sceneKey}". Scene is not registered.`);
        return 'error';
      }
      if(!this.isCurrent(token)) return 'error';
      this.scene.bringToTop('NewsHud');
      return 'opened';
    } catch(error) {
      console.error(`[NewsHud] Failed to open lazy overlay "${sceneKey}":`,error);
      return 'error';
    } finally {
      if(this.isCurrent(token)) this.loadingOverlays.delete(sceneKey);
    }
  }

  async openNewspaper() {
    if(!this.isUiReady() || !this.hudEnabled || this.isLocationOpen()) return;
    if(this.isOverlayActive(NEWSSTAND_KEY)) {await this.toggleLazyOverlay(NEWSSTAND_KEY);return;}
    const cityId=gameState.currentCityId || this.registry.get('currentCityId') || 'paris';
    if(DEBUG_NEWS_HUD) console.log('[NewsHud] opening NewsstandScene:',{cityId});
    this.closeMenu(true);
    const status=await this.toggleLazyOverlay(NEWSSTAND_KEY,{cityId});
    if(status==='error') console.warn('[NewsHud] NewsstandScene could not be opened.');
  }

  async openTv() {
    if(!this.isUiReady() || !this.hudEnabled || this.isLocationOpen()) return;
    if(this.isOverlayActive(TV_KEY)) {
      const status=await this.toggleLazyOverlay(TV_KEY);
      if(status==='closed') this.setButtonsVisible(true);
      return;
    }
    const token=this.runToken;
    const returnSceneKey=this.registry.get('currentSceneKey') || 'CityScene';
    const mission=gameState.currentMission || this.registry.get('activeMission') || {};
    const stationCity=mission.city || gameState.currentCity || 'Global';
    this.closeMenu(true);
    const status=await this.toggleLazyOverlay(TV_KEY,{
      returnSceneKey,mission,gameState,reporterName:'Colette Duvall',stationName:`${stationCity} Night Report`
    });
    if(!this.isCurrent(token)) return;
    if(status==='opened') {
      this.setButtonsVisible(false);
      this.detachTvShutdown();
      const tv=this.scene.manager.keys[TV_KEY];
      if(tv) {
        this.tvShutdownScene=tv;
        this.tvShutdownCallback=()=>{
          this.detachTvShutdown();
          if(this.isCurrent(token)) this.setButtonsVisible(true);
        };
        tv.events.once(Phaser.Scenes.Events.SHUTDOWN,this.tvShutdownCallback);
      }
    } else if(status==='error') this.setButtonsVisible(true);
  }
}