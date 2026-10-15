// scenes/crimeCity/CrimeCityMapUI.js
import { gameState } from '../../GameData.js';

export class CrimeCityMapUI {
  constructor(scene) {
    this.scene = scene;

    this.background = null;
    this.headerObjects = [];
    this.locationObjects = [];
    this.apartmentObjects = [];
    this.selectionObjects = [];

    this.apartmentSignature = null;
    this.refreshTimer = null;

    this.handleShutdown = () => this.destroy();

    this.scene.events.once('shutdown', this.handleShutdown);
  }

  track(object, collection) {
    if (object) {
      collection.push(object);
    }

    return object;
  }

  destroyObjects(collection) {
    const objects = collection.splice(0);

    if (this.scene?.interactiveObjects) {
      const removing = new Set(objects);

      this.scene.interactiveObjects =
        this.scene.interactiveObjects.filter(
          (object) => !removing.has(object)
        );
    }

    objects.forEach((object) => {
      object?.removeAllListeners?.();
      object?.destroy?.();
    });
  }

  createBackground() {
    this.background?.destroy();
    this.background = null;

    const configuredKey =
      this.scene.crimeCityConfig.backgroundKey ||
      `${this.scene.cityId}_crime`;

    const fallbackKey = this.scene.cityId;

    const backgroundKey =
      this.scene.textures.exists(configuredKey)
        ? configuredKey
        : fallbackKey;

    if (!this.scene.textures.exists(backgroundKey)) {
      console.warn('[CrimeCityMapUI] Missing background texture.', {
        configuredKey,
        fallbackKey
      });

      this.scene.cameras.main.setBackgroundColor('#17202a');
      return;
    }

    this.background = this.scene.add
      .image(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        backgroundKey
      )
      .setDisplaySize(
        this.scene.scale.width,
        this.scene.scale.height
      );
  }

  createHeader() {
    this.destroyObjects(this.headerObjects);

    this.track(
      this.scene.add
        .rectangle(
          0,
          0,
          this.scene.scale.width,
          76,
          0x000000,
          0.5
        )
        .setOrigin(0, 0)
        .setDepth(20),
      this.headerObjects
    );

    this.track(
      this.scene.add
        .text(
          40,
          18,
          `${this.scene.cityData.city}, ${this.scene.cityData.country}`,
          {
            fontFamily: 'SpecialElite',
            fontSize: '28px',
            color: '#ffffff'
          }
        )
        .setDepth(21),
      this.headerObjects
    );

    const artifact = gameState.currentMission?.artifact;

    let subtitle =
      'Follow the evidence. Ignore the dramatic pigeons.';

    if (!this.scene.isCrimeSceneCompleted()) {
      subtitle = artifact
        ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!this.scene.isCrimeLabCompleted()) {
      subtitle =
        'Evidence collected. Time to visit the Crime Lab.';
    } else if (!this.scene.isGridCompleted()) {
      subtitle =
        'Lab report ready. Answer HQ and reconstruct the theft.';
    } else {
      subtitle =
        'Theory logged. Question the people with alibis.';
    }

    this.track(
      this.scene.add
        .text(40, 50, subtitle, {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#f1e6b8'
        })
        .setDepth(21),
      this.headerObjects
    );
  }

  createAvailableLocations({
    crimeSceneCompleted,
    crimeLabCompleted,
    gridCompleted,
    apartmentAvailable
  } = {}) {
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();

    if (crimeSceneCompleted) {
      this.createSuspectsIcon();
    }

    if (!crimeSceneCompleted) {
      this.createCrimeSceneIcon();
    }

    if (crimeSceneCompleted && !crimeLabCompleted) {
      this.createLabIcon();
    }

    this.createHotelIcon();

    this.apartmentSignature = null;
    this.refreshApartmentLocation(apartmentAvailable);
    this.startApartmentRefresh();
  }

