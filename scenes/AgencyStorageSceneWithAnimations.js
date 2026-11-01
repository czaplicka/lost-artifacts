import { AgencyStorageScene as OriginalStorageScene } from './AgencyStorageScene.js';
import { StorageManagerAnimations } from './storage/StorageManagerAnimations.js';
import { AlexMouthAnimation, alexMouthSource } from './storage/AlexMouthAnimation.js';

export class AgencyStorageScene extends OriginalStorageScene {
  preload() {
    super.preload();
    const asset = alexMouthSource(this);
    if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url);
  }

  create() {
    super.create();
    this.storageManagerAnimations = new StorageManagerAnimations(this);
    this.alexMouthAnimation = new AlexMouthAnimation(this);
  }

  layoutStorage() {
    super.layoutStorage();
    this.storageManagerAnimations?.layout();
    this.alexMouthAnimation?.layout();
  }

  cleanupStorage() {
    this.alexMouthAnimation?.destroy();
    this.alexMouthAnimation = null;
    this.storageManagerAnimations?.destroy();
    this.storageManagerAnimations = null;
    super.cleanupStorage();
  }
}
