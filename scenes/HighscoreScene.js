import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { ScoreManager } from '../managers/ScoreManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { preloadMenuActionAudio, playMenuActionAudio } from './archive/MenuActionAudio.js';

const BACKGROUND_KEY = 'highscores_terminal_v1';
const BACKGROUND_URL = 'assets/ui/highscores-terminal.webp';
const DESIGN = { width: 1376, height: 768 };
const SCREEN = { x: 316, y: 146, width: 744, height: 428 };
const IDLE_STATUS = 'LOCAL ARCHIVE // TOP 10 PER CLEARANCE';
const PRESS = 'PressStart2P';
const ELITE = 'SpecialElite';

export class HighscoreScene extends BaseScene {
  constructor() {
    super({ key: 'HighscoreScene' });
    this.scoreManager = null;
    this.openedFromSettings = false;
    this.isClosing = false;
    this.terminalRoot = null;
    this.inputBlocker = null;
    this.statusText = null;
    this._highscoreViewClosed = true;
  }

  init(data = {}) {
    this.openedFromSettings = data.openedFromSettings === true;
    this.isClosing = false;
  }

  preload() {
    preloadMenuActionAudio(this);
    if (!this.textures.exists(BACKGROUND_KEY)) {
      this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
    }
  }

  create() {
    super.create();
    this.isClosing = false;
    this._highscoreViewClosed = false;
    if (!this.openedFromSettings && this.game.scene.keys.UIScene && this.scene.isActive('UIScene')) {
      this.scene.sleep('UIScene');
    }
    this.input.enabled = true;
    this.scoreManager = new ScoreManager();
    this.inputBlocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x050906)
      .setOrigin(0).setScrollFactor(0).setDepth(0).setInteractive();
    this.inputBlocker.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation());
    this.terminalRoot = this.add.container(0, 0).setScrollFactor(0).setDepth(10);

    if (this.textures.exists(BACKGROUND_KEY)) {
      this.terminalRoot.add(this.add.image(0, 0, BACKGROUND_KEY)
        .setOrigin(0).setDisplaySize(DESIGN.width, DESIGN.height));
    } else {
      this.terminalRoot.add(this.add.rectangle(0, 0, DESIGN.width, DESIGN.height, 0x17231b).setOrigin(0));
      this.addTerminalText(DESIGN.width / 2, 730,
        `Missing background: ${BACKGROUND_URL}`, 12, '#e9bf83', ELITE).setOrigin(0.5);
    }

    audioManager.init(this);
    this.createHeader();
    this.createFooter();
    this.createRankingCards();
    this.createBackButton();
    this.layoutTerminal();
    this.scale.on('resize', this.layoutTerminal, this);
    this.events.once('shutdown', this.handleHighscoreShutdown, this);
    this.events.once('destroy', this.handleHighscoreShutdown, this);
    this.scene.setVisible(true);
    this.scene.bringToTop();
  }

  layoutTerminal() {
    if (!this.terminalRoot || this._highscoreViewClosed) return;
    const { width, height } = this.scale;
    const scale = Math.min(width / DESIGN.width, height / DESIGN.height);
    this.terminalRoot.setScale(scale).setPosition(
      (width - DESIGN.width * scale) / 2,
      (height - DESIGN.height * scale) / 2
    );
    this.inputBlocker?.setSize(width, height);
  }

  addTerminalText(x, y, value, size, color = '#c9dfbd', fontFamily = PRESS) {
    const text = this.add.text(x, y, String(value ?? ''), {
      fontFamily, fontSize: `${size}px`, color,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true }
    }).setResolution(2);
    this.terminalRoot.add(text);
    return text;
  }

  fitText(text, maxWidth, baseSize, minSize = baseSize) {
    let size = baseSize;
    while (text.width > maxWidth && size > minSize) {
      size = Math.max(minSize, size - 0.5);
      text.setFontSize(size);
    }
    if (text.width > maxWidth) {
      const original = text.text;
      let length = original.length;
      while (length > 0 && text.width > maxWidth) {
        length -= 1;
        text.setText(`${original.slice(0, length).trimEnd()}...`);
      }
    }
    return text;
  }

  createHeader() {
    const cx = SCREEN.x + SCREEN.width / 2;
    this.addTerminalText(cx, 151, 'INTERPOL DATABASE', 14, '#b3e5a0').setOrigin(0.5, 0);
    this.addTerminalText(cx, 177, 'MARK AGENCY CLEARANCE RECORDS', 9, '#83ae7d').setOrigin(0.5, 0);
    this.terminalRoot.add(this.add.rectangle(cx, 198, SCREEN.width - 18, 1, 0x638c5d, 0.65));
  }

  createFooter() {
    const cx = SCREEN.x + SCREEN.width / 2;
    this.terminalRoot.add(this.add.rectangle(cx, 536, SCREEN.width - 18, 1, 0x638c5d, 0.5));
    this.statusText = this.addTerminalText(cx, 548, IDLE_STATUS, 10, '#91ae87', ELITE)
      .setOrigin(0.5, 0);
  }

  showEntryStatus(score) {
    if (!this.statusText || this._highscoreViewClosed) return;
    const name = String(score.name ?? '').replace(/\s+/g, ' ').trim();
    this.statusText.setText(`${name}  //  ${score.points.toLocaleString('en-US')} PTS`);
    this.fitText(this.statusText, SCREEN.width - 26, 10, 10);
  }

  resetEntryStatus() {
    if (this.statusText && !this._highscoreViewClosed) this.statusText.setText(IDLE_STATUS);
  }

  createRankingCards() {
    const rankings = [
      { difficulty: 'rookie', title: __dialogueText('scenes/HighscoreScene.js', 't_3b20784606a2851c78ea'), subtitle: __dialogueText('scenes/HighscoreScene.js', 't_1e954e77ee4e5253c6c5'), color: 0x638e57, accent: '#a8d69a' },
      { difficulty: 'field', title: __dialogueText('scenes/HighscoreScene.js', 't_2e9729bdfa9d89d81e29'), subtitle: __dialogueText('scenes/HighscoreScene.js', 't_b62db7d0b79d11100c71'), color: 0x9b8950, accent: '#dbc58b' },
      { difficulty: 'master', title: __dialogueText('scenes/HighscoreScene.js', 't_30e7724015a1f3788713'), subtitle: __dialogueText('scenes/HighscoreScene.js', 't_ea03025fa1a0ff1834f9'), color: 0x9c6969, accent: '#d3a0a0' }
    ];
    const gap = 12;
    const width = (SCREEN.width - gap * 2) / 3;
    rankings.forEach((ranking, index) => {
      this.createRankingCard(SCREEN.x + index * (width + gap), 211, width, 312, ranking);
    });
  }

  createRankingCard(x, y, width, height, ranking) {
    const scores = this.scoreManager.getScores(ranking.difficulty);
    const panel = this.add.rectangle(x, y, width, height, 0x08160c, 0.43)
      .setOrigin(0).setStrokeStyle(1, ranking.color, 0.65);
    this.terminalRoot.add(panel);

    const title = this.addTerminalText(x + width / 2, y + 13, ranking.title, 11, ranking.accent).setOrigin(0.5, 0);
    this.fitText(title, width - 20, 11, 8);
    const subtitle = this.addTerminalText(x + width / 2, y + 34, ranking.subtitle, 10, '#94aa8a', ELITE)
      .setOrigin(0.5, 0);
    this.fitText(subtitle, width - 20, 10, 9);
    this.terminalRoot.add(this.add.rectangle(x + width / 2, y + 57, width - 20, 1, ranking.color, 0.65));
    this.addTerminalText(x + 12, y + 67, '#', 7, '#748a6c');
    this.addTerminalText(x + 36, y + 67, 'AGENT', 7, '#748a6c');
    this.addTerminalText(x + width - 12, y + 67, 'POINTS', 7, '#748a6c').setOrigin(1, 0);

    const rowStartY = y + 94;
    const rowHeight = 21.5;
    for (let index = 0; index < 10; index += 1) {
      const score = scores[index];
      const rowY = rowStartY + index * rowHeight;
      const hasScore = Boolean(score && Number.isFinite(score.points));
      const rowColor = index < 3 ? ranking.accent : '#a8bca0';
      if (index < 3) {
        this.terminalRoot.add(this.add.rectangle(x + 5, rowY - 7, width - 10, 17, ranking.color, 0.08).setOrigin(0));
      }
      this.addTerminalText(x + 12, rowY, String(index + 1).padStart(2, '0'), 7, rowColor).setOrigin(0, 0.5);
      const fullName = hasScore ? String(score.name || '').replace(/\s+/g, ' ').trim() || '--' : '--';
      const name = this.addTerminalText(x + 36, rowY, fullName, 8, hasScore ? '#d0dfc5' : '#53694d').setOrigin(0, 0.5);
      this.fitText(name, width - 36 - 12 - 78 - 7, 8, 8);
      const points = this.addTerminalText(x + width - 12, rowY,
        hasScore ? score.points.toLocaleString('en-US') : '--', 7, hasScore ? rowColor : '#53694d').setOrigin(1, 0.5);
      this.fitText(points, 78, 7, 6);

      if (hasScore) {
        const hit = this.add.zone(x + 5, rowY - 9, width - 10, 20).setOrigin(0).setInteractive();
        this.terminalRoot.add(hit);
        hit.on('pointerover', () => this.showEntryStatus(score));
        hit.on('pointerout', () => this.resetEntryStatus());
      }
    }
  }

  createBackButton() {
    // Match the physical button painted on this specific monitor bezel.
    const cx = 316, cy = 677;
    const highlight = this.add.rectangle(cx, cy, 66, 30, 0x203728, 0.12)
      .setStrokeStyle(1, 0x8ea77c, 0.25);
    const label = this.addTerminalText(cx, cy, 'BACK', 8, '#c3d5b2').setOrigin(0.5);
    const hit = this.add.zone(cx, cy, 74, 40).setInteractive({ useHandCursor: true });
    this.terminalRoot.add(highlight);
    // Keep the label above the subtle highlight and below the input zone.
    this.terminalRoot.bringToTop(label);
    this.terminalRoot.add(hit);
    hit.on('pointerover', () => {
      if (this.isClosing) return;
      label.setColor('#f1ddb0');
      highlight.setFillStyle(0x698455, 0.25).setStrokeStyle(1, 0xc3d5b2, 0.8);
    });
    hit.on('pointerout', () => {
      label.setColor('#c3d5b2');
      highlight.setFillStyle(0x203728, 0.12).setStrokeStyle(1, 0x8ea77c, 0.25);
    });
    hit.on('pointerdown', (_p, _x, _y, event) => {
      event?.stopPropagation();
      this.closeHighscores();
    });
  }

  async closeHighscores() {
    if (this.isClosing || this._highscoreViewClosed) return;
    this.isClosing = true;
    playMenuActionAudio(this);
    if (this.openedFromSettings) {
      this.scene.stop();
      return;
    }
    const result = await this.goto('EnterScene');
    if (!result && !this._cleanupDone && !this._highscoreViewClosed) this.isClosing = false;
  }

  handleHighscoreShutdown() {
    if (this._highscoreViewClosed) return;
    this._highscoreViewClosed = true;
    this.scale.off('resize', this.layoutTerminal, this);
    this.events.off('shutdown', this.handleHighscoreShutdown, this);
    this.events.off('destroy', this.handleHighscoreShutdown, this);
    this.terminalRoot = null;
    this.inputBlocker = null;
    this.statusText = null;
    this.scoreManager = null;
  }
}