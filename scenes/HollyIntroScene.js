import { gameState } from '../GameData.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import {
  HollyIntroScene as HollyIntroStoryScene,
} from './HollyIntroStoryScene.js';

const TRUST_KEY = 'holly_trust';
const START_TRUST = 50;

const TRUST_BY_TONE = Object.freeze({
  serious: 10,
  sarcastic: -5,
  greedy: -10,
});

const GOLD = 0xd4af37;
const IVORY = 0xf3e7c4;
const PRESS = '"Press Start 2P", monospace';

function clampTrust(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getHollyTrust() {
  const value = MainStoryManager.getSideClue(TRUST_KEY)?.value;
  return Number.isFinite(value) ? clampTrust(value) : START_TRUST;
}

class HollyDialoguePanel extends DialoguePanel {
  constructor(scene, trust) {
    super(scene, { depth: 9000, modal: true });

    this.background = this.root;
    this.text = this.body;
    this.portraitObjects = [];
    this.stamp = null;
    this.items = [];
    this.leaveButton = { setVisible: () => this.leaveButton };

    this.isOpen = true;
    this.meterObjs.forEach(object => object.setVisible(false));
    this.numText.setVisible(false);
    this.toneObjs.forEach(object => object.setVisible(false));
    this.byeBtn.rect.setVisible(false);
    this.byeBtn.text.setVisible(false);
    this._setTabsVisible(false);
    this._setEntries([]);

    const { lx, lw, py, s } = this.L;
    this.meterWidth = Math.min(109 * s, lw * 0.40);
    this.meterX = lx + lw - this.meterWidth / 2;
    this.meterY = py + 52 * s;
    this.meterRadius = Math.min(25 * s, this.meterWidth * 0.40);

    this.meterFace = scene.add.graphics();
    this.root.add(this.meterFace);

    this.meterCaption = this._txt(
      this.meterX, py + 9 * s, '', PRESS, 7 * s, '#d4af37',
    ).setOrigin(0.5, 0);

    this.setTrust(trust);
    this._show();
  }

  get isTyping() {
    return this.mode === 'typing';
  }

  setTrust(value) {
    const next = clampTrust(value);
    const before = this.trustTweenState?.value ?? next;

    this.trustTween?.remove();
    this.trustTweenState = { value: before };
    this.meterCaption.setText(`TRUST ${next}`);

    if (before === next) {
      this.drawTrustDial(next);
      return;
    }

    this.trustTween = this.scene.tweens.add({
      targets: this.trustTweenState,
      value: next,
      duration: 320,
      ease: 'Sine.easeOut',
      onUpdate: () => this.drawTrustDial(this.trustTweenState.value),
      onComplete: () => {
        this.trustTween = null;
        this.drawTrustDial(next);
      },
    });
  }

  drawTrustDial(value) {
    const g = this.meterFace;
    const { s } = this.L;
    const x = this.meterX;
    const y = this.meterY;
    const r = this.meterRadius;

    g.clear();

    const colors = [0xb95749, 0xc99042, 0x669d62];
    colors.forEach((color, index) => {
      const start = Math.PI + index * Math.PI / 3 + 0.035;
      const end = Math.PI + (index + 1) * Math.PI / 3 - 0.035;
      g.lineStyle(5 * s, color, 1);
      g.beginPath();
      g.arc(x, y, r, start, end, false);
      g.strokePath();
    });

    g.lineStyle(Math.max(1, s), GOLD, 0.8);
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI + i * Math.PI / 4;
      const inner = r - 8 * s;
      const outer = r - 4 * s;
      g.lineBetween(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer,
      );
    }

    const angle = Math.PI + value / 100 * Math.PI;
    const length = Math.max(0, r - 5 * s);

    g.lineStyle(2 * s, IVORY, 1);
    g.lineBetween(
      x,
      y,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );

    g.fillStyle(GOLD, 1);
    g.fillCircle(x, y, 3 * s);
  }

  _handleKey(event) {
    if (
      !this.isOpen ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)
    ) return;

    // Enter i spację obsługuje oryginalna scena Holly.
    if (/^[1-9]$/.test(event.key)) {
      this._pickIndex(Number(event.key) - 1);
    }
  }

  _advance() {
    if (!this.isOpen || this.mode === 'choices') return;

    if (this.isTyping) {
      this.completeTypewriter();
      return;
    }

    if (this.scene.phase === 'dialogue') this.scene.advance();
  }

  advance() {
    this._advance();
  }

  setSpeaker({ name }) {
    this.nameText.setText(String(name ?? '').toUpperCase());
    const { lw, s } = this.L;
    this._fitWidth(
      this.nameText,
      Math.max(1, lw - this.meterWidth - 8 * s),
      14 * s,
      7 * s,
    );
  }

  setText(text, { instant = false } = {}) {
    this.stopTypewriter();
    this._showLine({ kind: 'say', text: String(text ?? '') });
    if (instant) this.completeTypewriter();
  }

  _afterLines() {
    const choosing = this.items.length > 0;
    this._setMode(choosing ? 'choices' : 'waiting');
    this.contArrow.setVisible(!choosing);
  }

  stopTypewriter() {
    this._cancelTyper();
    if (this.isTyping) this._setMode('waiting');
  }

  completeTypewriter() {
    if (this.isTyping) this._finishTyping();
  }

  setTopics(items) {
    this.items = items;
    this.scroll = 0;
    this.choiceTitle.setVisible(items.length > 0);

    if (items.length) this._setMode('choices');
    else if (this.mode === 'choices') this._setMode('waiting');

    this._setEntries(items.map(item => ({
      label: item.label,
      style: 'new',
    })));

    this.contArrow.setVisible(!items.length && this.mode === 'waiting');
  }

  _drawRows() {
    super._drawRows();

    const { rw, listY, s } = this.L;
    const step = 47 * s;
    const rowHeight = 43 * s;

    this.rows.forEach((row, index) => {
      if (!this._entries[this.scroll + index]) return;

      const y = listY + index * step;
      const width = Math.max(1, rw - 2 * s);
      const height = Math.max(1, rowHeight);

      row.bg.setY(y).setSize(width, height);
      row.bg.input?.hitArea?.setSize(width, height);
      row.num.setY(y + height / 2);

      row.label
        .setY(y + height / 2)
        .setWordWrapWidth(Math.max(1, rw - 42 * s), true)
        .setFontSize(15 * s)
        .setLineSpacing(0);

      let size = 15 * s;
      while (row.label.height > height - 2 * s && size > 8 * s) {
        size -= s;
        row.label.setFontSize(size);
      }
    });
  }

  _pickIndex(index) {
    if (!this.isOpen || this.mode !== 'choices') return;
    this.items[index]?.onSelect?.();
  }

  setStamp(label, { color = '#c0392b', slam = false } = {}) {
    this.clearStamp();

    const { lx, lw, py, ph, s } = this.L;
    this.stamp = this.scene.add.text(lx + lw / 2, py + ph - 42 * s, label, {
      fontFamily: PRESS,
      fontSize: `${12 * s}px`,
      color,
      stroke: '#17110a',
      strokeThickness: 4 * s,
    }).setOrigin(0.5).setAngle(-8);

    this.root.add(this.stamp);

    if (slam) {
      this.stamp.setScale(1.7);
      this.scene.tweens.add({
        targets: this.stamp,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    }
  }

  clearStamp() {
    if (!this.stamp) return;
    this.scene.tweens.killTweensOf(this.stamp);
    this.stamp.destroy();
    this.stamp = null;
  }

  destroy() {
    this.trustTween?.remove();
    this.trustTween = null;
    this.clearStamp();
    super.destroy();
  }
}

export class HollyIntroScene extends HollyIntroStoryScene {
  init(data = {}) {
    super.init(data);
    this.hollyTrust = getHollyTrust();
  }

  ensureDialoguePanel() {
    if (this.dialoguePanel?.isOpen) return this.dialoguePanel;

    const panel = new HollyDialoguePanel(this, this.hollyTrust);
    this.dialoguePanel = panel;
    this.dialogPanel = panel.background;
    this.dialogText = panel.text;
    this.continueText = panel.leaveButton;
    return panel;
  }

  pickDialogueOption(item, index) {
    const option = item?.options?.[index];
    if (this.phase !== 'dialogue-choice' || !option) return;

    super.pickDialogueOption(item, index);
    this.hollyTrust = clampTrust(
      this.hollyTrust + (TRUST_BY_TONE[option.tone] ?? 0),
    );
    this.dialoguePanel?.setTrust(this.hollyTrust);
  }

  applyChoice(choice) {
    const validReward = ['cash', 'rest', 'kit', 'travel'].includes(choice?.id);
    const completed =
      gameState.hollyIntroSeen === true ||
      ['cash', 'rest', 'kit', 'travel'].includes(gameState.hollyIntroChoice);

    if (!validReward || completed || this._applyingReward) {
      return super.applyChoice(choice);
    }

    const previous = MainStoryManager.getSideClue(TRUST_KEY);

    // Oryginalna scena uruchamia autosave podczas wyboru nagrody.
    MainStoryManager.setSideClue(TRUST_KEY, {
      value: this.hollyTrust,
    });

    try {
      return super.applyChoice(choice);
    } catch (error) {
      if (!gameState.hollyIntroSeen) {
        MainStoryManager.setSideClue(TRUST_KEY, previous ?? null);
      }
      throw error;
    }
  }
}