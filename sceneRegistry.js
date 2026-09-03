// sceneRegistry.js
// Central map of every lazy scene in the game.
// Nothing here is imported eagerly — each entry is a function that returns
// a dynamic import() promise. The module (and everything it imports) is only
// fetched by the browser the first time `loader()` actually runs.
//
// TIERS explain WHEN a scene is realistically needed, so we can:
//  - keep TIER_0 in the Phaser `scene:[...]` config (always resident)
//  - lazy-load TIER_1/2/3 on demand via SceneLoader
//  - optionally prefetch the *next* tier in the background while the
//    player is busy in the current one (see SceneLoader.prefetchTier)

export const SCENE_TIERS = {
  // Always in memory: boot chain, menu/auth flow, persistent overlays.
  TIER_0: [
    'BootScene',
    'PreloaderScene',
    'MenuScene',
    'SettingsScene',
    'EnterScene',
    'PlayerHudScene',
    'UIScene',
    'NewsHud',
    'LoadingOverlayScene'
  ],

  // Core office/city gameplay loop, loaded right after login/character creation.
  TIER_1: [
    'GameScene',
    'OfficeScene',
    'HighscoreScene',
    'CityScene',
    'LocationScene',
    'TravelTransitionScene',
    'HotelScene',
    'CrimeCityScene',
    'IntroScene',
    'PhoneCallScene',
    'NewsstandScene',
    'NewspaperOverlayScene',
    'TvBroadcastScene',
    'GameOverScene',
    'DifficultyScene',
    'CharacterCreationScene'
  ],

  // Case-investigation layer: suspects, theories, arrest, endings.
  TIER_2: [
    'SuspectsBoardScene',
    'SuspectGridScene',
    'HypothesisScene',
    'TheoryResultCallScene',
    'WantedDatabaseScene',
    'RecoveredArtifactsScene',
    'ArrestSelectionScene',
    'SuccessScene',
    'AgainScene'
  ],

  // Crime scene + forensics lab mini-games: heaviest, most niche assets.
  TIER_3: [
    'HiddenObjectsScene',
    'CrimeLabScene',
    'HairAnalysisScene',
    'ToolmarkAnalysisScene',
    'FiberAnalysisScene',
    'FingerprintScene',
    'ShoeprintScene',
    'BloodAnalysisScene',
    'DnaGenderScene',
    'FingerprintPatternScene'
  ]
};

