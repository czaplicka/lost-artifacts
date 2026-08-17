import { EventBus } from './EventBus.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';

export const ACHIEVEMENTS = {
    first_case: {
        id: 'first_case',
        icon: '🔎',
        title: 'Eagle Eye',
        description: 'Close your first case.',
        isUnlocked: () => gameState.casesSolved >= 1
    },

    first_arrest: {
        id: 'first_arrest',
        icon: '🚔',
        title: 'Cuffed',
        description: 'Make your first successful arrest.',
        isUnlocked: () => gameState.arrests >= 1
    },

    swift_detective: {
        id: 'swift_detective',
        icon: '⏱',
        title: 'Swift',
        description: 'Close a case in under 30 minutes.',
        isUnlocked: () =>
            gameState.caseResolved === true &&
            Number.isFinite(gameState.timeSpent) &&
            gameState.timeSpent > 0 &&
            gameState.timeSpent <= 30 * 60
    },

    frequent_flyer: {
        id: 'frequent_flyer',
        icon: '✈️',
        title: 'Frequent Flyer',
        description: 'Visit five cities in one investigation.',
        isUnlocked: () =>
            Array.isArray(gameState.visitedCities) &&
            gameState.visitedCities.length >= 5
    },

    clue_hound: {
        id: 'clue_hound',
        icon: '🕵️',
        title: 'Clue Hound',
        description: 'Collect twenty clues.',
        isUnlocked: () =>
            Array.isArray(gameState.cluesCollected) &&
            gameState.cluesCollected.length >= 20
    },

    globe_trotter: {
        id: 'globe_trotter',
        icon: '🌍',
        title: 'Globe Trotter',
        description: 'Travel to ten different cities.',
        isUnlocked: () =>
            Array.isArray(gameState.travelHistory) &&
            new Set(
                gameState.travelHistory
                    .map((travel) =>
                        travel?.cityId ||
                        travel?.destinationId ||
                        travel?.id ||
                        travel
                    )
                    .filter(Boolean)
            ).size >= 10
    },

    master_detective: {
        id: 'master_detective',
        icon: '🏆',
        title: 'Master Detective',
        description: 'Close five cases.',
        isUnlocked: () => gameState.casesSolved >= 5
    },

    chief_inspector: {
        id: 'chief_inspector',
        icon: '⭐',
        title: 'Chief Inspector',
        description: 'Make five successful arrests.',
        isUnlocked: () => gameState.arrests >= 5
    }
};

export function getAchievementList() {
    return Object.values(ACHIEVEMENTS);
}

export function hasAchievement(achievementId) {
    return Array.isArray(gameState.achievements) &&
        gameState.achievements.includes(achievementId);
}

export function checkAndAwardAchievements() {
    if (!Array.isArray(gameState.achievements)) {
        gameState.achievements = [];
    }

    const newlyUnlocked = [];

    for (const achievement of getAchievementList()) {
        if (
            !hasAchievement(achievement.id) &&
            achievement.isUnlocked()
        ) {
            gameState.achievements.push(achievement.id);
            newlyUnlocked.push(achievement);
        }
    }

    if (newlyUnlocked.length > 0) {
        saveGameState();

        EventBus.emit('agentStatsChanged', {
            achievements: gameState.achievements,
            newlyUnlocked
        });

        for (const achievement of newlyUnlocked) {
            EventBus.emit('achievementUnlocked', achievement);
        }
    }

    return newlyUnlocked;
}