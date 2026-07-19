const DEFAULT_SCORES = [
    { name: "Victor 'Shadow' Thorne", points: 98450 },
    { name: "Elena Vance", points: 92100 },
    { name: "Marcus Thorne", points: 89750 }
];

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
    }

    loadScores() {
        if (!canUseLocalStorage()) {
            return [...DEFAULT_SCORES];
        }

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
        const cleanName = typeof name === 'string' && name.trim() ? name.trim() : 'Anonymous';
        const cleanPoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;

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