import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';
import rankConfig from './assets/data/rankConfig.json' with { type: 'json' };

/**
 * RankManager
 * Zarządza progresją gracza w agencji: liczbą poprawnie zamkniętych
 * spraw i wynikającą z niej rangą. Ranga steruje jednocześnie:
 *  - odblokowaniem NPC/obszarów biura (fabularnie),
 *  - CaseDirector.RANK_TO_SCHEDULE_KEY w gameSetup.js (mechanicznie,
 *    czyli uproszczeniami rozgrywki w pierwszych sprawach).
 *
 * Wzorzec jak EnergyManager/MoneyManager: singleton przez getRankManager().
 */
class RankManager {
  constructor() {
    this.ranks = [...rankConfig.ranks].sort((a, b) => a.casesRequired - b.casesRequired);
  }

  /** Wywołaj raz przy starcie nowej gry (setupNewGame) - zeruje progresję. */
  init() {
    gameState.casesSolved = 0;
    gameState.playerRank = this.ranks[0].id;
    this._syncToGameState();
  }

  /** Wywołaj przy wczytaniu zapisu - nie zeruje, tylko dopasowuje rangę do zapisanej liczby spraw. */
  restore() {
    if (typeof gameState.casesSolved !== 'number') {
      gameState.casesSolved = 0;
    }
    const rank = this._resolveRankForCasesSolved(gameState.casesSolved);
    gameState.playerRank = rank.id;
  }

  getCurrentRank() {
    return this._resolveRankForCasesSolved(gameState.casesSolved || 0);
  }

  getCasesSolved() {
    return gameState.casesSolved || 0;
  }

  /**
   * Wywołaj po rozstrzygnięciu sprawy na CrimeBoard.
   * @param {'correct_arrest'|'wrong_arrest'|'timeout'|'released'} outcome
   * @returns {{ promoted: boolean, previousRank: object, currentRank: object }}
   */
  recordCaseOutcome(outcome) {
    const previousRank = this.getCurrentRank();

    if (outcome === 'correct_arrest') {
      gameState.casesSolved = (gameState.casesSolved || 0) + 1;
    }

    const currentRank = this._resolveRankForCasesSolved(gameState.casesSolved || 0);
    const promoted = currentRank.id !== previousRank.id;

    gameState.playerRank = currentRank.id;
    this._syncToGameState();

    if (promoted) {
      EventBus.emit('rank-changed', {
        previousRank,
        currentRank,
        unlockMessage: currentRank.unlockMessage,
        unlocks: currentRank.unlocks
      });
    }

    return { promoted, previousRank, currentRank };
  }

  /** Lista rang, których gracz jeszcze nie osiągnął - przydatne do UI "co dalej odblokujesz". */
  getUpcomingRanks() {
    const solved = gameState.casesSolved || 0;
    return this.ranks.filter((rank) => rank.casesRequired > solved);
  }

  _resolveRankForCasesSolved(casesSolved) {
    let current = this.ranks[0];
    for (const rank of this.ranks) {
      if (casesSolved >= rank.casesRequired) {
        current = rank;
      }
    }
    return current;
  }

  _syncToGameState() {
    gameState.rankProgress = {
      casesSolved: gameState.casesSolved || 0,
      currentRankId: gameState.playerRank,
      nextRank: this.getUpcomingRanks()[0] || null
    };
  }
}

let instance = null;

export function getRankManager() {
  if (!instance) {
    instance = new RankManager();
  }
  return instance;
}