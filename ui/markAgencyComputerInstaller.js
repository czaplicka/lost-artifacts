import { MarkAgencyComputerUI } from './MarkAgencyComputerUI.js';
import { audioManager } from '../managers/AudioManager.js';

export function installMarkAgencyComputer(scene) {
  if (scene._markComputerController) return scene._markComputerController;

  let overlays = [];
  let disposed = false;
  let opening = false;
  const originalApplyLock = scene.applyLock;

  const ui = new MarkAgencyComputerUI(scene, {
    searchDataUrl: 'assets/data/piSearch.json',
    onSfx: () => audioManager.playSfx('click_sound'),

    onOpen: () => {
      scene.closeAllUIPanels?.();
      overlays = ['PlayerHudScene', 'NewsHud', 'UIScene'].flatMap(key => {
        const overlay = scene.scene.manager.keys[key];
        if (!overlay?.sys?.isActive?.()) return [];
        const snapshot = {
          key, overlay, visible: overlay.sys.settings.visible,
          enabled: overlay.input?.enabled
        };
        scene.scene.setVisible(false, key);
        if (overlay.input) overlay.input.enabled = false;
        return [snapshot];
      });
      scene.navigation?.hideHint();
      scene.applyLock(true);
    },

    onClose: ({ restoreHud = true } = {}) => {
      for (const entry of overlays) {
        if (scene.scene.manager.keys[entry.key] !== entry.overlay) continue;
        if (entry.overlay.input) entry.overlay.input.enabled = entry.enabled;
        if (restoreHud && !disposed && scene.isOfficeActive()) {
          scene.scene.setVisible(entry.visible, entry.key);
        }
      }
      overlays = [];
      if (!disposed && !scene._cleanupDone) scene.refreshPanelLock();
    }
  });

  const applyComputerLock = function(locked) {
    return originalApplyLock.call(scene, Boolean(locked || ui.isOpen));
  };
  scene.applyLock = applyComputerLock;
  scene.agencyComputerUI = ui;

  const open = async () => {
    if (disposed || opening || ui.isOpen || !scene.isOfficeActive()) return false;
    if (scene._officePanelRequest) return false;
    scene.refreshPanelLock();
    if (scene.uiLocked) return false;

    // The tutorial permits exploration. Archive access is a different rule.
    const tutorial = scene.firstCaseTutorial || scene.tutorialController;
    if (tutorial?.canUseHotspot?.('agency-computer') === false) return false;

    const token = scene._runToken;
    opening = true;
    try {
      await scene.setupOfficeUiLayers();
      if (disposed || !scene.isCurrentOfficeRun(token) || !scene.isOfficeActive()) return false;
      scene.refreshPanelLock();
      if (scene.uiLocked || scene._officePanelRequest) return false;
      const opened = ui.open();
      if (!opened && !ui.isOpen) {
        scene.showOfficeStatusMessage('The computer could not be opened. Please try again.');
      }
      return Boolean(opened || ui.isOpen);
    } catch (error) {
      if (!disposed && scene.isCurrentOfficeRun(token)) {
        console.error('[OfficeScene] Computer opening failed:', error);
        scene.showOfficeStatusMessage('The computer could not be opened. Please try again.');
      }
      return false;
    } finally {
      opening = false;
      if (!disposed && scene.isCurrentOfficeRun(token)) scene.refreshPanelLock();
    }
  };

  const controller = {
    ui,
    open,
    hotspot: {
      id: 'agency-computer', room: 'office',
      x: scene.rooms.office.x + 820, y: 480,
      width: 190, height: 160,
      label: 'Mark Agency Computer', action: open
    }
  };
  scene._markComputerController = controller;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    try { ui.destroy(); }
    finally {
      if (scene.applyLock === applyComputerLock) scene.applyLock = originalApplyLock;
      if (scene.agencyComputerUI === ui) scene.agencyComputerUI = null;
      if (scene._markComputerController === controller) scene._markComputerController = null;
      scene.events.off('shutdown', cleanup);
      scene.events.off('destroy', cleanup);
    }
  };
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  return controller;
}
