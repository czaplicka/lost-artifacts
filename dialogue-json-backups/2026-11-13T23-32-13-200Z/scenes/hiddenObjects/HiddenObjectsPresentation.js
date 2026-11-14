import {
  HO_COLORS as C,
  HO_FONTS as F,
  ensureNoiseTile,
  ensureVignetteTexture
} from '../../ui/HiddenObjectsTheme.js';

const DUST_MOTES = 14;
const INTRO_ENABLED = true;
const INTRO_HOLD_MS = 1300;
const TAPE_TEXT = 'CRIME SCENE   DO NOT CROSS   ';

export class HiddenObjectsPresentation {
  constructor(scene) {
    this.scene = scene;
    this.flashOverlay = null;
    this.flashTween = null;
    this.decor = [];
    this.markers = [];
    this.introObjects = [];
    this.introTimer = null;
    this.outroTimer = null;
  }

  isAlive() {
    const scene = this.scene;
    return Boolean(scene && !scene._cleanupDone &&
      !scene.isShuttingDownHiddenObjects && scene.sys?.isActive());
  }

  keep(list, object) {
    list.push(object);
    return object;
  }

  track(tween) {
    this.scene.addTrackedTween?.(tween);
    return tween;
  }

  computePlayArea() {
    const scene = this.scene;
    const { width, height } = scene.scale;
    scene.playAreaWidth = Math.max(200, width - scene.sidebarWidth);
    scene.playAreaHeight = height;
    scene.playScale = Math.min(
      scene.playAreaWidth / scene.mapWidth,
      scene.playAreaHeight / scene.mapHeight
    );
    const renderedWidth = scene.mapWidth * scene.playScale;
    const renderedHeight = scene.mapHeight * scene.playScale;
    scene.playOffsetX = scene.sidebarWidth + (scene.playAreaWidth - renderedWidth) / 2;
    scene.playOffsetY = (scene.playAreaHeight - renderedHeight) / 2;
  }

  createBackground() {
    const scene = this.scene;
    const renderedWidth = scene.mapWidth * scene.playScale;
    const renderedHeight = scene.mapHeight * scene.playScale;
    const noiseKey = ensureNoiseTile(scene);
    if (noiseKey) {
      this.keep(this.decor, scene.add.tileSprite(
        scene.sidebarWidth, 0, scene.playAreaWidth, scene.playAreaHeight, noiseKey
      ).setOrigin(0, 0).setDepth(-20));
    }
    if (scene.textures.exists(scene.backgroundKey)) {
      scene.add.image(
        scene.playOffsetX + renderedWidth / 2,
        scene.playOffsetY + renderedHeight / 2,
        scene.backgroundKey
      ).setDisplaySize(renderedWidth, renderedHeight).setDepth(-10);
    } else {
      console.warn('[HiddenObjectsPresentation] Background texture is missing.', {
        backgroundKey: scene.backgroundKey,
        backgroundPath: scene.backgroundPath,
        sceneId: scene.sceneId
      });
      scene.add.rectangle(
        scene.sidebarWidth, 0, scene.playAreaWidth, scene.playAreaHeight, 0x15151a, 1
      ).setOrigin(0, 0).setDepth(-10);
    }
    this.createAtmosphere(renderedWidth, renderedHeight);
    scene.add.rectangle(
      scene.sidebarWidth, 0, 2, scene.scale.height, C.gold, 0.45
    ).setOrigin(0, 0).setDepth(900);
    if (INTRO_ENABLED) {
      this.introTimer = scene.time.delayedCall(80, () => {
        this.introTimer = null;
        this.playIntro();
      });
    }
  }

