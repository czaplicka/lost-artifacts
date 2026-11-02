import { CrimeLabScene as OriginalCrimeLabScene } from './CrimeLabScene.js';
import { LabAssistantAnimations } from './LabAssistantAnimations.js';

export class CrimeLabScene extends OriginalCrimeLabScene {
  create() {
    super.create();
    this.labAssistantAnimations = new LabAssistantAnimations(this);
  }
}
