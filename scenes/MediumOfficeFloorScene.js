import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { MediumOfficeScene } from './MediumOfficeScene.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { MEDIUM_OFFICE_CONFIG } from '../config/mediumOfficeConfig.js';
import { getGordonInterviewState } from '../gordonInterviewService.js';
import { getMedicalReviewStory, medicalReviewData } from '../medicalReviewService.js';

const FILE = 'scenes/MediumOfficeFloorScene.js';
const text = key => __dialogueText(FILE, key);

const VISIT_FLAGS = Object.freeze({
  medium: 'agencyMapVisitedMediumOffice',
  hr: 'agencyMapVisitedHR',
  medical: 'agencyMapVisitedDoctor'
});

function recordOfficeVisit(kind) {
  const flag = VISIT_FLAGS[kind];
  if (!flag || MainStoryManager.hasFlag(flag)) return;

  MainStoryManager.setFlag(flag, true);
  requestAutosave();
}

export class MediumOfficeFloorScene extends MediumOfficeScene {
  init(data = {}) {
    super.init(data);
    this.hrOpening = false;
    this.gordonOpening = false;
    this.medicalOpening = false;
    this.hrEntry = null;
    this.gordonEntry = null;
    this.medicalEntry = null;
    this.mapVisitPreview = data.preview === true;
  }

  create() {
    super.create();

    const make = (y, label, callback) => {
      const entry = this.add.text(
        MEDIUM_OFFICE_CONFIG.width - 30,
        y,
        label,
        this.style(23)
      ).setOrigin(1, 0).setInteractive({ useHandCursor: true });

      this.root.add(entry);

      entry.on('pointerover', () => {
        if (!this.uiLocked) entry.setColor('#ffffff');
      });
      entry.on('pointerout', () => entry.setColor('#ffe5ae'));
      entry.on('pointerdown', callback);

      return entry;
    };

    this.hrEntry = make(30, text('t_3b86c6e4d138d2604e3a'), () => {
      void this.openHR();
    });
    this.gordonEntry = make(85, text('t_e6ea8e744b05611bbed5'), () => {
      void this.openGordon();
    });
    this.medicalEntry = make(140, text('t_782fb42ff2ccea59537b'), () => {
      void this.openMedical();
    });

    this.refreshPanelLock();

    if (this.allowed && !this.debugMode && !this.mapVisitPreview) {
      recordOfficeVisit('medium');
    }
  }

  refreshPanelLock() {
    super.refreshPanelLock();

    if (this.hrOpening || this.gordonOpening || this.medicalOpening) {
      this.applyLock(true);
    }

    const available = this.allowed && !this.debugMode;
    const usable = available && !this.uiLocked && !this.leaving;

    if (this.hrEntry) {
      this.hrEntry.setVisible(available);
      if (this.hrEntry.input) this.hrEntry.input.enabled = usable;
    }

    if (this.gordonEntry) {
      const unlocked = available && getGordonInterviewState().unlocked;
      this.gordonEntry.setVisible(unlocked);
      if (this.gordonEntry.input) this.gordonEntry.input.enabled = unlocked && usable;
    }

    if (this.medicalEntry) {
      const unlocked = available && getMedicalReviewStory().eligible;
      this.medicalEntry.setVisible(unlocked);
      if (this.medicalEntry.input) this.medicalEntry.input.enabled = unlocked && usable;
    }
  }

  async openHR() {
    await this.openUpperRoom('hr');
  }

  async openGordon() {
    await this.openUpperRoom('gordon');
  }

  async openMedical() {
    await this.openUpperRoom('medical');
  }

  async openUpperRoom(kind) {
    if (
      !['hr', 'gordon', 'medical'].includes(kind) ||
      !this.isOfficeActive() ||
      !this.allowed ||
      this.uiLocked ||
      this.debugMode ||
      this.hrOpening ||
      this.gordonOpening ||
      this.medicalOpening
    ) return;

    if (kind === 'gordon' && !getGordonInterviewState().unlocked) return;
    if (kind === 'medical' && !getMedicalReviewStory().eligible) return;

    const token = this._runToken;
    const flag = {
      hr: 'hrOpening',
      gordon: 'gordonOpening',
      medical: 'medicalOpening'
    }[kind];

    this[flag] = true;
    this.refreshPanelLock();
    this.tooltip?.setVisible(false);

    try {
      const module = kind === 'hr'
        ? await import('../margeHRLauncher.js')
        : kind === 'gordon'
          ? await import('../gordonInterviewLauncher.js')
          : await import('../medicalReviewLauncher.js');

      if (!this.isCurrentOfficeRun(token) || !this.sys.isActive()) return;

      const launch = kind === 'hr'
        ? module.openMargeHR
        : kind === 'gordon'
          ? module.openGordonInterview
          : module.openMedicalReview;

      const opened = launch(this.game, {
        preview: false,
        returnSceneKey: 'MediumOfficeScene',
        onFinished: result => {
          if (!this.isCurrentOfficeRun(token)) return;

          this[flag] = false;
          this.registry.set('currentSceneKey', 'MediumOfficeScene');
          this.refreshPanelLock();

          if (kind === 'gordon' && result?.completed) {
            this.showOfficeStatusMessage(result.saved === false
              ? text('t_ecbb454f323cd0192300')
              : text('t_e24538ce9dca75fbd8be'));
          }

          if (kind === 'medical') {
            this.showOfficeStatusMessage(result?.completed
              ? result.saved === false
                ? medicalReviewData.messages.saveFailed
                : medicalReviewData.messages.complete
              : text('t_9f323d5d6396d2a5a295'));
          }
        }
      });

      if (!opened) throw new Error('This room is already open or unavailable.');

      if (!this.mapVisitPreview) recordOfficeVisit(kind);
    } catch (error) {
      console.error('[MediumOfficeFloorScene]', kind, error);

      if (this.isCurrentOfficeRun(token)) {
        this[flag] = false;
        this.refreshPanelLock();
        this.showOfficeStatusMessage(
          error.message || text('t_41114f31774aa2f93ba6')
        );
      }
    }
  }

  async returnDownstairs() {
    if (
      !this.isOfficeActive() ||
      this.uiLocked ||
      this.debugMode ||
      this.hrOpening ||
      this.gordonOpening ||
      this.medicalOpening
    ) return;

    this.leaving = true;
    this.refreshPanelLock();
    saveGameState();

    try {
      const opened = await this.goto('OfficeScene', {
        gameState: this.gameState,
        entryView: 'elevator'
      });

      if (opened === false && !this.disposed) {
        this.leaving = false;
        this.refreshPanelLock();
        this.showOfficeStatusMessage(text('t_288e37be0f0f2573f5eb'));
      }
    } catch (error) {
      if (!this.disposed) {
        this.leaving = false;
        this.refreshPanelLock();
        this.showOfficeStatusMessage(error.message);
      }
    }
  }
}