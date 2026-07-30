import { EventBus } from './EventBus.js';

// ScoreManager.js
// System punktacji dla Lost Artefacts
// =============================================
// PUNKTY DODATNIE:
//   hiddenObject    – przekazywane z zewnątrz (już liczone w scenie)
//   hypothesis      – za poprawne ułożenie hipotezy w Mastermind
//   correctArrest   – za prawidłowe aresztowanie
//   timeBonus       – za czas pozostały do deadline
//   correctCity     – za właściwe miasto podczas pościgu
//
// PUNKTY UJEMNE:
//   npcInterrogated – za każde przepytane NPC
//   wrongWarrant    – za błędny nakaz aresztowania
//   wrongCity       – za fałszywe miasto podczas pościgu
// =============================================

const DEFAULT_SCORES = [
    { name: "Victor 'Shadow' Thorne", points: 98450 },
    { name: 'Elena Vance', points: 92100 },
    { name: 'Marcus Thorne', points: 89750 }
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
    } catch (e) {
        return false;
    }
}

export class ScoreManager {
    constructor() {
        this.storageKey = 'detectiveScores';
        this.scores = this.loadScores();

        this._sessionPoints = 0;
        this._breakdown = [];
    }

    startSession() {
        this._sessionPoints = 0;
        this._breakdown = [];

        EventBus.emit('scoreChanged', {
            delta: 0,
            total: 0,
            label: 'Session started'
        });
    }

    getSessionPoints() {
        return this._sessionPoints;
    }

    getBreakdown() {
        return [...this._breakdown];
    }

    addScoreEvent(points, label = 'Score update') {
        const delta = Number.isFinite(points) ? Math.floor(points) : 0;
        this._add(delta, label);
        return this._sessionPoints;
    }

    addHiddenObjectScore(points) {
        const p = Number.isFinite(points) ? Math.floor(points) : 0;
        this._add(p, 'Hidden Objects');
    }

    addHypothesisScore(attempt) {
        const p = attempt === 1
            ? SCORE_CONFIG.HYPOTHESIS_FIRST_TRY
            : SCORE_CONFIG.HYPOTHESIS_SECOND_TRY;

        this._add(p, `Hypothesis solved (attempt ${attempt})`);
    }

    addCorrectArrest() {
        this._add(SCORE_CONFIG.CORRECT_ARREST, 'Correct arrest');
    }

    addTimeBonus(secondsLeft) {
        const secs = Number.isFinite(secondsLeft) ? Math.max(0, Math.floor(secondsLeft)) : 0;
        const p = secs * SCORE_CONFIG.TIME_BONUS_PER_SECOND;

        if (p > 0) {
            this._add(p, `Time bonus (${secs}s remaining)`);
        }
    }

    penalizeNpcInterrogation(npcName = 'NPC') {
        this._add(SCORE_CONFIG.NPC_PENALTY, `Interrogated ${npcName}`);
    }

    penalizeWrongWarrant() {
        this._add(SCORE_CONFIG.WRONG_WARRANT_PENALTY, 'Wrong arrest warrant');
    }

    penalizeWrongCity(cityName = 'unknown city') {
        this._add(SCORE_CONFIG.WRONG_CITY_PENALTY, `Wrong city: ${cityName}`);
    }

    addCorrectCityScore(cityName = 'city') {
        this._add(SCORE_CONFIG.CORRECT_CITY, `Correct city: ${cityName}`);
    }

    finishMission(agentName) {
        const finalPoints = Math.max(0, this._sessionPoints);
        return this.addScore(agentName, finalPoints);
    }

    _add(delta, label) {
        const safeDelta = Number.isFinite(delta) ? Math.floor(delta) : 0;

        this._sessionPoints += safeDelta;
        this._sessionPoints = Math.max(0, this._sessionPoints);

        this._breakdown.push({
            label,
            delta: safeDelta,
            running: this._sessionPoints,
            time: Date.now()
        });

        EventBus.emit('scoreChanged', {
            delta: safeDelta,
            label,
            total: this._sessionPoints
        });

        return this._sessionPoints;
    }

    loadScores() {
        if (!canUseLocalStorage()) return [...DEFAULT_SCORES];

        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return [...DEFAULT_SCORES];

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [...DEFAULT_SCORES];

            return parsed
                .filter(entry =>
                    entry &&
                    typeof entry.name === 'string' &&
                    Number.isFinite(entry.points)
                )
                .sort((a, b) => b.points - a.points)
                .slice(0, 10);
        } catch (e) {
            console.error('Błąd odczytu rankingu:', e);
            return [...DEFAULT_SCORES];
        }
    }

    persistScores() {
        if (!canUseLocalStorage()) {
            console.warn('localStorage unavailable, skipping score save.');
            return false;
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
            return true;
        } catch (e) {
            console.error('Błąd zapisu rankingu:', e);
            return false;
        }
    }

    addScore(name, points) {
        const cleanName =
            typeof name === 'string' && name.trim()
                ? name.trim()
                : 'Anonymous';

        const cleanPoints =
            Number.isFinite(points)
                ? Math.max(0, Math.floor(points))
                : 0;

        const entry = {
            name: cleanName,
            points: cleanPoints,
            date: new Date().toLocaleDateString()
        };

        this.scores.push(entry);
        this.scores.sort((a, b) => b.points - a.points);
        this.scores = this.scores.slice(0, 10);

        this.persistScores();
        return entry;
    }

    getScores() {
        return [...this.scores];
    }

    clearScores() {
        this.scores = [...DEFAULT_SCORES];
        this.persistScores();
    }

    saveScore(name, points) {
        console.log(`Zapisywanie: ${name} z wynikiem ${points}`);
        return this.addScore(name, points);
    }
}