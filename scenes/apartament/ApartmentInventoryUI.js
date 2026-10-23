// Compatibility adapter: apartment objects use the shared inventory.
import { inventoryManager } from '../../managers/InventoryManager.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export class ApartmentInventoryUI {
  constructor(scene) {
    this.scene = scene;
    this.missionId = String(scene.missionId);
  }

  key(id) {
    const raw = String(id);
    const prefix = `apt_${hash(this.missionId)}_`;
    return prefix + (raw.length <= 42 ? raw : `${raw.slice(0, 32)}_${hash(raw)}`);
  }

  toInventoryItem(item) {
    const label = item.label || item.name || 'Apartment evidence';
    const original = JSON.parse(JSON.stringify(item));
    return {
      id: this.key(item.id),
      name: label,
      description: item.description || item.hint || '',
      icon: item.icon || (item.isArtifact ? '🏺' : item.isEscapeClue || item.isEscapeFragment ? '🎫' : '📄'),
      type: item.type || 'evidence',
      quantity: Math.max(1, Number(item.quantity) || 1),
      stackable: false,
      metadata: {
        apartment: {
          missionId: this.missionId,
          originalId: String(item.id),
          item: original
        }
      }
    };
  }

  getItem(id) {
    const scoped = inventoryManager.getItem(this.key(id));
    if (scoped) return scoped;
    const shared = inventoryManager.getItem(id);
    return shared?.metadata?.apartment ? null : shared;
  }

  addItem(item) {
    if (!item?.id) return false;
    if (inventoryManager.hasItem(this.key(item.id))) return true;
    const added = inventoryManager.addItem(this.toInventoryItem(item));
    if (added) this.save();
    return added;
  }

  hasItem(id) { return Boolean(this.getItem(id)); }

  removeItem(id, quantity = 1) {
    const item = this.getItem(id);
    if (!item || item.quantity < quantity) return false;
    const removed = inventoryManager.removeQuantity(item.id, quantity);
    if (removed) this.save();
    return removed;
  }

  getItems() {
    return inventoryManager.getAllItems()
      .filter(item => item.metadata?.apartment?.missionId === this.missionId)
      .map(item => ({
        ...item.metadata.apartment.item,
        id: item.metadata.apartment.originalId,
        label: item.name,
        description: item.description,
        quantity: item.quantity
      }));
  }

  save() {
    gameState.updateState({ inventory: inventoryManager.exportState() });
    requestAutosave();
  }

  get isOpen() { return inventoryManager.isOpen; }
  open() { return this.scene?.openSharedInventory(); }
  close() { inventoryManager.close(); }
  toggle() {
    if (inventoryManager.isOpen) this.close();
    else this.open();
  }
  destroy() { this.scene = null; }
}

export default ApartmentInventoryUI;
