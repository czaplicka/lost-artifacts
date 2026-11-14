import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { MarkAgencyComputerUI } from './MarkAgencyComputerUI.js';
import { audioManager } from '../managers/AudioManager.js';
import { installCaseNotebook } from './CaseCloudNotebook.js';

const OVERLAY_KEYS = [
  'PlayerHudScene',
  'NewsHud',
  'UIScene'
];

const HUD_CLASS = 'mark-computer-hide-gameplay-hud';
const HUD_STYLE_ID = 'mark-computer-hud-lock-style';

function installHudStyle() {
  if (document.getElementById(HUD_STYLE_ID)) return;

  const style = document.createElement('style');

  style.id = HUD_STYLE_ID;
  style.textContent = `${__dialogueText("ui/markAgencyComputerInstaller.js", "t_729a7184fab9b25f46f8")}${HUD_CLASS}${__dialogueText("ui/markAgencyComputerInstaller.js", "t_e9241f6d72492dd9b598")}`;

  document.head.appendChild(style);
}

export function installMarkAgencyComputer(scene) {
  if (scene._markComputerController) {
    return scene._markComputerController;
  }

  let disposed = false;
  let opening = false;
  let presentationHidden = false;
  let navigationSnapshot = null;

  const overlaySnapshots = new Map();
  const objectSnapshots = new Map();

  const originalApplyLock = scene.applyLock;

  installHudStyle();

  function hideObject(object) {
    if (!object?.active || typeof object.setVisible !== 'function') {
      return;
    }

    if (!objectSnapshots.has(object)) {
      objectSnapshots.set(object, {
        visible: object.visible
      });
    }

    object.setVisible(false);
  }

  function hideOverlay(key) {
    const overlay = scene.scene.manager.keys[key];

    if (!overlay?.sys) return;

    const previous = overlaySnapshots.get(key);

    if (!previous || previous.overlay !== overlay) {
      overlaySnapshots.set(key, {
        overlay,
        visible: overlay.sys.settings.visible,
        enabled: overlay.input?.enabled
      });
    }

    if (overlay.sys.settings.visible) {
      scene.scene.setVisible(false, key);
    }

    if (overlay.input) {
      overlay.input.enabled = false;
    }
  }

  function enforceHiddenPresentation() {
    if (
      disposed ||
      !presentationHidden ||
      !scene.sys.isActive()
    ) {
      return;
    }

    document.documentElement.classList.add(HUD_CLASS);

    for (const key of OVERLAY_KEYS) {
      hideOverlay(key);
    }

    const navigation = scene.navigation;

    if (navigation) {
      if (!navigationSnapshot) {
        navigationSnapshot = {
          navigation,
          visible: navigation.isVisible
        };
      }

      if (navigation.isVisible) {
        navigation.setVisible(false);
      }

      navigation.hideHint();
    }

    hideObject(scene.archiveButton);
    hideObject(scene.storageButton);
    hideObject(scene.saveUI?.button);
  }

  function hidePresentation() {
    if (presentationHidden) return;

    presentationHidden = true;
    enforceHiddenPresentation();
  }

  function restorePresentation({ restoreHud = true } = {}) {
    if (!presentationHidden) return;

    presentationHidden = false;

    document.documentElement.classList.remove(HUD_CLASS);

    const canRestore = Boolean(
      restoreHud &&
      !disposed &&
      !scene._cleanupDone &&
      scene.isOfficeActive()
    );

    for (const [key, snapshot] of overlaySnapshots) {
      const overlay = scene.scene.manager.keys[key];

      if (overlay !== snapshot.overlay) continue;

      if (overlay.input && snapshot.enabled !== undefined) {
        overlay.input.enabled = snapshot.enabled;
      }

      if (canRestore) {
        scene.scene.setVisible(snapshot.visible, key);
      }
    }

    overlaySnapshots.clear();

    if (canRestore) {
      if (
        navigationSnapshot &&
        scene.navigation === navigationSnapshot.navigation &&
        !scene.navigation.isDestroyed
      ) {
        scene.navigation.setVisible(
          navigationSnapshot.visible
        );
      }

      for (const [object, snapshot] of objectSnapshots) {
        if (object.active) {
          object.setVisible(snapshot.visible);
        }
      }
    }

    navigationSnapshot = null;
    objectSnapshots.clear();

    if (!disposed && !scene._cleanupDone) {
      scene.refreshPanelLock();
    }
  }

  const ui = new MarkAgencyComputerUI(scene, {
    searchDataUrl: 'assets/data/piSearch.json',

    onSfx: () => {
      audioManager.playSfx('click_sound');
    },

    onOpen: () => {
      scene.closeAllUIPanels?.();

      scene.getPlayerHud?.()?.closeAllUIPanels?.();

      scene.scene.manager.keys.NewsHud?.closeMenu?.(true);

      hidePresentation();
      scene.applyLock(true);
    },

    onClose: (options = {}) => {
      restorePresentation(options);
    }
  });

  installCaseNotebook(ui, 'agency');

  const applyComputerLock = function (locked) {
    const result = originalApplyLock.call(
      scene,
      Boolean(locked || ui.isOpen || presentationHidden)
    );

    if (presentationHidden) {
      enforceHiddenPresentation();
    }

    return result;
  };

  scene.applyLock = applyComputerLock;
  scene.agencyComputerUI = ui;

  // Inne systemy mogą próbować ponownie pokazać HUD.
  // Dopóki komputer jest otwarty, utrzymujemy ukrycie.
  scene.events.on('postupdate', enforceHiddenPresentation);

  const open = async () => {
    if (
      disposed ||
      opening ||
      ui.isOpen ||
      !scene.isOfficeActive()
    ) {
      return false;
    }

    if (scene._officePanelRequest) return false;

    scene.refreshPanelLock();

    if (scene.uiLocked) return false;

    const tutorial =
      scene.firstCaseTutorial ||
      scene.tutorialController;

    if (
      tutorial?.canUseHotspot?.('agency-computer') === false
    ) {
      return false;
    }

    const token = scene._runToken;

    opening = true;

    try {
      await scene.setupOfficeUiLayers();

      if (
        disposed ||
        !scene.isCurrentOfficeRun(token) ||
        !scene.isOfficeActive()
      ) {
        return false;
      }

      scene.refreshPanelLock();

      if (scene.uiLocked || scene._officePanelRequest) {
        return false;
      }

      const opened = ui.open();

      if (!opened && !ui.isOpen) {
        restorePresentation();

        scene.showOfficeStatusMessage(
          __dialogueText("ui/markAgencyComputerInstaller.js", "t_6ad453d4bc85e7ed736d")
        );
      }

      return Boolean(opened || ui.isOpen);
    } catch (error) {
      if (!ui.isOpen) {
        restorePresentation();
      }

      if (!disposed && scene.isCurrentOfficeRun(token)) {
        console.error(
          '[OfficeScene] Computer opening failed:',
          error
        );

        scene.showOfficeStatusMessage(
          __dialogueText("ui/markAgencyComputerInstaller.js", "t_6ad453d4bc85e7ed736d")
        );
      }

      return false;
    } finally {
      opening = false;

      if (!disposed && scene.isCurrentOfficeRun(token)) {
        scene.refreshPanelLock();
      }
    }
  };

  const controller = {
    ui,
    open,

    hotspot: {
      id: 'agency-computer',
      room: 'office',
      x: scene.rooms.office.x + 820,
      y: 480,
      width: 190,
      height: 160,
      label: __dialogueText("ui/markAgencyComputerInstaller.js", "t_1bddadc34f8d28871c52"),
      action: open
    }
  };

  scene._markComputerController = controller;

  const cleanup = () => {
    if (disposed) return;

    disposed = true;

    scene.events.off(
      'postupdate',
      enforceHiddenPresentation
    );

    try {
      ui.destroy();
    } finally {
      restorePresentation({ restoreHud: false });

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