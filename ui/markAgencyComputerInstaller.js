import { MarkAgencyComputerUI } from './MarkAgencyComputerUI.js';
import { audioManager } from '../managers/AudioManager.js';

export function installMarkAgencyComputer(scene) {
  if (scene._markComputerController) {
    return scene._markComputerController;
  }

  let overlays = [];
  let disposed = false;

  const originalApplyLock = scene.applyLock;

  const ui = new MarkAgencyComputerUI(scene, {
    searchDataUrl: 'assets/data/piSearch.json',

    onSfx: () => {
      audioManager.playSfx('click_sound');
    },

    onOpen: () => {
      scene.closeAllUIPanels?.();

      overlays = [
        'PlayerHudScene',
        'NewsHud',
        'UIScene'
      ].flatMap((key) => {
        const overlay = scene.scene.manager.keys[key];

        if (!overlay?.sys?.isActive?.()) {
          return [];
        }

        const snapshot = {
          key,
          overlay,
          visible: overlay.sys.settings.visible,
          enabled: overlay.input?.enabled
        };

        scene.scene.setVisible(false, key);

        if (overlay.input) {
          overlay.input.enabled = false;
        }

        return [snapshot];
      });

      scene.navigation?.hideHint();
      scene.applyLock(true);
    },

    onClose: () => {
      for (const entry of overlays) {
        if (
          scene.scene.manager.keys[entry.key] !== entry.overlay
        ) {
          continue;
        }

        scene.scene.setVisible(entry.visible, entry.key);

        if (entry.overlay.input) {
          entry.overlay.input.enabled = entry.enabled;
        }
      }

      overlays = [];

      if (!scene._cleanupDone) {
        scene.refreshPanelLock();
      }
    }
  });

  const applyComputerLock = function (locked) {
    return originalApplyLock.call(
      scene,
      Boolean(locked || ui.isOpen)
    );
  };

  scene.applyLock = applyComputerLock;
  scene.agencyComputerUI = ui;

  const open = () => {
    if (
      disposed ||
      !scene.isOfficeActive() ||
      scene.isArchiveBlocked()
    ) {
      return false;
    }

    audioManager.playSfx('click_sound');
    return ui.open();
  };

  // Na razie dotychczasowy obszar komputera.
  const hotspot = {
    id: 'agency-computer',
    room: 'office',
    x: scene.rooms.office.x + 820,
    y: 480,
    width: 190,
    height: 160,
    label: 'Mark Agency Computer',
    action: open
  };

  const controller = {
    ui,
    open,
    hotspot
  };

  scene._markComputerController = controller;

  const cleanup = () => {
    if (disposed) return;

    disposed = true;

    try {
      ui.destroy();
    } finally {
      if (scene.applyLock === applyComputerLock) {
        scene.applyLock = originalApplyLock;
      }

      if (scene.agencyComputerUI === ui) {
        scene.agencyComputerUI = null;
      }

      if (scene._markComputerController === controller) {
        scene._markComputerController = null;
      }

      scene.events.off('shutdown', cleanup);
      scene.events.off('destroy', cleanup);
    }
  };

  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);

  return controller;
}