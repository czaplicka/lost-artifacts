import { dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { IncomingMobileAudio } from './phone/IncomingMobileAudio.js';

// Generic incoming phone. No case state, hypothesis navigation or evidence unlocks.
export class IncomingPhoneCallScene extends BaseScene {
  constructor() {
    super({ key: 'IncomingPhoneCallScene' });
    this.ui = [];
    this.ringTweens = [];
    this.mobileAudio = null;
  }
  init(data = {}) {
    this.mobileAudio?.destroy();
    this.mobileAudio = null;
    this.sourceScene = data.sourceScene || null;
    this.ui = [];
    this.ringTweens = [];
    this.controls = null;
    this.isAnswered = false;
    this.isEnding = false;
    this.isShuttingDown = false;
  }
  preload() { IncomingMobileAudio.preload(this); }
  word(id) { return dialogueText('scenes/PhoneCallScene.js', id); }
  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    const { width, height } = this.scale, cx = width / 2, cy = height / 2;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, .75)
      .setOrigin(0).setDepth(2000).setInteractive();
    overlay.on('pointerdown', (_p, _x, _y, event) => event?.stopPropagation());
    const body = this.add.rectangle(cx, cy, 380, 680, 0x1e222a).setStrokeStyle(4, 0x3a3f4d).setDepth(2001);
    const inner = this.add.rectangle(cx, cy, 360, 660, 0x14171d).setDepth(2001);
    const speaker = this.add.rectangle(cx, cy - 290, 80, 10, 0x0a0c0e).setStrokeStyle(2, 0x2c313c).setDepth(2002);
    const screen = this.add.rectangle(cx, cy - 110, 310, 300, 0x8bac0f).setStrokeStyle(4, 0x0f380f).setDepth(2002);
    const border = this.add.rectangle(cx, cy - 110, 302, 292, 0, 0).setStrokeStyle(2, 0x306230).setDepth(2002);
    const text = (x, y, value, size, center = false) => {
      const object = this.add.text(x, y, value, { fontFamily: 'PressStart2P', fontSize: `${size}px`,
        color: '#0f380f', align: 'center', wordWrap: { width: 280 } }).setDepth(2003);
      return center ? object.setOrigin(.5) : object;
    };
    const signal = text(cx - 135, cy - 245, this.word('t_d13c8ecee55104d8936a'), 12);
    const battery = text(cx + 85, cy - 245, this.word('t_c8c2b203b9eef66f484e'), 12);
    const title = text(cx, cy - 200, this.word('t_1f429f907feda571844d'), 14, true);
    const icon = this.add.text(cx, cy - 150, this.word('t_1a1bad4a8593d279e3ab'),
      { fontSize: '42px', color: '#0f380f' }).setOrigin(.5).setDepth(2003);
    const caller = text(cx, cy - 90, this.word('t_258648f8498aa3aecd7c'), 13, true);
    const ringing = text(cx, cy - 35, this.word('t_c5ae7a15b80d96573375'), 10, true).setColor('#306230');
    const button = (x, label) => text(x, cy + 18, label, 11, true)
      .setStyle({ backgroundColor: '#9bbc0f', padding: { left: 8, right: 8, top: 6, bottom: 6 } })
      .setInteractive({ useHandCursor: true });
    const answer = button(cx - 70, this.word('t_569571744c7853c81c52'));
    const ignore = button(cx + 70, this.word('t_3d71a7b1b5f2153ff09e'));
    const phone = [body, inner, speaker, screen, border, signal, battery, title, icon, caller,
      ringing, answer, ignore, ...this.drawKeypad(cx, cy + 180)];
    this.ui.push(overlay, ...phone);
    this.controls = { overlay, caller, answer, ignore };
    this.ringTweens.push(
      this.tweens.add({ targets: [icon, ringing], alpha: { from: .2, to: 1 }, duration: 500, yoyo: true, repeat: -1 }),
      this.tweens.add({ targets: phone, x: '+=2', duration: 50, yoyo: true, repeat: -1 })
    );
    for (const control of [answer, ignore]) {
      control.on('pointerover', () => {
        if (!this.isEnding && !this.isShuttingDown) control.setStyle({ color: '#9bbc0f', backgroundColor: '#0f380f' });
      });
      control.on('pointerout', () => {
        if (!this.isEnding && !this.isShuttingDown) control.setStyle({ color: '#0f380f', backgroundColor: '#9bbc0f' });
      });
    }
    // Call-specific actions belong to the owning scene, not this view.
    this.mobileAudio = new IncomingMobileAudio(this);
    this.mobileAudio.start();
  }
  drawKeypad(startX, startY) {
    const objects = [];
    ['1','2','3','4','5','6','7','8','9','*','0','#'].forEach((label, index) => {
      const x = startX + (index % 3 - 1) * 75, y = startY + Math.floor(index / 3) * 47;
      objects.push(this.add.rectangle(x, y, 60, 35, 0x2a2f3a).setStrokeStyle(2, 0x14171d).setDepth(2002),
        this.add.text(x, y, label, { fontFamily: 'PressStart2P', fontSize: '12px', color: '#a0aab0' })
          .setOrigin(.5).setDepth(2003));
    });
    return objects;
  }
  disablePhoneInput() {
    for (const object of this.ui) if (object?.scene?.sys?.input && object.input) object.disableInteractive();
  }
  stopRinging({ disableInput = true } = {}) {
    this.mobileAudio?.destroy();
    this.mobileAudio = null;
    const tweens = this.ringTweens;
    this.ringTweens = [];
    for (const tween of tweens) if (tween?.parent) tween.remove();
    if (disableInput && !this.isShuttingDown) this.disablePhoneInput();
  }
  onShutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.isEnding = true;
    this.stopRinging({ disableInput: false });
    const objects = this.ui;
    this.ui = [];
    this.controls = null;
    for (const object of objects) {
      if (!object?.scene) continue;
      object.removeAllListeners?.();
      object.destroy();
    }
  }
}
