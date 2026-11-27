import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { openPayPalCheckout } from '../ui/PayPalCheckout.js';
import { preloadDocumentSfx, playDocumentSfx } from './archive/DocumentSfx.js';
import { STORE_PRODUCTS, hasEntitlement, buyWithMedals, refreshStoreEntitlements } from '../systems/StoreEntitlements.js';
import { syncMusicPacks } from '../managers/MusicEntitlements.js';
import { EventBus } from '../EventBus.js';
import { thiefdokuService } from '../systems/thiefdoku/ThiefdokuService.js';
const SCENE_KEY='ExpansionStoreScene', W=1920, H=1080;
const COLORS={ink:'#382b20',muted:'#796448',paper:'#e1cfa8',red:'#893f32',cream:'#eadbb9',green:'#b8c69c'};
const priceText=store=>`${store.priceEur.toFixed(2)} EUR`;
// Only these two items are sold. Prices: systems/StoreEntitlements.js. PayPal: config/storeConfig.js.
const PRODUCTS=[
 {id:'dead_mail',number:'01',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_c301e78d65c90d17c316"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_18c9241e0ab9f97b7a29"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_fcd5ad393af860802561"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_6071c2c3f65e67bc5fd7"),stamp:__dialogueText("scenes/ExpansionStoreScene.js", "t_91f18fe806b2ef031916"),
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_6bb088893c386e60f061"),monitorValue:__dialogueText("scenes/ExpansionStoreScene.js", "t_75427588881460b48787"),contents:[
   'Day investigation: chapters 1–2','Night surveillance: chapter 3',
   'Controlled delivery and report: chapter 4',__dialogueText("scenes/ExpansionStoreScene.js", "t_79e62eac98fc6cb7f05e")],
  ownedHint:[__dialogueText("scenes/ExpansionStoreScene.js", "t_e4bfbe58fa8b34af93f8"),__dialogueText("scenes/ExpansionStoreScene.js", "t_5f225783bfe532cd35be")]},
 {id:'music_pack',number:'02',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_bae7625b384ce513a742"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_a9ed93212d9af19503ad"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_375997bd9a519b5ee427"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_1c458f0846bf84c9419c"),stamp:__dialogueText("scenes/ExpansionStoreScene.js", "t_65f4c50c975c2e0e8a5a"),
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_bae7625b384ce513a742"),monitorValue:priceText(STORE_PRODUCTS.music_pack),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_6603011dd987384c3636"),__dialogueText("scenes/ExpansionStoreScene.js", "t_4c4af4954e2815d1cc4c"),__dialogueText("scenes/ExpansionStoreScene.js", "t_1b010bc08dcd3fabab67"),__dialogueText("scenes/ExpansionStoreScene.js", "t_3fa3b0631e67341229f9")],
  ownedHint:['PLAY IT ON THE JUKEBOX','All tracks of the pack are unlocked in the agency jukebox.']}
];
let openingPromise=null;
export async function openExpansionStore(){
 if(openingPromise)return openingPromise;
 openingPromise=(async()=>{
  const game=window.game;if(!game?.scene)throw new Error('The game is not ready.');
  if(!game.scene.keys[SCENE_KEY])game.scene.add(SCENE_KEY,ExpansionStoreScene,false);
  if(!game.scene.isActive(SCENE_KEY))game.scene.start(SCENE_KEY);
  game.scene.bringToTop(SCENE_KEY);
 })();
 try{return await openingPromise;}finally{openingPromise=null;}
}
export class ExpansionStoreScene extends BaseScene{
 constructor(){super({key:SCENE_KEY});}
 preload(){
  if(!this.textures.exists('shopping'))this.load.image('shopping','assets/shopping.webp');
  preloadDocumentSfx(this,['page','paper','click']);
 }
 create(){
  super.create();this.productIndex=0;this.pausedSceneKeys=[];this.hiddenElements=[];this.detailsLayer=null;this.disposed=false;this.pendingNote=null;
  this.events.once('shutdown',this.restoreGame,this);this.suspendGame();
  this.cameras.main.setBackgroundColor('#0b0b12');this.input.setTopOnly(true);this.root=this.add.container(0,0);
  if(this.textures.exists('shopping'))this.root.add(this.add.image(960,540,'shopping').setDisplaySize(W,H));
  else this.root.add(this.add.rectangle(960,540,W,H,0x29201b));
  this.text(68,28,__dialogueText("scenes/ExpansionStoreScene.js", "t_9246fca97ffafae56410"),20,COLORS.cream,{fontFamily:'PressStart2P'});
  this.text(68,69,__dialogueText("scenes/ExpansionStoreScene.js", "t_2a4a6490e34b9e7f1e41"),20,'#bca986');
  this.action(1785,53,__dialogueText("scenes/ExpansionStoreScene.js", "t_dbbd2eddb463fec26223"),()=>this.scene.stop(),{width:202,height:45,fontSize:20});
  this.text(70,1028,__dialogueText("scenes/ExpansionStoreScene.js", "t_d46bd98e6db0a1cb782c"),18,'#b6a483');
  this.medalsLabel=this.text(960,1028,'',15,'#b6a483',{originX:.5});this.updateMedals();
  const notebook=this.add.container(345,747).setAngle(-12);this.root.add(notebook);
  this.text(0,0,'AGENCY',23,'#e2cba0',{originX:.5},notebook);this.text(0,32,'CATALOG',23,'#e2cba0',{originX:.5},notebook);
  this.text(0,78,`${PRODUCTS.length.toString().padStart(2,'0')} ITEMS`,16,'#baa17a',{originX:.5},notebook);
  this.productLayer=this.add.container(0,0);this.root.add(this.productLayer);
  this.arrow(598,834,-1);this.arrow(992,834,1);this.drawProduct();this.fitLayout();this.scale.on('resize',this.fitLayout,this);
  EventBus.on('storeEntitlementsChanged',this.onEntitlementsChanged,this);
  void refreshStoreEntitlements();
  if(this.input.keyboard){
   this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>{if(this.detailsLayer)this.closeDetails();else this.scene.stop();});
   this.trackInputEvent(this.input.keyboard,'keydown-LEFT',()=>{if(!this.detailsLayer)this.changeProduct(-1);});
   this.trackInputEvent(this.input.keyboard,'keydown-RIGHT',()=>{if(!this.detailsLayer)this.changeProduct(1);});
  }
 }
 updateMedals(){
  if(this.disposed||!this.medalsLabel)return;
  this.medalsLabel.setText(`YOUR MEDALS: ${thiefdokuService.getMedals()}  /  ONE MEDAL FOR EACH SOLVED DAILY THIEFDOKU CASE`);
 }
 onEntitlementsChanged(){
  if(this.disposed)return;
  syncMusicPacks();this.updateMedals();this.drawProduct();
  this.refreshDetails();
 }
 catalogSfx(name){
  if(this.disposed)return;
  try{playDocumentSfx(this,name,name==='click' ? 0.15 : 0.25);}
  catch(error){console.debug('[ExpansionStoreScene] Catalog audio unavailable:',error);}
 }
 storeProduct(p){return STORE_PRODUCTS[p.id]||null;}
 statusOf(p){return hasEntitlement(p.id)?'OWNED':'FOR SALE';}
 priceLine(store){return `EUR ${store.priceEur.toFixed(2)}  |  ${store.priceMedals} MEDALS`;}
 takeNote(){const note=this.pendingNote;this.pendingNote=null;return note;}
 refreshDetails(){if(!this.detailsLayer)return;this.detailsLayer.destroy(true);this.detailsLayer=null;this.openDetails({silent:true});}
 buyMedals(p){
  const result=buyWithMedals(p.id);
  this.pendingNote=result.message;
  if(result.ok){this.catalogSfx('paper');syncMusicPacks();}
  this.updateMedals();this.drawProduct();this.refreshDetails();
 }
 buyPayPal(p){
  openPayPalCheckout(this,this.storeProduct(p),{onOwned:()=>{
   if(this.disposed)return;
   this.pendingNote=`Purchased with PayPal: ${this.storeProduct(p).name}.`;
   syncMusicPacks();this.drawProduct();this.refreshDetails();
  }});
 }
 text(x,y,value,size=24,color=COLORS.ink,options={},parent=this.root){
  const{originX=0,originY=0,angle=0,...style}=options;
  const object=this.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:`${size}px`,color,lineSpacing:7,...style}).setOrigin(originX,originY).setAngle(angle);parent.add(object);return object;
 }
 fitText(x,y,value,width,height,size,color,options={},parent=this.root){
  const object=this.text(x,y,value,size,color,{wordWrap:{width,useAdvancedWrap:true},...options},parent);
  let current=size;while((object.height>height||object.width>width+1)&&current>12){current-=1;object.setFontSize(current);}return object;
 }
 rule(parent,x,y,width,color=0x9e8560,alpha=.5){const line=this.add.rectangle(x,y,width,1,color,alpha).setOrigin(0,0);parent.add(line);return line;}
 action(x,y,label,callback,{width=220,height=48,fontSize=21,parent=this.root,subtle=false}={}){
  const container=this.add.container(x,y);
  const plate=this.add.rectangle(0,0,width,height,subtle?0x17161a:0x30271e,subtle ? 0.65 : 0.96).setStrokeStyle(1,0xab9166,subtle ? 0.4 : 0.8);
  container.add(plate);parent.add(container);this.text(0,0,label,fontSize,'#e7d4ad',{originX:.5,originY:.5},container);
  plate.setInteractive({useHandCursor:true});plate.on('pointerover',()=>plate.setFillStyle(0x55432e,1));
  plate.on('pointerout',()=>plate.setFillStyle(subtle?0x17161a:0x30271e,subtle ? 0.65 : 0.96));
  plate.on('pointerup',()=>{if(this.disposed)return;if(this.detailsLayer&&parent!==this.detailsLayer)return;callback();});return container;
 }
 arrow(x,y,direction){
  const circle=this.add.circle(x,y,26,0x251d17,.9).setStrokeStyle(1,0xa58a60,.8);this.root.add(circle);
  this.text(x,y-2,direction<0?'‹':'›',42,'#e5cfa4',{originX:.5,originY:.5});circle.setInteractive({useHandCursor:true});
  circle.on('pointerover',()=>circle.setFillStyle(0x60482f,1));circle.on('pointerout',()=>circle.setFillStyle(0x251d17,.9));
  circle.on('pointerup',()=>{if(!this.detailsLayer)this.changeProduct(direction);});
 }
 changeProduct(direction){
  if(this.disposed||this.detailsLayer)return;
  const before=this.productIndex;
  this.productIndex=Phaser.Math.Wrap(this.productIndex+direction,0,PRODUCTS.length);
  this.drawProduct();if(this.productIndex!==before)this.catalogSfx('page');
 }
 drawProduct(){
  this.productLayer.removeAll(true);const p=PRODUCTS[this.productIndex],parent=this.productLayer,store=this.storeProduct(p);
  this.text(698,532,`${__dialogueText("scenes/ExpansionStoreScene.js", "t_3b7050ae8b490e000fac")}${p.number}`,16,'#735b37',{},parent);this.rule(parent,695,566,224);
  this.fitText(693,592,p.title,230,145,43,COLORS.ink,{lineSpacing:9},parent);
  this.fitText(696,748,p.category,222,40,15,'#765e3e',{},parent);
  const stamp=this.add.container(800,817).setAngle(-9);parent.add(stamp);
  stamp.add(this.add.rectangle(0,0,207,42).setStrokeStyle(2,0x894432,.72));
  this.text(0,0,p.stamp,20,COLORS.red,{originX:.5,originY:.5},stamp);
  this.text(800,868,`${p.number}  /  ${PRODUCTS.length.toString().padStart(2,'0')}`,16,'#745e3b',{originX:.5},parent);
  this.text(1061,593,__dialogueText("scenes/ExpansionStoreScene.js", "t_7e698b381a0a380bdb52"),16,'#796e5c',{},parent);this.rule(parent,1060,625,224,0x8d806a,.45);
  this.fitText(1060,646,p.description,224,122,23,'#36322b',{lineSpacing:6},parent);
  this.text(1172,store?780:795,this.statusOf(p),16,COLORS.red,{originX:.5},parent);
  if(store)this.fitText(1172,806,this.priceLine(store),224,24,15,'#5b4630',{originX:.5},parent);
  this.action(1172,856,__dialogueText("scenes/ExpansionStoreScene.js", "t_dae708adb0550357d27e"),()=>this.openDetails(),{width:224,height:48,fontSize:19,parent});
  const monitor=this.add.container(1585,248);parent.add(monitor);
  this.text(0,-29,p.monitorLabel,15,'#8c9a79',{originX:.5,align:'center'},monitor);
  this.text(0,10,p.monitorValue,25,COLORS.green,{originX:.5,align:'center',lineSpacing:9},monitor);
 }
 openDetails({silent=false}={}){
  if(this.disposed||this.detailsLayer)return;
  const p=PRODUCTS[this.productIndex],store=this.storeProduct(p),layer=this.add.container(0,0);this.root.add(layer);this.detailsLayer=layer;
  layer.add(this.add.rectangle(960,540,W,H,0x08070a,.83).setInteractive());
  layer.add(this.add.rectangle(969,552,1280,830,0x000000,.4));
  layer.add(this.add.rectangle(960,540,1280,830,0x473523).setStrokeStyle(2,0x917349));
  layer.add(this.add.rectangle(678,195,670,96,0xc5ab79));layer.add(this.add.rectangle(678,566,670,650,0xdfcca4));
  layer.add(this.add.rectangle(1294,520,510,744,0x241f1a));
  this.text(375,162,`${__dialogueText("scenes/ExpansionStoreScene.js", "t_6bb5e7f33139a6d857bd")}${p.number}`,16,'#5f482e',{},layer);this.text(375,200,p.category,19,'#6c5233',{},layer);
  this.fitText(375,279,p.title.replace(/\n/g,' '),590,112,40,COLORS.ink,{lineSpacing:7},layer);
  this.fitText(375,407,p.location,590,50,23,'#79603e',{},layer);this.rule(layer,375,475,590);
  this.fitText(375,505,p.description,590,124,28,COLORS.ink,{lineSpacing:10},layer);
  this.text(375,674,__dialogueText("scenes/ExpansionStoreScene.js", "t_e9cd58c4cb7dd9fb65ca"),16,'#7a6040',{},layer);
  let y=721;p.contents.forEach((item,index)=>{
   this.text(375,y,`${index+1}.`,20,'#8a6a40',{},layer);this.fitText(410,y,item,548,37,20,'#423526',{lineSpacing:3},layer);y+=41;
  });
  this.text(1082,185,__dialogueText("scenes/ExpansionStoreScene.js", "t_92af7023d685d3538537"),16,'#ac9671',{},layer);this.fitText(1082,232,this.statusOf(p),420,80,29,'#e2c996',{},layer);
  this.rule(layer,1082,330,420,0xa68a5e,.4);
  const owned=hasEntitlement(p.id);
  if(owned){
   this.fitText(1082,372,p.ownedHint[0],420,40,19,'#dac293',{},layer);
   this.fitText(1082,423,p.ownedHint[1],420,125,25,'#d0c0a1',{lineSpacing:10},layer);
   if(p.id==='dead_mail')this.fitText(1082,560,__dialogueText("scenes/ExpansionStoreScene.js", "t_744265b2237c1ef51c3c"),420,120,24,'#d0c0a1',{lineSpacing:10},layer);
  }else{
   this.text(1082,372,__dialogueText("scenes/ExpansionStoreScene.js", "t_13024046cbcaedb79964"),18,'#dac293',{},layer);
   this.fitText(1082,412,`EUR ${store.priceEur.toFixed(2)}`,420,60,44,'#d0c0a1',{},layer);
   this.fitText(1082,478,`or ${store.priceMedals} police medals`,420,40,26,'#d0c0a1',{},layer);
   this.fitText(1082,540,'Pay with PayPal, or with medals from the daily Thiefdoku case. One purchase, yours for good.',420,90,20,'#a59273',{lineSpacing:8},layer);
  }
  const note=this.takeNote()||(owned?'':`You have ${thiefdokuService.getMedals()} medals.`);
  if(note)this.fitText(1082,owned?690:645,note,420,48,17,'#e2c996',{lineSpacing:4},layer);
  if(owned){
   this.text(1294,760,'OWNED',34,'#8fb180',{originX:.5,originY:.5},layer);
  }else{
   const enough=thiefdokuService.getMedals()>=store.priceMedals;
   this.action(1294,720,`PAY WITH MEDALS (${store.priceMedals})`,()=>this.buyMedals(p),{width:420,height:46,fontSize:19,parent:layer,subtle:!enough});
   this.action(1294,778,`PAY WITH PAYPAL (EUR ${store.priceEur.toFixed(2)})`,()=>this.buyPayPal(p),{width:420,height:46,fontSize:19,parent:layer});
  }
  this.action(1294,852,__dialogueText("scenes/ExpansionStoreScene.js", "t_13cfc53587a05ef51902"),()=>this.closeDetails(),{width:420,height:50,fontSize:22,parent:layer});
  this.text(960,921,'PAYPAL PURCHASES ARE SAVED TO YOUR GAME ACCOUNT',15,'#b8a17d',{originX:.5},layer);
  if(!silent)this.catalogSfx('paper');
 }
 closeDetails(){
  if(this.disposed||!this.detailsLayer)return;

  this.detailsLayer.destroy(true);this.detailsLayer=null;this.catalogSfx('click');
 }
 fitLayout(){
  if(!this.root)return;const scale=Math.min(this.scale.width/W,this.scale.height/H);
  this.root.setScale(scale).setPosition((this.scale.width-W*scale)/2,(this.scale.height-H*scale)/2);
 }
 suspendGame(){
  this.getPlayerHudScene()?.closeAllUIPanels?.();
  for(const scene of [...this.scene.manager.getScenes(true)]){
   const key=scene.sys.settings.key;if(key!==SCENE_KEY&&this.scene.isActive(key)){this.pausedSceneKeys.push(key);this.scene.pause(key);}
  }
  for(const selector of ['#hud-container','#agent-modal','#profile-modal']){
   const element=document.querySelector(selector);if(!element)continue;
   this.hiddenElements.push({element,value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')});
   element.style.setProperty('display','none','important');
  }
 }
 restoreGame(){
  this.disposed=true;EventBus.off("storeEntitlementsChanged",this.onEntitlementsChanged,this);this.scale.off('resize',this.fitLayout,this);
  for(const{element,value,priority}of this.hiddenElements){
   if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');
  }
  this.hiddenElements=[];
  for(const key of this.pausedSceneKeys)if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
  this.pausedSceneKeys=[];
 }
}