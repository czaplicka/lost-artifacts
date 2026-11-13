import {
  ComputerDocuments as ComputerDocumentsCore
} from './ComputerDocumentsCore.js';

import {
  installGrandConspiracyComputer
} from './GrandConspiracyComputer.js';

export * from './ComputerDocumentsCore.js';

export class ComputerDocuments extends ComputerDocumentsCore {
  constructor(ui) {
    super(ui);

    this.grandConspiracyComputer =
      installGrandConspiracyComputer(ui, this);
  }
}