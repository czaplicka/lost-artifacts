import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
      item=>item.type===__dialogueText("scenes/CitySceneWithAnimations.js", "t_1aa4cb0bcca76e92e306")&&item.texture?.key===key
    );
    if(background?.active){
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
