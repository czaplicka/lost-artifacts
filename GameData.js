// Fasada: reszta gry nadal importuje wszystko z './GameData.js'.
// Prawdziwy kod mieszka w folderze gameState/.

export {
  defaultGameState,
  createDefaultReconstructedHeist
} from './gameState/defaultState.js';

export { cloneDefaultState } from './gameState/importExport.js';

export {
  gameState,
  resetGameState,
  resetCaseOutcomeState,
  resetReconstructedHeist
} from './gameState/gameStateProxy.js';