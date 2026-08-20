import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import { getDifficultyConfig } from './DifficultySettings.js';

const MAX_HIGH_SCORES = 10;
const MAX_SESSION_BREAKDOWN = 200;
const MAX_PLAYER_NAME_LENGTH = 24;
const MAX_LABEL_LENGTH = 80;
const MAX_SCORE_VALUE = 100000000;

const DEFAULT_SCORES = {
  rookie: [
    { name: 'Nora Finch', points: 34800 },
    { name: 'Leo Bramble', points: 32650 },
    { name: 'Mina Cole', points: 29400 },
    { name: 'Tommy Vex', points: 25100 },
    { name: 'Ada Flint', points: 22800 }
  ],

  field: [
    { name: 'Czaplicka', points: 99999 },
    { name: "Victor 'Shadow' Thorne", points: 98450 },
    { name: 'Elena Vance', points: 92100 },
    { name: 'Marcus Thorne', points: 89750 },
    { name: 'Rita Glass', points: 84300 }
  ],

  master: [
    { name: "Victor 'Shadow' Thorne", points: 128400 },
    { name: 'Iris Blackwood', points: 121750 },
    { name: 'Carmen Vale', points: 117200 },
    { name: 'Dr. Felix Stone', points: 111900 },
    { name: 'Agent 00-Nope', points: 104600 }
  ]
};

const DIFFICULTY_KEYS = [
  'rookie',
  'field',
  'master'
];

export const SCORE_CONFIG = {
  HIDDEN_OBJECT_PASS_THROUGH: true,
  HYPOTHESIS_FIRST_TRY: 5000,
  HYPOTHESIS_SECOND_TRY: 2500,
  CORRECT_ARREST: 15000,
  TIME_BONUS_PER_SECOND: 10,
  CORRECT_CITY: 3000,

  NPC_PENALTY: -200,
  WRONG_WARRANT_PENALTY: -5000,
  WRONG_CITY_PENALTY: -2000
};

function canUseLocalStorage() {
  try {
    const testKey = '__detective_scores_test__';

    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);

    return true;
  } catch {
    return false;
  }
}

function sanitizePlayerName(value) {
  if (typeof value !== 'string') {
    return 'Anonymous';
  }

  const normalized = value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N} ._'’-]/gu, '')
    .slice(0, MAX_PLAYER_NAME_LENGTH);

  return normalized || 'Anonymous';
}

function sanitizePoints(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    MAX_SCORE_VALUE,
    Math.max(0, Math.floor(value))
  );
}

function sanitizeDelta(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    -MAX_SCORE_VALUE,
    Math.min(MAX_SCORE_VALUE, Math.floor(value))
  );
}

function sanitizeLabel(value) {
  if (typeof value !== 'string') {
    return 'Score update';
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_LABEL_LENGTH);

  return normalized || 'Score update';
}

function createDefaultScores() {
  return Object.fromEntries(
    DIFFICULTY_KEYS.map((difficulty) => [
      difficulty,
      DEFAULT_SCORES[difficulty].map((entry) => ({
        name: entry.name,
        points: entry.points
      }))
    ])
  );
}

function normalizeScoreEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  if (
    typeof entry.name !== 'string' ||
    !Number.isFinite(entry.points)
  ) {
    return null;
  }

  return {
    name: sanitizePlayerName(entry.name),
    points: sanitizePoints(entry.points),
    date: typeof entry.date === 'string'
      ? entry.date.slice(0, 40)
      : undefined
  };
}

function normalizeDifficulty(value) {
  return DIFFICULTY_KEYS.includes(value)
    ? value
    : 'field';
}

function normalizeScoreList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeScoreEntry)
    .filter(Boolean)
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_HIGH_SCORES);
}

export class ScoreManager {
  constructor() {
    this.storageKey = 'detectiveScores';
    this.scoresByDifficulty = this.loadScores();

    /*
     * gameState.score is the canonical score.
     * _sessionPoints exists only for compatibility,
     * breakdown data and older code.
     */
    this._sessionPoints = this.getCanonicalScore();
    this._breakdown = [];
  }

