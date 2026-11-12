import { DetectiveOfficeScene as OriginalOfficeScene } from './DetectiveOfficeScene.js';
import { PIOfficeAnimations } from './pi-office/PIOfficeAnimations.js';
import { getHollySurvivalState, hollySurvivalData } from '../hollySurvivalUpdateService.js';
import { getHollyFinancialState, hollyFinancialData } from '../hollyFinancialLeadService.js';
import { getFinancialTraceStory } from '../financialTraceService.js';
import { getHollyResumeEntry } from '../hollyCaseHubService.js';

export class DetectiveOfficeScene extends OriginalOfficeScene {
  init(data = {}) {
    super.init(data);
    this._hollyUpdateOpening = false;
    this.financeEntry = null;
    this.hollyEntry = null;
    this.warsawEntry = null;
  }

  create() {
    super.create();
    this.piOfficeAnimations = new PIOfficeAnimations(this);

    const entry = (label, action) => {
      const button = this.add.text(0, 20, label, {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#ffe2ae',
        backgroundColor: '#193023',
        padding: { x: 14, y: 10 }
      })
        .setOrigin(1, 0)
        .setDepth(1400)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      button.on('pointerdown', action);
      return button;
    };

    this.financeEntry = entry('FINANCIAL TRAIL', () => {
      void this.openFinancialTrace();
    });
    this.hollyEntry = entry('HOLLY / CASE FILE', () => {
      void this.openHollyCase();
    });
    this.warsawEntry = this.hollyEntry;
    this.layoutOffice();
  }

  rebuildOffice() {
    if (this.disposed || this._cleanupDone) return;

    // Integracja notatnika usuwa officeTitle podczas createPanels().
    // Kod bazowy nadal go aktualizuje: odtwarzamy niewidoczną etykietę.
    if (!this.officeTitle || !this.officeTitle.scene) {
      this.officeTitle = this.add
        .text(16, 16, '', this.style(14))
        .setDepth(100)
        .setVisible(false);
    }

    super.rebuildOffice();
  }

  update() {
    super.update();
    if (this.disposed) return;

    if (this.financeEntry) {
      const story = getFinancialTraceStory();
      const visible = story.eligible && this.canUseOffice() && !this.debugMode;
      this.financeEntry
        .setText(story.companyCompleted && this.scale.width >= 600
          ? 'REVIEW FINANCIAL TRAIL' : 'FINANCIAL TRAIL')
        .setVisible(visible);
      if (this.financeEntry.input) this.financeEntry.input.enabled = visible;
    }

    if (this.hollyEntry) {
      const entry = getHollyResumeEntry();
      const visible = Boolean(entry && this.canUseOffice() && !this.debugMode);
      this.hollyEntry.setText(entry?.label || 'HOLLY / CASE FILE').setVisible(visible);
      if (this.hollyEntry.input) this.hollyEntry.input.enabled = visible;
    }
  }

  openPhone() {
    if (this._hollyUpdateOpening || !this.canUseOffice() || this.debugMode) return;
    if (getHollySurvivalState().canContact) {
      void this.openHollyCaseCall('survival');
      return;
    }
    if (getHollyFinancialState().canContact) {
      void this.openHollyCaseCall('financial');
      return;
    }
    super.openPhone();
  }

  openHollyUpdate() {
    return this.openHollyCaseCall('survival');
  }

  openHollyFinancialLead() {
    return this.openHollyCaseCall('financial');
  }

