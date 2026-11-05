import {
  BaseScene as BaseSceneCore
} from './BaseSceneCore.js';

import {
  inventoryManager
} from '../managers/InventoryManager.js';

import {
  piInventoryManager
} from '../managers/PIInventoryManager.js';

import {
  installPIInventory,
  isPIInventoryScene
} from '../ui/PIInventoryUI.js';

export class BaseScene extends BaseSceneCore {
  create() {
    super.create();

    this.events.off(
      Phaser.Scenes.Events.CREATE,
      this.createPIInventory,
      this
    );

    if (isPIInventoryScene(this)) {
      this.events.once(
        Phaser.Scenes.Events.CREATE,
        this.createPIInventory,
        this
      );
    }
  }

  createPIInventory() {
    installPIInventory(this);
  }

  getInventoryManager() {
    return isPIInventoryScene(this)
      ? piInventoryManager
      : inventoryManager;
  }

  addInventoryItem(item) {
    return this.getInventoryManager().addItem(item);
  }

  removeInventoryItem(itemId) {
    return this.getInventoryManager().removeItem(itemId);
  }

  getInventoryItem(itemId) {
    return this.getInventoryManager().getItem(itemId);
  }

  hasInventoryItem(itemId) {
    return this.getInventoryManager().hasItem(itemId);
  }

  getAllInventoryItems() {
    return this.getInventoryManager().getAllItems();
  }

  getSelectedInventoryItem() {
    return this.getInventoryManager().getSelectedItem();
  }

  openInventory() {
    if (isPIInventoryScene(this)) {
      return this.piInventoryUI?.open() ?? false;
    }

    return inventoryManager.open();
  }

  closeInventory() {
    if (isPIInventoryScene(this)) {
      return this.piInventoryUI?.close();
    }

    return inventoryManager.close();
  }

  cleanup() {
    this.events.off(
      Phaser.Scenes.Events.CREATE,
      this.createPIInventory,
      this
    );

    super.cleanup();

    this.piInventoryUI?.destroy();
  }
}