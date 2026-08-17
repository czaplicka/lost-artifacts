import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../MonologueManager.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { inventoryManager } from '../InventoryManager.js';

export class BaseScene extends Phaser.Scene {
      constructor(config) {
        super(config);
        this.inventoryUI = null;
        this.hasMenu = false; // Ustaw na true w child scenach, które mają menu
    }

    create() {
        EventBus.bindScene(this);
        if (this.hasMenu) {
            this.initializeInventory();
        }
        const monologues = this.cache.json.get('monologues') ?? {};

    this.monologue = new MonologueManager(this, {
      dialogues: monologues,
    });
  }

    /**
     * Inicjalizuj UI inventory dla tej sceny
     */
    initializeInventory() {
        if (!this.inventoryUI) {
            this.inventoryUI = new InventoryUI(this);
            this.inventoryUI.initialize();
        }
    }

    /**
     * Dodaj przedmiot do inventory
     */
    addInventoryItem(item) {
        return inventoryManager.addItem(item);
    }

    /**
     * Usuń przedmiot z inventory
     */
    removeInventoryItem(itemId) {
        return inventoryManager.removeItem(itemId);
    }

    /**
     * Pobierz przedmiot
     */
    getInventoryItem(itemId) {
        return inventoryManager.getItem(itemId);
    }

    /**
     * Sprawdź czy gracz ma przedmiot
     */
    hasInventoryItem(itemId) {
        return inventoryManager.hasItem(itemId);
    }

    /**
     * Otwórz inventory
     */
    openInventory() {
        inventoryManager.open();
    }

    /**
     * Zamknij inventory
     */
    closeInventory() {
        inventoryManager.close();
    }

    /**
     * Pobierz wszystkie przedmioty
     */
    getAllInventoryItems() {
        return inventoryManager.getAllItems();
    }

    shutdown() {
        if (this.inventoryUI) {
            this.inventoryUI.destroy();
            this.inventoryUI = null;
        }
    }
}