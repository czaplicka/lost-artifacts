import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../../tutorials/CrimeCityTutorial.js';

const FILE = 'scenes/crimeCity/CrimeCityTutorialController.js';
const text = key => __dialogueText(FILE, key);
const LAB_PHONE_DELAY_MS = 250;
const PHONE_RETRY_DELAY_MS = 3000;
const REST_PENDING = 'hotelRestTutorialPending';
const REST_COMPLETED = 'hotelRestTutorialCompleted';
const HOTEL_TARGET = 'tutorial-rest-hotel';

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
    this.nextPhoneAttemptAt = 0;
    this.lifecycleToken = 0;
    this.npcTarget = null;
    this.restPresentation = null;
    this.onSceneReady = () => this.startProgressSync();
    scene.events.on(Phaser.Scenes.Events.CREATE, this.onSceneReady);
  }

  initialize(data = {}) {
    this.clearTimers();
    this.showLabCompletionPhoneCall = Boolean(data.fromCrimeLab === true &&
      data.crimeLabCompleted === true && data.showLabCompletionPhoneCall === true);
    this.showSuspectTutorial = Boolean(data.showSuspectTutorial);
    const tutorial = gameState.onboarding?.crimeCity;
    if (tutorial && !tutorial.completed && !tutorial.skipped &&
        tutorial.step === 'crime_lab' && data.wokeUp === true &&
        Number(data.sleptHours) > 0) {
      tutorial[REST_COMPLETED] = true;
      tutorial[REST_PENDING] = false;
      requestAutosave();
    }
    void this.preparePhoneScene();
  }

  preparePhoneScene() {
    const loader = this.scene?.game?.sceneLoader;
    if (!loader) {
      console.error('[CrimeCityTutorialController] SceneLoader is unavailable.');
      return Promise.resolve(false);
    }
    if (loader.has('PhoneCallScene')) return Promise.resolve(true);
    if (this.phoneScenePromise) return this.phoneScenePromise;
    const promise = Promise.resolve()
      .then(() => loader.ensure('PhoneCallScene'))
      .then(() => loader.has('PhoneCallScene'))
      .catch(error => {
        console.error('[CrimeCityTutorialController] Phone preparation failed.', error);
        return false;
      });
    this.phoneScenePromise = promise;
    void promise.then(() => {
      if (this.phoneScenePromise === promise) this.phoneScenePromise = null;
    });
    return promise;
  }

  hasPhoneDecision() {
    const key = this.scene?.getCaseKey();
    const decision = gameState.suspectFilesPhoneDecisions?.[String(key)];
    return decision === 'answer' || decision === 'ignore';
  }

  getCommittedGrid() {
    const key = this.scene?.getCaseKey();
    return gameState.suspectExclusionState?.[key]?.finished === true;
  }

  hasPendingLabPhone() {
    const scene = this.scene;
    if (!scene || scene._cleanupDone) return false;
    const key = scene.getCaseKey();
    if (key === null || key === undefined || key === '') return false;
    return Boolean(scene.isCrimeSceneCompleted() && scene.isCrimeLabCompleted() &&
      !scene.isGridCompleted() && !this.getCommittedGrid() &&
      !scene.hasVisitedApartment() && !this.hasPhoneDecision());
  }

  canOfferLabPhone() {
    const scene = this.scene;
    return Boolean(scene && !scene._cleanupDone && scene.sys.isActive() &&
      !scene.isTransitioning && !scene.isVisitingApartment && !scene.isSettingUpUi &&
      this.hasPendingLabPhone());
  }

  startProgressSync() {
    this.syncTimer?.remove(false);
    this.syncTimer = null;
    const scene = this.scene;
    if (!scene || scene._cleanupDone) return;
    this.syncTimer = scene.time.addEvent({
      delay: 250, loop: true, callback: () => this.syncProgress()
    });
    this.syncProgress();
  }

  syncProgress() {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || !scene.sys.isActive()) return;
    this.scheduleLabCompletionPhoneCall();
    const state = gameState.onboarding?.crimeCity;
    if (!state || state.completed || state.skipped) {
      this.restoreRestInstruction();
      return;
    }
    if (this.syncRestInstruction()) return;
    const before = state.step;
    // Use the same case-scoped check as city progression and the lab phone.
    if (state.step === 'hypothesis' && scene.isGridCompleted()) {
      advanceCrimeTutorial(gameState, 'hypothesis');
    }
    if (this.getCommittedGrid()) {
      if (state.step === 'suspects') advanceCrimeTutorial(gameState, 'suspects');
      if (state.step === 'suspect_grid') advanceCrimeTutorial(gameState, 'suspect_grid');
      this.showSuspectTutorial = false;
      this.suspectTutorialTimer?.remove(false);
      this.suspectTutorialTimer = null;
    }
    const tutorial = scene.crimeTutorial;
    if (tutorial?.isActive() && tutorial.getStep() !== state.step) tutorial.setStep(state.step);
    if (before !== state.step) requestAutosave();
    this.syncNpcHotspot();
  }

  syncRestInstruction() {
    const scene = this.scene;
    const state = gameState.onboarding?.crimeCity;
    const needed = Boolean(state && !state.completed && !state.skipped &&
      state.step === 'crime_lab' && !state[REST_COMPLETED] &&
      scene.isCrimeSceneCompleted() && !scene.isCrimeLabCompleted());
    if (!needed) {
      this.restoreRestInstruction();
      return false;
    }
    if (!state[REST_PENDING]) {
      state[REST_PENDING] = true;
      requestAutosave();
    }
    const tutorial = scene.crimeTutorial;
    if (!tutorial?.isActive() || !tutorial.stepContent?.crime_lab) return false;
    if (this.restPresentation?.tutorial !== tutorial) {
      this.restoreRestInstruction();
      const original = tutorial.stepContent.crime_lab;
      const replacement = {
        ...original,
        title: 'TIME TO REST',
        objective: 'Go to the hotel and get some sleep before visiting CSI.',
        hint: 'Energy runs out. Hotel sleep restores it, but uses case time. Even detectives need a pillow.',
        targetHotspot: HOTEL_TARGET
      };
      this.restPresentation = { tutorial, original, replacement, signature: null, target: null };
      tutorial.stepContent.crime_lab = replacement;
    }
    const presentation = this.restPresentation;
    const position = scene.crimeCityConfig?.hotel;
    let signature = '';
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      signature = `${position.x}:${position.y}`;
      if (presentation.signature !== signature) {
        presentation.target = {
          scene,
          scrollFactorX: 1,
          scrollFactorY: 1,
          hotspotData: { x: position.x - 66, y: position.y - 66, width: 132, height: 132 }
        };
        tutorial.registerHotspot(HOTEL_TARGET, presentation.target);
        presentation.signature = signature;
      }
    }
    if (tutorial.getStep() !== 'crime_lab') tutorial.setStep('crime_lab');
    tutorial.updateOverlay(presentation.replacement);
    if (presentation.target && !tutorial.highlight?.scene) tutorial.highlightHotspot(HOTEL_TARGET);
    return true;
  }

  restoreRestInstruction() {
    const presentation = this.restPresentation;
    this.restPresentation = null;
    if (!presentation) return;
    const { tutorial, original, replacement } = presentation;
    if (!tutorial || tutorial.destroyed) return;
    if (tutorial.stepContent?.crime_lab === replacement) tutorial.stepContent.crime_lab = original;
    if (tutorial.hotspots?.get(HOTEL_TARGET) === presentation.target) tutorial.unregisterHotspot(HOTEL_TARGET);
    if (tutorial.isActive() && tutorial.getStep() === 'crime_lab') {
      tutorial.updateOverlay(tutorial.stepContent.crime_lab);
      tutorial.highlightHotspot(tutorial.stepContent.crime_lab.targetHotspot);
    }
  }

  syncNpcHotspot() {
    const scene = this.scene;
    const tutorial = scene?.crimeTutorial;
    if (!tutorial?.isActive() || tutorial.getStep() !== 'talk_to_npcs') {
      this.npcTarget = null;
      return;
    }
    const icons = (scene.npcManager?.createdObjects || []).filter(object =>
      object?.active && object.visible && object.input?.enabled &&
      object.type === text('t_1aa4cb0bcca76e92e306') && typeof object.getBounds === 'function');
    const target = icons.find(object => object.alpha > 0.9) || icons[0];
    if (!target) {
      if (this.npcTarget) {
        tutorial.unregisterHotspot('city-npc');
        tutorial.clearHighlight();
        this.npcTarget = null;
      }
      return;
    }
    const bounds = target.getBounds();
    const signature = [bounds.x, bounds.y, bounds.width, bounds.height].map(Math.round).join(':');
    if (this.npcTarget?.object === target && this.npcTarget.signature === signature) return;
    tutorial.registerHotspot('city-npc', {
      scene,
      hotspotData: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      scrollFactorX: target.scrollFactorX ?? 1,
      scrollFactorY: target.scrollFactorY ?? 1
    });
    this.npcTarget = { object: target, signature };
  }

  scheduleLabCompletionPhoneCall() {
    const scene = this.scene;
    if (!scene || this.phoneCallPending || scene.time.now < this.nextPhoneAttemptAt || !this.canOfferLabPhone()) return;
    const token = this.lifecycleToken;
    const caseKey = scene.getCaseKey();
    const scheduledAt = performance.now();
    const readyPromise = this.preparePhoneScene();
    this.phoneCallPending = true;
    this.phoneCallTimer = scene.time.delayedCall(LAB_PHONE_DELAY_MS, () => {
      this.phoneCallTimer = null;
      void this.launchPreparedPhone({ scene, token, caseKey, scheduledAt, readyPromise });
    });
  }

  async launchPreparedPhone({ scene, token, caseKey, scheduledAt, readyPromise }) {
    try {
      const ready = await readyPromise;
      if (this.lifecycleToken !== token || this.scene !== scene ||
          scene.getCaseKey() !== caseKey || !this.canOfferLabPhone()) return;
      if (!ready) {
        this.nextPhoneAttemptAt = scene.time.now + PHONE_RETRY_DELAY_MS;
        scene.showMessage(text('t_a487b8454373f3ea6d7d'), 2500, text('t_f27f7bc32875ed02b2fc'));
        return;
      }
      if (scene.scene.isActive('PhoneCallScene') || scene.scene.isPaused('PhoneCallScene') ||
          scene.scene.isSleeping('PhoneCallScene')) return;
      scene.closeAllUIPanels();
      scene.scene.launch('PhoneCallScene', {
        labCompletionCall: true, sourceScene: 'CrimeCityScene', cityId: scene.cityId,
        caseKey, scheduledAt, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId }
      });
      scene.scene.bringToTop('PhoneCallScene');
      this.showLabCompletionPhoneCall = false;
      this.nextPhoneAttemptAt = scene.time.now + PHONE_RETRY_DELAY_MS;
    } catch (error) {
      console.error('[CrimeCityTutorialController] Lab phone failed.', error);
      if (this.lifecycleToken === token && this.scene === scene) {
        this.nextPhoneAttemptAt = scene.time.now + PHONE_RETRY_DELAY_MS;
      }
    } finally {
      if (this.lifecycleToken === token) this.phoneCallPending = false;
    }
  }

  scheduleSuspectTutorial() {
    if (this.getCommittedGrid()) { this.showSuspectTutorial = false; return; }
    if (!this.showSuspectTutorial || !this.scene.isCrimeLabCompleted() || !this.scene.isGridCompleted()) return;
    this.showSuspectTutorial = false;
    this.suspectTutorialTimer = this.scene.time.delayedCall(700, () => {
      this.suspectTutorialTimer = null;
      if (!this.scene?.scene.isActive('CrimeCityScene') || this.getCommittedGrid()) return;
      this.showSuspectFilesTutorial();
    });
  }

  showSuspectFilesTutorial() {
    if (this.getCommittedGrid()) return;
    const scene = this.scene;
    const { width, height } = scene.scale;
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.76)
      .setDepth(500).setInteractive();
    const panel = scene.add.rectangle(width / 2, height / 2, 720, 330, 0x1d2733, 0.98)
      .setStrokeStyle(4, 0xd4af37).setDepth(501);
    const title = scene.add.text(width / 2, height / 2 - 120, text('t_aaaf9ef538033159d8e4'), {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#ffe066', align: 'center'
    }).setOrigin(0.5).setDepth(502);
    const body = scene.add.text(width / 2, height / 2 - 25, [
      text('t_e64e7a674ae19dda3adb'), '', text('t_2d0b80effec92369774a'),
      text('t_74c6c0e1f57701c4c8db'), text('t_87bb784229967b35e5aa'), '',
      text('t_96486b81d1aa93ccff3d'), text('t_0e4b12c847d153bebc0a')
    ].join(text('t_01ba4719c80b6fe911b0')), {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#ffffff', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setDepth(502);
    const button = scene.add.text(width / 2, height / 2 + 118, text('t_7de9537f7eec93d33255'), {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#17202a', backgroundColor: '#f1c94b',
      padding: { left: 20, right: 20, top: 14, bottom: 14 }
    }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#ffe066', color: '#000000' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#f1c94b', color: '#17202a' }));
    button.on('pointerdown', () => {
      if (!Array.isArray(gameState.caseSuspects) || !gameState.caseSuspects.length) {
        scene.showMessage(text('t_7b4054d6d1e056ee6763') + text('t_7e1ca5374a0b0b18c2e4'),
          2800, text('t_e09afad9b0dfcb2294f9'));
        return;
      }
      for (const object of [overlay, panel, title, body, button]) object.destroy();
      scene.closeAllUIPanels();
      scene.transitionTo('SuspectsScene', {
        cityId: scene.cityId, returnScene: 'CrimeCityScene', returnData: { cityId: scene.cityId },
        sourceScene: 'CrimeCityScene', caseSuspects: gameState.caseSuspects,
        identityEvidence: gameState.identityEvidence, identityEvidenceResult: gameState.identityEvidenceResult,
        hypothesisEvidence: gameState.hypothesisEvidence, hypothesisEvidenceResult: gameState.hypothesisEvidenceResult,
        forensicResults: gameState.forensicResults || [], gameState
      });
    });
  }

  clearTimers() {
    ++this.lifecycleToken;
    this.restoreRestInstruction();
    this.phoneCallPending = false;
    this.nextPhoneAttemptAt = 0;
    this.phoneCallTimer?.remove(false);
    this.phoneCallTimer = null;
    this.suspectTutorialTimer?.remove(false);
    this.suspectTutorialTimer = null;
    this.syncTimer?.remove(false);
    this.syncTimer = null;
  }

  destroy() {
    this.clearTimers();
    this.scene?.events.off(Phaser.Scenes.Events.CREATE, this.onSceneReady);
    this.scene?.crimeTutorial?.unregisterHotspot('city-npc');
    this.npcTarget = null;
    this.phoneScenePromise = null;
    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;
    this.scene = null;
  }
}
