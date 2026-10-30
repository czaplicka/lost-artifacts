import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../../CrimeCityTutorial.js';

const LAB_PHONE_DELAY_MS = 250;

export class CrimeCityTutorialController {
  constructor(scene) {
    this.scene = scene;
    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;
    this.phoneCallTimer = null;
    this.suspectTutorialTimer = null;
    this.syncTimer = null;
    this.phoneScenePromise = null;
    this.phoneCallPending = false;
    this.lifecycleToken = 0;
    this.npcTarget = null;

    this.onSceneReady = () => this.startProgressSync();

    scene.events.on(
      Phaser.Scenes.Events.CREATE,
      this.onSceneReady
    );
  }

  initialize(data = {}) {
    this.clearTimers();

    this.showLabCompletionPhoneCall = Boolean(
      data.fromCrimeLab === true &&
      data.crimeLabCompleted === true &&
      data.showLabCompletionPhoneCall === true
    );

    this.showSuspectTutorial = Boolean(
      data.showSuspectTutorial
    );

    void this.preparePhoneScene();
  }

  preparePhoneScene() {
    const loader = this.scene?.game?.sceneLoader;

    if (!loader) {
      console.error(
        '[CrimeCityTutorialController] SceneLoader is unavailable.'
      );
      return Promise.resolve(false);
    }

    if (loader.has('PhoneCallScene')) {
      return Promise.resolve(true);
    }

    if (this.phoneScenePromise) {
      return this.phoneScenePromise;
    }

    const promise = Promise.resolve()
      .then(() => loader.ensure('PhoneCallScene'))
      .then(() => true)
      .catch((error) => {
        console.error(
          '[CrimeCityTutorialController] Phone preparation failed.',
          error
        );
        return false;
      });

    this.phoneScenePromise = promise;

    void promise.then(() => {
      if (this.phoneScenePromise === promise) {
        this.phoneScenePromise = null;
      }
    });

    return promise;
  }

  hasPhoneDecision() {
    const key = this.scene?.getCaseKey();
    const decision =
      gameState.suspectFilesPhoneDecisions?.[String(key)];

    return decision === 'answer' || decision === 'ignore';
  }

  getCommittedGrid() {
    const key = this.scene?.getCaseKey();

    return (
      gameState.suspectExclusionState?.[key]?.finished === true
    );
  }

  canOfferLabPhone() {
    const scene = this.scene;

    return Boolean(
      scene &&
      !scene._cleanupDone &&
      scene.sys.isActive() &&
      !scene.isTransitioning &&
      !scene.isVisitingApartment &&
      this.showLabCompletionPhoneCall &&
      scene.isCrimeSceneCompleted() &&
      scene.isCrimeLabCompleted() &&
      !scene.isGridCompleted() &&
      !this.getCommittedGrid() &&
      !scene.hasVisitedApartment() &&
      !this.hasPhoneDecision()
    );
  }

