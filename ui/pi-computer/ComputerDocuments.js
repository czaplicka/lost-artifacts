import { ComputerDocuments as ComputerDocumentsBase } from './ComputerDocumentsBase.js';
import { installAlibiDialogueUI } from './AlibiDialogueUI.js';
export * from './ComputerDocumentsBase.js';
export class ComputerDocuments extends ComputerDocumentsBase {
  constructor(ui) {
    super(ui);
    this.alibiDialogueUI=installAlibiDialogueUI(ui,this);
  }
}