  getCanonicalScore() {
    return sanitizePoints(
      Number(gameState.score) || 0
    );
  }

  setCanonicalScore(value) {
    const score = sanitizePoints(value);

    gameState.score = score;
    this._sessionPoints = score;

    return score;
  }

  startSession({ reset = false } = {}) {
    if (reset) {
      this._breakdown = [];
      this.setCanonicalScore(0);
    } else {
      this._sessionPoints = this.getCanonicalScore();
    }

    EventBus.emit('scoreChanged', {
      delta: 0,
      total: gameState.score,
      label: reset
        ? 'New score session started'
        : 'Score session restored'
    });

    return gameState.score;
  }

  getSessionPoints() {
    /*
     * Never return a stale private value.
     * Some older scenes may still modify gameState.score directly.
     */
    this._sessionPoints = this.getCanonicalScore();

    return this._sessionPoints;
  }

  getBreakdown() {
    return this._breakdown.map((entry) => ({
      ...entry
    }));
  }

  addScoreEvent(points, label = 'Score update') {
    return this._add(points, label);
  }

  addHiddenObjectScore(points) {
    return this._add(points, 'Hidden Objects');
  }

  addHypothesisScore(attempt) {
    const points = attempt === 1
      ? SCORE_CONFIG.HYPOTHESIS_FIRST_TRY
      : SCORE_CONFIG.HYPOTHESIS_SECOND_TRY;

    return this._add(
      points,
      `Hypothesis solved (attempt ${attempt})`
    );
  }

  addCorrectArrest() {
    return this._add(
      SCORE_CONFIG.CORRECT_ARREST,
      'Correct arrest'
    );
  }

  addTimeBonus(secondsLeft) {
    const seconds = Number.isFinite(secondsLeft)
      ? Math.max(0, Math.floor(secondsLeft))
      : 0;

    const points =
      seconds * SCORE_CONFIG.TIME_BONUS_PER_SECOND;

    if (points <= 0) {
      return this.getSessionPoints();
    }

    return this._add(
      points,
      `Time bonus (${seconds}s remaining)`
    );
  }

  penalizeNpcInterrogation(npcName = 'NPC') {
    return this._add(
      SCORE_CONFIG.NPC_PENALTY,
      `Interrogated ${sanitizePlayerName(npcName)}`
    );
  }

  penalizeWrongWarrant() {
    return this._add(
      SCORE_CONFIG.WRONG_WARRANT_PENALTY,
      'Wrong arrest warrant'
    );
  }

  penalizeWrongCity(cityName = 'unknown city') {
    return this._add(
      SCORE_CONFIG.WRONG_CITY_PENALTY,
      `Wrong city: ${sanitizeLabel(String(cityName))}`
    );
  }

  addCorrectCityScore(cityName = 'city') {
    return this._add(
      SCORE_CONFIG.CORRECT_CITY,
      `Correct city: ${sanitizeLabel(String(cityName))}`
    );
  }

  finishMission(agentName) {
    return this.addScore(
      agentName,
      this.getSessionPoints()
    );
  }

  getDifficultyMultiplier() {
    const difficulty =
      gameState.difficulty || 'field';

    const difficultyConfig =
      getDifficultyConfig(difficulty);

    return Number.isFinite(
      difficultyConfig?.scoreMultiplier
    )
      ? difficultyConfig.scoreMultiplier
      : 1;
  }

