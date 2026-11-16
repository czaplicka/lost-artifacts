import { MomsNotProudScene } from './MomsNotProudScene.js';
import { getCurrentTownId, canStartRoadTrip } from '../managers/RoadTripManager.js';
import { HOME_TOWN_ID } from '../config/RoadTripTowns.js';
import { PIZZERIA_TOWN_ID, returnFromPizzeria, hasPizzeriaTravelSession } from '../managers/MomsNotProudTravel.js';

export class MomsNotProudRoadScene extends MomsNotProudScene {
  constructor(){super();this.sys.settings.key='MomsNotProudRoadScene';}
  create(){
    if(getCurrentTownId()!==PIZZERIA_TOWN_ID||!hasPizzeriaTravelSession()){
      this.cameras.main.setBackgroundColor('#101923');
      this.add.text(30,40,'Travel to WhateverVille through Moretti’s email first.',{fontFamily:'SpecialElite',fontSize:'24px',color:'#ffffff'});
      return;
    }
    super.create();
  }
  button(label,action,parent=this.buttons,disabled=false){
    if(label==='RETURN TO OFFICE') return super.button('DRIVE HOME',()=>this.driveHome(),parent,disabled);
    return super.button(label,action,parent,disabled);
  }
  driveHome(){
    const check=canStartRoadTrip(getCurrentTownId(),HOME_TOWN_ID,{mode:'pi'});
    const body=check.ok
      ? `Drive from WhateverVille to Home Town.\n\nFuel: $${check.quote.fuelCost}\nDistance: ${check.quote.km} km\n\nPI travel does not consume energy or advance the agency clock. Driving fines and collected coins still count.\n\nYour observation progress is saved.`
      : check.message+'\n\nYou remain at the pizzeria. Your progress has not been lost.';
    const box=this.open('Return journey',body);
    if(check.ok)this.button('START RETURN DRIVE',()=>{
      const result=returnFromPizzeria(this);
      if(!result.ok){this.close();this.say(result.message);}
    },box);
    this.button('STAY HERE',()=>this.close(),box);
  }
}
