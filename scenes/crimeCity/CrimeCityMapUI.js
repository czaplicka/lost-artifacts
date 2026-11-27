import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { EventBus } from '../../EventBus.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { getCrimeCityLocalTravelCost, LOCAL_TRAVEL_MONEY } from './CrimeCityLocalTravelCosts.js';


const ICON_SIZE = 132;
const LABEL_OFFSET = 82;
const BADGE_OFFSET = 84;
const REFRESH_MS = 250;
const ASSET_RETRY_MS = 5000;
const BUILDING_KEYS = ['shop_icon', 'apt_icon'];
const FILE = 'scenes/crimeCity/CrimeCityMapUI.js';
const text = id => __dialogueText(FILE, id);
const TARGETS = { search: ['crime-scene'], crime_lab: ['crime-lab'], policja: ['suspect-grid'], apt_icon: ['apartment'] };


// Pogoda zapisana przez CityWeatherManager (clear / rain / snow / fog).
function getCityWeatherType(cityId) {
  const id = String(cityId || '').trim().toLowerCase().replace(/\s+/g, '_');
  const type = gameState.cityWeather?.cities?.[`agency:${id}`]?.type;
  return ['clear', 'rain', 'snow', 'fog'].includes(type) ? type : 'clear';
}


// Środek ikony w (x, y), rozmiar ok. 34 x 34 px.
function drawWeatherIcon(scene, type, x, y) {
  const g = scene.add.graphics().setPosition(x, y);

  const cloud = color => {
    g.fillStyle(color, 1);
    g.fillCircle(-8, 3, 8);
    g.fillCircle(2, -3, 10);
    g.fillCircle(12, 3, 7);
    g.fillRect(-8, 3, 20, 8);
  };

  if (type === 'clear') {
    g.fillStyle(0xffd54a, 1);
    g.fillCircle(0, 0, 9);
    g.lineStyle(3, 0xffd54a, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(
        Math.cos(a) * 12, Math.sin(a) * 12,
        Math.cos(a) * 17, Math.sin(a) * 17
      );
    }
  } else if (type === 'rain') {
    cloud(0x9aa7b4);
    g.lineStyle(3, 0x6fb4ff, 1);
    [-8, 1, 10].forEach(dx => g.lineBetween(dx, 12, dx - 3, 18));
  } else if (type === 'snow') {
    cloud(0xc9d3dc);
    g.fillStyle(0xffffff, 1);
    [-8, 1, 10].forEach(dx => g.fillCircle(dx, 15, 2.5));
  } else {
    // fog
    g.lineStyle(4, 0xcfd8dc, 1);
    g.lineBetween(-15, -7, 15, -7);
    g.lineBetween(-11, 0, 17, 0);
    g.lineBetween(-15, 7, 13, 7);
  }

  return g;
}


export class CrimeCityMapUI {
  constructor(scene) {
    this.scene = scene;
    this.background = null;
    this.headerObjects = []; this.locationObjects = []; this.suspectObjects = [];
    this.shopObjects = []; this.apartmentObjects = []; this.selectionObjects = []; this.costLabels = [];
    this.tutorialTargets = new Map(); this.boundTutorial = null;
    this.apartmentSignature = null; this.apartmentAvailabilityHint = false;
    this.assetsRequested = false;
    this._assetOwner = Symbol('crime-city-map-icons');
    this._assetManager = null; this._assetPromise = null;
    this._assetRetryAt = 0; this._assetWarningShown = false; this._iconsDirty = false;
    this._nextRefreshAt = -Infinity; this._lastRefreshAt = -Infinity;
    this.handleShutdown = () => this.destroy();
    this.handleCostChange = () => this.refreshCostLabels();
    this.handleWake = () => { this._nextRefreshAt = -Infinity; };
    this.handleUpdate = () => {
      if (!this.canRefresh() || !this.scene.sys.isActive()) return;
      const now = this.getNow();
      if (now >= this._lastRefreshAt && now < this._nextRefreshAt) return;
      this._lastRefreshAt = now; this._nextRefreshAt = now + REFRESH_MS;
      if (this._iconsDirty) {
        this._iconsDirty = false;
        this.createShopIcon(); this.apartmentSignature = null;
      }
      this.refreshApartmentLocation();
      this.syncTutorialTargets();
      if (!this.assetsRequested && now >= this._assetRetryAt) void this.ensureBuildingAssets();
    };
    this.costEvents = ['energyChanged', 'energyModifiersChanged', 'agentStatsChanged', 'character-created'];
    scene.events.once('shutdown', this.handleShutdown);
    scene.events.once('destroy', this.handleShutdown);
    scene.events.on('wake', this.handleWake); scene.events.on('resume', this.handleWake);
    scene.events.on('postupdate', this.handleUpdate);
    this.costEvents.forEach(event => EventBus.on(event, this.handleCostChange));
  }


