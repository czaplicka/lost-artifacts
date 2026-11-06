import { HollyCaseCallScene } from './HollyCaseCallScene.js';
import { hollySurvivalData,getHollySurvivalState,storeHollySurvival } from '../hollySurvivalUpdateService.js';
import { normalizeHollySurvival,advanceHollySurvival } from '../hollySurvivalUpdateModel.js';
export class HollySurvivalUpdateScene extends HollyCaseCallScene{
  constructor(){super('HollySurvivalUpdateScene',{data:hollySurvivalData,getState:getHollySurvivalState,save:storeHollySurvival,normalize:normalizeHollySurvival,advance:advanceHollySurvival});}
}
