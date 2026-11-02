import { gameState, resetGameState, resetCaseOutcomeState, createDefaultReconstructedHeist } from './GameData.js';
import { debugCaseRoute } from './debugCaseRoute.js';
import { startCaseClock } from './CaseTimeHelper.js';
import { saveGameState, clearSavedGame } from './gameStatePersistence.js';
import { EventBus } from './EventBus.js';
import SuspectGenerator from './suspects/SuspectGenerator.js';
import { normalizeHardEvidence } from './suspects/forensicEvidence.js';
import { getEnergyManager } from './managers/EnergyManager.js';
import { getRankManager } from './managers/RankManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { CaseDirector } from './CaseDirector.js';
import { loadJson } from './config/loadJson.js';
import { CrimeLabManager } from './scenes/CSI/CrimeLabManager.js';
import { createUnifiedTravelManager } from './managers/UnifiedTravelManager.js';
import { drawMotive, getMotiveById } from './motiveService.js';
import { HQ_CITY, HQ_ID, ESCAPE_ROUTE_LENGTH, SUSPECT_DATA_URL, SUSPECT_FETCH_RETRIES,
  SUSPECT_FETCH_RETRY_DELAY_MS, STARTING_AGENCY_BUDGETS } from './TransportConfig.js';
import { resolveLocationId, validateSetupData } from './ui/LocationUI.js';
import { getScoreManager, syncInvestigationState, generateDestinationsForCurrentCity } from './managers/InvestigationManager.js';
import { RouteManager } from './managers/RouteManager.js';
import { CASE_SEQUENCE_VERSION, nextCampaignCaseIndex, currentCampaignCaseIndex, prepareCaseSequence, makeMissionOnboarding } from './caseSequence.js';
import { getEvidenceCaseKey } from './managers/ApartmentEvidenceModel.js';
import { retryInventoryItem, differentPool, clearAttemptApartments, clearMissionVisitFlags } from './caseRetryPolicy.js';

const [caseModifiers, onboardingSchedule] = await Promise.all([
  loadJson('./assets/data/caseModifiers.json', import.meta.url),
  loadJson('./assets/data/onboardingSchedule.json', import.meta.url)
]);
const CRIME_WINDOW_START_MINUTES = [18*60,19*60,20*60,21*60];
const CRIME_WINDOW_DURATION_MINUTES = 15, CRIME_DAY = 0;
let currentMotive = null;
function buildCaseDirector(caseIndex) {
  const {pool,forcedStages}=prepareCaseSequence(caseIndex,caseModifiers,onboardingSchedule);
  const caseDirector=new CaseDirector(pool),template=caseDirector.generate(caseIndex,forcedStages);
  return {caseDirector,template};
}
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function getRandomItem(items){return Array.isArray(items)&&items.length?items[Math.floor(Math.random()*items.length)]:null;}
export function getCurrentMotive(){const id=gameState.caseData?.motiveId??null;if(!id){currentMotive=null;return null;}if(currentMotive?.id!==id)currentMotive=getMotiveById(id);return currentMotive;}
function createEmptyCaseData(){return {motiveId:null,correctMotiveAnswerId:null,motiveStagesDone:[],motiveBoardUnlocked:false,crimeWindow:null};}
function ensureCaseDataShaped(){if(!gameState.caseData||typeof gameState.caseData!=='object'||Array.isArray(gameState.caseData))gameState.caseData=createEmptyCaseData();if(!Array.isArray(gameState.caseData.motiveStagesDone))gameState.caseData.motiveStagesDone=[];}
function setupCaseCrimeWindow(){ensureCaseDataShaped();if(gameState.caseData.crimeWindow!=null)return gameState.caseData.crimeWindow;const startMinute=getRandomItem(CRIME_WINDOW_START_MINUTES);if(!Number.isInteger(startMinute))throw new Error('Could not generate the crime time window.');const crimeWindow={day:CRIME_DAY,startMinute,endMinute:startMinute+CRIME_WINDOW_DURATION_MINUTES};gameState.caseData.crimeWindow=crimeWindow;return crimeWindow;}
function setupCaseMotive(){const motive=drawMotive();if(!motive?.id||!motive.crimeBoard||motive.crimeBoard.answerId==null)throw new Error('Could not generate a valid case motive.');currentMotive=motive;Object.assign(gameState.caseData,{motiveId:motive.id,correctMotiveAnswerId:motive.crimeBoard.answerId,motiveStagesDone:[],motiveBoardUnlocked:false});return motive;}
function startScoreSession(){const manager=getScoreManager();if(typeof manager?.startSession==='function')manager.startSession({reset:true});}
function resetInventory(){inventoryManager.close();inventoryManager.clearAll();gameState.inventory=inventoryManager.exportState();}
function resetForensicCaseState(){gameState.updateState({
 caseSuspects:[],suspects:[],suspectList:[],excludedSuspects:[],identityEvidence:null,traceEvidence:[],identityEvidenceResult:null,
 hypothesisEvidence:null,hypothesisEvidenceResult:null,hypothesisAttempts:[],forensicResults:[],interviewEvidenceResults:[],csiLabCompleted:false,
 caseCsiAssignments:{},caseForensics:{},crimeCityProgress:{},crimeCityCurrentNodes:{},suspectExclusionState:{},suspectGridInput:null,
 alibiInvestigation:null,crimeCityEncounterState:{},alibiAccusations:{},reconstructedHeist:createDefaultReconstructedHeist(),
 selectedThiefProfile:null,selectedThief:null,thief:null,realThiefSuspectId:null,trueThiefCaseSuspectId:null,forensicTwinSuspectId:null,
 forensicSurvivorIds:[],selectedSuspectId:null,currentCaseId:null});}
