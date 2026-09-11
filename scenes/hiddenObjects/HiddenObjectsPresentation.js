export class HiddenObjectsPresentation {
  constructor(scene) {
    this.scene = scene;
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
    const { height } = scene.scale;

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
        .setDisplaySize(
          renderedWidth,
          renderedHeight
        )
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
        height,
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

    const flash = scene.add
      .rectangle(
        0,
        0,
        scene.scale.width,
        scene.scale.height,
        color,
        alpha
      )
      .setOrigin(0, 0)
      .setDepth(2500);

    const tween = scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        flash.destroy();
      }
    });

    scene.addTrackedTween(tween);

    return flash;
  }

  pulseZone(zone, color = 0x7cfc00) {
    if (!zone || !zone.active) {
      return;
    }

    const scene = this.scene;

    const scaleX = zone.scaleX || 1;
    const scaleY = zone.scaleY || 1;

    zone.setStrokeStyle(3, color, 1);

    const tween = scene.tweens.add({
      targets: zone,
      scaleX: scaleX * 1.08,
      scaleY: scaleY * 1.08,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });

    scene.addTrackedTween(tween);
  }

  bumpText(target) {
    if (!target || !target.active) {
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
}