import { gameState } from '../GameData.js';

export class NewsHud extends Phaser.Scene {
  constructor() {
    super({ key: 'NewsHud' });

    this.menuTab = null;
    this.menuPanel = null;
    this.menuBlocker = null;
    this.newspaperButton = null;
    this.tvButton = null;

    this.menuOpen = false;
    this.isAnimating = false;
    this.panelWidth = 176;
    this.panelY = 0;
  }

  create() {
    const { width, height } = this.cameras.main;

    this.panelY = height * 0.70;
    this.panelWidth = Math.max(156, Math.round(width * 0.10));

    this.createNewsMenu(width, height);

    this.events.on('setNewspaperVisible', (visible) => {
      this.newspaperButton?.setVisible(visible);
      this.newspaperButton?.disableInteractive();

      if (visible) {
        this.newspaperButton?.setInteractive({ useHandCursor: true });
      }
    });

    this.events.on('setTvVisible', (visible) => {
      this.tvButton?.setVisible(visible);
      this.tvButton?.disableInteractive();

      if (visible) {
        this.tvButton?.setInteractive({ useHandCursor: true });
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.closeMenu, this);
    });

    this.input.keyboard?.on('keydown-ESC', this.closeMenu, this);
  }

  createNewsMenu(width, height) {
    const panelHeight = Math.round(height * 0.22);
    const hiddenX = -this.panelWidth;
    const visibleX = 0;

    /*
     * Niewidzialna warstwa zamykająca menu po kliknięciu poza panelem.
     * Jest aktywowana dopiero po wysunięciu menu.
     */
    this.menuBlocker = this.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(9990)
      .setVisible(false)
      .setInteractive();
      this.menuBlocker.disableInteractive();

    this.menuBlocker.on('pointerup', () => {
      this.closeMenu();
    });

    this.menuPanel = this.add
      .container(hiddenX, this.panelY)
      .setDepth(9995);

    const panelBackground = this.add
      .rectangle(
        this.panelWidth / 2,
        panelHeight / 2,
        this.panelWidth,
        panelHeight,
        0x17120f,
        0.95
      )
      .setStrokeStyle(3, 0xd4af37, 0.9);

    const title = this.add
      .text(this.panelWidth / 2, 17, 'LOCAL NEWS', {
        fontFamily: 'Press Start 2P',
        fontSize: '10px',
        color: '#f6dc8c'
      })
      .setOrigin(0.5, 0);

    const divider = this.add
      .rectangle(
        this.panelWidth / 2,
        42,
        this.panelWidth - 20,
        2,
        0xd4af37,
        0.6
      )
      .setOrigin(0.5);

    const iconSize = Math.round(this.panelWidth * 0.35);

    this.newspaperButton = this.add
      .image(this.panelWidth * 0.28, panelHeight * 0.61, 'news')
      .setOrigin(0.5)
      .setDisplaySize(iconSize, iconSize)
      .setInteractive({ useHandCursor: true });

    const newspaperLabel = this.add
      .text(this.panelWidth * 0.28, panelHeight * 0.84, 'PAPER', {
        fontFamily: 'Press Start 2P',
        fontSize: '8px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.tvButton = this.add
      .image(this.panelWidth * 0.72, panelHeight * 0.61, 'tv')
      .setOrigin(0.5)
      .setDisplaySize(iconSize, iconSize)
      .setInteractive({ useHandCursor: true });

    const tvLabel = this.add
      .text(this.panelWidth * 0.72, panelHeight * 0.84, 'TV', {
        fontFamily: 'Press Start 2P',
        fontSize: '8px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.menuPanel.add([
      panelBackground,
      title,
      divider,
      this.newspaperButton,
      newspaperLabel,
      this.tvButton,
      tvLabel
    ]);

    /*
     * Zakładka pozostaje widoczna, gdy panel jest schowany.
     */
    this.menuTab = this.add
      .text(0, this.panelY + 24, 'NEWS\n▶', {
        fontFamily: 'Press Start 2P',
        fontSize: '10px',
        color: '#f6dc8c',
        backgroundColor: '#17120f',
        padding: { left: 10, right: 9, top: 11, bottom: 11 },
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0, 0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.menuTab.on('pointerup', () => {
      this.toggleMenu();
    });

    this.newspaperButton.on('pointerover', () => {
  newspaperLabel.setColor('#ffe066');
});

this.newspaperButton.on('pointerout', () => {
  newspaperLabel.setColor('#ffffff');
});

this.tvButton.on('pointerover', () => {
  tvLabel.setColor('#ffe066');
});

this.tvButton.on('pointerout', () => {
  tvLabel.setColor('#ffffff');
});

    this.newspaperButton.on('pointerup', () => {
      this.openNewspaper();
    });

    this.tvButton.on('pointerup', () => {
      this.openTv();
    });

    this.menuPanel.setData({
      hiddenX,
      visibleX
    });
  }

  toggleMenu() {
    if (this.menuOpen) {
      this.closeMenu();
      return;
    }

    this.openMenu();
  }

  openMenu() {
    if (this.menuOpen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.menuOpen = true;

    const visibleX = this.menuPanel.getData('visibleX');

this.menuBlocker
  .setVisible(true)
  .setInteractive();
    this.menuTab.setText('NEWS\n◀');

    this.tweens.add({
      targets: this.menuPanel,
      x: visibleX,
      duration: 220,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  closeMenu() {
    if (!this.menuOpen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.menuOpen = false;

    const hiddenX = this.menuPanel.getData('hiddenX');

    this.menuTab.setText('NEWS\n▶');

    this.tweens.add({
      targets: this.menuPanel,
      x: hiddenX,
      duration: 170,
      ease: 'Cubic.In',
      onComplete: () => {
this.menuBlocker
  .disableInteractive()
  .setVisible(false);
        this.isAnimating = false;
      }
    });
  }

  openNewspaper() {
    const isOpen = this.scene.isActive('NewsstandScene');

    if (isOpen) {
      this.scene.stop('NewsstandScene');
      return;
    }

    const cityId =
      gameState.currentCityId ||
      this.registry.get('currentCityId') ||
      'paris';

    console.log('[NewsHud] opening NewsstandScene:', {
      cityId,
      gameStateCityId: gameState.currentCityId,
      gameStateCity: gameState.currentCity,
      registryCity: this.registry.get('currentCity'),
      registryCityId: this.registry.get('currentCityId')
    });

    this.closeMenu();

    this.scene.launch('NewsstandScene', { cityId });
    this.scene.bringToTop('NewsHud');
  }

  openTv() {
    const isOpen = this.scene.isActive('TvBroadcastScene');

    if (isOpen) {
      this.scene.stop('TvBroadcastScene');
      return;
    }

    const returnSceneKey =
      this.registry.get('currentSceneKey') ||
      'CityScene';

    const mission =
      gameState.currentMission ||
      this.registry.get('activeMission') ||
      {};

    this.events.emit('setNewspaperVisible', false);
    this.events.emit('setTvVisible', false);

    this.closeMenu();

    this.scene.launch('TvBroadcastScene', {
      returnSceneKey,
      mission,
      gameState,
      reporterName: 'Colette Duvall',
      stationName: `${
        mission.city ||
        gameState.currentCity ||
        'Global'
      } Night Report`
    });

    this.scene.bringToTop('NewsHud');
  }
}