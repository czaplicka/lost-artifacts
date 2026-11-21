import { EventBus } from '../EventBus.js';

const MAX_QUANTITY = 999;
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 60;
const MAX_ICON_LENGTH = 16;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_DEPTH = 8;
const SAVE_VERSION = 1;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isSkippableType = type => ['undefined', 'function', 'symbol', 'bigint'].includes(type);
const isPlainObject = value => {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};
const cleanText = (value, maxLength, fallback = '') =>
    typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
// One canonical representation for both stored IDs and every public lookup.
const normalizeId = value => cleanText(String(value ?? ''), MAX_ID_LENGTH);
const toQuantity = value => {
    const number = Math.floor(Number(value));
    return !Number.isFinite(number) || number < 1 ? 1 : Math.min(number, MAX_QUANTITY);
};

export class InventoryManager {
    constructor() {
        // These two collection objects retain their identity for this manager's lifetime.
        this.items = [];
        this._itemMap = new Map();
        this.maxSlots = 12;
        this.isOpen = false;
        this.selectedItemId = null;
        this._initialized = false;
        this._destroyed = false;
        this.handleAddInventoryItem = item => this.addItem(item);
        this.handleRemoveInventoryItem = itemId => this.removeItem(itemId);
        this.handleToggleInventory = () => this.toggleInventory();
        this.handleClearInventory = () => this.clearAll();
        this.handleSelectInventoryItem = itemId => this.selectItem(itemId);
        this.handleClearInventorySelection = () => this.clearSelection();
        this.initialize();
    }
    _busBindings() {
        return [
            ['addInventoryItem', this.handleAddInventoryItem],
            ['removeInventoryItem', this.handleRemoveInventoryItem],
            ['toggleInventory', this.handleToggleInventory],
            ['clearInventory', this.handleClearInventory],
            ['selectInventoryItem', this.handleSelectInventoryItem],
            ['clearInventorySelection', this.handleClearInventorySelection]
        ];
    }
    initialize() {
        if (this._initialized) return;
        if (this._destroyed) {
            console.warn('[InventoryManager] initialize() called after destroy(). Create a new InventoryManager instance instead.');
            return;
        }
        // Intentionally global: singleton lifetime, not a scene subscription.
        for (const [event, handler] of this._busBindings()) EventBus.on(event, handler, this);
        this._initialized = true;
    }
    addItem(item) {
        if (this._destroyed) {
            console.warn('[InventoryManager] Cannot add item after destroy().');
            return false;
        }
        if (!item?.id || !item?.name) {
            console.warn('[InventoryManager] Invalid item: missing id or name.', item);
            return false;
        }
        const itemId = normalizeId(item.id);
        const quantityToAdd = toQuantity(item.quantity);
        const existingItem = this._itemMap.get(itemId) ?? null;
        if (existingItem) {
            if (!(existingItem.stackable === true && item.stackable === true)) {
                console.warn(`[InventoryManager] Duplicate item id rejected: "${itemId}".`, { existingItem, attemptedItem: item });
                EventBus.emit('inventoryDuplicateItem', { existingItem, attemptedItem: item });
                return false;
            }
            const before = existingItem.quantity;
            existingItem.quantity = Math.min(MAX_QUANTITY, before + quantityToAdd);
            EventBus.emit('inventoryUpdated');
            EventBus.emit('itemQuantityChanged', {
                item: existingItem, quantity: existingItem.quantity,
                addedQuantity: existingItem.quantity - before
            });
            return true;
        }
        // Capacity policy is unchanged. No inferred quest/evidence classification.
        if (this.items.length >= this.maxSlots) {
            console.warn('[InventoryManager] Inventory full.');
            EventBus.emit('inventoryFull', { attemptedItem: item, capacity: this.getCapacity() });
            return false;
        }
        const normalized = this.normalizeItem({ ...item, id: itemId, quantity: quantityToAdd });
        if (!normalized) {
            console.warn('[InventoryManager] Could not normalize item.', item);
            return false;
        }
        this.items.push(normalized);
        this._itemMap.set(normalized.id, normalized);
        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemAdded', normalized);
        return true;
    }
    removeItem(itemId) {
        if (this._destroyed) return false;
        const id = normalizeId(itemId);
        if (!id) return false;
        const removedItem = this._itemMap.get(id);
        if (!removedItem) return false;
        const index = this.items.indexOf(removedItem);
        if (index === -1) console.warn(`[InventoryManager] Item "${id}" exists in Map but not in items array.`);
        else this.items.splice(index, 1);
        this._itemMap.delete(id);
        if (this.selectedItemId === id) this._setSelectedItemId(null, removedItem);
        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemRemoved', removedItem);
        return index !== -1;
    }
    removeQuantity(itemId, quantity = 1) {
        if (this._destroyed) return false;
        const id = normalizeId(itemId);
        if (!id) return false;
        const item = this._itemMap.get(id);
        if (!item) return false;
        const amount = toQuantity(quantity);
        if (!item.stackable || item.quantity <= amount) return this.removeItem(id);
        item.quantity -= amount;
        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemQuantityChanged', { item, quantity: item.quantity, removedQuantity: amount });
        return true;
    }
    getItem(itemId) {
        const id = normalizeId(itemId);
        return id ? this._itemMap.get(id) ?? null : null;
    }
    hasItem(itemId) {
        const id = normalizeId(itemId);
        return Boolean(id && this._itemMap.has(id));
    }
    getItemsByType(type) { return this.items.filter(item => item.type === type); }
    // Live reference for rendering only. Do not modify it outside this manager.
    getAllItems() { return this.items; }
    getAllItemsCopy() { return this.items.map(item => this.serializeItem(item)); }
    getItemCount() { return this.items.length; }
    getCapacity() { return { current: this.items.length, max: this.maxSlots }; }
    selectItem(itemId) {
        if (this._destroyed) return false;
        const id = normalizeId(itemId);
        if (!id) return false;
        if (!this._itemMap.has(id)) {
            console.warn(`[InventoryManager] Cannot select missing item: "${id}".`);
            return false;
        }
        if (this.selectedItemId === id) return true;
        this._setSelectedItemId(id);
        return true;
    }
    clearSelection() {
        if (this._destroyed || !this.selectedItemId) return false;
        this._setSelectedItemId(null);
        return true;
    }
    getSelectedItem() {
        if (!this.selectedItemId) return null;
        const selected = this._itemMap.get(this.selectedItemId);
        if (!selected) { this.selectedItemId = null; return null; }
        return selected;
    }
    _setSelectedItemId(itemId, previousItem = undefined) {
        if (this.selectedItemId === itemId) return;
        const previous = previousItem !== undefined ? previousItem :
            (this.selectedItemId ? this._itemMap.get(this.selectedItemId) ?? null : null);
        this.selectedItemId = itemId;
        const selected = itemId ? this._itemMap.get(itemId) ?? null : null;
        EventBus.emit('inventorySelectionChanged', selected);
        if (selected) EventBus.emit('inventoryItemSelected', selected);
        else EventBus.emit('inventoryItemDeselected', previous);
    }
    clearAll() {
        if (this._destroyed) return;
        const previousSelectedItem = this.getSelectedItem();
        this.items.length = 0;
        this._itemMap.clear();
        this.selectedItemId = null;
        EventBus.emit('inventoryUpdated');
        if (previousSelectedItem) {
            EventBus.emit('inventorySelectionChanged', null);
            EventBus.emit('inventoryItemDeselected', previousSelectedItem);
        }
    }
    toggleInventory() {
        if (this._destroyed) return;
        this.isOpen = !this.isOpen;
        EventBus.emit('inventoryToggled', this.isOpen);
    }
    open() {
        if (this._destroyed || this.isOpen) return;
        this.isOpen = true;
        EventBus.emit('inventoryToggled', true);
    }
    close() {
        if (this._destroyed || !this.isOpen) return;
        this.isOpen = false;
        EventBus.emit('inventoryToggled', false);
    }
    importState(state) {
        if (this._destroyed) {
            console.warn('[InventoryManager] Cannot import state after destroy().');
            return false;
        }
        if (!state || typeof state !== 'object' || !Array.isArray(state.items)) {
            console.warn('[InventoryManager] importState: items must be an array.');
            return false;
        }
        if (state.version !== undefined && state.version !== SAVE_VERSION) {
            console.warn(`[InventoryManager] importState: unknown save version "${state.version}". Expected ${SAVE_VERSION}. Trying to import anyway.`);
        }
        // Prepare before touching either live collection.
        const validItems = [], stagedMap = new Map();
        let skipped = 0;
        for (const rawItem of state.items) {
            const normalized = this.normalizeItem(rawItem);
            if (!normalized) {
                console.warn('[InventoryManager] Skipping invalid item in save:', rawItem);
                skipped++;
                continue;
            }
            const existing = stagedMap.get(normalized.id);
            if (existing) {
                if (existing.stackable && normalized.stackable) {
                    existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + normalized.quantity);
                } else {
                    console.warn(`[InventoryManager] Skipping duplicate item id in save: "${normalized.id}".`);
                    skipped++;
                }
                continue;
            }
            // Loading owned items is not a new acquisition. Never truncate a save
            // because maxSlots was reduced or a previous version allowed overflow.
            validItems.push(normalized);
            stagedMap.set(normalized.id, normalized);
        }
        if (skipped > 0 && validItems.length === 0) console.warn('[InventoryManager] importState: every item in the save was invalid.');
        if (validItems.length > this.maxSlots) console.warn('[InventoryManager] Saved inventory exceeds acquisition capacity; all valid items were retained.');
        const previousSelectedItem = this.getSelectedItem();
        this.items.length = 0;
        this._itemMap.clear();
        for (const item of validItems) {
            this.items.push(item);
            this._itemMap.set(item.id, item);
        }
        this.selectedItemId = null;
        this.isOpen = false;
        EventBus.emit('inventoryUpdated');
        EventBus.emit('inventoryToggled', false);
        if (previousSelectedItem) {
            EventBus.emit('inventorySelectionChanged', null);
            EventBus.emit('inventoryItemDeselected', previousSelectedItem);
        }
        return true;
    }
    exportState() { return { version: SAVE_VERSION, items: this.getAllItemsCopy() }; }
    normalizeItem(rawItem) {
        if (!rawItem || typeof rawItem !== 'object') return null;
        const id = normalizeId(rawItem.id);
        const name = cleanText(String(rawItem.name ?? ''), MAX_NAME_LENGTH);
        if (!id || !name) return null;
        return {
            id, name,
            icon: cleanText(rawItem.icon, MAX_ICON_LENGTH, '📦') || '📦',
            description: cleanText(rawItem.description, MAX_DESCRIPTION_LENGTH),
            type: cleanText(rawItem.type, MAX_ID_LENGTH, 'misc') || 'misc',
            quantity: toQuantity(rawItem.quantity),
            stackable: Boolean(rawItem.stackable),
            metadata: this.cloneSafeMetadata(rawItem.metadata),
            addedAt: Number(rawItem.addedAt) || Date.now()
        };
    }
    serializeItem(item) {
        return this.normalizeItem(item) ?? {
            id: String(item?.id ?? ''), name: String(item?.name ?? ''), icon: '📦',
            description: '', type: 'misc', quantity: 1, stackable: false,
            metadata: {}, addedAt: Date.now()
        };
    }
    cloneSafeMetadata(metadata) {
        return metadata === null || metadata === undefined ? {} : this.sanitizeSaveData(metadata);
    }
    // Same save-safe metadata policy as before: unsupported branches become null.
    sanitizeSaveData(value, seen = new WeakSet(), depth = 0) {
        if (value === null) return null;
        const type = typeof value;
        if (type === 'string' || type === 'boolean') return value;
        if (type === 'number') return Number.isFinite(value) ? value : null;
        if (isSkippableType(type)) return null;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
        if (type !== 'object') return null;
        if (depth >= MAX_METADATA_DEPTH) {
            console.warn('[InventoryManager] Item metadata too deep. Branch removed.');
            return null;
        }
        if (seen.has(value)) {
            console.warn('[InventoryManager] Circular reference removed from item metadata.');
            return Array.isArray(value) ? [] : null;
        }
        seen.add(value);
        let result = null;
        if (Array.isArray(value)) result = value.map(entry => this.sanitizeSaveData(entry, seen, depth + 1));
        else if (isPlainObject(value)) {
            result = {};
            for (const [key, nested] of Object.entries(value)) {
                if (FORBIDDEN_KEYS.has(key) || isSkippableType(typeof nested)) continue;
                result[key] = this.sanitizeSaveData(nested, seen, depth + 1);
            }
        }
        seen.delete(value);
        return result;
    }
    destroy() {
        if (this._destroyed) return;
        if (this._initialized) for (const [event, handler] of this._busBindings()) EventBus.off(event, handler, this);
        this._initialized = false;
        this._destroyed = true;
        this.items.length = 0;
        this._itemMap.clear();
        this.selectedItemId = null;
        this.isOpen = false;
    }
}
export const inventoryManager = new InventoryManager();
