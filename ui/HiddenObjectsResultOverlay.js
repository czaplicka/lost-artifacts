import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  HO_COLORS as C, HO_FONTS as F, addPaper, createStamp,
  drawDashedLine, drawPaperclip
} from './HiddenObjectsTheme.js';

const RANKS = [
  { maxMisses: 0, title: __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_9f5f6a4d35b384a2fbdb") },
  { maxMisses: 2, title: __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_7b4f73dbc181cdaaa466") },
  { maxMisses: 5, title: __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_747bf1f8a763587e09c7") },
  { maxMisses: 9, title: __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_f3f94408f00852535441") },
  { maxMisses: Infinity, title: __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_61a4a02789c6ba79b361") }
];
const FAIL_QUIPS = [
  __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_80752605c63c9a182c56"),
  __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_757a0fa1ae133e95a15f"),
  __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_74ac50b9da1fc25b1cd4")
];
function getRankTitle(misses) {
  const safe = Math.max(0, Number(misses) || 0);
  return (RANKS.find(rank => safe <= rank.maxMisses) || RANKS.at(-1)).title;
}

export class HiddenObjectsResultOverlay {
  constructor(scene) {
    this.scene = scene;
    this.resultOverlay = null;
    this.resultContainer = null;
    this.autoReturnEvent = null;
    this.countdownEvent = null;
    this.countTween = null;
    this.isReturning = false;
  }

  showSuccessOverlay() {
    const scene = this.scene;
    scene.ui?.freezeForResult?.();
    const { width, height } = scene.scale;
    const panelWidth = 680;
    const panelHeight = 710;
    const centerX = scene.sidebarWidth + (width - scene.sidebarWidth) / 2;
    const centerY = height / 2;
    const remainingTimeBonus = scene.timeLeft * 2;
    const finalScore = scene.score;
    this.destroy();
    this.isReturning = false;
    this.createBackdrop(width, height, 0.72);
    this.createContainer(centerX, centerY, panelWidth, panelHeight);
    const root = this.resultContainer;
    const left = -panelWidth / 2 + 56;
    const right = panelWidth / 2 - 56;
    this.addPanel(root, panelWidth, panelHeight, { seed: 21, base: '#dfcd9f' });
    this.addText(root, 0, -306, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_47e89c20bcd401dc0d0b"), {
      fontFamily: F.pixel, fontSize: '10px', color: C.inkSoftHex
    });
    this.addText(root, 0, -260, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_2f46d707f4e546d6d338"), {
      fontFamily: F.body, fontSize: '40px', color: C.inkHex
    });
    this.addDashed(root, left, right, -222);
    this.addText(root, 0, -194, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_d2931470544bb10e6c8d"), {
      fontFamily: F.body, fontSize: '21px', color: C.inkSoftHex
    });
    this.addLedgerRow(root, -144, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_d61df6acbc04bdedf234"),
      `${scene.foundItems.size}/${scene.activeItems.length}`, left, right);
    this.addLedgerRow(root, -104, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_350cf2c3eee0bea7a991"), String(scene.incorrectClicks), left, right);
    this.addLedgerRow(root, -64, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_fc891b508273ef825c1d"), scene.formatTime(scene.timeLeft), left, right);
    this.addLedgerRow(root, -24, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_b8c6d6b0a08ae9c0ae78"), `+${remainingTimeBonus}`, left, right);
    this.addDashed(root, left, right, 10);
    this.addText(root, left, 46, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_edbb156278e07476cbd6"), {
      fontFamily: F.pixel, fontSize: '13px', color: C.inkHex
    }, 0, 0.5);
    const scoreValue = this.addText(root, right, 46, '0', {
      fontFamily: F.pixel, fontSize: '28px',
      color: finalScore < 0 ? C.redInkHex : C.greenHex
    }, 1, 0.5);
    this.startCountUp(scoreValue, finalScore);
    this.addText(root, 0, 92, `${__dialogueText("ui/HiddenObjectsResultOverlay.js", "t_d76c820f0e55ce3e8168")}${getRankTitle(scene.incorrectClicks)}`, {
      fontFamily: F.body, fontSize: '22px', color: C.inkHex
    });
    // Osobny pas pieczątki: pomiędzy rangą i instrukcją.
    this.addStamp(root, 0, 170, 'PROCESSED', C.green, C.greenHex, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_d1cd9e998821ebc562dd"));
    this.addText(root, 0, 248,
      __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_8f8bc5822666f59564a9"), {
        fontFamily: F.body, fontSize: '18px', color: C.inkSoftHex,
        align: 'center', wordWrap: { width: panelWidth - 130 }
      });
    this.addButton(root, 0, 310, 'CONTINUE', false, () => {
      scene.playSfx('correct', { volume: 0.35 });
      this.returnToCity(true, finalScore);
    });
    this.animateIn(centerY, 320);
  }

  showFailureOverlay() {
    const scene = this.scene;
    scene.ui?.freezeForResult?.();
    const { width, height } = scene.scale;
    const panelWidth = 680;
    const panelHeight = 640;
    const centerX = scene.sidebarWidth + (width - scene.sidebarWidth) / 2;
    const centerY = height / 2;
    this.destroy();
    this.isReturning = false;
    this.createBackdrop(width, height, 0.68);
    this.createContainer(centerX, centerY, panelWidth, panelHeight);
    const root = this.resultContainer;
    const left = -panelWidth / 2 + 56;
    const right = panelWidth / 2 - 56;
    this.addPanel(root, panelWidth, panelHeight, {
      seed: 34, base: '#d4bf9a', edge: '90,40,25'
    });
    this.addText(root, 0, -280, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_47e89c20bcd401dc0d0b"), {
      fontFamily: F.pixel, fontSize: '10px', color: C.inkSoftHex
    });
    this.addText(root, 0, -236, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_1b320346bff15d1d7818"), {
      fontFamily: F.body, fontSize: '38px', color: C.redInkHex
    });
    this.addDashed(root, left, right, -200);
    this.addText(root, 0, -162,
      __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_362518f084edb8f3a101"), {
        fontFamily: F.body, fontSize: '20px', color: C.inkHex,
        align: 'center', wordWrap: { width: panelWidth - 120 }
      });
    this.addLedgerRow(root, -106, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_d61df6acbc04bdedf234"),
      `${scene.foundItems.size}/${scene.activeItems.length}`, left, right);
    this.addLedgerRow(root, -66, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_350cf2c3eee0bea7a991"), String(scene.incorrectClicks), left, right);
    this.addLedgerRow(root, -26, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_38e5a46cbc5ad32842ac"), String(scene.score), left, right);
    this.addStamp(root, 0, 60, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_05747a33b4c540d40da7"), C.red, C.redHex, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_3747887720ccb5984ba5"));
    this.addText(root, 0, 152, FAIL_QUIPS[Math.floor(Math.random() * FAIL_QUIPS.length)], {
      fontFamily: F.body, fontSize: '18px', color: C.inkSoftHex,
      align: 'center', wordWrap: { width: panelWidth - 130 }
    });
    const autoReturnText = this.addText(root, 0, 210, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_4c2bf6836eeb43df0caa"), {
      fontFamily: F.body, fontSize: '17px', color: C.redInkHex, align: 'center'
    });
    let remaining = 3;
    this.countdownEvent = scene.time.addEvent({
      delay: 1000, repeat: 2,
      callback: () => {
        remaining -= 1;
        if (remaining > 0 && autoReturnText?.active) {
          autoReturnText.setText(`${__dialogueText("ui/HiddenObjectsResultOverlay.js", "t_b8b9654eec3030bd48c4")}${remaining}${__dialogueText("ui/HiddenObjectsResultOverlay.js", "t_ab5df625bc76dbd4e163")}`);
        }
      }
    });
    this.addButton(root, 0, 270, __dialogueText("ui/HiddenObjectsResultOverlay.js", "t_093570e5be9e06e5adb2"), true, () => {
      this.returnToCity(false, scene.score, true);
    });
    this.animateIn(centerY, 280);
    this.autoReturnEvent = scene.time.delayedCall(3000, () => {
      this.returnToCity(false, scene.score, true);
    });
  }

  createBackdrop(width, height, alpha) {
    this.resultOverlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, alpha)
      .setOrigin(0, 0).setDepth(3000).setAlpha(0).setInteractive();
    this.resultOverlay.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
    });
  }

  createContainer(centerX, centerY, panelWidth, panelHeight) {
    const { width, height } = this.scene.scale;
    const fit = Math.min(1,
      Math.max(1, width - this.scene.sidebarWidth - 32) / panelWidth,
      Math.max(1, height - 32) / panelHeight);
    this.resultContainer = this.scene.add.container(centerX, centerY)
      .setDepth(3001).setAlpha(0).setScale(fit);
  }

  addPanel(root, panelWidth, panelHeight, paperOptions) {
    const scene = this.scene;
    const shadow = scene.add.rectangle(7, 9, panelWidth, panelHeight, 0x000000, 0.5);
    const paper = addPaper(scene, 0, 0, panelWidth, panelHeight, {
      origin: 0.5, ...paperOptions
    });
    const border = scene.add.rectangle(0, 0, panelWidth - 18, panelHeight - 18)
      .setStrokeStyle(1, C.ink, 0.3);
    const clip = drawPaperclip(scene, 0, -panelHeight / 2 + 2);
    root.add([shadow, paper, border, clip]);
  }

  addText(root, x, y, text, style, originX = 0.5, originY = 0.5) {
    const label = this.scene.add.text(x, y, text, style).setOrigin(originX, originY);
    root.add(label);
    return label;
  }

  addDashed(root, x1, x2, y) {
    const g = this.scene.add.graphics();
    g.lineStyle(2, C.ink, 0.4);
    drawDashedLine(g, x1, x2, y);
    root.add(g);
  }

  addLedgerRow(root, y, label, value, left, right) {
    const scene = this.scene;
    const labelText = scene.add.text(left, y, label, {
      fontFamily: F.body, fontSize: '22px', color: C.inkHex
    }).setOrigin(0, 0.5);
    const valueText = scene.add.text(right, y, value, {
      fontFamily: F.pixel, fontSize: '14px', color: C.inkHex
    }).setOrigin(1, 0.5);
    const dots = scene.add.graphics();
    dots.fillStyle(C.inkSoft, 0.5);
    for (let x = left + labelText.width + 12; x < right - valueText.width - 12; x += 7) {
      dots.fillRect(x, y + 7, 2, 2);
    }
    root.add([labelText, valueText, dots]);
  }

  addButton(root, x, y, text, danger, onClick) {
    const scene = this.scene;
    const fill = danger ? 0x6b2a2a : C.brass;
    const fillHover = danger ? 0x823333 : C.brassLight;
    const stroke = danger ? 0xd88b8b : C.goldLight;
    const background = scene.add.rectangle(x, y, 300, 56, fill, 1)
      .setStrokeStyle(3, stroke, 0.95).setInteractive({ useHandCursor: true });
    const label = scene.add.text(x, y, text, {
      fontFamily: F.pixel, fontSize: '14px', color: danger ? '#fff1f1' : '#fff7dc'
    }).setOrigin(0.5);
    let clicked = false;
    background.on('pointerover', () => background.setFillStyle(fillHover, 1));
    background.on('pointerout', () => background.setFillStyle(fill, 1));
    background.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
      if (clicked || this.isReturning) return;
      clicked = true;
      onClick();
    });
    root.add([background, label]);
  }

  addStamp(root, x, y, text, color, colorHex, sub) {
    const scene = this.scene;
    const stamp = createStamp(scene, x, y, text, color, colorHex, {
      angle: -6, fontSize: 20, sub, alpha: 0.9
    });
    // Animacja mieści się w wydzielonym pasie, nie powiększa pieczątki na tekst.
    stamp.setAlpha(0).setScale(0.92);
    root.add(stamp);
    scene.tweens.add({
      targets: stamp, alpha: 0.9, scale: 1,
      duration: 220, delay: 700, ease: 'Cubic.Out',
      onComplete: () => {
        if (!scene._cleanupDone && !this.isReturning) {
          scene.cameras?.main?.shake(90, 0.003);
        }
      }
    });
  }

  startCountUp(valueText, finalScore) {
    if (!Number.isFinite(finalScore) || finalScore === 0) {
      valueText.setText(String(finalScore || 0));
      return;
    }
    this.countTween = this.scene.tweens.addCounter({
      from: 0, to: finalScore, duration: 900, delay: 350, ease: 'Cubic.Out',
      onUpdate: tween => {
        if (valueText?.active) valueText.setText(String(Math.round(tween.getValue())));
      },
      onComplete: () => {
        if (valueText?.active) valueText.setText(String(finalScore));
      }
    });
  }

  animateIn(centerY, duration) {
    this.scene.tweens.add({
      targets: this.resultOverlay, alpha: 1, duration: 220, ease: 'Power2'
    });
    this.scene.tweens.add({
      targets: this.resultContainer, alpha: 1, y: centerY - 8,
      duration, ease: 'Back.Out'
    });
  }

  returnToCity(success, score, timedOut = false) {
    if (this.isReturning) return;
    this.isReturning = true;
    if (this.autoReturnEvent) {
      this.autoReturnEvent.remove(false);
      this.autoReturnEvent = null;
    }
    if (this.countdownEvent) {
      this.countdownEvent.remove(false);
      this.countdownEvent = null;
    }
    const shouldShowSuspectTutorial = Boolean(
      success && this.scene.returnScene === 'CrimeCityScene'
    );
    this.scene.returnToSafeScene({
      ...this.scene.returnData,
      hiddenObjectsSuccess: success,
      hiddenObjectsTimedOut: timedOut,
      hiddenObjectsScore: score,
      incorrectClicks: this.scene.incorrectClicks,
      foundItems: Array.from(this.scene.foundItems),
      sceneId: this.scene.sceneId,
      showSuspectTutorial: shouldShowSuspectTutorial
    });
  }

  destroy() {
    if (this.autoReturnEvent) {
      this.autoReturnEvent.remove(false);
      this.autoReturnEvent = null;
    }
    if (this.countdownEvent) {
      this.countdownEvent.remove(false);
      this.countdownEvent = null;
    }
    if (this.countTween) {
      this.countTween.stop();
      this.countTween = null;
    }
    if (this.resultContainer) {
      this.scene.tweens?.killTweensOf(this.resultContainer);
      for (const child of this.resultContainer.list || []) {
        this.scene.tweens?.killTweensOf(child);
      }
      this.resultContainer.destroy();
      this.resultContainer = null;
    }
    if (this.resultOverlay) {
      this.scene.tweens?.killTweensOf(this.resultOverlay);
      this.resultOverlay.destroy();
      this.resultOverlay = null;
    }
  }
}