  async openHollyCaseCall(kind) {
    const financial = kind === 'financial';
    const getState = financial ? getHollyFinancialState : getHollySurvivalState;
    const DATA = financial ? hollyFinancialData : hollySurvivalData;
    if (this._hollyUpdateOpening || !this.canUseOffice() || this.debugMode || !getState().canContact) {
      return false;
    }

    const token = this.runToken;
    this._hollyUpdateOpening = true;
    this.activeDevice = 'holly-case-call';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;
      this._hollyUpdateOpening = false;
      if (this.activeDevice === 'holly-case-call') this.activeDevice = null;
      if (this.sys.isActive()) {
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    };

    try {
      const module = financial
        ? await import('../hollyFinancialLeadLauncher.js')
        : await import('../hollySurvivalUpdateLauncher.js');
      if (!this.isCurrent(token)) {
        release();
        return false;
      }
      const open = financial ? module.openHollyFinancialLead : module.openHollySurvivalUpdate;
      const opened = open(this.game, {
        preview: false,
        returnSceneKey: 'DetectiveOfficeScene',
        onFinished: result => {
          release();
          if (this.isCurrent(token)) {
            this.showFeedback(result.completed
              ? DATA.messages.complete : 'Call paused. Use the telephone to resume.');
          }
        }
      });
      if (!opened) {
        release();
        this.showFeedback('The call is already open or no longer available.');
        return false;
      }
      return true;
    } catch (error) {
      release();
      if (this.isCurrent(token)) this.showFeedback(DATA.messages.loadFailed);
      console.error('[DetectiveOfficeScene] Holly call:', error);
      return false;
    }
  }

  async openFinancialTrace() {
    if (!this.canUseOffice() || this.debugMode || !getFinancialTraceStory().eligible) return;
    const token = this.runToken;
    this.activeDevice = 'financial-trace';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;
      if (this.activeDevice === 'financial-trace') this.activeDevice = null;
      if (this.sys.isActive()) {
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    };

    try {
      const { openFinancialTrace } = await import('../financialTraceLauncher.js');
      if (!this.isCurrent(token)) {
        release();
        return false;
      }
      if (!openFinancialTrace(this.game, {
        preview: false,
        returnSceneKey: 'DetectiveOfficeScene',
        onFinished: result => {
          release();
          if (this.isCurrent(token) && result.companyUnlocked && !result.completed) {
            this.showFeedback('Use your telephone directory to contact Second Opinion Tracing.');
          }
        }
      })) {
        release();
        this.showFeedback('The financial trail is already open or unavailable.');
      }
    } catch (error) {
      release();
      if (this.isCurrent(token)) this.showFeedback('The financial trail could not be opened.');
      console.error('[Financial trace]', error);
    }
  }

  openWarsawEnquiry() {
    return this.openHollyCase();
  }

  async openHollyCase() {
    if (!this.canUseOffice() || this.debugMode || !getHollyResumeEntry()) return false;
    const token = this.runToken;
    this.activeDevice = 'holly-case';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;
      if (this.activeDevice === 'holly-case') this.activeDevice = null;
      if (this.sys.isActive()) {
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    };

    try {
      const { openHollyCaseFromOffice } = await import('../hollyCaseHubService.js');
      if (!this.isCurrent(token)) {
        release();
        return false;
      }
      const result = await openHollyCaseFromOffice(this.game, {
        isCurrent: () => this.isCurrent(token) && this.activeDevice === 'holly-case',
        onFinished: () => release()
      });
      if (!result.opened) {
        release();
        if (this.isCurrent(token)) this.showFeedback(result.message);
      }
      return result.opened;
    } catch (error) {
      release();
      if (this.isCurrent(token)) this.showFeedback('The case file could not be opened.');
      console.error('[Holly case file]', error);
      return false;
    }
  }

  layoutOffice() {
    super.layoutOffice();
    this.piOfficeAnimations?.layout();
    const size = this.scale.width < 600 ? 14 : 20;
    this.financeEntry?.setFontSize(size).setPosition(this.scale.width - 20, 20);
    this.hollyEntry?.setFontSize(size).setPosition(this.scale.width - 20, 82);
  }

  cleanupOffice() {
    this._hollyUpdateOpening = false;
    this.financeEntry?.removeAllListeners();
    this.hollyEntry?.removeAllListeners();
    this.financeEntry = null;
    this.hollyEntry = null;
    this.warsawEntry = null;
    this.piOfficeAnimations?.destroy();
    this.piOfficeAnimations = null;
    super.cleanupOffice();
  }
}