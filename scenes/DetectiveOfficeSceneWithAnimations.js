import { DetectiveOfficeScene as OriginalOfficeScene } from './DetectiveOfficeScene.js';
import { PIOfficeAnimations } from './pi-office/PIOfficeAnimations.js';

export class DetectiveOfficeScene extends OriginalOfficeScene {
  create() {
    super.create();
    this.piOfficeAnimations = new PIOfficeAnimations(this);
  }

  layoutOffice() {
    super.layoutOffice();
    this.piOfficeAnimations?.layout();
  }

  cleanupOffice() {
    this.piOfficeAnimations?.destroy();
    this.piOfficeAnimations = null;
    super.cleanupOffice();
  }
}
