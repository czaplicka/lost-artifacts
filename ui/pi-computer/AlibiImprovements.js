import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { installAlibiImprovements as installExistingAlibiImprovements } from './AlibiImprovementsBase.js';
import { installAlibiGuidance } from './AlibiGuidanceUI.js';
import { installAlibiDinnerTimeKeyword } from './AlibiDinnerTime.js';
import { installAlibiBreakInTimes } from './AlibiBreakInTimes.js';
import { installAlibiSharedFaceSpace } from './AlibiSharedFaceSpace.js';

const KEY = Symbol.for(__dialogueText("ui/pi-computer/AlibiImprovements.js", "t_f7accde0a37a73f99555"));

export function installAlibiImprovements(ui, documents) {
  if (ui[KEY]) return ui[KEY];
  const dinnerTime = installAlibiDinnerTimeKeyword(ui, documents);
  const breakInTimes = installAlibiBreakInTimes(ui, documents);
  const sharedFaces = installAlibiSharedFaceSpace(ui);
  const existing = installExistingAlibiImprovements(ui, documents);
  const guidance = installAlibiGuidance(ui, documents);
  let dead = false;
  const api = {
    destroy() {
      if (dead) return;
      dead = true;
      guidance.destroy();
      existing?.destroy?.();
      sharedFaces.destroy();
      breakInTimes.destroy();
      dinnerTime.destroy();
      if (ui[KEY] === api) delete ui[KEY];
    }
  };
  ui[KEY] = api;
  return api;
}
