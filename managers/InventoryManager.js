import { EventBus } from '../EventBus.js';

const MAX_QUANTITY = 999;
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 60;
const MAX_ICON_LENGTH = 16;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_DEPTH = 8;
const SAVE_VERSION = 1;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isSkippableType = (type) =>
    type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint';

const isPlainObject = (value) => {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};

const cleanText = (value, maxLength, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, maxLength);
};

const toQuantity = (value) => {
    const number = Math.floor(Number(value));
    if (!Number.isFinite(number) || number < 1) return 1;
    return Math.min(number, MAX_QUANTITY);
};

export class InventoryManager {
    constructor() {
        this.items = [];
        this._itemMap = new Map();

        this.maxSlots = 12;
        this.isOpen = false;

        // Globalny stan wyboru przedmiotu. UI moze byc zniszczone przy zmianie sceny,
        // ale wybrany item zostaje dostepny dla hotspotow.
        this.selectedItemId = null;

        this._initialized = false;
        this._destroyed = false;

        this.handleAddInventoryItem = (item) => this.addItem(item);
        this.handleRemoveInventoryItem = (itemId) => this.removeItem(itemId);
        this.handleToggleInventory = () => this.toggleInventory();
        this.handleClearInventory = () => this.clearAll();
        this.handleSelectInventoryItem = (itemId) => this.selectItem(itemId);
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
            console.warn(
                '[InventoryManager] initialize() called after destroy(). ' +
                'Create a new InventoryManager instance instead.'
            );
            return;
        }

        for (const [event, handler] of this._busBindings()) {
            EventBus.on(event, handler, this);
        }

