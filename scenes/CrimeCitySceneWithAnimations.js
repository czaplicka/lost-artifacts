import { CrimeCityScene as OriginalCrimeCityScene } from './CrimeCityScene.js';
import { BerlinMapAnimations } from './crimeCity/BerlinMapAnimations.js';

export class CrimeCityScene extends OriginalCrimeCityScene {
  createCrimeCityContent(...args){
    super.createCrimeCityContent(...args);
    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations=null;
    const bg=this.mapUI?.background;
    if(this.cityId==='berlin'&&bg?.active){
      this.berlinMapAnimations=new BerlinMapAnimations(this,bg);
    }
  }

  destroyControllers(...args){
    this.berlinMapAnimations?.destroy();
    this.berlinMapAnimations=null;
    super.destroyControllers(...args);
  }
}