function resetArtifactRecovery(){gameState.artifactRecovery={missionId:null,artifactId:null,recovered:false,recoveredAt:null,recoveredFrom:null,recoveredLocation:null,condition:null};}
function startInvestigationClock(){startCaseClock(gameState);}
function selectCase(suspectsData,missionsData,locationsData,retry=false){
 const thieves=retry?differentPool(suspectsData,gameState.currentThief?.id??gameState.currentThiefId):suspectsData;
 const thief=getRandomItem(thieves),crimeCities=locationsData.filter(l=>l.isCrimeCity===true);
 let eligible=missionsData.filter(m=>crimeCities.some(c=>c.city===m.city));
 if(retry)eligible=differentPool(eligible,gameState.currentMission?.id??gameState.currentMission?.missionId,m=>m.id??m.missionId);
 const mission=getRandomItem(eligible),crimeCityData=crimeCities.find(c=>c.city===mission?.city);
 if(!thief||!mission||!crimeCityData)throw new Error('Could not create a valid case.');
 return {thief,mission,crimeCityData,crimeCityId:resolveLocationId(crimeCityData,'crime city')};
}
function createEscapeRoute(locationsData,crimeCityId,template){
 const n=template.stages.cityChain?.cityCount??ESCAPE_ROUTE_LENGTH;
 if(!Number.isInteger(n)||n<0)throw new Error('Case template contains an invalid city count.');
 const eligible=[...new Set(locationsData.filter(l=>{const id=resolveLocationId(l,'escape route');return l?.city&&id!==crimeCityId&&id!==HQ_ID;}).map(l=>resolveLocationId(l,'escape route')))];
 if(eligible.length<n+1)throw new Error(`Escape route requires ${n} investigation cities and one finale city, but only ${eligible.length} unique cities are available.`);
 return shuffle(eligible).slice(0,n+1);
}
function buildApartmentModifier(template){const stage=template?.stages?.apartment;if(!stage?.modifierId)return null;const{modifierId,...effect}=stage;return{id:modifierId,effect};}
function applyCaseConfiguration({selectedCase,caseDirector,template,escapeRoute}){
 const{thief,mission,crimeCityData,crimeCityId}=selectedCase,apartmentModifier=buildApartmentModifier(template),caseIndex=template.caseIndex,onboarding=makeMissionOnboarding(template);
 gameState.updateState({caseSequence:{version:CASE_SEQUENCE_VERSION,index:caseIndex},caseIndex,currentCaseIndex:caseIndex,currentOnboarding:structuredClone(onboarding),
 currentThiefId:thief.id??null,currentThief:structuredClone(thief),
 currentMission:{...structuredClone(mission),caseIndex,onboarding:structuredClone(onboarding),caseModifiers:{...(mission.caseModifiers||{}),...(apartmentModifier?{apartment:apartmentModifier}:{})}},
 currentArtifact:mission.artifact?structuredClone(mission.artifact):null,crimeCity:crimeCityData.city,crimeCityId,activeLocations:[],currentDestinations:[],
 escapeRoute:[...escapeRoute],routeManager:new RouteManager(escapeRoute,crimeCityId),routeIndex:-1,nextTargetCity:null,nextTargetCityId:null,mustIncludeCityId:null,
 canonicalTravelCityId:null,justReachedCorrectCityId:null,clueScope:'crime_scene',crimeSceneVisited:false,storyPhoneCallTriggered:false,
 pendingPhoneCall:false,pendingPhoneCallCityId:null,lastTravel:null,lastTravelEncounter:null,caseDirector,caseTemplate:structuredClone(template),caseData:createEmptyCaseData()});
 gameState.clearClues();gameState.clearEncounters();resetArtifactRecovery();resetForensicCaseState();setupCaseCrimeWindow();setupCaseMotive();
}
async function fetchSuspectSource(){let lastError;for(let attempt=0;attempt<=SUSPECT_FETCH_RETRIES;attempt++){try{const response=await fetch(SUSPECT_DATA_URL);if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}catch(error){lastError=error;if(attempt<SUSPECT_FETCH_RETRIES)await new Promise(r=>setTimeout(r,SUSPECT_FETCH_RETRY_DELAY_MS));}}throw new Error('Failed to load suspects: '+(lastError?.message||String(lastError)));}
async function fetchCaseSuspects(thief,crimeCityId){
 const lab=new CrimeLabManager(gameState,crimeCityId),identityEvidence=lab.ensureIdentityEvidence(),traceEvidence=lab.ensureRandomTraceEvidence();
 const normalized=normalizeHardEvidence([identityEvidence,...traceEvidence]);if(normalized.length!==3)throw new Error('Case setup requires three usable forensic clues.');
 const hardEvidence=normalized.map(({matches,...evidence})=>evidence),data=await fetchSuspectSource(),generator=new SuspectGenerator(data);
 const generated=generator.generateCaseSuspects(thief,crimeCityId,{total:10,hardEvidence});generator.prepareCaseState(generated);
 if(!gameState.currentMission)throw new Error('Current mission is missing during suspect setup.');
 gameState.currentMission={...gameState.currentMission,forensicHardEvidence:structuredClone(generated.hardEvidence),requiredForensicProfile:Object.fromEntries(generated.hardEvidence.map(e=>[e.forensicField,e.normalizedValue])),traceEvidence:structuredClone(traceEvidence)};return generated;
}
function finishCaseSetup(locationsData,template){syncInvestigationState(locationsData);gameState.currentDestinations=generateDestinationsForCurrentCity(locationsData);debugCaseRoute(locationsData,template);
 if(!saveGameState())console.warn('[GameSetup] Case is ready, but autosave was not written.');
 EventBus.emit('case-simplified-notice',{rank:gameState.playerRank,caseIndex:template.caseIndex,stages:template.stages});}
