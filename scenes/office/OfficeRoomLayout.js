import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { OfficeDoorSigns } from './OfficeDoorsigns.js';
import { OFFICE_BACKGROUND_KEYS } from './OfficeSceneConfig.js';

export const OfficeRoomLayout = {
  preload() {
    const manifest =
      this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error(
        '[OfficeScene] assetManifest is missing.'
      );
      return;
    }

    for (const key of OFFICE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) continue;

      const entry = manifest.backgrounds?.find(
        asset => asset.key === key
      );

      if (entry?.url) {
        this.load.image(key, entry.url);
      } else {
        console.error(
          `[OfficeScene] Missing background manifest entry "${key}".`
        );
      }
    }

    if (!this.cache.audio.exists('officescenesound')) {
      const ambient = manifest.audio?.find(
        asset => asset.key === 'officescenesound'
      );

      if (ambient?.url) {
        this.load.audio(ambient.key, ambient.url);
      }
    }

    if (!this.cache.json.exists('monologues')) {
      const monologues = manifest.json?.find(
        asset => asset.key === 'monologues'
      );

      if (monologues?.url) {
        this.load.json(monologues.key, monologues.url);
      }
    }
  },

  getOfficeRoomMeta(roomKey) {
    const meta = {
      elevator: {
        label: __dialogueText("scenes/OfficeScene.js", "t_8ec78fd4e0c76ee47e25"),
        subtitle: this.hasCompletedFirstMission()
          ? __dialogueText("scenes/OfficeScene.js", "t_82d1f7cc09a97dc7b5be")
          : __dialogueText("scenes/OfficeScene.js", "t_24d8f84a780c7168cc3f")
      },
      storage: {
        label: __dialogueText("scenes/OfficeScene.js", "t_5b24b840a76014023657"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_6ac6b00357d9081fdc38")
      },
      office: {
        label: __dialogueText("scenes/OfficeScene.js", "t_9af0ff0f58a463fe73ff"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_55483976a9e1caae2b56")
      },
      cabinet: {
        label: __dialogueText("scenes/OfficeScene.js", "t_408d2e9270273051bb20"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_163bcef7b4a7b5a834c6")
      }
    };

    return meta[roomKey] ?? null;
  },

  createDoorSigns() {
    this.doorSigns?.destroy();

    this.doorSigns = new OfficeDoorSigns(this, {
      x: 24,
      y: 170,
      spacing: 82,
      doors: [
        {
          id: 'archive',
          label: __dialogueText("scenes/OfficeScene.js", "t_b22a9799327ae5c2ede9"),
          subtitle: __dialogueText("scenes/OfficeScene.js", "t_4e7499010dd7e1ad7e0a"),
          glyph: 'archive',
          lockedLabel: 'LOCKED',
          isBlocked: () => this.isArchiveBlocked(),
          onBlockedClick: () => {
            if (!this.uiLocked && this.isOfficeTutorialBlocking()) {
              this.showOfficeStatusMessage(
                __dialogueText("scenes/OfficeScene.js", "t_fdb4e3e1e53a1750aaf2")
              );
            }
          },
          onOpen: () => this.openArchive()
        },
        {
          id: 'storage',
          label: __dialogueText("scenes/OfficeScene.js", "t_599b626e7206a74d972a"),
          subtitle: __dialogueText("scenes/OfficeScene.js", "t_0cb148a28ca68d58479d"),
          glyph: 'storage',
          isBlocked: () => this.isStorageBlocked(),
          onOpen: () => this.openStorage()
        }
      ]
    });

    this.doorSigns.create();

    // FirstCaseTutorial podświetla storageButton przez getBounds().
    this.archiveButton = this.doorSigns.getSign('archive');
    this.storageButton = this.doorSigns.getSign('storage');
  },

  refreshEntranceButtons() {
    this.doorSigns?.refresh();
  },

  createBackgrounds(gameWidth, gameHeight) {
    const completed = this.hasCompletedFirstMission();

    const background = (x, key) => (
      this.add.image(x, 0, key)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth, gameHeight)
    );

    const elevatorBg = background(
      -gameWidth,
      completed ? 'elevator_open' : 'elevator_broken'
    );

    const storageBg = background(0, 'backgroundhi');
    const officeBg = background(gameWidth, 'backgroundoff');
    const cabinetBg = background(gameWidth * 2, 'backgroundset');

    this.elevatorBackground = elevatorBg;

    this.rooms = {
      elevator: {
        key: 'elevator',
        bg: elevatorBg,
        x: -gameWidth,
        width: gameWidth
      },
      storage: {
        key: 'storage',
        bg: storageBg,
        x: 0,
        width: gameWidth
      },
      office: {
        key: 'office',
        bg: officeBg,
        x: gameWidth,
        width: gameWidth
      },
      cabinet: {
        key: 'cabinet',
        bg: cabinetBg,
        x: gameWidth * 2,
        width: gameWidth
      }
    };

    this.roomOrder = [
      'elevator',
      'storage',
      'office',
      'cabinet'
    ];

    this.totalWidth = gameWidth * this.roomOrder.length;

    this.viewPositions = Object.fromEntries(
      this.roomOrder.map(key => [key, this.rooms[key].x])
    );
  },

  createCameraSetup(height) {
    this.cameras.main.setBounds(
      this.rooms.elevator.x,
      0,
      this.totalWidth,
      height
    );
  },

  refreshMissionProgressVisuals() {
    if (!this.isCurrentOfficeRun()) return;

    const elevatorTexture = this.hasCompletedFirstMission()
      ? 'elevator_open'
      : 'elevator_broken';

    if (
      this.elevatorBackground?.active &&
      this.rooms.elevator &&
      this.elevatorBackground.texture?.key !== elevatorTexture
    ) {
      this.elevatorBackground
        .setTexture(elevatorTexture)
        .setDisplaySize(
          this.rooms.elevator.width,
          this.scale.height
        );
    }

    this.hotspotManager?.refreshAvailability?.();
    this.navigation?.refreshRoomMeta();
    this.refreshEntranceButtons();
  }
};
