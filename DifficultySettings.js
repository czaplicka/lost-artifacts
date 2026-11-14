import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
export const DEFAULT_DIFFICULTY = 'field';

const RANDOM_EVENT_SETTINGS = Object.freeze({
    enabled: true,

    // Losowanie raz przy rozpoczęciu nowego dnia gry.
    dailyChance: 0.05,

    maxEventsPerCase: 1,

    illness: Object.freeze({
        workEnergyMultiplier: 2,
        workDurationHours: 24,

        restHours: 24,
        recoveryEnergyMultiplier: 0.8,
        recoveryDurationHours: 12,
    }),

    bribe: Object.freeze({
        amount: 300,
        endsCase: true,
        requiresConfirmation: true,
    }),
});

export const DIFFICULTY = Object.freeze({
    rookie: Object.freeze({
        id: 'rookie',
        label: __dialogueText("DifficultySettings.js", "t_3e6b212e38b2bb8a83aa"),
        description: __dialogueText("DifficultySettings.js", "t_600b7737cd8fb54defaf"),

        hiddenObjectCount: 6,
        reconstructionOptions: 6,
        reconstructionAttempts: 4,

        timerMultiplier: 1.35,
        autoHintDelayMs: 20000,
        hintCost: 0,

        logicWarnings: true,

        // Zwykłe zużycie energii.
        energyCostMultiplier: 0.7,

        // Zachowane osobno: kary energetyczne.
        energyPenaltyMultiplier: 0.75,

        sleepRecoveryMultiplier: 1.15,

        scoreMultiplier: 1.0,
        hardOnlyEvidence: false,

        randomEvents: RANDOM_EVENT_SETTINGS,
    }),

    field: Object.freeze({
        id: 'field',
        label: __dialogueText("DifficultySettings.js", "t_898b1ad9707eac7ca046"),
        description: __dialogueText("DifficultySettings.js", "t_66d12def874fa622b577"),

        hiddenObjectCount: 6,
        reconstructionOptions: 6,
        reconstructionAttempts: 3,

        timerMultiplier: 1.0,
        autoHintDelayMs: null,
        hintCost: 25,

        logicWarnings: true,

        energyCostMultiplier: 1.0,
        energyPenaltyMultiplier: 1.0,
        sleepRecoveryMultiplier: 1.0,

        scoreMultiplier: 1.25,
        hardOnlyEvidence: false,

        randomEvents: RANDOM_EVENT_SETTINGS,
    }),

    master: Object.freeze({
        id: 'master',
        label: __dialogueText("DifficultySettings.js", "t_15970d29cd6269fe928c"),
        description: __dialogueText("DifficultySettings.js", "t_7121496487a129750ed1"),

        hiddenObjectCount: 7,
        reconstructionOptions: 7,
        reconstructionAttempts: 2,

        timerMultiplier: 0.85,
        autoHintDelayMs: null,
        hintCost: 75,

        logicWarnings: false,

        energyCostMultiplier: 1.4,
        energyPenaltyMultiplier: 1.25,
        sleepRecoveryMultiplier: 1.0,

        scoreMultiplier: 1.6,
        hardOnlyEvidence: true,

        randomEvents: RANDOM_EVENT_SETTINGS,
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