  startApartmentRefresh() {
    if (this.refreshTimer) {
      return;
    }

    // Refreshes availability after conversations without rebuilding NPCs.
    this.refreshTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.refreshApartmentLocation()
    });
  }

  getApartmentCandidates() {
    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];

    const candidates = new Map();

    suspects.forEach((suspect) => {
      const id = suspect?.id;

      if (id && this.scene.isAlibiDebunked?.(id)) {
        candidates.set(id, suspect);
      }
    });

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    if (Array.isArray(debunked)) {
      debunked.forEach((id) => {
        if (
          typeof id !== 'string' ||
          !id ||
          !this.scene.isAlibiDebunked?.(id)
        ) {
          return;
        }

        if (!candidates.has(id)) {
          const suspect = suspects.find(
            (entry) => entry?.id === id
          );

          candidates.set(id, suspect || { id });
        }
      });
    }

    return [...candidates.values()];
  }

  getSuspectLabel(suspect) {
    return suspect?.name || 'Unidentified suspect';
  }

  refreshApartmentLocation(availabilityHint) {
    if (!this.scene || this.scene._cleanupDone) {
      return;
    }

    const candidates = this.getApartmentCandidates();

    const available =
      availabilityHint === true ||
      candidates.length > 0 ||
      this.scene.hasAnyDebunkedAlibi?.() === true;

    const signature = JSON.stringify({
      available,
      suspects: candidates.map((suspect) => ({
        id: suspect.id,
        name: this.getSuspectLabel(suspect)
      }))
    });

    if (signature === this.apartmentSignature) {
      return;
    }

    this.apartmentSignature = signature;

    this.destroyObjects(this.apartmentObjects);
    this.closeApartmentSelection();

    if (available) {
      this.createApartmentIcon(candidates);
    }
  }

  createApartmentIcon(candidates) {
    const position =
      this.scene.crimeCityConfig.apartment || {
        x: this.scene.scale.width / 2,
        y: this.scene.scale.height - 145
      };

    const textureKey =
      position.textureKey || 'apartment_icon';

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey,
      fallbackColor: 0x795548,
      fallbackStroke: 0xffd180,
      label: candidates.length > 1
        ? `Suspect Apartments (${candidates.length})`
        : 'Suspect Apartment',
      iconScale: 0.22,
      hoverScale: 0.25,
      collection: this.apartmentObjects,
      onClick: () => this.openApartmentSelection()
    });

    // Readable fallback when no apartment artwork is loaded.
    if (!this.scene.textures.exists(textureKey)) {
      this.track(
        this.scene.add
          .text(position.x, position.y, 'APT', {
            fontFamily: 'PressStart2P',
            fontSize: '14px',
            color: '#ffffff'
          })
          .setOrigin(0.5)
          .setDepth(6),
        this.apartmentObjects
      );
    }

    this.createStatusBadge(
      position.x,
      position.y - 56,
      'Alibi disproved',
      '#ffd180',
      this.apartmentObjects
    );
  }

  openApartmentSelection() {
    if (
      !this.scene ||
      this.scene.isTransitioning ||
      this.scene.isVisitingApartment ||
      this.scene._cleanupDone
    ) {
      return;
    }

    const candidates = this.getApartmentCandidates();

    if (!candidates.length) {
      this.scene.showMessage(
        [
          'An alibi has been disproved, but the suspect ID is missing.',
          'The paperwork has escaped before the suspect.'
        ].join('\n'),
        3000,
        '#5d2a00'
      );

      return;
    }

    if (candidates.length === 1) {
      this.scene.visitApartment(candidates[0].id);
      return;
    }

    this.closeApartmentSelection();
    this.scene.closeAllUIPanels();

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    const panelWidth = Math.min(520, width - 32);
    const rowHeight = Math.min(
      48,
      Math.max(28, (height - 220) / candidates.length)
    );

    const panelHeight = 150 + candidates.length * rowHeight;
    const top = (height - panelHeight) / 2;

    const blocker = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.7
      )
      .setDepth(100)
      .setInteractive();

    blocker.on(
      'pointerdown',
      () => this.closeApartmentSelection()
    );

    this.track(blocker, this.selectionObjects);

    this.track(
      this.scene.add
        .rectangle(
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
      this.scene.add
        .text(width / 2, top + 24, 'Choose an apartment', {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#ffd180'
        })
        .setOrigin(0.5, 0)
        .setDepth(102),
      this.selectionObjects
    );

    candidates.forEach((suspect, index) => {
      const y = top + 88 + index * rowHeight;

      const button = this.scene.add
        .text(
          width / 2,
          y,
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
        .setInteractive({ useHandCursor: true });

      button.on(
        'pointerover',
        () => button.setColor('#ffe066')
      );

      button.on(
        'pointerout',
        () => button.setColor('#ffffff')
      );

      button.on('pointerdown', () => {
        const suspectId = suspect.id;

        this.closeApartmentSelection();
        this.scene.visitApartment(suspectId);
      });

      this.track(button, this.selectionObjects);
    });

    const cancel = this.scene.add
      .text(
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
      .setInteractive({ useHandCursor: true });

    cancel.on(
      'pointerdown',
      () => this.closeApartmentSelection()
    );

    this.track(cancel, this.selectionObjects);
  }

  closeApartmentSelection() {
    this.destroyObjects(this.selectionObjects);
  }

  createHotelIcon() {
    const position = this.scene.crimeCityConfig.hotel || {
      x: 190,
      y: this.scene.scale.height - 145
    };

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'hotel_icon',
      fallbackColor: 0x6a4c93,
      fallbackStroke: 0xd6b4ff,
      label: 'Hotel',
      completed: false,
      iconScale: 0.22,
      hoverScale: 0.25,
      onClick: () => {
        this.scene.closeAllUIPanels();

        this.scene.transitionTo('HotelScene', {
          cityId: this.scene.cityId,
          city: this.scene.cityData.city,
          country: this.scene.cityData.country,
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.scene.cityId
          },
          sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createSuspectsIcon() {
    const position =
      this.scene.crimeCityConfig.suspectBoard || {
        x: this.scene.scale.width - 150,
        y: this.scene.scale.height - 145
      };

    const suspectCount = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects.length
      : 0;

    const activeCount = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects.filter(
          (suspect) => !suspect?.deductionState?.eliminated
        ).length
      : 0;

    const label = suspectCount > 0
      ? `Suspect Files (${activeCount}/${suspectCount})`
      : 'Suspect Files';

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'policja',
      fallbackColor: 0x304c73,
      fallbackStroke: 0x9ac7ff,
      label,
      completed: false,
      iconScale: 0.22,
      hoverScale: 0.25,
      onClick: () => {
        if (
          !Array.isArray(gameState.caseSuspects) ||
          !gameState.caseSuspects.length
        ) {
          this.scene.showMessage(
            [
              'No suspects yet. Check the crime scene.',
              'This is either bureaucratic delay or a pigeon conspiracy.'
            ].join('\n'),
            3000,
            '#5d2a00'
          );

          return;
        }

        this.scene.closeAllUIPanels();

        this.scene.transitionTo('SuspectBoardScene', {
          cityId: this.scene.cityId,
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.scene.cityId
          },
          sourceScene: 'CrimeCityScene',
          caseSuspects: gameState.caseSuspects,
          identityEvidence: gameState.identityEvidence,
          identityEvidenceResult:
            gameState.identityEvidenceResult,
          hypothesisEvidence:
            gameState.hypothesisEvidence,
          hypothesisEvidenceResult:
            gameState.hypothesisEvidenceResult,
          forensicResults: gameState.forensicResults || [],
          gameState
        });
      }
    });
  }

  createCrimeSceneIcon() {
    const position =
      this.scene.crimeCityConfig.crimeScene;

    if (!position) {
      console.warn(
        '[CrimeCityMapUI] Missing crimeScene position.',
        {
          cityId: this.scene.cityId,
          crimeCityConfig: this.scene.crimeCityConfig
        }
      );

      return;
    }

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'search',
      fallbackColor: 0xd4af37,
      fallbackStroke: 0xfff1a8,
      label: 'Crime Scene',
      iconScale: 0.22,
      hoverScale: 0.25,
      onClick: () => this.scene.openCrimeScene()
    });
  }

  createLabIcon() {
    const position =
      this.scene.crimeCityConfig.crimeLab;

    if (!position || !this.scene.isCrimeSceneCompleted()) {
      return;
    }

    const labEntryAlreadyPaid =
      this.scene.hasPaidCrimeLabEntry();

    this.createMapIcon({
      x: position.x,
      y: position.y,
      textureKey: 'crime_lab',
      fallbackColor: 0x1565c0,
      fallbackStroke: 0x7fc8f8,
      label: labEntryAlreadyPaid
        ? 'Crime Lab — Analysis in Progress'
        : 'Crime Lab — 12 Energy',
      iconScale: 0.35,
      hoverScale: 0.39,
      onClick: () => {
        if (!this.scene.moveToCrimeCityNode('crime_lab')) {
          return;
        }

        if (!this.scene.payCrimeLabEntryOnce()) {
          return;
        }

        this.scene.closeAllUIPanels();

        this.scene.transitionTo('CrimeLabScene', {
          cityId: this.scene.cityId,
          caseKey: this.scene.getCaseKey(),
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.scene.cityId
          },
          sourceScene: 'CrimeCityScene'
        });
      }
    });
  }

  createHypothesisCompleteMarker() {
    const position =
      this.scene.crimeCityConfig.hypothesis || null;

    if (!position) {
      return;
    }

    this.createCompletedMarker(
      position.x,
      position.y,
      'Theory Complete',
      'Profile Ready'
    );
  }

  createMapIcon({
    x,
    y,
    textureKey,
    fallbackColor,
    fallbackStroke,
    label,
    completed = false,
    iconScale = 0.22,
    hoverScale = 0.25,
    onClick,
    collection = this.locationObjects
  }) {
    const hasTexture =
      this.scene.textures.exists(textureKey);

    const icon = hasTexture
      ? this.scene.add
          .image(x, y, textureKey)
          .setScale(iconScale)
      : this.scene.add
          .circle(x, y, 38, fallbackColor, 0.95)
          .setStrokeStyle(3, fallbackStroke);

    icon
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const labelObject = this.scene.add
      .text(x, y + 68, label, {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: completed ? '#aaaaaa' : '#ffffff',
        backgroundColor: '#000000aa',
        padding: {
          left: 8,
          right: 8,
          top: 4,
          bottom: 4
        }
      })
      .setOrigin(0.5)
      .setDepth(6);

    if (completed) {
      icon.setAlpha(0.58);

      if (hasTexture) {
        icon.setTint(0xaaaaaa);
      }

      this.createStatusBadge(
        x,
        y - 56,
        'Completed',
        '#66bb6a',
        collection
      );
    }

    icon.on('pointerover', () => {
      if (!completed) {
        icon.setScale(hasTexture ? hoverScale : 1.1);
      }

      labelObject.setColor(
        completed ? '#cccccc' : '#ffe066'
      );
    });

    icon.on('pointerout', () => {
      if (!completed) {
        icon.setScale(hasTexture ? iconScale : 1);
      }

      labelObject.setColor(
        completed ? '#aaaaaa' : '#ffffff'
      );
    });

    if (typeof onClick === 'function') {
      icon.on('pointerdown', onClick);
    }

    this.scene.interactiveObjects.push(icon);

    this.track(icon, collection);
    this.track(labelObject, collection);

    return {
      icon,
      label: labelObject
    };
  }

  createCompletedMarker(x, y, label, status) {
    const marker = this.scene.add
      .circle(x, y, 38, 0x37474f, 0.8)
      .setStrokeStyle(3, 0x66bb6a)
      .setDepth(5);

    const checkmark = this.scene.add
      .text(x, y, '✓', {
        fontFamily: 'SpecialElite',
        fontSize: '34px',
        color: '#66bb6a'
      })
      .setOrigin(0.5)
      .setDepth(6);

    const labelObject = this.scene.add
      .text(x, y + 68, label, {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: {
          left: 8,
          right: 8,
          top: 4,
          bottom: 4
        }
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.createStatusBadge(
      x,
      y - 56,
      status,
      '#66bb6a'
    );

    this.scene.interactiveObjects.push(
      marker,
      checkmark,
      labelObject
    );

    this.track(marker, this.locationObjects);
    this.track(checkmark, this.locationObjects);
    this.track(labelObject, this.locationObjects);

    return {
      marker,
      checkmark,
      label: labelObject
    };
  }

  createStatusBadge(
    x,
    y,
    text,
    color,
    collection = this.locationObjects
  ) {
    const badge = this.scene.add
      .text(x, y, text, {
        fontFamily: 'SpecialElite',
        fontSize: '13px',
        color,
        backgroundColor: '#000000cc',
        padding: {
          left: 6,
          right: 6,
          top: 3,
          bottom: 3
        }
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.scene.interactiveObjects.push(badge);
    this.track(badge, collection);

    return badge;
  }

  destroy() {
    if (!this.scene) {
      return;
    }

    this.scene.events.off(
      'shutdown',
      this.handleShutdown
    );

    this.refreshTimer?.remove(false);
    this.refreshTimer = null;

    this.closeApartmentSelection();
    this.destroyObjects(this.apartmentObjects);
    this.destroyObjects(this.locationObjects);
    this.destroyObjects(this.headerObjects);

    this.background?.destroy();
    this.background = null;

    this.scene = null;
  }
}