  getNow() { return Number.isFinite(this.scene?.time?.now) ? this.scene.time.now : Date.now(); }
  track(object, collection) { if (object) collection.push(object); return object; }
  registerInteractive(object) {
    if (!this.scene || !object) return;
    this.scene.interactiveObjects ??= [];
    if (!this.scene.interactiveObjects.includes(object)) this.scene.interactiveObjects.push(object);
  }


  destroyObjects(collection) {
    const objects = [...new Set(collection.splice(0))];
    const removing = new Set(objects);
    this.costLabels = this.costLabels.filter(entry => !removing.has(entry.label));
    for (const [id, icon] of this.tutorialTargets) {
      if (!removing.has(icon)) continue;
      const tutorial = this.scene?.crimeTutorial;
      if (tutorial?.hotspots?.get(id) === icon) {
        tutorial.unregisterHotspot(id);
        if (tutorial.highlight && tutorial.getStep?.() && tutorial.stepContent?.[tutorial.getStep()]?.targetHotspot === id) tutorial.clearHighlight();
      }
      this.tutorialTargets.delete(id);
    }
    if (Array.isArray(this.scene?.interactiveObjects)) {
      this.scene.interactiveObjects = this.scene.interactiveObjects.filter(object => !removing.has(object));
    }
    // Phaser and other owners must receive the object's destroy event.
    for (const object of objects) object?.destroy?.();
  }


  canRefresh() { return Boolean(this.scene && !this.scene._cleanupDone); }
  registerTutorialTarget(icon, textureKey) {
    const ids = TARGETS[textureKey]; if (!ids) return;
    icon.hotspotData = { x: icon.x - ICON_SIZE / 2, y: icon.y - ICON_SIZE / 2, width: ICON_SIZE, height: ICON_SIZE };
    ids.forEach(id => this.tutorialTargets.set(id, icon)); this.syncTutorialTargets();
  }
  syncTutorialTargets() {
    const tutorial = this.scene?.crimeTutorial;
    if (!tutorial || tutorial.destroyed) return;
    this.boundTutorial = tutorial;
    for (const [id, icon] of this.tutorialTargets) {
      if (icon?.scene && icon.active && tutorial.hotspots.get(id) !== icon) tutorial.registerHotspot(id, icon);
    }
  }


  areSuspectFilesUnlocked() {
    const caseKey = this.scene?.getCaseKey?.();
    if (caseKey === null || caseKey === undefined || caseKey === '') return false;
    const choice = gameState.suspectFilesPhoneDecisions?.[String(caseKey)];
    return choice === 'answer' || choice === 'ignore';
  }
  isApartmentStageAvailable(candidates = null) {
    if (!this.scene) return false;
    const list = candidates ?? this.getApartmentCandidates();
    return Boolean(this.apartmentAvailabilityHint || list.length > 0 || this.scene.hasAnyDebunkedAlibi?.() === true || this.scene.hasVisitedApartment?.() === true);
  }
  shouldShowSuspectFiles(candidates = null) { return this.areSuspectFilesUnlocked() && !this.isApartmentStageAvailable(candidates); }
  syncSuspectFilesVisibility(candidates = null) {
    if (this.canRefresh() && this.suspectObjects.length > 0 && !this.shouldShowSuspectFiles(candidates)) this.destroyObjects(this.suspectObjects);
  }


