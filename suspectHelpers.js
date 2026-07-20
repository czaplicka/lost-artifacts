import { gameState } from './GameData.js';

function getThiefId() {
    return gameState.currentThief?.id || gameState.currentThiefId || null;
}

function isValidSuspect(suspect) {
    return !!suspect && typeof suspect.id === 'string' && suspect.id.trim().length > 0;
}

export function getRandomSuspectLineup(allSuspects, thiefId = getThiefId(), lineupSize = 5) {
    if (!Array.isArray(allSuspects)) {
        console.error('getRandomSuspectLineup: allSuspects must be an array.');
        return [];
    }

    if (!Number.isInteger(lineupSize) || lineupSize < 2) {
        console.error('getRandomSuspectLineup: lineupSize must be an integer >= 2.');
        return [];
    }

    if (!thiefId) {
        console.error('getRandomSuspectLineup: thiefId is required.');
        return [];
    }

    const validSuspects = allSuspects.filter(isValidSuspect);

    if (validSuspects.length < lineupSize) {
        console.error(`getRandomSuspectLineup: need at least ${lineupSize} valid suspects.`);
        return [];
    }

    const realThief = validSuspects.find(suspect => suspect.id === thiefId);

    if (!realThief) {
        console.error(`getRandomSuspectLineup: thief "${thiefId}" not found in suspects list.`);
        return [];
    }

    const decoys = validSuspects.filter(suspect => suspect.id !== thiefId);
    const shuffledDecoys = Phaser.Utils.Array.Shuffle([...decoys]);
    const selectedDecoys = shuffledDecoys.slice(0, lineupSize - 1);

    if (selectedDecoys.length !== lineupSize - 1) {
        console.error('getRandomSuspectLineup: not enough decoys to build lineup.');
        return [];
    }

    return Phaser.Utils.Array.Shuffle([realThief, ...selectedDecoys]);
}

export function isCorrectSuspectChoice(selectedSuspectId, thiefId = getThiefId()) {
    if (!selectedSuspectId || !thiefId) {
        return false;
    }

    return selectedSuspectId === thiefId;
}

export function getSuspectImageKey(suspect) {
    if (!suspect || typeof suspect !== 'object') {
        return null;
    }

    return suspect.suspectImageKey || suspect.image || suspect.portraitKey || null;
}

export function getSuspectById(allSuspects, suspectId) {
    if (!Array.isArray(allSuspects) || !suspectId) {
        return null;
    }

    return allSuspects.find(suspect => suspect.id === suspectId) || null;
}