import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { EventBus } from '../../EventBus.js';

const ICON_SIZE = 132;
const LABEL_OFFSET = 82;
const BADGE_OFFSET = 84;

export class CrimeCityMapUI {
  constructor(scene) {
    this.scene = scene;
    this.background = null;
    this.headerObjects = [];
    this.locationObjects = [];
    this.shopObjects = [];
    this.apartmentObjects = [];
    this.selectionObjects = [];
    this.costLabels = [];
    this.apartmentSignature = null;
    this.apartmentAvailabilityHint = false;
    this.assetsRequested = false;
    this.assetReadyHandlers = [];
    this.handleShutdown = () => this.destroy();
    this.handleCostChange = () => this.refreshCostLabels();
    this.costEvents = ['energyChanged', 'agentStatsChanged', 'character-created'];
    scene.events.once('shutdown', this.handleShutdown);
    this.costEvents.forEach(event => EventBus.on(event, this.handleCostChange));
  }

  track(object, collection) {
    if (object) collection.push(object);
    return object;
  }

  registerInteractive(object) {
    const scene = this.scene;
    if (!scene || !object) return;
    if (!Array.isArray(scene.interactiveObjects)) scene.interactiveObjects = [];
    if (!scene.interactiveObjects.includes(object)) scene.interactiveObjects.push(object);
  }

  destroyObjects(collection) {
    const objects = collection.splice(0);
    const removing = new Set(objects);
    this.costLabels = this.costLabels.filter(entry => !removing.has(entry.label));
    if (Array.isArray(this.scene?.interactiveObjects)) {
      this.scene.interactiveObjects = this.scene.interactiveObjects.filter(object => !removing.has(object));
    }
    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  canRefresh() { return Boolean(this.scene && !this.scene._cleanupDone); }

  areSuspectFilesUnlocked() {
    const caseKey = this.scene?.getCaseKey?.();
    if (caseKey === null || caseKey === undefined || caseKey === '') return false;
    const choice = gameState.suspectFilesPhoneDecisions?.[String(caseKey)];
    return choice === 'answer' || choice === 'ignore';
  }

  getLocationCostLabel(title, nodeId) {
    const scene = this.scene;
    const costs = scene?.getLocalActivityEnergyCost?.(nodeId);
    if (!costs) return title;
    const lines = [title];
    const manager = getEnergyManager();
    const details = costs.activityCost > 0 && typeof manager.getActivityCostDetails === 'function'
      ? manager.getActivityCostDetails(costs.activityType) : null;
    if (details?.applied && details.finalCost === costs.activityCost) {
      lines.push(`Energy: ${details.originalCost} → ${costs.activityCost}`);
      lines.push(`Resourcefulness: −${details.saved}`);
    } else {
      lines.push(costs.activityCost === 0 && nodeId === 'crime_lab'
        ? 'Energy: 0 (entry already paid)' : `Energy: ${costs.activityCost}`);
    }
    lines.push(`Travel: ${costs.travelCost}`);
    lines.push(`Total: ${costs.totalCost} Energy`);
    return lines.join('\n');
  }

  refreshCostLabels() {
    if (!this.canRefresh()) return;
    this.costLabels = this.costLabels.filter(entry => entry.label?.active !== false && entry.label?.scene);
    this.costLabels.forEach(entry => {
      entry.label.setText(this.getLocationCostLabel(entry.title, entry.nodeId));
      this.positionCostLabel(entry);
    });
  }

  positionCostLabel(entry) {
    const { width, height } = this.scene.scale;
    const textWidth = entry.label.displayWidth ?? entry.label.width;
    const textHeight = entry.label.displayHeight ?? entry.label.height;
    const half = textWidth / 2;
    const x = Math.min(Math.max(entry.x, half + 8), Math.max(half + 8, width - half - 8));
    const y = Math.max(0, Math.min(entry.y + LABEL_OFFSET, height - textHeight - 8));
    entry.label.setPosition(x, y);
  }

  ensureBuildingAssets() {
    if (this.assetsRequested || !this.canRefresh()) return;
    this.assetsRequested = true;
    const scene = this.scene;
    let queued = false;
    const assets = [['shop_icon', 'assets/shop.png'], ['apt_icon', 'assets/apt.png']];
    for (const [key, path] of assets) {
      if (scene.textures.exists(key)) continue;
      const event = `filecomplete-image-${key}`;
      const callback = () => {
        this.assetReadyHandlers = this.assetReadyHandlers.filter(handler => handler.callback !== callback);
        if (!this.canRefresh() || !scene.sys.isActive()) return;
        if (key === 'shop_icon') this.createShopIcon();
        else { this.apartmentSignature = null; this.refreshApartmentLocation(); }
      };
      scene.load.once(event, callback);
      this.assetReadyHandlers.push({ event, callback });
      scene.load.image(key, path);
      queued = true;
    }
    if (queued && !scene.load.isLoading()) scene.load.start();
  }

  createBackground() {
    this.background?.destroy();
    this.background = null;
    const scene = this.scene;
    const configured = scene.crimeCityConfig.backgroundKey || `${scene.cityId}_crime`;
    const key = scene.textures.exists(configured) ? configured : scene.cityId;
    if (!scene.textures.exists(key)) { scene.cameras.main.setBackgroundColor('#17202a'); return; }
    this.background = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, key)
      .setDisplaySize(scene.scale.width, scene.scale.height).setDepth(-10);
  }

