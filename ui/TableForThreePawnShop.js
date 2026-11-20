import { LombardScene } from '../scenes/LombardScene.js';
import { readTableForThree } from '../managers/TableForThreeService.js';
import { buyTableForThreeRing } from '../managers/TableForThreeRestaurantService.js';
import { TABLE_FOR_THREE_RESTAURANT_CONFIG as C } from '../config/TableForThreeRestaurantConfig.js';
import { getCurrentTownId } from '../managers/RoadTripManager.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
let installed=false;
export function installTableForThreePawnShop(){
  if(installed)return;installed=true;
  const original=LombardScene.prototype.talkBroker;
  LombardScene.prototype.talkBroker=function(...args){
    const s=readTableForThree();
    if(!s||!['ring','kitchen'].includes(s.stage)||s.ringHandedOver||getCurrentTownId()!==L.company.townId)return original.apply(this,args);
    this.show('Ziggy',`“A romantic surprise? I sell those by the failed marriage.”\n\nRing and presentation box: $${C.ringPrice}.`,[
      [s.ringPurchased?'COLLECT / CHECK RING':`BUY RING — $${C.ringPrice}`,()=>{
        const result=buyTableForThreeRing();
        this.show('Ziggy',result.message,[['OTHER BUSINESS',()=>original.apply(this,args)],['GOODBYE',()=>this.closePanel()]],true);
      }],
      ['OTHER BUSINESS',()=>original.apply(this,args)],['GOODBYE',()=>this.closePanel()]
    ],true);
  };
}
