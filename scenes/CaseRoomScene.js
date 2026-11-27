import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { CrimeCityTutorial } from '../tutorials/CrimeCityTutorial.js';
import { uninstallCityDayNight } from '../systems/CityDayNightManager.js';
import { uninstallCityWeather } from '../systems/CityWeatherManager.js';
import {
  caseRoomContext, enterCaseRoom, bindRoomReconstruction,
  finishRoomReview, roomAssessment
} from '../systems/CaseRoomFlow.js';



const IMAGE = 'case_room_background';
const WIDTH = 1920;
const HEIGHT = 1080;
const BOARD_TARGET = 'case-room-board';
const ROOM_TUTORIAL_STEPS = ['phone_lab', 'hypothesis'];



// id, x, y, width, height, hover label; współrzędne lewego górnego rogu.
const HOTSPOTS = [
  ['board', 927, 285, 622, 364, 'Reconstruction board'],
  ['lab', 294, 276, 253, 744, 'Return to Crime Lab'],
  ['city', 1680, 277, 240, 685, 'Return to Crime City'],
  ['coffee', 1260, 725, 66, 72, 'Coffee of uncertain age'],
  ['plant', 1327, 613, 97, 155, 'A controlled experiment']
];



export class CaseRoomScene extends BaseScene {
  constructor() { super({ key: 'CaseRoomScene' }); }



  init(data = {}) {
    this.cityId = data.cityId || gameState.crimeCityId ||
      gameState.currentCityId || gameState.currentMission?.city;
    this.caseKey = data.caseKey ?? null;
    this.roomRun = Symbol('case-room');
    this.openingBoard = false;
    this.leavingRoom = false;
    this.review = null;
    this.roomLayer = null;
    this.hint = null;
    this.title = null;
    this.exitButton = null;
    this.roomTutorial = null;
    this.roomTutorialTimer = null;
    this.newsHudSnapshot = null;
    this.cityHidden = false;
  }



  preload() {
    if (!this.textures.exists(IMAGE)) {
      this.load.image(IMAGE, 'assets/local/case_room.webp');
    }
  }