  createHeader() {
    this.destroyObjects(this.headerObjects);
    const scene = this.scene;
    this.track(scene.add.rectangle(0, 0, scene.scale.width, 76, 0x000000, 0.5)
      .setOrigin(0).setDepth(20), this.headerObjects);
    this.track(scene.add.text(40, 18, `${scene.cityData.city}, ${scene.cityData.country}`, {
      fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffffff'
    }).setDepth(21), this.headerObjects);
    const artifact = gameState.currentMission?.artifact;
    let subtitle = 'Theory logged. Question the people with alibis.';
    if (scene.hasVisitedApartment()) {
      subtitle = 'Apartment visited. Take the recovered clues to the Crime Lab.';
    } else if (!scene.isCrimeSceneCompleted()) {
      subtitle = artifact
        ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!scene.isCrimeLabCompleted()) {
      subtitle = 'Evidence collected. Time to visit the Crime Lab.';
    } else if (!this.areSuspectFilesUnlocked()) {
      subtitle = 'Lab report ready. HQ is calling. Suspect files remain sealed.';
    } else if (!scene.isGridCompleted()) {
      subtitle = 'Suspect files unlocked. Reconstruct the theft.';
    }
    this.track(scene.add.text(40, 50, subtitle, {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#f1e6b8'
    }).setDepth(21), this.headerObjects);
  }

  createAvailableLocations({ crimeSceneCompleted, crimeLabCompleted, apartmentAvailable,
    apartmentVisited = this.scene.hasVisitedApartment() } = {}) {
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();
    this.apartmentAvailabilityHint = apartmentAvailable === true;
    this.apartmentSignature = null;
    if (!crimeSceneCompleted) this.createCrimeSceneIcon();
    if (this.areSuspectFilesUnlocked()) this.createSuspectsIcon();
    if (crimeSceneCompleted && (!crimeLabCompleted || apartmentVisited)) {
      this.createLabIcon({ apartmentEvidence: apartmentVisited });
    }
    this.createHotelIcon();
    this.createShopIcon();
    this.refreshApartmentLocation();
    this.ensureBuildingAssets();
  }

  startApartmentRefresh() { this.refreshApartmentLocation(); }

