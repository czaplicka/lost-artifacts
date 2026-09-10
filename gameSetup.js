import { gameState, resetGameState, resetCaseOutcomeState } from './GameData.js';
import { saveGameState, clearSavedGame } from './GameStatePersistence.js';
import { EventBus } from './EventBus.js';
import SuspectGenerator from './suspects/SuspectGenerator.js';
import { getEnergyManager } from './EnergyManager.js';
import { getRankManager } from './RankManager.js';
import { prepareCaseSuspectState } from './suspects/SuspectCaseState.js';
import { CaseDirector } from './CaseDirector.js';
import caseModifiers from './assets/data/caseModifiers.json' with { type: 'json' };
import onboardingSchedule from './assets/data/onboardingSchedule.json' with { type: 'json' };
import { CrimeLabManager } from './scenes/CSI/CrimeLabManager.js';
import { mapIdentityEvidenceToHardEvidenceField } from './IdentityEvidenceAdapter.js';
import {
  HQ_CITY,
  HQ_ID,
  ESCAPE_ROUTE_LENGTH,
  SUSPECT_DATA_URL,
  SUSPECT_FETCH_RETRIES,
  SUSPECT_FETCH_RETRY_DELAY_MS,
  STARTING_AGENCY_BUDGETS
} from './TransportConfig.js';
import {
  resolveLocationId,
  getLocationByCity,
  validateSetupData,
  isTransportAvailable
} from './ui/LocationUI.js';
import {
  getTransportConfig,
  getTravelData,
  getTravelHours,
  getDestinationPreviewData
} from './TravelManager.js';
import {
  getScoreManager,
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity,
  clearTravelCluesForCity,
  enterCity,
  addSessionScore
} from './InvestigationManager.js';
import { RouteManager } from './RouteManager.js';


// ============================================================
// RANK -> GATING
// Klucz w onboardingSchedule.json musi mieć te same id co rangi
// w rankConfig.json (RankManager.js). Ranga gracza pochodzi teraz
// z RankManager.getCurrentRank(), a nie ze sztywnego stringa.
// ============================================================
const RANK_TO_SCHEDULE_KEY = {
  'Junior Agent': '0',
  'Field Agent': '1',
  'Senior Agent': '2',
  'Lead Investigator': '4'
  // Chief Investigator / Special Investigator - brak w onboardingSchedule,
  // więc CaseDirector spada na pełną losową pulę (poprawne zachowanie).
};


function resolveCaseIndexFromRank(rankId) {
  return Number(RANK_TO_SCHEDULE_KEY[rankId] ?? Object.keys(RANK_TO_SCHEDULE_KEY).length);
}


function buildCaseDirector() {
  const rankId = getRankManager().getCurrentRank().id;
  const caseIndex = resolveCaseIndexFromRank(rankId);
  const scheduleKey = RANK_TO_SCHEDULE_KEY[rankId];
  const forcedStages = scheduleKey !== undefined ? (onboardingSchedule[scheduleKey] || {}) : {};


  const caseDirector = new CaseDirector(caseModifiers);
  const template = caseDirector.generate(caseIndex, forcedStages);
  return { caseDirector, template };
}




function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}




function getRandomItem(items) {
  return Array.isArray(items) && items.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;
}




function syncScoreFromManager() {
  const manager = getScoreManager();
  if (typeof getScoreManager()?.startSession === 'function') {
    getScoreManager().startSession({
      reset: true
    });
  }
}




