import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { advanceCrimeTutorial } from '../../CrimeCityTutorial.js';

export class CrimeCityTutorialController {
  constructor(scene) {
    this.scene = scene;
    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;
    this.phoneCallTimer = null;
    this.suspectTutorialTimer = null;
    this.syncTimer = null;
    this.npcTarget = null;
    this.onSceneReady = () => this.startProgressSync();
    scene.events.on(Phaser.Scenes.Events.CREATE, this.onSceneReady);
  }

  initialize(data = {}) {
    this.clearTimers();
    this.showLabCompletionPhoneCall = Boolean(data.showLabCompletionPhoneCall && data.crimeLabCompleted);
    this.showSuspectTutorial = Boolean(data.showSuspectTutorial);
  }

  startProgressSync() {
    this.syncTimer?.remove(false);
    if (!this.scene || this.scene._cleanupDone) return;
    this.syncTimer = this.scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.syncProgress()
    });
    this.syncProgress();
  }

  getCommittedGrid() {
    const key = this.scene?.getCaseKey();
    const exclusion = gameState.suspectExclusionState?.[key];
    return exclusion?.finished === true;
  }

  syncProgress() {
    const scene = this.scene;
    if (!scene || scene._cleanupDone || !scene.sys.isActive()) return;
    const tutorialState = gameState.onboarding?.crimeCity;
    if (!tutorialState || tutorialState.completed) return;
    const before = tutorialState.step;
    const caseKey = scene.getCaseKey();
    const reconstruction = gameState.reconstructedHeists?.[caseKey] || gameState.reconstructedHeist;
    if (tutorialState.step === 'hypothesis' && reconstruction?.playerTheoryResult) {
      advanceCrimeTutorial(gameState, 'hypothesis');
    }
    if (this.getCommittedGrid()) {
      if (tutorialState.step === 'suspects') advanceCrimeTutorial(gameState, 'suspects');
      if (tutorialState.step === 'suspect_grid') advanceCrimeTutorial(gameState, 'suspect_grid');
      this.showSuspectTutorial = false;
      this.suspectTutorialTimer?.remove(false);
      this.suspectTutorialTimer = null;
    }
    const tutorial = scene.crimeTutorial;
    if (tutorial?.isActive() && tutorial.getStep() !== tutorialState.step) {
      tutorial.setStep(tutorialState.step);
    }
    if (before !== tutorialState.step) requestAutosave();
    this.syncNpcHotspot();
  }

  syncNpcHotspot() {
    const scene = this.scene;
    const tutorial = scene?.crimeTutorial;
    if (!tutorial?.isActive() || tutorial.getStep() !== 'talk_to_npcs') {
      this.npcTarget = null;
      return;
    }
    // The manager owns the currently displayed, accessible alibi NPC icons.
    const icons = (scene.npcManager?.createdObjects || []).filter(object =>
      object?.active && object.visible && object.input?.enabled &&
      object.type === 'Image' && typeof object.getBounds === 'function'
    );
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
    const zone = {
      scene,
      hotspotData: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      scrollFactorX: target.scrollFactorX ?? 1,
      scrollFactorY: target.scrollFactorY ?? 1
    };
    tutorial.registerHotspot('city-npc', zone);
    this.npcTarget = { object: target, signature };
  }

  scheduleLabCompletionPhoneCall() {
    if (!this.showLabCompletionPhoneCall) return;
    if (!this.scene.isCrimeLabCompleted()) {
      console.warn('[CrimeCityTutorialController] Phone call skipped: Crime Lab is not marked complete.');
      return;
    }
    this.showLabCompletionPhoneCall = false;
    this.phoneCallTimer = this.scene.time.delayedCall(250, async () => {
      this.phoneCallTimer = null;
      if (!this.scene?.scene?.isActive('CrimeCityScene')) return;
      try {
        await this.scene.game.sceneLoader.ensure('PhoneCallScene');
      } catch (error) {
        console.error('[CrimeCityTutorialController] Failed to load PhoneCallScene.', error);
        return;
      }
      if (!this.scene?.scene?.isActive('CrimeCityScene')) return;
      if (this.scene.scene.isActive('PhoneCallScene')) return;
      this.scene.closeAllUIPanels();
      this.scene.scene.launch('PhoneCallScene', {
        sourceScene: 'CrimeCityScene',
        cityId: this.scene.cityId,
        caseKey: this.scene.getCaseKey(),
        returnScene: 'CrimeCityScene',
        returnData: { cityId: this.scene.cityId }
      });
    });
  }

  scheduleSuspectTutorial() {
    if (this.getCommittedGrid()) {
      this.showSuspectTutorial = false;
      return;
    }
    if (!this.showSuspectTutorial) return;
    if (!this.scene.isCrimeLabCompleted() || !this.scene.isGridCompleted()) return;
    this.showSuspectTutorial = false;
    this.suspectTutorialTimer = this.scene.time.delayedCall(700, () => {
      this.suspectTutorialTimer = null;
      if (!this.scene?.scene.isActive('CrimeCityScene') || this.getCommittedGrid()) return;
      this.showSuspectFilesTutorial();
    });
  }

  showSuspectFilesTutorial() {
    if (this.getCommittedGrid()) return;
    const { width, height } = this.scene.scale;
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.76)
      .setDepth(500).setInteractive();
    const panel = this.scene.add.rectangle(width / 2, height / 2, 720, 330, 0x1d2733, 0.98)
      .setStrokeStyle(4, 0xd4af37).setDepth(501);
    const title = this.scene.add.text(width / 2, height / 2 - 120, 'NEW LEAD: SUSPECT FILES', {
      fontFamily: 'PressStart2P', fontSize: '20px', color: '#ffe066', align: 'center'
    }).setOrigin(0.5).setDepth(502);
    const body = this.scene.add.text(width / 2, height / 2 - 25, [
      'The lab report is in, detective.', '',
      'Open Suspect Files and eliminate anyone',
      'who cannot match the forensic evidence',
      'and the reconstructed method of the theft.', '',
      'Science has spoken.', 'Now make the suspects uncomfortable.'
    ].join('\n'), {
      fontFamily: 'SpecialElite', fontSize: '21px', color: '#ffffff', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setDepth(502);
    const button = this.scene.add.text(width / 2, height / 2 + 118, 'OPEN SUSPECT FILES', {
      fontFamily: 'PressStart2P', fontSize: '14px', color: '#17202a', backgroundColor: '#f1c94b',
      padding: { left: 20, right: 20, top: 14, bottom: 14 }
    }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
    const closeTutorial = () => {
      for (const object of [overlay, panel, title, body, button]) object.destroy();
    };
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#ffe066', color: '#000000' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#f1c94b', color: '#17202a' }));
    button.on('pointerdown', () => {
      closeTutorial();
      if (!Array.isArray(gameState.caseSuspects) || !gameState.caseSuspects.length) {
        this.scene.showMessage('Suspect files are still being assembled.\nBureaucracy has entered its larval stage.', 2800, '#5d2a00');
        return;
      }
      this.scene.closeAllUIPanels();
      this.scene.transitionTo('SuspectsScene', {
        cityId: this.scene.cityId,
        returnScene: 'CrimeCityScene',
        returnData: { cityId: this.scene.cityId },
        sourceScene: 'CrimeCityScene',
        caseSuspects: gameState.caseSuspects,
        identityEvidence: gameState.identityEvidence,
        identityEvidenceResult: gameState.identityEvidenceResult,
        hypothesisEvidence: gameState.hypothesisEvidence,
        hypothesisEvidenceResult: gameState.hypothesisEvidenceResult,
        forensicResults: gameState.forensicResults || [],
        gameState
      });
    });
  }

  clearTimers() {
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
    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;
    this.scene = null;
  }
}