  getApartmentCandidates() {
    const suspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
    const suspectsById = new Map();
    const candidates = new Map();
    for (const suspect of suspects) {
      if (!suspect?.id) continue;
      suspectsById.set(suspect.id, suspect);
      if (this.scene.isAlibiDebunked?.(suspect.id)) candidates.set(suspect.id, suspect);
    }
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    if (Array.isArray(debunked)) {
      for (const id of debunked) {
        if (typeof id !== 'string' || !id || candidates.has(id) || !this.scene.isAlibiDebunked?.(id)) continue;
        candidates.set(id, suspectsById.get(id) || { id });
      }
    }
    return [...candidates.values()];
  }

  getSuspectLabel(suspect) { return suspect?.name || 'Unidentified suspect'; }

  refreshApartmentLocation(availabilityHint) {
    if (!this.canRefresh()) return;
    if (typeof availabilityHint === 'boolean') this.apartmentAvailabilityHint = availabilityHint;
    const candidates = this.getApartmentCandidates();
    const available = this.apartmentAvailabilityHint || candidates.length > 0 || this.scene.hasAnyDebunkedAlibi?.() === true;
    const signature = JSON.stringify([available, candidates.map(suspect => [suspect.id, this.getSuspectLabel(suspect)])]);
    if (signature === this.apartmentSignature) { this.refreshCostLabels(); return; }
    this.apartmentSignature = signature;
    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();
    if (available) this.createApartmentIcon(candidates);
  }

  createShopIcon() {
    this.destroyObjects(this.shopObjects);
    const position = this.scene.crimeCityConfig.shop || {
      x: this.scene.scale.width * 0.82, y: this.scene.scale.height * 0.3
    };
    return this.createMapIcon({
      ...position, textureKey: 'shop_icon', label: 'Shop',
      fallbackColor: 0x806127, fallbackStroke: 0xffd166,
      collection: this.shopObjects, onClick: () => this.scene.visitShop()
    });
  }

  createApartmentIcon(candidates) {
    const position = this.scene.crimeCityConfig.apartment || {
      x: this.scene.scale.width / 2, y: this.scene.scale.height - 180
    };
    this.createMapIcon({
      ...position, textureKey: 'apt_icon', costNodeId: 'apartment',
      label: candidates.length > 1 ? `Suspect Apartments (${candidates.length})` : 'Suspect Apartment',
      fallbackColor: 0x795548, fallbackStroke: 0xffd180,
      collection: this.apartmentObjects, onClick: () => this.openApartmentSelection()
    });
    this.createStatusBadge(position.x, position.y - BADGE_OFFSET,
      'Alibi disproved', '#ffd180', this.apartmentObjects);
  }

