import { BaseScene } from './BaseScene.js';
import { TableForThreePanel } from '../ui/TableForThreePanel.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { confirmTableForThreeArrival, returnTableForThreeHome } from '../managers/TableForThreeLocations.js';

export class TableForThreeRestaurantScene extends BaseScene {
  constructor(){super({key:L.restaurant.sceneKey});}
  create(){
    super.create();this.panel=new TableForThreePanel(this);
    const arrival=confirmTableForThreeArrival();
    if(!arrival.ok){this.panel.render('Location unavailable',arrival.reason,[['DRIVE HOME',()=>this.home()]]);return;}
    this.menu();
  }
  menu(){
    this.panel.render(L.restaurant.name+' — WhateverVille',
      'You have arrived at the restaurant identified in the office calendar. Table 6 is inside.\n\nDevelopment checkpoint: the location and actual road trip are connected. The photographic restaurant scene is not included in this build. No evidence is granted by this screen.',
      [['DRIVE HOME',()=>this.home()]]);
  }
  async home(){
    const result=await returnTableForThreeHome(this);
    if(!result.ok)this.panel.render('Cannot travel',result.message||result.reason||'Travel was cancelled.',[['BACK',()=>this.menu()]]);
  }
}