  startProgressSync() {
    this.syncTimer?.remove(false);

    if (!this.scene || this.scene._cleanupDone) {
      return;
    }

    this.syncTimer = this.scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.syncProgress()
    });

    this.syncProgress();
  }

  syncProgress() {
    const scene = this.scene;

    if (
      !scene ||
      scene._cleanupDone ||
      !scene.sys.isActive()
    ) {
      return;
    }

    const tutorialState = gameState.onboarding?.crimeCity;

    if (!tutorialState || tutorialState.completed) {
      return;
    }

    const before = tutorialState.step;
    const caseKey = scene.getCaseKey();

    const reconstruction =
      gameState.reconstructedHeists?.[caseKey] ||
      gameState.reconstructedHeist;

    if (
      tutorialState.step === 'hypothesis' &&
      reconstruction?.playerTheoryResult
    ) {
      advanceCrimeTutorial(gameState, 'hypothesis');
    }

    if (this.getCommittedGrid()) {
      if (tutorialState.step === 'suspects') {
        advanceCrimeTutorial(gameState, 'suspects');
      }

      if (tutorialState.step === 'suspect_grid') {
        advanceCrimeTutorial(gameState, 'suspect_grid');
      }

      this.showSuspectTutorial = false;
      this.suspectTutorialTimer?.remove(false);
      this.suspectTutorialTimer = null;
    }

    const tutorial = scene.crimeTutorial;

    if (
      tutorial?.isActive() &&
      tutorial.getStep() !== tutorialState.step
    ) {
      tutorial.setStep(tutorialState.step);
    }

    if (before !== tutorialState.step) {
      requestAutosave();
    }

    this.syncNpcHotspot();
  }

  syncNpcHotspot() {
    const scene = this.scene;
    const tutorial = scene?.crimeTutorial;

    if (
      !tutorial?.isActive() ||
      tutorial.getStep() !== 'talk_to_npcs'
    ) {
      this.npcTarget = null;
      return;
    }

    const icons = (
      scene.npcManager?.createdObjects || []
    ).filter((object) =>
      object?.active &&
      object.visible &&
      object.input?.enabled &&
      object.type === 'Image' &&
      typeof object.getBounds === 'function'
    );

    const target =
      icons.find((object) => object.alpha > 0.9) ||
      icons[0];

    if (!target) {
      if (this.npcTarget) {
        tutorial.unregisterHotspot('city-npc');
        tutorial.clearHighlight();
        this.npcTarget = null;
      }
      return;
    }

    const bounds = target.getBounds();

    const signature = [
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    ].map(Math.round).join(':');

    if (
      this.npcTarget?.object === target &&
      this.npcTarget.signature === signature
    ) {
      return;
    }

    tutorial.registerHotspot('city-npc', {
      scene,
      hotspotData: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      },
      scrollFactorX: target.scrollFactorX ?? 1,
      scrollFactorY: target.scrollFactorY ?? 1
    });

    this.npcTarget = { object: target, signature };
  }

  scheduleLabCompletionPhoneCall() {
    if (
      this.phoneCallPending ||
      !this.canOfferLabPhone()
    ) {
      return;
    }

    const scene = this.scene;
    const token = this.lifecycleToken;
    const caseKey = scene.getCaseKey();
    const scheduledAt = performance.now();
    const readyPromise = this.preparePhoneScene();

    this.phoneCallPending = true;

    this.phoneCallTimer = scene.time.delayedCall(
      LAB_PHONE_DELAY_MS,
      () => {
        this.phoneCallTimer = null;

        void this.launchPreparedPhone({
          scene,
          token,
          caseKey,
          scheduledAt,
          readyPromise
        });
      }
    );
  }

  async launchPreparedPhone({
    scene,
    token,
    caseKey,
    scheduledAt,
    readyPromise
  }) {
    try {
      const ready = await readyPromise;

      if (
        this.lifecycleToken !== token ||
        this.scene !== scene ||
        scene.getCaseKey() !== caseKey ||
        !this.canOfferLabPhone()
      ) {
        return;
      }

      if (!ready) {
        scene.showMessage(
          'HQ could not connect.\nLeave and re-enter the Crime Lab to retry.',
          3500,
          '#8b0000'
        );
        return;
      }

      if (
        scene.scene.isActive('PhoneCallScene') ||
        scene.scene.isPaused('PhoneCallScene') ||
        scene.scene.isSleeping('PhoneCallScene')
      ) {
        return;
      }

      scene.closeAllUIPanels();

      scene.scene.launch('PhoneCallScene', {
        labCompletionCall: true,
        sourceScene: 'CrimeCityScene',
        cityId: scene.cityId,
        caseKey,
        scheduledAt,
        returnScene: 'CrimeCityScene',
        returnData: { cityId: scene.cityId }
      });

      this.showLabCompletionPhoneCall = false;
    } catch (error) {
      console.error(
        '[CrimeCityTutorialController] Lab phone failed.',
        error
      );
    } finally {
      if (this.lifecycleToken === token) {
        this.phoneCallPending = false;
      }
    }
  }

  scheduleSuspectTutorial() {
    if (this.getCommittedGrid()) {
      this.showSuspectTutorial = false;
      return;
    }

    if (
      !this.showSuspectTutorial ||
      !this.scene.isCrimeLabCompleted() ||
      !this.scene.isGridCompleted()
    ) {
      return;
    }

    this.showSuspectTutorial = false;

    this.suspectTutorialTimer =
      this.scene.time.delayedCall(700, () => {
        this.suspectTutorialTimer = null;

        if (
          !this.scene?.scene.isActive('CrimeCityScene') ||
          this.getCommittedGrid()
        ) {
          return;
        }

        this.showSuspectFilesTutorial();
      });
  }

  showSuspectFilesTutorial() {
    if (this.getCommittedGrid()) {
      return;
    }

    const scene = this.scene;
    const { width, height } = scene.scale;

    const overlay = scene.add.rectangle(
      width / 2, height / 2,
      width, height, 0x000000, 0.76
    ).setDepth(500).setInteractive();

    const panel = scene.add.rectangle(
      width / 2, height / 2,
      720, 330, 0x1d2733, 0.98
    ).setStrokeStyle(4, 0xd4af37).setDepth(501);

    const title = scene.add.text(
      width / 2, height / 2 - 120,
      'NEW LEAD: SUSPECT FILES',
      {
        fontFamily: 'PressStart2P',
        fontSize: '20px',
        color: '#ffe066',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(502);

    const body = scene.add.text(
      width / 2, height / 2 - 25,
      [
        'The lab report is in, detective.',
        '',
        'Open Suspect Files and eliminate anyone',
        'who cannot match the forensic evidence',
        'and the reconstructed method of the theft.',
        '',
        'Science has spoken.',
        'Now make the suspects uncomfortable.'
      ].join('\n'),
      {
        fontFamily: 'SpecialElite',
        fontSize: '21px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8
      }
    ).setOrigin(0.5).setDepth(502);

    const button = scene.add.text(
      width / 2, height / 2 + 118,
      'OPEN SUSPECT FILES',
      {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#17202a',
        backgroundColor: '#f1c94b',
        padding: {
          left: 20, right: 20,
          top: 14, bottom: 14
        }
      }
    ).setOrigin(0.5).setDepth(502)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      button.setStyle({
        backgroundColor: '#ffe066',
        color: '#000000'
      });
    });

    button.on('pointerout', () => {
      button.setStyle({
        backgroundColor: '#f1c94b',
        color: '#17202a'
      });
    });

    button.on('pointerdown', () => {
      if (
        !Array.isArray(gameState.caseSuspects) ||
        !gameState.caseSuspects.length
      ) {
        scene.showMessage(
          'Suspect files are still being assembled.\nBureaucracy has entered its larval stage.',
          2800,
          '#5d2a00'
        );
        return;
      }

      for (const object of [
        overlay, panel, title, body, button
      ]) {
        object.destroy();
      }

      scene.closeAllUIPanels();

      scene.transitionTo('SuspectsScene', {
        cityId: scene.cityId,
        returnScene: 'CrimeCityScene',
        returnData: { cityId: scene.cityId },
        sourceScene: 'CrimeCityScene',
        caseSuspects: gameState.caseSuspects,
        identityEvidence: gameState.identityEvidence,
        identityEvidenceResult:
          gameState.identityEvidenceResult,
        hypothesisEvidence: gameState.hypothesisEvidence,
        hypothesisEvidenceResult:
          gameState.hypothesisEvidenceResult,
        forensicResults: gameState.forensicResults || [],
        gameState
      });
    });
  }

  clearTimers() {
    this.lifecycleToken += 1;
    this.phoneCallPending = false;

    this.phoneCallTimer?.remove(false);
    this.phoneCallTimer = null;

    this.suspectTutorialTimer?.remove(false);
    this.suspectTutorialTimer = null;

    this.syncTimer?.remove(false);
    this.syncTimer = null;
  }

  destroy() {
    this.clearTimers();

    this.scene?.events.off(
      Phaser.Scenes.Events.CREATE,
      this.onSceneReady
    );

    this.scene?.crimeTutorial
      ?.unregisterHotspot('city-npc');

    this.npcTarget = null;
    this.phoneScenePromise = null;
    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;
    this.scene = null;
  }
}