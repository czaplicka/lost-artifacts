import { gameState } from '../../GameData.js';
import { FONT_PIXEL, FONT_TYPE, PAL } from './config.js';

export const resultsMethods = {
  createResultOverlay() {
    const { width, height } = this.scale;

    this.resultOverlay = this.add
      .container(0, 0)
      .setDepth(700)
      .setVisible(false);

    const darkBg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.78)
      .setInteractive();

    this.resultPanel = this.add.container(width / 2, height / 2);

    const shadow = this.add.rectangle(10, 12, 900, 430, 0x000000, 0.3);

    const panel = this.add
      .rectangle(0, 0, 900, 430, 0xf5ebd2, 1)
      .setStrokeStyle(4, 0x5e3d20, 1);

    const band = this.add.rectangle(0, -180, 900, 70, 0x4a3118, 1);

    this.resultTitle = this.add
      .text(0, -180, '', {
        fontFamily: FONT_PIXEL,
        fontSize: '24px',
        color: PAL.goldCss,
        align: 'center'
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(0, -40, '', {
        fontFamily: FONT_TYPE,
        fontSize: '30px',
        color: PAL.ink,
        align: 'center',
        wordWrap: { width: 780 },
        lineSpacing: 10
      })
      .setOrigin(0.5);

    const filedStamp = this.createStamp(
      300,
      110,
      'FILED',
      22,
      PAL.red,
      -0.22
    ).setAlpha(0.85);

    this.continueBtn = this.createButton(0, 150, 300, 66, 'CONTINUE', {
      fontSize: '18px'
    });

    this.continueBtn.on('pointerdown', () => this.proceedFromResult());

    this.resultPanel.add([
      shadow,
      panel,
      band,
      this.resultTitle,
      this.resultText,
      filedStamp,
      this.continueBtn
    ]);

    this.resultOverlay.add([darkBg, this.resultPanel]);
  },

  showResult(title, message) {
    this.resultTitle.setText(title);
    this.resultText.setText(message);

    this.resultOverlay.setVisible(true);
    this.resultPanel.setScale(0.9).setAlpha(0);

    this.tweens.add({
      targets: this.resultPanel,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.Out'
    });
  },

  proceedFromResult() {
    if (this.isLeaving || !this.resultCommitted) return;

    this.isLeaving = true;
    this.continueBtn?.disableInteractive();

    const isCorrect = gameState.finalArrestResult === 'SUCCESS';

    const nextSceneKey = isCorrect
      ? 'SuccessScene'
      : 'GameOverScene';

    const payload = {
      caseId: gameState.currentCaseId,
      suspectId: gameState.finalArrestSuspectId,
      source: 'final_arrest',

      reasonCode: isCorrect
        ? 'correct_arrest'
        : 'wrong_arrest'
    };

    if (!isCorrect) {
      payload.title = 'FALSE ARREST';

      payload.message =
        gameState.gameOverReason ||
        'Incorrect suspect detained. The real thief escaped.';
    }

    this.resultOverlay.setVisible(false);
    this.scene.stop('CityScene');

    this.goto(nextSceneKey, payload);
  }
};