  create() {
    super.create();



    // Pokój nie ma nocnego filtra ani pogody.
    uninstallCityDayNight(this);
    uninstallCityWeather(this);



    // Stare wejście z phonebooka może pozostawić aktywne miasto pod spodem.
    if (this.isSceneActive('CrimeCityScene')) this.scene.pause('CrimeCityScene');



    // Spauzowane miasto nadal się rysuje (razem z nocnym welonem), więc je chowamy.
    if (this.isScenePaused('CrimeCityScene')) {
      this.scene.setVisible(false, 'CrimeCityScene');
      this.cityHidden = true;
    }



    this.hideRoomHud();
    this.roomLayer = this.add.container(0, 0);
    this.title = this.add.text(18, 16, 'CASE ROOM', {
      fontFamily: 'PressStart2P', fontSize: '13px', color: '#ffd86b',
      backgroundColor: '#171b1bd9', padding: { x: 12, y: 10 }
    }).setDepth(20);
    this.hint = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#f4ecd8',
      backgroundColor: '#171b1be8', padding: { x: 14, y: 8 }, align: 'center'
    }).setOrigin(.5, 1).setDepth(20);



    this.exitButton = this.add.text(0, 16, 'EXIT', {
      fontFamily: 'PressStart2P', fontSize: '13px', color: '#ffd86b',
      backgroundColor: '#171b1bd9', padding: { x: 14, y: 10 }
    }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });
    this.exitButton.on('pointerover', () => {
      this.exitButton?.setStyle({ color: '#ffffff', backgroundColor: '#7a2a22' });
    });
    this.exitButton.on('pointerout', () => {
      this.exitButton?.setStyle({ color: '#ffd86b', backgroundColor: '#171b1bd9' });
    });
    this.exitButton.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      if (pointer?.event?.button != null && pointer.event.button !== 0) return;
      if (this.openingBoard || this.leavingRoom || this.review?.root) return;
      void this.leaveRoom('CrimeCityScene');
    });



    this.onRoomResize = () => { this.renderRoom(); };
    this.onRoomResume = () => {
      this.openingBoard = false;
      this.leavingRoom = false;
      const token = this.roomRun;
      this.time.delayedCall(0, () => {
        if (token !== this.roomRun || this._cleanupDone || !this.sys.isActive()) return;
        this.hideRoomHud();
        // Odświeżamy pokój i samouczek po powrocie z rekonstrukcji.
        this.renderRoom();
        this.syncRoomTutorial();
        this.offerReview();
      });
    };
    this.onRoomKey = event => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey ||
        event.altKey || event.target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
      // Aktywny review ma własną obsługę klawiszy we wspólnym panelu.
      // Nie zamykamy review i pokoju jednym naciśnięciem Escape.
      if (this.review?.root) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        void this.leaveRoom('CrimeCityScene');
      }
    };



    this.scale.on('resize', this.onRoomResize);
    this.events.on('resume', this.onRoomResume);
    this.events.on('wake', this.onRoomResume);
    this.input.keyboard?.on('keydown', this.onRoomKey);
    this.events.once('shutdown', this.cleanupRoom, this);
    this.events.once('destroy', this.cleanupRoom, this);



    const context = enterCaseRoom(this.cityId, this.caseKey);
    if (this.caseKey == null) this.caseKey = context.caseKey;
    this.renderRoom();
    if (this.textures.exists(IMAGE)) {
      this.setHint(context.ready
        ? 'Click the corkboard to reconstruct the theft.'
        : 'Complete the CSI analyses before using the board.');
    }
    this.setupRoomTutorial();
    this.offerReview();
  }



  hideRoomHud() {
    EventBus.emit('hideHUD');
    this.game.events.emit('setHudVisible', false);



    // Dolne menu to NewsHud: chowamy je i zapamiętujemy stan do przywrócenia.
    const news = this.getRegisteredScene('NewsHud');
    if (news?.sys?.isActive() && news.menuTab && news.menuPanel) {
      this.newsHudSnapshot ??= {
        scene: news,
        hudEnabled: news.hudEnabled,
        sceneVisible: news.sys.settings.visible
      };
      news.closeMenu?.(true);
      news.setHudVisible(false);
      news.sys.setVisible(false);
    }
  }



  restoreNewsHud() {
    const snapshot = this.newsHudSnapshot;
    this.newsHudSnapshot = null;
    if (!snapshot) return;
    const news = snapshot.scene;
    if (news.isShutDown || !news.menuTab || !news.menuPanel) return;
    news.setHudVisible(snapshot.hudEnabled);
    news.sys.setVisible(snapshot.sceneVisible);
  }



  setHint(value) { this.hint?.setText(value); }



  // ---- Samouczek w pokoju (ta sama klasa co w mieście) ----

  shouldRunRoomTutorial() {
    const state = gameState.onboarding?.crimeCity;
    if (!state || state.completed || state.skipped) return false;
    if (!ROOM_TUTORIAL_STEPS.includes(state.step)) return false;
    const context = caseRoomContext(this.cityId, this.caseKey);
    return context.ready && !context.completed;
  }

  setupRoomTutorial() {
    if (this.roomTutorial || !this.shouldRunRoomTutorial()) return;

    const tutorial = new CrimeCityTutorial(this, gameState);

    // W pokoju oba kroki prowadzą do tablicy.
    for (const step of ROOM_TUTORIAL_STEPS) {
      if (!tutorial.stepContent[step]) continue;
      tutorial.stepContent[step] = {
        ...tutorial.stepContent[step],
        title: 'THE CASE ROOM',
        objective: 'Click the corkboard to reconstruct the theft.',
        hint: 'The analyses tell you what was found. ' +
          'The reconstruction asks what happened.',
        targetHotspot: BOARD_TARGET
      };
    }

    this.roomTutorial = tutorial;
    this.syncRoomTutorialHotspot();
    tutorial.start();

    this.roomTutorialTimer?.remove(false);
    this.roomTutorialTimer = this.time.addEvent({
      delay: 300, loop: true, callback: () => this.syncRoomTutorial()
    });
  }

  // Pokój jest skalowany do okna, więc podświetlenie dostaje współrzędne ekranowe.
  syncRoomTutorialHotspot() {
    const tutorial = this.roomTutorial;
    if (!tutorial || tutorial.destroyed || !this.roomLayer) return;
    const spot = HOTSPOTS.find(entry => entry[0] === 'board');
    if (!spot) return;
    const [, x, y, w, h] = spot;
    const scale = this.roomLayer.scaleX || 1;
    tutorial.registerHotspot(BOARD_TARGET, {
      scene: this,
      scrollFactorX: 0,
      scrollFactorY: 0,
      hotspotData: {
        x: this.roomLayer.x + x * scale,
        y: this.roomLayer.y + y * scale,
        width: w * scale,
        height: h * scale
      }
    });
  }

  syncRoomTutorial() {
    const tutorial = this.roomTutorial;
    if (!tutorial) return;
    if (!this.shouldRunRoomTutorial() || this.review?.root) {
      this.destroyRoomTutorial();
    }
  }

  destroyRoomTutorial() {
    this.roomTutorialTimer?.remove(false);
    this.roomTutorialTimer = null;
    this.roomTutorial?.destroy();
    this.roomTutorial = null;
  }



  renderRoom() {
    if (!this.roomLayer || this._cleanupDone) return;
    const { width, height } = this.scale;
    const scale = Math.min(width / WIDTH, height / HEIGHT);
    this.cameras.main.setBackgroundColor('#101817');
    this.roomLayer.removeAll(true);
    this.roomLayer.setPosition((width - WIDTH * scale) / 2,
      (height - HEIGHT * scale) / 2).setScale(scale);
    this.hint.setPosition(width / 2, height - 14)
      .setWordWrapWidth(Math.max(40, width - 40));
    this.exitButton?.setPosition(width - 18, 16);
    if (!this.textures.exists(IMAGE)) {
      this.setHint('Missing background: assets/local/case_room.webp. ' +
        'Press Escape to return to the city.');
      return;
    }
    const background = this.add.image(WIDTH / 2, HEIGHT / 2, IMAGE)
      .setDisplaySize(WIDTH, HEIGHT);
    this.roomLayer.add(background);
    for (const [id, x, y, w, h, label] of HOTSPOTS) {
      const zone = this.add.zone(x, y, w, h).setOrigin(0)
        .setInteractive({ useHandCursor: true });
      this.roomLayer.add(zone);
      zone.on('pointerover', () => {
        if (!this.review?.root) this.setHint(label);
      });
      zone.on('pointerout', () => {
        if (!this.review?.root) this.setHint('');
      });
      zone.on('pointerdown', (pointer, _x, _y, event) => {
        event?.stopPropagation();
        if (pointer?.event?.button != null && pointer.event.button !== 0) return;
        if (this.openingBoard || this.leavingRoom || this.review?.root) return;
        if (id === 'board') {
          this.roomTutorial?.clearHighlight();
          void this.openBoard();
        }
        if (id === 'lab') void this.leaveRoom('CrimeLabScene');
        if (id === 'city') void this.leaveRoom('CrimeCityScene');
        if (id === 'coffee') {
          this.setHint('This coffee has been here long enough ' +
            'to qualify as trace evidence.');
        }
        if (id === 'plant') {
          this.setHint('The only living thing here ' +
            'with a smaller budget than mine.');
        }
      });
    }
    this.syncRoomTutorialHotspot();
  }



  async openBoard() {
    if (this.openingBoard || this.leavingRoom || this.review?.root || gameState.caseFailed) {
      return false;
    }
    const context = caseRoomContext(this.cityId, this.caseKey);
    // Ukończona rekonstrukcja to przegląd, bez powtórnej rozgrywki i nagród.
    if (context.completed) { this.openReview(); return true; }
    const token = this.roomRun;
    this.openingBoard = true;
    try {
      bindRoomReconstruction(this.cityId, this.caseKey);
      const opened = await this.launchOverlay('HypothesisScene', {
        cityId: this.cityId, caseKey: this.caseKey,
        sourceScene: 'CaseRoomScene', returnScene: 'CaseRoomScene',
        returnData: { cityId: this.cityId, caseKey: this.caseKey }
      });
      if (this.roomRun !== token || this._cleanupDone) return false;
      if (!opened) {
        throw new Error('The reconstruction could not be opened. Please try again.');
      }
      // Pokój pauzuje HypothesisScene.create() (this.scene.pause(returnScene)).
      return true;
    } catch (error) {
      if (this.roomRun === token && !this._cleanupDone) {
        this.openingBoard = false;
        this.setHint(error.message);
        this.syncRoomTutorialHotspot();
      }
      return false;
    }
  }



  offerReview() {
    const context = caseRoomContext(this.cityId, this.caseKey);
    if (context.completed && !context.reconstruction.resultCommentSeen) this.openReview();
  }



  openReview() {
    if (this.review?.root) return;
    const context = caseRoomContext(this.cityId, this.caseKey);
    if (!context.completed) return;
    const view = new HomeTownDialogue(this, () => {
      if (this.review !== view) return;
      this.closeReview();
      // Zabezpieczenie także dla programowego view.close(), które czyści root
      // przed callbackiem. Zwykłe Leave/Escape zapisuje PRZED zamknięciem.
      if (this.review === view && !view.destroyed && !view.root) view.show(data);
    });
    const text = roomAssessment(context);
    const data = {
      title: 'LAB REVIEW', text,
      messages: [{ speaker: 'npc', text }],
      nodeId: 'case_room_lab_review',
      showTrust: false, scoreTrust: false, depth: 800,
      choices: [],
      onDraw: () => {
        if (!view.panel) return;
        view.panel.byeBtn.text.setText('Close review');
        // Wspólny panel renderuje UI; zatwierdzenie nadal należy do CaseRoomFlow.
        view.panel.onLeave = () => {
          if (this.review === view) this.closeReview();
        };
      }
    };
    this.review = view;
    this.destroyRoomTutorial();
    view.show(data);
  }



  closeReview() {
    if (!this.review) return;
    try {
      finishRoomReview(this.cityId, this.caseKey);
    } catch (error) {
      this.setHint('The review could not be saved. ' +
        'Please try closing it again.');
      return;
    }
    this.review.destroy();
    this.review = null;
    this.setHint('Reconstruction filed. ' +
      'The suspect files are available in Crime City.');
  }



  async leaveRoom(target) {
    if (this.leavingRoom || this.openingBoard || this.review?.root || !this.sys.isActive()) {
      return false;
    }
    const context = caseRoomContext(this.cityId, this.caseKey);
    if (target === 'CrimeLabScene' && !context.ready) {
      this.setHint('Return to Crime City to reopen the laboratory.');
      return false;
    }
    this.leavingRoom = true;
    const token = this.roomRun;
    const data = {
      cityId: this.cityId, caseKey: this.caseKey,
      showSuspectTutorial: context.completed
    };
    try {
      if (target === 'CrimeCityScene' &&
        (this.isScenePaused(target) || this.isSceneSleeping(target))) {
        if (this.cityHidden) {
          this.scene.setVisible(true, target);
          this.cityHidden = false;
        }
        if (this.isSceneSleeping(target)) this.scene.wake(target, data);
        else this.scene.resume(target, data);
        this.scene.bringToTop(target);
        this.scene.stop();
        return true;
      }
      const opened = await this.goto(target, data);
      if (!opened && this.roomRun === token && !this._cleanupDone) {
        this.leavingRoom = false;
        this.setHint('The door appears to be stuck. Please try again.');
      }
      return opened;
    } catch (error) {
      if (this.roomRun === token && !this._cleanupDone) {
        this.leavingRoom = false;
        this.setHint('Could not leave the room. Please try again.');
      }
      return false;
    }
  }



  cleanupRoom() {
    if (this.roomRun == null) return;
    this.roomRun = null;
    this.scale.off('resize', this.onRoomResize);
    this.events.off('resume', this.onRoomResume);
    this.events.off('wake', this.onRoomResume);
    this.events.off('shutdown', this.cleanupRoom, this);
    this.events.off('destroy', this.cleanupRoom, this);
    this.input.keyboard?.off('keydown', this.onRoomKey);
    this.destroyRoomTutorial();
    this.review?.destroy();
    this.review = null;
    this.roomLayer = null;
    this.hint = null;
    this.exitButton = null;



    if (this.cityHidden && this.hasScene('CrimeCityScene')) {
      this.scene.setVisible(true, 'CrimeCityScene');
    }
    this.cityHidden = false;



    this.restoreNewsHud();
    EventBus.emit('showHUD');
    this.game.events.emit('setHudVisible', true);
  }
}