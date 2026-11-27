import { dialogueText as __dialogueText, formatDialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { openPayPalSandbox } from '../ui/PayPalSandboxCheckout.js';
import { preloadDocumentSfx, playDocumentSfx } from './archive/DocumentSfx.js';
import { MUSIC_PACKS } from '../config/musicPacks.js';
import { MEDAL_SLOT_OFFERS, EURO_SLOT_PACKS } from '../config/inventorySlots.js';
import { InventorySlotsDialog } from '../ui/inventory/InventorySlotsDialog.js';
import { STORE_PRODUCTS, hasEntitlement, buyWithMedals } from '../systems/StoreEntitlements.js';
import { thiefdokuService } from '../systems/thiefdoku/ThiefdokuService.js';
const SCENE_KEY='ExpansionStoreScene', W=1920, H=1080;
const COLORS={ink:'#382b20',muted:'#796448',paper:'#e1cfa8',red:'#893f32',cream:'#eadbb9',green:'#b8c69c'};
const MUSIC_PACK=MUSIC_PACKS.noir_pack_1;
const cheapestEuro=EURO_SLOT_PACKS[0];
const PRODUCTS=[
 {id:'dead_mail',number:'01',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_c301e78d65c90d17c316"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_18c9241e0ab9f97b7a29"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_fcd5ad393af860802561"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_6071c2c3f65e67bc5fd7"),status:'IN DEVELOPMENT',stamp:__dialogueText("scenes/ExpansionStoreScene.js", "t_91f18fe806b2ef031916"),
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_6bb088893c386e60f061"),monitorValue:__dialogueText("scenes/ExpansionStoreScene.js", "t_75427588881460b48787"),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_6625acabbbfe75050edb"),__dialogueText("scenes/ExpansionStoreScene.js", "t_43d343fbae1633b8ab49"),
   __dialogueText("scenes/ExpansionStoreScene.js", "t_edb3185f791e72f7ca77"),__dialogueText("scenes/ExpansionStoreScene.js", "t_79e62eac98fc6cb7f05e")]},
 {id:'case_missing_exhibit',number:'02',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_c95495641200bd4f90b7"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_094d8ead6fa046b60e53"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_e1e891184ef5ebf4d4cb"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_d2a0f327d8810dbb27ac"),status:'COMING SOON',stamp:'CLASSIFIED',
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_e962b2e38420b0854254"),monitorValue:__dialogueText("scenes/ExpansionStoreScene.js", "t_60aa77df5f91154a6d4d"),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_bbeb21edc4694c916e37"),__dialogueText("scenes/ExpansionStoreScene.js", "t_fe25503e2f2ca39163a6"),__dialogueText("scenes/ExpansionStoreScene.js", "t_01f73bcab2d931ad987e"),__dialogueText("scenes/ExpansionStoreScene.js", "t_8b0611378a2c4939974a")]},
 {id:'city_pack',number:'03',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_e9983ec207be6e8fbdb7"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_b1a5ff1910f86e985bd7"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_d9c9201be87c97ac52bc"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_d2f1159ea21f37aeff33"),status:'COMING SOON',stamp:'OVERSEAS',
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_2a52786decf5654c5f18"),monitorValue:__dialogueText("scenes/ExpansionStoreScene.js", "t_a6a0132cc7ebbf3d7df5"),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_36d81cdb30d554086a85"),__dialogueText("scenes/ExpansionStoreScene.js", "t_bd9a6be58aac6eb1f2fd"),__dialogueText("scenes/ExpansionStoreScene.js", "t_bed228adf18624c89698"),__dialogueText("scenes/ExpansionStoreScene.js", "t_56cba68a0083c76a488f")]},
 {id:'story_expansion',number:'04',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_098be22fd247b417c0dd"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_40858f70219d7c1a0bf8"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_4e00488fcbbd8ceebd62"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_9b4cb3e809c62a94c2af"),status:'COMING SOON',stamp:'RESTRICTED',
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_f6361e22eeafca47e145"),monitorValue:__dialogueText("scenes/ExpansionStoreScene.js", "t_5e1802a888e98f14e012"),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_2fcca820d17a3766bc3c"),__dialogueText("scenes/ExpansionStoreScene.js", "t_bae13057e64439b1c055"),__dialogueText("scenes/ExpansionStoreScene.js", "t_25afa713614d54cb4e7b"),__dialogueText("scenes/ExpansionStoreScene.js", "t_344bf29060504c030074")]},
 {id:'music_pack',number:'05',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_bae7625b384ce513a742"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_a9ed93212d9af19503ad"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_375997bd9a519b5ee427"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_1c458f0846bf84c9419c"),status:__dialogueText("scenes/ExpansionStoreScene.js", "t_13cb56dc1e87477d3728"),stamp:__dialogueText("scenes/ExpansionStoreScene.js", "t_65f4c50c975c2e0e8a5a"),
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_bae7625b384ce513a742"),monitorValue:formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_b8632413c34ffcadb44f"),{price:MUSIC_PACK.priceEur}),contents:[
   __dialogueText("scenes/ExpansionStoreScene.js", "t_6603011dd987384c3636"),__dialogueText("scenes/ExpansionStoreScene.js", "t_4c4af4954e2815d1cc4c"),__dialogueText("scenes/ExpansionStoreScene.js", "t_1b010bc08dcd3fabab67"),__dialogueText("scenes/ExpansionStoreScene.js", "t_3fa3b0631e67341229f9")]},
 {id:'inventory_slots',number:'06',category:__dialogueText("scenes/ExpansionStoreScene.js", "t_1661765467478b77853c"),title:__dialogueText("scenes/ExpansionStoreScene.js", "t_1f6bdfe6d34ed1ce96fe"),location:__dialogueText("scenes/ExpansionStoreScene.js", "t_848d2c56188f0d155d67"),
  description:__dialogueText("scenes/ExpansionStoreScene.js", "t_4d6fde72c132a753a060"),status:__dialogueText("scenes/ExpansionStoreScene.js", "t_adfe61c2ce292441af0d"),stamp:__dialogueText("scenes/ExpansionStoreScene.js", "t_7f723432ac43244c59d8"),
  monitorLabel:__dialogueText("scenes/ExpansionStoreScene.js", "t_f4383c668fc0fd3898ec"),monitorValue:formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_b8632413c34ffcadb44f"),{price:cheapestEuro.priceEur}),contents:[
   formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_7d711271303de3cf952f"),{slots:MEDAL_SLOT_OFFERS[0].slots}),
   ...EURO_SLOT_PACKS.map(pack=>pack.slots===1?formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_f895854990685985855a"),{slots:pack.slots,price:pack.priceEur}):formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_8ea5d07e694ef30e1030"),{slots:pack.slots,price:pack.priceEur})),
   __dialogueText("scenes/ExpansionStoreScene.js", "t_0f3444669167ecf44656")]}
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
  super.create();this.productIndex=0;this.pausedSceneKeys=[];this.hiddenElements=[];this.detailsLayer=null;this.disposed=false;this.slotsDialog=null;this.pendingNote=null;
  this.events.once('shutdown',this.restoreGame,this);this.suspendGame();
  this.cameras.main.setBackgroundColor('#0b0b12');this.input.setTopOnly(true);this.root=this.add.container(0,0);
  if(this.textures.exists('shopping'))this.root.add(this.add.image(960,540,'shopping').setDisplaySize(W,H));
  else this.root.add(this.add.rectangle(960,540,W,H,0x29201b));
  this.text(68,28,__dialogueText("scenes/ExpansionStoreScene.js", "t_9246fca97ffafae56410"),20,COLORS.cream,{fontFamily:'PressStart2P'});
  this.text(68,69,__dialogueText("scenes/ExpansionStoreScene.js", "t_2a4a6490e34b9e7f1e41"),20,'#bca986');
  this.action(1785,53,__dialogueText("scenes/ExpansionStoreScene.js", "t_dbbd2eddb463fec26223"),()=>this.scene.stop(),{width:202,height:45,fontSize:20});
  this.text(70,1028,__dialogueText("scenes/ExpansionStoreScene.js", "t_d46bd98e6db0a1cb782c"),18,'#b6a483');
  this.text(960,1028,__dialogueText("scenes/ExpansionStoreScene.js", "t_e800ce53a83e1e1b9e26"),15,'#b6a483',{originX:.5});
  this.action(1730,1035,__dialogueText("scenes/ExpansionStoreScene.js", "t_6534905d7a0be79bf7f5"),()=>openPayPalSandbox(this),{width:245,height:36,fontSize:16,subtle:true});
  const notebook=this.add.container(345,747).setAngle(-12);this.root.add(notebook);
  this.text(0,0,'AGENCY',23,'#e2cba0',{originX:.5},notebook);this.text(0,32,'CATALOG',23,'#e2cba0',{originX:.5},notebook);
  this.text(0,78,`${PRODUCTS.length.toString().padStart(2,'0')}${__dialogueText("scenes/ExpansionStoreScene.js", "t_a5751cf9a73a87ba5cb6")}`,16,'#baa17a',{originX:.5},notebook);
  this.productLayer=this.add.container(0,0);this.root.add(this.productLayer);
  this.arrow(598,834,-1);this.arrow(992,834,1);this.drawProduct();this.fitLayout();this.scale.on('resize',this.fitLayout,this);
  if(this.input.keyboard){
   this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>{if(this.slotsDialog)this.closeSlotsDialog();else if(this.detailsLayer)this.closeDetails();else this.scene.stop();});
   this.trackInputEvent(this.input.keyboard,'keydown-LEFT',()=>{if(!this.detailsLayer&&!this.slotsDialog)this.changeProduct(-1);});
   this.trackInputEvent(this.input.keyboard,'keydown-RIGHT',()=>{if(!this.detailsLayer&&!this.slotsDialog)this.changeProduct(1);});
  }
 }
 catalogSfx(name){
  if(this.disposed)return;
  try{playDocumentSfx(this,name,name==='click' ? 0.15 : 0.25);}
  catch(error){console.debug('[ExpansionStoreScene] Catalog audio unavailable:',error);}
 }
 storeProduct(p){return STORE_PRODUCTS[p.id]||null;}
 statusOf(p){
  if(!this.storeProduct(p))return p.status;
  return hasEntitlement(p.id)?'OWNED':'FOR SALE';
 }
 priceLine(store){return `EUR ${store.priceEur.toFixed(2)}  |  ${store.priceMedals} MEDALS`;}
 takeNote(){const note=this.pendingNote;this.pendingNote=null;return note;}
 buyMedals(p){
  const result=buyWithMedals(p.id);
  this.pendingNote=result.message;
  if(result.ok)this.catalogSfx('paper');
  this.closeDetails();this.openDetails();this.drawProduct();
 }
 openSlotsDialog(){
  if(this.disposed||this.slotsDialog)return;
  const dialog=new InventorySlotsDialog(this,{onClose:()=>{if(this.slotsDialog===dialog)this.slotsDialog=null;}});
  this.slotsDialog=dialog;
  try{dialog.open();}catch(error){this.closeSlotsDialog();console.error('[ExpansionStoreScene] Slot shop failed:',error);}
 }
 closeSlotsDialog(){const dialog=this.slotsDialog;this.slotsDialog=null;dialog?.destroy();}
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
 openDetails(){
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
  let closeY=825,closeHeight=56;
  if(p.id==='dead_mail'){
   this.text(1082,372,__dialogueText("scenes/ExpansionStoreScene.js", "t_e4bfbe58fa8b34af93f8"),19,'#dac293',{},layer);
   this.fitText(1082,423,__dialogueText("scenes/ExpansionStoreScene.js", "t_5f225783bfe532cd35be"),420,125,25,'#d0c0a1',{lineSpacing:10},layer);
   this.fitText(1082,560,__dialogueText("scenes/ExpansionStoreScene.js", "t_744265b2237c1ef51c3c"),420,120,24,'#d0c0a1',{lineSpacing:10},layer);
   closeY=852;closeHeight=50;
   const note=this.takeNote()||`You have ${thiefdokuService.getMedals()} medals. Price: EUR ${store.priceEur.toFixed(2)} or ${store.priceMedals} medals.`;
   this.fitText(1082,688,note,440,24,16,'#e2c996',{},layer);
   if(hasEntitlement(p.id)){
    this.text(1294,758,'OWNED',34,'#8fb180',{originX:.5,originY:.5},layer);
   }else{
    this.action(1294,735,`PAY WITH MEDALS (${store.priceMedals})`,()=>this.buyMedals(p),{width:420,height:46,fontSize:19,parent:layer});
    this.action(1294,790,`PAY WITH PAYPAL (EUR ${store.priceEur.toFixed(2)})`,()=>{
     this.pendingNote='PayPal checkout opens together with the official website. Medals work now.';
     this.closeDetails();this.openDetails();
    },{width:420,height:46,fontSize:19,parent:layer,subtle:true});
   }
  }else if(p.id==='music_pack'){
   this.text(1082,372,__dialogueText("scenes/ExpansionStoreScene.js", "t_13024046cbcaedb79964"),18,'#dac293',{},layer);
   this.fitText(1082,425,formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_b8632413c34ffcadb44f"),{price:MUSIC_PACK.priceEur}),420,70,44,'#d0c0a1',{},layer);
   this.fitText(1082,540,__dialogueText("scenes/ExpansionStoreScene.js", "t_4c92b07b0a891e695c86"),420,150,24,'#d0c0a1',{lineSpacing:10},layer);
   this.fitText(1082,700,__dialogueText("scenes/ExpansionStoreScene.js", "t_502709eb684df7ae227f"),420,110,21,'#a59273',{lineSpacing:8},layer);
  }else if(p.id==='inventory_slots'){
   this.text(1082,372,__dialogueText("scenes/ExpansionStoreScene.js", "t_a6c3e9adcb3d8e3f1a7d"),18,'#dac293',{},layer);
   const lines=[formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_ca5c97df452b82694b9d"),{medals:MEDAL_SLOT_OFFERS[0].medals}),...EURO_SLOT_PACKS.map(pack=>pack.slots===1?formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_8a088f85b1cb1a39ba37"),{slots:pack.slots,price:pack.priceEur}):formatDialogueText(__dialogueText("scenes/ExpansionStoreScene.js", "t_e1211404c26214cd4888"),{slots:pack.slots,price:pack.priceEur}))];
   this.fitText(1082,425,lines.join('\n'),420,200,26,'#d0c0a1',{lineSpacing:12},layer);
   this.action(1294,745,__dialogueText("scenes/ExpansionStoreScene.js", "t_b3ec5c6d47d26fb5616a"),()=>this.openSlotsDialog(),{width:420,height:56,fontSize:22,parent:layer});
  }else{
   this.text(1082,372,__dialogueText("scenes/ExpansionStoreScene.js", "t_841ddd4e1500bd37d0e6"),18,'#dac293',{},layer);
   this.fitText(1082,425,__dialogueText("scenes/ExpansionStoreScene.js", "t_cf8bc681a3947b8ba2a9"),420,150,26,'#d0c0a1',{lineSpacing:10},layer);
   this.fitText(1082,630,__dialogueText("scenes/ExpansionStoreScene.js", "t_a05feaec1fcda3f39f25"),420,110,21,'#a59273',{lineSpacing:8},layer);
  }
  this.action(1294,closeY,__dialogueText("scenes/ExpansionStoreScene.js", "t_13cfc53587a05ef51902"),()=>this.closeDetails(),{width:420,height:closeHeight,fontSize:22,parent:layer});
  this.text(960,921,__dialogueText("scenes/ExpansionStoreScene.js", "t_05d4b4dd2ab319e7a980"),15,'#b8a17d',{originX:.5},layer);
  this.catalogSfx('paper');
 }
 closeDetails(){
  if(this.disposed||!this.detailsLayer)return;
  this.closeSlotsDialog();
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
  this.disposed=true;this.closeSlotsDialog();this.scale.off('resize',this.fitLayout,this);
  for(const{element,value,priority}of this.hiddenElements){
   if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');
  }
  this.hiddenElements=[];
  for(const key of this.pausedSceneKeys)if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
  this.pausedSceneKeys=[];
 }
}