export async function setupNewGame(suspectsData,missionsData,locationsData,difficulty='field'){
 validateSetupData(suspectsData,missionsData,locationsData);const selectedCase=selectCase(suspectsData,missionsData,locationsData);
 const hq=locationsData.find(l=>l.id===HQ_ID||l.city===HQ_CITY);if(!hq)throw new Error('Headquarters city data is missing.');
 clearSavedGame();resetGameState();resetCaseOutcomeState();resetInventory();currentMotive=null;
 const energy=getEnergyManager();energy.init(difficulty);createUnifiedTravelManager().init();getRankManager().init();
 const{caseDirector,template}=buildCaseDirector(0),escapeRoute=createEscapeRoute(locationsData,selectedCase.crimeCityId,template);
 gameState.updateState({currentCity:hq.city,currentCityId:hq.id||HQ_ID,currentCityData:structuredClone(hq),currentEncounterId:null,
 score:0,scoreSaved:false,playerNotes:'',timeSpent:0,travelHistory:[],lastTravel:null,lastTravelEncounter:null,energy:energy.getCurrentEnergy(),difficulty,
 cash:100,agencyBudget:STARTING_AGENCY_BUDGETS[difficulty]??STARTING_AGENCY_BUDGETS.field,agencyDebt:0,moneyLog:[],passport:null,isGameActive:false});
 gameState.replaceIndexedCollection('visitedCities',[hq.id||HQ_ID]);applyCaseConfiguration({selectedCase,caseDirector,template,escapeRoute});
 startInvestigationClock();startScoreSession();await fetchCaseSuspects(gameState.currentThief,selectedCase.crimeCityId);
 gameState.isGameActive=true;finishCaseSetup(locationsData,template);return gameState;
}
export async function advanceToNextCase(suspectsData,missionsData,locationsData){
 return startCampaignInvestigation(suspectsData,missionsData,locationsData,false);
}
export async function retryCurrentCase(suspectsData,missionsData,locationsData){
 if(!gameState.currentMission||!(gameState.caseFailed===true||gameState.finalArrestResult==='FAILURE'))
  throw new Error('[GameSetup] Only a failed investigation can be rerolled.');
 return startCampaignInvestigation(suspectsData,missionsData,locationsData,true);
}
async function startCampaignInvestigation(suspectsData,missionsData,locationsData,retry){
 validateSetupData(suspectsData,missionsData,locationsData);
 const caseIndex=retry?currentCampaignCaseIndex(gameState):nextCampaignCaseIndex(gameState);
 const old={caseKey:getEvidenceCaseKey(gameState),caseId:gameState.currentCaseId,missionId:gameState.currentMission?.id??gameState.currentMission?.missionId};
 const selectedCase=selectCase(suspectsData,missionsData,locationsData,retry);
 const{caseDirector,template}=buildCaseDirector(caseIndex),escapeRoute=createEscapeRoute(locationsData,selectedCase.crimeCityId,template);
 if(retry){
  inventoryManager.close();
  for(const item of [...inventoryManager.getAllItems()])if(retryInventoryItem(item,old)&&!inventoryManager.removeItem(item.id))throw new Error('Could not remove obsolete case evidence.');
  gameState.updateState({inventory:inventoryManager.exportState(),
   apartmentProgress:clearAttemptApartments(gameState.apartmentProgress,[old.missionId,selectedCase.mission.id??selectedCase.mission.missionId]),
   specialScenesVisited:clearMissionVisitFlags(gameState.specialScenesVisited,[old.missionId,selectedCase.mission.id??selectedCase.mission.missionId]),
   specialScenesCompleted:clearMissionVisitFlags(gameState.specialScenesCompleted,[old.missionId,selectedCase.mission.id??selectedCase.mission.missionId]),
   crimeBoardData:{visitedCrimeScenes:[],sceneFoundObjects:[]},hiddenObjectHistory:[],
   suspectFilesPhoneDecisions:{},playerNotes:'',scoreSaved:false});
 }
 resetCaseOutcomeState();currentMotive=null;applyCaseConfiguration({selectedCase,caseDirector,template,escapeRoute});
 startInvestigationClock();await fetchCaseSuspects(gameState.currentThief,selectedCase.crimeCityId);
 gameState.isGameActive=true;gameState.scoreSaved=false;finishCaseSetup(locationsData,template);return gameState;
}
