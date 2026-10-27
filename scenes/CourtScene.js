import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';

import {
  COURT_CONFIG,
  buildCourtFacts,
  createCourtRecord,
  answerCourtQuestion,
  advanceCourt
} from '../systems/courtLogic.js';

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

export class CourtScene extends BaseScene {
  constructor() {
    super({ key: 'CourtScene' });
  }

  init(data = {}) {
    this.requestedSuspectId =
      data.suspectId ??
      gameState.finalArrestSuspectId;

    this.record = null;
    this.busy = false;
    this.inputLockUntil = 0;
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
      const saved = gameState.courtState;

      if (
        saved?.version === COURT_CONFIG.version &&
        sameId(saved.caseId, gameState.currentCaseId) &&
        saved.campaignId === gameState._createdAt &&
        sameId(saved.suspectId, this.requestedSuspectId) &&
        Array.isArray(saved.questions) &&
        saved.questions.length > 0 &&
        Number.isFinite(saved.trust) &&
        Number.isInteger(saved.index) &&
        ['question', 'feedback', 'verdict'].includes(saved.phase)
      ) {
        this.record = structuredClone(saved);
      } else {
        const facts = buildCourtFacts(
          gameState,
          this.requestedSuspectId
        );

        if (!facts.warrantMatches) {
          throw new Error(
            'Rozprawa wymaga zatrzymania z nakazem na oskarżonego.'
          );
        }

        this.record = createCourtRecord(facts);
      }
    } catch (error) {
      console.error('[CourtScene] Setup failed:', error);

      this.add.text(100, 100, error.message, {
        fontFamily: 'SpecialElite',
        fontSize: '28px',
        color: '#ffffff',
        wordWrap: { width: 1500 }
      });

      return;
    }

    this.root = this.add.container();

    this.root.setScale(
      Math.min(this.scale.width / 1920, this.scale.height / 1080)
    );

    const scale = this.root.scaleX;

    this.root.setPosition(
      (this.scale.width - 1920 * scale) / 2,
      (this.scale.height - 1080 * scale) / 2
    );

    this.drawCourtroom();

    this.heading = this.text(
      960, 55, 'ROZPRAWA', 30, '#f7e6bc'
    );

    this.defendantText = this.text(
      960,
      100,
      `Oskarżony: ${this.record.facts.defendantName}`,
      25
    );

    this.rect(960, 435, 1660, 90, 0x21160f);

    this.trustText = this.text(960, 416, '', 22);

    this.rect(960, 453, 1200, 18, 0x493c2b);

    this.trustBar = this.rect(
      360, 453, 1200, 18, 0xd8ad58
    ).setOrigin(0, 0.5);

    const thresholdX =
      360 + 1200 * COURT_CONFIG.convictionThreshold / 100;

    this.rect(thresholdX, 453, 4, 30, 0xffffff);

    this.rect(960, 590, 1740, 190, 0x21160f);

    this.questionText = this.text(
      960, 590, '', 28, '#f7e6bc', 1640
    );

    this.buttons = [
      this.makeAnswer(500, 760, 0),
      this.makeAnswer(1420, 760, 1),
      this.makeAnswer(500, 925, 2),
      this.makeAnswer(1420, 925, 3)
    ];

    this.notice = this.text(
      960, 1040, '', 18, '#ffb28d', 1700
    );

