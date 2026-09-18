// MainStoryManager.js
// Singleton-manager śledzący postęp wątku głównego (śledztwo o mężu).
// Wzorowany na EnergyManager.js / MoneyManager.js: statyczny stan modułu,
// integracja z EventBus (powiadomienia o awansie fabuły) i SaveManager (persist).

import { EventBus } from '../EventBus.js';
import { MAIN_STORY_STAGES, getStageById, getStageByIndex, getTotalStages } from '../MainStoryData.js';

const STORAGE_KEY = 'mainStoryProgress';

class MainStoryManagerClass {
  constructor() {
    this.currentStageId = MAIN_STORY_STAGES[0].id;
    this.flags = {}; // np. { hired: true, joined_agency: true, red_herring_map_resolved: true }
    this.sideClues = {}; // dodatkowe fakty poboczne, np. motyw, elementy odkryte po drodze
    this.unlockedNpcs = new Set();
    this.unlockedLocations = new Set();
    this._applyUnlocksUpToCurrentStage();
  }

  // --- Query ---

  getCurrentStage() {
    return getStageById(this.currentStageId);
  }

  getCurrentStageIndex() {
    const stage = this.getCurrentStage();
    return stage ? stage.order : 0;
  }

  getProgressPercent() {
    const total = getTotalStages() - 1; // 'completed' jest ostatnim krokiem
    return Math.round((this.getCurrentStageIndex() / total) * 100);
  }

  hasReachedStage(stageId) {
    const target = getStageById(stageId);
    if (!target) return false;
    return this.getCurrentStageIndex() >= target.order;
  }

  hasFlag(flagName) {
    return !!this.flags[flagName];
  }

  getSideClue(key) {
    return this.sideClues[key] || null;
  }

  isNpcUnlocked(npcId) {
    return this.unlockedNpcs.has(npcId);
  }

  isLocationUnlocked(locationId) {
    return this.unlockedLocations.has(locationId);
  }

  // --- Mutations ---

  setFlag(flagName, value = true) {
    this.flags[flagName] = value;
    EventBus.emit('mainStory:flagSet', { flagName, value });
  }

  setSideClue(key, value) {
    this.sideClues[key] = value;
    EventBus.emit('mainStory:sideClueSet', { key, value });
  }

  /**
   * Przechodzi do konkretnego etapu fabuły (po id), sprawdzając wymagane flagi.
   * Zwraca true jeśli przejście się powiodło.
   */
  advanceToStage(stageId, { force = false } = {}) {
    const target = getStageById(stageId);
    if (!target) {
      console.warn(`[MainStoryManager] Nieznany stage: ${stageId}`);
      return false;
    }

    if (!force && target.requiredFlags) {
      const missing = target.requiredFlags.filter(f => !this.hasFlag(f) && f !== this.currentStageId);
      // flaga o tej samej nazwie co poprzedni stage jest automatycznie ustawiana przy wejściu,
      // więc traktujemy "bycie w poprzednim etapie" jako spełnienie warunku.
      const unmet = target.requiredFlags.filter(f => {
        if (this.hasFlag(f)) return false;
        const prevStage = getStageById(f);
        if (prevStage && this.getCurrentStageIndex() >= prevStage.order) return false;
        return true;
      });
      if (unmet.length > 0) {
        console.warn(`[MainStoryManager] Nie można przejść do "${stageId}" - brakujące warunki:`, unmet);
        return false;
      }
    }

    const previousStageId = this.currentStageId;
    this.currentStageId = stageId;
    this.setFlag(stageId, true);
    this._applyUnlocksForStage(target);

    EventBus.emit('mainStory:stageAdvanced', {
      previousStageId,
      currentStageId: stageId,
      stage: target
    });

    return true;
  }

  /** Przechodzi do następnego etapu w kolejności (order + 1). */
  advanceToNextStage() {
    const next = getStageByIndex(this.getCurrentStageIndex() + 1);
    if (!next) {
      console.warn('[MainStoryManager] Wątek główny jest już zakończony.');
      return false;
    }
    return this.advanceToStage(next.id, { force: true });
  }

  resetProgress() {
    this.currentStageId = MAIN_STORY_STAGES[0].id;
    this.flags = {};
    this.sideClues = {};
    this.unlockedNpcs = new Set();
    this.unlockedLocations = new Set();
    this._applyUnlocksUpToCurrentStage();
    EventBus.emit('mainStory:reset');
  }

  // --- Internals ---

  _applyUnlocksForStage(stage) {
    if (!stage.unlocks) return;
    (stage.unlocks.npcs || []).forEach(id => this.unlockedNpcs.add(id));
    (stage.unlocks.locations || []).forEach(id => this.unlockedLocations.add(id));
  }

  _applyUnlocksUpToCurrentStage() {
    const currentIndex = this.getCurrentStageIndex();
    MAIN_STORY_STAGES
      .filter(s => s.order <= currentIndex)
      .forEach(s => this._applyUnlocksForStage(s));
  }

  // --- Persistence (do integracji z SaveManager) ---

  serialize() {
    return {
      currentStageId: this.currentStageId,
      flags: { ...this.flags },
      sideClues: { ...this.sideClues },
      unlockedNpcs: Array.from(this.unlockedNpcs),
      unlockedLocations: Array.from(this.unlockedLocations)
    };
  }

  deserialize(data) {
    if (!data) return;
    this.currentStageId = data.currentStageId || MAIN_STORY_STAGES[0].id;
    this.flags = data.flags || {};
    this.sideClues = data.sideClues || {};
    this.unlockedNpcs = new Set(data.unlockedNpcs || []);
    this.unlockedLocations = new Set(data.unlockedLocations || []);
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
    } catch (e) {
      console.warn('[MainStoryManager] Nie udało się zapisać progresu:', e);
    }
  }

  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.deserialize(JSON.parse(raw));
    } catch (e) {
      console.warn('[MainStoryManager] Nie udało się wczytać progresu:', e);
    }
  }

  // --- Debug helper (do szybkiego podglądu w konsoli podczas testów) ---

  debugPrint() {
    const stage = this.getCurrentStage();
    console.log(
      `%c[MainStory] Etap ${this.getCurrentStageIndex()}/${getTotalStages() - 1} (${this.getProgressPercent()}%): ${stage.title}`,
      'color:#e0c840;font-weight:bold'
    );
    console.log('Flags:', this.flags);
    console.log('Unlocked NPCs:', Array.from(this.unlockedNpcs));
    console.log('Unlocked Locations:', Array.from(this.unlockedLocations));
  }
}

export const MainStoryManager = new MainStoryManagerClass();

// Ułatwienie do debugowania z konsoli przeglądarki: window.mainStory.debugPrint()
if (typeof window !== 'undefined') {
  window.mainStory = MainStoryManager;
}