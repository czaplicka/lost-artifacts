import { dialogueText } from '../../dialogues/DialogueText.js';
import { missionArtifactName } from '../../utils/artifactDisplay.js';
const PANEL_TIMEOUT_MS = 12000;
const FILE = 'scenes/office/OfficePanelActions.js';
const text = id => dialogueText(FILE, id);
const OPENING_FLAGS = [
  'isOpeningCrimeLab', 'isOpeningRecoveredArtifacts', 'isOpeningWantedDatabase',
  'isOpeningArchive', 'isOpeningStorage'
];

export const OfficePanelActions = {
  _isOfficePanelOpeningBlocked() {
    return Boolean(
      this.agencyComputerUI?.isOpen || this.agencyLedgerUI?.isOpen || this.saveUI?.isOpen ||
      this.isTransitioning || OPENING_FLAGS.some(flag => this[flag])
    );
  },

  async _getReadyOfficePanel(name, token) {
    const current = () => this.isCurrentOfficeRun(token) && this.sys.isActive() &&
      !this._isOfficePanelOpeningBlocked();
    if (!current()) return null;
    await this.setupOfficeUiLayers();
    if (!current()) return null;
    let hud = this.getPlayerHud();
    if (!hud) hud = await this.restorePlayerHud();
    if (!current()) return null;
    if (!hud) throw new Error('PlayerHudScene could not be restored.');

    const deadline = Date.now() + PANEL_TIMEOUT_MS;
    while (hud._allowPanelCreation === false && !hud.isHudReady) {
      if (!current()) return null;
      if (this.getPlayerHud() !== hud) throw new Error('PlayerHudScene changed while waiting.');
      if (Date.now() >= deadline) throw new Error('PlayerHudScene did not start.');
      await new Promise(resolve => window.setTimeout(resolve, 20));
    }
    if (!current()) return null;
    if (!this.isSceneActive('PlayerHudScene') || this.getPlayerHud() !== hud) {
      throw new Error('PlayerHudScene changed while loading the panel.');
    }
    hud.setCurrentGameplayScene?.('OfficeScene');
    const panel = typeof hud.ensurePanel === 'function' ? await hud.ensurePanel(name) : hud[name];
    if (!current()) return null;
    if (!this.isSceneActive('PlayerHudScene') || this.getPlayerHud() !== hud) {
      throw new Error('PlayerHudScene changed while loading the panel.');
    }
    if (!panel || typeof panel.open !== 'function') {
      throw new Error(`Panel "${name}" is unavailable. Check its import or constructor error.`);
    }
    this._playerHud = hud;
    return {hud, panel};
  },

  async _openReadyOfficePanel(name, getData, onOpened = null) {
    if (!this.isOfficeActive() || this._officePanelRequest || this._isOfficePanelOpeningBlocked()) return false;
    const token = this._runToken;
    const request = Symbol(name);
    const current = () => this.isCurrentOfficeRun(token) && this.sys.isActive() &&
      this._officePanelRequest === request;
    this._officePanelRequest = request;
    try {
      const ready = await this._getReadyOfficePanel(name, token);
      if (!ready || !current() || this._isOfficePanelOpeningBlocked()) return false;
      const {hud, panel} = ready;
      const sameHud = () => this.isSceneActive('PlayerHudScene') && this.getPlayerHud() === hud;
      if (!sameHud()) return false;
      if (panel.isOpen) return true;
      const data = getData();
      if (!current() || !sameHud() || this._isOfficePanelOpeningBlocked()) return false;
      this.closeAllUIPanels();
      this.navigation?.hideHint();
      hud.setCurrentGameplayScene?.('OfficeScene');
      hud.showHud?.();
      this.scene.setVisible(true, 'PlayerHudScene');
      this.bringSceneToTopIfActive('PlayerHudScene');
      if (!current() || !sameHud() || this._isOfficePanelOpeningBlocked()) return false;
      const result = await panel.open(data);
      if (!current() || !sameHud() || this._isOfficePanelOpeningBlocked()) return false;
      if (result === false || !panel.isOpen) {
        console.warn(`[OfficeScene] Panel "${name}" did not open.`);
        this.showOfficeStatusMessage(text('t_0292010f04685ea6f589'));
        return false;
      }
      onOpened?.();
      return true;
    } catch (error) {
      if (current()) {
        console.error(`[OfficeScene] Failed to open "${name}":`, error);
        this.showOfficeStatusMessage(text('t_0292010f04685ea6f589'));
      }
      return false;
    } finally {
      if (this._officePanelRequest === request) this._officePanelRequest = null;
      if (this.isCurrentOfficeRun(token) && this.sys.isActive()) this.refreshPanelLock();
    }
  },

  openCrimeBoard() {
    return this._openReadyOfficePanel('crimeBoardUI', () => this.gameState);
  },

  openCasefile() {
    return this._openReadyOfficePanel('caseFileUI', () => {
      const mission = this.gameState.currentMission || {};
      return {
        artifact: missionArtifactName(mission, text('t_51b01e8422efd81865f3')),
        city: mission.city || text('t_031708f5a6c18e0a6279'),
        country: mission.country || text('t_e282dbbdd7a0fe3f46f5'),
        description: mission.description || text('t_5b90bad5ea1caf117c4e'),
        significance: mission.significance || mission.signifance || '',
        clue: mission.clue || '', artifactKey: mission.artifactKey || ''
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
      return {country: mission.country || '', city: mission.city || '',
        artifact: missionArtifactName(mission), gameState: this.gameState};
    });
  }
};
