import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { OFFICE_CONFIG } from '../config/detectiveOfficeConfig.js';
import { acceptPIQuestFromAdvert, getPIQuestStatus } from '../managers/PIQuestManager.js';
import { PIOfficeComputerUI } from '../ui/PIOfficeComputerUI.js';
import { PIOfficePhoneUI } from '../ui/PIOfficePhoneUI.js';
import { PICrimeBoardUI } from '../ui/PICrimeBoardUI.js';
import { PIOfficeDestinationsUI } from '../ui/PIOfficeDestinationsUI.js';
const SCENE_KEY='DetectiveOfficeScene',HUD_LOCK_CLASS='pi-office-hide-gameplay-hud',HUD_LOCK_STYLE='pi-office-hud-lock-style';
const DATA_FILES=[['piOfficeMail','assets/data/piMail.json'],['piOfficeClassifieds','assets/data/piClassifieds.json'],['piPhoneDirectory','assets/data/piPhoneDirectory.json'],['piPhoneDialogues','assets/data/piPhoneDialogues.json'],['piCases','assets/data/piCases.json']];
const PHONE_ART=[['pi_phone_desk','assets/ui/pi-phone/desk.jpg'],['pi_phone_base','assets/ui/pi-phone/base.webp'],['pi_phone_handset','assets/ui/pi-phone/handset.webp'],['pi_phone_dial','assets/ui/pi-phone/dial.webp']];
export function officeHotspotBounds(cfg,sourceWidth,sourceHeight,width,height){
 const sx=width/Math.max(1,sourceWidth),sy=height/Math.max(1,sourceHeight);
 return{x:cfg.x*sx,y:cfg.y*sy,w:cfg.w*sx,h:cfg.h*sy};
}
export class DetectiveOfficeScene extends BaseScene{
 constructor(){super({key:SCENE_KEY});}
 init(data={}){
  this.gameState=gameState;this.entrySource=data.entrySource||'destinations';this.citySceneKey=OFFICE_CONFIG.citySceneKey||'HomeCityScene';this.hotspotDefs=(OFFICE_CONFIG.hotspots||[]).map(c=>({...c}));this.hotspots=[];
  Object.assign(this,{debugMode:false,selectedIndex:0,navigating:false,disposed:false,activeDevice:null,computerChild:null,childLoading:false,computerUI:null,phoneUI:null,piCrimeBoardUI:null,destinationsUI:null,newsHud:null,headlineIndex:0,tickerContainer:null,tickerText:null,tickerMask:null,tickerMaskShape:null,feedback:null,feedbackTimer:null,hudLockOwned:false,interactionEnabled:null});
  this.hiddenOverlays=new Map();this.runToken=Symbol('pi-office');
 }
 preload(){const key=OFFICE_CONFIG.backgroundKey||'pi_office_bg',url=OFFICE_CONFIG.backgroundUrl||'assets/local/pioffice.webp';if(!this.textures.exists(key))this.load.image(key,url);for(const[k,u]of DATA_FILES)if(!this.cache.json.exists(k))this.load.json(k,u);for(const[k,u]of PHONE_ART)if(!this.textures.exists(k))this.load.image(k,u);if(!this.textures.exists('pi_computer_wallpaper'))this.load.image('pi_computer_wallpaper','assets/ui/pi-computer/wallpaper.png');}
 create(){
  super.create();const{width,height}=this.scale;this.registry.set('currentSceneKey',SCENE_KEY);const key=OFFICE_CONFIG.backgroundKey||'pi_office_bg';
  if(this.textures.exists(key)){const source=this.textures.get(key).getSourceImage();this.officeSource={width:source.width,height:source.height};this.officeBackground=this.add.image(width/2,height/2,key).setDisplaySize(width,height);}
  else{this.officeSource={width,height};this.officeBackground=this.add.rectangle(0,0,width,height,0x25231e).setOrigin(0);console.error('[DetectiveOfficeScene] Background missing:',key);}
  this.hideGameplayHud();this.createNewsTicker();this.hotspots=this.hotspotDefs.map((c,i)=>this.createHotspot(c,i));
  this.officeTitle=this.add.text(16,this.newsConfig.y+this.newsConfig.height+10,OFFICE_CONFIG.officeLabel||'PI OFFICE',this.style(14)).setDepth(100);
  this.debugText=this.add.text(16,Math.max(100,height-150),'',this.style(13)).setDepth(400);this.createPanels();this.bindEvents();this.updateDebug();void this.setupNewsHud();
 }
 lockHtmlHud(){if(!document.getElementById(HUD_LOCK_STYLE)){const s=document.createElement('style');s.id=HUD_LOCK_STYLE;s.textContent=`html.${HUD_LOCK_CLASS} #hud-container {display:none!important;visibility:hidden!important;pointer-events:none!important;}`;document.head.appendChild(s);}document.documentElement.classList.add(HUD_LOCK_CLASS);this.hudLockOwned=true;this.getRegisteredScene('UIScene')?.hideHUD?.();}
 unlockHtmlHud(){if(!this.hudLockOwned)return;document.documentElement.classList.remove(HUD_LOCK_CLASS);this.hudLockOwned=false;}
 hideGameplayHud(){if(this.disposed||this._cleanupDone)return;this.lockHtmlHud();for(const k of['PlayerHudScene','UIScene']){if(!this.hasScene(k))continue;const s=this.getRegisteredScene(k);if(k==='PlayerHudScene')s?.closeAllUIPanels?.();this.scene.setVisible(false,k);}}
 get newsConfig(){const c=OFFICE_CONFIG.newsTicker||{};return{y:Number.isFinite(c.y)?c.y:0,height:Number.isFinite(c.height)?c.height:44,speed:Number.isFinite(c.speed)?c.speed:90,headlines:Array.isArray(c.headlines)?c.headlines.filter(v=>typeof v==='string'&&v.trim()):[]};}
 style(size=16){return{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#fff1ce',backgroundColor:'#191b16',padding:{x:8,y:6}};}
 isCurrent(t){return t===this.runToken&&!this.disposed&&!this._cleanupDone&&this.sys.isActive();}
 canUseOffice(){return !this.disposed&&!this._cleanupDone&&!this.navigating&&!this.activeDevice&&!this.computerChild&&!this.childLoading&&this.sys.isActive();}
 createPanels(){
  this.computerUI=new PIOfficeComputerUI(this,{wallpaperKey:'pi_computer_wallpaper',onOpen:()=>this.deviceOpened('computer'),onClose:()=>this.deviceClosed('computer'),onOpenInvestigations:()=>this.openInvestigations(),onOpenWorldTravel:()=>this.openWorldTravel(),onAcceptMission:a=>acceptPIQuestFromAdvert(this,a.id),getMissionStatus:id=>getPIQuestStatus(id)});
  this.phoneUI=new PIOfficePhoneUI(this,{onOpen:()=>this.deviceOpened('phone'),onClose:()=>this.deviceClosed('phone')});
  this.piCrimeBoardUI=new PICrimeBoardUI(this,{onOpen:()=>{this.computerChild='crimeboard';},onClose:()=>this.returnToComputer()});this.destinationsUI=new PIOfficeDestinationsUI(this,{onClose:({returnToComputer})=>{if(returnToComputer)this.returnToComputer();}});
 }
 bindEvents(){
  this.keyHandler=e=>this.onKey(e);this.input.keyboard?.on('keydown',this.keyHandler);
  this.onResume=()=>{if(this.disposed||this._cleanupDone)return;this.registry.set('currentSceneKey',SCENE_KEY);this.hideGameplayHud();this.refreshInteractions();};this.onOfficeSleep=()=>this.unlockHtmlHud();this.onOfficeResize=()=>this.layoutOffice();
  this.events.on('resume',this.onResume);this.events.on('wake',this.onResume);this.events.on('sleep',this.onOfficeSleep);this.scale.on('resize',this.onOfficeResize);this.events.once('shutdown',this.cleanupOffice,this);this.events.once('destroy',this.cleanupOffice,this);
 }
 layoutOffice(){
  if(this.disposed)return;const{width,height}=this.scale;this.officeBackground?.setDisplaySize(width,height);if(this.officeBackground?.type==='Image')this.officeBackground.setPosition(width/2,height/2);
  for(const h of this.hotspots)this.syncHotspot(h);this.debugText?.setPosition(16,Math.max(100,height-150));
 }
 openComputer(){if(this.canUseOffice()&&!this.debugMode)this.computerUI.open();}
 openPhone(){if(this.canUseOffice()&&!this.debugMode)this.phoneUI.open();}
 deviceOpened(type){
  if(this.disposed)return;this.activeDevice=type;this.computerChild=null;this.hideGameplayHud();this.hiddenOverlays.clear();if(this.hasScene('NewsHud')){const n=this.getRegisteredScene('NewsHud');this.hiddenOverlays.set('NewsHud',Boolean(n?.sys.settings.visible));n?.closeMenu?.(true);this.scene.setVisible(false,'NewsHud');}this.tickerContainer?.setVisible(false);this.refreshInteractions();
 }
 deviceClosed(type){
  if(this.activeDevice!==type)return;this.activeDevice=null;this.computerChild=null;this.childLoading=false;if(this.disposed||this._cleanupDone||!this.sys.isActive())return;
  for(const[k,v]of this.hiddenOverlays){if(!this.hasScene(k))continue;this.scene.setVisible(v,k);if(v)this.bringSceneToTopIfActive(k);}this.hiddenOverlays.clear();this.hideGameplayHud();this.tickerContainer?.setVisible(true);this.updateDebug();
 }
 canOpenComputerChild(){return !this.disposed&&!this.navigating&&this.activeDevice==='computer'&&this.computerUI?.isOpen&&!this.computerChild&&!this.childLoading;}
 async openInvestigations(){
  if(!this.canOpenComputerChild())return;const t=this.runToken;this.childLoading=true;this.computerChild='crimeboard';this.computerUI.suspend();
  try{const opened=await this.piCrimeBoardUI.open();if(!this.isCurrent(t))return;if(!opened){this.returnToComputer();this.showFeedback('The investigation board could not be opened.');}}
  catch(e){if(this.isCurrent(t)){this.returnToComputer();this.showFeedback('The investigation board could not be opened.');}console.error('[DetectiveOfficeScene] PI board failed:',e);}finally{if(this.isCurrent(t))this.childLoading=false;}
 }
 async openWorldTravel(){
  if(!this.canOpenComputerChild())return;const t=this.runToken;this.childLoading=true;this.computerChild='destinations';this.computerUI.suspend();
  try{await this.ensureOverlayScene('NewsHud');if(!this.isCurrent(t))return;this.scene.setVisible(false,'NewsHud');this.destinationsUI.open(gameState);if(!this.destinationsUI.isOpen){this.returnToComputer();this.showFeedback('The travel map is currently unavailable.');}}
  catch(e){if(this.isCurrent(t)){this.returnToComputer();this.showFeedback('The travel map could not be opened.');}console.error('[DetectiveOfficeScene] Travel map failed:',e);}finally{if(this.isCurrent(t))this.childLoading=false;}
 }
 returnToComputer(){if(this.disposed||this._cleanupDone||this.navigating||!this.sys.isActive())return;this.computerChild=null;this.childLoading=false;this.hideGameplayHud();if(this.hasScene('NewsHud'))this.scene.setVisible(false,'NewsHud');if(this.computerUI?.isOpen){this.activeDevice='computer';this.computerUI.resume();}this.refreshInteractions();}
 async goToCity(){if(!this.canUseOffice()||this.debugMode)return false;const t=this.runToken;this.navigating=true;this.refreshInteractions();const moved=await this.goto(this.citySceneKey,{entryPoint:'pi-office',fromScene:SCENE_KEY,gameState});if(!this.isCurrent(t))return moved!==false;this.navigating=false;this.refreshInteractions();if(moved===false)this.showFeedback('Too drunk to go to the city.');return moved!==false;}
 exitOffice(){return this.goToCity();}
 async setupNewsHud(){
  const t=this.runToken;try{const n=await this.ensureOverlayScene('NewsHud');if(!this.isCurrent(t)||!n)return;this.newsHud=n;n.events.emit('setButtonsVisible',true);n.setHudVisible?.(true);if(this.activeDevice){if(!this.hiddenOverlays.has('NewsHud'))this.hiddenOverlays.set('NewsHud',true);this.scene.setVisible(false,'NewsHud');}else this.bringSceneToTopIfActive('NewsHud');this.hideGameplayHud();this.refreshInteractions();}catch(e){console.error('[DetectiveOfficeScene] News setup failed:',e);}
 }
 createNewsTicker(){
  const{width}=this.scale,c=this.newsConfig;this.tickerContainer=this.add.container(0,c.y).setDepth(300);const bar=this.add.rectangle(width/2,c.height/2,width,c.height,0x0e0d0b,.94).setStrokeStyle(1,0x8a7a4d),title=this.add.text(12,c.height/2,'NEWS',{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#ffd166'}).setOrigin(0,.5);
  this.tickerText=this.add.text(width+20,c.height/2,'',this.style(15)).setOrigin(0,.5);this.tickerMaskShape=this.make.graphics({add:false});this.tickerMaskShape.fillStyle(0xffffff,1);this.tickerMaskShape.fillRect(78,c.y,Math.max(1,width-78),c.height);this.tickerMask=this.tickerMaskShape.createGeometryMask();this.tickerText.setMask(this.tickerMask);this.tickerContainer.add([bar,this.tickerText,title]);this.setTickerHeadline();
 }
 setTickerHeadline(){this.tickerText?.setText(this.newsConfig.headlines[this.headlineIndex]||'No new reports.');}
 update(_time,delta){
  if(this.disposed)return;
  if(this.interactionEnabled!==this.canUseOffice())this.refreshInteractions();
  if(!this.tickerText?.active||!this.tickerContainer?.visible)return;this.tickerText.x-=this.newsConfig.speed*Math.min(delta,100)/1000;
  if(this.tickerText.x+this.tickerText.width<78){this.headlineIndex=(this.headlineIndex+1)%Math.max(1,this.newsConfig.headlines.length);this.setTickerHeadline();this.tickerText.x=this.scale.width+20;}
 }
 createHotspot(cfg,index){
  cfg.x=Number.isFinite(cfg.x)?cfg.x:100;cfg.y=Number.isFinite(cfg.y)?cfg.y:100;cfg.w=Math.max(10,Number(cfg.w)||100);cfg.h=Math.max(10,Number(cfg.h)||100);
  const rect=this.add.rectangle(0,0,1,1,0xffd166,0).setDepth(10).setInteractive({useHandCursor:true}),label=this.add.text(0,0,cfg.label||cfg.id,this.style(16)).setOrigin(.5,1).setDepth(20).setVisible(false),hotspot={cfg,rect,label};
  rect.on('pointerover',()=>{if(this.canUseOffice()&&!this.debugMode)label.setVisible(true);});
  rect.on('pointerout',()=>{if(!this.debugMode){rect.setFillStyle(0xffd166,0);label.setVisible(false);}});
  rect.on('pointerdown',()=>{
   if(!this.canUseOffice())return;if(this.debugMode){this.selectedIndex=index;this.updateDebug();return;}
   rect.setFillStyle(0xffd166,0);label.setVisible(false);
   switch(cfg.action){case'computer':this.openComputer();break;case'phone':this.openPhone();break;case'city':case'gotoCity':void this.goToCity();break;default:console.warn('[DetectiveOfficeScene] Unknown action:',cfg.action);}
  });
  this.input.setDraggable(rect,false);rect.on('drag',(_p,x,y)=>{if(!this.debugMode||!this.canUseOffice())return;this.selectedIndex=index;cfg.x=Math.round(x*this.officeSource.width/this.scale.width);cfg.y=Math.round(y*this.officeSource.height/this.scale.height);this.syncHotspot(hotspot);this.updateDebug();});this.syncHotspot(hotspot);return hotspot;
 }
 syncHotspot({cfg,rect,label}){
  const b=officeHotspotBounds(cfg,this.officeSource.width,this.officeSource.height,this.scale.width,this.scale.height);rect.setPosition(b.x,b.y).setSize(b.w,b.h);rect.input?.hitArea?.setTo(0,0,b.w,b.h);label.setPosition(b.x,b.y-b.h/2-8);
 }
 refreshInteractions(){if(this.disposed)return;const enabled=this.canUseOffice();this.interactionEnabled=enabled;for(const{rect,label}of this.hotspots){if(rect.input)rect.input.enabled=enabled;this.input.setDraggable(rect,enabled&&this.debugMode);if(!this.debugMode){rect.setFillStyle(0xffd166,0).setStrokeStyle(0);label.setVisible(false);}}}
 onKey(e){
  const t=e.target;if(t?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t?.tagName)||!this.canUseOffice())return;
  if(e.code==='Escape'){e.preventDefault();if(this.debugMode){this.debugMode=false;this.updateDebug();}else void this.goToCity();return;}
  if(e.code==='KeyD'){e.preventDefault();this.debugMode=!this.debugMode;this.updateDebug();return;}if(!this.debugMode||!this.hotspots.length)return;
  if(e.code==='KeyC'){e.preventDefault();console.log('COPY INTO config/detectiveOfficeConfig.js -> hotspots:');console.log(JSON.stringify(this.hotspotDefs,null,2));this.showFeedback('Hotspot configuration exported to the console.');return;}
  if(e.code==='Tab'){e.preventDefault();this.selectedIndex=(this.selectedIndex+(e.shiftKey?-1:1)+this.hotspots.length)%this.hotspots.length;this.updateDebug();return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();const h=this.hotspots[this.selectedIndex],horizontal=e.code==='ArrowLeft'||e.code==='ArrowRight',dir=e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:1,key=e.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');h.cfg[key]+=dir*(e.altKey?1:5);h.cfg.w=Math.max(10,h.cfg.w);h.cfg.h=Math.max(10,h.cfg.h);this.syncHotspot(h);this.updateDebug();
 }
 updateDebug(){this.hotspots.forEach((h,i)=>{h.rect.setFillStyle(0x00ff88,this.debugMode ? .2 : 0).setStrokeStyle(this.debugMode?2:0,i===this.selectedIndex?0xff44ff:0x00ff88);h.label.setVisible(this.debugMode);});const c=this.hotspots[this.selectedIndex]?.cfg;this.debugText?.setText(this.debugMode?[`DEBUG: ${c?.id||'no hotspots'}`,`x:${c?.x} y:${c?.y} w:${c?.w} h:${c?.h}`,'Arrows: move | Shift: resize | Alt: 1px','Tab: next | C: export | D / Escape: close','Hotspot actions disabled.'].join('\n'):'');this.refreshInteractions();}
 showFeedback(text){if(this.disposed||this._cleanupDone)return;this.feedbackTimer?.remove(false);this.feedback?.destroy();const m=this.add.text(this.scale.width/2,this.newsConfig.y+this.newsConfig.height+80,text,{...this.style(18),align:'center',wordWrap:{width:Math.max(100,this.scale.width-60)}}).setOrigin(.5,0).setDepth(2500);this.feedback=m;this.feedbackTimer=this.time.delayedCall(3500,()=>{if(m.active)m.destroy();if(this.feedback===m){this.feedback=null;this.feedbackTimer=null;}});}
 cleanupOffice(){
  if(this.disposed)return;this.disposed=true;this.runToken=null;this.input.keyboard?.off('keydown',this.keyHandler);this.scale.off('resize',this.onOfficeResize);this.events.off('resume',this.onResume);this.events.off('wake',this.onResume);this.events.off('sleep',this.onOfficeSleep);this.events.off('shutdown',this.cleanupOffice,this);this.events.off('destroy',this.cleanupOffice,this);this.feedbackTimer?.remove(false);
  try{for(const k of['piCrimeBoardUI','destinationsUI','phoneUI','computerUI']){try{this[k]?.destroy();}catch(e){console.warn(`[DetectiveOfficeScene] ${k} cleanup failed:`,e);}this[k]=null;}this.tickerText?.clearMask(false);this.tickerMask?.destroy();this.tickerMaskShape?.destroy();this.hiddenOverlays.clear();}finally{this.unlockHtmlHud();}
 }
}
