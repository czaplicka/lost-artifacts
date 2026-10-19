export const GAME_STATE_VERSION = '1.0.0';


export function createDefaultReconstructedHeist() {
  return {
    cityId: null,
    sceneId: null,
    thiefId: null,
    thiefName: null,
    thiefSkills: [],
    allCards: [],
    correctCardIds: [],
    correctSequence: [],
    selectedCards: [],
    playerOrderedCards: [],
    playerOrderedSentences: [],
    playerFinalText: '',
    playerSkills: [],
    playerTheoryScore: 0,
    playerTheoryResult: null,
    playerSlotFeedback: [],
    playerAttemptsLeft: 3
  };
}


export const defaultGameState = {
  _version: GAME_STATE_VERSION,
  _lastSave: null,
  _createdAt: null,


  currentThiefId: null,
  currentThief: null,
  currentArtifact: null,


  artifactRecovery: {
    missionId: null,
    artifactId: null,
    recovered: false,
    recoveredAt: null,
    recoveredFrom: null,
    recoveredLocation: null,
    condition: null
  },


  recoveredArtifacts: [],


  currentCity: null,
  currentCityId: null,
  currentMission: null,
  currentCityData: null,
  currentEncounterId: null,
  currentCaseId: null,


  finalArrestResult: null,
  finalArrestSuspectId: null,
  caseResolved: false,
  caseFailed: false,
  arrestWarrantIssued: false,
  warrantSuspectName: null,
  warrantSuspectId: null,
  gameOverReason: '',


  crimeCity: null,
  crimeCityId: null,
  crimeSceneVisited: false,
  specialScenesVisited: {},
  specialScenesCompleted: {},
  crimeBoardData: {
    visitedCrimeScenes: [],
    sceneFoundObjects: []
  },
  justReachedCorrectCityId: null,
  hollyFirstSleepSeen: false,


  activeLocations: [],
  currentDestinations: [],
  escapeRoute: [],
  routeIndex: -1,
  routeManager: null,
  nextTargetCity: null,
  nextTargetCityId: null,
  mustIncludeCityId: null,
  canonicalTravelCityId: null,
  clueScope: 'crime_scene',


  score: 0,
  scoreSaved: false,
  playerName: 'Detective',
  playerRank: 'Junior Agent',
  avatarUrl: 'assets/profiles.png',
  casesSolved: 0,
  arrests: 0,
  achievements: [],
  completedCaseIds: [],
  successfulArrestCaseIds: [],
  isGameActive: false,
  difficulty: 'field',
  passport: null,


  energy: 100,
  maxEnergy: 100,
  energyLog: [],


  cash: 100,
  agencyBudget: 500,
  agencyDebt: 0,
  moneyLog: [],


  timeSpent: 0,
  travelHistory: [],
  lastTravel: null,
  lastTravelEncounter: null,


  investigationPhaseActive: true,
  investigationStartTime: null,
  investigationDeadline: null,


  escapePhaseActive: false,
  escapeStartTime: null,
  escapeDeadline: null,
  timeWastedOnMistakes: 0,


  cluesCollected: [],
  _clueIndex: {},


  visitedEncounters: [],
  _encounterIndex: {},


  visitedCities: [],
  _cityIndex: {},


  playerNotes: '',
  encounterMemory: {},
  cityEncounterState: {},


  storyPhoneCallTriggered: false,
  pendingPhoneCall: false,
  pendingPhoneCallCityId: null,


  hiddenObjectHistory: [],
  reconstructedHeist: createDefaultReconstructedHeist(),


  unifiedTravelManagerState: null,
  crimeCityProgress: {},
  crimeCityCurrentNodes: {},


  caseDirector: null,
  caseTemplate: null,


  caseData: {
    motiveId: null,
    correctMotiveAnswerId: null,
    motiveStagesDone: [],
    motiveBoardUnlocked: false,
    crimeWindow: null
  },


  caseSuspects: [],
  suspects: [],
  suspectList: [],
  excludedSuspects: [],


  identityEvidence: null,
  traceEvidence: [],
  identityEvidenceResult: null,


  hypothesisEvidence: null,
  hypothesisEvidenceResult: null,
  hypothesisAttempts: [],


  forensicResults: [],
  interviewEvidenceResults: [],
  csiLabCompleted: false,


  caseCsiAssignments: {},
  caseForensics: {},


  suspectExclusionState: {},
  suspectGridInput: null,
  alibiInvestigation: null,


  crimeCityEncounterState: {},
  alibiAccusations: {},


  selectedThiefProfile: null,
  selectedThief: null,
  thief: null,


  realThiefSuspectId: null,
  trueThiefCaseSuspectId: null,
  forensicTwinSuspectId: null,
  forensicSurvivorIds: [],
  selectedSuspectId: null,


  mainStory: null
};