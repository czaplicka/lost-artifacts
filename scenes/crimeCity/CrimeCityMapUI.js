import { gameState } from '../GameData.js';

export class CrimeCityMapUI {
  constructor(scene) {
    this.scene = scene;
  }

  createBackground() {
    const configuredKey =
      this.scene.crimeCityConfig.backgroundKey ||
      `${this.scene.cityId}_crime`;

    const fallbackKey = this.scene.cityId;

    const backgroundKey = this.scene.textures.exists(configuredKey)
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

    this.scene.add
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
      .setDepth(20);

    this.scene.add
      .text(
        40,
        18,
        `${this.scene.cityData.city}, ${this.scene.cityData.country}`,
        {
          fontFamily: 'Special Elite',
          fontSize: '28px',
          color: '#ffffff'
        }
      )
      .setDepth(21);

    const artifact = gameState.currentMission?.artifact;

    let subtitle =
      'Follow the evidence. Ignore the dramatic pigeons.';

    if (!this.scene.isCrimeSceneCompleted()) {
      subtitle = artifact
        ? `Case: ${artifact} — inspect the crime scene before opening suspect files.`
        : 'Start with the crime scene. Suspect files remain sealed.';
    } else if (!this.scene.isCrimeLabCompleted()) {
      subtitle = 'Evidence collected. Time to visit the Crime Lab.';
    } else if (!this.scene.isGridCompleted()) {
      subtitle =
        'Lab report ready. Answer HQ and reconstruct the theft.';
    } else {
      subtitle =
        'Theory logged. Question the people with alibis.';
    }

    this.scene.add
      .text(40, 50, subtitle, {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: '#f1e6b8'
      })
      .setDepth(21);
  }

  createAvailableLocations({
    crimeSceneCompleted,
    crimeLabCompleted,
    gridCompleted
  } = {}) {
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

    if (
      !position ||
      !this.scene.isCrimeSceneCompleted()
    ) {
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
        if (
          !this.scene.moveToCrimeCityNode(
            'crime_lab'
          )
        ) {
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
    onClick
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
      .setInteractive({
        useHandCursor: true
      });

    const labelObject = this.scene.add
      .text(x, y + 68, label, {
        fontFamily: 'Special Elite',
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
      icon
        .setAlpha(0.58)
        .setTint(0xaaaaaa);

      this.createStatusBadge(
        x,
        y - 56,
        'Completed',
        '#66bb6a'
      );
    }

    icon.on('pointerover', () => {
      if (!completed) {
        icon.setScale(
          hasTexture
            ? hoverScale
            : 1.1
        );
      }

      labelObject.setColor(
        completed
          ? '#cccccc'
          : '#ffe066'
      );
    });

    icon.on('pointerout', () => {
      if (!completed) {
        icon.setScale(
          hasTexture
            ? iconScale
            : 1
        );
      }

      labelObject.setColor(
        completed
          ? '#aaaaaa'
          : '#ffffff'
      );
    });

    icon.on('pointerdown', onClick);

    this.scene.interactiveObjects.push(icon);

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
        fontFamily: 'Special Elite',
        fontSize: '34px',
        color: '#66bb6a'
      })
      .setOrigin(0.5)
      .setDepth(6);

    const labelObject = this.scene.add
      .text(x, y + 68, label, {
        fontFamily: 'Special Elite',
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

    return {
      marker,
      checkmark,
      label: labelObject
    };
  }

  createStatusBadge(x, y, text, color) {
    const badge = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Special Elite',
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

    return badge;
  }

  destroy() {
    this.scene = null;
  }
}