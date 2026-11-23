import { assertIsolation } from './isolation.js';
import { AssetManager } from '../../managers/AssetManager.js';
import { BootScene } from '../../scenes/BootScene.js';
import { PreloaderScene } from '../../scenes/PreloaderScene.js';
import { SettingsScene } from '../../scenes/SettingsScene.js';
import { EnterScene } from '../../scenes/EnterScene.js';
import { PlayerHudScene } from '../../scenes/PlayerHudScene.js';
import { UIScene } from '../../ui/UIScene.js';
import { NewsHud } from '../../ui/NewsHud.js';
import { LoadingOverlayScene } from '../../scenes/LoadingOverlayScene.js';
import { SceneLoader } from '../../SceneLoader.js';
import { sceneRegistry } from '../../sceneRegistry.js';
import { GAME_VERSION } from '../../config/gameVersion.js';
import { RandomEventScene } from '../../scenes/RandomEventScene.js';
import { RandomEventSystem } from '../../systems/RandomEventSystem.js';
import { bindCaseTimeGame } from '../../managers/CaseTimeWatcher.js';
import { getReedContactService } from '../../managers/ReedContactService.js';
import { installAchievementSystem } from '../../managers/AchievementManager.js';
import { installChaseTutorial } from '../../tutorials/chase/ChaseTutorial.js';
import '../../managers/PICaseRewards.js';
import { gameState } from '../../GameData.js';
import { setupNewGame, advanceToNextCase } from '../../gameSetup.js';
import { CASE_SEQUENCE_VERSION } from '../../caseSequence.js';
import { MAIN_STORY_STAGES } from '../../MainStoryData.js';
import { MainStoryManager } from '../../managers/MainStoryManager.js';
import { getRankManager } from '../../managers/RankManager.js';
import { syncInvestigationState, generateDestinationsForCurrentCity } from '../../managers/InvestigationManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { createDefaultPlayerData, getProfile } from '../../ui/characterCreation/CharacterCreationData.js';
import { getAppearanceSummary } from '../../ui/characterCreation/AppearanceControls.js';
import { getStart } from './presets.js';
const idOf = city => String(city.id ?? city.city);
function requireArray(scene, key) {
  const data = scene.cache.json.get(key);
  if (!Array.isArray(data) || !data.length) throw new Error('Brak danych: ' + key);
  return data;
}
async function prepareCase(scene, options) {
  const allThieves = requireArray(scene, 'suspects');
  const allMissions = requireArray(scene, 'missions');
  const locations = requireArray(scene, 'locations');
  const thieves = options.thiefId ? allThieves.filter(thief => String(thief.id) === options.thiefId) : allThieves;
  if (!thieves.length) throw new Error('Wybrany złodziej już nie istnieje.');
  let missions = allMissions;
  if (options.missionIndex != null) {
    if (!Number.isSafeInteger(options.missionIndex) || !allMissions[options.missionIndex]) throw new Error('Wybrana sprawa już nie istnieje.');
    missions = [allMissions[options.missionIndex]];
  }
  if (options.crimeCityId) {
    const city = locations.find(item => idOf(item) === options.crimeCityId && item.isCrimeCity === true);
    if (!city) throw new Error('Niepoprawne miasto przestępstwa.');
    missions = missions.filter(mission => mission.city === city.city);
  }
  if (!missions.length) throw new Error('Wybrana sprawa nie pasuje do miasta.');
  await setupNewGame(thieves, missions, locations, 'field');
  const index = options.caseNumber - 1;
  if (index > 0) {
    gameState.updateState({ caseSequence: { version: CASE_SEQUENCE_VERSION, index: index - 1 } });
    await advanceToNextCase(thieves, missions, locations);
  }
  const player = createDefaultPlayerData();
  const profile = getProfile(player.profile);
  gameState.updateState({
    playerName: 'Test Detective', agentName: 'Test Detective', playerAlias: 'SANDBOX',
    detectiveProfile: player.profile, profileBonus: profile?.bonus ?? null,
    detectiveStats: { ...player.stats }, appearance: { ...player.appearance },
    appearanceSummary: getAppearanceSummary(player.appearance),
    casesSolved: index, completedCaseIds: Array.from({ length: index }, (_, i) => 'test-completed-' + i)
  });
  const rank = getRankManager();
  rank.restore();
  gameState.rankProgress = { casesSolved: index, currentRankId: gameState.playerRank, nextRank: rank.getUpcomingRanks()[0] || null };
  MainStoryManager.resetProgress({ silent: true });
  const stage = MAIN_STORY_STAGES.find(item => item.id === options.storyStage);
  if (!stage) throw new Error('Wybrany etap fabuły już nie istnieje.');
  for (const reached of [...MAIN_STORY_STAGES].sort((a, b) => a.order - b.order)) {
    if (reached.order > stage.order) break;
    if (!MainStoryManager.advanceToStage(reached.id, { force: true })) throw new Error('Nie można ustawić etapu fabuły.');
  }
  MainStoryManager.setFlag('recruitment_flashback_seen', true);
  for (const [key, value] of Object.entries(options.flags)) MainStoryManager.setFlag(key, value);
  gameState.mainStory = MainStoryManager.serialize();
  const start = getStart(options.start);
  let city = start.place === 'hq' ? locations.find(item => idOf(item) === String(gameState.currentCityId))
    : start.place === 'selected' && options.startCityId ? locations.find(item => idOf(item) === options.startCityId)
    : locations.find(item => idOf(item) === String(gameState.crimeCityId));
  if (!city) throw new Error('Brak danych miasta startowego.');
  gameState.updateState({ currentCity: city.city, currentCityId: idOf(city), currentCityData: structuredClone(city) });
  syncInvestigationState(locations);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  scene.registry.set('gameState', gameState);
  scene.registry.set('locationsData', structuredClone(locations));
  scene.registry.set('difficulty', gameState.difficulty);
  scene.registry.set('authMode', 'guest');
  saveGameState();
  return start;
}
function sceneData(start) {
  const mission = gameState.currentMission;
  const cityId = gameState.currentCityId;
  const data = {
    gameState, cityId, mission, fromSave: false, isNewGame: false,
    startOnboarding: false, authMode: 'guest', returnScene: 'CrimeCityScene',
    returnData: { cityId: gameState.crimeCityId }, sourceScene: 'CrimeCityScene'
  };
  if (start.id === 'hidden') {
    if (!mission?.scene) throw new Error('Sprawa nie ma zdefiniowanego miejsca hidden objects.');
    Object.assign(data, { sceneId: mission.scene, itemSceneKey: mission.scene, mapKey: mission.scene });
  }
  if (start.id === 'apartment') {
    data.suspectId = gameState.realThiefSuspectId || gameState.trueThiefCaseSuspectId || gameState.realThiefCaseSuspectId;
    if (!data.suspectId) throw new Error('Generator nie ustawił publicznej tożsamości złodzieja.');
  }
  return data;
}
function waitForCreate(scene, invoke) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { scene.events.off('create', ready); reject(new Error('Przekroczono czas uruchamiania sceny: ' + scene.sys.settings.key)); }, 60000);
    const ready = () => { clearTimeout(timer); resolve(); };
    scene.events.once('create', ready);
    Promise.resolve().then(invoke).catch(error => { clearTimeout(timer); scene.events.off('create', ready); reject(error); });
  });
}
async function enterTest(scene, options, report) {
  const start = await prepareCase(scene, options);
  const game = scene.game;
  if (start.preview) {
    const parentKey = ['alex-preview', 'holly-preview'].includes(start.id) ? 'AgencyStorageScene' : 'OfficeScene';
    const parent = await game.sceneLoader.ensure(parentKey);
    await waitForCreate(parent, async () => {
      if (!await game.sceneLoader.goto(scene, parentKey, sceneData(start))) throw new Error('Nie można uruchomić sceny bazowej.');
    });
    const module = await import(new URL('../../' + start.module, import.meta.url).href);
    const SceneClass = module[start.scene];
    if (typeof SceneClass !== 'function') throw new Error('Brak klasy sceny: ' + start.scene);
    if (!game.scene.keys[start.scene]) game.scene.add(start.scene, SceneClass, false);
    const target = game.scene.getScene(start.scene);
    await waitForCreate(target, async () => {
      const opened = await game.sceneLoader.launch(parent, start.scene, {
        ...sceneData(start), preview: true, returnSceneKey: parentKey,
        onFinished: () => report({ type: 'info', detail: 'Podgląd sceny zakończony: ' + start.scene })
      });
      if (!opened) throw new Error('Nie można otworzyć podglądu.');
    });
    game.scene.bringToTop(start.scene);
  } else {
    const target = await game.sceneLoader.ensure(start.scene);
    await waitForCreate(target, async () => {
      if (!await game.sceneLoader.goto(scene, start.scene, sceneData(start))) throw new Error('Nie można uruchomić punktu testowego.');
    });
  }
  report({ type: 'running', detail: 'Uruchomiono ' + start.label + '; misja ' + options.caseNumber + '; złodziej: ' + (gameState.currentThief?.name || gameState.currentThiefId) });
}
export async function startTestGame(options, report, fail) {
  assertIsolation();
  class TestBootScene extends BootScene {
    _initializeGameState() { this.registry.remove('gameStateFailed'); }
    _initializeMobileFullscreen() {}
    showStudioCard() { this._proceedToPreloader(); }
  }
  class TestPreloaderScene extends PreloaderScene {
    preload() {
      super.preload();
      const manifest = this.cache.json.get('assetManifest');
      for (const key of ['suspects', 'missions', 'locations']) {
        if (this.cache.json.exists(key) || this._queuedAssets.has('json:' + key)) continue;
        const entry = manifest?.json?.find(item => item.key === key);
        if (!entry?.url) throw new Error('Brak danych w manifeście: ' + key);
        this._queueJson(key, entry.url);
      }
    }
    tryShowStartButton() {
      if (this._testStarting || this._cleanupDone) return;
      this._testStarting = true;
      void enterTest(this, options, report).catch(fail);
    }
    _showLoadingError(message) { super._showLoadingError(message); fail(new Error(message)); }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, width: 1920, height: 1080, parent: 'game-container', backgroundColor: '#000000',
    scene: [TestBootScene, TestPreloaderScene, SettingsScene, EnterScene, PlayerHudScene, UIScene, NewsHud, LoadingOverlayScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound: true },
    audio: { disableWebAudio: false }
  });
  window.game = game;
  game.assets = new AssetManager(game);
  game.sceneLoader = new SceneLoader(game, sceneRegistry);
  game.buildVersion = GAME_VERSION;
  bindCaseTimeGame(game);
  getReedContactService(game);
  RandomEventSystem.install(game, RandomEventScene);
  installAchievementSystem(game);
  installChaseTutorial(game);
  let resizeTimer;
  const resize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => game.events.emit('game-resize-settled', game.scale.gameSize), 120);
  };
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  game.events.once('destroy', () => {
    clearTimeout(resizeTimer); window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
  });
  return game;
}
