import { EventBus } from '../EventBus.js';


export class InventoryManager {
    constructor() {
        this.items = [];
        this._itemMap = new Map();

        this.maxSlots = 12;
        this.isOpen = false;

        // Globalny stan wyboru przedmiotu.
        // UI może zostać zniszczone przy zmianie sceny,
        // ale wybrany item pozostaje dostępny dla hotspotów.
        this.selectedItemId = null;

        this._initialized = false;
        this._destroyed = false;

        // Stabilne referencje callbacków dla EventBus.off().
        this.handleAddInventoryItem = (item) => this.addItem(item);
        this.handleRemoveInventoryItem = (itemId) => this.removeItem(itemId);
        this.handleToggleInventory = () => this.toggleInventory();
        this.handleClearInventory = () => this.clearAll();
        this.handleSelectInventoryItem = (itemId) => this.selectItem(itemId);
        this.handleClearInventorySelection = () => this.clearSelection();

        this.initialize();
    }


    /**
     * Rejestruje listenery globalnego EventBus tylko raz.
     * Bezpieczne przy przypadkowym ponownym wywołaniu initialize().
     */
    initialize() {
        if (this._initialized) {
            return;
        }

        if (this._destroyed) {
            console.warn(
                '[InventoryManager] initialize() called after destroy(). ' +
                'Create a new InventoryManager instance instead.'
            );
            return;
        }

        EventBus.on(
            'addInventoryItem',
            this.handleAddInventoryItem,
            this
        );

        EventBus.on(
            'removeInventoryItem',
            this.handleRemoveInventoryItem,
            this
        );

        EventBus.on(
            'toggleInventory',
            this.handleToggleInventory,
            this
        );

        EventBus.on(
            'clearInventory',
            this.handleClearInventory,
            this
        );

        EventBus.on(
            'selectInventoryItem',
            this.handleSelectInventoryItem,
            this
        );

        EventBus.on(
            'clearInventorySelection',
            this.handleClearInventorySelection,
            this
        );

        this._initialized = true;
    }


