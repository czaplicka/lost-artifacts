import { SuccessScene as OriginalScene } from './SuccessScene.js';
import { settleChase } from '../systems/chasePersistence.js';
export class SuccessScene extends OriginalScene {
  create() {
    super.create();
    settleChase('SuccessScene');
  }
}
