import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { ScoreManager } from '../managers/ScoreManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

export class HighscoreScene extends BaseScene {
  constructor() {
    super({ key: 'HighscoreScene' });
    this.scoreManager = null;
    this.openedFromSettings = false;
    this.isClosing = false;
  }

  init(data = {}) {
    this.openedFromSettings = data.openedFromSettings === true;
    this.isClosing = false;
  }

  preload() { preloadMenuActionAudio(this); }

  create() {
    super.create();
    this.isClosing = false;
    if (!this.openedFromSettings && this.game.scene.keys.UIScene && this.scene.isActive('UIScene')) {
      this.scene.sleep('UIScene');
    }
    const { width, height } = this.scale;
    this.scoreManager = new ScoreManager();
    const blocker = this.add.rectangle(0, 0, width, height, 0x050c08)
      .setOrigin(0).setInteractive();
    blocker.on('pointerdown', (_p, _x, _y, event) => event.stopPropagation());
    if (this.textures.exists('backgroundhi')) {
      this.add.image(width / 2, height / 2, 'backgroundhi').setDisplaySize(width, height);
    }
    if (this.textures.exists('backgroundpc')) {
      this.add.image(width / 2, height / 2, 'backgroundpc').setDisplaySize(width, height);
    }
    audioManager.init(this);
    this.createBackButton(width, height);
    this.createHeader(width, height);
    this.createRankingCards(width, height);
    this.scene.setVisible(true);
    this.scene.bringToTop();
  }

  createBackButton(width, height) {
    let backBtn;
    if (this.textures.exists('back')) {
      backBtn = this.add.image(width * 0.12, height * 0.86, 'back')
        .setInteractive({ useHandCursor: true }).setScale(0.7).setDepth(30);
      this.addHoverEffect(backBtn, 0.7, 0.8);
    } else {
      backBtn = this.add.text(width * 0.12, height * 0.90, __dialogueText("scenes/HighscoreScene.js", "t_639807a2e01886a2236b"), {
        fontFamily: 'PressStart2P', fontSize: '20px', color: '#91d18b'
      }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });
      this.addHoverEffect(backBtn, 1, 1.1);
    }
    backBtn.on('pointerdown', () => this.closeHighscores());
  }

  async closeHighscores() {
    if (this.isClosing) return;
    this.isClosing = true;
    playMenuActionAudio(this);
    if (this.openedFromSettings) {
      this.scene.stop();
      return;
    }
    const result = await this.goto('EnterScene');
    if (!result && !this._cleanupDone) this.isClosing = false;
  }

  createHeader(width, height) {
    const style = {
      fontFamily: 'PressStart2P', color: '#0ea333', fontStyle: 'bold',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true }
    };
    this.add.text(width / 2, height * 0.12, __dialogueText("scenes/HighscoreScene.js", "t_0158b1bb93eb7214b40f"), {
      ...style, fontSize: '22px'
    }).setOrigin(0.5).setDepth(20);
    this.add.text(width / 2, height * 0.18, __dialogueText("scenes/HighscoreScene.js", "t_c14a6570c6292c00466d"), {
      ...style, fontSize: '14px', color: '#6ee77d'
    }).setOrigin(0.5).setDepth(20);
  }

  createRankingCards(width, height) {
    const rankings = [
      { difficulty: 'rookie', title: __dialogueText("scenes/HighscoreScene.js", "t_3b20784606a2851c78ea"), subtitle: __dialogueText("scenes/HighscoreScene.js", "t_1e954e77ee4e5253c6c5"), color: 0x386641, accent: '#91d18b' },
      { difficulty: 'field', title: __dialogueText("scenes/HighscoreScene.js", "t_2e9729bdfa9d89d81e29"), subtitle: __dialogueText("scenes/HighscoreScene.js", "t_b62db7d0b79d11100c71"), color: 0x8a6a26, accent: '#f3cf67' },
      { difficulty: 'master', title: __dialogueText("scenes/HighscoreScene.js", "t_30e7724015a1f3788713"), subtitle: __dialogueText("scenes/HighscoreScene.js", "t_ea03025fa1a0ff1834f9"), color: 0x6f2833, accent: '#ef99a2' }
    ];
    rankings.forEach((ranking, index) => {
      this.createRankingCard(width * 0.225 + width * 0.275 * index,
        height * 0.54, width * 0.245, height * 0.60, ranking);
    });
  }

  createRankingCard(x, y, width, height, ranking) {
    const scores = this.scoreManager.getScores(ranking.difficulty);
    const container = this.add.container(x, y).setDepth(20);
    const outerPanel = this.add.rectangle(0, 0, width, height, 0x08140b, 0.93)
      .setStrokeStyle(3, ranking.color, 1);
    const innerPanel = this.add.rectangle(0, 0, width - 14, height - 14, 0x0c2211, 0.88)
      .setStrokeStyle(1, 0x4f8452, 0.7);
    const title = this.add.text(0, -height / 2 + 30, ranking.title, {
      fontFamily: 'PressStart2P', fontSize: '15px', color: ranking.accent, align: 'center'
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, -height / 2 + 55, ranking.subtitle, {
      fontFamily: 'PressStart2P', fontSize: '11px', color: '#d5ead1', align: 'center'
    }).setOrigin(0.5);
    const divider = this.add.rectangle(0, -height / 2 + 76, width - 30, 2, ranking.color, 0.9);
    container.add([outerPanel, innerPanel, title, subtitle, divider]);
    const rowStartY = -height / 2 + 105;
    for (let index = 0; index < 10; index += 1) {
      const score = scores[index];
      const rowY = rowStartY + index * 39;
      const rowColor = index < 3 ? ranking.accent : '#cce5c9';
      const rank = this.add.text(-width / 2 + 18, rowY, `${index + 1}${__dialogueText("scenes/HighscoreScene.js", "t_cdb4ee2aea69cc6a8333")}`, {
        fontFamily: 'PressStart2P', fontSize: '10px', color: rowColor
      }).setOrigin(0, 0.5);
      const name = this.add.text(-width / 2 + 46, rowY, score?.name || __dialogueText("scenes/HighscoreScene.js", "t_bda050585a00f0f6cb50"), {
        fontFamily: 'PressStart2P', fontSize: '9px', color: '#e6f3e0',
        wordWrap: { width: width * 0.48 }
      }).setOrigin(0, 0.5);
      const points = this.add.text(width / 2 - 18, rowY,
        Number.isFinite(score?.points) ? score.points.toLocaleString(__dialogueText("scenes/HighscoreScene.js", "t_5c49f88dafe66e0ecdca")) : __dialogueText("scenes/HighscoreScene.js", "t_bda050585a00f0f6cb50"), {
          fontFamily: 'PressStart2P', fontSize: '9px', color: rowColor
        }).setOrigin(1, 0.5);
      container.add([rank, name, points]);
    }
  }

  addHoverEffect(button, baseScale = 0.7, hoverScale = 0.8) {
    button.on('pointerover', () => button.setScale(hoverScale));
    button.on('pointerout', () => button.setScale(baseScale));
  }
}
