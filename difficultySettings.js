export const DEFAULT_DIFFICULTY = 'field';

export const DIFFICULTY = Object.freeze({
    rookie: Object.freeze({
        id: 'rookie',
        label: 'ROOKIE DETECTIVE',
        description: 'Extra guidance. More retries. Less paperwork.',

        hiddenObjectCount: 6,
        reconstructionOptions: 6,
        reconstructionAttempts: 4,

        timerMultiplier: 1.35,
        autoHintDelayMs: 20000,
        hintCost: 0,

        logicWarnings: true,
        energyPenaltyMultiplier: 0.75,
        scoreMultiplier: 1.0,

        hardOnlyEvidence: false,
    }),

    field: Object.freeze({
        id: 'field',
        label: 'FIELD AGENT',
        description: 'Standard Mark Agency field procedure.',

        hiddenObjectCount: 6,
        reconstructionOptions: 6,
        reconstructionAttempts: 3,

        timerMultiplier: 1.0,
        autoHintDelayMs: null,
        hintCost: 25,

        logicWarnings: true,
        energyPenaltyMultiplier: 1.0,
        scoreMultiplier: 1.25,

        hardOnlyEvidence: false,
    }),

    master: Object.freeze({
        id: 'master',
        label: 'MASTER SLEUTH',
        description: 'Fewer second chances. Better coffee not guaranteed.',

        hiddenObjectCount: 7,
        reconstructionOptions: 7,
        reconstructionAttempts: 2,

        timerMultiplier: 0.85,
        autoHintDelayMs: null,
        hintCost: 75,

        logicWarnings: false,
        energyPenaltyMultiplier: 1.25,
        scoreMultiplier: 1.6,

        hardOnlyEvidence: true,
    }),
});

export function isValidDifficulty(difficulty) {
    return Object.hasOwn(DIFFICULTY, difficulty);
}

export function getDifficultyConfig(difficulty) {
    const validDifficulty = isValidDifficulty(difficulty)
        ? difficulty
        : DEFAULT_DIFFICULTY;

    return DIFFICULTY[validDifficulty];
}