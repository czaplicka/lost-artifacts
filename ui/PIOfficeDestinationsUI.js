// ui/PIOfficeDestinationsUI.js

import { DestinationsUI } from './DestinationsUI.js';

export class PIOfficeDestinationsUI extends DestinationsUI {
  constructor(scene, options = {}) {
    super(scene);

    this.piOptions = options;
  }

  // The map is opened from the computer, not by a global hotkey.
  registerKeyboard() {}

  close(options = {}) {
    const wasOpen = this.isOpen;

    const {
      restoreHud = true,
      ...rest
    } = options;

    super.close({
      ...rest,
      restoreHud: false
    });

    if (wasOpen && !this.isOpen) {
      this.piOptions?.onClose?.({
        // Existing travel flows may close the map without restoring UI.
        returnToComputer: restoreHud !== false
      });
    }
  }
}