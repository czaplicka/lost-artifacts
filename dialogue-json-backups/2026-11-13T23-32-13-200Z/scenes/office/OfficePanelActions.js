const PANEL_TIMEOUT_MS = 12000;

export const OfficePanelActions = {
  async _getReadyOfficePanel(name, token) {
    const current = () => this.isCurrentOfficeRun(token) && this.sys.isActive();
    await this.setupOfficeUiLayers();
    if (!current()) return null;

    let hud = this.getPlayerHud();
    if (!hud) hud = await this.restorePlayerHud();
    if (!current()) return null;
    if (!hud) throw new Error('PlayerHudScene could not be restored.');

    const deadline = Date.now() + PANEL_TIMEOUT_MS;
    // SceneLoader can return before the HUD has run create().
    while (hud._allowPanelCreation === false && !hud.isHudReady) {
      if (!current()) return null;
      if (Date.now() >= deadline) throw new Error('PlayerHudScene did not start.');
      await new Promise(resolve => window.setTimeout(resolve, 20));
    }

    hud.setCurrentGameplayScene?.('OfficeScene');
    const panel = typeof hud.ensurePanel === 'function'
      ? await hud.ensurePanel(name)
      : hud[name];

    if (!current()) return null;
    if (!this.isSceneActive('PlayerHudScene') || this.getPlayerHud() !== hud) {
      throw new Error('PlayerHudScene changed while loading the panel.');
    }
    if (!panel || typeof panel.open !== 'function') {
      throw new Error(`Panel "${name}" is unavailable. Check its import or constructor error.`);
    }
    this._playerHud = hud;
    return { hud, panel };
  },

  async _openReadyOfficePanel(name, getData, onOpened = null) {
    if (!this.isOfficeActive() || this._officePanelRequest || this.agencyComputerUI?.isOpen) {
      return false;
    }
    const token = this._runToken;
    const request = Symbol(name);
    const current = () => this.isCurrentOfficeRun(token) && this.sys.isActive();
    this._officePanelRequest = request;

    try {
      const ready = await this._getReadyOfficePanel(name, token);
      if (!ready || !current()) return false;
      const { hud, panel } = ready;
      if (panel.isOpen) return true;

      this.closeAllUIPanels();
      this.navigation?.hideHint();
      hud.setCurrentGameplayScene?.('OfficeScene');
      hud.showHud?.();
      this.scene.setVisible(true, 'PlayerHudScene');
      this.bringSceneToTopIfActive('PlayerHudScene');

      // CrimeBoardUI.open() is asynchronous: do not discard its result.
      const result = await panel.open(getData());
      if (!current()) return false;
      if (result === false || !panel.isOpen) {
        console.warn(`[OfficeScene] Panel "${name}" did not open.`);
        this.showOfficeStatusMessage('This panel could not be opened. Please try again.');
        return false;
      }
      onOpened?.();
      return true;
    } catch (error) {
      if (current()) {
        console.error(`[OfficeScene] Failed to open "${name}":`, error);
        this.showOfficeStatusMessage('This panel could not be opened. Please try again.');
      }
      return false;
    } finally {
      if (this._officePanelRequest === request) this._officePanelRequest = null;
      if (current()) this.refreshPanelLock();
    }
  },

  openCrimeBoard() {
    return this._openReadyOfficePanel('crimeBoardUI', () => this.gameState);
  },

  openCasefile() {
    return this._openReadyOfficePanel('caseFileUI', () => {
      const mission = this.gameState.currentMission || {};
      return {
        artifact: mission.artifact || 'UNKNOWN ARTIFACT',
        city: mission.city || 'UNKNOWN CITY',
        country: mission.country || 'UNKNOWN COUNTRY',
        description: mission.description || 'No case description available.',
        significance: mission.significance || '',
        clue: mission.clue || '',
        artifactKey: mission.artifactKey || ''
      };
    }, () => this.firstCaseTutorial?.onCaseFileOpened());
  },

  openNotes() {
    return this._openReadyOfficePanel('notesUI', () => this.gameState);
  },

  openDestinations() {
    return this._openReadyOfficePanel('destinationsUI', () => this.gameState,
      () => this.firstCaseTutorial?.onDestinationMapOpened());
  },

  openWarrant() {
    return this._openReadyOfficePanel('warrantUI', () => this.gameState);
  },

  openAtlas() {
    return this._openReadyOfficePanel('atlasUI', () => {
      const mission = this.gameState.currentMission || {};
      return {
        country: mission.country || '', city: mission.city || '',
        artifact: mission.artifact || '', gameState: this.gameState
      };
    });
  }
};