  getHotelTravelEnergy() { return getCrimeCityLocalTravelCost('hotel', getEnergyManager()).energy; }
  getDisplayCost(nodeId) {
    if (nodeId === 'hotel' || nodeId === 'shop') return getCrimeCityLocalTravelCost(nodeId, getEnergyManager());
    const costs = this.scene?.getLocalActivityEnergyCost?.(nodeId);
    return { energy: costs?.totalCost ?? 0, money: LOCAL_TRAVEL_MONEY };
  }
  getLocationCostLabel(title, nodeId) {
    if (nodeId === 'hotel' || nodeId === 'shop') {
      const cost = this.getDisplayCost(nodeId);
      const emergency = nodeId === 'hotel' && cost.energy === 0;
      return `${title}${text('t_336d89e033173225dce7')}${cost.energy}${text('t_324d0d3f8a5bbac97404')}` +
        `${text('t_53f6f7a2fd111bfbfea4')}${cost.money}${emergency ? text('t_0ca31857e88b1ee90884') : ''}`;
    }
    const costs = this.scene?.getLocalActivityEnergyCost?.(nodeId); if (!costs) return title;
    const lines = [title], manager = getEnergyManager();
    const details = costs.activityCost > 0 && typeof manager.getActivityCostDetails === 'function' ? manager.getActivityCostDetails(costs.activityType) : null;
    if (details?.applied && details.finalCost === costs.activityCost) {
      lines.push(`${text('t_4ead6cfb1a6f08ecf13a')}${details.originalCost} -> ${costs.activityCost}`);
      lines.push(`${text('t_bc32d0d7c8ebe3474393')}${details.saved}`);
    } else {
      lines.push(costs.activityCost === 0 && nodeId === 'crime_lab' ? text('t_f18767da5c93260aa4f7') : `${text('t_4ead6cfb1a6f08ecf13a')}${costs.activityCost}`);
    }
    lines.push(`${text('t_253275097ed3df73b02b')}${costs.travelCost}`);
    lines.push(`${text('t_55cdce10001ef68e3111')}${costs.totalCost}${text('t_6e17fd780882359031cf')}`);
    return lines.join('\n');
  }
  refreshCostLabels() {
    if (!this.canRefresh()) return;
    this.costLabels = this.costLabels.filter(entry => entry.label?.active && entry.label.scene);
    for (const entry of this.costLabels) {
      const cost = this.getDisplayCost(entry.nodeId);
      entry.energyText.setText(String(cost.energy)); entry.moneyText.setText(String(cost.money));
      entry.energyText.setColor(getEnergyManager().getCurrentEnergy() < cost.energy ? '#ff8b80' : '#ffffff');
      entry.tooltip.setText(this.getLocationCostLabel(entry.title, entry.nodeId)); this.positionCostLabel(entry);
    }
  }
  positionCostLabel(entry) {
    const { width, height } = this.scene.scale, half = entry.label.width / 2;
    const x = Phaser.Math.Clamp(entry.x, half + 8, Math.max(half + 8, width - half - 8));
    const rowY = Math.min(entry.y + LABEL_OFFSET + entry.label.height + 16, height - 20);
    entry.label.setPosition(x, Math.max(0, rowY - entry.label.height - 16));
    entry.energyIcon.setPosition(x - 48, rowY); entry.energyText.setPosition(x - 32, rowY);
    entry.moneyIcon.setPosition(x + 15, rowY); entry.moneyText.setPosition(x + 31, rowY);
    const tw = entry.tooltip.width / 2;
    entry.tooltip.setPosition(Phaser.Math.Clamp(x, tw + 8, Math.max(tw + 8, width - tw - 8)), Math.max(80, entry.y - ICON_SIZE / 2 - entry.tooltip.height - 18));
  }
  makeEnergyIcon(x, y, collection) {
    const graphics = this.scene.add.graphics().setPosition(x, y).setDepth(7);
    graphics.fillStyle(0xffd54f, 1);
    graphics.fillPoints([{ x: 2, y: -11 }, { x: -7, y: 2 }, { x: -1, y: 2 }, { x: -3, y: 11 }, { x: 8, y: -3 }, { x: 2, y: -3 }], true);
    return this.track(graphics, collection);
  }
  makeMoneyIcon(x, y, collection) {
    const graphics = this.scene.add.graphics().setPosition(x, y).setDepth(7);
    graphics.fillStyle(0xe7b94c, 1).fillCircle(0, 0, 10);
    graphics.lineStyle(2, 0xffe399, 1).strokeCircle(0, 0, 8);
    graphics.lineStyle(2, 0x785016, 1).lineBetween(0, -5, 0, 5);
    return this.track(graphics, collection);
  }
  createCostRow({ title, nodeId, label, x, y, collection }) {
    const textStyle = { fontFamily: 'SpecialElite', fontSize: '17px', color: '#ffffff', backgroundColor: '#000000bb', padding: { x: 3, y: 2 } };
    const energyIcon = this.makeEnergyIcon(0, 0, collection), moneyIcon = this.makeMoneyIcon(0, 0, collection);
    const energyText = this.track(this.scene.add.text(0, 0, '', textStyle).setOrigin(0, 0.5).setDepth(7), collection);
    const moneyText = this.track(this.scene.add.text(0, 0, '', textStyle).setOrigin(0, 0.5).setDepth(7), collection);
    const tooltip = this.track(this.scene.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '15px', color: '#fff4d0', backgroundColor: '#17110ef2',
      padding: { x: 10, y: 8 }, align: 'center', wordWrap: { width: Math.min(250, this.scene.scale.width - 32) }
    }).setOrigin(0.5, 0).setDepth(90).setVisible(false), collection);
    const entry = { title, nodeId, label, x, y, energyIcon, moneyIcon, energyText, moneyText, tooltip };
    this.costLabels.push(entry); this.refreshCostLabels(); return entry;
  }


  async ensureBuildingAssets() {
    if (!this.canRefresh()) return false;
    if (this._assetPromise) return this._assetPromise;
    const scene = this.scene;
    if (this.assetsRequested && BUILDING_KEYS.every(key => scene.textures.exists(key))) return true;
    if (this.getNow() < this._assetRetryAt) return false;
    const manager = scene.game?.assets;
    const owner = this._assetOwner;
    this._assetManager = manager;
    // Defer execution so _assetPromise is installed before any synchronous error.
    const task = Promise.resolve().then(async () => {
      if (this.scene !== scene || !this.canRefresh()) return false;
      if (!manager) throw new Error('AssetManager is unavailable.');
      const assets = BUILDING_KEYS.map(key => {
        const asset = manager.catalog.get(`image:${key}`);
        if (!asset) throw new Error(`Missing manifest entry: image:${key}`);
        return asset;
      });
      const missing = BUILDING_KEYS.filter(key => !scene.textures.exists(key));
      manager.pin(owner, assets);
      await manager.loadAssets(assets, 'Loading city map icons...');
      if (this.scene !== scene || !this.canRefresh()) { manager.unpin(owner); return false; }
      if (!BUILDING_KEYS.every(key => scene.textures.exists(key))) throw new Error('City map textures are still unavailable.');
      this.assetsRequested = true; this._assetRetryAt = 0; this._assetWarningShown = false;
      if (missing.length) {
        this._iconsDirty = true;
        this._nextRefreshAt = -Infinity;
      }
      return true;
    }).catch(error => {
      manager?.unpin?.(owner);
      if (this.scene !== scene || !this.canRefresh()) return false;
      this.assetsRequested = false; this._assetRetryAt = this.getNow() + ASSET_RETRY_MS;
      console.warn('[CrimeCityMapUI] Building icons unavailable:', error);
      if (!this._assetWarningShown && scene.sys.isActive()) {
        this._assetWarningShown = true;
        scene.showMessage?.('Some map icons could not be loaded. Temporary markers are still clickable. Retrying shortly.', 4500, 'Map graphics');
      }
      return false;
    });
    this._assetPromise = task;
    try { return await task; }
    finally { if (this._assetPromise === task) this._assetPromise = null; }
  }


  createBackground() {
    this.background?.destroy(); this.background = null;
    const scene = this.scene;
    const configured = scene.crimeCityConfig.backgroundKey || `${scene.cityId}_crime`;
    const key = scene.textures.exists(configured) ? configured : scene.cityId;
    if (!scene.textures.exists(key)) { scene.cameras.main.setBackgroundColor('#17202a'); return; }
    this.background = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, key).setDisplaySize(scene.scale.width, scene.scale.height).setDepth(-10);
  }
  createHeader() {
    this.destroyObjects(this.headerObjects);
    const scene = this.scene;
    this.track(scene.add.rectangle(0, 0, scene.scale.width, 76, 0x000000, 0.5).setOrigin(0).setDepth(20), this.headerObjects);
    this.track(drawWeatherIcon(scene, getCityWeatherType(scene.cityId), 58, 38).setDepth(21), this.headerObjects);
    this.track(scene.add.text(92, 18, `${scene.cityData.city}${text('t_0a07f659461970d8d8dc')}${scene.cityData.country}`, { fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffffff' }).setDepth(21), this.headerObjects);
    const artifact = gameState.currentMission?.artifact;
    let subtitle = text('t_68251b3816503c089c5d');
    if (scene.hasVisitedApartment()) subtitle = text('t_6b737e4fdf59a0f8c250');
    else if (this.isApartmentStageAvailable()) subtitle = text('t_4787d2a3e98a54a3914c');
    else if (!scene.isCrimeSceneCompleted()) subtitle = artifact ? `${text('t_4741b03bc25bc5a635a3')}${artifact}${text('t_359a7688760bd81209fb')}` : text('t_561c03d089415571ba36');
    else if (!scene.isCrimeLabCompleted()) subtitle = text('t_e447b577413e7f777e23');
    else if (!this.areSuspectFilesUnlocked()) subtitle = text('t_0cc0f2d888c5e2d422ab');
    else if (!scene.isGridCompleted()) subtitle = text('t_a2b3892a6129c2db46fe');
    this.track(scene.add.text(40, 50, subtitle, { fontFamily: 'SpecialElite', fontSize: '16px', color: '#f1e6b8' }).setDepth(21), this.headerObjects);
  }
  createAvailableLocations({ crimeSceneCompleted, crimeLabCompleted, apartmentAvailable, apartmentVisited = this.scene.hasVisitedApartment() } = {}) {
    this.destroyObjects(this.locationObjects); this.destroyObjects(this.suspectObjects);
    this.destroyObjects(this.shopObjects); this.destroyObjects(this.apartmentObjects); this.closeApartmentSelection();
    this.apartmentAvailabilityHint = apartmentAvailable === true; this.apartmentSignature = null;
    if (!crimeSceneCompleted) this.createCrimeSceneIcon();
    if (this.shouldShowSuspectFiles()) this.createSuspectsIcon();
    // Keep lab access until the separate pre-lab CSI phone flow is implemented.
    if (crimeSceneCompleted && (!crimeLabCompleted || apartmentVisited)) this.createLabIcon({ apartmentEvidence: apartmentVisited });
    this.createHotelIcon(); this.createShopIcon(); this.refreshApartmentLocation();
    void this.ensureBuildingAssets(); this.syncTutorialTargets();
  }
  startApartmentRefresh() { this.refreshApartmentLocation(); }
  getApartmentCandidates() {
    const suspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
    const suspectsById = new Map(), candidates = new Map();
    // Read the full alibi result once per scan rather than once per suspect.
    const resolution = this.scene?.progressService?.getAlibiResolutionProgress?.();
    const contradicted = resolution ? new Set(resolution.ready ? resolution.conclusions.filter(item => item.status === 'contradicted').map(item => item.suspectId) : []) : null;
    const isDebunked = id => contradicted ? contradicted.has(id) : this.scene.isAlibiDebunked?.(id);
    for (const suspect of suspects) {
      if (!suspect?.id) continue;
      suspectsById.set(suspect.id, suspect);
      if (isDebunked(suspect.id)) candidates.set(suspect.id, suspect);
    }
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    if (Array.isArray(debunked)) {
      for (const id of debunked) {
        if (typeof id !== 'string' || !id || candidates.has(id) || !isDebunked(id)) continue;
        candidates.set(id, suspectsById.get(id) || { id });
      }
    }
    return [...candidates.values()];
  }
  getSuspectLabel(suspect) { return suspect?.name || text('t_109b4fc2ad1cec0485a8'); }
  refreshApartmentLocation(availabilityHint) {
    if (!this.canRefresh()) return;
    if (typeof availabilityHint === 'boolean') this.apartmentAvailabilityHint = availabilityHint;
    const candidates = this.getApartmentCandidates();
    const available = this.apartmentAvailabilityHint || candidates.length > 0 || this.scene.hasAnyDebunkedAlibi?.() === true;
    this.syncSuspectFilesVisibility(candidates);
    const signature = JSON.stringify([available, candidates.map(suspect => [suspect.id, this.getSuspectLabel(suspect)])]);
    if (signature === this.apartmentSignature) { this.refreshCostLabels(); return; }
    this.apartmentSignature = signature;
    this.destroyObjects(this.apartmentObjects); this.closeApartmentSelection();
    if (available) this.createApartmentIcon(candidates);
  }
  createShopIcon() {
    this.destroyObjects(this.shopObjects);
    const position = this.scene.crimeCityConfig.shop || { x: this.scene.scale.width * 0.82, y: this.scene.scale.height * 0.3 };
    return this.createMapIcon({ ...position, textureKey: 'shop_icon', label: text('t_d00aae6b7fbf77a4566d'), costNodeId: 'shop', fallbackColor: 0x806127, fallbackStroke: 0xffd166, collection: this.shopObjects, onClick: () => this.scene.visitShop() });
  }
  createApartmentIcon(candidates) {
    const position = this.scene.crimeCityConfig.apartment || { x: this.scene.scale.width / 2, y: this.scene.scale.height - 180 };
    this.createMapIcon({ ...position, textureKey: 'apt_icon', costNodeId: 'apartment', label: candidates.length > 1 ? `${text('t_4af6060d67757e9e9126')}${candidates.length}${text('t_ba5ec51d07a4ac0e9516')}` : text('t_02c9e55c29cb6cb663ef'), fallbackColor: 0x795548, fallbackStroke: 0xffd180, collection: this.apartmentObjects, onClick: () => this.openApartmentSelection() });
    this.createStatusBadge(position.x, position.y - BADGE_OFFSET, text('t_302577634f2ecdc1f8b3'), '#ffd180', this.apartmentObjects);
  }
  openApartmentSelection() {
    const scene = this.scene;
    if (!scene || scene.isTransitioning || scene.isVisitingApartment || scene._cleanupDone) return;
    const candidates = this.getApartmentCandidates();
    if (!candidates.length) { scene.showMessage(text('t_48cd385d1f808c0d94b0') + text('t_bafd113faa9aa7ae2905'), 3000, text('t_e09afad9b0dfcb2294f9')); return; }
    if (candidates.length === 1) { scene.visitApartment(candidates[0].id); return; }
    this.closeApartmentSelection(); scene.closeAllUIPanels();
    const { width, height } = scene.scale, panelWidth = Math.min(520, width - 32);
    const rowHeight = Math.min(48, Math.max(28, (height - 220) / candidates.length));
    const panelHeight = 150 + candidates.length * rowHeight, top = (height - panelHeight) / 2;
    const blocker = this.track(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(100).setInteractive(), this.selectionObjects);
    blocker.on('pointerdown', () => this.closeApartmentSelection());
    this.track(scene.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x17202a, 1).setStrokeStyle(2, 0xffd180).setDepth(101).setInteractive(), this.selectionObjects);
    this.track(scene.add.text(width / 2, top + 24, 'Choose an apartment', { fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffd180' }).setOrigin(0.5, 0).setDepth(102), this.selectionObjects);
    candidates.forEach((suspect, index) => {
      const button = this.track(scene.add.text(width / 2, top + 88 + index * rowHeight, this.getSuspectLabel(suspect), { fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff', backgroundColor: '#304c73', padding: { x: 14, y: 6 }, wordWrap: { width: panelWidth - 64 }, align: 'center' }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }), this.selectionObjects);
      button.on('pointerover', () => button.setColor('#ffe066')); button.on('pointerout', () => button.setColor('#ffffff'));
      button.on('pointerdown', () => { this.closeApartmentSelection(); scene.visitApartment(suspect.id); });
    });
    const cancel = this.track(scene.add.text(width / 2, top + panelHeight - 30, 'Cancel', { fontFamily: 'SpecialElite', fontSize: '18px', color: '#cccccc' }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }), this.selectionObjects);
    cancel.on('pointerdown', () => this.closeApartmentSelection());
  }
  closeApartmentSelection() { this.destroyObjects(this.selectionObjects); }


  visitHotel() {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || !scene.sys.isActive() || scene.isTransitioning) return false;
    const energy = getEnergyManager();
    if (energy.isForcedSleepActive() || energy.isManualSleepActive()) return false;
    const cost = this.getHotelTravelEnergy();
    if (cost > 0 && !energy.canAfford(cost).ok) { scene.showNoEnergyPopup(); return false; }
    scene.closeAllUIPanels();
    const opened = scene.transitionTo('HotelScene', { cityId: scene.cityId, city: scene.cityData.city, country: scene.cityData.country, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }, sourceScene: 'CrimeCityScene' });
    if (!opened) return false;
    if (cost > 0) energy.consumeCustom(cost, `${text('t_7b248e576420e4d2196f')}${cost}`, { requireFullAmount: true, activityType: 'travel_hotel' });
    saveGameState(); scene.getSceneIfActive('UIScene')?.updateEnergy?.(); return true;
  }
  createHotelIcon() {
    const position = this.scene.crimeCityConfig.hotel; if (!position) return;
    return this.createMapIcon({ ...position, textureKey: 'hotel_icon', fallbackColor: 0x6a4c93, fallbackStroke: 0xd6b4ff, label: text('t_509b3c4e5dad347d7d5f'), costNodeId: 'hotel', onClick: () => this.visitHotel() });
  }
  createSuspectsIcon() {
    if (!this.shouldShowSuspectFiles()) return;
    this.destroyObjects(this.suspectObjects);
    const scene = this.scene;
    const position = scene.crimeCityConfig.suspectBoard || { x: scene.scale.width - 150, y: scene.scale.height - 180 };
    return this.createMapIcon({ ...position, textureKey: 'policja', fallbackColor: 0x304c73, fallbackStroke: 0x9ac7ff, collection: this.suspectObjects, label: text('t_4c07b76dd2a1eb0faf9e'), onClick: () => {
      if (!this.shouldShowSuspectFiles()) { this.syncSuspectFilesVisibility(); return; }
      const currentSuspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
      if (!currentSuspects.length) { scene.showMessage(text('t_588bf66630db33484dc8') + text('t_db26b87e2f73ae4d8c04'), 3000, text('t_e09afad9b0dfcb2294f9')); return; }
      scene.closeAllUIPanels();
      scene.transitionTo('SuspectsScene', { cityId: scene.cityId, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }, sourceScene: 'CrimeCityScene', caseSuspects: currentSuspects, identityEvidence: gameState.identityEvidence, identityEvidenceResult: gameState.identityEvidenceResult, hypothesisEvidence: gameState.hypothesisEvidence, hypothesisEvidenceResult: gameState.hypothesisEvidenceResult, forensicResults: gameState.forensicResults || [], gameState });
    } });
  }
  createCrimeSceneIcon() {
    const position = this.scene.crimeCityConfig.crimeScene; if (!position) return;
    return this.createMapIcon({ ...position, textureKey: 'search', label: text('t_deb2ecf56ab544bfcb8e'), costNodeId: 'crime_scene', fallbackColor: 0xd4af37, fallbackStroke: 0xfff1a8, onClick: () => this.scene.openCrimeScene() });
  }
  createLabIcon({ apartmentEvidence = this.scene.hasVisitedApartment() } = {}) {
    const scene = this.scene, position = scene.crimeCityConfig.crimeLab;
    if (!position || !scene.isCrimeSceneCompleted()) return;
    const entryPaid = scene.hasPaidCrimeLabEntry();
    const label = apartmentEvidence ? text('t_9e07f72c6c309358641a') : entryPaid ? text('t_1c82f517c7ba5d8c3557') : text('t_742e27a5828691c412bc');
    const result = this.createMapIcon({ ...position, textureKey: 'crime_lab', fallbackColor: 0x1565c0, fallbackStroke: 0x7fc8f8, label, costNodeId: 'crime_lab', onClick: () => scene.openCrimeLab() });
    if (apartmentEvidence) this.createStatusBadge(position.x, position.y - BADGE_OFFSET, text('t_b1776ac23ac758aa36ac'), '#8ed1fc');
    return result;
  }
  createMapIcon({ x, y, textureKey, fallbackColor = 0x37474f, fallbackStroke = 0xffd166, label, onClick, collection = this.locationObjects, costNodeId = null }) {
    const scene = this.scene, hasTexture = scene.textures.exists(textureKey);
    const icon = hasTexture ? scene.add.image(x, y, textureKey) : scene.add.circle(x, y, ICON_SIZE / 2, fallbackColor, 0.95).setStrokeStyle(3, fallbackStroke);
    const baseScale = hasTexture ? ICON_SIZE / Math.max(icon.width, icon.height, 1) : 1;
    icon.setScale(baseScale).setDepth(5);
    const labelObject = scene.add.text(x, y + LABEL_OFFSET, label, { fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 7, y: 4 }, align: 'center', wordWrap: { width: Math.min(220, scene.scale.width * 0.22), useAdvancedWrap: true } }).setOrigin(0.5, 0).setDepth(6);
    this.track(icon, collection); this.track(labelObject, collection); this.registerTutorialTarget(icon, textureKey);
    const costEntry = costNodeId ? this.createCostRow({ title: label, nodeId: costNodeId, label: labelObject, x, y, collection }) : null;
    if (typeof onClick === 'function') {
      icon.setInteractive({ useHandCursor: true }); this.registerInteractive(icon);
      icon.on('pointerover', () => { icon.setScale(baseScale * 1.1); labelObject.setColor('#ffe066'); if (costEntry) { this.refreshCostLabels(); costEntry.tooltip.setVisible(true); } });
      icon.on('pointerout', () => { icon.setScale(baseScale); labelObject.setColor('#ffffff'); costEntry?.tooltip.setVisible(false); });
      icon.on('pointerdown', pointer => {
        if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
        if (!this.scene || this.selectionObjects.length || this.scene.isTransitioning || this.scene._cleanupDone) return;
        costEntry?.tooltip.setVisible(false); onClick();
      });
    }
    return { icon, label: labelObject };
  }
  createStatusBadge(x, y, text, color, collection = this.locationObjects) {
    const badge = this.scene.add.text(x, y, text, { fontFamily: 'SpecialElite', fontSize: '13px', color, backgroundColor: '#000000cc', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(7);
    this.track(badge, collection); return badge;
  }
  destroy() {
    if (!this.scene) return;
    const scene = this.scene;
    scene.events.off('shutdown', this.handleShutdown); scene.events.off('destroy', this.handleShutdown);
    scene.events.off('postupdate', this.handleUpdate); scene.events.off('wake', this.handleWake); scene.events.off('resume', this.handleWake);
    this.costEvents.forEach(event => EventBus.off(event, this.handleCostChange));
    this.closeApartmentSelection();
    this.destroyObjects(this.apartmentObjects); this.destroyObjects(this.suspectObjects); this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.locationObjects); this.destroyObjects(this.headerObjects);
    this.background?.destroy(); this.background = null;
    this._assetManager?.unpin?.(this._assetOwner);
    this.costLabels = []; this.tutorialTargets.clear(); this.boundTutorial = null;
    this.apartmentSignature = null; this.apartmentAvailabilityHint = false;
    this.scene = null;
  }
}