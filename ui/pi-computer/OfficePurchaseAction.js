import { NEW_PI_OFFICE_ID, buyOfficeItem } from '../../managers/PIOfficeShopManager.js';
import { PIGEON_FEED_ID, buyPigeonFeed } from '../../managers/PigeonFeedShopManager.js';
import { computerUiCanInteract } from './ComputerUiAudio.js';
import { playOfficePurchaseAudio } from './OfficePurchaseAudio.js';
const busy=new WeakSet();
export function createOfficePurchaseButton(shop,x,y,item,previewBounds){
 const ui=shop.ui,token=ui.viewToken;
 const button=ui.drawing.button(x,y,'CONFIRM',()=>{});
 button.removeAllListeners('pointerdown');
 button.on('pointerdown',()=>{
  if(busy.has(shop)||!computerUiCanInteract(ui)||ui.booting||ui.app!=='office-shop'||ui.viewToken!==token||
    button.active===false||!button.scene||shop.pendingId!==item.id||shop.products()[shop.page]?.id!==item.id)return;
  busy.add(shop);
  try{
   const feed=item.id===PIGEON_FEED_ID;
   const result=feed?buyPigeonFeed(shop.feedItem):buyOfficeItem(shop.catalog,item.id);
   shop.pendingId=null;shop.noticeOk=result?.ok===true;ui.notice=result?.message||'';
   if(result?.ok===true)playOfficePurchaseAudio(ui);
   ui.render();
   if(result?.ok&&!feed)ui.scene.handleOfficePurchase?.(item.id,item.id===NEW_PI_OFFICE_ID?previewBounds:null);
  }finally{busy.delete(shop);}
 });
 return button;
}
