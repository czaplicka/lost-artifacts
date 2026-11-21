import '../ui/inventory/InventoryGraphics.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { inventoryManager } from './InventoryManager.js';
import { requestAutosave } from '../gameStatePersistence.js';

const LIMIT = 12;
const VERSION = 1;
const MAX_QUANTITY = 999;
const UNSET = Symbol('unread-pi-inventory');
const EMPTY = Object.freeze({ version: VERSION, items: Object.freeze([]) });
const normalizeId = value => String(value ?? '').trim().slice(0, 64);
const copy = value => typeof structuredClone === 'function'
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const message = error => error?.message || String(error);
function freezeData(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const entry of Object.values(value)) freezeData(entry, seen);
    return Object.freeze(value);
}

export class PIInventoryManager {
    constructor({
        state = gameState,
        bus = EventBus,
        save = requestAutosave,
        normalize = item => inventoryManager.normalizeItem(item)
    } = {}) {
        this.state = state;
        this.bus = bus;
        this.save = save;
        this.normalize = normalize;
        this.selectedItemId = null;
        this.stateIdentity = null;
        this._raw = UNSET;
        this._itemsReference = UNSET;
        this._itemsLength = -1;
        this._rawVersion = UNSET;
        this._snapshot = EMPTY;
        this._index = new Map();
        this._readError = null;
        this._notificationError = null;
        this._lastLoggedRaw = UNSET;
        this._lastLoggedMessage = null;
    }

    syncContext() {
        const identity = this.state.state ?? this.state;
        if (this.stateIdentity !== identity) {
            this.stateIdentity = identity;
            this.selectedItemId = null;
            this.invalidate();
        }
    }

    // Call after intentional in-place edits performed outside this manager.
    // Prefer commit()/importState(), or replace state.piInventory as one value.
    invalidate() {
        this._raw = UNSET;
        this._itemsReference = UNSET;
        this._itemsLength = -1;
        this._rawVersion = UNSET;
    }

    _emit(event, ...args) {
        try { this.bus.emit(event, ...args); }
        catch (error) { console.error('[PIInventory] Event listener failed:', event, error); }
    }

