import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { loadJson } from '../config/loadJson.js';

const rankConfig = await loadJson(
  '../assets/data/rankConfig.json',
  import.meta.url
);

class RankManager {
  constructor() {
    this.ranks = [...rankConfig.ranks].sort(
      (a, b) => a.casesRequired - b.casesRequired
    );
  }

  init() {
    gameState.casesSolved = 0;
    gameState.playerRank = this.ranks[0].id;

    this._syncToGameState();
  }

  restore() {
    if (typeof gameState.casesSolved !== 'number') {
      gameState.casesSolved = 0;
    }

    const rank = this._resolveRankForCasesSolved(
      gameState.casesSolved
    );

    gameState.playerRank = rank.id;
  }

  getCurrentRank() {
    return this._resolveRankForCasesSolved(
      gameState.casesSolved || 0
    );
  }

  getCasesSolved() {
    return gameState.casesSolved || 0;
  }

  recordCaseOutcome(outcome) {
    const previousRank = this.getCurrentRank();

    if (outcome === 'correct_arrest') {
      gameState.casesSolved =
        (gameState.casesSolved || 0) + 1;
    }

    const currentRank = this._resolveRankForCasesSolved(
      gameState.casesSolved || 0
    );

    const promoted =
      currentRank.id !== previousRank.id;

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

    return {
      promoted,
      previousRank,
      currentRank
    };
  }

  getUpcomingRanks() {
    const solved = gameState.casesSolved || 0;

    return this.ranks.filter(
      rank => rank.casesRequired > solved
    );
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