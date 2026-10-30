import { ArchiveScene as OriginalArchiveScene } from './ArchiveScene.js';
import { ArchiveAnimations } from './archive/ArchiveAnimations.js';

export class ArchiveScene extends OriginalArchiveScene {
  create() {
    super.create();
    this.archiveAnimations = new ArchiveAnimations(this);
  }

  layoutArchive() {
    super.layoutArchive();
    this.archiveAnimations?.layout();
  }

  cleanupArchive() {
    this.archiveAnimations?.destroy();
    this.archiveAnimations = null;
    super.cleanupArchive();
  }
}
