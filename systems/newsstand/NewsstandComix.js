export class NewsstandComix {
  constructor(scene) {
    this.scene = scene;

    this.root = null;
    this.blocker = null;
    this.container = null;
    this.image = null;
    this.closeButton = null;

    this.isOpen = false;
    this.isAnimating = false;
    this.destroyed = false;
  }

  create() {
    const scene = this.scene;
    const { width, height } = scene.scale;

    this.root = scene.add
      .container(0, 0)
      .setDepth(200)
      .setVisible(false)
      .setAlpha(0);

    this.blocker = scene.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0.72
      )
      .setOrigin(0, 0)
      .setInteractive();

    this.blocker.on(
      'pointerup',
      () => this.close()
    );

    this.container = scene.add
      .container(width / 2, height / 2)
      .setAlpha(0)
      .setScale(0.9);

    this.image = scene.add
      .image(0, 0, '__WHITE')
      .setOrigin(0.5);

    this.closeButton = scene.add
      .text(0, 0, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#111111',
        padding: { x: 8, y: 6 }
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.closeButton.on(
      'pointerup',
      () => this.close()
    );

    this.container.add([
      this.image,
      this.closeButton
    ]);

    this.root.add([
      this.blocker,
      this.container
    ]);

    this.resize();
  }

  layout() {
    if (!this.image || !this.closeButton) return;

    const width = this.image.width || 1;
    const height = this.image.height || 1;

    const scale = Math.min(
      this.scene.scale.width * 0.84 / width,
      this.scene.scale.height * 0.82 / height,
      1
    );

    const displayWidth = width * scale;
    const displayHeight = height * scale;

    this.image.setDisplaySize(
      displayWidth,
      displayHeight
    );

    this.closeButton.setPosition(
      displayWidth / 2 - 12,
      -displayHeight / 2 + 12
    );

    this.container.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2
    );
  }

  open(textureKey) {
    if (
      this.destroyed ||
      !this.root ||
      this.isOpen ||
      this.isAnimating ||
      !this.scene.textures.exists(textureKey)
    ) {
      return false;
    }

    this.isOpen = true;
    this.isAnimating = true;

    this.image.setTexture(textureKey);
    this.layout();

    this.root
      .setVisible(true)
      .setAlpha(0);

    this.container
      .setAlpha(0)
      .setScale(0.9)
      .setAngle(0)
      .setPosition(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2 + 12
      );

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.root,
        alpha: 1,
        duration: 140,
        ease: 'Quad.Out'
      })
    );

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: this.scene.scale.height / 2,
        duration: 200,
        ease: 'Back.Out',
        onComplete: () => {
          if (!this.destroyed) {
            this.isAnimating = false;
          }
        }
      })
    );

    return true;
  }

  close(onClosed = null) {
    if (
      this.destroyed ||
      !this.isOpen ||
      this.isAnimating
    ) {
      return;
    }

    this.isAnimating = true;

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.root,
        alpha: 0,
        duration: 140,
        ease: 'Quad.Out'
      })
    );

    this.scene.addTrackedTween(
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        scaleX: 0.86,
        scaleY: 0.86,
        y: this.scene.scale.height / 2 + 18,
        angle: 1.5,
        duration: 180,
        ease: 'Quad.In',
        onComplete: () => {
          if (this.destroyed) return;

          this.root.setVisible(false);

          this.container
            .setAlpha(0)
            .setAngle(0)
            .setPosition(
              this.scene.scale.width / 2,
              this.scene.scale.height / 2
            );

          this.isOpen = false;
          this.isAnimating = false;

          onClosed?.();
        }
      })
    );
  }

  resize() {
    if (this.destroyed) return;

    const { width, height } = this.scene.scale;

    this.blocker?.setSize(width, height);

    this.blocker?.input?.hitArea?.setTo(
      0,
      0,
      width,
      height
    );

    this.layout();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    const targets = [
      this.root,
      this.container
    ].filter(Boolean);

    this.scene.tweens.killTweensOf(targets);

    this.root?.destroy(true);

    this.root = null;
    this.blocker = null;
    this.container = null;
    this.image = null;
    this.closeButton = null;

    this.isOpen = false;
    this.isAnimating = false;
  }
}