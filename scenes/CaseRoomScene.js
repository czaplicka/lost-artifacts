import {
  BaseScene
} from './BaseScene.js';

import {
  gameState
} from '../GameData.js';

import {
  EventBus
} from '../EventBus.js';

import {
  LocationDialoguePanel
} from '../ui/LocationDialoguePanel.js';

import {
  caseRoomContext,
  enterCaseRoom,
  bindRoomReconstruction,
  finishRoomReview,
  roomAssessment
} from '../systems/CaseRoomFlow.js';

const IMAGE = 'case_room_background';

const WIDTH = 1920;
const HEIGHT = 1080;

// id, x, y, width, height, hover label
// Współrzędne oznaczają lewy górny róg.
const HOTSPOTS = [
  [
    'board',
    927, 285, 622, 364,
    'Reconstruction board'
  ],

  [
    'lab',
    294, 276, 253, 744,
    'Return to Crime Lab'
  ],

  [
    'city',
    1680, 277, 240, 685,
    'Return to Crime City'
  ],

  [
    'coffee',
    1260, 725, 66, 72,
    'Coffee of uncertain age'
  ],

  [
    'plant',
    1327, 613, 97, 155,
    'A controlled experiment'
  ]
];

export class CaseRoomScene extends BaseScene {
  constructor() {
    super({
      key: 'CaseRoomScene'
    });
  }

  init(data = {}) {
    this.cityId =
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentCityId ||
      gameState.currentMission?.city;

    this.caseKey = data.caseKey ?? null;

    this.roomRun = Symbol('case-room');

    this.openingBoard = false;
    this.leavingRoom = false;

    this.review = null;
    this.roomLayer = null;
    this.hint = null;
    this.title = null;
  }

  preload() {
    if (!this.textures.exists(IMAGE)) {
      this.load.image(
        IMAGE,
        'assets/local/case_room.webp'
      );
    }
  }

