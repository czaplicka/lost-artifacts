import { installAdvertisingMail } from './AdvertisingMail.js';
import { installPINewMailButton } from './PINewMailButton.js';
import {
  ComputerDocuments as ComputerDocumentsCore
} from './ComputerDocumentsCore.js';

import {
  installGrandConspiracyComputer
} from './GrandConspiracyComputer.js';

import {
  installMomsNotProudComputer
} from './MomsNotProudComputer.js';

import {
  installTableForThreeComputer
} from './TableForThreeComputer.js';

export * from './ComputerDocumentsCore.js';

const LOCAL_AREA_POSITION = Symbol.for(
  'lost-artifacts.local-area-icon-position'
);

function installLocalAreaIconPosition(ui) {
  const desktop = ui.desktop;

  if (desktop[LOCAL_AREA_POSITION]) {
    return desktop[LOCAL_AREA_POSITION];
  }

  const originalCreateIcon = desktop.createIcon;

  const createIcon = function (...args) {
    const kind = args[4];

    if (kind === 'local-road' && ui.layout) {
      args[0] = ui.layout.x + 432;
      args[1] = ui.layout.y + 10;
    }

    return originalCreateIcon.apply(this, args);
  };

  desktop.createIcon = createIcon;

  let destroyed = false;

  function destroy() {
    if (destroyed) return;

    destroyed = true;

    if (desktop.createIcon === createIcon) {
      desktop.createIcon = originalCreateIcon;
    }

    if (desktop[LOCAL_AREA_POSITION] === api) {
      delete desktop[LOCAL_AREA_POSITION];
    }

    ui.scene.events.off('shutdown', destroy);
    ui.scene.events.off('destroy', destroy);
  }

  const api = { destroy };

  desktop[LOCAL_AREA_POSITION] = api;

  ui.scene.events.once('shutdown', destroy);
  ui.scene.events.once('destroy', destroy);

  return api;
}

export class ComputerDocuments extends ComputerDocumentsCore {
  installMailButtonFilter() {
    const rawButton = this.ui.drawing.button;
    super.installMailButtonFilter();
    installPINewMailButton(this.ui, this, rawButton);
  }

  constructor(ui) {
    super(ui);
    this.advertisingMail = installAdvertisingMail(ui, this);

    this.grandConspiracyComputer = null;
    this.momsNotProudComputer = null;
    this.tableForThreeComputer = null;
    this.localAreaIconPosition = null;

    const isPIComputer =
      typeof ui?.suspend === 'function' &&
      typeof ui?.resume === 'function' &&
      typeof ui?.desktop?.render === 'function' &&
      typeof ui?.desktop?.createIcon === 'function' &&
      typeof ui?.desktop?.drawGlyph === 'function';

    if (!isPIComputer) {
      return;
    }

    this.localAreaIconPosition =
      installLocalAreaIconPosition(ui);

    this.grandConspiracyComputer =
      installGrandConspiracyComputer(ui, this);

    this.momsNotProudComputer =
      installMomsNotProudComputer(ui, this);

    this.tableForThreeComputer =
      installTableForThreeComputer(ui, this);
  }
}