  createAtmosphere(renderedWidth, renderedHeight) {
    const scene = this.scene;
    const ox = scene.playOffsetX, oy = scene.playOffsetY;
    const vignetteKey = ensureVignetteTexture(scene);
    if (vignetteKey) {
      this.keep(this.decor, scene.add.image(
        ox + renderedWidth / 2, oy + renderedHeight / 2, vignetteKey
      ).setDisplaySize(renderedWidth, renderedHeight).setDepth(5));
    }
    const frame = this.keep(this.decor, scene.add.graphics().setDepth(6));
    frame.lineStyle(2, C.gold, 0.75);
    frame.strokeRect(ox, oy, renderedWidth, renderedHeight);
    frame.lineStyle(1, 0x000000, 0.55);
    frame.strokeRect(ox + 2, oy + 2, renderedWidth - 4, renderedHeight - 4);
    const inset = 12, length = 30;
    frame.lineStyle(3, C.goldLight, 0.9);
    const corner = (cx, cy, dx, dy) => {
      frame.beginPath();
      frame.moveTo(cx, cy + dy * length);
      frame.lineTo(cx, cy);
      frame.lineTo(cx + dx * length, cy);
      frame.strokePath();
    };
    corner(ox + inset, oy + inset, 1, 1);
    corner(ox + renderedWidth - inset, oy + inset, -1, 1);
    corner(ox + inset, oy + renderedHeight - inset, 1, -1);
    corner(ox + renderedWidth - inset, oy + renderedHeight - inset, -1, -1);
    for (let i = 0; i < DUST_MOTES; i += 1) {
      const x = ox + Math.random() * renderedWidth;
      const y = oy + Math.random() * renderedHeight;
      const radius = Phaser.Math.FloatBetween(0.8, 2.2);
      const mote = this.keep(this.decor, scene.add.circle(
        x, y, radius, 0xfff0c8, Phaser.Math.FloatBetween(0.1, 0.24)
      ).setDepth(7));
      this.track(scene.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-36, 36),
        y: y - Phaser.Math.Between(30, 80),
        alpha: 0.02,
        duration: Phaser.Math.Between(4500, 8500),
        delay: Phaser.Math.Between(0, 3000),
        yoyo: true, repeat: -1, ease: 'Sine.InOut'
      }));
    }
  }

  playIntro() {
    const scene = this.scene;
    if (!this.isAlive() || scene.isSceneFinished) return;
    const { width, height } = scene.scale;
    const cx = scene.sidebarWidth + scene.playAreaWidth / 2;
    const cy = height / 2;
    const dim = this.keep(this.introObjects, scene.add.rectangle(
      scene.sidebarWidth, 0, scene.playAreaWidth, height, 0x000000, 0.5
    ).setOrigin(0, 0).setDepth(1900).setAlpha(0));
    const bandWidth = width + 700;
    const band = scene.add.rectangle(0, 0, bandWidth, 62, C.tapeYellow, 1);
    const edgeTop = scene.add.rectangle(0, -26, bandWidth, 5, C.plate, 1);
    const edgeBottom = scene.add.rectangle(0, 26, bandWidth, 5, C.plate, 1);
    const tapeText = scene.add.text(
      0, 0, TAPE_TEXT.repeat(Math.ceil(bandWidth / 380)),
      { fontFamily: F.pixel, fontSize: '14px', color: '#1a1511' }
    ).setOrigin(0.5);
    const tape = this.keep(this.introObjects, scene.add.container(
      -bandWidth, cy - 30, [band, edgeTop, edgeBottom, tapeText]
    ).setDepth(1950).setAngle(-4));
    const title = this.keep(this.introObjects, scene.add.text(
      cx, cy + 64, String(scene.title || 'Crime Scene'), {
        fontFamily: F.body, fontSize: '38px', color: C.cream,
        stroke: '#000000', strokeThickness: 6, align: 'center',
        wordWrap: { width: scene.playAreaWidth - 80 }
      }
    ).setOrigin(0.5, 0).setDepth(1960).setAlpha(0));
    const count = Array.isArray(scene.activeItems) ? scene.activeItems.length : 0;
    const subtitle = this.keep(this.introObjects, scene.add.text(
      cx, title.y + title.height + 12,
      `Find ${count} pieces of evidence. The clock is already ticking.`, {
        fontFamily: F.body, fontSize: '20px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 4, align: 'center',
        wordWrap: { width: scene.playAreaWidth - 80 }
      }
    ).setOrigin(0.5, 0).setDepth(1960).setAlpha(0));
    this.track(scene.tweens.add({ targets: dim, alpha: 1, duration: 250, ease: 'Linear' }));
    this.track(scene.tweens.add({ targets: tape, x: width / 2, duration: 420, ease: 'Cubic.Out' }));
    this.track(scene.tweens.add({
      targets: [title, subtitle], alpha: 1, duration: 260, delay: 260, ease: 'Linear'
    }));
    this.outroTimer = scene.time.delayedCall(420 + INTRO_HOLD_MS, () => {
      this.outroTimer = null;
      this.playOutro(tape, [dim, title, subtitle], width, bandWidth);
    });
  }

  playOutro(tape, fadeTargets, width, bandWidth) {
    const scene = this.scene;
    if (!this.isAlive()) return;
    this.track(scene.tweens.add({
      targets: tape, x: width + bandWidth, duration: 380, ease: 'Cubic.In'
    }));
    this.track(scene.tweens.add({
      targets: fadeTargets, alpha: 0, duration: 340, ease: 'Linear',
      onComplete: () => this.clearIntro()
    }));
  }

  clearIntro() {
    const scene = this.scene;
    for (const object of this.introObjects) {
      if (object?.active) {
        scene.tweens?.killTweensOf(object);
        object.destroy();
      }
    }
    this.introObjects = [];
  }

  markFound(zone, { points = 0, order = 0 } = {}) {
    const scene = this.scene;
    if (!this.isAlive() || !zone?.active) return;
    const x = zone.x, y = zone.y;
    const rx = Math.max(40, zone.width) / 2 + 14;
    const ry = Math.max(40, zone.height) / 2 + 14;
    const circle = this.keep(this.markers, scene.add.graphics({ x, y }).setDepth(20));
    circle.setRotation(Phaser.Math.FloatBetween(-0.12, 0.12));
    circle.lineStyle(5, C.red, 0.95);
    circle.strokeEllipse(0, 0, rx * 2, ry * 2);
    circle.lineStyle(3, C.red, 0.7);
    circle.strokeEllipse(2, -1, rx * 2 + 8, ry * 2 - 6);
    circle.setScale(1.5).setAlpha(0);
    this.track(scene.tweens.add({
      targets: circle, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out'
    }));
    const burst = scene.add.ellipse(x, y, rx * 2, ry * 2)
      .setStrokeStyle(4, 0xffd966, 1).setDepth(22);
    this.track(scene.tweens.add({
      targets: burst, scaleX: 1.8, scaleY: 1.8, alpha: 0,
      duration: 380, ease: 'Quad.Out', onComplete: () => burst.destroy()
    }));

    // Żółty trójkątny znacznik dowodu, zamiast kwadratowej tabliczki.
    if (order > 0) {
      const tagX = Phaser.Math.Clamp(
        x + rx * 0.72, scene.sidebarWidth + 20, scene.scale.width - 20
      );
      const tagY = Math.max(26, y - ry * 0.72);
      const tagBody = scene.add
        .triangle(0, 0, 0, 36, 18, 0, 36, 36, C.tapeYellow, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, C.ink, 1);
      const tagNumber = scene.add.text(0, 6, String(order), {
        fontFamily: F.pixel,
        fontSize: order > 9 ? '10px' : '12px',
        color: C.inkHex
      }).setOrigin(0.5);
      const tag = this.keep(this.markers, scene.add.container(
        tagX, tagY, [tagBody, tagNumber]
      ).setDepth(21).setScale(0));
      this.track(scene.tweens.add({
        targets: tag, scale: 1, duration: 240, delay: 140, ease: 'Back.Out'
      }));
    }
    this.floatText(x, y - ry - 10, points >= 0 ? `+${points}` : String(points), '#7CFC00');
  }

  markMiss(pointer, points = 0) {
    const scene = this.scene;
    if (!this.isAlive() || !pointer) return;
    const cross = scene.add.graphics({ x: pointer.x, y: pointer.y }).setDepth(25);
    cross.lineStyle(5, C.red, 1);
    cross.beginPath();
    cross.moveTo(-12, -12);
    cross.lineTo(12, 12);
    cross.moveTo(12, -12);
    cross.lineTo(-12, 12);
    cross.strokePath();
    cross.setScale(1.4);
    this.track(scene.tweens.add({
      targets: cross, scale: 0.8, alpha: 0, duration: 450, ease: 'Quad.Out',
      onComplete: () => cross.destroy()
    }));
    this.floatText(pointer.x, pointer.y - 22, points >= 0 ? `+${points}` : String(points), '#ff8a8a');
  }

  floatText(x, y, text, color) {
    const scene = this.scene;
    const label = scene.add.text(x, y, text, {
      fontFamily: F.pixel, fontSize: '16px', color,
      stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(30);
    this.track(scene.tweens.add({
      targets: label, y: y - 48, alpha: 0, duration: 900, ease: 'Quad.Out',
      onComplete: () => label.destroy()
    }));
    return label;
  }

  flashScreen(color = 0xffffff, alpha = 0.1, duration = 120) {
    const scene = this.scene;
    if (!this.flashOverlay?.active) {
      this.flashOverlay = scene.add.rectangle(
        0, 0, scene.scale.width, scene.scale.height, color, 1
      ).setOrigin(0, 0).setScrollFactor(0).setDepth(2500).setAlpha(0);
    }
    const flash = this.flashOverlay;
    this.flashTween?.stop();
    this.flashTween = null;
    flash.setSize(scene.scale.width, scene.scale.height)
      .setFillStyle(color, 1).setAlpha(alpha).setVisible(true);
    this.flashTween = scene.tweens.add({
      targets: flash, alpha: 0, duration, ease: 'Linear',
      onComplete: () => {
        flash.setVisible(false);
        this.flashTween = null;
      }
    });
    return flash;
  }

  pulseZone(zone, color = 0x7cfc00) {
    if (!zone?.active) return;
    const visual = zone.getData('debugVisual');
    if (!visual?.active) return;
    const scene = this.scene;
    scene.tweens.killTweensOf(visual);
    visual.setScale(1).setStrokeStyle(3, color, 1);
    const tween = scene.tweens.add({
      targets: visual, scaleX: 1.08, scaleY: 1.08,
      duration: 90, yoyo: true, ease: 'Quad.Out'
    });
    scene.addTrackedTween(tween);
  }

  bumpText(target) {
    if (!target?.active) return;
    const scene = this.scene;
    scene.tweens.killTweensOf(target);
    target.setScale(1);
    const tween = scene.tweens.add({
      targets: target, scale: 1.08, duration: 90, yoyo: true, ease: 'Quad.Out'
    });
    scene.addTrackedTween(tween);
  }

  destroy() {
    const scene = this.scene;
    this.introTimer?.remove(false);
    this.introTimer = null;
    this.outroTimer?.remove(false);
    this.outroTimer = null;
    this.flashTween?.stop();
    this.flashTween = null;
    if (this.flashOverlay?.active) {
      scene.tweens?.killTweensOf(this.flashOverlay);
      this.flashOverlay.destroy();
    }
    this.flashOverlay = null;
    this.clearIntro();
    for (const list of [this.decor, this.markers]) {
      for (const object of list) {
        if (object?.active) {
          scene.tweens?.killTweensOf(object);
          object.destroy();
        }
      }
    }
    this.decor = [];
    this.markers = [];
  }
}