export class NewsHud extends Phaser.Scene {
  constructor() {
    super({ key: 'NewsHud' });
  }

  create() {
const { width, height } = this.cameras.main;

this.newspaperButton = this.add.image(width * 0.02, height * 0.88, 'news')
      .setOrigin(0, 0)
      .setDisplaySize(width * 0.06, width * 0.06)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.newspaperButton.on('pointerup', () => {
      const isOpen = this.scene.isActive('NewsstandScene');

      if (isOpen) {
        this.scene.stop('NewsstandScene');
      } else {
        const cityId = this.registry.get('currentCity') || 'paris';
        this.scene.launch('NewsstandScene', { cityId });
        this.scene.bringToTop('NewsHud');
      }
    });

    this.events.on('setNewspaperVisible', (visible) => {
      this.newspaperButton.setVisible(visible);
      this.newspaperButton.input.enabled = visible;
    });
  }
}