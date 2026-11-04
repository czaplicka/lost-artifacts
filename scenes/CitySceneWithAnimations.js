import { CityScene as OriginalCityScene } from './CityScene.js';
import { WarsawPanoramaAnimations } from './city/WarsawPanoramaAnimations.js';

export class CityScene extends OriginalCityScene {
  createBackground(city){
    this.warsawPanoramaAnimations?.destroy();
    this.warsawPanoramaAnimations=null;
    super.createBackground(city);
    if(this.cityId!=='warsaw')return;
    const key=city.backgroundKey||this.getCityBackgroundKey(city);
    const background=[...this.children.list].reverse().find(
      item=>item.type==='Image'&&item.texture?.key===key
    );
    if(background?.active){
      // Keep decorative motion under all original city UI, including depth-0 objects.
      background.setDepth(-10);
      this.warsawPanoramaAnimations=new WarsawPanoramaAnimations(this,background);
    }
  }

  cleanupScene(...args){
    this.warsawPanoramaAnimations?.destroy();
    this.warsawPanoramaAnimations=null;
    return super.cleanupScene(...args);
  }
}
