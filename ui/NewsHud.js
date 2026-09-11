import { gameState } from '../GameData.js';

export class NewsHud extends Phaser.Scene {
  constructor() {
    super({ key: 'NewsHud' });

    this.menuTab = null;
    this.menuPanel = null;
    this.menuBlocker = null;

    this.newspaperButton = null;
    this.newspaperLabel = null;

    this.tvButton = null;
    this.tvLabel = null;

    this.menuOpen = false;
    this.isAnimating = false;

    this.panelWidth = 176;
    this.panelY = 0;

    this.hudEnabled = true;
    this.newsButtonsVisible = true;

    // Chroni przed wielokrotnym kliknięciem przycisku, zanim zakończy się
    // dynamiczny import sceny przez SceneLoader.
    this.loadingOverlays = new Set();
  }

  create() {
    const { width, height } = this.cameras.main;

    this.panelY = height * 0.70;
    this.panelWidth = Math.max(156, Math.round(width * 0.10));

    this.createNewsMenu(width, height);

    this.events.on(
      'setNewspaperVisible',
      this.setNewspaperVisible,
      this
    );

    this.events.on(
      'setTvVisible',
      this.setTvVisible,
      this
    );

    /*
     * Ten event jest używany przez BaseScene:
     *
     * this.setNewsHudButtonsVisible(false);
     *
     * Ukrywa oba przyciski newsowe jednocześnie.
     */
    this.events.on(
      'setButtonsVisible',
      this.setButtonsVisible,
      this
    );

    this.game.events.on(
      'setHudVisible',
      this.setHudVisible,
      this
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(
        'keydown-ESC',
        this.closeMenu,
        this
      );

      this.game.events.off(
        'setHudVisible',
        this.setHudVisible,
        this
      );

      this.events.off(
        'setNewspaperVisible',
        this.setNewspaperVisible,
        this
      );

      this.events.off(
        'setTvVisible',
        this.setTvVisible,
        this
      );

      this.events.off(
        'setButtonsVisible',
        this.setButtonsVisible,
        this
      );

      this.loadingOverlays.clear();

      this.tweens.killTweensOf(this.menuPanel);
      this.tweens.killTweensOf(this.menuTab);
    });
  }

  createNewsMenu(width, height) {
    const panelHeight = Math.round(height * 0.22);
    const hiddenX = -this.panelWidth;
    const visibleX = 0;

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
        fontFamily: 'PressStart2P',
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

    this.newspaperLabel = this.add
      .text(this.panelWidth * 0.28, panelHeight * 0.84, 'PAPER', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.tvButton = this.add
      .image(this.panelWidth * 0.72, panelHeight * 0.61, 'tv')
      .setOrigin(0.5)
      .setDisplaySize(iconSize, iconSize)
      .setInteractive({ useHandCursor: true });

    this.tvLabel = this.add
      .text(this.panelWidth * 0.72, panelHeight * 0.84, 'TV', {
        fontFamily: 'PressStart2P',
        fontSize: '8px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.menuPanel.add([
      panelBackground,
      title,
      divider,
      this.newspaperButton,
      this.newspaperLabel,
      this.tvButton,
      this.tvLabel
    ]);

    this.menuTab = this.add
      .text(0, this.panelY + 24, 'NEWS\n▶', {
        fontFamily: 'PressStart2P',
        fontSize: '10px',
        color: '#f6dc8c',
        backgroundColor: '#17120f',
        padding: {
          left: 10,
          right: 9,
          top: 11,
          bottom: 11
        },
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
      this.newspaperLabel?.setColor('#ffe066');
    });

    this.newspaperButton.on('pointerout', () => {
      this.newspaperLabel?.setColor('#ffffff');
    });

    this.tvButton.on('pointerover', () => {
      this.tvLabel?.setColor('#ffe066');
    });

    this.tvButton.on('pointerout', () => {
      this.tvLabel?.setColor('#ffffff');
    });

    this.newspaperButton.on('pointerup', () => {
      void this.openNewspaper();
    });

    this.tvButton.on('pointerup', () => {
      void this.openTv();
    });

    this.menuPanel.setData({
      hiddenX,
      visibleX
    });
  }

  setNewspaperVisible(visible) {
    const shouldBeVisible = Boolean(visible);

    this.newspaperButton?.setVisible(shouldBeVisible);
    this.newspaperLabel?.setVisible(shouldBeVisible);

    this.newspaperButton?.disableInteractive();

    if (shouldBeVisible && this.hudEnabled) {
      this.newspaperButton?.setInteractive({
        useHandCursor: true
      });
    }
  }

  setTvVisible(visible) {
    const shouldBeVisible = Boolean(visible);

    this.tvButton?.setVisible(shouldBeVisible);
    this.tvLabel?.setVisible(shouldBeVisible);

    this.tvButton?.disableInteractive();

    if (shouldBeVisible && this.hudEnabled) {
      this.tvButton?.setInteractive({
        useHandCursor: true
      });
    }
  }

  /*
   * Publiczny handler dla BaseScene:
   *
   * newsHud.events.emit('setButtonsVisible', false);
   *
   * Nie ukrywamy menuTab, ponieważ gracz nadal powinien widzieć
   * uchwyt menu NEWS. Ukrywamy natomiast przyciski PAPER i TV,
   * np. gdy jeden z ekranów medialnych jest już otwarty.
   */
  setButtonsVisible(visible) {
    const shouldBeVisible = Boolean(visible);

    this.newsButtonsVisible = shouldBeVisible;

    if (!shouldBeVisible && this.menuOpen) {
      this.closeMenu(true);
    }

    this.setNewspaperVisible(shouldBeVisible);
    this.setTvVisible(shouldBeVisible);
  }

  toggleMenu() {
    if (!this.hudEnabled) {
      return;
    }

    if (this.menuOpen) {
      this.closeMenu();
      return;
    }

    this.openMenu();
  }

  openMenu() {
    if (!this.hudEnabled || this.menuOpen || this.isAnimating) {
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

  /*
   * force = true przydaje się przy otwieraniu gazety/TV:
   * menu zamknie się natychmiast, bez czekania aż skończy się
   * poprzedni tween otwierający.
   */
  closeMenu(force = false) {
    if (!this.menuOpen) {
      return;
    }

    if (this.isAnimating && !force) {
      return;
    }

    if (force) {
      this.tweens.killTweensOf(this.menuPanel);
      this.isAnimating = false;
    }

    this.isAnimating = true;
    this.menuOpen = false;

    const hiddenX = this.menuPanel.getData('hiddenX');

    this.menuTab.setText('NEWS\n▶');

    this.tweens.add({
      targets: this.menuPanel,
      x: hiddenX,
      duration: force ? 0 : 170,
      ease: 'Cubic.In',
      onComplete: () => {
        this.menuBlocker
          .disableInteractive()
          .setVisible(false);

        this.isAnimating = false;
      }
    });
  }

  setHudVisible(visible) {
    this.hudEnabled = Boolean(visible);

    if (!this.hudEnabled) {
      if (this.menuOpen) {
        this.menuOpen = false;
        this.isAnimating = false;

        this.tweens.killTweensOf(this.menuPanel);

        this.menuPanel.x = this.menuPanel.getData('hiddenX');

        this.menuTab.setText('NEWS\n▶');

        this.menuBlocker
          .disableInteractive()
          .setVisible(false);
      }

      this.menuTab
        .setVisible(false)
        .disableInteractive();

      this.menuPanel.setVisible(false);

      this.newspaperButton?.disableInteractive();
      this.tvButton?.disableInteractive();

      return;
    }

    this.menuTab
      .setVisible(true)
      .setInteractive({ useHandCursor: true });

    this.menuPanel.setVisible(true);

    this.setNewspaperVisible(
      this.newsButtonsVisible &&
      this.newspaperButton?.visible !== false
    );

    this.setTvVisible(
      this.newsButtonsVisible &&
      this.tvButton?.visible !== false
    );
  }

  /**
   * Bezpiecznie sprawdza stan overlayu.
   *
   * Nie wolno wywołać this.scene.isActive(sceneKey), kiedy scena nie została
   * jeszcze dynamicznie dodana przez SceneLoader — Phaser pokaże wtedy:
   * "Scene key not found".
   */
  isOverlayActive(sceneKey) {
    const sceneManager = this.scene.manager;
    const isRegistered = Boolean(sceneManager.keys[sceneKey]);

    return isRegistered && this.scene.isActive(sceneKey);
  }

  /**
   * Uruchamia lub zamyka scenę overlayową obsługując lazy-loading.
   *
   * Zwraca jeden ze statusów:
   * - "opened"  — scena została uruchomiona,
   * - "closed"  — scena była otwarta i została zamknięta,
   * - "loading" — import tej sceny już trwa,
   * - "error"   — scena nie mogła zostać uruchomiona.
   */
  async toggleLazyOverlay(sceneKey, data = {}) {
    if (this.isOverlayActive(sceneKey)) {
      this.scene.stop(sceneKey);

      return 'closed';
    }

    if (this.loadingOverlays.has(sceneKey)) {
      return 'loading';
    }

    this.loadingOverlays.add(sceneKey);

    try {
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.launch(this, sceneKey, data);
      } else {
        const sceneManager = this.scene.manager;
        const isRegistered = Boolean(sceneManager.keys[sceneKey]);

        if (!isRegistered) {
          console.error(
            `[NewsHud] Cannot open "${sceneKey}". ` +
            'The scene is not registered and game.sceneLoader is unavailable.'
          );

          return 'error';
        }

        this.scene.launch(sceneKey, data);
      }

      this.scene.bringToTop('NewsHud');

      return 'opened';
    } catch (error) {
      console.error(
        `[NewsHud] Failed to open lazy overlay "${sceneKey}":`,
        error
      );

      return 'error';
    } finally {
      this.loadingOverlays.delete(sceneKey);
    }
  }

  async openNewspaper() {
    const sceneKey = 'NewsstandScene';

    if (this.isOverlayActive(sceneKey)) {
      await this.toggleLazyOverlay(sceneKey);
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

    this.closeMenu(true);

    const status = await this.toggleLazyOverlay(sceneKey, {
      cityId
    });

    if (status === 'error') {
      console.warn(
        '[NewsHud] NewsstandScene could not be opened. ' +
        'Check SceneLoader.js and sceneRegistry.js.'
      );
    }
  }

  async openTv() {
    const sceneKey = 'TvBroadcastScene';

    if (this.isOverlayActive(sceneKey)) {
      const status = await this.toggleLazyOverlay(sceneKey);

      if (status === 'closed') {
        this.setButtonsVisible(true);
      }

      return;
    }

    const returnSceneKey =
      this.registry.get('currentSceneKey') ||
      'CityScene';

    const mission =
      gameState.currentMission ||
      this.registry.get('activeMission') ||
      {};

    const stationCity =
      mission.city ||
      gameState.currentCity ||
      'Global';

    this.closeMenu(true);

    const status = await this.toggleLazyOverlay(sceneKey, {
      returnSceneKey,
      mission,
      gameState,
      reporterName: 'Colette Duvall',
      stationName: `${stationCity} Night Report`
    });

    if (status === 'opened') {
      this.setButtonsVisible(false);
      return;
    }

    if (status === 'error') {
      this.setButtonsVisible(true);
    }
  }
}