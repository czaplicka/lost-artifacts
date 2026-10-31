import { ensureHud } from '../../hudHelpers.js';
import { EventBus } from '../../EventBus.js';
import { HUD_READY_TIMEOUT } from './CityConfig.js';

export class CityUi {
  async finishCityStartup() {
    const token = this._runToken;
    const ready = await this.setupCityUi();

    if (
      token !== this._runToken ||
      !this.canUseCity()
    ) {
      return;
    }

    if (!ready) {
      this.showUiLoading(
        `Interface unavailable: ${(this._uiFailures || []).join(', ') || 'HUD startup'}.\nClick here to retry.`,
        true
      );
      return;
    }

    this.hideUiLoading();
    this.openInitialOverlayIfNeeded();
  }

  showUiLoading(
    message = 'Preparing field equipment...',
    retry = false
  ) {
    this.hideUiLoading();

    const { width, height } = this.scale;

    const root = this.add.container(0, 0)
      .setDepth(9000)
      .setScrollFactor(0);

    const blocker = this.add.rectangle(
      0, 0, width, height, 0x000000, 0.24
    )
      .setOrigin(0)
      .setInteractive();

    const label = this.add.text(
      width / 2,
      height / 2,
      message,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffe6a3',
        backgroundColor: '#17110eee',
        padding: { x: 24, y: 18 },
        align: 'center',
        wordWrap: { width: Math.max(100, width - 64) }
      }
    ).setOrigin(0.5);

    root.add([blocker, label]);
    this._uiLoading = root;

    if (retry) {
      label.setInteractive({ useHandCursor: true });

      label.once('pointerdown', () => {
        this.showUiLoading();
        void this.finishCityStartup();
      });
    }
  }

  hideUiLoading() {
    this._uiLoading?.destroy(true);
    this._uiLoading = null;
  }

  waitForUi(predicate, token) {
    return new Promise(resolve => {
      let settled = false;
      let timeout = null;

      const finish = result => {
        if (settled) return;
        settled = true;

        clearTimeout(timeout);
        this.game.events.off('poststep', check);
        this._waitCancels.delete(cancel);

        resolve(result);
      };

      const cancel = () => finish(false);

      const check = () => {
        if (
          token !== this._runToken ||
          this._cleanupDone
        ) {
          finish(false);
          return;
        }

        try {
          if (predicate()) finish(true);
        } catch (error) {
          console.error('[CityScene] UI readiness check failed:', error);
          finish(false);
        }
      };

      this._waitCancels.add(cancel);
      this.game.events.on('poststep', check);

      timeout = setTimeout(
        () => finish(false),
        HUD_READY_TIMEOUT
      );

      check();
    });
  }

  cancelUiWaits() {
    for (const cancel of [...this._waitCancels]) {
      cancel();
    }

    this._waitCancels.clear();
  }

  async setupCityUi() {
    if (this._uiPromise) return this._uiPromise;
    if (!this.canUseCity()) return false;
    const token = this._runToken;
    this.isSettingUpUi = true;
    this.uiReady = false;
    this._uiFailures = [];
    const promise = (async () => {
      try {
        const tasks = [
          ['UIScene', () => this.prepareMainHud(token)],
          ['PlayerHudScene', () => this.preparePlayerHud(token)],
          ['NewsHud', () => this.prepareNewsHud(token)]
        ];
        const results = await Promise.allSettled(tasks.map(([, run]) => run()));
        if (token !== this._runToken || !this.canUseCity()) return false;
        results.forEach((result, index) => {
          if (result.status === 'rejected' || result.value !== true) {
            const key = tasks[index][0];
            this._uiFailures.push(key);
            console.error(`[CityScene] ${key} did not become ready.`,
              result.status === 'rejected' ? result.reason : this.getRegisteredScene(key));
          }
        });
        if (this._uiFailures.length) return false;
        this.registry.set('currentSceneKey', 'CityScene');
        this.bringSceneToTopIfActive('PlayerHudScene');
        this.bringSceneToTopIfActive('NewsHud');
        this.uiReady = true;
        return true;
      } catch (error) {
        if (token === this._runToken && !this._cleanupDone) {
          console.error('[CityScene] UI setup failed:', error);
          this._uiFailures = ['HUD setup'];
        }
        return false;
      } finally {
        if (token === this._runToken) this.isSettingUpUi = false;
      }
    })();
    this._uiPromise = promise;
    try { return await promise; }
    finally { if (this._uiPromise === promise) this._uiPromise = null; }
  }

  async prepareMainHud(token) {
    const hud = await this.ensureOverlayScene('UIScene');

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => (
        hud.sys.isActive() &&
        !hud._isDestroyed &&
        Boolean(hud.dom?.container?.isConnected) &&
        Boolean(hud.hudStanding)
      ),
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.showHUD();

    return true;
  }

  async preparePlayerHud(token) {
    const hud = await this.restorePlayerHud();

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => hud.sys.isActive() && hud.isHudReady === true,
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.setCurrentGameplayScene?.('CityScene');
    hud.closeAllUIPanels?.();
    hud.refreshNotebook?.();
    hud.refreshUI?.();

    ensureHud(this);
    return true;
  }

  async prepareNewsHud(token) {
    const hud = await this.ensureOverlayScene('NewsHud');

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => hud.sys.isActive() && hud.isUiReady?.() === true,
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.setHudVisible(true);
    hud.setNewspaperVisible(true);
    hud.setTvVisible(false);

    return true;
  }

  openInitialOverlayIfNeeded() {
    if (
      !this.canUseCity() ||
      !this.uiReady ||
      this._initialOverlayOpened
    ) {
      return;
    }

    this._initialOverlayOpened = true;

    if (this.isFinalShowdown) {
      this.closeAllUIPanels();
      void this.launchOverlay('ArrestSelectionScene');
      return;
    }

    if (this.openDestinationsOnCreate) {
      this.openDestinationsPanel();
    }
  }

  shouldShowPhoneCallNow() {
    return false;
  }

  openDestinationsPanel() {
    if (this._cleanupDone || !this.uiReady) return false;

    const hud = this.getPlayerHudScene();
    hud?.closeAllUIPanels?.();

    if (hud?.openDestinationsPanel) {
      return hud.openDestinationsPanel();
    }

    if (hud?.toggleDestinationsPanel) {
      return hud.toggleDestinationsPanel(true);
    }

    EventBus.emit('openDestinations');
    return true;
  }

  closeAllUIPanels() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();
  }
}
