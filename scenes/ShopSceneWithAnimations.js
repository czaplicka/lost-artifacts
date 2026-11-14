import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { ShopScene as OriginalShopScene } from './ShopScene.js';
import { ShopAmbientAnimations } from './shop/ShopAmbientAnimations.js';

export class ShopScene extends OriginalShopScene {
  create() {
    super.create();
    const background=[...this.children.list].reverse().find(
      item=>item.type===__dialogueText("scenes/ShopSceneWithAnimations.js", "t_1aa4cb0bcca76e92e306")&&item.texture?.key==='shop_bg'
    );
    if(background?.active){
      this.shopAmbientAnimations=new ShopAmbientAnimations(this,background);
    }else{
      this.shopAmbientAnimations=null;
      console.warn('[ShopAmbientAnimations] shop_bg image not found.');
    }
  }
}