        this._initialized = true;
    }

    /**
     * Zasady:
     * - ID itemu jest unikalne.
     * - Ten sam stackable item zwieksza quantity i nie zajmuje nowego slotu.
     * - Ten sam ID dla non-stackable itemu jest odrzucany.
     */
    addItem(item) {
        if (this._destroyed) {
            console.warn('[InventoryManager] Cannot add item after destroy().');
            return false;
        }

        if (!item?.id || !item?.name) {
            console.warn('[InventoryManager] Invalid item: missing id or name.', item);
            return false;
        }

        const itemId = cleanText(String(item.id), MAX_ID_LENGTH);
        const quantityToAdd = toQuantity(item.quantity);
        const existingItem = this._itemMap.get(itemId) ?? null;

        if (existingItem) {
            const canStack = existingItem.stackable === true && item.stackable === true;

            if (!canStack) {
                console.warn(
                    `[InventoryManager] Duplicate item id rejected: "${itemId}".`,
                    { existingItem, attemptedItem: item }
                );
                EventBus.emit('inventoryDuplicateItem', { existingItem, attemptedItem: item });
                return false;
            }

            const before = existingItem.quantity;
            existingItem.quantity = Math.min(MAX_QUANTITY, before + quantityToAdd);

            EventBus.emit('inventoryUpdated');
            EventBus.emit('itemQuantityChanged', {
                item: existingItem,
                quantity: existingItem.quantity,
                addedQuantity: existingItem.quantity - before
            });

            return true;
        }

        if (this.items.length >= this.maxSlots) {
            console.warn('[InventoryManager] Inventory full.');
            EventBus.emit('inventoryFull', {
                attemptedItem: item,
                capacity: this.getCapacity()
            });
            return false;
        }

        const newItem = this.normalizeItem({ ...item, id: itemId, quantity: quantityToAdd });

        if (!newItem) {
            console.warn('[InventoryManager] Could not normalize item.', item);
            return false;
        }

        this.items.push(newItem);
        this._itemMap.set(newItem.id, newItem);

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemAdded', newItem);

        return true;
    }

    /** Usuwa caly przedmiot niezaleznie od quantity. Czysci zaznaczenie, jesli dotyczylo tego itemu. */
    removeItem(itemId) {
        if (this._destroyed || !itemId) return false;

        const normalizedItemId = String(itemId);
        const removedItem = this._itemMap.get(normalizedItemId);

        if (!removedItem) return false;

        const itemIndex = this.items.indexOf(removedItem);

        if (itemIndex === -1) {
            console.warn(
                `[InventoryManager] Item "${normalizedItemId}" exists in Map but not in items array.`
            );
        } else {
            this.items.splice(itemIndex, 1);
        }

        this._itemMap.delete(normalizedItemId);

        if (this.selectedItemId === normalizedItemId) {
            this._setSelectedItemId(null, removedItem);
        }

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemRemoved', removedItem);

        return itemIndex !== -1;
    }

    removeQuantity(itemId, quantity = 1) {
        if (this._destroyed || !itemId) return false;

        const normalizedItemId = String(itemId);
        const item = this._itemMap.get(normalizedItemId);

        if (!item) return false;

        const quantityToRemove = toQuantity(quantity);

        if (!item.stackable || item.quantity <= quantityToRemove) {
            return this.removeItem(normalizedItemId);
        }

        item.quantity -= quantityToRemove;

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemQuantityChanged', {
            item,
            quantity: item.quantity,
            removedQuantity: quantityToRemove
        });

        return true;
    }

    getItem(itemId) {
        return itemId ? this._itemMap.get(String(itemId)) ?? null : null;
    }

    hasItem(itemId) {
        return itemId ? this._itemMap.has(String(itemId)) : false;
    }

    getItemsByType(type) {
        return this.items.filter((item) => item.type === type);
    }

    /** Referencja wylacznie do renderowania UI. Nie modyfikuj poza InventoryManagerem. */
    getAllItems() {
        return this.items;
    }

    getAllItemsCopy() {
        return this.items.map((item) => this.serializeItem(item));
    }

    getItemCount() {
        return this.items.length;
    }

    getCapacity() {
        return { current: this.items.length, max: this.maxSlots };
    }

    selectItem(itemId) {
        if (this._destroyed || !itemId) return false;

        const normalizedItemId = String(itemId);

        if (!this._itemMap.has(normalizedItemId)) {
            console.warn(`[InventoryManager] Cannot select missing item: "${normalizedItemId}".`);
            return false;
        }

        if (this.selectedItemId === normalizedItemId) return true;

        this._setSelectedItemId(normalizedItemId);

        return true;
    }

    clearSelection() {
        if (this._destroyed || !this.selectedItemId) return false;

        this._setSelectedItemId(null);

        return true;
    }

    getSelectedItem() {
        if (!this.selectedItemId) return null;

        const selectedItem = this._itemMap.get(this.selectedItemId);

        if (!selectedItem) {
            this.selectedItemId = null;
            return null;
        }

        return selectedItem;
    }

    /**
     * Zmienia zaznaczenie i emituje eventy.
     * previousItem mozna podac jawnie, gdy item zostal juz usuniety z mapy.
     */
    _setSelectedItemId(itemId, previousItem = undefined) {
        if (this.selectedItemId === itemId) return;

        const previous = previousItem !== undefined
            ? previousItem
            : (this.selectedItemId ? this._itemMap.get(this.selectedItemId) ?? null : null);

        this.selectedItemId = itemId;

        const selectedItem = itemId ? this._itemMap.get(itemId) ?? null : null;

        EventBus.emit('inventorySelectionChanged', selectedItem);

        if (selectedItem) {
            EventBus.emit('inventoryItemSelected', selectedItem);
            return;
        }

        EventBus.emit('inventoryItemDeselected', previous);
    }

    clearAll() {
        if (this._destroyed) return;

        const previousSelectedItem = this.getSelectedItem();

        this.items = [];
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

        if (!state || typeof state !== 'object') {
            console.warn('[InventoryManager] importState: invalid state.');
            return false;
        }

        if (!Array.isArray(state.items)) {
            console.warn('[InventoryManager] importState: items must be an array.');
            return false;
        }

        if (state.version !== undefined && state.version !== SAVE_VERSION) {
            console.warn(
                `[InventoryManager] importState: unknown save version "${state.version}". ` +
                `Expected ${SAVE_VERSION}. Trying to import anyway.`
            );
        }

        const validItems = [];
        const newItemMap = new Map();
        let skipped = 0;

        for (const rawItem of state.items) {
            const normalizedItem = this.normalizeItem(rawItem);

            if (!normalizedItem) {
                console.warn('[InventoryManager] Skipping invalid item in save:', rawItem);
                skipped += 1;
                continue;
            }

            const existingItem = newItemMap.get(normalizedItem.id);

            if (existingItem) {
                if (existingItem.stackable && normalizedItem.stackable) {
                    existingItem.quantity = Math.min(
                        MAX_QUANTITY,
                        existingItem.quantity + normalizedItem.quantity
                    );
                } else {
                    console.warn(
                        `[InventoryManager] Skipping duplicate item id in save: "${normalizedItem.id}".`
                    );
                    skipped += 1;
                }
                continue;
            }

            if (validItems.length >= this.maxSlots) {
                console.warn(
                    `[InventoryManager] Save has more items than ${this.maxSlots} slots. Extra items dropped.`
                );
                break;
            }

            validItems.push(normalizedItem);
            newItemMap.set(normalizedItem.id, normalizedItem);
        }

        if (skipped > 0 && validItems.length === 0) {
            console.warn('[InventoryManager] importState: every item in the save was invalid.');
        }

        const previousSelectedItem = this.getSelectedItem();

        this.items = validItems;
        this._itemMap = newItemMap;
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

    exportState() {
        return {
            version: SAVE_VERSION,
            items: this.getAllItemsCopy()
        };
    }

    /** Runtimeowy, ale save-safe model itemu. Zwraca null, gdy brakuje id lub nazwy. */
    normalizeItem(rawItem) {
        if (!rawItem || typeof rawItem !== 'object') return null;

        const id = cleanText(String(rawItem.id ?? ''), MAX_ID_LENGTH);
        const name = cleanText(String(rawItem.name ?? ''), MAX_NAME_LENGTH);

        if (!id || !name) return null;

        return {
            id,
            name,
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
            id: String(item?.id ?? ''),
            name: String(item?.name ?? ''),
            icon: '📦',
            description: '',
            type: 'misc',
            quantity: 1,
            stackable: false,
            metadata: {},
            addedAt: Date.now()
        };
    }

    cloneSafeMetadata(metadata) {
        if (metadata === null || metadata === undefined) return {};

        return this.sanitizeSaveData(metadata);
    }

    /**
     * Zamienia metadata na czysty JSON: tylko stringi, skonczone liczby, boolean,
     * null, tablice i zwykle obiekty. Reszta (Map, Set, klasy, obiekty Phaser) -> null.
     */
    sanitizeSaveData(value, seen = new WeakSet(), depth = 0) {
        if (value === null) return null;

        const valueType = typeof value;

        if (valueType === 'string' || valueType === 'boolean') return value;

        if (valueType === 'number') return Number.isFinite(value) ? value : null;

        if (isSkippableType(valueType)) return null;

        if (value instanceof Date) {
            const time = value.getTime();
            return Number.isNaN(time) ? null : value.toISOString();
        }

        if (valueType !== 'object') return null;

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

        if (Array.isArray(value)) {
            result = value.map((entry) => this.sanitizeSaveData(entry, seen, depth + 1));
        } else if (isPlainObject(value)) {
            result = {};

            for (const [key, nestedValue] of Object.entries(value)) {
                if (FORBIDDEN_KEYS.has(key) || isSkippableType(typeof nestedValue)) continue;

                result[key] = this.sanitizeSaveData(nestedValue, seen, depth + 1);
            }
        }

        seen.delete(value);

        return result;
    }

    /** Wywoluj tylko przy trwalym konczeniu gry albo pelnym resecie. */
    destroy() {
        if (this._destroyed) return;

        if (this._initialized) {
            for (const [event, handler] of this._busBindings()) {
                EventBus.off(event, handler, this);
            }
        }

        this._initialized = false;
        this._destroyed = true;

        this.items = [];
        this._itemMap.clear();
        this.selectedItemId = null;
        this.isOpen = false;
    }
}

export const inventoryManager = new InventoryManager();