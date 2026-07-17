import { gameState, resetGameState } from './gamedata.js';

// --- Funkcje pomocnicze ---
function getRandomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems(array, count) {
    if (!array || array.length === 0) return [];
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Dodajemy pomocniczą funkcję do generowania 5 miast
function generateDestinationsForCurrentCity(locationsData) {
    const currentCity = gameState.currentCity;
    const correctCity = gameState.nextTargetCity;
    
    // Odsiewamy obecne i poprawne docelowe
    let availableCities = locationsData.filter(loc => 
        loc.city !== currentCity && loc.city !== correctCity
    );
    
    // Tasujemy fałszywki
    const shuffled = [...availableCities].sort(() => Math.random() - 0.5);
    let finalDestinations = shuffled.slice(0, 4);
    
    // Dodajemy poprawne miasto
    if (correctCity) {
        const correctCityData = locationsData.find(loc => loc.city === correctCity);
        if (correctCityData) finalDestinations.push(correctCityData);
    }
    
    // Tasujemy całość by ukryć prawidłowe miasto na mapie
    return finalDestinations.sort(() => Math.random() - 0.5);
}

// --- Główna funkcja tworząca nową grę ---
export function setupNewGame(suspectsData, missionsData, locationsData) {
    resetGameState();

    const thief = getRandomItem(suspectsData);
    const mission = getRandomItem(missionsData);
    
    // Szukamy danych o mieście zbrodni, by móc przypisać tam punkty
    const crimeCityData = locationsData.find(
        location => location.city === mission.city
    );

    if (!crimeCityData) {
        throw new Error(`No location data found for city: ${mission.city}`);
    }

    const activeLocations = getRandomItems(
        crimeCityData.availableLocations,
        Math.min(3, crimeCityData.availableLocations.length)
    );

    gameState.currentThief = thief;
    gameState.currentMission = mission;
    gameState.currentArtifact = mission.artifact;
    
    // ZMIANA: Zaczynamy śledztwo w centrali!
    gameState.currentCity = "Interpol HQ"; 
    // ZMIANA: Zanim użyjemy cityData, czekamy aż detektyw poleci na miejsce
    gameState.currentCityData = null; 
    
    gameState.activeLocations = activeLocations;
    gameState.isGameActive = true;

    // --- LOGIKA UCIECZKI ZŁODZIEJA ---
    const pathLength = 4;
    
    // Z puli dostępnych miast usuwamy miasto zbrodni, bo tam ucieczka dopiero się zacznie
    let availableCities = locationsData
        .map(loc => loc.city)
        .filter(city => city !== mission.city);
        
    // Tasujemy pozostałe miasta by stworzyć trasę
    const shuffledRoute = [...availableCities].sort(() => Math.random() - 0.5);
    
    gameState.escapeRoute = shuffledRoute.slice(0, pathLength);
    
    // Zaczynamy od lotu na miejsce zbrodni (-1)
    gameState.routeIndex = -1;
    gameState.nextTargetCity = mission.city; 

    // WAŻNE: Generujemy pierwszą, stałą mapę dla pierwszego wylotu z Interpol HQ!
    gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

    console.log(`[NOWA GRA] Złodziej: ${thief.name}`);
    console.log(`[NOWA GRA] Pierwszy lot na miejsce zbrodni do: ${mission.city}`);
    console.log(`[NOWA GRA] Trasa ucieczki (później): ${gameState.escapeRoute.join(' -> ')}`);

    return gameState;
}


// --- Funkcja zarządzająca postępem ucieczki ---
export function advanceInvestigation(locationsData) {
    gameState.routeIndex++;
    
    if (gameState.routeIndex === 0) {
        console.log(`Dotarłeś na miejsce zbrodni w ${gameState.currentCity}. Czas zbierać wskazówki.`);
        gameState.nextTargetCity = gameState.escapeRoute[gameState.routeIndex];
        gameState.currentCityData = locationsData.find(loc => loc.city === gameState.currentCity);
        
        // LOSOWANIE MIEJSC DOCELOWYCH NA MAPĘ JEDEN RAZ!
        gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);
        
        return "CRIME_SCENE_REACHED";
    }

    if (gameState.routeIndex >= gameState.escapeRoute.length) {
        console.log("Finałowe miasto! Złodziej nie ma już dokąd uciec.");
        gameState.nextTargetCity = null; 
        gameState.currentCityData = locationsData.find(loc => loc.city === gameState.currentCity);
        
        // Finałowe miasto nie ma już dokąd lecieć
        gameState.currentDestinations = []; 
        return "FINAL_SHOWDOWN";
    } else {
        gameState.nextTargetCity = gameState.escapeRoute[gameState.routeIndex];
        gameState.currentCityData = locationsData.find(loc => loc.city === gameState.currentCity);
        
        // LOSOWANIE MIEJSC DOCELOWYCH NA MAPĘ JEDEN RAZ!
        gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);
        
        console.log(`Złodziej przemieścił się! Nowy cel to: ${gameState.nextTargetCity}`);
        return "CONTINUE";
    }
}