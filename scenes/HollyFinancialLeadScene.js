import { HollyCaseCallScene } from './HollyCaseCallScene.js';
import { hollyFinancialData,getHollyFinancialState,storeHollyFinancial } from '../hollyFinancialLeadService.js';
import { normalizeHollySurvival,advanceHollySurvival } from '../hollySurvivalUpdateModel.js';
export class HollyFinancialLeadScene extends HollyCaseCallScene{
  constructor(){super('HollyFinancialLeadScene',{data:hollyFinancialData,getState:getHollyFinancialState,save:storeHollyFinancial,normalize:normalizeHollySurvival,advance:advanceHollySurvival});}
}
