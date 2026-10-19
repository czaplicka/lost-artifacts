// scenes/crimeCity/CrimeCityMapUI.js
import { gameState } from '../../GameData.js';


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
    this.apartmentSignature = null;
    this.refreshTimer = null;
    this.assetsRequested = false;
    this.assetReadyHandlers = [];
    this.handleShutdown = () => this.destroy();
    scene.events.once('shutdown', this.handleShutdown);
  }


  track(object, collection) {
    if (object) collection.push(object);
    return object;
  }


  destroyObjects(collection) {
    const objects = collection.splice(0);
    if (this.scene?.interactiveObjects) {
      const removing = new Set(objects);
      this.scene.interactiveObjects = this.scene.interactiveObjects.filter(object => !removing.has(object));
    }
    objects.forEach(object => {
      object?.removeAllListeners?.();
      object?.destroy?.();
    });
  }


  ensureBuildingAssets() {
    if (this.assetsRequested) return;
    this.assetsRequested = true;
    const scene = this.scene;
    let queued = false;
    for (const [key, path] of [['shop_icon', 'assets/shop.png'], ['apt_icon', 'assets/apt.png']]) {
      if (scene.textures.exists(key)) continue;
      const event = `filecomplete-image-${key}`;
      const callback = () => {
        if (!this.scene || scene._cleanupDone || !scene.sys.isActive()) return;
        if (key === 'shop_icon') this.createShopIcon();
        else {
          this.apartmentSignature = null;
          this.refreshApartmentLocation();
        }
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
    if (!scene.textures.exists(key)) {
      scene.cameras.main.setBackgroundColor('#17202a');
      return;
    }
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
    if (!scene.isCrimeSceneCompleted()) {
      subtitle = artifact ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!scene.isCrimeLabCompleted()) subtitle = 'Evidence collected. Time to visit the Crime Lab.';
    else if (!scene.isGridCompleted()) subtitle = 'Lab report ready. Answer HQ and reconstruct the theft.';
    this.track(scene.add.text(40, 50, subtitle, {
      fontFamily: 'SpecialElite', fontSize: '16px', color: '#f1e6b8'
    }).setDepth(21), this.headerObjects);
  }


  createAvailableLocations({ crimeSceneCompleted, crimeLabCompleted, apartmentAvailable } = {}) {
    this.ensureBuildingAssets();
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();
    if (crimeSceneCompleted) this.createSuspectsIcon();
    else this.createCrimeSceneIcon();
    if (crimeSceneCompleted && !crimeLabCompleted) this.createLabIcon();
    this.createHotelIcon();
    this.createShopIcon();
    this.apartmentSignature = null;
    this.refreshApartmentLocation(apartmentAvailable);
  }


  startApartmentRefresh() {
    if (this.refreshTimer) return;
    this.refreshTimer = this.scene.time.addEvent({
      delay: 500, loop: true, callback: () => this.refreshApartmentLocation()
    });
  }


  getApartmentCandidates() {
    const suspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
    const candidates = new Map();
    for (const suspect of suspects) {
      if (suspect?.id && this.scene.isAlibiDebunked?.(suspect.id)) candidates.set(suspect.id, suspect);
    }
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    if (Array.isArray(debunked)) {
      for (const id of debunked) {
        if (typeof id !== 'string' || !id || !this.scene.isAlibiDebunked?.(id)) continue;
        if (!candidates.has(id)) candidates.set(id, suspects.find(suspect => suspect?.id === id) || { id });
      }
    }
    return [...candidates.values()];
  }


  getSuspectLabel(suspect) { return suspect?.name || 'Unidentified suspect'; }


  refreshApartmentLocation(availabilityHint) {
    if (!this.scene || this.scene._cleanupDone) return;
    const candidates = this.getApartmentCandidates();
    const available = availabilityHint === true || candidates.length > 0 || this.scene.hasAnyDebunkedAlibi?.() === true;
    // Prosty ciąg znaków zamiast JSON.stringify: ta funkcja działa co 500 ms.
    const signature = `${available ? 1 : 0}|` +
      candidates.map(suspect => `${suspect.id}:${this.getSuspectLabel(suspect)}`).join('|');
    if (signature === this.apartmentSignature) return;
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
      ...position, textureKey: 'apt_icon',
      label: candidates.length > 1 ? `Suspect Apartments (${candidates.length})` : 'Suspect Apartment',
      fallbackColor: 0x795548, fallbackStroke: 0xffd180,
      collection: this.apartmentObjects, onClick: () => this.openApartmentSelection()
    });
    this.createStatusBadge(position.x, position.y - BADGE_OFFSET, 'Alibi disproved', '#ffd180', this.apartmentObjects);
  }


  openApartmentSelection() {
    const scene = this.scene;
    if (!scene || scene.isTransitioning || scene.isVisitingApartment || scene._cleanupDone) return;
    const candidates = this.getApartmentCandidates();
    if (!candidates.length) {
      scene.showMessage('An alibi has been disproved, but the suspect ID is missing.\nThe paperwork has escaped before the suspect.', 3000, '#5d2a00');
      return;
    }
    if (candidates.length === 1) {
      scene.visitApartment(candidates[0].id);
      return;
    }
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
        fontFamily: 'SpecialElite', fontSize: '18px', color: '#ffffff', backgroundColor: '#304c73',
        padding: { x: 14, y: 6 }, wordWrap: { width: panelWidth - 64 }, align: 'center'
      }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }), this.selectionObjects);
      button.on('pointerover', () => button.setColor('#ffe066'));
      button.on('pointerout', () => button.setColor('#ffffff'));
      button.on('pointerdown', () => {
        this.closeApartmentSelection();
        scene.visitApartment(suspect.id);
      });
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
      ...position, textureKey: 'hotel_icon', fallbackColor: 0x6a4c93, fallbackStroke: 0xd6b4ff,
      label: 'Hotel', onClick: () => {
        scene.closeAllUIPanels();
        scene.transitionTo('HotelScene', {
          cityId: scene.cityId, city: scene.cityData.city, country: scene.cityData.country,
          returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }, sourceScene: 'CrimeCityScene'
        });
      }
    });
  }


  createSuspectsIcon() {
    const scene = this.scene;
    const position = scene.crimeCityConfig.suspectBoard || { x: scene.scale.width - 150, y: scene.scale.height - 180 };
    const suspects = Array.isArray(gameState.caseSuspects) ? gameState.caseSuspects : [];
    const activeCount = suspects.filter(suspect => !suspect?.deductionState?.eliminated).length;
    this.createMapIcon({
      ...position, textureKey: 'policja', fallbackColor: 0x304c73, fallbackStroke: 0x9ac7ff,
      label: suspects.length ? `Suspect Files (${activeCount}/${suspects.length})` : 'Suspect Files',
      onClick: () => {
        if (!suspects.length) {
          scene.showMessage('No suspects yet. Check the crime scene.\nThis is either bureaucratic delay or a pigeon conspiracy.', 3000, '#5d2a00');
          return;
        }
        scene.closeAllUIPanels();
        scene.transitionTo('SuspectBoardScene', {
          cityId: scene.cityId, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId },
          sourceScene: 'CrimeCityScene', caseSuspects: gameState.caseSuspects,
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
      ...position, textureKey: 'search', label: 'Crime Scene',
      fallbackColor: 0xd4af37, fallbackStroke: 0xfff1a8,
      onClick: () => this.scene.openCrimeScene()
    });
  }


  createLabIcon() {
    const scene = this.scene;
    const position = scene.crimeCityConfig.crimeLab;
    if (!position || !scene.isCrimeSceneCompleted()) return;
    this.createMapIcon({
      ...position, textureKey: 'crime_lab', fallbackColor: 0x1565c0, fallbackStroke: 0x7fc8f8,
      label: scene.hasPaidCrimeLabEntry() ? 'Crime Lab — Analysis in Progress' : 'Crime Lab — 12 Energy',
      onClick: () => {
        if (!scene.moveToCrimeCityNode('crime_lab') || !scene.payCrimeLabEntryOnce()) return;
        scene.closeAllUIPanels();
        scene.transitionTo('CrimeLabScene', {
          cityId: scene.cityId, caseKey: scene.getCaseKey(), returnScene: 'CrimeCityScene',
          returnData: { cityId: scene.cityId }, sourceScene: 'CrimeCityScene'
        });
      }
    });
  }


  createHypothesisCompleteMarker() {
    const position = this.scene.crimeCityConfig.hypothesis;
    if (position) this.createCompletedMarker(position.x, position.y, 'Theory Complete', 'Profile Ready');
  }


  createMapIcon({ x, y, textureKey, fallbackColor = 0x37474f,
    fallbackStroke = 0xffd166, label, completed = false,
    onClick, collection = this.locationObjects }) {
    const hasTexture = this.scene.textures.exists(textureKey);
    const icon = hasTexture ? this.scene.add.image(x, y, textureKey)
      : this.scene.add.circle(x, y, ICON_SIZE / 2, fallbackColor, 0.95).setStrokeStyle(3, fallbackStroke);
    const baseScale = hasTexture ? ICON_SIZE / Math.max(icon.width, icon.height, 1) : 1;
    icon.setScale(baseScale).setDepth(5).setInteractive({ useHandCursor: true });
    const labelObject = this.scene.add.text(x, y + LABEL_OFFSET, label, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: completed ? '#aaaaaa' : '#ffffff',
      backgroundColor: '#000000aa', padding: { x: 7, y: 4 }, align: 'center',
      wordWrap: { width: Math.min(200, this.scene.scale.width * 0.18), useAdvancedWrap: true }
    }).setOrigin(0.5, 0).setDepth(6);
    if (completed) {
      icon.setAlpha(0.58);
      if (hasTexture) icon.setTint(0xaaaaaa);
      this.createStatusBadge(x, y - BADGE_OFFSET, 'Completed', '#66bb6a', collection);
    }
    icon.on('pointerover', () => {
      if (!completed) icon.setScale(baseScale * 1.1);
      labelObject.setColor(completed ? '#cccccc' : '#ffe066');
    });
    icon.on('pointerout', () => {
      icon.setScale(baseScale);
      labelObject.setColor(completed ? '#aaaaaa' : '#ffffff');
    });
    if (typeof onClick === 'function') icon.on('pointerdown', pointer => {
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      if (this.selectionObjects.length || this.scene?.isTransitioning || this.scene?._cleanupDone) return;
      onClick();
    });
    this.scene.interactiveObjects.push(icon);
    this.track(icon, collection);
    this.track(labelObject, collection);
    return { icon, label: labelObject };
  }


  createCompletedMarker(x, y, label, status) {
    const marker = this.track(this.scene.add.circle(x, y, ICON_SIZE / 2, 0x37474f, 0.8)
      .setStrokeStyle(3, 0x66bb6a).setDepth(5), this.locationObjects);
    const checkmark = this.track(this.scene.add.text(x, y, '✓', {
      fontFamily: 'SpecialElite', fontSize: '42px', color: '#66bb6a'
    }).setOrigin(0.5).setDepth(6), this.locationObjects);
    const labelObject = this.track(this.scene.add.text(x, y + LABEL_OFFSET, label, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#aaaaaa',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 0).setDepth(6), this.locationObjects);
    this.createStatusBadge(x, y - BADGE_OFFSET, status, '#66bb6a');
    return { marker, checkmark, label: labelObject };
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
    this.scene.events.off('shutdown', this.handleShutdown);
    for (const { event, callback } of this.assetReadyHandlers) this.scene.load.off(event, callback);
    this.assetReadyHandlers = [];
    this.refreshTimer?.remove(false);
    this.refreshTimer = null;
    this.closeApartmentSelection();
    this.destroyObjects(this.apartmentObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.headerObjects);
    this.background?.destroy();
    this.background = null;
    this.scene = null;
  }
}