    _validateItems(items) {
        if (!Array.isArray(items)) throw new Error('Inventory items must be an array.');
        const normalized = [], ids = new Set();
        for (const rawItem of items) {
            const clean = this.normalize(rawItem);
            if (!clean || typeof clean.id !== 'string' || typeof clean.name !== 'string' || !clean.name.trim()) {
                throw new Error('Invalid inventory item.');
            }
            const item = copy(clean);
            item.id = normalizeId(item.id);
            if (!item.id || ids.has(item.id)) throw new Error('Invalid or duplicate inventory item ID.');
            if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
                throw new Error('Invalid normalized inventory quantity.');
            }
            ids.add(item.id);
            normalized.push(item);
        }
        return normalized;
    }

    _setCache(raw, snapshot) {
        this._raw = raw;
        this._itemsReference = raw?.items;
        this._itemsLength = Array.isArray(raw?.items) ? raw.items.length : -1;
        this._rawVersion = raw?.version;
        this._snapshot = snapshot;
        this._index.clear();
        for (const item of snapshot.items) this._index.set(item.id, item);
    }

    _invalid(raw, error) {
        this._readError = error instanceof Error ? error : new Error(message(error));
        this._setCache(raw, EMPTY);
        this.selectedItemId = null;
        if (this._lastLoggedRaw !== raw || this._lastLoggedMessage !== message(error)) {
            this._lastLoggedRaw = raw;
            this._lastLoggedMessage = message(error);
            console.error('[PIInventory] Cannot read inventory. Empty UI view only; original data retained and mutations blocked.', error);
            this._emit('piInventory:error', { message: message(error), writesBlocked: true });
        }
        return EMPTY;
    }

    read() {
        let raw = UNSET;
        try {
            this.syncContext();
            raw = this.state.piInventory;
            const items = raw?.items;
            const length = Array.isArray(items) ? items.length : -1;
            if (raw === this._raw && items === this._itemsReference &&
                length === this._itemsLength && raw?.version === this._rawVersion) {
                return this._snapshot;
            }
            if (raw == null) {
                this._readError = null;
                this._setCache(raw, EMPTY);
                return EMPTY;
            }
            if (raw.version !== VERSION || !Array.isArray(raw.items)) {
                throw new Error('Invalid PI inventory version or structure.');
            }
            const snapshot = freezeData({ version: VERSION, items: this._validateItems(raw.items) });
            this._readError = null;
            this._lastLoggedRaw = UNSET;
            this._lastLoggedMessage = null;
            this._setCache(raw, snapshot);
            if (this.selectedItemId && !this._index.has(this.selectedItemId)) this.selectedItemId = null;
            return snapshot;
        } catch (error) {
            // Covers malformed items and normalizer failures, without writing the fallback.
            try { return this._invalid(raw, error); }
            catch (secondaryError) {
                this._readError = error;
                this._snapshot = EMPTY;
                this._index.clear();
                this.selectedItemId = null;
                console.error('[PIInventory] Could not inspect malformed inventory:', secondaryError);
                return EMPTY;
            }
        }
    }

    getStatus() {
        this.read();
        return { valid: !this._readError, writesBlocked: Boolean(this._readError),
            error: this._readError ? message(this._readError) : null,
            notificationError: this._notificationError };
    }

    _writable() {
        this.read();
        return !this._readError;
    }

    _publish(items, { clearSelection = false } = {}) {
        // State and UI cache never share mutable item/metadata objects.
        const nextState = { version: VERSION, items: copy(items) };
        const snapshot = freezeData({ version: VERSION, items });
        try { this.state.piInventory = nextState; }
        catch (error) {
            console.error('[PIInventory] State update failed:', error);
            return false;
        }
        this._readError = null;
        this._lastLoggedRaw = UNSET;
        this._lastLoggedMessage = null;
        this._setCache(nextState, snapshot);
        if (clearSelection) this.clearSelection();
        else if (this.selectedItemId && !this._index.has(this.selectedItemId)) this.selectedItemId = null;
        this._notificationError = null;
        try { this.save(); }
        catch (error) {
            // The in-memory mutation already succeeded. Do not report it as rejected.
            this._notificationError = message(error);
            console.error('[PIInventory] Could not request autosave:', error);
            this._emit('piInventory:saveError', { message: message(error) });
        }
        this._emit('piInventory:updated');
        return true;
    }

    commit(items) {
        if (!this._writable()) return false;
        try { return this._publish(this._validateItems(items)); }
        catch (error) { console.error('[PIInventory] Commit rejected:', error); return false; }
    }

    normalizeItem(item) { return this.normalize(item); }
    // Read-only cached snapshot: UI must not mutate these values.
    getAllItems() { return this.read().items; }
    getAllItemsCopy() { return copy(this.read().items); }
    getItem(id) { this.read(); return this._index.get(normalizeId(id)) ?? null; }
    hasItem(id) { this.read(); return this._index.has(normalizeId(id)); }
    getItemCount() { return this.read().items.length; }
    getItemsByType(type) { return this.read().items.filter(item => item.type === type); }
    getCapacity() { return { current: this.getItemCount(), max: LIMIT }; }

    addItem(raw) {
        if (!this._writable()) return false;
        let item;
        try { [item] = this._validateItems([raw]); }
        catch (error) { console.warn('[PIInventory] Item rejected:', error); return false; }
        const existing = this._index.get(item.id);
        const items = this.getAllItemsCopy();
        if (existing) {
            if (!existing.stackable || !item.stackable) return false;
            // Preserve PI transaction semantics: true means the normalized amount fitted.
            if (existing.quantity + item.quantity > MAX_QUANTITY) return false;
            const index = items.findIndex(entry => entry.id === item.id);
            items[index].quantity += item.quantity;
        } else {
            if (items.length >= LIMIT) {
                this._emit('piInventory:full', { attemptedItem: item, capacity: this.getCapacity() });
                return false;
            }
            items.push(item);
        }
        if (!this.commit(items)) return false;
        this._emit('piInventory:itemAdded', item);
        return true;
    }

    removeItem(id) {
        if (!this._writable()) return false;
        const itemId = normalizeId(id);
        if (!this._index.has(itemId)) return false;
        const items = this.getAllItemsCopy();
        const index = items.findIndex(item => item.id === itemId);
        const [removed] = items.splice(index, 1);
        if (!this.commit(items)) return false;
        this._emit('piInventory:itemRemoved', removed);
        return true;
    }

    removeQuantity(id, amount = 1) {
        if (!this._writable()) return false;
        const quantity = Number(amount);
        if (!Number.isSafeInteger(quantity) || quantity < 1) return false;
        const itemId = normalizeId(id);
        const item = this._index.get(itemId);
        if (!item || quantity > item.quantity) return false;
        if (!item.stackable || quantity === item.quantity) return this.removeItem(itemId);
        const items = this.getAllItemsCopy();
        items.find(entry => entry.id === itemId).quantity -= quantity;
        return this.commit(items);
    }

    selectItem(id) {
        const item = this.getItem(id);
        if (!item) return false;
        this.selectedItemId = item.id;
        this._emit('piInventory:selectionChanged', item);
        return true;
    }
    clearSelection() {
        this.selectedItemId = null;
        this._emit('piInventory:selectionChanged', null);
        return true;
    }
    getSelectedItem() {
        this.read();
        return this.selectedItemId ? this._index.get(this.selectedItemId) ?? null : null;
    }
    clearAll() {
        if (!this._writable()) return false;
        return this._publish([], { clearSelection: true });
    }

    exportState() {
        this.read();
        // UI fallback must never become a valid empty backup/save silently.
        if (this._readError) {
            const error = new Error('[PIInventory] Cannot export invalid inventory: ' + message(this._readError));
            error.cause = this._readError;
            throw error;
        }
        return copy(this._snapshot);
    }

    importState(raw) {
        if (!raw || raw.version !== VERSION || !Array.isArray(raw.items)) return false;
        this.syncContext();
        try {
            // Explicit valid import can repair an invalid current state.
            return this._publish(this._validateItems(raw.items), { clearSelection: true });
        } catch (error) {
            console.error('[PIInventory] Import rejected; current data retained:', error);
            return false;
        }
    }
}
export const piInventoryManager = new PIInventoryManager();