async function fetchCaseSuspects(thief, crimeCityId) {
  let lastError = null;


  // CrimeLabManager MUSI zostać wywołany PRZED SuspectGenerator, bo to on
  // jest teraz jedynym źródłem prawdy o tym, jaki dowód zawęża podejrzanych.
  // Wymaga, żeby gameState.currentThief i gameState.currentMission były już
  // ustawione (setupNewGame robi to przed wywołaniem fetchCaseSuspects).
  const crimeLabManager = new CrimeLabManager(gameState, crimeCityId);
  const identityEvidence = crimeLabManager.ensureIdentityEvidence();
  const traceEvidence = crimeLabManager.ensureRandomTraceEvidence();


  const mainHardEvidence = mapIdentityEvidenceToHardEvidenceField(identityEvidence);


  if (!mainHardEvidence) {
    throw new Error('fetchCaseSuspects: CrimeLabManager did not return valid identity evidence.');
  }


  for (let attempt = 0; attempt <= SUSPECT_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(SUSPECT_DATA_URL);


      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }


      const citySuspectsData = await response.json();
      const suspectGenerator = new SuspectGenerator(citySuspectsData);


      // TYLKO 1 pole - dokładnie to, co CrimeLabManager przypisał jako
      // identityEvidence. To ono zawęża 10 podejrzanych do dokładnie 2
      // (złodziej + forensyczny bliźniak), zgodnie z pierwotnym briefem
      // ("główne ślady"). traceEvidence NIE wchodzi tutaj - to są "dodatkowe
      // ślady", które mogą wykluczyć kilka osób później (rozmowy w mieście),
      // ale nie są częścią tego twardego filtra.
      const hardEvidence = [
        {
          id: `identity_${mainHardEvidence.field}`,
          field: mainHardEvidence.field,
          value: mainHardEvidence.value
        }
      ];


      const caseData = suspectGenerator.generateCaseSuspects(
        thief,
        crimeCityId,
        {
          total: 10,
          hardEvidence
        }
      );


      suspectGenerator.prepareCaseState(caseData);
      prepareCaseSuspectState(caseData);


      // forensicHardEvidence i requiredForensicProfile zostają - ale teraz
      // odzwierciedlają REALNY dowód z CrimeLabManager, a nie sztywną parę.
      gameState.currentMission.forensicHardEvidence = structuredClone(hardEvidence);
      gameState.currentMission.requiredForensicProfile = {
        [mainHardEvidence.field]: mainHardEvidence.value
      };


      // Dowody dodatkowe - do CSI dialogu i późniejszej "miękkiej" eliminacji
      // w mieście. Osobne pole, żeby nie mylić z hardEvidence.
      gameState.currentMission.traceEvidence = structuredClone(traceEvidence);


      return caseData;
    } catch (error) {
      lastError = error;


      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise((resolve) => {
          setTimeout(resolve, SUSPECT_FETCH_RETRY_DELAY_MS);
        });
      }
    }
  }


  throw new Error(
    `Failed to load suspects: ${lastError?.message || String(lastError)}`
  );
}



export async function setupNewGame(
  suspectsData,
  missionsData,
  locationsData,
  difficulty = 'field'
) {
  validateSetupData(suspectsData, missionsData, locationsData);
  clearSavedGame();
  resetGameState();
  resetCaseOutcomeState();



  // ============================================================
  // POPRAWKA: Nowa gra musi ZAINICJOWAĆ EnergyManager od zera,
  // a nie "restore'ować" go z gameState.energy — bo gameState.energy
  // to pole, do którego EnergyManager sam ZAPISUJE swój stan
  // (_syncToGameState), więc po resecie gry mogło tam wciąż leżeć
  // stare, "brudne" energy z poprzedniej rozgrywki (resetGameState()
  // nie zeruje tego pola, bo nie jest częścią domyślnego szablonu
  // narracyjnego w GameData.js). init(difficulty) ustawia energię
  // na 100%, czyści energyLog, isSleepingForced, forcedSleepTimer
  // i poprawnie zapisuje wybrany przez gracza poziom trudności
  // (wcześniej difficulty było aplikowane do EnergyManager ZA PÓŹNO,
  // bo dopiero w Object.assign(gameState, {...}) niżej).
  // ============================================================
  const energyManager = getEnergyManager();
  energyManager.init(difficulty);


  // Nowa gra = zerowa progresja rang (0 spraw rozwiązanych, Junior Agent).
  const rankManager = getRankManager();
  rankManager.init();



  if (typeof getScoreManager()?.startSession === 'function') {
    getScoreManager().startSession({
      reset: true
    });
  }



  const thief = getRandomItem(suspectsData);
  const crimeCities = locationsData.filter(
    (location) => location.isCrimeCity === true
  );
  const mission = getRandomItem(
    missionsData.filter((item) =>
      crimeCities.some((city) => city.city === item.city)
    )
  );
  const crimeCityData = crimeCities.find(
    (city) => city.city === mission?.city
  );
  const hqData = locationsData.find(
    (location) => location.id === HQ_ID || location.city === HQ_CITY
  );



  if (!thief || !mission || !crimeCityData || !hqData) {
    throw new Error('Could not create a valid case.');
  }



  const crimeCityId = resolveLocationId(crimeCityData, 'crime city');


  // Junior Agent -> onboardingSchedule['0'] wymusi uproszczoną sprawę
  // (lab przez telefon, 2 miasta w ucieczce).
  const { caseDirector, template } = buildCaseDirector();
  const escapeRouteLength = template.stages.cityChain?.cityCount ?? ESCAPE_ROUTE_LENGTH;


  const escapeRoute = shuffle(
    locationsData
      .filter((location) => {
        const id = resolveLocationId(location, 'escape route');
        return location?.city && id !== crimeCityId && id !== HQ_ID;
      })
      .map((location) => resolveLocationId(location, 'escape route'))
  ).slice(0, escapeRouteLength);



  Object.assign(gameState, {
    currentThiefId: thief.id ?? null,
    currentThief: structuredClone(thief),
    currentMission: structuredClone(mission),
    currentArtifact: mission.artifact ?? null,
    currentCity: hqData.city,
    currentCityId: hqData.id || HQ_ID,
    currentCityData: structuredClone(hqData),
    currentEncounterId: null,
    crimeCity: crimeCityData.city,
    crimeCityId,
    activeLocations: [],
    currentDestinations: [],
    escapeRoute: [...escapeRoute],
    routeManager: null,
    routeIndex: -1,
    nextTargetCity: null,
    nextTargetCityId: null,
    mustIncludeCityId: null,
    canonicalTravelCityId: null,
    justReachedCorrectCityId: null,
    clueScope: 'crime_scene',
    score: 0,
    isGameActive: true,
    crimeSceneVisited: false,
    storyPhoneCallTriggered: false,
    pendingPhoneCall: false,
    pendingPhoneCallCityId: null,
    scoreSaved: false,
    cluesCollected: [],
    visitedEncounters: [],
    visitedCities: [hqData.id || HQ_ID],
    playerNotes: '',
    timeSpent: 0,
    travelHistory: [],
    lastTravel: null,
    lastTravelEncounter: null,
    caseSuspects: [],
    identityEvidence: null,
    traceEvidence: [],
    energy: energyManager.getCurrentEnergy(),
    difficulty,
    cash: 100,
    agencyBudget: STARTING_AGENCY_BUDGETS[difficulty] ?? STARTING_AGENCY_BUDGETS.field,
    agencyDebt: 0,
    moneyLog: [],
    passport: null,
    caseDirector,
    caseTemplate: template
  });



  gameState.routeManager = new RouteManager(
    gameState.escapeRoute,
    gameState.crimeCityId
  );



  await fetchCaseSuspects(gameState.currentThief, crimeCityId);



  // Ustawia spójnie nextTargetCityId, mustIncludeCityId i canonicalTravelCityId.
  // Paryż / wybrane Crime City jest wstawiane przed fillerami na mapie.
  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);



  syncScoreFromManager();



  window.GAMESTATE = gameState;
  saveGameState();


  EventBus.emit('case-simplified-notice', {
    rank: gameState.playerRank,
    stages: template.stages
  });


  return gameState;
}




