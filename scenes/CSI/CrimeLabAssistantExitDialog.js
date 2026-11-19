import {
  CrimeLabAssistantDialog as CrimeLabAssistantPanel,
} from './CrimeLabAssistantPanel.js';

export class CrimeLabAssistantDialog extends CrimeLabAssistantPanel {
  open(options = {}) {
    if (!super.open(options)) return false;

    const view = this.view;
    const exitButton = view.byeBtn;

    exitButton.text.setText('EXIT LAB');

    // Podmieniamy tylko akcję kliknięcia. Esc nadal zamyka sam dialog.
    exitButton.rect.removeAllListeners('pointerdown');

    let exitRequested = false;

    exitButton.rect.on('pointerdown', (_pointer, _x, _y, event) => {
      event?.stopPropagation();

      const lab = this.scene;
      if (
        exitRequested ||
        !this.isOpen() ||
        this.view !== view ||
        lab.isExitingLab ||
        lab.debugMode ||
        !lab.sys.isActive()
      ) return;

      exitRequested = true;

      // Normalne zamknięcie dialogu zwalnia blokadę CSI.
      // Dopiero potem istniejące exitLab() może opuścić scenę.
      this.close();
      lab.exitLab();
    });

    return true;
  }
}