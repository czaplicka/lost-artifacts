import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import {
  COURT_CONFIG, buildCourtFacts, createCourtRecord,
  answerCourtQuestion, advanceCourt, validCourt
} from '../systems/courtLogic.js';
import { currentChase, persistChase } from '../systems/chasePersistence.js';

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export class CourtScene extends BaseScene {
  constructor() {
    super({ key: 'CourtScene' });
  }

  init(data = {}) {
    this.requestedSuspectId = data.suspectId ?? gameState.finalArrestSuspectId;
    this.record = null;
    this.busy = false;
    this.inputLockUntil = 0;
    this.root = null;
    this.notice = null;
    this.buttons = [];
    this.pageHideHandler = null;
    this.visibilityHandler = null;
    this.resizeHandler = null;
  }

  create() {
    super.create();
    EventBus.emit('hideHUD');
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      const scene = this.getRegisteredScene(key);
      scene?.closeAllUIPanels?.();
      scene?.hideHud?.();
      if (scene) this.scene.setVisible(false, key);
    }
    audioManager.init(this);
    audioManager.stopAllMusic();
    audioManager.stopAllNonMusic();
    try {
      this.restoreOrCreateRecord();
    } catch (error) {
      console.error('[CourtScene] Setup failed:', error);
      this.add.text(100, 100, error.message, {
        fontFamily: 'SpecialElite', fontSize: '28px', color: '#ffffff',
        wordWrap: { width: Math.max(300, this.scale.width - 200) }
      });
      return;
    }
    this.root = this.add.container();
    this.fitRoot();
    this.drawCourtroom();
    this.createInterface();
    this.registerControls();
    this.registerLifecycle();
    this.save();
    this.render();
  }

  restoreOrCreateRecord() {
    const saved = gameState.courtState;
    const belongsToThisTrial = saved != null &&
      sameId(saved.caseId, gameState.currentCaseId) &&
      saved.campaignId === gameState._createdAt &&
      sameId(saved.suspectId, this.requestedSuspectId);
    if (belongsToThisTrial) {
      if (!validCourt(saved, gameState, this.requestedSuspectId)) {
        throw new Error('Zapis rozprawy jest niespójny. Nie rozpoczęto jej ponownie ani nie nadpisano zapisu.');
      }
      this.record = structuredClone(saved);
      return;
    }
    const facts = buildCourtFacts(gameState, this.requestedSuspectId);
    if (!facts.warrantMatches) {
      throw new Error('Rozprawa wymaga zatrzymania z nakazem na oskarżonego.');
    }
    this.record = createCourtRecord(facts);
  }

  fitRoot() {
    if (!this.root) return;
    const scale = Math.min(this.scale.width / 1920, this.scale.height / 1080);
    this.root.setScale(scale);
    this.root.setPosition(
      (this.scale.width - 1920 * scale) / 2,
      (this.scale.height - 1080 * scale) / 2
    );
  }

  createInterface() {
    this.heading = this.text(960, 55, 'ROZPRAWA', 30);
    this.defendantText = this.text(960, 100, `Oskarżony: ${this.record.facts.defendantName}`, 25);
    this.rect(960, 435, 1660, 90, 0x21160f);
    this.trustText = this.text(960, 416, '', 22);
    this.rect(960, 453, 1200, 18, 0x493c2b);
    this.trustBar = this.rect(360, 453, 1200, 18, 0xd8ad58).setOrigin(0, 0.5);
    this.rect(360 + 1200 * COURT_CONFIG.convictionThreshold / 100, 453, 4, 30, 0xffffff);
    this.rect(960, 590, 1740, 190, 0x21160f);
    this.questionText = this.text(960, 590, '', 28, '#f7e6bc', 1640);
    this.buttons = [
      this.makeAnswer(500, 760, 0), this.makeAnswer(1420, 760, 1),
      this.makeAnswer(500, 925, 2), this.makeAnswer(1420, 925, 3)
    ];
    this.notice = this.text(960, 1040, '', 18, '#ffb28d', 1700);
  }

  registerControls() {
    if (!this.input.keyboard) return;
    ['A', 'B', 'C', 'D'].forEach((key, index) => {
      this.trackInputEvent(this.input.keyboard, `keydown-${key}`, event => {
        if (!event.repeat) this.press(index);
      });
    });
    this.trackInputEvent(this.input.keyboard, 'keydown-ENTER', event => {
      if (!event.repeat && this.record?.phase !== 'question') this.press(0);
    });
  }

  registerLifecycle() {
    this.pageHideHandler = () => { if (!this.busy) this.save(); };
    this.visibilityHandler = () => { if (document.hidden && !this.busy) this.save(); };
    this.resizeHandler = () => this.fitRoot();
    window.addEventListener('pagehide', this.pageHideHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.scale.on('resize', this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pagehide', this.pageHideHandler);
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.scale.off('resize', this.resizeHandler);
    });
  }

  rect(x, y, width, height, color) {
    const object = this.add.rectangle(x, y, width, height, color);
    this.root.add(object);
    return object;
  }

  text(x, y, value, size = 26, color = '#f7e6bc', width = 1600) {
    const object = this.add.text(x, y, value, {
      fontFamily: 'SpecialElite', fontSize: `${size}px`, color,
      align: 'center', wordWrap: { width }, lineSpacing: 7
    }).setOrigin(0.5);
    this.root.add(object);
    return object;
  }

  drawCourtroom() {
    if (this.textures.exists('courtroom')) {
      this.root.add(this.add.image(960, 540, 'courtroom').setDisplaySize(1920, 1080));
    } else {
      this.rect(960, 540, 1920, 1080, 0x29251f);
      this.rect(960, 260, 520, 190, 0x65462c);
      this.rect(350, 310, 480, 160, 0x4c3424);
      this.rect(1570, 310, 480, 160, 0x4c3424);
      this.rect(960, 205, 60, 85, 0x121212);
      this.rect(350, 258, 55, 85, 0x292e3d);
      this.rect(1570, 258, 55, 85, 0x303030);
    }
    this.judgeLabel = this.text(960, 335, 'SĘDZIA', 26);
    this.prosecutorLabel = this.text(350, 355, 'PROKURATOR', 26);
    this.defenseLabel = this.text(1570, 355, 'OBROŃCA', 26);
  }

  makeAnswer(x, y, index) {
    const root = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 850, 145, 0x503722)
      .setStrokeStyle(2, 0xc7ad73).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite', fontSize: '24px', color: '#f7e6bc',
      align: 'center', wordWrap: { width: 790 }
    }).setOrigin(0.5);
    root.add([bg, label]);
    this.root.add(root);
    bg.on('pointerdown', () => this.press(index));
    bg.on('pointerover', () => { if (!this.busy) bg.setFillStyle(0x74502e); });
    bg.on('pointerout', () => bg.setFillStyle(0x503722));
    return { root, bg, label };
  }

  save() {
    if (!this.record) return false;
    try {
      gameState.courtState = structuredClone(this.record);
      const chase = currentChase();
      const matchingChase = chase &&
        chase.campaignId === this.record.campaignId &&
        sameId(chase.caseId, this.record.caseId) &&
        sameId(chase.suspectId, this.record.suspectId);
      let saved;
      if (matchingChase) {
        const checkpointRecord = structuredClone(chase);
        checkpointRecord.phase = 'review';
        checkpointRecord.terminalScene = 'CourtScene';
        saved = persistChase(checkpointRecord);
      } else {
        saved = saveGameState();
      }
      if (saved !== true) {
        this.notice?.setText('Nie udało się zapisać rozprawy. Nie zamykaj karty.');
        return false;
      }
      this.notice?.setText('');
      return true;
    } catch (error) {
      console.error('[CourtScene] Save failed:', error);
      this.notice?.setText('Nie udało się zapisać rozprawy. Nie zamykaj karty.');
      return false;
    }
  }

  render() {
    const r = this.record;
    if (!r) return;
    const question = r.questions[r.index];
    this.trustBar.width = 1200 * r.trust / 100;
    this.trustText.setText(`Przekonanie sędziego: ${r.trust}/100 | próg skazania: ${COURT_CONFIG.convictionThreshold}`);
    const side = r.phase === 'question' ? question?.side : null;
    this.prosecutorLabel.setColor(side === 'prosecutor' ? '#ffe066' : '#f7e6bc');
    this.defenseLabel.setColor(side === 'defense' ? '#ffe066' : '#f7e6bc');
    this.judgeLabel.setColor(r.phase === 'verdict' ? '#ffe066' : '#f7e6bc');
    if (r.phase === 'question') {
      if (!question || question.answers?.length !== 4) {
        this.showRenderError();
        return;
      }
      this.heading.setText(question.side === 'prosecutor' ? 'PYTANIA PROKURATORA' : 'PYTANIA OBROŃCY');
      this.questionText.setText(question.text);
      this.buttons.forEach((button, index) => {
        button.root.setPosition(index % 2 === 0 ? 500 : 1420, index < 2 ? 760 : 925).setVisible(true);
        button.bg.setFillStyle(0x503722);
        button.label.setText(`${'ABCD'[index]}. ${question.answers[index].text}`);
      });
    } else {
      this.buttons.forEach(button => button.root.setVisible(false));
      const button = this.buttons[0];
      button.root.setPosition(960, 840).setVisible(true);
      button.bg.setFillStyle(0x503722);
      if (r.phase === 'feedback') {
        this.heading.setText('OCENA ODPOWIEDZI');
        this.questionText.setText(r.feedback);
        button.label.setText('DALEJ / ENTER');
      } else if (r.phase === 'verdict') {
        const convicted = r.verdict === 'convicted';
        this.heading.setText('WYROK');
        this.questionText.setText(convicted
          ? 'Sąd uznaje oskarżonego za winnego.\nOskarżony zostaje skazany.'
          : 'Sąd nie znalazł wystarczających podstaw do skazania.\nOskarżony zostaje zwolniony.');
        button.label.setText(convicted ? 'ZAKOŃCZ SPRAWĘ / ENTER' : 'GAME OVER / ENTER');
      } else {
        this.showRenderError();
        return;
      }
    }
    this.inputLockUntil = this.time.now + 200;
  }

  showRenderError() {
    this.busy = true;
    this.buttons.forEach(button => button.root.setVisible(false));
    this.heading.setText('BŁĄD ZAPISU ROZPRAWY');
    this.questionText.setText('Nie można wyświetlić tego etapu rozprawy.\nNie nadpisuj zapisu gry.');
    this.notice?.setText('Nieprawidłowy stan pytań lub etapu rozprawy.');
  }

  press(index) {
    const r = this.record;
    if (!r || this.busy || this.time.now < this.inputLockUntil) return;
    if (r.phase === 'question') {
      if (answerCourtQuestion(r, index)) {
        this.save();
        this.render();
      }
      return;
    }
    if (index !== 0) return;
    if (r.phase === 'feedback') {
      if (advanceCourt(r)) {
        this.save();
        this.render();
      }
      return;
    }
    if (r.phase === 'verdict') void this.finish();
  }

  applyVerdictToGameState() {
    const r = this.record;
    const convicted = r.verdict === 'convicted';
    gameState.finalArrestSuspectId = r.suspectId;
    gameState.finalArrestResult = convicted ? 'SUCCESS' : 'FAILURE';
    gameState.caseResolved = convicted;
    gameState.caseFailed = !convicted;
    gameState.isGameActive = false;
    gameState.gameOverReason = convicted ? ''
      : 'The court released the defendant. The prosecution failed to establish the case.';
  }

  async finish() {
    const r = this.record;
    if (this.busy || !r || r.phase !== 'verdict') return;
    if (!validCourt(r, gameState, this.requestedSuspectId)) {
      this.notice?.setText('Nie można zatwierdzić niespójnego wyroku.');
      return;
    }
    this.busy = true;
    const convicted = r.verdict === 'convicted';
    try {
      this.applyVerdictToGameState();
      r.resultCommitted = true;
      if (!this.save()) {
        this.busy = false;
        this.notice?.setText('Nie udało się zapisać wyroku. Naciśnij Enter, aby spróbować ponownie.');
        return;
      }
      const opened = await this.goto(convicted ? 'SuccessScene' : 'GameOverScene', {
        caseId: r.caseId,
        suspectId: r.suspectId,
        title: convicted ? 'CONVICTED' : 'DEFENDANT RELEASED',
        reasonCode: convicted ? 'court_conviction' : 'court_release',
        message: gameState.gameOverReason
      });
      if (!opened && !this._cleanupDone) {
        this.busy = false;
        this.notice?.setText('Nie udało się otworzyć wyniku. Naciśnij Enter ponownie.');
      }
    } catch (error) {
      console.error('[CourtScene] Finish failed:', error);
      if (!this._cleanupDone) {
        this.busy = false;
        this.notice?.setText('Nie udało się zakończyć rozprawy. Spróbuj ponownie.');
      }
    }
  }
}
