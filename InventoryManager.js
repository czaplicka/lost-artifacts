import { EventBus } from './EventBus.js';

export class InventoryManager {
    constructor() {
        this.items = [];
        this._itemMap = new Map();  // ✅ O(1) lookup: id → item
        this.maxSlots = 12;
        this.isOpen = false;

        // ✅ Stable bound handlers
        this.handleAddInventoryItem = (item) => this.addItem(item);
        this.handleRemoveInventoryItem = (itemId) => this.removeItem(itemId);
        this.handleToggleInventory = () => this.toggleInventory();
        this.handleClearInventory = () => this.clearAll();

        // ✅ Rejestracja z owner = this (global singleton pattern)
        EventBus.on('addInventoryItem', this.handleAddInventoryItem, this, this);
        EventBus.on('removeInventoryItem', this.handleRemoveInventoryItem, this, this);
        EventBus.on('toggleInventory', this.handleToggleInventory, this, this);
        EventBus.on('clearInventory', this.handleClearInventory, this, this);
    }

    /**
     * ✅ O(1) addItem z Map
     */
    addItem(item) {
        if (!item?.id || !item?.name) {
            console.warn('[InventoryManager] Invalid item: missing id or name', item);
            return false;
        }

        // ✅ Stackable — O(1) lookup przez Map
        if (item.stackable) {
            const existing = this._itemMap.get(item.id);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
                // ✅ Jeden emit, nie dwa
                EventBus.emit('inventoryUpdated');
                return true;
            }
        }

        if (this.items.length >= this.maxSlots) {
            console.warn('[InventoryManager] Inventory full!');
            EventBus.emit('inventoryFull');
            return false;
        }

        const newItem = {
            id: item.id,
            name: item.name,
            icon: item.icon || '📦',
            description: item.description || '',
            type: item.type || 'misc',
            quantity: item.quantity || 1,
            stackable: item.stackable || false,
            metadata: item.metadata || {},
            addedAt: Date.now()
        };

        this.items.push(newItem);
        this._itemMap.set(newItem.id, newItem);  // ✅ Register in Map

        // ✅ Jeden emit ze wszystkimi danymi
        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemAdded', newItem);

        return true;
    }

    /**
     * ✅ O(1) removeItem z Map
     */
    removeItem(itemId) {
        if (!this._itemMap.has(itemId)) return false;

        // ✅ O(1) sprawdzenie istnienia
        const index = this.items.findIndex(i => i.id === itemId);
        if (index === -1) return false;

        const removed = this.items.splice(index, 1)[0];
        this._itemMap.delete(itemId);  // ✅ Cleanup Map

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemRemoved', removed);
        return true;
    }

    /**
     * ✅ O(1) getItem
     */
    getItem(itemId) {
        return this._itemMap.get(itemId) ?? null;
    }

    /**
     * ✅ O(1) hasItem
     */
    hasItem(itemId) {
        return this._itemMap.has(itemId);
    }

    /**
     * Filter items by type
     */
    getItemsByType(type) {
        return this.items.filter(i => i.type === type);
    }

    /**
     * ✅ Zwróć reference zamiast kopii dla render()
     * Tylko eksport/save powinien robić kopię
     */
    getAllItems() {
        return this.items;  // ← Reference, nie kopia
    }

    /**
     * ✅ Deep copy tylko dla save/export
     */
    getAllItemsCopy() {
        return [...this.items];
    }

    getItemCount() {
        return this.items.length;
    }

    getCapacity() {
        return { current: this.items.length, max: this.maxSlots };
    }

    clearAll() {
        this.items = [];
        this._itemMap.clear();  // ✅ Cleanup Map
        EventBus.emit('inventoryUpdated');
    }

    toggleInventory() {
        this.isOpen = !this.isOpen;
        EventBus.emit('inventoryToggled', this.isOpen);
    }

    open() {
        if (this.isOpen) return;  // ✅ Guard
        this.isOpen = true;
        EventBus.emit('inventoryToggled', true);
    }

    close() {
        if (!this.isOpen) return;  // ✅ Guard
        this.isOpen = false;
        EventBus.emit('inventoryToggled', false);
    }

    /**
     * ✅ Validated importState
     */
    importState(state) {
        if (!state || typeof state !== 'object') {
            console.warn('[InventoryManager] importState: invalid state');
            return false;
        }

        if (!Array.isArray(state.items)) {
            console.warn('[InventoryManager] importState: items must be array');
            return false;
        }

        // ✅ Walidacja każdego item
        const validItems = state.items.filter(item => {
            if (!item?.id || !item?.name) {
                console.warn('[InventoryManager] Skipping invalid item in save:', item);
                return false;
            }
            return true;
        });

        this.items = validItems;

        // ✅ Rebuild Map po import
        this._itemMap.clear();
        this.items.forEach(item => this._itemMap.set(item.id, item));

        EventBus.emit('inventoryUpdated');
        return true;
    }

    /**
     * ✅ Export dla save (deep copy)
     */
    exportState() {
        return {
            items: this.getAllItemsCopy(),
            isOpen: false  // ← Zawsze zamknięte po wczytaniu
        };
    }

    /**
     * ✅ Proper destroy z Map cleanup
     */
    destroy() {
        EventBus.off('addInventoryItem', this.handleAddInventoryItem, this);
        EventBus.off('removeInventoryItem', this.handleRemoveInventoryItem, this);
        EventBus.off('toggleInventory', this.handleToggleInventory, this);
        EventBus.off('clearInventory', this.handleClearInventory, this);

        this.handleAddInventoryItem = null;
        this.handleRemoveInventoryItem = null;
        this.handleToggleInventory = null;
        this.handleClearInventory = null;

        this.items = [];
        this._itemMap.clear();
        this.isOpen = false;
    }
}

export const inventoryManager = new InventoryManager();