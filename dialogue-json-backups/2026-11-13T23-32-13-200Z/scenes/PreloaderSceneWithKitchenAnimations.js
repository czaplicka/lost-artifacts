import { PreloaderScene as OriginalPreloaderScene } from './PreloaderScene.js';
import { KitchenAmbientAnimations } from './kitchen/KitchenAmbientAnimations.js';

export class PreloaderScene extends OriginalPreloaderScene {
  _createPreloadBackground(width,height){
    this.kitchenAmbientAnimations?.destroy();
    this.kitchenAmbientAnimations=null;
    super._createPreloadBackground(width,height);
    const background=[...this.children.list].reverse().find(
      item=>item.type==='Image'&&item.texture?.key==='cozyBackground'
    );
    if(background?.active)this.kitchenAmbientAnimations=new KitchenAmbientAnimations(this,background);
  }

  _cleanupPreloader(){
    this.kitchenAmbientAnimations?.destroy();
    this.kitchenAmbientAnimations=null;
    super._cleanupPreloader();
  }
}
