// managers/MainStoryManager.js
// Stan głównego śledztwa.
// Zapis i odczyt obsługuje gameStatePersistence.js.

import { EventBus } from '../EventBus.js';
import {
  MAIN_STORY_STAGES,
  getStageById,
  getStageByIndex,
  getTotalStages
} from '../MainStoryData.js';

function isRecord(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function readRecord(value) {
  return isRecord(value) ? structuredClone(value) : {};
}

function readIds(value) {
  return Array.isArray(value)
    ? value.filter(id => typeof id === 'string')
    : [];
}

class MainStoryManagerClass {
  constructor() {
    if (!MAIN_STORY_STAGES.length) {
      throw new Error('MainStoryData must contain at least one stage.');
    }

    this._initializeState();
  }

  _initializeState() {
    const firstStage = MAIN_STORY_STAGES[0];

    this.currentStageId = firstStage.id;
    this.flags = { [firstStage.id]: true };
    this.sideClues = {};
    this.unlockedNpcs = new Set();
    this.unlockedLocations = new Set();

    this._applyUnlocksUpToCurrentStage();
  }

  getCurrentStage() {
    return getStageById(this.currentStageId) || MAIN_STORY_STAGES[0];
  }

  getCurrentStageIndex() {
    return this.getCurrentStage().order;
  }

  getProgressPercent() {
    const total = getTotalStages() - 1;

    if (total <= 0) return 0;

    return Math.min(
      100,
      Math.max(
        0,
        Math.round((this.getCurrentStageIndex() / total) * 100)
      )
    );
  }

  hasReachedStage(stageId) {
    const target = getStageById(stageId);

    return Boolean(target) &&
      this.getCurrentStageIndex() >= target.order;
  }

  hasFlag(flagName) {
    return Boolean(this.flags[flagName]);
  }

  getSideClue(key) {
    return this.sideClues[key] ?? null;
  }

  isNpcUnlocked(npcId) {
    return this.unlockedNpcs.has(npcId);
  }

  isLocationUnlocked(locationId) {
    return this.unlockedLocations.has(locationId);
  }

  setFlag(flagName, value = true) {
    if (typeof flagName !== 'string' || !flagName) return false;

    this.flags[flagName] = value;

    EventBus.emit('mainStory:flagSet', { flagName, value });
    return true;
  }

  setSideClue(key, value) {
    if (typeof key !== 'string' || !key) return false;

    this.sideClues[key] = structuredClone(value);

    EventBus.emit('mainStory:sideClueSet', { key, value });
    return true;
  }

  advanceToStage(stageId, { force = false } = {}) {
    const target = getStageById(stageId);

    if (!target) {
      console.warn(`[MainStoryManager] Unknown stage: ${stageId}`);
      return false;
    }

    // Powtórne odczytanie tego samego dokumentu nie powtarza zdarzenia.
    if (target.id === this.currentStageId) return true;

    const currentIndex = this.getCurrentStageIndex();

    if (!force) {
      if (target.order !== currentIndex + 1) {
        console.warn(
          '[MainStoryManager] Only the next story stage can be entered.',
          {
            currentStageId: this.currentStageId,
            requestedStageId: stageId
          }
        );
        return false;
      }

      const unmet = (target.requiredFlags || []).filter(flagName => {
        const stageRequirement = getStageById(flagName);

        if (stageRequirement) {
          return !this.hasReachedStage(flagName);
        }

        return !this.hasFlag(flagName);
      });

      if (unmet.length) {
        console.warn(
          `[MainStoryManager] Missing requirements for "${stageId}":`,
          unmet
        );
        return false;
      }
    }

    const previousStageId = this.currentStageId;

    this.currentStageId = target.id;
    this.flags[target.id] = true;

    this._applyUnlocksUpToCurrentStage();

    EventBus.emit('mainStory:stageAdvanced', {
      previousStageId,
      currentStageId: target.id,
      stage: target
    });

    return true;
  }

  advanceToNextStage() {
    const next = getStageByIndex(this.getCurrentStageIndex() + 1);

    if (!next) return false;

    return this.advanceToStage(next.id);
  }

  resetProgress({ silent = false } = {}) {
    this._initializeState();

    if (!silent) {
      EventBus.emit('mainStory:reset');
    }
  }

  _applyUnlocksForStage(stage) {
    if (!stage.unlocks) return;

    (stage.unlocks.npcs || []).forEach(id => {
      this.unlockedNpcs.add(id);
    });

    (stage.unlocks.locations || []).forEach(id => {
      this.unlockedLocations.add(id);
    });
  }

  _applyUnlocksUpToCurrentStage() {
    const currentIndex = this.getCurrentStageIndex();

    MAIN_STORY_STAGES
      .filter(stage => stage.order <= currentIndex)
      .forEach(stage => this._applyUnlocksForStage(stage));
  }

  serialize() {
    return structuredClone({
      version: 1,
      currentStageId: this.currentStageId,
      flags: this.flags,
      sideClues: this.sideClues,
      unlockedNpcs: Array.from(this.unlockedNpcs),
      unlockedLocations: Array.from(this.unlockedLocations)
    });
  }

  deserialize(data) {
    // Starszy zapis bez historii nie przejmuje stanu poprzedniej sesji.
    this.resetProgress({ silent: true });

    if (!isRecord(data)) return false;

    const stage = getStageById(data.currentStageId);

    if (!stage) {
      console.warn(
        '[MainStoryManager] Invalid saved stage. Story reset to beginning.'
      );
      return false;
    }

    this.currentStageId = stage.id;
    this.flags = readRecord(data.flags);
    this.flags[stage.id] = true;
    this.sideClues = readRecord(data.sideClues);

    this.unlockedNpcs = new Set(readIds(data.unlockedNpcs));
    this.unlockedLocations = new Set(readIds(data.unlockedLocations));

    // Przywraca także odblokowania wynikające z definicji etapów.
    this._applyUnlocksUpToCurrentStage();

    return true;
  }

  debugPrint() {
    const stage = this.getCurrentStage();

    console.log(
      `[MainStory] ${stage.id} — ${this.getProgressPercent()}%`
    );
    console.log('Stage title:', stage.title);
    console.log('Flags:', structuredClone(this.flags));
    console.log('Side clues:', structuredClone(this.sideClues));
    console.log('Unlocked NPCs:', Array.from(this.unlockedNpcs));
    console.log(
      'Unlocked locations:',
      Array.from(this.unlockedLocations)
    );
  }
}

export const MainStoryManager = new MainStoryManagerClass();

if (typeof window !== 'undefined') {
  window.mainStory = MainStoryManager;
}