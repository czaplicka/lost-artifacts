// scenes/DetectiveOfficeScene.js
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { OFFICE_CONFIG } from '../config/detectiveOfficeConfig.js';
import { acceptPIQuestFromAdvert, getPIQuestStatus } from '../managers/PIQuestManager.js';
import { PIOfficeComputerUI } from '../ui/PIOfficeComputerUI.js';
import { PIOfficePhoneUI } from '../ui/PIOfficePhoneUI.js';
import { PICrimeBoardUI } from '../ui/PICrimeBoardUI.js';
import { PIOfficeDestinationsUI } from '../ui/PIOfficeDestinationsUI.js';

const SCENE_KEY = 'DetectiveOfficeScene';
const HUD_LOCK_CLASS = 'pi-office-hide-gameplay-hud';
const HUD_LOCK_STYLE = 'pi-office-hud-lock-style';
const DATA_FILES = [
  ['piOfficeMail', 'assets/data/piMail.json'],
  ['piOfficeClassifieds', 'assets/data/piClassifieds.json'],
  ['piPhoneDirectory', 'assets/data/piPhoneDirectory.json'],
  ['piPhoneDialogues', 'assets/data/piPhoneDialogues.json'],
  ['piCases', 'assets/data/piCases.json']
];
const PHONE_ART = [
  ['pi_phone_desk', 'assets/ui/pi-phone/desk.jpg'],
  ['pi_phone_base', 'assets/ui/pi-phone/base.webp'],
  ['pi_phone_handset', 'assets/ui/pi-phone/handset.webp'],
  ['pi_phone_dial', 'assets/ui/pi-phone/dial.webp']
];

