export const gameState = {
    currentThief: null,
    currentArtifact: null,
    currentCity: null,
    score: 0,
    playerRank: 'Junior Agent',
    isGameActive: false,
    cluesCollected: []
};

export function resetGameState() {
    gameState.currentThief = null;
    gameState.currentArtifact = null;
    gameState.currentCity = null;
    gameState.score = 0;
    gameState.playerRank = 'Junior Agent';
    gameState.isGameActive = false;
    gameState.cluesCollected = [];
}