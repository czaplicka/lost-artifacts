import { gameState } from '../../GameData.js';

export class CrimeCityTutorialController {
  constructor(scene) {
    this.scene = scene;

    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;

    this.phoneCallTimer = null;
    this.suspectTutorialTimer = null;
  }

  initialize(data = {}) {
    this.clearTimers();

    this.showLabCompletionPhoneCall = Boolean(
      data.showLabCompletionPhoneCall &&
      data.crimeLabCompleted
    );

    this.showSuspectTutorial = Boolean(
      data.showSuspectTutorial
    );
  }

  scheduleLabCompletionPhoneCall() {
    if (!this.showLabCompletionPhoneCall) {
      return;
    }

    if (!this.scene.isCrimeLabCompleted()) {
      console.warn(
        '[CrimeCityTutorialController] Phone call skipped: Crime Lab is not marked complete.'
      );

      return;
    }

    if (!this.scene.scene.manager.keys.PhoneCallScene) {
      console.error(
        '[CrimeCityTutorialController] PhoneCallScene is not registered.'
      );

      return;
    }

    this.showLabCompletionPhoneCall = false;

    this.phoneCallTimer = this.scene.time.delayedCall(
      650,
      () => {
        this.phoneCallTimer = null;

        if (!this.scene.scene.isActive('CrimeCityScene')) {
          return;
        }

        if (this.scene.scene.isActive('PhoneCallScene')) {
          return;
        }

        this.scene.closeAllUIPanels();

        this.scene.scene.launch('PhoneCallScene', {
          sourceScene: 'CrimeCityScene',
          cityId: this.scene.cityId,
          caseKey: this.scene.getCaseKey(),
          returnScene: 'CrimeCityScene',
          returnData: {
            cityId: this.scene.cityId
          }
        });
      }
    );
  }

  scheduleSuspectTutorial() {
    if (!this.showSuspectTutorial) {
      return;
    }

    if (
      !this.scene.isCrimeLabCompleted() ||
      !this.scene.isGridCompleted()
    ) {
      return;
    }

    this.showSuspectTutorial = false;

    this.suspectTutorialTimer = this.scene.time.delayedCall(
      700,
      () => {
        this.suspectTutorialTimer = null;

        if (!this.scene.scene.isActive('CrimeCityScene')) {
          return;
        }

        this.showSuspectFilesTutorial();
      }
    );
  }

  showSuspectFilesTutorial() {
    const { width, height } = this.scene.scale;

    const overlay = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0x000000,
        0.76
      )
      .setDepth(500)
      .setInteractive();

    const panel = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        720,
        330,
        0x1d2733,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37)
      .setDepth(501);

    const title = this.scene.add
      .text(
        width / 2,
        height / 2 - 120,
        'NEW LEAD: SUSPECT FILES',
        {
          fontFamily: 'Press Start 2P',
          fontSize: '20px',
          color: '#ffe066',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(502);

    const body = this.scene.add
      .text(
        width / 2,
        height / 2 - 25,
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
          fontFamily: 'Special Elite',
          fontSize: '21px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 8
        }
      )
      .setOrigin(0.5)
      .setDepth(502);

    const button = this.scene.add
      .text(
        width / 2,
        height / 2 + 118,
        'OPEN SUSPECT FILES',
        {
          fontFamily: 'Press Start 2P',
          fontSize: '14px',
          color: '#17202a',
          backgroundColor: '#f1c94b',
          padding: {
            left: 20,
            right: 20,
            top: 14,
            bottom: 14
          }
        }
      )
      .setOrigin(0.5)
      .setDepth(502)
      .setInteractive({
        useHandCursor: true
      });

    const closeTutorial = () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      body.destroy();
      button.destroy();
    };

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
      closeTutorial();

      if (
        !Array.isArray(gameState.caseSuspects) ||
        !gameState.caseSuspects.length
      ) {
        this.scene.showMessage(
          [
            'Suspect files are still being assembled.',
            'Bureaucracy has entered its larval stage.'
          ].join('\n'),
          2800,
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
    });
  }

  clearTimers() {
    this.phoneCallTimer?.remove(false);
    this.phoneCallTimer = null;

    this.suspectTutorialTimer?.remove(false);
    this.suspectTutorialTimer = null;
  }

  destroy() {
    this.clearTimers();

    this.showLabCompletionPhoneCall = false;
    this.showSuspectTutorial = false;

    this.scene = null;
  }
}