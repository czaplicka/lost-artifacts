import { gameState, resetGameState, resetCaseOutcomeState } from './GameData.js';
import { saveGameState, clearSavedGame } from './GameStatePersistence.js';
import { EventBus } from './EventBus.js';
import SuspectGenerator from './suspects/SuspectGenerator.js';
import { getEnergyManager } from './managers/EnergyManager.js';
import { getRankManager } from './managers/RankManager.js';
import { prepareCaseSuspectState } from './suspects/SuspectCaseState.js';
import { CaseDirector } from './CaseDirector.js';
import caseModifiers from './assets/data/caseModifiers.json' with { type: 'json' };
import onboardingSchedule from './assets/data/onboardingSchedule.json' with { type: 'json' };
import { CrimeLabManager } from './scenes/CSI/CrimeLabManager.js';
import { mapIdentityEvidenceToHardEvidenceField } from './IdentityEvidenceAdapter.js';
import { getUnifiedTravelManager, createUnifiedTravelManager } from './managers/UnifiedTravelManager.js';
import { drawMotive } from './motiveService.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
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
  getScoreManager,
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity,
  clearTravelCluesForCity,
  enterCity,
  addSessionScore
} from './managers/InvestigationManager.js';
import { RouteManager } from './managers/RouteManager.js';

// ============================================================
// MIGRACJA PODRÓŻY - KROK 2 (2026-09-18)
// travelToCity() korzysta teraz w 100% z UnifiedTravelManager:
// - calculateTravelBetweenLocations() liczy czas/koszt/energię/encounter
//   na podstawie location.map.x/y (jedyne źródło matematyki transportu)
// - executeTravel() konsumuje energię i płaci za bilet (cash -> agencyBudget
//   -> agencyDebt). Energia MOŻE zablokować podróż (energyManager,
//   odzyskuje się snem) - kasa NIGDY nie blokuje (brak środków = dług).
//
// UWAGA dla ui/DestinationsUI.js: płatność za bilet (moneyManager.spend
// w chargeTravel()) zostaje USUNIĘTA z tego pliku, bo inaczej gracz
// płaci dwa razy za ten sam bilet. Zobacz poprawiony DestinationsUI.js.
// Kiedy podróż jest zablokowana energią, travelToCity() NIE rzuca
// wyjątku - zwraca status 'BLOCKED_ENERGY', żeby UI mogło pokazać
// komunikat bez psucia sceny.
// ============================================================

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

// ============================================================
// MOTYWY - JEDNO ŹRÓDŁO PRAWDY
// motives.json jest znany TYLKO przez motiveService.js. gameSetup.js
// nigdy nie importuje pliku danych bezpośrednio ani nie waży
// prawdopodobieństw sam - to robi drawMotive(). Tutaj losujemy RAZ
// na sprawę i zapisujemy tylko motiveId + poprawny answerId + postęp
// etapów. Wszystko inne (teksty, świadkowie, NPC) regenerujemy z
// pliku po id, więc sejwy są odporne na przestawianie kolejności.
// ============================================================
let currentMotive = null;

export function getCurrentMotive() {
  return currentMotive;
}

function setupCaseMotive() {
  currentMotive = drawMotive();

  Object.assign(gameState.caseData, {
    motiveId: currentMotive.id,
    correctMotiveAnswerId: currentMotive.crimeBoard.answerId,
    motiveStagesDone: [],
    motiveBoardUnlocked: false
  });

  return currentMotive;
}

function ensureCaseDataShaped() {
  if (!gameState.caseData || typeof gameState.caseData !== 'object') {
    gameState.caseData = {};
  }
  if (!Array.isArray(gameState.caseData.motiveStagesDone)) {
    gameState.caseData.motiveStagesDone = [];
  }
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

  const energyManager = getEnergyManager();
  energyManager.init(difficulty);

  // UnifiedTravelManager jest teraz JEDYNYM źródłem prawdy dla matematyki
  // podróży (czas/koszt/energia/encounter) ORAZ dla płatności za bilet.
  const travelManager = createUnifiedTravelManager();
  travelManager.init();

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
    caseTemplate: template,
    caseData: {
      motiveId: null,
      correctMotiveAnswerId: null,
      motiveStagesDone: [],
      motiveBoardUnlocked: false
    }
  });

  // Motyw losujemy po Object.assign, żeby caseData już istniało.
  ensureCaseDataShaped();
  const motive = setupCaseMotive();
  console.log('[setupNewGame] Motive drawn:', motive.id, `(${motive.crimeBoard.label})`);

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
    caseTemplate: template,
    caseData: {
      motiveId: null,
      correctMotiveAnswerId: null,
      motiveStagesDone: [],
      motiveBoardUnlocked: false
    }
  });

  // Nowa sprawa = nowy motyw (niezależny od poprzedniego).
  ensureCaseDataShaped();
  const motive = setupCaseMotive();
  console.log('[advanceToNextCase] Motive drawn:', motive.id, `(${motive.crimeBoard.label})`);

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

  const travelManager = getUnifiedTravelManager();

  if (!travelManager.isTransportAvailable(transportType)) {
    throw new Error(`Unknown transport type: ${transportType}`);
  }

  if (!isTransportAvailable(origin, destination, transportType)) {
    throw new Error(`${transportType} is unavailable for this route.`);
  }

  const destinationId = resolveLocationId(destination, 'travelToCity');
  const transportRule = travelManager.getTransportRule(transportType);

  if (cityName === previousCity) {
    return {
      wasCorrect: false,
      transportType,
      transportLabel: transportRule.label,
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

  // Matematyka podróży (czas/koszt/energia/encounter) - jedno źródło prawdy.
  const travel = travelManager.calculateTravelBetweenLocations(
    origin,
    destination,
    transportType,
    { allowEncounter: true }
  );

  // Konsumpcja energii + płatność za bilet (cash -> agencyBudget -> agencyDebt).
  // Energia MOŻE zablokować podróż tutaj - kasa nigdy nie blokuje.
  const execution = travelManager.executeTravel(travel);

  if (!execution.success) {
    return {
      wasCorrect: false,
      blocked: true,
      blockReason: execution.reason,
      transportType,
      transportLabel: travel.transportLabel,
      travelHours: 0,
      baseTravelHours: travel.baseTravelHours,
      moneySpent: 0,
      energyChange: 0,
      travelEncounter: null,
      status: 'BLOCKED_ENERGY',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationId,
      cityId: destinationId,
      isCrimeSceneArrival: false
    };
  }

  gameState.energy = getEnergyManager().getCurrentEnergy();

  const manager = getRouteManager();
  const wasCorrect = manager.canEnterCity(destinationId);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;

  gameState.timeSpent = (gameState.timeSpent || 0) + travel.totalTravelHours;

  const agencyDebtAdded = execution.payment?.debtAdded || 0;
  const energyChange = -travel.energyCost;

  const record = {
    from: previousCity,
    fromCityId: previousCityId,
    to: cityName,
    toCityId: destinationId,
    transportType,
    transportLabel: travel.transportLabel,
    hours: travel.totalTravelHours,
    baseHours: travel.baseTravelHours,
    moneySpent: travel.moneyCost,
    energyChange,
    agencyDebtAdded,
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
      travelHours: travel.totalTravelHours,
      moneySpent: travel.moneyCost,
      energyChange,
      agencyDebtAdded,
      energyReachedZero: Boolean(execution.energyReachedZero),
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
    travelHours: travel.totalTravelHours,
    moneySpent: travel.moneyCost,
    energyChange,
    agencyDebtAdded,
    energyReachedZero: Boolean(execution.energyReachedZero),
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