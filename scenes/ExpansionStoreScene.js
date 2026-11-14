import { BaseScene } from './BaseScene.js';
import { openPayPalSandbox } from '../ui/PayPalSandboxCheckout.js';
import { preloadDocumentSfx, playDocumentSfx } from './archive/DocumentSfx.js';
const SCENE_KEY='ExpansionStoreScene', W=1920, H=1080;
const COLORS={ink:'#382b20',muted:'#796448',paper:'#e1cfa8',red:'#893f32',cream:'#eadbb9',green:'#b8c69c'};
const PRODUCTS=[
 {id:'dead_mail',number:'01',category:'HALLOWEEN / PI CASE',title:'DEAD\nMAIL',location:'Blackthorn Cemetery',
  description:'A parcel for a dead woman. She would like to complain in person.',status:'IN DEVELOPMENT',stamp:'DEAD LETTER',
  monitorLabel:'DELIVERY STATUS',monitorValue:'RECIPIENT\nALIVE',contents:[
   'Day investigation: chapters 1–2 (local preview)','Night surveillance: chapter 3 (local preview)',
   'Controlled delivery and report: chapter 4 (local preview)','Exclusive local achievement and souvenir phone']},
 {id:'case_missing_exhibit',number:'02',category:'CASE FILE',title:'THE MISSING\nEXHIBIT',location:'A standalone investigation',
  description:'An exhibit has vanished. The director calls it an interactive experience.',status:'COMING SOON',stamp:'CLASSIFIED',
  monitorLabel:'EXHIBIT STATUS',monitorValue:'NOT\nEXHIBITING',contents:[
   'One additional investigation','New witnesses and dialogue','A new crime scene','A very defensive museum director']},
 {id:'city_pack',number:'03',category:'CITY PACK',title:'NEXT STOP:\nTROUBLE',location:'A new destination',
  description:'New streets. New suspects. The same inadequate travel allowance.',status:'COMING SOON',stamp:'OVERSEAS',
  monitorLabel:'TRAVEL REQUEST',monitorValue:'UNDER\nREVIEW',contents:[
   'An additional city','New locations and characters','Additional investigations','More questionable local advice']},
 {id:'story_expansion',number:'04',category:'STORY EXPANSION',title:'THE FILE\nNOBODY FILED',location:'An additional agency story',
  description:'Someone buried this case. In the alphabetical filing system.',status:'COMING SOON',stamp:'RESTRICTED',
  monitorLabel:'FILE RECOVERY',monitorValue:'PLEASE\nPANIC',contents:[
   'An additional story arc','New agency characters','New evidence and conversations','Administrative misconduct']}
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
  super.create();this.productIndex=0;this.pausedSceneKeys=[];this.hiddenElements=[];this.detailsLayer=null;this.disposed=false;
  this.events.once('shutdown',this.restoreGame,this);this.suspendGame();
  this.cameras.main.setBackgroundColor('#0b0b12');this.input.setTopOnly(true);this.root=this.add.container(0,0);
  if(this.textures.exists('shopping'))this.root.add(this.add.image(960,540,'shopping').setDisplaySize(W,H));
  else this.root.add(this.add.rectangle(960,540,W,H,0x29201b));
  this.text(68,28,'MARK AGENCY',20,COLORS.cream,{fontFamily:'PressStart2P'});
  this.text(68,69,'EXTRA CASES / THE ASSIGNMENT CATALOG',20,'#bca986');
  this.action(1785,53,'BACK TO GAME',()=>this.scene.stop(),{width:202,height:45,fontSize:20});
  this.text(70,1028,'More crime. Same expense policy.',18,'#b6a483');
  this.text(960,1028,'CATALOG PREVIEW / NOT FOR SALE',15,'#b6a483',{originX:.5});
  this.action(1730,1035,'PAYPAL / SANDBOX',()=>openPayPalSandbox(this),{width:245,height:36,fontSize:16,subtle:true});
  const notebook=this.add.container(345,747).setAngle(-12);this.root.add(notebook);
  this.text(0,0,'AGENCY',23,'#e2cba0',{originX:.5},notebook);this.text(0,32,'CATALOG',23,'#e2cba0',{originX:.5},notebook);
  this.text(0,78,`${PRODUCTS.length.toString().padStart(2,'0')} CASE FILES`,16,'#baa17a',{originX:.5},notebook);
  this.productLayer=this.add.container(0,0);this.root.add(this.productLayer);
  this.arrow(598,834,-1);this.arrow(992,834,1);this.drawProduct();this.fitLayout();this.scale.on('resize',this.fitLayout,this);
  if(this.input.keyboard){
   this.trackInputEvent(this.input.keyboard,'keydown-ESC',()=>{if(this.detailsLayer)this.closeDetails();else this.scene.stop();});
   this.trackInputEvent(this.input.keyboard,'keydown-LEFT',()=>{if(!this.detailsLayer)this.changeProduct(-1);});
   this.trackInputEvent(this.input.keyboard,'keydown-RIGHT',()=>{if(!this.detailsLayer)this.changeProduct(1);});
  }
 }
 catalogSfx(name){
  if(this.disposed)return;
  try{playDocumentSfx(this,name,name==='click' ? 0.15 : 0.25);}
  catch(error){console.debug('[ExpansionStoreScene] Catalog audio unavailable:',error);}
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
  this.productLayer.removeAll(true);const p=PRODUCTS[this.productIndex],parent=this.productLayer;
  this.text(698,532,`MA / FILE ${p.number}`,16,'#735b37',{},parent);this.rule(parent,695,566,224);
  this.fitText(693,592,p.title,230,145,43,COLORS.ink,{lineSpacing:9},parent);
  this.fitText(696,748,p.category,222,40,15,'#765e3e',{},parent);
  const stamp=this.add.container(800,817).setAngle(-9);parent.add(stamp);
  stamp.add(this.add.rectangle(0,0,207,42).setStrokeStyle(2,0x894432,.72));
  this.text(0,0,p.stamp,20,COLORS.red,{originX:.5,originY:.5},stamp);
  this.text(800,868,`${p.number}  /  ${PRODUCTS.length.toString().padStart(2,'0')}`,16,'#745e3b',{originX:.5},parent);
  this.text(1061,593,'THE BRIEF',16,'#796e5c',{},parent);this.rule(parent,1060,625,224,0x8d806a,.45);
  this.fitText(1060,646,p.description,224,122,23,'#36322b',{lineSpacing:6},parent);
  this.text(1172,795,p.status,16,COLORS.red,{originX:.5},parent);
  this.action(1172,856,'OPEN CASE FILE',()=>this.openDetails(),{width:224,height:48,fontSize:19,parent});
  const monitor=this.add.container(1585,248);parent.add(monitor);
  this.text(0,-29,p.monitorLabel,15,'#8c9a79',{originX:.5,align:'center'},monitor);
  this.text(0,10,p.monitorValue,25,COLORS.green,{originX:.5,align:'center',lineSpacing:9},monitor);
 }
 openDetails(){
  if(this.disposed||this.detailsLayer)return;
  const p=PRODUCTS[this.productIndex],layer=this.add.container(0,0);this.root.add(layer);this.detailsLayer=layer;
  layer.add(this.add.rectangle(960,540,W,H,0x08070a,.83).setInteractive());
  layer.add(this.add.rectangle(969,552,1280,830,0x000000,.4));
  layer.add(this.add.rectangle(960,540,1280,830,0x473523).setStrokeStyle(2,0x917349));
  layer.add(this.add.rectangle(678,195,670,96,0xc5ab79));layer.add(this.add.rectangle(678,566,670,650,0xdfcca4));
  layer.add(this.add.rectangle(1294,520,510,744,0x241f1a));
  this.text(375,162,`MARK AGENCY / FILE ${p.number}`,16,'#5f482e',{},layer);this.text(375,200,p.category,19,'#6c5233',{},layer);
  this.fitText(375,279,p.title.replace(/\n/g,' '),590,112,40,COLORS.ink,{lineSpacing:7},layer);
  this.fitText(375,407,p.location,590,50,23,'#79603e',{},layer);this.rule(layer,375,475,590);
  this.fitText(375,505,p.description,590,124,28,COLORS.ink,{lineSpacing:10},layer);
  this.text(375,674,'WHAT IS IN THE FILE',16,'#7a6040',{},layer);
  let y=721;p.contents.forEach((item,index)=>{
   this.text(375,y,`${index+1}.`,20,'#8a6a40',{},layer);this.fitText(410,y,item,548,37,20,'#423526',{lineSpacing:3},layer);y+=41;
  });
  this.text(1082,185,'ASSIGNMENT STATUS',16,'#ac9671',{},layer);this.fitText(1082,232,p.status,420,80,29,'#e2c996',{},layer);
  this.rule(layer,1082,330,420,0xa68a5e,.4);
  if(p.id==='dead_mail'){
   this.text(1082,372,'START IN YOUR PI OFFICE',19,'#dac293',{},layer);
   this.fitText(1082,423,'Accept Florence’s advertisement in Classifieds, then read her email.',420,125,25,'#d0c0a1',{lineSpacing:10},layer);
   this.fitText(1082,590,'Field investigations begin at Blackthorn Cemetery. Find it on the city map and walk to the gate.',420,150,24,'#d0c0a1',{lineSpacing:10},layer);
  }else{
   this.text(1082,372,'CURRENTLY IN THE ARCHIVE',18,'#dac293',{},layer);
   this.fitText(1082,425,'This is a preview of planned content. It is not available to purchase.',420,150,26,'#d0c0a1',{lineSpacing:10},layer);
   this.fitText(1082,630,'No price has been set. The agency is still locating its calculator.',420,110,21,'#a59273',{lineSpacing:8},layer);
  }
  this.action(1294,825,'BACK TO CATALOG',()=>this.closeDetails(),{width:420,height:56,fontSize:22,parent:layer});
  this.text(960,921,'CATALOG PREVIEW / NO PURCHASE ON THIS PAGE',15,'#b8a17d',{originX:.5},layer);
  this.catalogSfx('paper');
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
  this.disposed=true;this.scale.off('resize',this.fitLayout,this);
  for(const{element,value,priority}of this.hiddenElements){
   if(!element.isConnected)continue;if(value)element.style.setProperty('display',value,priority);else element.style.removeProperty('display');
  }
  this.hiddenElements=[];
  for(const key of this.pausedSceneKeys)if(this.scene.manager.keys[key]&&this.scene.isPaused(key))this.scene.resume(key);
  this.pausedSceneKeys=[];
 }
}
