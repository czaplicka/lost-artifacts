// scenes/crimeCity/CrimeCityMapUI.js
import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';

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
    this.apartmentAvailabilityHint = false;

    this.assetsRequested = false;
    this.assetReadyHandlers = [];
    this.pendingAssetKeys = new Set();

    this.apartmentRefreshStarted = false;

    this.handleShutdown = () => this.destroy();
    this.handleSceneReturn = () => this.onSceneReturn();

    scene.events.once('shutdown', this.handleShutdown);
    scene.events.on('resume', this.handleSceneReturn);
    scene.events.on('wake', this.handleSceneReturn);
  }

  track(object, collection) {
    if (object) collection.push(object);
    return object;
  }

  registerInteractive(object) {
    const scene = this.scene;

    if (!scene || !object) return;

    if (!Array.isArray(scene.interactiveObjects)) {
      scene.interactiveObjects = [];
    }

    if (!scene.interactiveObjects.includes(object)) {
      scene.interactiveObjects.push(object);
    }
  }

  destroyObjects(collection) {
    const objects = collection.splice(0);

    if (Array.isArray(this.scene?.interactiveObjects)) {
      const removing = new Set(objects);

      this.scene.interactiveObjects =
        this.scene.interactiveObjects.filter(
          object => !removing.has(object)
        );
    }

    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  canRefresh() {
    return Boolean(this.scene && !this.scene._cleanupDone);
  }

  onSceneReturn() {
    if (!this.canRefresh()) return;

    this.flushPendingAssets();

    if (this.apartmentRefreshStarted) {
      this.refreshApartmentLocation();
    }
  }

  ensureBuildingAssets() {
    if (this.assetsRequested || !this.canRefresh()) return;

    this.assetsRequested = true;

    const scene = this.scene;
    let queued = false;

    const assets = [
      ['shop_icon', 'assets/shop.png'],
      ['apt_icon', 'assets/apt.png']
    ];

    for (const [key, path] of assets) {
      if (scene.textures.exists(key)) continue;

      const event = `filecomplete-image-${key}`;

      const callback = () => {
        if (!this.canRefresh()) return;

        this.pendingAssetKeys.add(key);

        if (scene.sys.isActive()) {
          this.flushPendingAssets();
        }
      };

      scene.load.once(event, callback);
      this.assetReadyHandlers.push({ event, callback });

      scene.load.image(key, path);
      queued = true;
    }

    if (queued && !scene.load.isLoading()) {
      scene.load.start();
    }
  }

  flushPendingAssets() {
    if (!this.canRefresh() || !this.pendingAssetKeys.size) {
      return;
    }

    const refreshShop = this.pendingAssetKeys.has('shop_icon');
    const refreshApartment = this.pendingAssetKeys.has('apt_icon');

    this.pendingAssetKeys.clear();

    if (refreshShop) {
      this.createShopIcon();
    }

    if (refreshApartment) {
      this.apartmentSignature = null;
      this.refreshApartmentLocation();
    }
  }

  createBackground() {
    this.background?.destroy();
    this.background = null;

    const scene = this.scene;

    const configured =
      scene.crimeCityConfig.backgroundKey ||
      `${scene.cityId}_crime`;

    const key = scene.textures.exists(configured)
      ? configured
      : scene.cityId;

    if (!scene.textures.exists(key)) {
      scene.cameras.main.setBackgroundColor('#17202a');
      return;
    }

    this.background = scene.add.image(
      scene.scale.width / 2,
      scene.scale.height / 2,
      key
    )
      .setDisplaySize(scene.scale.width, scene.scale.height)
      .setDepth(-10);
  }

  createHeader() {
    this.destroyObjects(this.headerObjects);

    const scene = this.scene;

    this.track(
      scene.add.rectangle(
        0,
        0,
        scene.scale.width,
        76,
        0x000000,
        0.5
      ).setOrigin(0).setDepth(20),
      this.headerObjects
    );

    this.track(
      scene.add.text(
        40,
        18,
        `${scene.cityData.city}, ${scene.cityData.country}`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '28px',
          color: '#ffffff'
        }
      ).setDepth(21),
      this.headerObjects
    );

    const artifact = gameState.currentMission?.artifact;

    let subtitle = 'Theory logged. Question the people with alibis.';

    if (!scene.isCrimeSceneCompleted()) {
      subtitle = artifact
        ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!scene.isCrimeLabCompleted()) {
      subtitle = 'Evidence collected. Time to visit the Crime Lab.';
    } else if (!scene.isGridCompleted()) {
      subtitle = 'Lab report ready. Answer HQ and reconstruct the theft.';
    }

    this.track(
      scene.add.text(40, 50, subtitle, {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#f1e6b8'
      }).setDepth(21),
      this.headerObjects
    );
  }

  createAvailableLocations({
    crimeSceneCompleted,
    crimeLabCompleted,
    apartmentAvailable
  } = {}) {
    this.ensureBuildingAssets();

    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();

    if (crimeSceneCompleted) {
      this.createSuspectsIcon();
    } else {
      this.createCrimeSceneIcon();
    }

    if (crimeSceneCompleted && !crimeLabCompleted) {
      this.createLabIcon();
    }

    this.createHotelIcon();
    this.createShopIcon();

    this.apartmentAvailabilityHint = apartmentAvailable === true;
    this.apartmentSignature = null;

    this.refreshApartmentLocation();
  }

  startApartmentRefresh() {
    if (!this.canRefresh() || this.apartmentRefreshStarted) {
      return;
    }

    this.apartmentRefreshStarted = true;
    this.refreshApartmentLocation();
  }

  getApartmentCandidates() {
    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];

    const suspectsById = new Map();
    const candidates = new Map();

    for (const suspect of suspects) {
      if (!suspect?.id) continue;

      suspectsById.set(suspect.id, suspect);

      if (this.scene.isAlibiDebunked?.(suspect.id)) {
        candidates.set(suspect.id, suspect);
      }
    }

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    if (Array.isArray(debunked)) {
      for (const id of debunked) {
        if (
          typeof id !== 'string' ||
          !id ||
          candidates.has(id) ||
          !this.scene.isAlibiDebunked?.(id)
        ) {
          continue;
        }

        candidates.set(id, suspectsById.get(id) || { id });
      }
    }

    return [...candidates.values()];
  }

  getSuspectLabel(suspect) {
    return suspect?.name || 'Unidentified suspect';
  }

  refreshApartmentLocation(availabilityHint) {
    if (!this.canRefresh()) return;

    if (typeof availabilityHint === 'boolean') {
      this.apartmentAvailabilityHint = availabilityHint;
    }

    const candidates = this.getApartmentCandidates();

    const available =
      this.apartmentAvailabilityHint ||
      candidates.length > 0 ||
      this.scene.hasAnyDebunkedAlibi?.() === true;

    const signature = JSON.stringify([
      available,
      candidates.map(suspect => [
        suspect.id,
        this.getSuspectLabel(suspect)
      ])
    ]);

    if (signature === this.apartmentSignature) return;

    this.apartmentSignature = signature;

    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();

    if (available) {
      this.createApartmentIcon(candidates);
    }
  }

  createShopIcon() {
    this.destroyObjects(this.shopObjects);

    const position = this.scene.crimeCityConfig.shop || {
      x: this.scene.scale.width * 0.82,
      y: this.scene.scale.height * 0.3
    };

    return this.createMapIcon({
      ...position,
      textureKey: 'shop_icon',
      label: 'Shop',
      fallbackColor: 0x806127,
      fallbackStroke: 0xffd166,
      collection: this.shopObjects,
      onClick: () => this.scene.visitShop()
    });
  }

  createApartmentIcon(candidates) {
    const position = this.scene.crimeCityConfig.apartment || {
      x: this.scene.scale.width / 2,
      y: this.scene.scale.height - 180
    };

    this.createMapIcon({
      ...position,
      textureKey: 'apt_icon',
      label: candidates.length > 1
        ? `Suspect Apartments (${candidates.length})`
        : 'Suspect Apartment',
      fallbackColor: 0x795548,
      fallbackStroke: 0xffd180,
      collection: this.apartmentObjects,
      onClick: () => this.openApartmentSelection()
    });

    this.createStatusBadge(
      position.x,
      position.y - BADGE_OFFSET,
      'Alibi disproved',
      '#ffd180',
      this.apartmentObjects
    );
  }

  openApartmentSelection() {
    const scene = this.scene;

    if (
      !scene ||
      scene.isTransitioning ||
      scene.isVisitingApartment ||
      scene._cleanupDone
    ) {
      return;
    }

    const candidates = this.getApartmentCandidates();

    if (!candidates.length) {
      scene.showMessage(
        'An alibi has been disproved, but the suspect ID is missing.\nThe paperwork has escaped before the suspect.',
        3000,
        '#5d2a00'
      );
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

    const rowHeight = Math.min(
      48,
      Math.max(28, (height - 220) / candidates.length)
    );

    const panelHeight = 150 + candidates.length * rowHeight;
    const top = (height - panelHeight) / 2;

    const blocker = this.track(
      scene.add.rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.7
      ).setDepth(100).setInteractive(),
      this.selectionObjects
    );

    blocker.on('pointerdown', () => {
      this.closeApartmentSelection();
    });

    this.track(
      scene.add.rectangle(
        width / 2,
        height / 2,
        panelWidth,
        panelHeight,
        0x17202a,
        1
      )
        .setStrokeStyle(2, 0xffd180)
        .setDepth(101)
        .setInteractive(),
      this.selectionObjects
    );

    this.track(
      scene.add.text(
        width / 2,
        top + 24,
        'Choose an apartment',
        {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#ffd180'
        }
      ).setOrigin(0.5, 0).setDepth(102),
      this.selectionObjects
    );

    candidates.forEach((suspect, index) => {
      const button = this.track(
        scene.add.text(
          width / 2,
          top + 88 + index * rowHeight,
          this.getSuspectLabel(suspect),
          {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#304c73',
            padding: { x: 14, y: 6 },
            wordWrap: { width: panelWidth - 64 },
            align: 'center'
          }
        )
          .setOrigin(0.5)
          .setDepth(102)
          .setInteractive({ useHandCursor: true }),
        this.selectionObjects
      );

      button.on('pointerover', () => {
        button.setColor('#ffe066');
      });

      button.on('pointerout', () => {
        button.setColor('#ffffff');
      });

      button.on('pointerdown', () => {
        this.closeApartmentSelection();
        scene.visitApartment(suspect.id);
      });
    });

    const cancel = this.track(
      scene.add.text(
        width / 2,
        top + panelHeight - 30,
        'Cancel',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#cccccc'
        }
      )
        .setOrigin(0.5)
        .setDepth(102)
        .setInteractive({ useHandCursor: true }),
      this.selectionObjects
    );

    cancel.on('pointerdown', () => {
      this.closeApartmentSelection();
    });
  }

  closeApartmentSelection() {
    this.destroyObjects(this.selectionObjects);
  }

  createHotelIcon() {
    const scene = this.scene;
    const position = scene.crimeCityConfig.hotel;

    if (!position) return;

    this.createMapIcon({
      ...position,
      textureKey: 'hotel_icon',
      fallbackColor: 0x6a4c93,
      fallbackStroke: 0xd6b4ff,
      label: 'Hotel',
      onClick: () => {
        scene.closeAllUIPanels();

        scene.transitionTo('HotelScene', {
          cityId: scene.cityId,
          city: scene.cityData.city,
          country: scene.cityData.country,
          returnScene: 'CrimeCityScene',
          returnData: { cityId: scene.cityId },
          sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createSuspectsIcon() {
    const scene = this.scene;

    const position = scene.crimeCityConfig.suspectBoard || {
      x: scene.scale.width - 150,
      y: scene.scale.height - 180
    };

    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];

    const activeCount = suspects.filter(
      suspect => !suspect?.deductionState?.eliminated
    ).length;

    this.createMapIcon({
      ...position,
      textureKey: 'policja',
      fallbackColor: 0x304c73,
      fallbackStroke: 0x9ac7ff,
      label: suspects.length
        ? `Suspect Files (${activeCount}/${suspects.length})`
        : 'Suspect Files',
      onClick: () => {
        const currentSuspects = Array.isArray(gameState.caseSuspects)
          ? gameState.caseSuspects
          : [];

        if (!currentSuspects.length) {
          scene.showMessage(
            'No suspects yet. Check the crime scene.\nThis is either bureaucratic delay or a pigeon conspiracy.',
            3000,
            '#5d2a00'
          );
          return;
        }

        scene.closeAllUIPanels();

        scene.transitionTo('SuspectBoardScene', {
          cityId: scene.cityId,
          returnScene: 'CrimeCityScene',
          returnData: { cityId: scene.cityId },
          sourceScene: 'CrimeCityScene',
          caseSuspects: currentSuspects,
          identityEvidence: gameState.identityEvidence,
          identityEvidenceResult: gameState.identityEvidenceResult,
          hypothesisEvidence: gameState.hypothesisEvidence,
          hypothesisEvidenceResult: gameState.hypothesisEvidenceResult,
          forensicResults: gameState.forensicResults || [],
          gameState
        });
      }
    });
  }

  createCrimeSceneIcon() {
    const position = this.scene.crimeCityConfig.crimeScene;

    if (!position) return;

    this.createMapIcon({
      ...position,
      textureKey: 'search',
      label: 'Crime Scene',
      fallbackColor: 0xd4af37,
      fallbackStroke: 0xfff1a8,
      onClick: () => this.scene.openCrimeScene()
    });
  }

  createLabIcon() {
    const scene = this.scene;
    const position = scene.crimeCityConfig.crimeLab;

    if (!position || !scene.isCrimeSceneCompleted()) return;

    const entryPaid = scene.hasPaidCrimeLabEntry();
    const activityCost = getEnergyManager().getActivityCost('csi_lab');

    this.createMapIcon({
      ...position,
      textureKey: 'crime_lab',
      fallbackColor: 0x1565c0,
      fallbackStroke: 0x7fc8f8,
      label: entryPaid
        ? 'Crime Lab — Analysis in Progress'
        : `Crime Lab — ${activityCost} Energy`,
      onClick: () => scene.openCrimeLab()
    });
  }

  createMapIcon({
    x,
    y,
    textureKey,
    fallbackColor = 0x37474f,
    fallbackStroke = 0xffd166,
    label,
    completed = false,
    onClick,
    collection = this.locationObjects
  }) {
    const scene = this.scene;
    const hasTexture = scene.textures.exists(textureKey);

    const icon = hasTexture
      ? scene.add.image(x, y, textureKey)
      : scene.add.circle(
          x,
          y,
          ICON_SIZE / 2,
          fallbackColor,
          0.95
        ).setStrokeStyle(3, fallbackStroke);

    const baseScale = hasTexture
      ? ICON_SIZE / Math.max(icon.width, icon.height, 1)
      : 1;

    icon.setScale(baseScale).setDepth(5);

    const labelObject = scene.add.text(
      x,
      y + LABEL_OFFSET,
      label,
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: completed ? '#aaaaaa' : '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 7, y: 4 },
        align: 'center',
        wordWrap: {
          width: Math.min(200, scene.scale.width * 0.18),
          useAdvancedWrap: true
        }
      }
    ).setOrigin(0.5, 0).setDepth(6);

    this.track(icon, collection);
    this.track(labelObject, collection);

    if (completed) {
      icon.setAlpha(0.58);

      if (hasTexture) {
        icon.setTint(0xaaaaaa);
      }

      this.createStatusBadge(
        x,
        y - BADGE_OFFSET,
        'Completed',
        '#66bb6a',
        collection
      );
    }

    if (typeof onClick === 'function') {
      icon.setInteractive({ useHandCursor: true });
      this.registerInteractive(icon);

      icon.on('pointerover', () => {
        if (!completed) {
          icon.setScale(baseScale * 1.1);
        }

        labelObject.setColor(
          completed ? '#cccccc' : '#ffe066'
        );
      });

      icon.on('pointerout', () => {
        icon.setScale(baseScale);

        labelObject.setColor(
          completed ? '#aaaaaa' : '#ffffff'
        );
      });

      icon.on('pointerdown', pointer => {
        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        if (
          !this.scene ||
          this.selectionObjects.length ||
          this.scene.isTransitioning ||
          this.scene._cleanupDone
        ) {
          return;
        }

        onClick();
      });
    }

    return { icon, label: labelObject };
  }

  createStatusBadge(
    x,
    y,
    text,
    color,
    collection = this.locationObjects
  ) {
    const badge = this.scene.add.text(x, y, text, {
      fontFamily: 'SpecialElite',
      fontSize: '13px',
      color,
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5).setDepth(7);

    this.track(badge, collection);

    return badge;
  }

  destroy() {
    if (!this.scene) return;

    const scene = this.scene;

    scene.events.off('shutdown', this.handleShutdown);
    scene.events.off('resume', this.handleSceneReturn);
    scene.events.off('wake', this.handleSceneReturn);

    for (const { event, callback } of this.assetReadyHandlers) {
      scene.load.off(event, callback);
    }

    this.assetReadyHandlers = [];
    this.pendingAssetKeys.clear();
    this.apartmentRefreshStarted = false;

    this.closeApartmentSelection();
    this.destroyObjects(this.apartmentObjects);
    this.destroyObjects(this.shopObjects);
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.headerObjects);

    this.background?.destroy();
    this.background = null;
    this.apartmentSignature = null;
    this.scene = null;
  }
}