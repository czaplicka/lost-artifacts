import {BaseScene} from './BaseScene.js';
import {gameState} from '../GameData.js';
import {saveGameState} from '../gameStatePersistence.js';
import {getEnergyManager} from '../managers/EnergyManager.js';
import {getLocationBackgroundCandidates} from '../npcThemeHelper.js';
import {ensureHud} from '../hudHelpers.js';
import {EventBus} from '../EventBus.js';
export class CityPlaceScene extends BaseScene {
 constructor(){super({key:'CityPlaceScene'});}
 init(data={}){this.cityId=data.cityId;this.placeId=data.placeId;this.leaving=false;this.newsSnapshot=null;}
 create(){
  super.create();this.events.once('shutdown',this.restoreNews,this);this.hideNews();
  this.scene.manager.keys.PlayerHudScene?.closeAllUIPanels?.();
  const city=(this.cache.json.get('locations')||[]).find(c=>c.id===this.cityId),place=city?.cityPlaces?.[this.placeId];
  const {width,height}=this.scale;
  const key=getLocationBackgroundCandidates(this.placeId,city).find(k=>this.textures.exists(k));
  if(key)this.add.image(width/2,height/2,key).setDisplaySize(width,height);else this.cameras.main.setBackgroundColor('#14212a');
  let message=place?.description||'No witness is currently available here. The furniture has declined to comment.';
  let available=!!place&&place.enabled!==false&&!place.npcId;
  const energy=getEnergyManager(),rawHour=Number(gameState.currentHour??gameState.hour??8),hour=Number.isFinite(rawHour)?((Math.floor(rawHour)%24)+24)%24:8,part=hour>=6&&hour<12?'Morning':hour>=12&&hour<18?'Afternoon':hour>=18&&hour<22?'Evening':'Night';
  if(available&&Array.isArray(place.hours)&&!place.hours.includes(part)){available=false;message='This location is closed. Even the furniture has gone home.';}
  if(available&&(energy.isForcedSleepActive()||energy.isManualSleepActive())){available=false;message='You need to rest before this visit.';}
  let paid=false,cost=0;
  if(available){cost=Math.max(0,Number(energy.getTravelCost('taxi'))||0);if(!energy.canAfford(cost).ok)message='You need more energy for the taxi ride. Return to the city and get some rest.';else{const result=energy.consumeCustom(cost,'Travel to '+place.name,{requireFullAmount:true,activityType:'city_place_visit'});paid=result?.success===true;if(!paid)message='The visit could not begin. Return to the city and try again after resting.';}}
  if(!place||place.enabled===false||place.npcId)message='This location is not available for an independent visit.';
  if(paid){const minutes=Math.max(1,Math.min(120,Number(place.visitMinutes)||15));gameState.timeSpent=(Number(gameState.timeSpent)||0)+minutes/60;gameState.addEncounter(`city_place:${this.cityId}:${this.placeId}`);EventBus.emit('advanceTime',0,minutes);saveGameState();message+='\n\nVisit: '+minutes+' min · Taxi: '+cost+' energy';}
  const panelHeight=Math.min(330,height*.55);
  this.add.rectangle(width/2,height-panelHeight/2,width,panelHeight,0x14212a,.96).setDepth(10);
  this.add.text(24,height-panelHeight+20,place?.name||'Location unavailable',{fontFamily:'SpecialElite',fontSize:'26px',color:'#ebd2a3',wordWrap:{width:Math.max(120,width-48)}}).setDepth(11);
  this.add.text(24,height-panelHeight+70,message,{fontFamily:'SpecialElite',fontSize:'20px',color:'#ece5d4',wordWrap:{width:Math.max(120,width-48)}}).setDepth(11);
  const back=this.add.text(width-28,height-28,'Return to city',{fontFamily:'SpecialElite',fontSize:'22px',color:'#ffe0a3',backgroundColor:'#263f47',padding:{x:12,y:8}}).setOrigin(1).setDepth(12).setInteractive({useHandCursor:true});
  back.on('pointerdown',()=>{void this.returnToCity();});ensureHud(this);
 }
 hideNews(){const news=this.scene.manager.keys.NewsHud;if(!news?.sys?.isActive())return;this.newsSnapshot={scene:news,visible:news.sys.settings.visible,inputEnabled:news.input.enabled};news.closeMenu?.(true);news.scene.setVisible(false);news.input.enabled=false;}
 restoreNews(){const s=this.newsSnapshot;if(s?.scene?.sys?.isActive()){s.scene.scene.setVisible(s.visible);s.scene.input.enabled=s.inputEnabled;}this.newsSnapshot=null;}
 async returnToCity(){if(this.leaving)return;this.leaving=true;try{const started=await this.goto('CityScene',{cityId:this.cityId,cityCompleted:false,investigationStatus:null,pendingPhoneCall:false});if(!started&&!this._cleanupDone)this.leaving=false;}catch(error){console.error('[CityPlaceScene] Return failed:',error);if(!this._cleanupDone)this.leaving=false;}}
}