// ============================================================
// Kolejne sprawy w tym samym save'ie (numer sprawy 2, 3...).
// Nie resetuje gry - działa na istniejącym gameState po zakończeniu
// poprzedniej sprawy przez CrimeBoard. CrimeBoard MUSI wcześniej wywołać
// getRankManager().recordCaseOutcome('correct_arrest' | 'wrong_arrest' | ...),
// żeby ranga (a przez nią wariant CaseDirector) była aktualna, zanim
// wywołasz advanceToNextCase().
//
// UWAGA: celowo NIE resetujemy tu gameState.passport - gracz zachowuje
// swój paszport i pieczątki między kolejnymi sprawami tej samej rozgrywki.
// ============================================================
export async function advanceToNextCase(suspectsData, missionsData, locationsData) {
  resetCaseOutcomeState();


  const { caseDirector, template } = buildCaseDirector();


  const thief = getRandomItem(suspectsData);
  const crimeCities = locationsData.filter((location) => location.isCrimeCity === true);
  const mission = getRandomItem(
    missionsData.filter((item) => crimeCities.some((city) => city.city === item.city))
  );
  const crimeCityData = crimeCities.find((city) => city.city === mission?.city);


  if (!thief || !mission || !crimeCityData) {
    throw new Error('Could not create a valid case.');
  }


  const crimeCityId = resolveLocationId(crimeCityData, 'crime city');
  const escapeRouteLength = template.stages.cityChain?.cityCount ?? ESCAPE_ROUTE_LENGTH;


  const escapeRoute = shuffle(
    locationsData
      .filter((location) => {
        const id = resolveLocationId(location, 'escape route');
        return location?.city && id !== crimeCityId && id !== HQ_ID;
      })
      .map((location) => resolveLocationId(location, 'escape route'))
  ).slice(0, escapeRouteLength);


  Object.assign(gameState, {
    currentThiefId: thief.id ?? null,
    currentThief: structuredClone(thief),
    currentMission: structuredClone(mission),
    currentArtifact: mission.artifact ?? null,
    crimeCity: crimeCityData.city,
    crimeCityId,
    activeLocations: [],
    currentDestinations: [],
    escapeRoute: [...escapeRoute],
    routeManager: new RouteManager(escapeRoute, crimeCityId),
    routeIndex: -1,
    nextTargetCity: null,
    nextTargetCityId: null,
    mustIncludeCityId: null,
    canonicalTravelCityId: null,
    justReachedCorrectCityId: null,
    clueScope: 'crime_scene',
    crimeSceneVisited: false,
    storyPhoneCallTriggered: false,
    pendingPhoneCall: false,
    pendingPhoneCallCityId: null,
    cluesCollected: [],
    visitedEncounters: [],
    caseSuspects: [],
    identityEvidence: null,
    traceEvidence: [],
    lastTravel: null,
    lastTravelEncounter: null,
    caseDirector,
    caseTemplate: template
  });


  await fetchCaseSuspects(gameState.currentThief, crimeCityId);


  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);


  saveGameState();


  EventBus.emit('case-simplified-notice', {
    rank: gameState.playerRank,
    stages: template.stages
  });


  return gameState;
}




