import { dialogueText } from '../../dialogues/DialogueText.js';
import { audioManager } from '../../managers/AudioManager.js';
const text = id => dialogueText('scenes/OfficeScene.js', id);

export const OfficeSceneAccess = {
  async _openOfficeRoom(sceneKey, flagName, roomName) {
    if (!this.isOfficeActive() || this[flagName]) return false;
    this.refreshPanelLock();
    if (this.uiLocked) return false;
    const isStorage = sceneKey === 'AgencyStorageScene';
    const allowed = () => {
      if (!isStorage && this.isOfficeTutorialBlocking()) {
        this.showOfficeStatusMessage(text('t_fdb4e3e1e53a1750aaf2'));
        return false;
      }
      return true;
    };
    if (!allowed()) return false;
    const token = this._runToken;
    this[flagName] = true;
    try {
      this.refreshPanelLock();
      this.navigation?.hideHint();
      audioManager.playSfx('click_sound');
      await this.flushOfficeAutosave();
      if (!this.isCurrentOfficeRun(token) || !this.sys.isActive()) return false;
      // Tutorial state can change while an autosave is pending.
      if (!allowed()) return false;
      const result = await this.goto(sceneKey, {gameState: this.gameState});
      if (result === false && this.isCurrentOfficeRun(token) && this.sys.isActive()) {
        this.showOfficeStatusMessage(`${text('t_103c5169871d49be7a2e')}${roomName}${text('t_601ea6e3e0cdd6fbc311')}`);
      }
      return result !== false;
    } catch (error) {
      if (this.isCurrentOfficeRun(token)) {
        console.error(`[OfficeScene] Failed to open ${sceneKey}:`, error);
        this.showOfficeStatusMessage(`${text('t_103c5169871d49be7a2e')}${roomName}${text('t_601ea6e3e0cdd6fbc311')}`);
      }
      return false;
    } finally {
      if (this.isCurrentOfficeRun(token)) {
        this[flagName] = false;
        this.refreshPanelLock();
      }
    }
  },

  openArchive() {
    return this._openOfficeRoom('ArchiveScene', 'isOpeningArchive', 'archive');
  },

  openStorage() {
    return this._openOfficeRoom('AgencyStorageScene', 'isOpeningStorage', text('t_81b1437735c9dc91dee1'));
  },

  openCrimeLabHotkey(event) {
    const editingText = [event?.target, document.activeElement].some(element => (
      element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
    ));
    if (editingText || event?.repeat || event?.ctrlKey || event?.metaKey || event?.altKey || this.DEBUG_HOTSPOTS) return;
    void this.openCrimeLab();
  },

  canOpenOfficeOverlay(sceneKey) {
    if (this.isOfficeTutorialBlocking()) {
      this.showOfficeStatusMessage(text('t_fdb4e3e1e53a1750aaf2'));
      return false;
    }
    if (sceneKey === 'CrimeLabScene' && !this.hasCompletedFirstMission()) {
      this.showOfficeStatusMessage('Complete your first mission before entering the crime lab.');
      return false;
    }
    return true;
  },

  async _openOfficeOverlay(sceneKey, flagName) {
    if (!this.isOfficeActive() || this[flagName]) return false;
    this.refreshPanelLock();
    if (this.uiLocked || this.agencyLedgerUI?.isOpen) return false;
    if (!this.canOpenOfficeOverlay(sceneKey)) return false;
    const token = this._runToken;
    let keepOpeningFlag = false;
    this[flagName] = true;
    try {
      this.refreshPanelLock();
      this.navigation?.hideHint();
      if (sceneKey === 'CrimeLabScene') audioManager.playSfx('click_sound');
      await this.flushOfficeAutosave();
      if (!this.isCurrentOfficeRun(token) || !this.sys.isActive()) return false;
      if (!this.canOpenOfficeOverlay(sceneKey)) return false;
      const opened = await this.launchOverlay(sceneKey, {
        gameState: this.gameState, returnScene: 'OfficeScene'
      });
      if (!this.isCurrentOfficeRun(token)) return false;
      if (!opened) {
        this.showOfficeStatusMessage(text('t_a475e66491996ef650aa'));
        return false;
      }
      if (this.sys.isActive()) this.scene.pause();
      // Retain the lock only after pause completed without throwing.
      keepOpeningFlag = true;
      return true;
    } catch (error) {
      if (this.isCurrentOfficeRun(token)) {
        console.error(`[OfficeScene] Failed to open overlay ${sceneKey}:`, error);
        this.showOfficeStatusMessage(text('t_a475e66491996ef650aa'));
      }
      return false;
    } finally {
      if (this.isCurrentOfficeRun(token) && !keepOpeningFlag) {
        this[flagName] = false;
        this.refreshPanelLock();
      }
    }
  },

  openCrimeLab() {
    return this._openOfficeOverlay('CrimeLabScene', 'isOpeningCrimeLab');
  },

  openRecoveredArtifacts() {
    return this._openOfficeOverlay('RecoveredArtifactsScene', 'isOpeningRecoveredArtifacts');
  },

  openWantedDatabase() {
    return this._openOfficeOverlay('WantedDatabaseScene', 'isOpeningWantedDatabase');
  }
};