// key -> loader(). Loader must resolve to a module with a default export
// (the Phaser.Scene class).
export const sceneRegistry = {
  // ---- TIER 0 (eager, but listed here too so SceneLoader.ensure() works
  //      uniformly even for scenes already registered in main.js) ----
  BootScene: () => import('./scenes/BootScene.js').then(m => m.BootScene),
  PreloaderScene: () => import('./scenes/PreloaderScene.js').then(m => m.PreloaderScene),
  MenuScene: () => import('./scenes/MenuScene.js').then(m => m.MenuScene),
  SettingsScene: () => import('./scenes/SettingsScene.js').then(m => m.SettingsScene),
  EnterScene: () => import('./scenes/EnterScene.js').then(m => m.EnterScene),
  PlayerHudScene: () => import('./scenes/PlayerHudScene.js').then(m => m.PlayerHudScene),
  UIScene: () => import('./ui/UIScene.js').then(m => m.UIScene),
  NewsHud: () => import('./ui/NewsHud.js').then(m => m.NewsHud),
  LoadingOverlayScene: () => import('./scenes/LoadingOverlayScene.js').then(m => m.LoadingOverlayScene),

  // ---- TIER 1 ----
  GameScene: () => import('./scenes/GameScene.js').then(m => m.GameScene),
  OfficeScene: () => import('./scenes/OfficeScene.js').then(m => m.OfficeScene),
  HighscoreScene: () => import('./scenes/HighscoreScene.js').then(m => m.HighscoreScene),
  CityScene: () => import('./scenes/CityScene.js').then(m => m.CityScene),
  LocationScene: () => import('./scenes/LocationScene.js').then(m => m.LocationScene),
  TravelTransitionScene: () => import('./scenes/TravelTransitionScene.js').then(m => m.TravelTransitionScene),
  HotelScene: () => import('./scenes/HotelScene.js').then(m => m.HotelScene),
  CrimeCityScene: () => import('./scenes/CrimeCityScene.js').then(m => m.CrimeCityScene),
  IntroScene: () => import('./scenes/IntroScene.js').then(m => m.IntroScene),
  PhoneCallScene: () => import('./scenes/PhoneCallScene.js').then(m => m.PhoneCallScene),
  NewsstandScene: () => import('./scenes/NewsstandScene.js').then(m => m.NewsstandScene),
  NewspaperOverlayScene: () => import('./scenes/NewspaperOverlayScene.js').then(m => m.NewspaperOverlayScene),
  TvBroadcastScene: () => import('./scenes/TvBroadcastScene.js').then(m => m.TvBroadcastScene),
  GameOverScene: () => import('./scenes/GameOverScene.js').then(m => m.GameOverScene),
  DifficultyScene: () => import('./scenes/DifficultyScene.js').then(m => m.DifficultyScene),
  CharacterCreationScene: () => import('./scenes/CharacterCreationScene.js').then(m => m.CharacterCreationScene),

  // ---- TIER 2 ----
  SuspectsBoardScene: () => import('./scenes/SuspectsScene.js').then(m => m.SuspectsScene),
  SuspectGridScene: () => import('./scenes/SuspectGridScene.js').then(m => m.SuspectGridScene),
  HypothesisScene: () => import('./scenes/HypothesisScene.js').then(m => m.HypothesisScene),
  TheoryResultCallScene: () => import('./scenes/TheoryResultCallScene.js').then(m => m.TheoryResultCallScene),
  WantedDatabaseScene: () => import('./scenes/WantedDatabaseScene.js').then(m => m.WantedDatabaseScene),
  RecoveredArtifactsScene: () => import('./scenes/RecoveredArtifactsScene.js').then(m => m.RecoveredArtifactsScene),
  ArrestSelectionScene: () => import('./scenes/ArrestSelectionScene.js').then(m => m.ArrestSelectionScene),
  SuccessScene: () => import('./scenes/SuccessScene.js').then(m => m.SuccessScene),
  AgainScene: () => import('./scenes/AgainScene.js').then(m => m.AgainScene),

  // ---- TIER 3 (CSI) ----
  HiddenObjectsScene: () => import('./scenes/HiddenObjectsScene.js').then(m => m.HiddenObjectsScene),
  CrimeLabScene: () => import('./scenes/CSI/CrimeLabScene.js').then(m => m.CrimeLabScene),
  HairAnalysisScene: () => import('./scenes/CSI/HairAnalysisScene.js').then(m => m.HairAnalysisScene),
  ToolmarkAnalysisScene: () => import('./scenes/CSI/ToolmarkAnalysisScene.js').then(m => m.ToolmarkAnalysisScene),
  FiberAnalysisScene: () => import('./scenes/CSI/FiberAnalysisScene.js').then(m => m.FiberAnalysisScene),
  FingerprintScene: () => import('./scenes/CSI/FingerprintScene.js').then(m => m.FingerprintScene),
  ShoeprintScene: () => import('./scenes/CSI/ShoeprintScene.js').then(m => m.ShoeprintScene),
  BloodAnalysisScene: () => import('./scenes/CSI/BloodAnalysisScene.js').then(m => m.BloodAnalysisScene),
  DnaGenderScene: () => import('./scenes/CSI/DnaGenderScene.js').then(m => m.DnaGenderScene),
  FingerprintPatternScene: () => import('./scenes/CSI/FingerprintPatternScene.js').then(m => m.FingerprintPatternScene)
};

export function tierOf(key) {
  for (const [tier, keys] of Object.entries(SCENE_TIERS)) {
    if (keys.includes(key)) return tier;
  }
  return null;
}