export function travelToCity(cityName, locations, transportType = 'plane') {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;



  const origin = getLocationByCity(previousCity, locations);
  const destination = getLocationByCity(cityName, locations);



  if (!origin || !destination) {
    throw new Error('Origin or destination city data is missing.');
  }



  const config = getTransportConfig(transportType);
  if (!config) {
    throw new Error(`Unknown transport type: ${transportType}`);
  }



  if (!isTransportAvailable(origin, destination, transportType)) {
    throw new Error(`${transportType} is unavailable for this route.`);
  }



  if (cityName === previousCity) {
    return {
      wasCorrect: false,
      transportType,
      transportLabel: config.label,
      travelHours: 0,
      baseTravelHours: 0,
      moneySpent: 0,
      energyChange: 0,
      travelEncounter: null,
      status: 'ALREADY_HERE',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: previousCityId,
      cityId: previousCityId,
      isCrimeSceneArrival: previousCityId === gameState.crimeCityId
    };
  }


  const travel = getTravelData(previousCity, cityName, locations, {
    allowEncounter: true,
    transportType
  });
  const destinationId = resolveLocationId(destination, 'travelToCity');
  const energyManager = getEnergyManager();



  const energyCost = Math.abs(Number(travel.estimatedEnergyChange) || 0);
  const energyBefore = energyManager.getCurrentEnergy();



  const energyResult = typeof energyManager.consumeCustom === 'function'
    ? energyManager.consumeCustom(
      energyCost,
      `Travel (${travel.transportLabel}): -${energyCost}`
    )
    : energyManager.consumeTravel(transportType);



  const energyAfter = energyManager.getCurrentEnergy();
  const energyChange = energyAfter - energyBefore;
  gameState.energy = energyAfter;



  const payment = { debtAdded: 0 };
  const manager = getRouteManager();
  const wasCorrect = manager.canEnterCity(destinationId);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;



  gameState.timeSpent = (gameState.timeSpent || 0) + travel.travelHours;



  const record = {
    from: previousCity,
    fromCityId: previousCityId,
    to: cityName,
    toCityId: destinationId,
    transportType,
    transportLabel: travel.transportLabel,
    hours: travel.travelHours,
    baseHours: travel.baseTravelHours,
    moneySpent: travel.moneySpent,
    energyChange,
    agencyDebtAdded: payment.debtAdded,
    wasCorrect,
    encounter: travel.travelEncounter,
    travelLabel: travel.travelLabel
  };



  if (!Array.isArray(gameState.travelHistory)) {
    gameState.travelHistory = [];
  }



  gameState.lastTravel = record;
  gameState.lastTravelEncounter = travel.travelEncounter;
  gameState.travelHistory.push(record);



  enterCity(cityName, locations);
  clearTravelCluesForCity(destinationId);



  const isFinalRouteCity =
    wasCorrect &&
    manager.isRoutePhase() &&
    manager.currentRouteIndex === manager.route.length - 1;



  addSessionScore(
    wasCorrect ? 100 : -25,
    wasCorrect ? `Correct city: ${cityName}` : `False city: ${cityName}`
  );



  if (isFinalRouteCity) {
    manager.enterCity(destinationId);
    syncInvestigationState(locations);



    gameState.justReachedCorrectCityId = null;
    gameState.currentDestinations = [];
    gameState.activeLocations = [];



    saveGameState();



    return {
      wasCorrect: true,
      ...travel,
      energyChange,
      agencyDebtAdded: payment.debtAdded,
      energyReachedZero: Boolean(energyResult?.energyReachedZero),
      status: 'FINAL_SHOWDOWN',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationId,
      cityId: destinationId,
      isCrimeSceneArrival: false
    };
  }



  gameState.justReachedCorrectCityId = wasCorrect ? destinationId : null;
  syncInvestigationState(locations);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);



  saveGameState();



  return {
    wasCorrect,
    ...travel,
    energyChange,
    agencyDebtAdded: payment.debtAdded,
    energyReachedZero: Boolean(energyResult?.energyReachedZero),
    status: wasCorrect
      ? (isCrimeSceneArrival ? 'CRIME_SCENE_REACHED' : 'CORRECT_CITY_REACHED')
      : 'FALSE_LEAD',
    fromCity: previousCity,
    toCity: cityName,
    toCityId: destinationId,
    cityId: destinationId,
    isCrimeSceneArrival
  };
}