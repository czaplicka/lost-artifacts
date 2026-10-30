import { BaseScene } from './BaseScene.js';
import { isDeadMailPreviewEnabled, getDeadMailProgress } from '../managers/DeadMailManager.js';
import { getDeadMailNightProgress } from '../managers/DeadMailNightManager.js';
import { openPayPalSandbox } from '../ui/PayPalSandboxCheckout.js';

const SCENE_KEY='ExpansionStoreScene';
const PRODUCTS=[
 {id:'dead_mail',category:'HALLOWEEN / PI CASE',title:'DEAD\nMAIL',location:'Blackthorn Cemetery',description:'A parcel for a dead woman.\nShe would like to complain\nin person.',
 contents:['Day investigation: chapters 1–2 (local preview)','Night surveillance: chapter 3 (local preview)','Controlled delivery and report: chapter 4 (local preview)','Exclusive local achievement and souvenir phone'],monitor:'DELIVERY STATUS:\n\nRECIPIENT ALIVE',stamp:'DEAD LETTER'},
 {id:'case_missing_exhibit',category:'CASE FILE',title:'THE MISSING\nEXHIBIT',location:'A standalone investigation',description:'An exhibit has disappeared.\nThe museum director calls it\n"an interactive experience".',contents:['One additional investigation','New witnesses and dialogue','A new crime scene','A very defensive museum director'],monitor:'EXHIBIT STATUS:\n\nNOT EXHIBITING',stamp:'CLASSIFIED'},
 {id:'city_pack',category:'CITY PACK',title:'NEXT STOP:\nTROUBLE',location:'A new destination',description:'New streets. New suspects.\nThe same deeply inadequate\nagency travel allowance.',contents:['An additional city','New locations and characters','Additional investigations','More questionable local advice'],monitor:'TRAVEL REQUEST:\n\nUNDER REVIEW',stamp:'OVERSEAS'},
 {id:'story_expansion',category:'STORY EXPANSION',title:'THE FILE\nNOBODY FILED',location:'An additional agency story',description:'Someone buried this case.\nUnfortunately, they used\nthe alphabetical filing system.',contents:['An additional story arc','New agency characters','New evidence and conversations','Administrative misconduct'],monitor:'FILE FOUND:\n\nPLEASE PANIC',stamp:'RESTRICTED'}
];
let openingPromise=null;
export async function openExpansionStore(){
 if(openingPromise)return openingPromise;
 openingPromise=(async()=>{
  const game=window.game;if(!game?.scene)throw new Error('The game is not ready.');
  if(!game.scene.keys[SCENE_KEY])game.scene.add(SCENE_KEY,ExpansionStoreScene,false);
  if(!game.scene.isActive(SCENE_KEY))game.scene.start(SCENE_KEY);game.scene.bringToTop(SCENE_KEY);
 })();try{return await openingPromise;}finally{openingPromise=null;}
}
export class ExpansionStoreScene extends BaseScene{
 constructor(){super({key:SCENE_KEY});}
 preload(){if(!this.textures.exists('shopping'))this.load.image('shopping','assets/shopping.webp');}
 create(){
  super.create();this.productIndex=0;this.pausedSceneKeys=[];this.hiddenElements=[];this.productObjects=[];this.detailsLayer=null;this.launching=false;this.disposed=false;
  this.events.once('shutdown',this.restoreGame,this);this.suspendGame();this.cameras.main.setBackgroundColor('#0b0b12');this.root=this.add.container(0,0);
  if(this.textures.exists('shopping'))this.root.add(this.add.image(960,540,'shopping').setDisplaySize(1920,1080));else this.root.add(this.add.rectangle(960,540,1920,1080,0x29201b));
  this.addText(70,28,'MARK AGENCY / EXTRA CASES',22,'#e8d9b0',{fontFamily:'PressStart2P'});
  this.addText(70,70,'Additional assignments. Additional paperwork.',24,'#c4b69a');
  this.button(1500,48,'PAYPAL TEST',()=>openPayPalSandbox(this),{width:270,height:54,fill:0x493b2c});
  this.button(1790,48,'CLOSE',()=>this.closeStore(),{width:180,height:54,fill:0x29231f});
  this.button(575,820,'<',()=>this.changeProduct(-1),{width:64,height:64});this.button(974,820,'>',()=>this.changeProduct(1),{width:64,height:64});
  this.addText(286,755,'MY COLLECTION',19,'#e7d5af',{angle:-12});this.addText(278,798,'Use PayPal Test',20,'#c2ae8b',{angle:-12});
  this.addText(960,1024,'CATALOG PREVIEW — PAYPAL TEST: SANDBOX ONLY / 1 EUR',18,'#d8c9a7',{originX:.5});
  this.drawProduct();this.fitLayout();this.scale.on('resize',this.fitLayout,this);
  if(this.input.keyboard){
   this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>{if(this.detailsLayer)this.closeDetails();else this.closeStore();});
   this.trackInputEvent(this.input.keyboard,'keydown-LEFT',()=>{if(!this.detailsLayer)this.changeProduct(-1);});
   this.trackInputEvent(this.input.keyboard,'keydown-RIGHT',()=>{if(!this.detailsLayer)this.changeProduct(1);});
  }
 }
 suspendGame(){
  this.getPlayerHudScene()?.closeAllUIPanels?.();
  for(const scene of [...this.scene.manager.getScenes(true)]){const key=scene.sys.settings.key;if(key!==SCENE_KEY&&this.scene.isActive(key)){this.pausedSceneKeys.push(key);this.scene.pause(key);}}
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){
   const element=document.querySelector(selector);if(!element)continue;
   this.hiddenElements.push({element,value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')});element.style.setProperty('display','none','important');
  }
 }
 restoreGame(){
  this.disposed=true;this.scale.off('resize',this.fitLayout,this);
  for(const{element,value,priority}of this.hiddenElements){if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');}
  for(const key of this.pausedSceneKeys)if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
  this.hiddenElements=[];this.pausedSceneKeys=[];
 }
 fitLayout(){if(!this.root)return;const s=Math.min(this.scale.width/1920,this.scale.height/1080);this.root.setScale(s).setPosition((this.scale.width-1920*s)/2,(this.scale.height-1080*s)/2);}
 addText(x,y,value,size=24,color='#352b20',options={},parent=this.root){
  const{originX=0,originY=0,angle=0,...style}=options;
  const t=this.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:`${size}px`,color,lineSpacing:10,...style}).setOrigin(originX,originY).setAngle(angle);parent.add(t);return t;
 }
 button(x,y,label,callback,{width=220,height=58,fill=0x473b2d,color='#f0e1bb',parent=this.root}={}){
  const c=this.add.container(x,y);parent.add(c);const r=this.add.rectangle(0,0,width,height,fill).setStrokeStyle(2,0xb8a27b);
  const t=this.add.text(0,0,label,{fontFamily:'SpecialElite',fontSize:'23px',color}).setOrigin(.5);c.add([r,t]);r.setInteractive({useHandCursor:true});
  r.on('pointerover',()=>r.setFillStyle(0x66513b));r.on('pointerout',()=>r.setFillStyle(fill));r.on('pointerup',()=>{if(this.launching||(this.detailsLayer&&parent!==this.detailsLayer))return;callback();});return c;
 }
 changeProduct(direction){if(this.launching)return;this.productIndex=Phaser.Math.Wrap(this.productIndex+direction,0,PRODUCTS.length);this.drawProduct();}
 drawProduct(){
  for(const o of this.productObjects)o.destroy();this.productObjects=[];const p=PRODUCTS[this.productIndex];const add=(...a)=>{const o=this.addText(...a);this.productObjects.push(o);return o;};
  add(690,533,p.category,15,'#6c4a2c');add(689,593,p.title,35,'#35291d',{wordWrap:{width:235},lineSpacing:16});add(698,758,p.stamp,22,'#8c3025',{angle:-9});
  add(794,851,`${this.productIndex+1} / ${PRODUCTS.length}`,20,'#423323',{originX:.5});add(1060,598,'ASSIGNMENT BRIEF',17,'#524839');add(1060,642,p.description,21,'#302b24',{lineSpacing:12,wordWrap:{width:222}});
  add(1170,779,p.id==='dead_mail'?'IN DEVELOPMENT':'COMING SOON',20,'#833329',{originX:.5});this.productObjects.push(this.button(1170,849,'VIEW DETAILS',()=>this.openDetails(),{width:226,height:50}));
  add(1580,242,p.monitor,21,'#9da98b',{originX:.5,align:'center',lineSpacing:16});add(1580,340,'CATALOG PREVIEW',14,'#727d68',{originX:.5});
 }
 openDetails(){
  if(this.detailsLayer)return;const p=PRODUCTS[this.productIndex],layer=this.add.container(0,0);this.root.add(layer);this.detailsLayer=layer;
  layer.add(this.add.rectangle(960,540,1920,1080,0x000000,.78).setInteractive());layer.add(this.add.rectangle(960,540,1120,920,0xd5c198).setStrokeStyle(5,0x5b4935));
  const text=(x,y,v,size=24,color='#34291e',options={})=>this.addText(x,y,v,size,color,options,layer);
  text(470,125,p.category,20,'#785436');text(470,178,p.title.replace(/\n/g,' '),36);text(470,246,p.location,25,'#6a5136');
  text(470,302,'LOCAL PREVIEW CONTENT / NOT FOR SALE',20,'#785436');text(470,350,p.contents.map(s=>'• '+s).join('\n'),24,'#34291e',{wordWrap:{width:970},lineSpacing:16});
  text(470,560,'These previews are not for sale. PayPal Test is a separate Sandbox product.',21,'#785436',{wordWrap:{width:950}});
  if(p.id==='dead_mail'&&isDeadMailPreviewEnabled()){
   const day=getDeadMailProgress(),night=getDeadMailNightProgress();
   this.button(960,650,day.clues.length?'RESUME DAY PREVIEW':'PLAY DAY PREVIEW',()=>void this.launchPreview('day'),{width:510,parent:layer});
   if(day.dayComplete)this.button(960,725,'PLAY / RESUME NIGHT PREVIEW',()=>void this.launchPreview('night'),{width:510,parent:layer});else text(960,713,'Finish the day shift to unlock the night.',20,'#785436',{originX:.5});
   if(night.complete)this.button(960,800,'PLAY / RESUME FINALE',()=>void this.launchPreview('finale'),{width:510,parent:layer});else text(960,788,'Finish the night shift to unlock the finale.',20,'#785436',{originX:.5});
  }
  this.button(960,920,'BACK TO CATALOG',()=>this.closeDetails(),{width:330,parent:layer});
 }
 async launchPreview(part='day'){
  if(this.launching||!isDeadMailPreviewEnabled())return;
  if(part==='night'&&!getDeadMailProgress().dayComplete)return;
  if(part==='finale'&&(!getDeadMailProgress().dayComplete||!getDeadMailNightProgress().complete))return;
  this.launching=true;
  try{
   let module,open;
   if(part==='finale'){module=await import('./DeadMailFinaleScene.js');open=module.openDeadMailFinalePreview;}
   else if(part==='night'){module=await import('./DeadMailNightScene.js');open=module.openDeadMailNightPreview;}
   else{module=await import('./DeadMailScene.js');open=module.openDeadMailPreview;}
   if(this.disposed)return;if(typeof open!=='function')throw new Error('Preview entry point is missing.');
   const game=this.game;this.scene.stop(SCENE_KEY);game.events.once('poststep',()=>{try{open(game);}catch(e){console.error('[Dead Mail] Preview start failed:',e);}});
  }catch(e){console.error('[Dead Mail] Preview import failed:',e);if(!this.disposed){this.launching=false;this.addText(470,861,'Preview could not load. Check the console.',20,'#8c3025',{},this.detailsLayer||this.root);}}
 }
 closeDetails(){if(this.launching)return;this.detailsLayer?.destroy(true);this.detailsLayer=null;}
 closeStore(){if(!this.launching)this.scene.stop();}
}