  _add(delta, label = 'Score update') {
    const rawDelta = sanitizeDelta(delta);

    const multiplier = rawDelta > 0
      ? this.getDifficultyMultiplier()
      : 1;

    const safeDelta = rawDelta > 0
      ? Math.round(rawDelta * multiplier)
      : rawDelta;

    /*
     * Critical:
     * Always read gameState.score immediately before scoring.
     *
     * Example:
     * gameState.score = 420
     * this._sessionPoints = 0
     * Hidden Object = +5
     *
     * Result:
     * 420 + 5 = 425
     *
     * The old implementation used:
     * 0 + 5 = 5
     */
    const currentScore = this.getCanonicalScore();

    const nextScore = this.setCanonicalScore(
      currentScore + safeDelta
    );

    const multiplierSuffix = multiplier > 1
      ? ` x${multiplier.toFixed(2)}`
      : '';

    this._breakdown.push({
      label: sanitizeLabel(label),
      rawDelta,
      delta: safeDelta,
      multiplier,
      running: nextScore,
      time: Date.now()
    });

    if (this._breakdown.length > MAX_SESSION_BREAKDOWN) {
      this._breakdown.splice(
        0,
        this._breakdown.length - MAX_SESSION_BREAKDOWN
      );
    }

    console.log('[ScoreManager] Score changed', {
      label,
      currentScore,
      rawDelta,
      safeDelta,
      nextScore
    });

    EventBus.emit('scoreChanged', {
      delta: safeDelta,
      rawDelta,
      multiplier,
      label: `${sanitizeLabel(label)}${multiplierSuffix}`,
      total: nextScore
    });

    return nextScore;
  }

  loadScores() {
    if (!canUseLocalStorage()) {
      return createDefaultScores();
    }

    try {
      const raw = localStorage.getItem(
        this.storageKey
      );

      if (!raw) {
        return createDefaultScores();
      }

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return createDefaultScores();
      }

      const defaults = createDefaultScores();

      for (const difficulty of DIFFICULTY_KEYS) {
        const scores = normalizeScoreList(
          parsed[difficulty]
        );

        if (scores.length > 0) {
          defaults[difficulty] = scores;
        }
      }

      return defaults;
    } catch (error) {
      console.error(
        'Błąd odczytu rankingów:',
        error
      );

      return createDefaultScores();
    }
  }

  persistScores() {
    if (!canUseLocalStorage()) {
      console.warn(
        'localStorage unavailable, skipping score save.'
      );

      return false;
    }

    try {
      const scoresToSave = Object.fromEntries(
        DIFFICULTY_KEYS.map((difficulty) => [
          difficulty,
          this.scoresByDifficulty[difficulty]
            .slice(0, MAX_HIGH_SCORES)
        ])
      );

      localStorage.setItem(
        this.storageKey,
        JSON.stringify(scoresToSave)
      );

      return true;
    } catch (error) {
      console.error(
        'Błąd zapisu rankingów:',
        error
      );

      return false;
    }
  }

  addScore(
    name,
    points,
    difficulty = gameState.difficulty
  ) {
    const rankingDifficulty =
      normalizeDifficulty(difficulty);

    const entry = {
      name: sanitizePlayerName(name),
      points: sanitizePoints(points),
      date: new Date().toLocaleDateString()
    };

    if (
      !Array.isArray(
        this.scoresByDifficulty[rankingDifficulty]
      )
    ) {
      this.scoresByDifficulty[rankingDifficulty] = [];
    }

    this.scoresByDifficulty[rankingDifficulty].push(
      entry
    );

    this.scoresByDifficulty[rankingDifficulty].sort(
      (a, b) => b.points - a.points
    );

    this.scoresByDifficulty[rankingDifficulty] =
      this.scoresByDifficulty[rankingDifficulty]
        .slice(0, MAX_HIGH_SCORES);

    this.persistScores();

    return {
      ...entry,
      difficulty: rankingDifficulty
    };
  }

  getScores(difficulty = 'field') {
    const rankingDifficulty =
      normalizeDifficulty(difficulty);

    const scores =
      this.scoresByDifficulty[rankingDifficulty] || [];

    return scores.map((entry) => ({
      ...entry
    }));
  }

  clearScores() {
    this.scoresByDifficulty = createDefaultScores();
    this.persistScores();
  }

  saveScore(
    name,
    points,
    difficulty = gameState.difficulty
  ) {
    return this.addScore(
      name,
      points,
      difficulty
    );
  }
}