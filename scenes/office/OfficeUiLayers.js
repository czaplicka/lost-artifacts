import { dialogueText } from '../../dialogues/DialogueText.js';
import { EventBus } from '../../EventBus.js';
import { HUD_READY_TIMEOUT_MS } from './OfficeSceneConfig.js';

export const OfficeUiLayers = {
  releasePIOfficeHudLock() {
    if (!this.isOfficeActive()) return;
    document.documentElement.classList.remove('pi-office-hide-gameplay-hud');
  },

  getPlayerHud() {
    const hud = this.getPlayerHudScene();
    this._playerHud = hud;
    return hud;
  },

  invalidateOfficeUiRestore() {
    this._uiRestoreToken = null;
    this._uiLayersPromise = null;
    this._uiLayersOptions = null;
    this.isRestoringOfficeUi = false;
  },

  _shouldShowRestoredOfficeHud() {
    return !this.agencyLedgerUI?.isOpen && !this.agencyComputerUI?.isOpen;
  },

  async waitForOfficeOverlay(sceneKey, overlay, isCurrent, ready = () => true) {
    const deadline = Date.now() + HUD_READY_TIMEOUT_MS;
    while (isCurrent()) {
      if (this.getRegisteredScene(sceneKey) !== overlay) return false;
      if (this.isSceneActive(sceneKey) && ready(overlay)) return true;
      if (Date.now() >= deadline) {
        console.error(`[OfficeScene] ${sceneKey} did not become ready.`, {
          status: overlay?.sys?.settings?.status, active: this.isSceneActive(sceneKey)
        });
        return false;
      }
      await new Promise(resolve => window.setTimeout(resolve, 20));
    }
    return false;
  },

  setupOfficeUiLayers({closePanels = false} = {}) {
    if (!this.isOfficeActive()) return Promise.resolve(false);
    if (this._uiLayersPromise) {
      if (closePanels && this._uiLayersOptions) this._uiLayersOptions.closePanels = true;
      return this._uiLayersPromise;
    }
    const runToken = this._runToken;
    const restoreToken = Symbol('office-ui-restore');
    const options = {closePanels: Boolean(closePanels), panelsClosed: false};
    this._uiRestoreToken = restoreToken;
    this._uiLayersOptions = options;
    this.isRestoringOfficeUi = true;
    const isCurrent = () => this.isCurrentOfficeRun(runToken) &&
      this._uiRestoreToken === restoreToken && this.sys.isActive() &&
      this.registry.get('currentSceneKey') === 'OfficeScene';

    const closeRequestedPanels = hud => {
      if (!options.closePanels || options.panelsClosed || !hud || !isCurrent() ||
          this.getRegisteredScene('PlayerHudScene') !== hud) return;
      hud.closeAllUIPanels?.();
      options.panelsClosed = true;
    };
    const restoreLayer = async (name, action) => {
      try {
        if (!isCurrent()) return null;
        return await action();
      } catch (error) {
        if (isCurrent()) console.error(`[OfficeScene] ${name} restoration failed:`, error);
        return null;
      }
    };

    const request = Promise.resolve().then(async () => {
      if (!isCurrent()) return false;
      this.releasePIOfficeHudLock();
      const uiScene = await restoreLayer('UIScene', async () => {
        const ui = await this.ensureOverlayScene('UIScene');
        if (!ui || !isCurrent()) return null;
        const ready = await this.waitForOfficeOverlay('UIScene', ui, isCurrent);
        if (!ready || !isCurrent()) return null;
        this.scene.setVisible(true, 'UIScene');
        return ui;
      });
      if (!isCurrent()) return false;
      const playerHud = await restoreLayer('PlayerHudScene', async () => {
        const hud = await this.restorePlayerHud();
        if (!hud || !isCurrent()) return null;
        const ready = await this.waitForOfficeOverlay('PlayerHudScene', hud, isCurrent,
          value => value.isHudReady !== false);
        if (!ready || !isCurrent()) return null;
        this._playerHud = hud;
        this.scene.setVisible(true, 'PlayerHudScene');
        closeRequestedPanels(hud);
        hud.setCurrentGameplayScene?.('OfficeScene');
        this.bringSceneToTopIfActive('PlayerHudScene');
        return hud;
      });
      if (!isCurrent()) return false;
      await restoreLayer(dialogueText('scenes/OfficeScene.js', 't_f89b936161f25346de58'), async () => {
        this.releasePIOfficeHudLock();
        const visible = this._shouldShowRestoredOfficeHud();
        if (uiScene && this.getRegisteredScene('UIScene') === uiScene) {
          this.scene.setVisible(true, 'UIScene');
        }
        EventBus.emit(visible ? 'showHUD' : 'hideHUD');
        this.game.events.emit('setHudVisible', visible);
      });
      if (!isCurrent()) return false;
      // Failure of another overlay must not skip the news controls.
      const newsReady = await restoreLayer('NewsHud', () => this.setupNewsHud(isCurrent));
      if (!isCurrent()) return false;
      if (!newsReady) console.warn('[OfficeScene] NewsHud could not be restored.');
      await restoreLayer('HUD panel close', async () => closeRequestedPanels(playerHud));
      await restoreLayer(dialogueText('scenes/OfficeScene.js', 't_c26982b1425da26a9637'), async () => {
        this.restoreFirstCaseTutorial();
      });
      if (!isCurrent()) return false;
      // A caller can upgrade closePanels even during the last awaited stage.
      closeRequestedPanels(playerHud);
      this.refreshPanelLock();
      return Boolean(uiScene && playerHud && newsReady);
    }).catch(error => {
      if (isCurrent()) console.error('[OfficeScene] Failed to set up UI layers:', error);
      return false;
    });
    this._uiLayersPromise = request;
    const releaseRequest = () => {
      if (this._uiLayersPromise === request && this._uiRestoreToken === restoreToken) {
        this._uiLayersPromise = null;
        this._uiLayersOptions = null;
        this.isRestoringOfficeUi = false;
      }
    };
    void request.then(releaseRequest, releaseRequest);
    return request;
  },

  async setupNewsHud(isCurrent = () => this.isOfficeActive()) {
    const token = this._runToken;
    const current = () => this.isCurrentOfficeRun(token) && isCurrent();
    if (!current()) return false;
    const newsHud = await this.ensureOverlayScene('NewsHud');
    if (!newsHud || !current()) return false;
    const ready = await this.waitForOfficeOverlay('NewsHud', newsHud, current,
      news => typeof news.isUiReady === 'function' ? news.isUiReady() : news.uiReady === true);
    if (!ready || !current()) return false;
    newsHud.setButtonsVisible(true);
    newsHud.setNewspaperVisible(true);
    newsHud.setTvVisible(true);
    newsHud.setHudVisible(this._shouldShowRestoredOfficeHud());
    this.scene.setVisible(true, 'NewsHud');
    this.bringSceneToTopIfActive('NewsHud');
    return true;
  }
};
