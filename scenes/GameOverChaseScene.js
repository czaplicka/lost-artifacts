import { GameOverScene as OriginalScene } from './GameOverScene.js';
import { settleChase } from '../systems/chasePersistence.js';
export class GameOverScene extends OriginalScene {
  create() {
    super.create();
    settleChase('GameOverScene');
  }
}
