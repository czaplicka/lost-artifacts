import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { ensureHud } from '../hudHelpers.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  getRandomSuspectLineup,
  isCorrectSuspectChoice,
  getSuspectImageKey
} from '../suspects/suspectHelpers.js';
import { FIELD_NOTE_QUIPS } from './arrestSelection/config.js';
import { lifecycleMethods } from './arrestSelection/lifecycle.js';
import { helpersMethods } from './arrestSelection/helpers.js';
import { backdropMethods } from './arrestSelection/backdrop.js';
import { folderMethods } from './arrestSelection/folder.js';
import { dossierMethods } from './arrestSelection/dossier.js';
import { controlsMethods } from './arrestSelection/controls.js';
import { zoomMethods } from './arrestSelection/zoom.js';
import { confirmationMethods } from './arrestSelection/confirmation.js';
import { resultsMethods } from './arrestSelection/results.js';
import { navigationMethods } from './arrestSelection/navigation.js';
import { arrestFlowMethods } from './arrestSelection/arrestFlow.js';

export class ArrestSelectionScene extends BaseScene {
  constructor() {
    super({ key: 'ArrestSelectionScene' });
    this.resetState();
  }

  resetState() {
    this.dialogueText = null;
    this.resultOverlay = null;
    this.resultPanel = null;
    this.resultTitle = null;
    this.resultText = null;
    this.continueBtn = null;

    this.nextSceneKey = 'GameOverScene';
    this.isLeaving = false;

    this.selectedSuspectId = null;
    this.suspectsPool = [];
    this.displaySuspects = [];
    this.quipOrder = [];

    this.selectionLocked = false;
    this.resultCommitted = false;
    this.currentSuspectIndex = 0;
    this.currentCard = null;
    this.isAnimatingSlide = false;
    this.confirmOpen = false;

    this.backdropRoot = null;
    this.viewerRoot = null;
    this.stripRoot = null;
    this.cardSlot = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.arrestButton = null;
    this.arrestButtonText = null;
    this.arrestGlow = null;
    this.arrestPulse = null;
    this.orderStamp = null;
    this.counterText = null;
    this.thumbs = [];

    this.backBtn = null;
    this.backBtnLabel = null;

    this.zoomOverlay = null;
    this.zoomImage = null;
    this.zoomCaption = null;
    this.zoomHintText = null;

    this.confirmOverlay = null;
    this.confirmBody = null;

    this.caseNumberText = null;
    this.bottomNoteText = null;

    this.onLeftKeyDown = null;
    this.onRightKeyDown = null;
    this.onEnterKeyDown = null;
    this.onEscKeyDown = null;
  }

  init() {
    this.resetState();
  }

  create() {
    super.create();

    audioManager.stopSfx();
    audioManager.stopAllMusic();

    ensureHud(this);
    this.closeAllUIPanels();

    EventBus.emit('hideHUD');

    const hud = this.scene.manager.keys.PlayerHudScene;
    hud?.hideHud?.();

    const newsHud = this.scene.manager.keys.NewsHud;
    newsHud?.events?.emit('setNewspaperVisible', false);
    newsHud?.events?.emit('setTvVisible', false);

    if (!gameState.arrestWarrantIssued) {
      gameState.finalArrestSuspectId = null;
      gameState.finalArrestResult = 'FAILURE';
      gameState.caseResolved = false;
      gameState.caseFailed = true;
      gameState.isGameActive = false;

      gameState.gameOverReason =
        __dialogueText("scenes/ArrestSelectionScene.js", "t_08304ee57102f7ed1848") +
        __dialogueText("scenes/ArrestSelectionScene.js", "t_5a91840746e019e7fdaf");

      saveGameState();

      this.scene.stop('CityScene');

      this.goto('GameOverScene', {
        title: __dialogueText("scenes/ArrestSelectionScene.js", "t_2a282ac69abf6004b01e"),
        reasonCode: 'missing_warrant',
        caseId: gameState.currentCaseId,
        message: gameState.gameOverReason
      });

      return;
    }

    const suspectsData = this.cache.json.get('suspects');

    if (!Array.isArray(suspectsData) || suspectsData.length < 5) {
      console.error('suspects.json must contain at least 5 suspects.');

      this.goto('GameScene');
      return;
    }

    const thiefId =
      gameState.currentThief?.id ??
      gameState.currentThiefId;

    if (thiefId == null) {
      console.error('Missing current thief in gameState.');

      this.goto('GameScene');
      return;
    }

    this.suspectsPool = suspectsData;

    try {
      this.displaySuspects = getRandomSuspectLineup(
        suspectsData,
        thiefId,
        5
      );
    } catch (error) {
      console.error(
        '[ArrestSelectionScene] Could not prepare the final suspect dossier:',
        error
      );

      this.goto('GameScene', {
        arrestSetupFailed: true,
        errorMessage:
          __dialogueText("scenes/ArrestSelectionScene.js", "t_68ada826c02bcdd954b3") +
          __dialogueText("scenes/ArrestSelectionScene.js", "t_51acced82584105498b2")
      });

      return;
    }

    this.quipOrder = Phaser.Utils.Array.Shuffle(
      FIELD_NOTE_QUIPS.map((_, index) => index)
    );

    this.createBackdrop();
    this.createFolder();
    this.createHeader();
    this.createBackButton();
    this.createCardSlot();
    this.createControlStrip();
    this.createZoomOverlay();
    this.createConfirmOverlay();
    this.createResultOverlay();
    this.registerKeyboard();
    this.registerSceneCleanup();

    this.updatePagination();
  }
}

Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(lifecycleMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(helpersMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(backdropMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(folderMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(dossierMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(controlsMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(zoomMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(confirmationMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(resultsMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(navigationMethods));
Object.defineProperties(ArrestSelectionScene.prototype,
  Object.getOwnPropertyDescriptors(arrestFlowMethods));