    /**
     * Dodaje przedmiot do ekwipunku.
     *
     * Zasady:
     * - ID itemu jest unikalne.
     * - Ten sam stackable item zwiększa quantity i nie zajmuje nowego slotu.
     * - Ten sam ID dla non-stackable itemu jest odrzucany.
     * - Manager nie pozwala stworzyć duplikatu ID w items i _itemMap.
     */
    addItem(item) {
        if (this._destroyed) {
            console.warn('[InventoryManager] Cannot add item after destroy().');
            return false;
        }

        if (!item?.id || !item?.name) {
            console.warn(
                '[InventoryManager] Invalid item: missing id or name.',
                item
            );
            return false;
        }

        const itemId = String(item.id);
        const quantityToAdd = Math.max(1, Number(item.quantity) || 1);

        // Zawsze szukamy istniejącego itemu, niezależnie od tego,
        // czy nowy item deklaruje stackable czy nie.
        const existingItem = this._itemMap.get(itemId) ?? null;

        if (existingItem) {
            const canStack =
                existingItem.stackable === true
                && item.stackable === true;

            if (!canStack) {
                console.warn(
                    `[InventoryManager] Duplicate item id rejected: "${itemId}".`,
                    {
                        existingItem,
                        attemptedItem: item
                    }
                );

                EventBus.emit('inventoryDuplicateItem', {
                    existingItem,
                    attemptedItem: item
                });

                return false;
            }

            existingItem.quantity = Math.max(
                1,
                Number(existingItem.quantity) || 1
            ) + quantityToAdd;

            // Normalnie nie jest potrzebne, ponieważ Map i items
            // trzymają tę samą referencję do obiektu. To jest jednak
            // zabezpieczenie, gdyby stan został kiedyś uszkodzony
            // przez kod poza InventoryManagerem.
            const itemIndex = this.items.findIndex(
                (inventoryItem) => inventoryItem.id === itemId
            );

            if (itemIndex === -1) {
                console.warn(
                    `[InventoryManager] Repairing missing array item: "${itemId}".`
                );

                this.items.push(existingItem);
            } else if (this.items[itemIndex] !== existingItem) {
                console.warn(
                    `[InventoryManager] Repairing mismatched item reference: "${itemId}".`
                );

                this.items[itemIndex] = existingItem;
            }

            EventBus.emit('inventoryUpdated');

            EventBus.emit('itemQuantityChanged', {
                item: existingItem,
                quantity: existingItem.quantity,
                addedQuantity: quantityToAdd
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

        const newItem = this.normalizeItem({
            ...item,
            id: itemId,
            quantity: quantityToAdd
        });

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


    /**
     * Usuwa cały przedmiot niezależnie od jego quantity.
     *
     * Jeśli usuwany przedmiot był zaznaczony, zaznaczenie również znika.
     */
    removeItem(itemId) {
        const normalizedItemId = String(itemId);

        if (
            this._destroyed
            || !itemId
            || !this._itemMap.has(normalizedItemId)
        ) {
            return false;
        }

        const itemIndex = this.items.findIndex(
            (item) => item.id === normalizedItemId
        );

        if (itemIndex === -1) {
            console.warn(
                `[InventoryManager] Item "${normalizedItemId}" exists in Map but not in items array.`
            );

            this._itemMap.delete(normalizedItemId);

            if (this.selectedItemId === normalizedItemId) {
                this._setSelectedItemId(null);
            }

            return false;
        }

        const removedItem = this.items.splice(itemIndex, 1)[0];

        this._itemMap.delete(normalizedItemId);

        if (this.selectedItemId === normalizedItemId) {
            this._setSelectedItemId(null);
        }

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemRemoved', removedItem);

        return true;
    }


    /**
     * Usuwa określoną liczbę sztuk itemu stackable.
     *
     * Przykład:
     * inventoryManager.removeQuantity('uv_battery', 1);
     */
    removeQuantity(itemId, quantity = 1) {
        if (this._destroyed || !itemId) {
            return false;
        }

        const normalizedItemId = String(itemId);
        const item = this._itemMap.get(normalizedItemId);

        if (!item) {
            return false;
        }

        const quantityToRemove = Math.max(1, Number(quantity) || 1);

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
        if (!itemId) {
            return null;
        }

        return this._itemMap.get(String(itemId)) ?? null;
    }


    hasItem(itemId) {
        if (!itemId) {
            return false;
        }

        return this._itemMap.has(String(itemId));
    }


    getItemsByType(type) {
        return this.items.filter((item) => item.type === type);
    }


    /**
     * Zwraca referencję wyłącznie do renderowania UI.
     * Nie modyfikuj tej tablicy ani elementów poza InventoryManagerem.
     */
    getAllItems() {
        return this.items;
    }


    /**
     * Zwraca bezpieczną kopię danych itemów.
     */
    getAllItemsCopy() {
        return this.items.map((item) => this.serializeItem(item));
    }


    getItemCount() {
        return this.items.length;
    }


    getCapacity() {
        return {
            current: this.items.length,
            max: this.maxSlots
        };
    }


    /**
     * Zaznacza przedmiot do użycia w hotspotach point-and-click.
     */
    selectItem(itemId) {
        if (this._destroyed || !itemId) {
            return false;
        }

        const normalizedItemId = String(itemId);
        const item = this._itemMap.get(normalizedItemId);

        if (!item) {
            console.warn(
                `[InventoryManager] Cannot select missing item: "${normalizedItemId}".`
            );
            return false;
        }

        if (this.selectedItemId === normalizedItemId) {
            return true;
        }

        this._setSelectedItemId(normalizedItemId);

        return true;
    }


    /**
     * Czyści zaznaczenie aktualnego itemu.
     */
    clearSelection() {
        if (this._destroyed || !this.selectedItemId) {
            return false;
        }

        this._setSelectedItemId(null);

        return true;
    }


    /**
     * Zwraca aktualnie zaznaczony przedmiot albo null.
     */
    getSelectedItem() {
        if (!this.selectedItemId) {
            return null;
        }

        const selectedItem = this._itemMap.get(this.selectedItemId);

        if (!selectedItem) {
            this.selectedItemId = null;
            return null;
        }

        return selectedItem;
    }


    /**
     * Wewnętrzna metoda jednocześnie aktualizująca stan i emitująca eventy.
     */
    _setSelectedItemId(itemId) {
        const previousItem = this.getSelectedItem();

        if (this.selectedItemId === itemId) {
            return;
        }

        this.selectedItemId = itemId;

        const selectedItem = itemId
            ? this._itemMap.get(itemId) ?? null
            : null;

        EventBus.emit('inventorySelectionChanged', selectedItem);

        if (selectedItem) {
            EventBus.emit('inventoryItemSelected', selectedItem);
            return;
        }

        EventBus.emit('inventoryItemDeselected', previousItem);
    }


    /**
     * Czyści zawartość inventory i aktywne zaznaczenie.
     */
    clearAll() {
        if (this._destroyed) {
            return;
        }

        const previousSelectedItem = this.getSelectedItem();

        this.items = [];
        this._itemMap.clear();
        this.selectedItemId = null;

        EventBus.emit('inventoryUpdated');

        if (previousSelectedItem) {
            EventBus.emit('inventorySelectionChanged', null);
            EventBus.emit(
                'inventoryItemDeselected',
                previousSelectedItem
            );
        }
    }


    toggleInventory() {
        if (this._destroyed) {
            return;
        }

        this.isOpen = !this.isOpen;

        EventBus.emit('inventoryToggled', this.isOpen);
    }


    open() {
        if (this._destroyed || this.isOpen) {
            return;
        }

        this.isOpen = true;

        EventBus.emit('inventoryToggled', true);
    }


    close() {
        if (this._destroyed || !this.isOpen) {
            return;
        }

        this.isOpen = false;

        EventBus.emit('inventoryToggled', false);
    }


    /**
     * Ładuje stan ekwipunku z sejwa.
     */
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
            console.warn(
                '[InventoryManager] importState: items must be an array.'
            );
            return false;
        }

        const validItems = [];
        const newItemMap = new Map();

        for (const rawItem of state.items) {
            if (validItems.length >= this.maxSlots) {
                break;
            }

            const normalizedItem = this.normalizeItem(rawItem);

            if (!normalizedItem) {
                console.warn(
                    '[InventoryManager] Skipping invalid item in save:',
                    rawItem
                );
                continue;
            }

            const existingItem = newItemMap.get(normalizedItem.id);

            if (existingItem) {
                if (existingItem.stackable && normalizedItem.stackable) {
                    existingItem.quantity += normalizedItem.quantity;
                    continue;
                }

                console.warn(
                    `[InventoryManager] Skipping duplicate item id in save: "${normalizedItem.id}".`
                );
                continue;
            }

            validItems.push(normalizedItem);
            newItemMap.set(normalizedItem.id, normalizedItem);
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
            EventBus.emit(
                'inventoryItemDeselected',
                previousSelectedItem
            );
        }

        return true;
    }


    /**
     * Stan do save systemu.
     */
    exportState() {
        return {
            version: 1,
            items: this.getAllItemsCopy()
        };
    }


    /**
     * Buduje runtimeowy, ale save-safe model itemu.
     */
    normalizeItem(rawItem) {
        if (!rawItem?.id || !rawItem?.name) {
            return null;
        }

        return {
            id: String(rawItem.id),
            name: String(rawItem.name),
            icon: typeof rawItem.icon === 'string' ? rawItem.icon : '📦',
            description: typeof rawItem.description === 'string'
                ? rawItem.description
                : '',
            type: typeof rawItem.type === 'string'
                ? rawItem.type
                : 'misc',
            quantity: Math.max(1, Number(rawItem.quantity) || 1),
            stackable: Boolean(rawItem.stackable),
            metadata: this.cloneSafeMetadata(rawItem.metadata),
            addedAt: Number(rawItem.addedAt) || Date.now()
        };
    }


    /**
     * Tworzy itemowy snapshot do save systemu.
     */
    serializeItem(item) {
        return {
            id: String(item.id),
            name: String(item.name),
            icon: typeof item.icon === 'string' ? item.icon : '📦',
            description: typeof item.description === 'string'
                ? item.description
                : '',
            type: typeof item.type === 'string'
                ? item.type
                : 'misc',
            quantity: Math.max(1, Number(item.quantity) || 1),
            stackable: Boolean(item.stackable),
            metadata: this.cloneSafeMetadata(item.metadata),
            addedAt: Number(item.addedAt) || Date.now()
        };
    }


    cloneSafeMetadata(metadata) {
        if (metadata === null || metadata === undefined) {
            return {};
        }

        return this.sanitizeSaveData(metadata);
    }


    /**
     * Normalizuje metadata do plain object / array / primitive.
     */
    sanitizeSaveData(value, seen = new WeakSet()) {
        if (value === null) {
            return null;
        }

        const valueType = typeof value;

        if (
            valueType === 'string'
            || valueType === 'number'
            || valueType === 'boolean'
        ) {
            return value;
        }

        if (
            valueType === 'undefined'
            || valueType === 'function'
            || valueType === 'symbol'
            || valueType === 'bigint'
        ) {
            return null;
        }

        if (value instanceof Date) {
            const time = value.getTime();
            return Number.isNaN(time) ? null : value.toISOString();
        }

        if (Array.isArray(value)) {
            if (seen.has(value)) {
                console.warn(
                    '[InventoryManager] Circular array reference removed from item metadata.'
                );
                return [];
            }

            seen.add(value);

            const sanitizedArray = value.map((entry) => {
                return this.sanitizeSaveData(entry, seen);
            });

            seen.delete(value);

            return sanitizedArray;
        }

        if (valueType === 'object') {
            if (seen.has(value)) {
                console.warn(
                    '[InventoryManager] Circular object reference removed from item metadata.'
                );
                return null;
            }

            seen.add(value);

            const sanitizedObject = {};

            for (const [key, nestedValue] of Object.entries(value)) {
                const nestedType = typeof nestedValue;

                if (
                    nestedType === 'undefined'
                    || nestedType === 'function'
                    || nestedType === 'symbol'
                    || nestedType === 'bigint'
                ) {
                    continue;
                }

                sanitizedObject[key] = this.sanitizeSaveData(
                    nestedValue,
                    seen
                );
            }

            seen.delete(value);

            return sanitizedObject;
        }

        return null;
    }


    /**
     * Wywołuj tylko przy trwałym kończeniu gry albo pełnym resecie.
     */
    destroy() {
        if (this._destroyed) {
            return;
        }

        if (this._initialized) {
            EventBus.off(
                'addInventoryItem',
                this.handleAddInventoryItem,
                this
            );

            EventBus.off(
                'removeInventoryItem',
                this.handleRemoveInventoryItem,
                this
            );

            EventBus.off(
                'toggleInventory',
                this.handleToggleInventory,
                this
            );

            EventBus.off(
                'clearInventory',
                this.handleClearInventory,
                this
            );

            EventBus.off(
                'selectInventoryItem',
                this.handleSelectInventoryItem,
                this
            );

            EventBus.off(
                'clearInventorySelection',
                this.handleClearInventorySelection,
                this
            );
        }

        this._initialized = false;
        this._destroyed = true;

        this.items = [];
        this._itemMap.clear();
        this.selectedItemId = null;
        this.isOpen = false;

        this.handleAddInventoryItem = null;
        this.handleRemoveInventoryItem = null;
        this.handleToggleInventory = null;
        this.handleClearInventory = null;
        this.handleSelectInventoryItem = null;
        this.handleClearInventorySelection = null;
    }
}


export const inventoryManager = new InventoryManager();