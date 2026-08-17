import { EventBus } from './EventBus.js';

export class InventoryManager {
constructor() {
  this.items = [];
  this.maxSlots = 12;
  this.isOpen = false;
  this.isInitialized = false;

  this.handleAddInventoryItem = (item) => this.addItem(item);
  this.handleRemoveInventoryItem = (itemId) => this.removeItem(itemId);
  this.handleToggleInventory = () => this.toggleInventory();
  this.handleClearInventory = () => this.clearAll();

  EventBus.on('addInventoryItem', this.handleAddInventoryItem, this);
  EventBus.on('removeInventoryItem', this.handleRemoveInventoryItem, this);
  EventBus.on('toggleInventory', this.handleToggleInventory, this);
  EventBus.on('clearInventory', this.handleClearInventory, this);
}

    /**
     * Dodaj przedmiot do inventory
     * @param {Object} item - { id, name, icon, description, type, metadata }
     */
    addItem(item) {
        // Weryfikacja wymaganych pól
        if (!item.id || !item.name) {
            console.warn('Invalid item: missing id or name', item);
            return false;
        }

        // Sprawdzenie, czy przedmiot już istnieje (dla stackowalnych)
        if (item.stackable) {
            const existing = this.items.find(i => i.id === item.id);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
                EventBus.emit('inventoryUpdated', this.items);
                return true;
            }
        }

        // Sprawdzenie pojemności
        if (this.items.length >= this.maxSlots) {
            console.warn('Inventory full!');
            EventBus.emit('inventoryFull');
            return false;
        }

        // Dodaj przedmiot z domyślnymi wartościami
        const newItem = {
            id: item.id,
            name: item.name,
            icon: item.icon || '📦',
            description: item.description || '',
            type: item.type || 'misc', // misc, clue, evidence, key, document
            quantity: item.quantity || 1,
            stackable: item.stackable || false,
            metadata: item.metadata || {},
            addedAt: Date.now()
        };

        this.items.push(newItem);
        EventBus.emit('inventoryUpdated', this.items);
        EventBus.emit('itemAdded', newItem);

        return true;
    }

    /**
     * Usuń przedmiot
     */
    removeItem(itemId) {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            const removed = this.items.splice(index, 1)[0];
            EventBus.emit('inventoryUpdated', this.items);
            EventBus.emit('itemRemoved', removed);
            return true;
        }
        return false;
    }

    /**
     * Pobierz przedmiot
     */
    getItem(itemId) {
        return this.items.find(i => i.id === itemId);
    }

    /**
     * Pobierz wszystkie przedmioty danego typu
     */
    getItemsByType(type) {
        return this.items.filter(i => i.type === type);
    }

    /**
     * Czyszczenie całego inventory
     */
    clearAll() {
        this.items = [];
        EventBus.emit('inventoryUpdated', this.items);
    }

    /**
     * Pobierz wszystkie przedmioty
     */
    getAllItems() {
        return [...this.items];
    }

    /**
     * Sprawdź, czy gracz ma przedmiot
     */
    hasItem(itemId) {
        return this.items.some(i => i.id === itemId);
    }

    /**
     * Pobierz liczbę przedmiotów
     */
    getItemCount() {
        return this.items.length;
    }

    /**
     * Pobierz pojemność
     */
    getCapacity() {
        return { current: this.items.length, max: this.maxSlots };
    }

    /**
     * Przełącz widoczność
     */
    toggleInventory() {
        this.isOpen = !this.isOpen;
        EventBus.emit('inventoryToggled', this.isOpen);
    }

    /**
     * Otwórz inventory
     */
    open() {
        this.isOpen = true;
        EventBus.emit('inventoryToggled', this.isOpen);
    }

    /**
     * Zamknij inventory
     */
    close() {
        this.isOpen = false;
        EventBus.emit('inventoryToggled', this.isOpen);
    }

    /**
     * Eksportuj stan (do zapisu)
     */
    exportState() {
        return {
            items: [...this.items],
            isOpen: this.isOpen
        };
    }
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
  this.isOpen = false;
}
    /**
     * Importuj stan (z pliku zapisu)
     */
    importState(state) {
        if (state.items) {
            this.items = [...state.items];
        }
        EventBus.emit('inventoryUpdated', this.items);
    }
}

// Singleton
export const inventoryManager = new InventoryManager();