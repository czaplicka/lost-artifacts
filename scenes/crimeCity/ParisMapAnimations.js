// Decorative rain overlay.
// Reference map size: 1920 x 1080.
// No additional assets required.

const WIDTH = 1920;
const HEIGHT = 1080;
const DROP_COUNT = 70;

export class ParisMapAnimations {
  constructor(scene, background) {
    this.scene = scene;
    this.background = background;
    this.disposed = false;
    this.elapsed = 0;

    this.rain = scene.add.graphics().setVisible(false);

    scene.events.on('update', this.update, this);
    scene.events.on('sleep', this.hide, this);
    scene.events.on('pause', this.hide, this);

    scene.events.once('shutdown', this.destroy, this);
    scene.events.once('destroy', this.destroy, this);

    scene.scale.on('resize', this.layout, this);

    this.layout();
    this.update(0, 0);
  }

  layout() {
    const background = this.background;

    if (this.disposed || !background?.active) return;

    this.rain
      .setPosition(
        background.x -
          background.displayWidth * (background.originX ?? 0.5),

        background.y -
          background.displayHeight * (background.originY ?? 0.5)
      )
      .setScale(
        background.displayWidth / WIDTH,
        background.displayHeight / HEIGHT
      )
      .setScrollFactor(
        background.scrollFactorX ?? 1,
        background.scrollFactorY ?? 1
      )
      .setDepth((background.depth ?? -10) + 0.1);
  }

  hide() {
    if (this.disposed) return;

    this.rain.setVisible(false);
  }

  update(_time, delta) {
    if (this.disposed) return;

    const scene = this.scene;
    const background = this.background;

    const backgroundKey =
      scene.crimeCityConfig?.backgroundKey || 'paris_crime';

    const visible = Boolean(
      scene.cityId === 'paris' &&
      background?.active &&
      background.visible &&
      (
        background.texture?.key === backgroundKey ||
        background.texture?.key === 'paris'
      ) &&
      scene.sys?.isActive?.() &&
      !scene._cleanupDone &&
      !scene.isTransitioning &&
      !scene.isVisitingApartment &&
      !scene.getPlayerHudScene?.()?.isAnyPanelOpen?.() &&
      !scene.mapUI?.selectionObjects?.length
    );

    this.rain.setVisible(visible);

    if (!visible) return;

    const dt = Number.isFinite(delta)
      ? Math.min(100, Math.max(0, delta))
      : 0;

    this.elapsed += dt;

    this.layout();
    this.rain.clear();

    const time = this.elapsed / 1000;

    for (let i = 0; i < DROP_COUNT; i++) {
      const speed = 125 + (i % 7) * 13;

      const y =
        ((i * 97.31 + time * speed) % (HEIGHT + 20)) - 10;

      const x =
        ((i * 173.17 - time * 24) % WIDTH + WIDTH) % WIDTH;

      const endX = Math.max(0, x - 1.5);
      const startY = Math.max(0, y);
      const endY = Math.min(HEIGHT, y + 4 + (i % 5));

      if (endY <= startY) continue;

      this.rain.lineStyle(
        1,
        0xb9ccda,
        0.035 + (i % 4) * 0.009
      );

      this.rain.lineBetween(
        x,
        startY,
        endX,
        endY
      );
    }
  }

  debugStatus() {
    return {
      enabled: !this.disposed,
      visible: Boolean(this.rain?.visible),
      city: this.scene?.cityId,
      texture: this.background?.texture?.key,
      rainDrops: DROP_COUNT,
      elapsedMs: Math.round(this.elapsed)
    };
  }

  destroy() {
    if (this.disposed) return;

    this.disposed = true;

    const scene = this.scene;

    scene.events.off('update', this.update, this);
    scene.events.off('sleep', this.hide, this);
    scene.events.off('pause', this.hide, this);
    scene.events.off('shutdown', this.destroy, this);
    scene.events.off('destroy', this.destroy, this);

    scene.scale.off('resize', this.layout, this);

    this.rain.destroy();

    this.rain = null;
    this.scene = null;
    this.background = null;
  }
}