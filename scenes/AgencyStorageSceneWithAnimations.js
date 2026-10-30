import { AgencyStorageScene as OriginalStorageScene } from './AgencyStorageScene.js';
import { StorageManagerAnimations } from './storage/StorageManagerAnimations.js';

export class AgencyStorageScene extends OriginalStorageScene {
  create() {
    super.create();
    this.storageManagerAnimations = new StorageManagerAnimations(this);
  }

  layoutStorage() {
    super.layoutStorage();
    this.storageManagerAnimations?.layout();
  }

  cleanupStorage() {
    this.storageManagerAnimations?.destroy();
    this.storageManagerAnimations = null;
    super.cleanupStorage();
  }
}
