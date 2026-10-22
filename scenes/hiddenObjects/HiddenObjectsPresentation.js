export class HiddenObjectsPresentation {
  constructor(scene) {
    this.scene = scene;
    this.flashOverlay = null;
    this.flashTween = null;
  }

  computePlayArea() {
    const scene = this.scene;
    const { width, height } = scene.scale;

    scene.playAreaWidth = Math.max(
      200,
      width - scene.sidebarWidth
    );

    scene.playAreaHeight = height;

    scene.playScale = Math.min(
      scene.playAreaWidth / scene.mapWidth,
      scene.playAreaHeight / scene.mapHeight
    );

    const renderedWidth =
      scene.mapWidth * scene.playScale;

    const renderedHeight =
      scene.mapHeight * scene.playScale;

    scene.playOffsetX =
      scene.sidebarWidth +
      (scene.playAreaWidth - renderedWidth) / 2;

    scene.playOffsetY =
      (scene.playAreaHeight - renderedHeight) / 2;
  }

  createBackground() {
    const scene = this.scene;

    const renderedWidth =
      scene.mapWidth * scene.playScale;

    const renderedHeight =
      scene.mapHeight * scene.playScale;

    if (scene.textures.exists(scene.backgroundKey)) {
      scene.add
        .image(
          scene.playOffsetX + renderedWidth / 2,
          scene.playOffsetY + renderedHeight / 2,
          scene.backgroundKey
        )
        .setDisplaySize(renderedWidth, renderedHeight)
        .setDepth(-10);
    } else {
      console.warn(
        '[HiddenObjectsPresentation] Background texture is missing.',
        {
          backgroundKey: scene.backgroundKey,
          backgroundPath: scene.backgroundPath,
          sceneId: scene.sceneId
        }
      );

      scene.add
        .rectangle(
          scene.sidebarWidth,
          0,
          scene.playAreaWidth,
          scene.playAreaHeight,
          0x15151a,
          1
        )
        .setOrigin(0, 0)
        .setDepth(-10);
    }

    scene.add
      .rectangle(
        scene.sidebarWidth,
        0,
        2,
        scene.scale.height,
        0xd4af37,
        0.45
      )
      .setOrigin(0, 0)
      .setDepth(900);
  }

  flashScreen(
    color = 0xffffff,
    alpha = 0.1,
    duration = 120
  ) {
    const scene = this.scene;

    if (!this.flashOverlay?.active) {
      this.flashOverlay = scene.add
        .rectangle(
          0,
          0,
          scene.scale.width,
          scene.scale.height,
          color,
          1
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2500)
        .setAlpha(0);
    }

    const flash = this.flashOverlay;

    this.flashTween?.stop();
    this.flashTween = null;

    flash
      .setSize(
        scene.scale.width,
        scene.scale.height
      )
      .setFillStyle(color, 1)
      .setAlpha(alpha)
      .setVisible(true);

    this.flashTween = scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        flash.setVisible(false);
        this.flashTween = null;
      }
    });

    return flash;
  }

  pulseZone(zone, color = 0x7cfc00) {
    if (!zone?.active) {
      return;
    }

    const visual = zone.getData('debugVisual');

    if (!visual?.active) {
      return;
    }

    const scene = this.scene;

    scene.tweens.killTweensOf(visual);

    visual
      .setScale(1)
      .setStrokeStyle(3, color, 1);

    const tween = scene.tweens.add({
      targets: visual,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });

    scene.addTrackedTween(tween);
  }

  bumpText(target) {
    if (!target?.active) {
      return;
    }

    const scene = this.scene;

    scene.tweens.killTweensOf(target);
    target.setScale(1);

    const tween = scene.tweens.add({
      targets: target,
      scale: 1.08,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });

    scene.addTrackedTween(tween);
  }

  destroy() {
    const scene = this.scene;

    this.flashTween?.stop();
    this.flashTween = null;

    if (this.flashOverlay?.active) {
      scene.tweens.killTweensOf(this.flashOverlay);
      this.flashOverlay.destroy();
    }

    this.flashOverlay = null;
  }
}