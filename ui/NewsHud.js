export class NewsHud extends Phaser.Scene {
  constructor() {
    super({ key: 'NewsHud' });

    this.newspaperButton = null;
    this.tvButton = null;
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── GAZETA ───────────────────────────────────────
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
        return;
      }

      /*
       * currentCity jest ważniejsze:
       * - OfficeScene ustawia currentCity = 'hq'
       * - currentCityId może zostać po poprzednim mieście, np. 'paris'
       */
      const cityId =
        this.registry.get('currentCity') ||
        this.registry.get('currentCityId') ||
        'paris';

      console.log('[NewsHud] opening NewsstandScene:', {
        cityId,
        registryCity: this.registry.get('currentCity'),
        registryCityId: this.registry.get('currentCityId')
      });

      this.scene.launch('NewsstandScene', { cityId });
      this.scene.bringToTop('NewsHud');
    });

    // ── TELEWIZOR ────────────────────────────────────
    this.tvButton = this.add.image(
      width * 0.02 + width * 0.07,
      height * 0.88,
      'tv'
    )
      .setOrigin(0, 0)
      .setDisplaySize(width * 0.06, width * 0.06)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.tvButton.on('pointerup', () => {
      const isOpen = this.scene.isActive('TvBroadcastScene');

      if (isOpen) {
        this.scene.stop('TvBroadcastScene');
        return;
      }

      const returnSceneKey = this.registry.get('currentSceneKey') || 'CityScene';
      const mission = this.registry.get('activeMission') || {};
      const gameStateR = this.registry.get('gameState') || {};

      this.events.emit('setNewspaperVisible', false);
      this.events.emit('setTvVisible', false);

      this.scene.launch('TvBroadcastScene', {
        returnSceneKey,
        mission,
        gameState: gameStateR,
        reporterName: 'Colette Duvall',
        stationName: `${mission.city || gameStateR.currentCity || 'Global'} Night Report`
      });

      this.scene.bringToTop('NewsHud');
    });

    // ── EVENTY WIDOCZNOŚCI ───────────────────────────
    this.events.on('setNewspaperVisible', (visible) => {
      this.newspaperButton.setVisible(visible);
      this.newspaperButton.input.enabled = visible;
    });

    this.events.on('setTvVisible', (visible) => {
      this.tvButton.setVisible(visible);
      this.tvButton.input.enabled = visible;
    });
  }
}