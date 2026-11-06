import { installDeadMenEvidenceUI as installOriginalEvidenceUI } from './DeadMenEvidenceUIBase.js';
import { installDeadMenDialogueUI } from './DeadMenDialogueUI.js';
export function installDeadMenEvidenceUI(ui){
  installOriginalEvidenceUI(ui);
  return installDeadMenDialogueUI(ui);
}
