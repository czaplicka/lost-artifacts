import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  completeOfficeMoveIn
} from '../../managers/PIOfficeShopManager.js';

export class OfficeMoveIn {
  constructor(scene, startBounds = null, onComplete = null) {
    this.scene = scene;
    this.onComplete = onComplete;
    this.dead = false;
    this.done = false;
    this.zoom = 0;
    this.slide = 0;
    this.timer = null;
    this.tween = null;

    const { width, height } = scene.scale;

    const b = startBounds || {
      x: width * 0.3,
      y: height * 0.3,
      w: width * 0.4,
      h: height * 0.4
    };

    this.start = {
      x: b.x / width,
      y: b.y / height,
      w: b.w / width,
      h: b.h / height
    };

    this.root = scene.add.container(0, 0).setDepth(6000);

    this.blocker = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.92)
      .setOrigin(0)
      .setInteractive();

    this.reality = scene.add
      .image(0, 0, 'bigger-office-reality')
      .setOrigin(0)
      .setVisible(false);

    this.ad = scene.add
      .image(0, 0, 'bigger-office-ad')
      .setOrigin(0);

    this.caption = scene.add.text(
      0,
      0,
      __dialogueText("scenes/pi-office/OfficeMoveIn.js", "t_562844445339553ed5f5") +
        __dialogueText("scenes/pi-office/OfficeMoveIn.js", "t_f6c79fa9c364fa7aafea"),
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '22px',
        color: '#fff1ce',
        backgroundColor: '#191b16',
        padding: { x: 18, y: 12 },
        align: 'center'
      }
    ).setOrigin(0.5).setVisible(false);

    this.button = scene.add.text(
      0,
      0,
      __dialogueText("scenes/pi-office/OfficeMoveIn.js", "t_127e7c579e43c0d12574"),
      {
        fontFamily: 'PressStart2P, monospace',
        fontSize: '15px',
        color: '#1d241b',
        backgroundColor: '#d4af37',
        padding: { x: 22, y: 18 }
      }
    )
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.button.on('pointerdown', () => this.finish());

    this.root.add([
      this.blocker,
      this.reality,
      this.ad,
      this.caption,
      this.button
    ]);

    this.resize = () => this.layout();
    scene.scale.on('resize', this.resize);

    this.layout();

    this.tween = scene.tweens.add({
      targets: this,
      zoom: 1,
      duration: 900,
      ease: 'Cubic.InOut',
      onUpdate: () => this.layout(),
      onComplete: () => {
        if (this.dead) return;

        this.timer = scene.time.delayedCall(
          650,
          () => this.reveal()
        );
      }
    });
  }

  layout() {
    if (this.dead) return;

    const { width: w, height: h } = this.scene.scale;

    this.blocker.setSize(w, h);
    this.reality.setDisplaySize(w, h);

    const z = this.zoom;

    const x = this.start.x * w * (1 - z);
    const y =
      this.start.y * h * (1 - z) +
      this.slide * h;

    const imageW =
      this.start.w * w +
      (w - this.start.w * w) * z;

    const imageH =
      this.start.h * h +
      (h - this.start.h * h) * z;

    this.ad
      .setPosition(x, y)
      .setDisplaySize(imageW, imageH);

    this.caption
      .setPosition(w / 2, h * 0.76)
      .setWordWrapWidth(Math.max(160, w - 40));

    this.button.setPosition(w / 2, h * 0.91);
  }

  reveal() {
    if (this.dead) return;

    this.reality.setVisible(true);

    this.tween = this.scene.tweens.add({
      targets: this,
      slide: 1,
      duration: 1100,
      ease: 'Cubic.InOut',
      onUpdate: () => this.layout(),
      onComplete: () => {
        if (this.dead) return;

        this.caption.setVisible(true);
        this.button.setVisible(true);
      }
    });
  }

  finish() {
    if (this.dead || this.done) return;

    this.done = true;
    completeOfficeMoveIn();

    const callback = this.onComplete;

    this.destroy();
    callback?.();
  }

  destroy() {
    if (this.dead) return;

    this.dead = true;

    this.timer?.remove(false);
    this.tween?.stop();

    this.scene.scale.off('resize', this.resize);

    this.root?.destroy(true);
    this.root = null;
  }
}