export class DetectiveOfficeScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEY });
  }

  init(data = {}) {
    this.gameState = gameState;
    this.entrySource = data.entrySource || 'destinations';
    this.citySceneKey = OFFICE_CONFIG.citySceneKey || 'HomeCityScene';
    this.hotspotDefs = (OFFICE_CONFIG.hotspots || []).map(cfg => ({ ...cfg }));
    this.hotspots = [];
    this.debugMode = false;
    this.selectedIndex = 0;
    this.navigating = false;
    this.disposed = false;
    this.activeDevice = null;
    this.computerChild = null;
    this.childLoading = false;
    this.computerUI = null;
    this.phoneUI = null;
    this.piCrimeBoardUI = null;
    this.destinationsUI = null;
    this.newsHud = null;
    this.hiddenOverlays = new Map();
    this.headlineIndex = 0;
    this.tickerContainer = null;
    this.tickerText = null;
    this.tickerMask = null;
    this.tickerMaskShape = null;
    this.feedback = null;
    this.feedbackTimer = null;
    this.runToken = Symbol('pi-office');
    this.hudLockOwned = false;
  }

  preload() {
    const key = OFFICE_CONFIG.backgroundKey || 'pi_office_bg';
    const url = OFFICE_CONFIG.backgroundUrl || 'assets/local/pioffice.webp';
    if (!this.textures.exists(key)) this.load.image(key, url);
    for (const [dataKey, dataUrl] of DATA_FILES) {
      if (!this.cache.json.exists(dataKey)) this.load.json(dataKey, dataUrl);
    }
    for (const [imageKey, imageUrl] of PHONE_ART) {
      if (!this.textures.exists(imageKey)) this.load.image(imageKey, imageUrl);
    }
    if (!this.textures.exists('pi_computer_wallpaper')) {
      this.load.image('pi_computer_wallpaper', 'assets/ui/pi-computer/wallpaper.png');
    }
  }

  create() {
    super.create();
    const { width, height } = this.scale;
    this.registry.set('currentSceneKey', SCENE_KEY);
    const key = OFFICE_CONFIG.backgroundKey || 'pi_office_bg';
    if (this.textures.exists(key)) {
      this.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
    } else {
      this.add.rectangle(0, 0, width, height, 0x25231e).setOrigin(0);
      console.error('[DetectiveOfficeScene] Background missing:', key);
    }
    this.hideGameplayHud();
    this.createNewsTicker();
    this.hotspots = this.hotspotDefs.map((cfg, index) => this.createHotspot(cfg, index));
    this.add.text(16, this.newsConfig.y + this.newsConfig.height + 10,
      OFFICE_CONFIG.officeLabel || 'PI OFFICE', this.style(14)).setDepth(100);
    this.debugText = this.add.text(16, Math.max(100, height - 150), '', this.style(13)).setDepth(400);
    this.createPanels();
    this.bindEvents();
    this.updateDebug();
    void this.setupNewsHud();
  }

  // CSS protects the DOM HUD even if showHUD fires or its HTML loads late.
  lockHtmlHud() {
    if (!document.getElementById(HUD_LOCK_STYLE)) {
      const style = document.createElement('style');
      style.id = HUD_LOCK_STYLE;
      style.textContent = `html.${HUD_LOCK_CLASS} #hud-container {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }`;
      document.head.appendChild(style);
    }
    document.documentElement.classList.add(HUD_LOCK_CLASS);
    this.hudLockOwned = true;
    this.getRegisteredScene('UIScene')?.hideHUD?.();
  }

  unlockHtmlHud() {
    if (!this.hudLockOwned) return;
    document.documentElement.classList.remove(HUD_LOCK_CLASS);
    this.hudLockOwned = false;
    // The next gameplay scene decides whether the HUD should be shown.
  }

  hideGameplayHud() {
    if (this.disposed || this._cleanupDone) return;
    this.lockHtmlHud();
    for (const key of ['PlayerHudScene', 'UIScene']) {
      if (!this.hasScene(key)) continue;
      const overlay = this.getRegisteredScene(key);
      if (key === 'PlayerHudScene') overlay?.closeAllUIPanels?.();
      this.scene.setVisible(false, key);
    }
  }

  get newsConfig() {
    const cfg = OFFICE_CONFIG.newsTicker || {};
    return {
      y: Number.isFinite(cfg.y) ? cfg.y : 0,
      height: Number.isFinite(cfg.height) ? cfg.height : 44,
      speed: Number.isFinite(cfg.speed) ? cfg.speed : 90,
      headlines: Array.isArray(cfg.headlines)
        ? cfg.headlines.filter(value => typeof value === 'string' && value.trim()) : []
    };
  }

  style(size = 16) {
    return {
      fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color: '#fff1ce', backgroundColor: '#191b16', padding: { x: 8, y: 6 }
    };
  }

  isCurrent(token) {
    return token === this.runToken && !this.disposed && !this._cleanupDone && this.sys.isActive();
  }

  canUseOffice() {
    return !this.disposed && !this._cleanupDone && !this.navigating &&
      !this.activeDevice && !this.computerChild && !this.childLoading && this.sys.isActive();
  }

  createPanels() {
    this.computerUI = new PIOfficeComputerUI(this, {
      wallpaperKey: 'pi_computer_wallpaper',
      onOpen: () => this.deviceOpened('computer'),
      onClose: () => this.deviceClosed('computer'),
      onOpenInvestigations: () => this.openInvestigations(),
      onOpenWorldTravel: () => this.openWorldTravel(),
      onAcceptMission: advert => acceptPIQuestFromAdvert(this, advert.id),
      getMissionStatus: missionId => getPIQuestStatus(missionId)
    });
    this.phoneUI = new PIOfficePhoneUI(this, {
      onOpen: () => this.deviceOpened('phone'),
      onClose: () => this.deviceClosed('phone')
    });
    this.piCrimeBoardUI = new PICrimeBoardUI(this, {
      onOpen: () => { this.computerChild = 'crimeboard'; },
      onClose: () => this.returnToComputer()
    });
    this.destinationsUI = new PIOfficeDestinationsUI(this, {
      onClose: ({ returnToComputer }) => {
        if (returnToComputer) this.returnToComputer();
      }
    });
  }

  bindEvents() {
    this.keyHandler = event => this.onKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.onResume = () => {
      if (this.disposed || this._cleanupDone) return;
      this.registry.set('currentSceneKey', SCENE_KEY);
      this.hideGameplayHud();
      this.refreshInteractions();
    };
    this.onOfficeSleep = () => this.unlockHtmlHud();
    this.events.on('resume', this.onResume);
    this.events.on('wake', this.onResume);
    this.events.on('sleep', this.onOfficeSleep);
    this.events.once('shutdown', this.cleanupOffice, this);
    this.events.once('destroy', this.cleanupOffice, this);
  }

  openComputer() {
    if (this.canUseOffice() && !this.debugMode) this.computerUI.open();
  }

  openPhone() {
    if (this.canUseOffice() && !this.debugMode) this.phoneUI.open();
  }

  deviceOpened(type) {
    if (this.disposed) return;
    this.activeDevice = type;
    this.computerChild = null;
    this.hideGameplayHud();
    this.hiddenOverlays.clear();
    if (this.hasScene('NewsHud')) {
      const news = this.getRegisteredScene('NewsHud');
      this.hiddenOverlays.set('NewsHud', Boolean(news?.sys.settings.visible));
      news?.closeMenu?.(true);
      this.scene.setVisible(false, 'NewsHud');
    }
    this.tickerContainer?.setVisible(false);
    this.refreshInteractions();
  }

  deviceClosed(type) {
    if (this.activeDevice !== type) return;
    this.activeDevice = null;
    this.computerChild = null;
    this.childLoading = false;
    if (this.disposed || this._cleanupDone || !this.sys.isActive()) return;
    for (const [key, visible] of this.hiddenOverlays) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(visible, key);
      if (visible) this.bringSceneToTopIfActive(key);
    }
    this.hiddenOverlays.clear();
    this.hideGameplayHud();
    this.tickerContainer?.setVisible(true);
    this.updateDebug();
  }

  canOpenComputerChild() {
    return !this.disposed && !this.navigating && this.activeDevice === 'computer' &&
      this.computerUI?.isOpen && !this.computerChild && !this.childLoading;
  }

  async openInvestigations() {
    if (!this.canOpenComputerChild()) return;
    const token = this.runToken;
    this.childLoading = true;
    this.computerChild = 'crimeboard';
    this.computerUI.suspend();
    try {
      const opened = await this.piCrimeBoardUI.open();
      if (!this.isCurrent(token)) return;
      if (!opened) {
        this.returnToComputer();
        this.showFeedback('The investigation board could not be opened.');
      }
    } catch (error) {
      if (this.isCurrent(token)) {
        this.returnToComputer();
        this.showFeedback('The investigation board could not be opened.');
      }
      console.error('[DetectiveOfficeScene] PI board failed:', error);
    } finally {
      if (this.isCurrent(token)) this.childLoading = false;
    }
  }

  async openWorldTravel() {
    if (!this.canOpenComputerChild()) return;
    const token = this.runToken;
    this.childLoading = true;
    this.computerChild = 'destinations';
    this.computerUI.suspend();
    try {
      await this.ensureOverlayScene('NewsHud');
      if (!this.isCurrent(token)) return;
      this.scene.setVisible(false, 'NewsHud');
      this.destinationsUI.open(gameState);
      if (!this.destinationsUI.isOpen) {
        this.returnToComputer();
        this.showFeedback('The travel map is currently unavailable.');
      }
    } catch (error) {
      if (this.isCurrent(token)) {
        this.returnToComputer();
        this.showFeedback('The travel map could not be opened.');
      }
      console.error('[DetectiveOfficeScene] Travel map failed:', error);
    } finally {
      if (this.isCurrent(token)) this.childLoading = false;
    }
  }

  returnToComputer() {
    if (this.disposed || this._cleanupDone || this.navigating || !this.sys.isActive()) return;
    this.computerChild = null;
    this.childLoading = false;
    this.hideGameplayHud();
    if (this.hasScene('NewsHud')) this.scene.setVisible(false, 'NewsHud');
    if (this.computerUI?.isOpen) {
      this.activeDevice = 'computer';
      this.computerUI.resume();
    }
    this.refreshInteractions();
  }

  async goToCity() {
    if (!this.canUseOffice() || this.debugMode) return false;
    const token = this.runToken;
    this.navigating = true;
    this.refreshInteractions();
    const moved = await this.goto(this.citySceneKey, {
      entryPoint: 'pi-office', fromScene: SCENE_KEY, gameState
    });
    if (!this.isCurrent(token)) return moved !== false;
    this.navigating = false;
    this.refreshInteractions();
    if (moved === false) this.showFeedback('Too drunk to go to the city.');
    return moved !== false;
  }

  exitOffice() { return this.goToCity(); }

  async setupNewsHud() {
    const token = this.runToken;
    try {
      const news = await this.ensureOverlayScene('NewsHud');
      if (!this.isCurrent(token) || !news) return;
      this.newsHud = news;
      news.events.emit('setButtonsVisible', true);
      news.setHudVisible?.(true);
      if (this.activeDevice) {
        if (!this.hiddenOverlays.has('NewsHud')) this.hiddenOverlays.set('NewsHud', true);
        this.scene.setVisible(false, 'NewsHud');
      } else this.bringSceneToTopIfActive('NewsHud');
      this.hideGameplayHud();
    } catch (error) {
      console.error('[DetectiveOfficeScene] News setup failed:', error);
    }
  }

  createNewsTicker() {
    const { width } = this.scale;
    const cfg = this.newsConfig;
    this.tickerContainer = this.add.container(0, cfg.y).setDepth(300);
    const bar = this.add.rectangle(width / 2, cfg.height / 2, width, cfg.height,
      0x0e0d0b, 0.94).setStrokeStyle(1, 0x8a7a4d);
    const title = this.add.text(12, cfg.height / 2, 'NEWS', {
      fontFamily: 'SpecialElite, monospace', fontSize: '18px', color: '#ffd166'
    }).setOrigin(0, 0.5);
    this.tickerText = this.add.text(width + 20, cfg.height / 2, '', this.style(15)).setOrigin(0, 0.5);
    this.tickerMaskShape = this.make.graphics({ add: false });
    this.tickerMaskShape.fillStyle(0xffffff, 1);
    this.tickerMaskShape.fillRect(78, cfg.y, Math.max(1, width - 78), cfg.height);
    this.tickerMask = this.tickerMaskShape.createGeometryMask();
    this.tickerText.setMask(this.tickerMask);
    this.tickerContainer.add([bar, this.tickerText, title]);
    this.setTickerHeadline();
  }

  setTickerHeadline() {
    this.tickerText?.setText(this.newsConfig.headlines[this.headlineIndex] || 'No new reports.');
  }

  update(_time, delta) {
    if (!this.tickerText?.active || !this.tickerContainer?.visible) return;
    this.tickerText.x -= this.newsConfig.speed * Math.min(delta, 100) / 1000;
    if (this.tickerText.x + this.tickerText.width < 78) {
      this.headlineIndex = (this.headlineIndex + 1) % Math.max(1, this.newsConfig.headlines.length);
      this.setTickerHeadline();
      this.tickerText.x = this.scale.width + 20;
    }
  }

  createHotspot(cfg, index) {
    cfg.x = Number.isFinite(cfg.x) ? cfg.x : 100;
    cfg.y = Number.isFinite(cfg.y) ? cfg.y : 100;
    cfg.w = Math.max(10, Number(cfg.w) || 100);
    cfg.h = Math.max(10, Number(cfg.h) || 100);
    const rect = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0xffd166, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, cfg.label || cfg.id, this.style(16))
      .setOrigin(0.5, 1).setDepth(20).setVisible(false);
    const hotspot = { cfg, rect, label };
    rect.on('pointerover', () => {
      if (!this.canUseOffice() || this.debugMode) return;
      rect.setFillStyle(0xffd166, 0.18);
      label.setVisible(true);
    });
    rect.on('pointerout', () => {
      if (this.debugMode) return;
      rect.setFillStyle(0xffd166, 0);
      label.setVisible(false);
    });
    rect.on('pointerdown', () => {
      if (!this.canUseOffice()) return;
      if (this.debugMode) {
        this.selectedIndex = index;
        this.updateDebug();
        return;
      }
      switch (cfg.action) {
        case 'computer': this.openComputer(); break;
        case 'phone': this.openPhone(); break;
        case 'city':
        case 'gotoCity': void this.goToCity(); break;
        default: console.warn('[DetectiveOfficeScene] Unknown action:', cfg.action);
      }
    });
    this.input.setDraggable(rect, false);
    rect.on('drag', (_pointer, x, y) => {
      if (!this.debugMode || !this.canUseOffice()) return;
      this.selectedIndex = index;
      cfg.x = Math.round(x);
      cfg.y = Math.round(y);
      this.syncHotspot(hotspot);
      this.updateDebug();
    });
    this.syncHotspot(hotspot);
    return hotspot;
  }

  syncHotspot({ cfg, rect, label }) {
    rect.setPosition(cfg.x, cfg.y).setSize(cfg.w, cfg.h);
    rect.input?.hitArea?.setTo(0, 0, cfg.w, cfg.h);
    label.setPosition(cfg.x, cfg.y - cfg.h / 2 - 8);
  }

  refreshInteractions() {
    if (this.disposed) return;
    const enabled = this.canUseOffice();
    for (const { rect, label } of this.hotspots) {
      if (rect.input) rect.input.enabled = enabled;
      this.input.setDraggable(rect, enabled && this.debugMode);
      if (!enabled) {
        rect.setFillStyle(0xffd166, 0);
        label.setVisible(false);
      }
    }
  }

  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    if (!this.canUseOffice()) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.debugMode) {
        this.debugMode = false;
        this.updateDebug();
      } else void this.goToCity();
      return;
    }
    if (event.code === 'KeyD') {
      event.preventDefault();
      this.debugMode = !this.debugMode;
      this.updateDebug();
      return;
    }
    if (!this.debugMode || !this.hotspots.length) return;
    if (event.code === 'KeyC') {
      event.preventDefault();
      console.log('COPY INTO config/detectiveOfficeConfig.js -> hotspots:');
      console.log(JSON.stringify(this.hotspotDefs, null, 2));
      this.showFeedback('Hotspot configuration exported to the console.');
      return;
    }
    if (event.code === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + direction + this.hotspots.length) % this.hotspots.length;
      this.updateDebug();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault();
    const hotspot = this.hotspots[this.selectedIndex];
    const cfg = hotspot.cfg;
    const step = event.altKey ? 1 : 5;
    const horizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
    const direction = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    cfg[key] += direction * step;
    cfg.w = Math.max(10, cfg.w);
    cfg.h = Math.max(10, cfg.h);
    this.syncHotspot(hotspot);
    this.updateDebug();
  }

  updateDebug() {
    this.hotspots.forEach((hotspot, index) => {
      hotspot.rect.setFillStyle(0x00ff88, this.debugMode ? 0.2 : 0)
        .setStrokeStyle(this.debugMode ? 2 : 0, index === this.selectedIndex ? 0xff44ff : 0x00ff88);
      hotspot.label.setVisible(this.debugMode);
    });
    const cfg = this.hotspots[this.selectedIndex]?.cfg;
    this.debugText?.setText(this.debugMode ? [
      `DEBUG: ${cfg?.id || 'no hotspots'}`,
      `x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}`,
      'Arrows: move | Shift: resize | Alt: 1px',
      'Tab: next | C: export | D / Escape: close',
      'Hotspot actions disabled.'
    ].join('\n') : '');
    this.refreshInteractions();
  }

  showFeedback(text) {
    if (this.disposed || this._cleanupDone) return;
    this.feedbackTimer?.remove(false);
    this.feedback?.destroy();
    const message = this.add.text(this.scale.width / 2,
      this.newsConfig.y + this.newsConfig.height + 80, text, {
        ...this.style(18), align: 'center',
        wordWrap: { width: Math.max(100, this.scale.width - 60) }
      }).setOrigin(0.5, 0).setDepth(2500);
    this.feedback = message;
    this.feedbackTimer = this.time.delayedCall(3500, () => {
      if (message.active) message.destroy();
      if (this.feedback === message) {
        this.feedback = null;
        this.feedbackTimer = null;
      }
    });
  }

  cleanupOffice() {
    if (this.disposed) return;
    this.disposed = true;
    this.runToken = null;
    this.input.keyboard?.off('keydown', this.keyHandler);
    this.events.off('resume', this.onResume);
    this.events.off('wake', this.onResume);
    this.events.off('sleep', this.onOfficeSleep);
    this.events.off('shutdown', this.cleanupOffice, this);
    this.events.off('destroy', this.cleanupOffice, this);
    this.feedbackTimer?.remove(false);
    try {
      for (const key of ['piCrimeBoardUI', 'destinationsUI', 'phoneUI', 'computerUI']) {
        try { this[key]?.destroy(); }
        catch (error) { console.warn(`[DetectiveOfficeScene] ${key} cleanup failed:`, error); }
        this[key] = null;
      }
      this.tickerText?.clearMask(false);
      this.tickerMask?.destroy();
      this.tickerMaskShape?.destroy();
      this.hiddenOverlays.clear();
    } finally {
      this.unlockHtmlHud();
    }
  }
}