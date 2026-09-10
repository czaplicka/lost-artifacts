import { EventBus } from './EventBus.js';

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
     * W przypadku itemu stackable:
     * - zwiększa quantity,
     * - nie zużywa nowego slotu,
     * - nie emituje itemAdded, bo nie powstaje nowy obiekt.
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

        const quantityToAdd = Math.max(1, Number(item.quantity) || 1);

        if (item.stackable) {
            const existingItem = this._itemMap.get(item.id);

            if (existingItem) {
                existingItem.quantity += quantityToAdd;

                EventBus.emit('inventoryUpdated');
                EventBus.emit('itemQuantityChanged', {
                    item: existingItem,
                    quantity: existingItem.quantity
                });

                return true;
            }
        }

        if (this.items.length >= this.maxSlots) {
            console.warn('[InventoryManager] Inventory full.');

            EventBus.emit('inventoryFull', {
                attemptedItem: item,
                capacity: this.getCapacity()
            });

            return false;
        }

        const newItem = {
            id: String(item.id),
            name: String(item.name),
            icon: item.icon || '📦',
            description: item.description || '',
            type: item.type || 'misc',
            quantity: quantityToAdd,
            stackable: Boolean(item.stackable),
            metadata: structuredClone(item.metadata || {}),
            addedAt: Number(item.addedAt) || Date.now()
        };

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
        if (this._destroyed || !itemId || !this._itemMap.has(itemId)) {
            return false;
        }

        const itemIndex = this.items.findIndex((item) => item.id === itemId);

        if (itemIndex === -1) {
            console.warn(
                `[InventoryManager] Item "${itemId}" exists in Map but not in items array.`
            );

            this._itemMap.delete(itemId);

            if (this.selectedItemId === itemId) {
                this._setSelectedItemId(null);
            }

            return false;
        }

        const removedItem = this.items.splice(itemIndex, 1)[0];

        this._itemMap.delete(itemId);

        if (this.selectedItemId === itemId) {
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
     *
     * Jeżeli quantity spadnie do zera, usuwa cały item.
     */
    removeQuantity(itemId, quantity = 1) {
        if (this._destroyed) {
            return false;
        }

        const item = this._itemMap.get(itemId);

        if (!item) {
            return false;
        }

        const quantityToRemove = Math.max(1, Number(quantity) || 1);

        if (!item.stackable || item.quantity <= quantityToRemove) {
            return this.removeItem(itemId);
        }

        item.quantity -= quantityToRemove;

        EventBus.emit('inventoryUpdated');
        EventBus.emit('itemQuantityChanged', {
            item,
            quantity: item.quantity
        });

        return true;
    }

    getItem(itemId) {
        return this._itemMap.get(itemId) ?? null;
    }

    hasItem(itemId) {
        return this._itemMap.has(itemId);
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
     * Deep copy do save systemu lub eksportu danych.
     */
    getAllItemsCopy() {
        return structuredClone(this.items);
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
     *
     * Nie wybieraj itemu bezpośrednio przez this.selectedItemId = ...
     * Zawsze używaj tej metody, aby UI dostało event odświeżenia.
     */
    selectItem(itemId) {
        if (this._destroyed || !itemId) {
            return false;
        }

        const item = this._itemMap.get(itemId);

        if (!item) {
            console.warn(
                `[InventoryManager] Cannot select missing item: "${itemId}".`
            );
            return false;
        }

        if (this.selectedItemId === itemId) {
            return true;
        }

        this._setSelectedItemId(itemId);

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

        // Ochrona przed niespójnym stanem przy nietypowym imporcie sejwa.
        if (!selectedItem) {
            this.selectedItemId = null;
            return null;
        }

        return selectedItem;
    }

    /**
     * Wewnętrzna metoda jednocześnie aktualizująca stan i emitująca eventy.
     *
     * null oznacza odznaczenie.
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

        const hadSelection = Boolean(this.selectedItemId);

        this.items = [];
        this._itemMap.clear();
        this.selectedItemId = null;

        EventBus.emit('inventoryUpdated');

        if (hadSelection) {
            EventBus.emit('inventorySelectionChanged', null);
            EventBus.emit('inventoryItemDeselected', null);
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
     *
     * Celowo nie odtwarza:
     * - otwartego UI,
     * - wybranego przedmiotu.
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

            if (!rawItem?.id || !rawItem?.name) {
                console.warn(
                    '[InventoryManager] Skipping invalid item in save:',
                    rawItem
                );
                continue;
            }

            const itemId = String(rawItem.id);

            if (newItemMap.has(itemId)) {
                console.warn(
                    `[InventoryManager] Skipping duplicate item id in save: "${itemId}".`
                );
                continue;
            }

            const normalizedItem = {
                id: itemId,
                name: String(rawItem.name),
                icon: rawItem.icon || '📦',
                description: rawItem.description || '',
                type: rawItem.type || 'misc',
                quantity: Math.max(1, Number(rawItem.quantity) || 1),
                stackable: Boolean(rawItem.stackable),
                metadata: structuredClone(rawItem.metadata || {}),
                addedAt: Number(rawItem.addedAt) || Date.now()
            };

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
            EventBus.emit('inventoryItemDeselected', previousSelectedItem);
        }

        return true;
    }

    /**
     * Stan do save systemu.
     *
     * Nie zapisujemy selection i otwartego panela:
     * po loadzie UI ma zacząć w neutralnym stanie.
     */
    exportState() {
        return {
            items: this.getAllItemsCopy(),
            isOpen: false,
            selectedItemId: null
        };
    }

    /**
     * Wywołuj tylko przy trwałym kończeniu gry,
     * zniszczeniu Phaser.Game albo pełnym resecie aplikacji.
     *
     * Nigdy nie wywołuj destroy() przy zmianie pojedynczej sceny.
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