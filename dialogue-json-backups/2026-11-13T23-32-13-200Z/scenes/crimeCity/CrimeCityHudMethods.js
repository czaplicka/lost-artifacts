import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';

export const crimeCityHudMethods = {
  async setupCrimeCityUi() {
    if (this.isSettingUpUi || this._cleanupDone) return;
    const token = this._runToken;
    this.isSettingUpUi = true;
    try {
      const uiScene = await this.ensureOverlayScene('UIScene');
      if (!this.isCurrentRun(token)) return;
      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');
        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();
        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute: gameState.currentMinute ?? gameState.minute ?? 0,
          partOfDay: gameState.currentPartOfDay || gameState.partOfDay || 'Morning'
        });
      }
      const playerHud = await this.restorePlayerHud();
      if (!this.isCurrentRun(token)) return;
      if (playerHud) {
        playerHud.setCurrentGameplayScene('CrimeCityScene');
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      }
      const newsHud = await this.ensureOverlayScene('NewsHud');
      if (!this.isCurrentRun(token)) return;
      if (newsHud) {
        newsHud.events?.emit('setNewspaperVisible', true);
        newsHud.events?.emit('setTvVisible', false);
        this.bringSceneToTopIfActive('NewsHud');
      }
    } catch (error) {
      if (token === this._runToken && !this._cleanupDone) {
        console.error('[CrimeCityScene] UI restore failed:', error);
      }
    } finally {
      if (token === this._runToken) this.isSettingUpUi = false;
    }
  },

  showNoEnergyPopup() {
    this.showMessage("You're too exhausted, detective.\nGet some rest before continuing the case.", 2400, '#8b0000');
  },

  showMessage(text, duration = 2200, color = '#37474f') {
    if (!text || this._cleanupDone || !this.sys.isActive()) return null;
    const popup = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontFamily: 'SpecialElite', fontSize: '19px', color: '#ffffff', backgroundColor: color,
      padding: { x: 24, y: 16 }, align: 'center',
      wordWrap: { width: Math.max(100, this.scale.width - 64) }
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(duration, () => { if (popup?.active) popup.destroy(); });
    return popup;
  },

  closeAllUIPanels() { this.getPlayerHudScene()?.closeAllUIPanels?.(); }
};