  create() {
    super.create();

    // Stare wejście z phonebooka może pozostawić
    // aktywne miasto pod spodem.
    if (
      this.isSceneActive('CrimeCityScene')
    ) {
      this.scene.pause('CrimeCityScene');
    }

    this.hideRoomHud();

    this.roomLayer =
      this.add.container(0, 0);

    this.title = this.add.text(
      18,
      16,
      'CASE ROOM',
      {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#ffd86b',

        backgroundColor: '#171b1bd9',

        padding: {
          x: 12,
          y: 10
        }
      }
    ).setDepth(20);

    this.hint = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#f4ecd8',

        backgroundColor: '#171b1be8',

        padding: {
          x: 14,
          y: 8
        },

        align: 'center'
      }
    )
      .setOrigin(.5, 1)
      .setDepth(20);

    this.onRoomResize = () => {
      this.renderRoom();
    };

    this.onRoomResume = () => {
      this.openingBoard = false;
      this.leavingRoom = false;

      const token = this.roomRun;

      this.time.delayedCall(0, () => {
        if (
          token !== this.roomRun ||
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

        this.hideRoomHud();
        this.offerReview();
      });
    };

    this.onRoomKey = event => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          event.target?.tagName
        )
      ) {
        return;
      }

      if (event.code === 'Escape') {
        event.preventDefault();

        if (this.review?.isOpen) {
          this.closeReview();
        } else {
          void this.leaveRoom(
            'CrimeCityScene'
          );
        }
      }
    };

    this.scale.on(
      'resize',
      this.onRoomResize
    );

    this.events.on(
      'resume',
      this.onRoomResume
    );

    this.events.on(
      'wake',
      this.onRoomResume
    );

    this.input.keyboard?.on(
      'keydown',
      this.onRoomKey
    );

    this.events.once(
      'shutdown',
      this.cleanupRoom,
      this
    );

    this.events.once(
      'destroy',
      this.cleanupRoom,
      this
    );

    const context = enterCaseRoom(
      this.cityId,
      this.caseKey
    );

    if (this.caseKey == null) {
      this.caseKey = context.caseKey;
    }

    this.renderRoom();

    if (this.textures.exists(IMAGE)) {
      this.setHint(
        context.ready
          ? 'Click the corkboard to reconstruct the theft.'
          : 'Complete the CSI analyses before using the board.'
      );
    }

    this.offerReview();
  }

  hideRoomHud() {
    EventBus.emit('hideHUD');

    this.game.events.emit(
      'setHudVisible',
      false
    );
  }

  setHint(value) {
    this.hint?.setText(value);
  }

  renderRoom() {
    if (
      !this.roomLayer ||
      this._cleanupDone
    ) {
      return;
    }

    const {
      width,
      height
    } = this.scale;

    const scale = Math.min(
      width / WIDTH,
      height / HEIGHT
    );

    this.cameras.main.setBackgroundColor(
      '#101817'
    );

    this.roomLayer.removeAll(true);

    this.roomLayer
      .setPosition(
        (width - WIDTH * scale) / 2,
        (height - HEIGHT * scale) / 2
      )
      .setScale(scale);

    this.hint
      .setPosition(
        width / 2,
        height - 14
      )
      .setWordWrapWidth(
        Math.max(40, width - 40)
      );

    if (!this.textures.exists(IMAGE)) {
      this.setHint(
        'Missing background: assets/local/case_room.webp. ' +
        'Press Escape to return to the city.'
      );

      return;
    }

    const background = this.add.image(
      WIDTH / 2,
      HEIGHT / 2,
      IMAGE
    ).setDisplaySize(
      WIDTH,
      HEIGHT
    );

    this.roomLayer.add(background);

    for (
      const [
        id,
        x,
        y,
        w,
        h,
        label
      ] of HOTSPOTS
    ) {
      const zone = this.add.zone(
        x,
        y,
        w,
        h
      )
        .setOrigin(0)
        .setInteractive({
          useHandCursor: true
        });

      this.roomLayer.add(zone);

      zone.on('pointerover', () => {
        if (!this.review?.isOpen) {
          this.setHint(label);
        }
      });

      zone.on('pointerout', () => {
        if (!this.review?.isOpen) {
          this.setHint('');
        }
      });

      zone.on(
        'pointerdown',
        (
          pointer,
          _x,
          _y,
          event
        ) => {
          event?.stopPropagation();

          if (
            pointer?.event?.button != null &&
            pointer.event.button !== 0
          ) {
            return;
          }

          if (
            this.openingBoard ||
            this.leavingRoom ||
            this.review?.isOpen
          ) {
            return;
          }

          if (id === 'board') {
            void this.openBoard();
          }

          if (id === 'lab') {
            void this.leaveRoom(
              'CrimeLabScene'
            );
          }

          if (id === 'city') {
            void this.leaveRoom(
              'CrimeCityScene'
            );
          }

          if (id === 'coffee') {
            this.setHint(
              'This coffee has been here long enough ' +
              'to qualify as trace evidence.'
            );
          }

          if (id === 'plant') {
            this.setHint(
              'The only living thing here ' +
              'with a smaller budget than mine.'
            );
          }
        }
      );
    }
  }

  async openBoard() {
    if (
      this.openingBoard ||
      this.leavingRoom ||
      this.review?.isOpen ||
      gameState.caseFailed
    ) {
      return false;
    }

    const context = caseRoomContext(
      this.cityId,
      this.caseKey
    );

    // Ukończonej rekonstrukcji nie rozgrywamy
    // ponownie i nie przyznajemy kolejnych nagród.
    if (context.completed) {
      this.openReview();

      return true;
    }

    const token = this.roomRun;

    this.openingBoard = true;

    try {
      bindRoomReconstruction(
        this.cityId,
        this.caseKey
      );

      const opened = await this.launchOverlay(
        'HypothesisScene',
        {
          cityId: this.cityId,
          caseKey: this.caseKey,

          sourceScene: 'CaseRoomScene',
          returnScene: 'CaseRoomScene',

          returnData: {
            cityId: this.cityId,
            caseKey: this.caseKey
          }
        }
      );

      if (
        this.roomRun !== token ||
        this._cleanupDone
      ) {
        return false;
      }

      if (!opened) {
        throw new Error(
          'The reconstruction could not be opened. ' +
          'Please try again.'
        );
      }

      if (this.sys.isActive()) {
        this.scene.pause();
      }

      return true;
    } catch (error) {
      if (
        this.roomRun === token &&
        !this._cleanupDone
      ) {
        this.openingBoard = false;

        this.setHint(error.message);
      }

      return false;
    }
  }

  offerReview() {
    const context = caseRoomContext(
      this.cityId,
      this.caseKey
    );

    if (
      context.completed &&
      !context.reconstruction.resultCommentSeen
    ) {
      this.openReview();
    }
  }

  openReview() {
    if (this.review?.isOpen) {
      return;
    }

    const context = caseRoomContext(
      this.cityId,
      this.caseKey
    );

    if (!context.completed) return;

    this.review = new LocationDialoguePanel(
      this,
      {
        depth: 800,
        modal: true,
        menuWidth: 230,

        leaveLabel: 'Close review',

        onLeave: () => {
          this.closeReview();
        }
      }
    );

    this.review.setSpeaker({
      name: 'LAB REVIEW',

      portrait: {
        kind: 'emoji',
        text: 'CSI'
      }
    });

    this.review.setText(
      roomAssessment(context)
    );

    this.review.setTopics([]);
  }

  closeReview() {
    try {
      finishRoomReview(
        this.cityId,
        this.caseKey
      );
    } catch (error) {
      this.setHint(
        'The review could not be saved. ' +
        'Please try closing it again.'
      );

      return;
    }

    this.review?.destroy();
    this.review = null;

    this.setHint(
      'Reconstruction filed. ' +
      'The suspect files are available in Crime City.'
    );
  }

  async leaveRoom(target) {
    if (
      this.leavingRoom ||
      this.openingBoard ||
      this.review?.isOpen ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const context = caseRoomContext(
      this.cityId,
      this.caseKey
    );

    if (
      target === 'CrimeLabScene' &&
      !context.ready
    ) {
      this.setHint(
        'Return to Crime City to reopen the laboratory.'
      );

      return false;
    }

    this.leavingRoom = true;

    const token = this.roomRun;

    const data = {
      cityId: this.cityId,
      caseKey: this.caseKey,

      showSuspectTutorial:
        context.completed
    };

    try {
      if (
        target === 'CrimeCityScene' &&
        (
          this.isScenePaused(target) ||
          this.isSceneSleeping(target)
        )
      ) {
        if (this.isSceneSleeping(target)) {
          this.scene.wake(target, data);
        } else {
          this.scene.resume(target, data);
        }

        this.scene.bringToTop(target);
        this.scene.stop();

        return true;
      }

      const opened = await this.goto(
        target,
        data
      );

      if (
        !opened &&
        this.roomRun === token &&
        !this._cleanupDone
      ) {
        this.leavingRoom = false;

        this.setHint(
          'The door appears to be stuck. Please try again.'
        );
      }

      return opened;
    } catch (error) {
      if (
        this.roomRun === token &&
        !this._cleanupDone
      ) {
        this.leavingRoom = false;

        this.setHint(
          'Could not leave the room. Please try again.'
        );
      }

      return false;
    }
  }

  cleanupRoom() {
    if (this.roomRun == null) {
      return;
    }

    this.roomRun = null;

    this.scale.off(
      'resize',
      this.onRoomResize
    );

    this.events.off(
      'resume',
      this.onRoomResume
    );

    this.events.off(
      'wake',
      this.onRoomResume
    );

    this.events.off(
      'shutdown',
      this.cleanupRoom,
      this
    );

    this.events.off(
      'destroy',
      this.cleanupRoom,
      this
    );

    this.input.keyboard?.off(
      'keydown',
      this.onRoomKey
    );

    this.review?.destroy();

    this.review = null;
    this.roomLayer = null;
    this.hint = null;

    EventBus.emit('showHUD');

    this.game.events.emit(
      'setHudVisible',
      true
    );
  }
}