  openApartmentSelection() {
    const scene = this.scene;
    if (!scene || scene.isTransitioning || scene.isVisitingApartment || scene._cleanupDone) return;
    const candidates = this.getApartmentCandidates();
    if (!candidates.length) {
      scene.showMessage('An alibi has been disproved, but the suspect ID is missing.\nThe paperwork has escaped before the suspect.', 3000, '#5d2a00');
      return;
    }
    if (candidates.length === 1) { scene.visitApartment(candidates[0].id); return; }
    this.closeApartmentSelection();
    scene.closeAllUIPanels();
    const { width, height } = scene.scale;
    const panelWidth = Math.min(520, width - 32);
    const rowHeight = Math.min(48, Math.max(28, (height - 220) / candidates.length));
    const panelHeight = 150 + candidates.length * rowHeight;
    const top = (height - panelHeight) / 2;
    const blocker = this.track(scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(100).setInteractive(), this.selectionObjects);
    blocker.on('pointerdown', () => this.closeApartmentSelection());
    this.track(scene.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x17202a, 1)
      .setStrokeStyle(2, 0xffd180).setDepth(101).setInteractive(), this.selectionObjects);
    this.track(scene.add.text(width / 2, top + 24, 'Choose an apartment', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#ffd180'
    }).setOrigin(0.5, 0).setDepth(102), this.selectionObjects);
    candidates.forEach((suspect, index) => {
      const button = this.track(scene.add.text(width / 2, top + 88 + index * rowHeight, this.getSuspectLabel(suspect), {
        fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff',
        backgroundColor: '#304c73', padding: { x: 14, y: 6 },
        wordWrap: { width: panelWidth - 64 }, align: 'center'
      }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }), this.selectionObjects);
      button.on('pointerover', () => button.setColor('#ffe066'));
      button.on('pointerout', () => button.setColor('#ffffff'));
      button.on('pointerdown', () => { this.closeApartmentSelection(); scene.visitApartment(suspect.id); });
    });
    const cancel = this.track(scene.add.text(width / 2, top + panelHeight - 30, 'Cancel', {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#cccccc'
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }), this.selectionObjects);
    cancel.on('pointerdown', () => this.closeApartmentSelection());
  }

  closeApartmentSelection() { this.destroyObjects(this.selectionObjects); }

  createHotelIcon() {
    const scene = this.scene;
    const position = scene.crimeCityConfig.hotel;
    if (!position) return;
    this.createMapIcon({
      ...position, textureKey: 'hotel_icon', fallbackColor: 0x6a4c93,
      fallbackStroke: 0xd6b4ff, label: 'Hotel',
      onClick: () => {
        scene.closeAllUIPanels();
        scene.transitionTo('HotelScene', {
          cityId: scene.cityId, city: scene.cityData.city, country: scene.cityData.country,
          returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }, sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createSuspectsIcon() {
    if (!this.areSuspectFilesUnlocked()) return;
    const scene = this.scene;
    const position = scene.crimeCityConfig.suspectBoard || { x: scene.scale.width - 150, y: scene.scale.height - 180 };
    const suspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
    const activeCount = suspects.filter(suspect => !suspect?.deductionState?.eliminated).length;
    this.createMapIcon({
      ...position, textureKey: 'policja', fallbackColor: 0x304c73, fallbackStroke: 0x9ac7ff,
      label: suspects.length ? `Suspect Files (${activeCount}/${suspects.length})` : 'Suspect Files',
      onClick: () => {
        if (!this.areSuspectFilesUnlocked()) return;
        const currentSuspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
        if (!currentSuspects.length) {
          scene.showMessage('No suspect files available yet.\nThis is either bureaucratic delay or a pigeon conspiracy.', 3000, '#5d2a00');
          return;
        }
        scene.closeAllUIPanels();
        scene.transitionTo('SuspectsScene', {
          cityId: scene.cityId, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId },
          sourceScene: 'CrimeCityScene', caseSuspects: currentSuspects,
          identityEvidence: gameState.identityEvidence, identityEvidenceResult: gameState.identityEvidenceResult,
          hypothesisEvidence: gameState.hypothesisEvidence, hypothesisEvidenceResult: gameState.hypothesisEvidenceResult,
          forensicResults: gameState.forensicResults || [], gameState
        });
      }
    });
  }

  createCrimeSceneIcon() {
    const position = this.scene.crimeCityConfig.crimeScene;
    if (!position) return;
    this.createMapIcon({
      ...position, textureKey: 'search', label: 'Crime Scene', costNodeId: 'crime_scene',
      fallbackColor: 0xd4af37, fallbackStroke: 0xfff1a8, onClick: () => this.scene.openCrimeScene()
    });
  }

  createLabIcon({ apartmentEvidence = this.scene.hasVisitedApartment() } = {}) {
    const scene = this.scene;
    const position = scene.crimeCityConfig.crimeLab;
    if (!position || !scene.isCrimeSceneCompleted()) return;
    const entryPaid = scene.hasPaidCrimeLabEntry();
    const label = apartmentEvidence ? 'Crime Lab — Apartment Evidence'
      : entryPaid ? 'Crime Lab — Analysis in Progress' : 'Crime Lab';
    const result = this.createMapIcon({
      ...position, textureKey: 'crime_lab', fallbackColor: 0x1565c0,
      fallbackStroke: 0x7fc8f8, label, costNodeId: 'crime_lab', onClick: () => scene.openCrimeLab()
    });
    if (apartmentEvidence) this.createStatusBadge(position.x, position.y - BADGE_OFFSET,
      'Examine apartment clues', '#8ed1fc');
    return result;
  }

  createMapIcon({
    x, y, textureKey, fallbackColor = 0x37474f, fallbackStroke = 0xffd166,
    label, completed = false, onClick, collection = this.locationObjects, costNodeId = null
  }) {
    const scene = this.scene;
    const hasTexture = scene.textures.exists(textureKey);
    const icon = hasTexture ? scene.add.image(x, y, textureKey)
      : scene.add.circle(x, y, ICON_SIZE / 2, fallbackColor, 0.95).setStrokeStyle(3, fallbackStroke);
    const baseScale = hasTexture ? ICON_SIZE / Math.max(icon.width, icon.height, 1) : 1;
    icon.setScale(baseScale).setDepth(5);
    const content = costNodeId ? this.getLocationCostLabel(label, costNodeId) : label;
    const labelObject = scene.add.text(x, y + LABEL_OFFSET, content, {
      fontFamily: 'SpecialElite', fontSize: costNodeId ? '15px' : '18px',
      color: completed ? '#aaaaaa' : '#ffffff', backgroundColor: '#000000aa',
      padding: { x: 7, y: 4 }, align: 'center',
      wordWrap: { width: costNodeId
        ? Math.min(220, scene.scale.width * 0.22)
        : Math.min(200, scene.scale.width * 0.18), useAdvancedWrap: true }
    }).setOrigin(0.5, 0).setDepth(6);
    this.track(icon, collection);
    this.track(labelObject, collection);
    if (costNodeId) {
      const entry = { label: labelObject, title: label, nodeId: costNodeId, x, y };
      this.costLabels.push(entry);
      this.positionCostLabel(entry);
    }
    if (completed) {
      icon.setAlpha(0.58);
      if (hasTexture) icon.setTint(0xaaaaaa);
      this.createStatusBadge(x, y - BADGE_OFFSET, 'Completed', '#66bb6a', collection);
    }
    if (typeof onClick === 'function') {
      icon.setInteractive({ useHandCursor: true });
      this.registerInteractive(icon);
      icon.on('pointerover', () => {
        if (!completed) icon.setScale(baseScale * 1.1);
        labelObject.setColor(completed ? '#cccccc' : '#ffe066');
        if (costNodeId) this.refreshCostLabels();
      });
      icon.on('pointerout', () => {
        icon.setScale(baseScale);
        labelObject.setColor(completed ? '#aaaaaa' : '#ffffff');
      });
      icon.on('pointerdown', pointer => {
        if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
        if (!this.scene || this.selectionObjects.length || this.scene.isTransitioning || this.scene._cleanupDone) return;
        onClick();
      });
    }
    return { icon, label: labelObject };
  }

  createStatusBadge(x, y, text, color, collection = this.locationObjects) {
    const badge = this.scene.add.text(x, y, text, {
      fontFamily: 'SpecialElite', fontSize: '13px', color,
      backgroundColor: '#000000cc', padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(7);
    this.track(badge, collection);
    return badge;
  }

  destroy() {
    if (!this.scene) return;
    const scene = this.scene;
    scene.events.off('shutdown', this.handleShutdown);
    this.costEvents.forEach(event => EventBus.off(event, this.handleCostChange));
    for (const { event, callback } of this.assetReadyHandlers) scene.load.off(event, callback);
    this.assetReadyHandlers = [];
    this.closeApartmentSelection();
    this.destroyObjects(this.apartmentObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.headerObjects);
    this.background?.destroy();
    this.background = null;
    this.costLabels = [];
    this.apartmentSignature = null;
    this.apartmentAvailabilityHint = false;
    this.scene = null;
  }
}
