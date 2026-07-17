export const gameState = {
    currentThief: null,
    currentArtifact: null,
    currentCity: null,
    currentMission: null,
    currentCityData: null,
    activeLocations: [],
    currentDestinations: [],
    score: 0,
    playerRank: 'Junior Agent',
    isGameActive: false,
    cluesCollected: [],
    playerNotes: '',
};

export function resetGameState() {
    gameState.currentThief = null;
    gameState.currentArtifact = null;
    gameState.currentCity = null;
    gameState.currentMission = null;
    gameState.currentCityData = null;
    gameState.activeLocations = [];
    gameState.currentDestinations = [];
    gameState.score = 0;
    gameState.playerRank = 'Junior Agent';
    gameState.isGameActive = false;
    gameState.cluesCollected = [];
}
export function saveGameState() {
    try {
        const stateString = JSON.stringify(gameState);
        localStorage.setItem('detectiveSaveData', stateString);
        console.log("Gra zapisana automatycznie.");
    } catch (e) {
        console.error("Błąd zapisu do localStorage:", e);
    }
}

// Wczytuje gameState z localStorage (jeśli istnieje)
export function loadGameState() {
    try {
        const savedData = localStorage.getItem('detectiveSaveData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            // Kopiujemy wczytane dane do naszego globalnego gameState
            Object.assign(gameState, parsedData);
            console.log("Wczytano zapis gry.");
            return true;
        }
    } catch (e) {
        console.error("Błąd odczytu z localStorage:", e);
    }
    return false;
}