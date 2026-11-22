import { dialogueText } from '../dialogues/DialogueText.js';
import { MarkAgencyComputerUI } from './MarkAgencyComputerUI.js';
import { audioManager } from '../managers/AudioManager.js';
import { installCaseNotebook } from './CaseCloudNotebook.js';
import { MarkAgencyPresentation, MARK_COMPUTER_HUD_CLASS } from './MarkAgencyPresentation.js';
const text = id => dialogueText('ui/markAgencyComputerInstaller.js', id);
const HUD_STYLE_ID = 'mark-computer-hud-lock-style';

function installHudStyle() {
  if (document.getElementById(HUD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HUD_STYLE_ID;
  style.textContent = `${text('t_729a7184fab9b25f46f8')}${MARK_COMPUTER_HUD_CLASS}${text('t_e9241f6d72492dd9b598')}`;
  document.head.appendChild(style);
}

export function installMarkAgencyComputer(scene) {
  if (scene._markComputerController) return scene._markComputerController;
  let disposed = false;
  let opening = false;
  const originalApplyLock = scene.applyLock;
  const presentation = new MarkAgencyPresentation(scene,
    () => !disposed && !scene._cleanupDone && scene.isOfficeActive());
  installHudStyle();

  const enforceHiddenPresentation = () => {
    if (!disposed) presentation.enforce();
  };
  const restorePresentation = (options = {}) => {
    if (!presentation.hidden) return;
    presentation.restore(options);
    if (!disposed && !scene._cleanupDone) scene.refreshPanelLock();
  };

  const ui = new MarkAgencyComputerUI(scene, {
    searchDataUrl: 'assets/data/piSearch.json',
    onSfx: () => audioManager.playSfx('click_sound'),
    onOpen: () => {
      scene.closeAllUIPanels?.();
      scene.getPlayerHud?.()?.closeAllUIPanels?.();
      scene.scene.manager.keys.NewsHud?.closeMenu?.(true);
      presentation.hide();
      scene.applyLock(true);
    },
    onClose: (options = {}) => restorePresentation(options)
  });
  installCaseNotebook(ui, 'agency');

  const applyComputerLock = function (locked) {
    const result = originalApplyLock.call(scene, Boolean(locked || ui.isOpen || presentation.hidden));
    if (!disposed && presentation.hidden) presentation.enforce();
    return result;
  };
  scene.applyLock = applyComputerLock;
  scene.agencyComputerUI = ui;
  scene.events.on('postupdate', enforceHiddenPresentation);

  const open = async () => {
    if (disposed || opening || ui.isOpen || !scene.isOfficeActive() || scene._officePanelRequest) return false;
    scene.refreshPanelLock();
    if (scene.uiLocked) return false;
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
        restorePresentation();
        scene.showOfficeStatusMessage(text('t_6ad453d4bc85e7ed736d'));
      }
      return Boolean(opened || ui.isOpen);
    } catch (error) {
      if (!ui.isOpen) restorePresentation();
      if (!disposed && scene.isCurrentOfficeRun(token)) {
        console.error('[OfficeScene] Computer opening failed:', error);
        scene.showOfficeStatusMessage(text('t_6ad453d4bc85e7ed736d'));
      }
      return false;
    } finally {
      opening = false;
      if (!disposed && scene.isCurrentOfficeRun(token)) scene.refreshPanelLock();
    }
  };

  const controller = {
    ui, open,
    hotspot: {
      id: 'agency-computer', room: 'office',
      x: scene.rooms.office.x + 820, y: 480, width: 190, height: 160,
      label: text('t_1bddadc34f8d28871c52'), action: open
    }
  };
  scene._markComputerController = controller;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    const release = (label, action) => {
      try {action();}
      catch (error) {console.warn(`[markAgencyComputerInstaller] ${label} cleanup failed:`, error);}
    };
    scene.events.off('postupdate', enforceHiddenPresentation);
    release('UI', () => ui.destroy());
    release('presentation', () => presentation.restore({restoreHud: false}));
    if (scene.applyLock === applyComputerLock) scene.applyLock = originalApplyLock;
    if (scene.agencyComputerUI === ui) scene.agencyComputerUI = null;
    if (scene._markComputerController === controller) scene._markComputerController = null;
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
  };
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  return controller;
}
