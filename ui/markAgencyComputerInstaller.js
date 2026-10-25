import { MarkAgencyComputerUI } from './MarkAgencyComputerUI.js';
import { audioManager } from '../managers/AudioManager.js';

export function installMarkAgencyComputer(scene) {
  if (scene._markComputerController) return scene._markComputerController;
  let overlays = [], disposed = false;
  const originalApplyLock = scene.applyLock;
  const ui = new MarkAgencyComputerUI(scene, {
    searchDataUrl: 'assets/data/piSearch.json',
    onSfx: () => audioManager.playSfx('click_sound'),
    onOpen: () => {
      scene.closeAllUIPanels?.();
      overlays = ['PlayerHudScene', 'NewsHud', 'UIScene'].flatMap(key => {
        const overlay = scene.scene.manager.keys[key];
        if (!overlay?.sys?.isActive?.()) return [];
        const snapshot = { key, overlay, visible: overlay.sys.settings.visible,
          enabled: overlay.input?.enabled };
        scene.scene.setVisible(false, key);
        if (overlay.input) overlay.input.enabled = false;
        return [snapshot];
      });
      scene.navigation?.hideHint();
      scene.applyLock(true);
    },
    onClose: () => {
      // Release the visibility/input flags owned by this modal, including on shutdown.
      for (const entry of overlays) {
        if (scene.scene.manager.keys[entry.key] !== entry.overlay) continue;
        scene.scene.setVisible(entry.visible, entry.key);
        if (entry.overlay.input) entry.overlay.input.enabled = entry.enabled;
      }
      overlays = [];
      if (!scene._cleanupDone) scene.refreshPanelLock();
    }
  });
  // Extend the existing lock, without forking or replacing the OfficeScene implementation.
  const applyComputerLock = function(locked) {
    return originalApplyLock.call(scene, Boolean(locked || ui.isOpen));
  };
  scene.applyLock = applyComputerLock;
  scene.agencyComputerUI = ui;
  const open = () => {
    if (disposed || !scene.isOfficeActive() || scene.isArchiveBlocked()) return false;
    audioManager.playSfx('click_sound');
    return ui.open();
  };
  const button = scene.add.text(24, 290, 'COMPUTER >', {
    fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
    backgroundColor: '#17110e', padding: { x: 14, y: 10 }
  }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
  button.on('pointerdown', pointer => {
    if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
    open();
  });
  button.on('pointerover', () => { if (!scene.uiLocked) button.setColor('#ffffff'); });
  button.on('pointerout', () => button.setColor('#f2d477'));

  const x = scene.rooms.office.x + 820, y = 480;
  const art = scene.add.graphics().setDepth(25);
  art.fillStyle(0x172b36, 1); art.fillRect(x, y, 190, 130);
  art.lineStyle(3, 0x8a9d9c, 1); art.strokeRect(x, y, 190, 130);
  art.fillStyle(0x245568, 1); art.fillRect(x + 13, y + 12, 164, 92);
  art.fillStyle(0xc2b074, 1); art.fillRect(x + 37, y + 35, 116, 4);
  art.fillRect(x + 37, y + 47, 76, 4);
  art.fillStyle(0x304b56, 1); art.fillRect(x + 75, y + 130, 40, 18);
  art.fillRect(x + 44, y + 148, 102, 9);
  art.fillStyle(0x8dc2a4, 1); art.fillRect(x + 166, y + 114, 7, 7);
  const label = scene.add.text(x + 46, y + 70, 'MARKNET', {
    fontFamily: 'PressStart2P', fontSize: '10px', color: '#dbc78d'
  }).setDepth(26);
  const controller = { ui, open, hotspot: {
    id: 'agency-computer', room: 'office', x, y, width: 190, height: 160,
    label: 'Mark Agency Computer', action: open
  } };
  scene._markComputerController = controller;
  const cleanup = () => {
    if (disposed) return;
    disposed = true; ui.destroy();
    button.removeAllListeners(); button.destroy(); art.destroy(); label.destroy();
    if (scene.applyLock === applyComputerLock) scene.applyLock = originalApplyLock;
    if (scene.agencyComputerUI === ui) scene.agencyComputerUI = null;
    if (scene._markComputerController === controller) scene._markComputerController = null;
    scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
  };
  scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
  return controller;
}