    if (this.input.keyboard) {
      ['A', 'B', 'C', 'D'].forEach((key, index) => {
        this.trackInputEvent(
          this.input.keyboard,
          `keydown-${key}`,
          event => {
            if (!event.repeat) this.press(index);
          }
        );
      });

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-ENTER',
        event => {
          if (
            !event.repeat &&
            this.record.phase !== 'question'
          ) {
            this.press(0);
          }
        }
      );
    }

    this.pageHideHandler = () => this.save();

    window.addEventListener(
      'pagehide',
      this.pageHideHandler
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(
        'pagehide',
        this.pageHideHandler
      );
    });

    this.save();
    this.render();
  }

  rect(x, y, width, height, color) {
    const object = this.add.rectangle(
      x, y, width, height, color
    );

    this.root.add(object);
    return object;
  }

  text(x, y, value, size = 26, color = '#f7e6bc', width = 1600) {
    const object = this.add.text(x, y, value, {
      fontFamily: 'SpecialElite',
      fontSize: `${size}px`,
      color,
      align: 'center',
      wordWrap: { width },
      lineSpacing: 7
    }).setOrigin(0.5);

    this.root.add(object);
    return object;
  }

  drawCourtroom() {
    if (this.textures.exists('courtroom')) {
      const image = this.add.image(960, 540, 'courtroom')
        .setDisplaySize(1920, 1080);

      this.root.add(image);
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

    this.prosecutorLabel = this.text(
      350, 355, 'PROKURATOR', 26
    );

    this.defenseLabel = this.text(
      1570, 355, 'OBROŃCA', 26
    );
  }

  makeAnswer(x, y, index) {
    const root = this.add.container(x, y);

    const bg = this.add.rectangle(
      0, 0, 850, 145, 0x503722
    )
      .setStrokeStyle(2, 0xc7ad73)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite',
      fontSize: '24px',
      color: '#f7e6bc',
      align: 'center',
      wordWrap: { width: 790 }
    }).setOrigin(0.5);

    root.add([bg, label]);
    this.root.add(root);

    bg.on('pointerdown', () => this.press(index));
    bg.on('pointerover', () => bg.setFillStyle(0x74502e));
    bg.on('pointerout', () => bg.setFillStyle(0x503722));

    return { root, label };
  }

  save() {
    if (!this.record) return false;

    try {
      gameState.courtState = structuredClone(this.record);
      const result = saveGameState();

      if (result === false) {
        this.notice?.setText(
          'Nie udało się zapisać rozprawy. Nie zamykaj karty.'
        );
      }

      return result !== false;
    } catch (error) {
      console.error('[CourtScene] Save failed:', error);

      this.notice?.setText(
        'Nie udało się zapisać rozprawy. Nie zamykaj karty.'
      );

      return false;
    }
  }

  render() {
    const r = this.record;
    const question = r.questions[r.index];

    this.trustBar.width = 1200 * r.trust / 100;

    this.trustText.setText(
      `Przekonanie sędziego: ${r.trust}/100 ` +
      `| próg skazania: ${COURT_CONFIG.convictionThreshold}`
    );

    const side = r.phase === 'question'
      ? question?.side
      : null;

    this.prosecutorLabel.setColor(
      side === 'prosecutor' ? '#ffe066' : '#f7e6bc'
    );

    this.defenseLabel.setColor(
      side === 'defense' ? '#ffe066' : '#f7e6bc'
    );

    if (r.phase === 'question') {
      this.heading.setText(
        question.side === 'prosecutor'
          ? 'PYTANIA PROKURATORA'
          : 'PYTANIA OBROŃCY'
      );

      this.questionText.setText(question.text);

      this.buttons.forEach((button, index) => {
        button.root
          .setPosition(
            index % 2 === 0 ? 500 : 1420,
            index < 2 ? 760 : 925
          )
          .setVisible(true);

        button.label.setText(
          `${'ABCD'[index]}. ${question.answers[index].text}`
        );
      });
    } else {
      this.buttons.forEach(button =>
        button.root.setVisible(false)
      );

      this.buttons[0].root
        .setPosition(960, 840)
        .setVisible(true);

      if (r.phase === 'feedback') {
        this.heading.setText('OCENA ODPOWIEDZI');
        this.questionText.setText(r.feedback);
        this.buttons[0].label.setText('DALEJ / ENTER');
      } else {
        const convicted = r.verdict === 'convicted';

        this.heading.setText('WYROK');

        this.questionText.setText(
          convicted
            ? 'Sąd uznaje oskarżonego za winnego.\n' +
              'Oskarżony zostaje skazany.'
            : 'Sąd nie znalazł wystarczających podstaw do skazania.\n' +
              'Oskarżony zostaje zwolniony.'
        );

        this.buttons[0].label.setText(
          convicted
            ? 'ZAKOŃCZ SPRAWĘ / ENTER'
            : 'GAME OVER / ENTER'
        );
      }
    }

    this.inputLockUntil = this.time.now + 200;
  }

  press(index) {
    if (
      !this.record ||
      this.busy ||
      this.time.now < this.inputLockUntil
    ) {
      return;
    }

    if (this.record.phase === 'question') {
      if (answerCourtQuestion(this.record, index)) {
        this.save();
        this.render();
      }

      return;
    }

    if (index !== 0) return;

    if (this.record.phase === 'feedback') {
      advanceCourt(this.record);
      this.save();
      this.render();
      return;
    }

    if (this.record.phase === 'verdict') {
      void this.finish();
    }
  }

  async finish() {
    if (this.busy || this.record.phase !== 'verdict') return;

    this.busy = true;

    const r = this.record;
    const convicted = r.verdict === 'convicted';

    try {
      gameState.finalArrestSuspectId = r.suspectId;
      gameState.finalArrestResult =
        convicted ? 'SUCCESS' : 'FAILURE';

      gameState.caseResolved = convicted;
      gameState.caseFailed = !convicted;
      gameState.isGameActive = false;

      gameState.gameOverReason = convicted
        ? ''
        : 'The court released the defendant. ' +
          'The prosecution failed to establish the case.';

      this.save();

      const opened = await this.goto(
        convicted ? 'SuccessScene' : 'GameOverScene',
        {
          caseId: r.caseId,
          suspectId: r.suspectId,
          title: convicted ? 'CONVICTED' : 'DEFENDANT RELEASED',
          reasonCode: convicted
            ? 'court_conviction'
            : 'court_release',
          message: gameState.gameOverReason
        }
      );

      if (!opened && !this._cleanupDone) {
        this.busy = false;
        this.notice.setText(
          'Nie udało się otworzyć wyniku. Naciśnij Enter ponownie.'
        );
      }
    } catch (error) {
      console.error('[CourtScene] Finish failed:', error);

      if (!this._cleanupDone) {
        this.busy = false;
        this.notice.setText(
          'Nie udało się zakończyć rozprawy. Spróbuj ponownie.'
        );
      }
    }
  }
}