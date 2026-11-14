import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { BUSINESS_CENTER_CONFIG as CONFIG } from '../config/businessCenterConfig.js';
import { installReceptionWorldReactions } from '../ui/WorldReceptionReactionHooks.js';

const ASSET_ROOT='assets/pi/business-center/';
const ASSETS={staffed:{key:'business_center_staffed_v1',name:'lobby-under-construction'},empty:{key:'business_center_empty_v1',name:'no-men'}};
const EXTENSIONS=['webp','png','jpg','jpeg'];
const BACK_KEY='back';
const BACK_URL='assets/buttons/back.webp';
const HOTSPOTS=[
 {id:'directory',label:'Tenant directory',x:.18,y:.43,w:.30,h:.48},
 {id:'reception',label:'Receptionist',x:.375,y:.535,w:.15,h:.34},
 {id:'bell',label:'Service bell',x:.408,y:.707,w:.055,h:.075},
 {id:'lift',label:'Offices / under construction',x:.86,y:.555,w:.235,h:.54},
 {id:'plant',label:'Corporate greenery',x:.654,y:.855,w:.105,h:.25}
];
export class BusinessCenterScene extends BaseScene{
 constructor(){super({key:CONFIG.sceneKey});}
 init(){
  this.disposed=false;this.navigating=false;this.ready=false;this.panelOpen=false;this.receptionistPresent=true;this.token=Symbol(CONFIG.sceneKey);
  this.background=null;this.imageBox=null;this.dialogue=null;this.hotspots=[];this.imageRequests=new Set();this.hiddenHud=null;this.status=null;this.exitButton=null;
 }
 preload(){
  if(!this.textures.exists(BACK_KEY))this.load.image(BACK_KEY,BACK_URL);
 }
 create(){
  super.create();installReceptionWorldReactions(this);
  this.registry.set('currentSceneKey',CONFIG.sceneKey);
  this.events.once('shutdown',this.disposeCenter,this);this.events.once('destroy',this.disposeCenter,this);
  this.hideGameplayHud();this.cameras.main.setBackgroundColor('#101722');
  this.dialogue=new HomeTownDialogue(this,()=>this.closePanel());
  this.createExitButton();
  this.status=this.add.text(24,85,'Opening reception...',{
   fontFamily:'SpecialElite, monospace',fontSize:22,color:'#ffe4bd',wordWrap:{width:Math.max(100,this.scale.width-48)}
  }).setDepth(90);
  this.trackInputEvent(this.scale,'resize',this.layoutRoom);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',this.onEscape);
  this.layoutRoom();
  void this.loadLobby();
 }
 createExitButton(){
  let key=BACK_KEY;
  if(!this.textures.exists(key)){
   // Keep a graphic exit usable even if the shared image fails to load.
   key='business_center_back_fallback_v1';
   if(!this.textures.exists(key)){
    const g=this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0x24352e,1);g.fillRoundedRect(0,0,112,56,8);
    g.lineStyle(2,0xd4af37,1);g.strokeRoundedRect(1,1,110,54,8);
    g.lineStyle(6,0xffe0a0,1);g.lineBetween(30,28,82,28);g.lineBetween(30,28,47,12);g.lineBetween(30,28,47,44);
    g.generateTexture(key,112,56);g.destroy();
   }
  }
  this.exitButton=this.add.image(18,16,key).setOrigin(0).setDepth(100).setInteractive({useHandCursor:true});
  this.exitButton.on('pointerover',()=>{if(!this.disposed&&!this.navigating)this.exitButton.setTint(0xffe5aa);});
  this.exitButton.on('pointerout',()=>this.exitButton?.clearTint());
  this.exitButton.on('pointerdown',()=>void this.leave());
 }
 layoutExitButton(){
  const button=this.exitButton;if(!button)return;
  const maxWidth=Math.min(150,Math.max(1,this.scale.width-36));
  const factor=Math.min(maxWidth/button.width,58/button.height);
  button.setPosition(18,16).setScale(factor);
 }
 hideGameplayHud(){
  this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
  const news=this.getRegisteredScene('NewsHud');news?.closeMenu?.(true);news?.setHudVisible?.(false);
  for(const key of ['PlayerHudScene','UIScene','NewsHud'])if(this.hasScene(key))this.scene.setVisible(false,key);
  const hud=document.getElementById('hud-container');
  if(hud){this.hiddenHud=hud;this.previousHudDisplay=hud.style.display;hud.style.display='none';}
 }
 async loadLobby(){
  const token=this.token;
  const [staffed,empty]=await Promise.all([this.loadTexture(ASSETS.staffed),this.loadTexture(ASSETS.empty)]);
  if(this.disposed||token!==this.token)return;
  if(!staffed&&!empty){
   this.status.setText('The lobby images could not be loaded.\n\nExpected files in:\n'+ASSET_ROOT+
    '\n\nlobby-under-construction and no-men\nSupported extensions: webp, png, jpg, jpeg.\n\nUse the back button or Escape to return.');return;
  }
  this.receptionistPresent=staffed;
  this.background=this.add.image(0,0,staffed?ASSETS.staffed.key:ASSETS.empty.key).setOrigin(0).setDepth(0);
  this.status.setVisible(false);
  for(const definition of HOTSPOTS)this.addHotspot(definition);
  this.ready=true;this.layoutRoom();this.refreshHotspots();
 }
 async loadTexture(asset){
  if(this.textures.exists(asset.key))return true;
  for(const extension of EXTENSIONS){
   if(this.disposed)return false;
   const loaded=await this.tryImage(asset.key,`${ASSET_ROOT}${asset.name}.${extension}`);
   if(loaded)return true;
  }
  return false;
 }
 tryImage(key,url){
  return new Promise(resolve=>{
   const image=new Image();let settled=false;
   const finish=success=>{
    if(settled)return;settled=true;image.onload=null;image.onerror=null;this.imageRequests.delete(cancel);resolve(success);
   };
   const cancel=()=>{finish(false);image.src='';};this.imageRequests.add(cancel);
   image.onload=()=>{
    if(this.disposed){finish(false);return;}
    try{if(!this.textures.exists(key))this.textures.addImage(key,image);finish(this.textures.exists(key));}
    catch(error){console.warn('[BusinessCenterScene] Image registration failed:',url,error);finish(false);}
   };
   image.onerror=()=>finish(false);image.src=url;
  });
 }
 addHotspot(definition){
  const rect=this.add.rectangle(0,0,1,1,0xffd27d,0).setDepth(10).setInteractive({useHandCursor:true});
  const label=this.add.text(0,0,definition.label,{
   fontFamily:'SpecialElite, monospace',fontSize:20,color:'#ffe4a5',backgroundColor:'#23362f',padding:{x:8,y:5}
  }).setOrigin(.5,1).setDepth(30).setVisible(false);
  rect.on('pointerover',()=>{if(this.canInteract())label.setVisible(true);});rect.on('pointerout',()=>label.setVisible(false));
  rect.on('pointerdown',()=>{if(this.canInteract())this.interact(definition.id);});
  this.hotspots.push({definition,rect,label});
 }
 layoutRoom(){
  if(this.disposed)return;
  this.layoutExitButton();
  const {width,height}=this.scale;this.status?.setWordWrapWidth(Math.max(100,width-48));
  if(!this.background)return;
  const source=this.textures.get(this.background.texture.key).getSourceImage();
  const scale=Math.min(width/source.width,height/source.height),w=source.width*scale,h=source.height*scale;
  const left=(width-w)/2,top=(height-h)/2;
  this.imageBox={left,top,width:w,height:h};this.background.setPosition(left,top).setDisplaySize(w,h);
  for(const {definition:d,rect,label}of this.hotspots){
   const rw=d.w*w,rh=d.h*h,x=left+d.x*w,y=top+d.y*h;
   rect.setPosition(x,y).setSize(rw,rh);rect.input?.hitArea?.setTo(0,0,rw,rh);label.setPosition(x,Math.max(40,y-rh/2-6));
  }
 }
 canInteract(){return this.ready&&!this.disposed&&!this.panelOpen&&!this.navigating;}
 refreshHotspots(){
  for(const {definition,rect,label}of this.hotspots){
   const available=definition.id!=='reception'||this.receptionistPresent;
   if(rect.input)rect.input.enabled=this.canInteract()&&available;
   label.setVisible(false);
  }
 }
 setReceptionistPresent(present){
  if(this.disposed||!this.ready||typeof present!=='boolean'||this.panelOpen||this.navigating)return false;
  const key=present?ASSETS.staffed.key:ASSETS.empty.key;if(!this.textures.exists(key))return false;
  this.receptionistPresent=present;this.background.setTexture(key);this.layoutRoom();this.refreshHotspots();return true;
 }
 interact(id){
  if(id==='reception')this.reception();
  else if(id==='directory')this.show('Tenant directory',CONFIG.directoryText);
  else if(id==='lift')this.show('Under construction',CONFIG.elevatorText);
  else if(id==='plant')this.show('Corporate greenery','The plant is still in its protective packaging. Apparently even the foliage is on probation.');
  else if(id==='bell'){
   if(this.receptionistPresent)this.show('Receptionist','I am right here. The bell is for emergencies. Such as nobody being right here.',[['Ask about the offices.',()=>this.reception()]]);
   else this.show('Service bell','Nobody answers. Even the echo is waiting for its contract.');
  }
 }
 reception(){
  if(!this.receptionistPresent)return;
  this.show('Receptionist',CONFIG.receptionText,[
   ['Which companies are here?',()=>this.show('Receptionist','No companies yet. We currently offer four floors of potential and one functioning bell.',[['Something else.',()=>this.reception()]])],
   ['Can I go upstairs?',()=>this.show('Receptionist',CONFIG.elevatorText,[['Something else.',()=>this.reception()]])],
   ['When will it be finished?',()=>this.show('Receptionist','The contractor said Monday. We are still negotiating which Monday.',[['Something else.',()=>this.reception()]])]
  ]);
 }
 show(title,text,choices=[]){
  if(this.disposed||this.navigating)return;
  this.panelOpen=true;this.refreshHotspots();
  this.dialogue.show({title,text,choices:[...choices,['Back to the lobby.',()=>this.closePanel()]]});
 }
 closePanel(){this.dialogue?.close(false);this.panelOpen=false;if(!this.disposed)this.refreshHotspots();}
 onEscape(event){
  if(event?.repeat||this.disposed||this.navigating)return;
  event?.preventDefault();if(this.panelOpen)this.closePanel();else void this.leave();
 }
 async leave(){
  if(this.disposed||this.navigating)return false;
  this.navigating=true;this.refreshHotspots();const token=this.token;
  try{
   const result=await this.goto('HomeCityScene',{entryPoint:CONFIG.buildingId,fromScene:CONFIG.sceneKey,gameState});
   if(result===false&&!this.disposed&&token===this.token)this.navigationError();return result!==false;
  }catch(error){
   console.error('[BusinessCenterScene]',error);if(!this.disposed&&token===this.token)this.navigationError();return false;
  }
 }
 navigationError(){this.navigating=false;this.show('Exit','The town could not be opened. Please try again.');}
 disposeCenter(){
  if(this.disposed)return;
  this.disposed=true;this.ready=false;this.token=null;
  for(const cancel of [...this.imageRequests])cancel();this.imageRequests.clear();
  this.dialogue?.destroy();this.dialogue=null;
  if(this.hiddenHud)this.hiddenHud.style.display=this.previousHudDisplay;
  this.hiddenHud=null;this.hotspots=[];
  this.events.off('shutdown',this.disposeCenter,this);this.events.off('destroy',this.disposeCenter,this);
 }
}
