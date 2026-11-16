import {
  ComputerDocuments as ComputerDocumentsCore
} from './ComputerDocumentsCore.js';

import {
  installGrandConspiracyComputer
} from './GrandConspiracyComputer.js';

import {
  installMomsNotProudComputer
} from './MomsNotProudComputer.js';

export * from './ComputerDocumentsCore.js';

export class ComputerDocuments extends ComputerDocumentsCore {
  constructor(ui) {
    super(ui);

    this.grandConspiracyComputer = null;
    this.momsNotProudComputer = null;

    const isPIComputer =
      typeof ui?.suspend === 'function' &&
      typeof ui?.resume === 'function' &&
      typeof ui?.desktop?.render === 'function' &&
      typeof ui?.desktop?.createIcon === 'function' &&
      typeof ui?.desktop?.drawGlyph === 'function';

    if (!isPIComputer) {
      return;
    }

    this.grandConspiracyComputer =
      installGrandConspiracyComputer(ui, this);

    this.momsNotProudComputer =
      installMomsNotProudComputer(ui, this);
  }
}