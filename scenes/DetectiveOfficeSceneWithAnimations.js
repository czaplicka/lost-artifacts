import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  DetectiveOfficeScene as OriginalOfficeScene
} from './DetectiveOfficeScene.js';

import {
  PIOfficeAnimations
} from './pi-office/PIOfficeAnimations.js';

import {
  ownsOfficeItem
} from '../managers/PIOfficeShopManager.js';

import {
  getHollySurvivalState,
  hollySurvivalData
} from '../hollySurvivalUpdateService.js';

import {
  getHollyFinancialState,
  hollyFinancialData
} from '../hollyFinancialLeadService.js';

import {
  getFinancialTraceStory
} from '../financialTraceService.js';

import {
  getHollyResumeEntry
} from '../hollyCaseHubService.js';

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

    this.financeEntry = entry(__dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_110f113fb7306dba4268"), () => {
      void this.openFinancialTrace();
    });

    this.hollyEntry = entry(__dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_d692303f7dc1c84a57c3"), () => {
      void this.openHollyCase();
    });

    this.warsawEntry = this.hollyEntry;

    this.layoutOffice();
    this.refreshInteractions();
  }

  rebuildOffice() {
    if (this.disposed || this._cleanupDone) return;

    if (!this.officeTitle || !this.officeTitle.scene) {
      this.officeTitle = this.add
        .text(16, 16, '', this.style(14))
        .setDepth(100)
        .setVisible(false);
    }

    super.rebuildOffice();

    this.refreshInteractions();
  }

  refreshInteractions() {
    if (this.disposed || this._cleanupDone) return;

    const usable = this.canUseOffice();

    if (!usable) {
      this.tooltip?.setVisible(false);
    }

    for (const { rect } of this.hotspots || []) {
      if (!rect?.scene || !rect.active) continue;

      if (rect.input) {
        rect.input.enabled = usable;
      }

      rect
        .setFillStyle(
          0xffd166,
          this.debugMode && usable ? 0.18 : 0
        )
        .setStrokeStyle(
          this.debugMode && usable ? 2 : 0,
          0xffd166
        );
    }

    for (const { cfg, image } of this.layers || []) {
      if (!image?.scene || !image.active) continue;

      const visible = ownsOfficeItem(cfg.id);

      image.setVisible(visible);

      if (image.input) {
        image.input.enabled = visible && usable;
      }
    }

    this.refreshCaseEntries();
  }

  refreshCaseEntries() {
    if (this.disposed || this._cleanupDone) return;

    const usable = this.canUseOffice() && !this.debugMode;

    if (this.financeEntry?.scene) {
      const story = getFinancialTraceStory();
      const visible = Boolean(story.eligible && usable);

      this.financeEntry
        .setText(
          story.companyCompleted && this.scale.width >= 600
            ? __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_8138ab9e3c3f5d5b4820")
            : __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_110f113fb7306dba4268")
        )
        .setVisible(visible);

      if (this.financeEntry.input) {
        this.financeEntry.input.enabled = visible;
      }
    }

    if (this.hollyEntry?.scene) {
      const entry = getHollyResumeEntry();
      const visible = Boolean(entry && usable);

      this.hollyEntry
        .setText(entry?.label || __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_d692303f7dc1c84a57c3"))
        .setVisible(visible);

      if (this.hollyEntry.input) {
        this.hollyEntry.input.enabled = visible;
      }
    }
  }

  update() {
    super.update();

    if (this.disposed || this._cleanupDone) return;

    this.refreshCaseEntries();
  }

  openPhone() {
    if (
      this._hollyUpdateOpening ||
      !this.canUseOffice() ||
      this.debugMode
    ) {
      return;
    }

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

    const getState = financial
      ? getHollyFinancialState
      : getHollySurvivalState;

    const DATA = financial
      ? hollyFinancialData
      : hollySurvivalData;

    if (
      this._hollyUpdateOpening ||
      !this.canUseOffice() ||
      this.debugMode ||
      !getState().canContact
    ) {
      return false;
    }

    const token = this.runToken;

    this._hollyUpdateOpening = true;
    this.activeDevice = 'holly-case-call';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;

      this._hollyUpdateOpening = false;

      if (this.activeDevice === 'holly-case-call') {
        this.activeDevice = null;
      }

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

      const open = financial
        ? module.openHollyFinancialLead
        : module.openHollySurvivalUpdate;

      const opened = open(this.game, {
        preview: false,
        returnSceneKey: 'DetectiveOfficeScene',

        onFinished: result => {
          release();

          if (this.isCurrent(token)) {
            this.showFeedback(
              result.completed
                ? DATA.messages.complete
                : __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_0ffca9f0d2ec18a1f5ec")
            );
          }
        }
      });

      if (!opened) {
        release();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_65d72ef43e3cbd207f22")
        );

        return false;
      }

      return true;
    } catch (error) {
      release();

      if (this.isCurrent(token)) {
        this.showFeedback(DATA.messages.loadFailed);
      }

      console.error(
        '[DetectiveOfficeScene] Holly call:',
        error
      );

      return false;
    }
  }

  async openFinancialTrace() {
    if (
      !this.canUseOffice() ||
      this.debugMode ||
      !getFinancialTraceStory().eligible
    ) {
      return;
    }

    const token = this.runToken;

    this.activeDevice = 'financial-trace';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;

      if (this.activeDevice === 'financial-trace') {
        this.activeDevice = null;
      }

      if (this.sys.isActive()) {
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    };

    try {
      const {
        openFinancialTrace
      } = await import('../financialTraceLauncher.js');

      if (!this.isCurrent(token)) {
        release();
        return false;
      }

      const opened = openFinancialTrace(this.game, {
        preview: false,
        returnSceneKey: 'DetectiveOfficeScene',

        onFinished: result => {
          release();

          if (
            this.isCurrent(token) &&
            result.companyUnlocked &&
            !result.completed
          ) {
            this.showFeedback(
              __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_92a8a88615ca8a8e82c5")
            );
          }
        }
      });

      if (!opened) {
        release();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_70ef91e530ca4b2a65a9")
        );
      }
    } catch (error) {
      release();

      if (this.isCurrent(token)) {
        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_022a14b4e9ee515c41f8")
        );
      }

      console.error('[Financial trace]', error);
    }
  }

  openWarsawEnquiry() {
    return this.openHollyCase();
  }

  async openHollyCase() {
    if (
      !this.canUseOffice() ||
      this.debugMode ||
      !getHollyResumeEntry()
    ) {
      return false;
    }

    const token = this.runToken;

    this.activeDevice = 'holly-case';
    this.refreshInteractions();

    const release = () => {
      if (this.disposed || this.runToken !== token) return;

      if (this.activeDevice === 'holly-case') {
        this.activeDevice = null;
      }

      if (this.sys.isActive()) {
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    };

    try {
      const {
        openHollyCaseFromOffice
      } = await import('../hollyCaseHubService.js');

      if (!this.isCurrent(token)) {
        release();
        return false;
      }

      const result = await openHollyCaseFromOffice(this.game, {
        isCurrent: () =>
          this.isCurrent(token) &&
          this.activeDevice === 'holly-case',

        onFinished: () => release()
      });

      if (!result.opened) {
        release();

        if (this.isCurrent(token)) {
          this.showFeedback(result.message);
        }
      }

      return result.opened;
    } catch (error) {
      release();

      if (this.isCurrent(token)) {
        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeSceneWithAnimations.js", "t_9b9a33255337ca124bcb")
        );
      }

      console.error('[Holly case file]', error);

      return false;
    }
  }

  layoutOffice() {
    super.layoutOffice();

    this.piOfficeAnimations?.layout();

    const size = this.scale.width < 600 ? 14 : 20;

    this.financeEntry
      ?.setFontSize(size)
      .setPosition(this.scale.width - 20, 20);

    this.hollyEntry
      ?.setFontSize(size)
      .setPosition(this.scale.width - 20, 82);
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