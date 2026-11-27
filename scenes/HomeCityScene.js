import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { HomeCityRenderer } from './homeCity/HomeCityRenderer.js';
import { CEMETERY_BUILDING, enterCemeteryFromMap } from './homeCity/CemeteryMapAccess.js';
import { attachPIClockUI } from '../ui/PIClockUI.js';
import { getPILocationStatus } from '../managers/PIClockManager.js';
import { PI_SCENE_LOCATIONS } from '../config/piTimeConfig.js';
import { PostOfficeScene } from './PostOfficeScene.js';
import { HospitalScene } from './HospitalScene.js';
import { BusinessCenterScene } from './BusinessCenterScene.js';
import { ChurchScene } from './ChurchScene.js';
import { LombardScene } from './LombardScene.js';
import { PALETTES, WORLD_W as GROUND_W, WORLD_H as GROUND_H } from './homeCity/HomeCityConfig.js';
import { HomeCityRendererCore } from './homeCity/HomeCityRendererCore.js';
import { LOMBARD_BUILDING, LOMBARD_PROPS } from './homeCity/HomeCityLombard.js';
import { CHURCH_BUILDING, CHURCH_CLEARED_PROPS, CHURCH_PROPS, CHURCH_PROP_QUIPS, CHURCH_LABEL_LIFT } from './homeCity/HomeCityChurch.js';
import { CONSTRUCTION_PROP_QUIPS, CONSTRUCTION_SITE_BUILDING, CONSTRUCTION_SITE_PROPS } from './homeCity/HomeCityConstruction.js';
import { SHOOTING_RANGE_BUILDING, SHOOTING_RANGE_PROPS } from './homeCity/HomeCityShootingRange.js';
import { ShootingRangeScene } from './ShootingRangeScene.js';

// Keep both existing translation namespaces. Do not remove their dialogue data.
const T=id=>__dialogueText('scenes/HomeCityScene.js',id);
const E=id=>__dialogueText('scenes/HomeCityPostOfficeScene.js',id);
const KEY='HomeCityScene';
// ROWS 30: third street (lots y21-23, road y26-27). OX moved right so the new
// rows (which grow down-left in iso) stay inside the world. WORLD_* must match
// WORLD_W/WORLD_H in homeCity/HomeCityConfig.js.
const COLS=36,ROWS=30,HW=64,HH=32,OX=2112,OY=240,WORLD_WIDTH=4637,WORLD_HEIGHT=2656;
const INSTRUCTION=T('t_8fa98636da35e169410b');
const ARROWS=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
const BUILDINGS=[
  {id:'pi-office',name:T('t_6114b7873f77428c0e51'),x:4,y:3,w:3,h:3,color:0xc5ab79,message:''},
  {id:'spy-shop',name:T('t_3255c8c9c96d793690e2'),x:12,y:3,w:3,h:3,color:0x688d8b,message:T('t_dc734ee249455bda8af7')},
  {id:'tavern',name:T('t_255a70fd8ebfcbcfa78f'),x:20,y:5,w:3,h:3,color:0xae7458,message:''},
  {id:'police-station',name:T('t_e0cc86d123eb4754e7b3'),x:5,y:13,w:4,h:3,color:0x758aa5,message:''},
  {id:'your-home',name:T('t_5840e59828db3828789f'),x:16,y:14,w:3,h:3,color:0x96905c,message:''},
  CEMETERY_BUILDING,
];
const EXTRA_BUILDINGS=[
  {id:'post-office',name:E('t_bf90c07b7526b278c9c8'),x:16,y:3,w:3,h:3,color:0xa06048,message:'',sceneKey:'PostOfficeScene',SceneClass:PostOfficeScene},
  {id:'hospital',name:E('t_97e9623661f2970acb41'),x:29,y:13,w:4,h:3,color:0xaebdac,message:'',sceneKey:'HospitalScene',SceneClass:HospitalScene},
  {id:'business-center',name:E('t_a16572219d4cbc8fe62b'),x:29,y:21,w:4,h:3,color:0x8e9b9b,message:'',sceneKey:'BusinessCenterScene',SceneClass:BusinessCenterScene},
  {...CHURCH_BUILDING,SceneClass:ChurchScene},
  {...LOMBARD_BUILDING,SceneClass:LombardScene},
  {...SHOOTING_RANGE_BUILDING,SceneClass:ShootingRangeScene},
  // No sceneKey: arriving shows one of the site's quips (visitClosedBuilding).
  {...CONSTRUCTION_SITE_BUILDING},
];
const PROPS=[
  {x:8,y:6,kind:'lamp'},{x:12,y:7,kind:'lamp'},{x:8,y:17,kind:'lamp'},{x:19,y:12,kind:'lamp'},
  {x:14,y:10,kind:'bench'},{x:16,y:10,kind:'planter'},{x:13,y:8,kind:'board'},{x:17,y:10,kind:'bin'},
  {x:4,y:7,kind:'planter'},{x:15,y:6,kind:'planter'},{x:23,y:8,kind:'bin'},{x:5,y:17,kind:'bench'},{x:19,y:17,kind:'planter'},
  {x:4,y:1,kind:'tree',variant:0},{x:7,y:1,kind:'tree',variant:1},{x:15,y:1,kind:'tree',variant:2},
  {x:24,y:3,kind:'tree',variant:1},{x:24,y:6,kind:'tree',variant:0},{x:13,y:14,kind:'tree',variant:2},
  {x:24,y:15,kind:'tree',variant:1},{x:14,y:29,kind:'tree',variant:0},{x:22,y:29,kind:'tree',variant:1},
  {x:5,y:29,kind:'tree',variant:2},{x:30,y:29,kind:'tree',variant:0},{x:19,y:25,kind:'lamp'},
  // small green at the east end of the north street (where church, business center and range stood)
  {x:28,y:4,kind:'tree',variant:2},{x:31,y:3,kind:'tree',variant:1},{x:34,y:4,kind:'tree',variant:0},
  {x:27,y:3,kind:'bush'},{x:33,y:6,kind:'bush'},{x:30,y:6,kind:'bench'},{x:29,y:6,kind:'lamp'},
  {x:7,y:4,kind:'bush'},{x:15,y:3,kind:'bush'},{x:19,y:6,kind:'bush'},{x:4,y:14,kind:'bush'},
  {x:15,y:13,kind:'bush'},{x:4,y:16,kind:'bush'},{x:8,y:12,kind:'hydrant'},{x:0,y:12,kind:'mailbox'},
  {x:17,y:7,kind:'kiosk'},{x:19,y:7,kind:'crate'},{x:15,y:9,kind:'statue'},{x:18,y:9,kind:'signpost'},
  {x:12,y:10,kind:'cart'},{x:12,y:13,kind:'phonebooth'},{x:12,y:17,kind:'clock'},
  {x:4,y:11,kind:'car',w:2,h:1,variant:0},{x:11,y:14,kind:'car',w:1,h:2,variant:1},
  {x:18,y:11,kind:'car',w:2,h:1,variant:2},
];
const HOSPITAL_PROPS=[
  {x:34,y:13,kind:'tree',variant:1},{x:27,y:16,kind:'planter'},{x:35,y:16,kind:'planter'},
  {x:29,y:17,kind:'bench'},{x:33,y:17,kind:'bench'},{x:28,y:17,kind:'lamp'},{x:34,y:17,kind:'lamp'},
];
const EXTRA_PROPS=[...HOSPITAL_PROPS,...CHURCH_PROPS,...LOMBARD_PROPS,...SHOOTING_RANGE_PROPS,...CONSTRUCTION_SITE_PROPS];
const PROP_QUIPS={
  lamp:[T('t_32874e1a6e965eabc9d9'),T('t_79fda5d986c17d5e38d8')],
  bench:[T('t_31115bf96d69447c27b4'),T('t_2b091f903af17d44c46a')],
  planter:[T('t_239539b5617025beed2d'),T('t_c8bdeb17251409a2bbd2')],
  board:[T('t_34008446a4748c1cc5dc'),T('t_7284f6c0873f5ed63c93')],
  bin:[T('t_84af536b36ecebfaa139'),T('t_bc7368b86e37ff762b98')],
  tree:[T('t_78b2f0d6589dacf6a9fd'),T('t_b4cfb45e5a46eec528d7')],
  bush:[T('t_69ec535ff656d7e2c4d6'),T('t_c5e82bf70a956c2512c3')],
  hydrant:[T('t_1d25d66bfad624be0845'),T('t_dcbc9e669171a8ce8ca7')],
  mailbox:[T('t_bb2a56746ef26c160581'),T('t_2969365a6f62668b2fa0')],
  kiosk:[T('t_c9df4f47a41be1fba825'),T('t_1504daee090bf6eb16a8')],
  crate:[T('t_45d33ca338fe2cf4275c'),T('t_db320865b8c11108051c')],
  statue:[T('t_d71cb9a4d52c0c1f9567'),T('t_558f66e2cebbb888609e')],
  signpost:[T('t_1367f6dc5b4bfaa12d0d'),T('t_b428f139370c91f11c07')],
  cart:[T('t_af44ec56e0163b5e8674'),T('t_2c35bde020c196d9526f')],
  phonebooth:[T('t_efdf02b7b7120e1f40bb'),T('t_c697005d5ab02d2eeb65')],
  clock:[T('t_774c94b3b3b9ed41c526'),T('t_52e73a773d2f38b7f947')],
  car:[T('t_fb3072621ea966582da4'),T('t_a172bd0350b5fa2ad0d1')],
  ...CHURCH_PROP_QUIPS,...CONSTRUCTION_PROP_QUIPS,
};
let closedBuildingVisits=0;
PALETTES['post-office']={
  wall:0xb98c62,shade:0x88563f,roof:0x493c35,trim:0xe1c99e,glass:0x35494c,accent:0xd7b16b,
  height:138,style:'brick',door:0x49382d,lit:.3,blinds:true,blade:'lens',sign:E('t_620a597cd8e1abb75463'),
  features:[{t:[1,1],k:'vent'}],
};
PALETTES.hospital={
  wall:0xb6c3ae,shade:0x788f83,roof:0x455b56,trim:0xe3dfc6,glass:0x354f55,accent:0xd6c89c,
  height:180,style:'stone',door:0x3d5953,lit:.55,blinds:true,blade:'badge',sign:E('t_6c7923d43c2290e41396'),
  features:[{t:[0,0],k:'vent'},{t:[3,0],k:'vent'}],
};
PALETTES['business-center']={
  wall:0x9eaaa5,shade:0x687c79,roof:0x3e4b4d,trim:0xd9d4b9,glass:0x304b57,accent:0xcbb57b,
  height:230,style:'stone',door:0x324943,lit:.25,blinds:true,pilasters:true,blade:'lens',
  sign:E('t_ea28bc91925091253ae9'),features:[{t:[0,0],k:'vent'},{t:[3,0],k:'antenna'}],
};

export class HomeCityScene extends BaseScene {
  constructor(){super({key:KEY});}
  init(data={}){
    this.cols=COLS;this.rows=ROWS;this.entryPoint=data.entryPoint??null;
    this.buildings=BUILDINGS.map(b=>({...b,door:{x:b.x+Math.floor(b.w/2),y:b.y+b.h}}));
    this.props=PROPS.map(p=>({...p}));
    this.path=[];this.destinationBuilding=null;this.navigating=false;this.disposed=false;
    this.runToken=Symbol(KEY);this.saveElapsed=0;this.feedbackTimer=null;
    this.lastCameraPosition=null;this.position=null;this.cityArt=null;
    this.heldArrows=new Set();this.movementMode='pointer';this.blocked=new Set();
    this.cemeteryRefusalIndex=0;this.quipIndex={};this.faceDir=1;this.facingBack=false;
    this.piTimeModalOpen=false;this.piClockUI=null;
    this.clearChurchSite();this.alignTavern();
    this.extraBuildings=EXTRA_BUILDINGS.map(b=>({...b,door:{x:b.x+Math.floor(b.w/2),y:b.y+b.h}}));
    for(const b of this.extraBuildings){this.reserveBuilding(b);this.buildings.push(b);}
    for(const p of EXTRA_PROPS){
      if(!this.walkable(p.x,p.y))throw new Error(`[HomeCity] Occupied prop cell: ${p.x},${p.y}`);
      this.props.push({...p});this.blocked.add(this.cellKey(p.x,p.y));
    }
    const start=this.buildings.find(b=>b.id==='pi-office')?.door;
    for(const b of this.buildings){
      if(!start||this.findPath(start,b.door)===null)throw new Error(`[HomeCity] Unreachable entrance: ${b.id}`);
    }
    this.postalBuilding=this.extraBuildings.find(b=>b.id==='post-office');
  }
  clearChurchSite(){
    this.props=this.props.filter(p=>!CHURCH_CLEARED_PROPS.some(r=>r.kind===p.kind&&r.x===p.x&&r.y===p.y));
  }
  alignTavern(){
    const tavern=this.buildings.find(b=>b.id==='tavern'),spyShop=this.buildings.find(b=>b.id==='spy-shop');
    if(!tavern||!spyShop)throw new Error('[HomeCity] Missing tavern or spy shop.');
    tavern.y=spyShop.y;tavern.door={x:tavern.x+Math.floor(tavern.w/2),y:tavern.y+tavern.h};
    this.blocked.clear();
    for(const b of this.buildings){
      for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
        const key=this.cellKey(x,y);
        if(this.blocked.has(key)||HomeCityRendererCore.prototype.isRoad(x,y)){
          throw new Error(`[HomeCity] Invalid building footprint: ${b.id} at ${x},${y}`);
        }
        this.blocked.add(key);
      }
    }
    for(const p of this.props){
      for(let dy=0;dy<(p.h||1);dy++)for(let dx=0;dx<(p.w||1);dx++){
        const key=this.cellKey(p.x+dx,p.y+dy);
        if(this.blocked.has(key))throw new Error(`[HomeCity] Prop overlaps a building or prop: ${key}`);
        this.blocked.add(key);
      }
    }
  }
  reserveBuilding(b){
    for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
      if(HomeCityRendererCore.prototype.isRoad(x,y))throw new Error(`[HomeCity] Building on road: ${b.id}`);
      if(!this.walkable(x,y))throw new Error(`[HomeCity] Occupied building cell: ${b.id} at ${x},${y}`);
    }
    if(!this.walkable(b.door.x,b.door.y))throw new Error(`[HomeCity] Blocked entrance: ${b.id}`);
    for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)this.blocked.add(this.cellKey(x,y));
  }
  create(){
    super.create();this.registry.set('currentSceneKey',KEY);
    for(const key of ['PlayerHudScene','UIScene']){
      if(key==='PlayerHudScene')this.getRegisteredScene(key)?.closeAllUIPanels?.();
      this.stopSceneIfActive(key);
    }
    const news=this.getRegisteredScene('NewsHud');
    if(news){news.setHudVisible?.(false);news.closeMenu?.(true);this.sleepSceneIfActive('NewsHud');this.scene.setVisible(false,'NewsHud');}
    this.cameras.main.setBackgroundColor('#141a12');this.cityArt=new HomeCityRenderer(this);
    this.cityArt.drawGround();this.cityArt.drawBuildings();this.cityArt.drawProps();this.cityArt.drawAmbient();
    this.createPlayer();this.createInterface();
    const saved=gameState.homeCity,entry=this.buildings.find(b=>b.id===this.entryPoint);
    const validSaved=saved?.version===1&&Number.isInteger(saved.player?.x)&&Number.isInteger(saved.player?.y)&&this.walkable(saved.player.x,saved.player.y);
    this.position=entry?{...entry.door}:validSaved?{...saved.player}:{...this.buildings[0].door};this.placePlayer();
    const camera=this.cameras.main;
    camera.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);camera.setZoom(1);camera.startFollow(this.player,true,0.12,0.12);
    // Camera scroll is in pixels: only reuse it if it was saved with the same map origin.
    if(!entry&&validSaved&&saved.camera?.ox===OX&&Number.isFinite(saved.camera?.x)&&Number.isFinite(saved.camera?.y))camera.setScroll(saved.camera.x,saved.camera.y);
    else camera.centerOn(this.player.x,this.player.y);
    this.trackInputEvent(this.input,'pointerdown',this.onPointer);
    if(this.input.keyboard){
      this.trackInputEvent(this.input.keyboard,'keydown',this.onCityKeyDown);
      this.trackInputEvent(this.input.keyboard,'keyup',this.onCityKeyUp);
    }
    this.trackInputEvent(this.game.events,'blur',this.onCityBlur);
    this.events.once('shutdown',this.disposeCity,this);
    this.piClockUI=attachPIClockUI(this);
    this.extendGround();this.drawHospitalForecourt();this.drawHospitalCross();this.drawBusinessCenterDetails();this.liftChurchLabel();
    this.remember();
  }
  cellKey(x,y){return `${x},${y}`;}
  project(x,y){return{x:OX+(x-y)*HW,y:OY+(x+y)*HH};}
  unproject(x,y){const u=(x-OX)/HW,v=(y-OY)/HH;return{x:Math.round((u+v)/2),y:Math.round((v-u)/2)};}
  walkable(x,y){
    return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<this.cols&&y<this.rows&&!this.blocked.has(this.cellKey(x,y));
  }
  polygon(g,points,color,outline=0x303e39){g.fillStyle(color,1).fillPoints(points,true);g.lineStyle(1,outline,0.5).strokePoints(points,true);}
  diamond(x,y,z=0){
    const p=this.project(x,y);return[{x:p.x,y:p.y-HH-z},{x:p.x+HW,y:p.y-z},{x:p.x,y:p.y+HH-z},{x:p.x-HW,y:p.y-z}];
  }
  createPlayer(){
    this.player=this.add.container(0,0);const shadow=this.add.graphics();
    shadow.fillStyle(0x000000,0.18).fillEllipse(2,1,44,17);shadow.fillStyle(0x000000,0.22).fillEllipse(1,0,32,12);
    this.playerBody=this.add.container(0,0);
    if(this.textures.exists('hc_detective')){
      this.playerFront=this.add.image(0,0,'hc_detective').setOrigin(0.5,1);this.playerFront.setScale(110/this.playerFront.height);
      this.playerBack=this.textures.exists('hc_detective_back')?this.add.image(0,0,'hc_detective_back').setOrigin(0.5,1).setVisible(false):null;
      this.playerBack?.setScale(110/this.playerBack.height);
      this.playerBody.add(this.playerBack?[this.playerFront,this.playerBack]:[this.playerFront]);
    }else{
      const g=this.add.graphics();
      g.fillStyle(0x2b2724).fillRect(-9,-24,7,23).fillRect(2,-24,7,23);
      g.fillStyle(0x1b1917).fillRoundedRect(-11,-4,11,6,2).fillRoundedRect(1,-4,12,6,2);
      g.fillStyle(0xc9a96e).fillPoints([{x:-15,y:-56},{x:15,y:-56},{x:18,y:-16},{x:-18,y:-16}],true);
      g.fillStyle(0xb08d55).fillRect(-18,-22,36,6);g.fillStyle(0x8a6c3e).fillRect(-15,-37,30,4);
      g.fillStyle(0xe9e0c8).fillTriangle(-4,-56,4,-56,0,-42);g.fillStyle(0x7d1f2b).fillTriangle(-2,-54,2,-54,0,-40);
      g.fillStyle(0xd8bb82).fillTriangle(-15,-56,-3,-56,-10,-43).fillTriangle(15,-56,3,-56,10,-43);
      g.fillStyle(0xb99a62).fillRoundedRect(-21,-54,8,30,3).fillRoundedRect(13,-54,8,30,3);
      g.fillStyle(0xe4c1a2).fillCircle(-17,-23,4).fillCircle(17,-23,4);
      g.lineStyle(3,0x5a4630).lineBetween(18,-24,27,-40);g.lineStyle(3,0xd7b16b).strokeCircle(30,-46,7);
      g.fillStyle(0xcfe6ee,0.55).fillCircle(30,-46,6);g.fillStyle(0xe4c1a2).fillCircle(0,-66,11);
      g.fillStyle(0x4a3c2d).fillEllipse(0,-74,38,9);g.fillStyle(0x5a4a38).fillRoundedRect(-11,-91,22,18,4);
      g.fillStyle(0x2f2620).fillRect(-11,-78,22,4);g.fillStyle(0x2a211b).fillRect(-5,-67,2,3).fillRect(3,-67,2,3);
      this.playerBody.add(g);
    }
    this.player.add([shadow,this.playerBody]);
    this.targetMarker=this.add.ellipse(0,0,38,18).setStrokeStyle(3,0xffd277).setDepth(-300).setVisible(false);
  }
  animatePlayer(time,moving){
    const body=this.playerBody;if(!body?.active)return;
    if(moving){const t=time*0.016;body.y=-Math.abs(Math.sin(t))*5;body.angle=Math.sin(t)*2.2*this.faceDir;body.scaleY=1;}
    else{body.y*=0.8;body.angle*=0.8;body.scaleY=1+Math.sin(time*0.004)*0.012;}
    body.scaleX=this.faceDir;
    if(this.playerBack){this.playerFront.setVisible(!this.facingBack);this.playerBack.setVisible(this.facingBack);}
  }
  createInterface(){
    const body={fontFamily:'SpecialElite, monospace',color:'#f4e4c0',padding:{x:18,y:10}};
    this.hudPanel=this.add.graphics().setScrollFactor(0).setDepth(19990);
    this.title=this.add.text(24,20,T('t_e8ef85bd3b7b928fd139'),{
      fontFamily:'PressStart2P, monospace',fontSize:'17px',color:'#ffe19b',padding:{x:18,y:12},
    }).setScrollFactor(0).setDepth(20000);
    this.feedback=this.add.text(24,78,INSTRUCTION,{...body,fontSize:'24px',wordWrap:{width:this.scale.width-100}}).setScrollFactor(0).setDepth(20000);
    this.title.setInteractive().setData('cityUi',true);this.feedback.setInteractive().setData('cityUi',true);this.refreshHud();
  }
  refreshHud(){
    const g=this.hudPanel;if(!g?.active)return;g.clear();
    for(const t of [this.title,this.feedback]){
      if(!t?.active)continue;
      g.fillStyle(0x000000,0.3).fillRoundedRect(t.x+3,t.y+4,t.width,t.height,8);
      g.fillStyle(0x262b26,0.92).fillRoundedRect(t.x,t.y,t.width,t.height,8);
      g.lineStyle(2,0xb89a58,1).strokeRoundedRect(t.x,t.y,t.width,t.height,8);
      g.lineStyle(1,0xb89a58,0.35).strokeRoundedRect(t.x+4,t.y+4,t.width-8,t.height-8,5);
    }
  }
  liftChurchLabel(){
    const art=this.cityArt?.buildingArt.get('church');if(!art?.label?.active)return;
    art.label.y-=CHURCH_LABEL_LIFT;this.cityArt.paintLabel('church');
  }
  extendGround(){
    const art=this.cityArt;
    const tile=(x,y,width,height)=>{
      const key=art.bake(`extension_${x}_${y}`,width,height,ctx=>art.paintGround(ctx,x,y,width,height),x,y);
      if(key)this.add.image(x,y,key).setOrigin(0).setDepth(-1000);
    };
    // drawGround now covers the whole world (WORLD_W/WORLD_H in HomeCityConfig);
    // only paint here if those ever fall behind the camera bounds again.
    const w=GROUND_W,h=GROUND_H;
    if(w<WORLD_WIDTH)for(let y=0;y<h;y+=1000)tile(w,y,WORLD_WIDTH-w,Math.min(1000,h-y));
    if(h<WORLD_HEIGHT)for(let x=0;x<WORLD_WIDTH;x+=825)tile(x,h,Math.min(825,WORLD_WIDTH-x),WORLD_HEIGHT-h);
  }
  drawHospitalForecourt(){
    const g=this.add.graphics().setDepth(-800);
    for(let y=16;y<=17;y++)for(let x=28;x<=34;x++){
      const points=this.diamond(x,y);g.fillStyle((x+y)%2?0xa79d83:0xb3a88e).fillPoints(points,true);
      g.lineStyle(1,0x756c57,.6).strokePoints(points,true);
    }
  }
  drawHospitalCross(){
    const b=this.buildings.find(item=>item.id==='hospital'),art=this.cityArt,fy=b.y+b.h-.5;
    const center=this.project(b.door.x,fy),left=center.x-65,top=center.y-182;
    const key=art.bake('hospital_cross',130,110,ctx=>{
      art.face(ctx,'x',fy+.02,b.door.x-.34,b.door.x+.34,126,164,0xe9e4cd,0x66796c);
      art.face(ctx,'x',fy+.03,b.door.x-.065,b.door.x+.065,131,159,0xa6443b,null);
      art.face(ctx,'x',fy+.03,b.door.x-.25,b.door.x+.25,140,150,0xa6443b,null);
    },left,top);
    if(key)this.add.image(left,top,key).setOrigin(0).setDepth((b.door.x+b.y+b.h-1)*100+101);
  }
  drawBusinessCenterDetails(){
    const b=this.buildings.find(item=>item.id==='business-center'),art=this.cityArt;
    const ground=this.add.graphics().setDepth(-800);
    // paved forecourt: the two rows in front of the building, one cell wider on the east
    for(let y=b.y+b.h;y<=b.y+b.h+1;y++)for(let x=b.x;x<=b.x+b.w;x++){
      const points=this.diamond(x,y);ground.fillStyle((x+y)%2?0xa79d83:0xb3a88e).fillPoints(points,true);
      ground.lineStyle(1,0x756c57,.6).strokePoints(points,true);
    }
    art.bakeBanner(b,E('t_86158a4d4f49d52f1db5'),160,3.0);
  }
  isTyping(event){
    const focused=typeof document!=='undefined'?document.activeElement:null;
    return[event?.target,focused].some(el=>el?.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el?.tagName));
  }
  onCityKeyDown(event){
    if(this.disposed||this.navigating||this.piTimeModalOpen||this.isTyping(event))return;
    if(ARROWS.has(event.code)){
      event.preventDefault();this.heldArrows.add(event.code);
      if(this.movementMode!=='keyboard'){
        this.path=this.path.slice(0,1);this.destinationBuilding=null;this.movementMode='keyboard';
        this.targetMarker.setVisible(false);this.cityArt.clearRoute();this.cityArt.selectBuilding();
      }
    }else if(event.code===T('t_037c968467aa3fd7c059')){event.preventDefault();this.cancelWalking();}
    else if(event.code===T('t_dc8659db6d416dc32fca')&&!event.repeat){event.preventDefault();this.enterNearbyBuilding();}
  }
  onCityKeyUp(event){this.heldArrows.delete(event.code);}
  onCityBlur(){this.heldArrows.clear();if(!this.disposed&&!this.navigating)this.cancelWalking();}
  keyboardStep(){
    const h=Number(this.heldArrows.has('ArrowRight'))-Number(this.heldArrows.has('ArrowLeft'));
    const v=Number(this.heldArrows.has('ArrowDown'))-Number(this.heldArrows.has('ArrowUp'));
    if(!h&&!v)return null;
    const dx=Math.sign(h+v),dy=Math.sign(v-h),x=this.position.x+dx,y=this.position.y+dy;
    if(!this.walkable(x,y))return null;
    if(dx&&dy&&(!this.walkable(this.position.x+dx,this.position.y)||!this.walkable(this.position.x,this.position.y+dy)))return null;
    return{x,y};
  }
  enterNearbyBuilding(){
    if(this.path.length||this.navigating||this.disposed||this.piTimeModalOpen)return;
    const nearby=this.buildings.find(b=>Math.abs(b.door.x-this.position.x)+Math.abs(b.door.y-this.position.y)<=1);
    if(!nearby){this.say(T('t_bfef5891e43f6bffb72c'));return;}
    this.heldArrows.clear();this.cityArt.selectBuilding(nearby.id);
    const route=this.findPath(this.position,nearby.door);if(route===null)return;
    this.movementMode='pointer';this.destinationBuilding=nearby;this.path=route;this.cityArt.showRoute(route);
    if(!route.length)this.arrive();
  }
  propAt(x,y){return this.props.find(p=>x>=p.x&&x<p.x+(p.w||1)&&y>=p.y&&y<p.y+(p.h||1))??null;}
  sayQuip(prop){
    const lines=PROP_QUIPS[prop?.kind];if(!lines){this.say(T('t_2c1c3570cf6aaee1fc9c'));return;}
    const i=this.quipIndex[prop.kind]??0;this.quipIndex[prop.kind]=i+1;this.say(lines[i%lines.length]);
  }
  onPointer(pointer,objects=[]){
    if(this.disposed||this.navigating||this.piTimeModalOpen||!pointer.primaryDown)return;
    if(objects.some(o=>o.getData?.('cityUi')))return;
    const camera=this.cameras?.main;if(!camera)return;
    const propIndex=objects.find(o=>o.getData?.('propIndex')!==undefined)?.getData('propIndex');
    if(propIndex!==undefined){this.sayQuip(this.props[propIndex]);return;}
    const id=objects.find(o=>o.getData?.('buildingId'))?.getData('buildingId');
    const building=this.buildings.find(b=>b.id===id),world=camera.getWorldPoint(pointer.x,pointer.y);
    const target=building?building.door:this.unproject(world.x,world.y);
    if(!this.walkable(target.x,target.y)){
      const prop=this.propAt(target.x,target.y);if(prop)this.sayQuip(prop);else this.say(T('t_2c1c3570cf6aaee1fc9c'));return;
    }
    const anchor=this.path.length?this.path[0]:this.position,route=this.findPath(anchor,target);
    if(route===null){this.say(T('t_e05daf966df5c046a77a'));return;}
    this.heldArrows.clear();this.movementMode='pointer';this.path=this.path.length?[{...anchor},...route]:route;
    this.destinationBuilding=building??null;this.cityArt.selectBuilding(building?.id);this.cityArt.showRoute(this.path);
    const p=this.project(target.x,target.y);this.targetMarker.setPosition(p.x,p.y).setVisible(true);
    if(building)this.say(`${T('t_08635302aeebeb765839')}${building.name}${T('t_ab5df625bc76dbd4e163')}`);
    if(!this.path.length)this.arrive();
  }
  findPath(start,target){
    if(!start||!this.walkable(start.x,start.y)||!this.walkable(target.x,target.y))return null;
    const key=this.cellKey(target.x,target.y),queue=[{x:start.x,y:start.y}];
    const parents=new Map([[this.cellKey(start.x,start.y),null]]);let head=0;
    while(head<queue.length){
      const cell=queue[head++];
      if(this.cellKey(cell.x,cell.y)===key){
        const path=[];let node=cell;
        while(parents.get(this.cellKey(node.x,node.y))!==null){path.push(node);node=parents.get(this.cellKey(node.x,node.y));}
        return path.reverse();
      }
      for(const[dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
        const next={x:cell.x+dx,y:cell.y+dy},nextKey=this.cellKey(next.x,next.y);
        if(!this.walkable(next.x,next.y)||parents.has(nextKey))continue;parents.set(nextKey,cell);queue.push(next);
      }
    }
    return null;
  }
  placePlayer(){
    const p=this.project(this.position.x,this.position.y);
    this.player.setPosition(p.x,p.y).setDepth((this.position.x+this.position.y)*100+1);
  }
  cancelWalking(){
    if(this.disposed||this.navigating)return;
    this.heldArrows.clear();this.destinationBuilding=null;this.path=this.path.slice(0,1);
    this.targetMarker.setVisible(false);this.cityArt.clearRoute();this.cityArt.selectBuilding();
  }
  update(time,delta){
    if(this.disposed||this.navigating||this.piTimeModalOpen||!this.player)return;
    if(this.isTyping())this.heldArrows.clear();let budget=280*Math.min(delta,100)/1000,moved=false;
    while(budget>0&&!this.navigating&&!this.disposed){
      if(!this.path.length&&this.movementMode==='keyboard'){const next=this.keyboardStep();if(next)this.path.push(next);}
      if(!this.path.length)break;
      const next=this.path[0],goal=this.project(next.x,next.y),dxs=goal.x-this.player.x,dys=goal.y-this.player.y;
      if(Math.abs(dxs)>1)this.faceDir=dxs>0?1:-1;if(Math.abs(dys)>1)this.facingBack=dys<0;moved=true;
      const distance=Math.hypot(dxs,dys);
      if(distance<=budget){
        budget-=distance;this.position={...next};this.path.shift();this.placePlayer();
        if(this.movementMode==='pointer')this.cityArt.showRoute(this.path);if(!this.path.length)this.arrive();
      }else{
        const ratio=budget/distance;this.player.x+=dxs*ratio;this.player.y+=dys*ratio;
        this.player.setDepth((this.player.y-OY)/HH*100+1);budget=0;
      }
    }
    if(this.disposed||this.navigating)return;
    this.animatePlayer(time,moved);this.cityArt?.update(time,delta,{cell:this.position,idle:!this.path.length&&!moved});
    this.saveElapsed+=delta;if(this.saveElapsed>=1500){this.saveElapsed=0;this.remember();}
  }
  arrive(){
    const building=this.destinationBuilding;
    const extra=this.extraBuildings.find(b=>b.id===building?.id);
    if(extra){
      if(!extra.sceneKey){this.visitClosedBuilding(extra);return;}
      this.destinationBuilding=null;this.targetMarker.setVisible(false);this.cityArt.clearRoute();this.remember();
      if(!this.hasScene(extra.sceneKey))this.scene.add(extra.sceneKey,extra.SceneClass,false);
      void this.openCityInterior(extra.sceneKey,`${extra.name}${E('t_1cfcfe7c73e898681df4')}`);return;
    }
    this.targetMarker.setVisible(false);this.cityArt.clearRoute();
    if(this.movementMode!=='keyboard'||!this.heldArrows.size)this.remember();
    this.destinationBuilding=null;if(!building)return;
    if(building.id==='pi-office')void this.openOffice();
    else if(building.id==='spy-shop')void this.openSpyShop();
    else if(building.id==='tavern')void this.openTavern();
    else if(building.id==='police-station')void this.openPoliceStation();
    else if(building.id==='cemetery')void this.openCemetery();
    else if(building.id==='your-home')void this.openHome();
    else this.say(`${building.name}${T('t_45822f54a0d0e030f756')}${building.message}`);
  }
  visitClosedBuilding(building){
    this.destinationBuilding=null;this.targetMarker.setVisible(false);this.cityArt.clearRoute();this.remember();
    const lines=building.quips?.length?building.quips:['Not open yet.'];this.say(lines[closedBuildingVisits++%lines.length]);
  }
  async openOffice(){return this.openCityInterior('DetectiveOfficeScene',T('t_ce48c0204acfad02e624'));}
  async openSpyShop(){return this.openCityInterior('SpyShopScene',T('t_4a3c62f9cfcfdc024f0b'));}
  async openTavern(){return this.openCityInterior('TavernScene',T('t_94ba4db8a5c58979ab8d'));}
  async openPoliceStation(){return this.openCityInterior('PoliceStationScene',T('t_2a2eebf400be046510bc'));}
  async openCemetery(){return enterCemeteryFromMap(this);}
  async openHome(){return this.openCityInterior('PigeonLoftScene',T('t_a960edd54084720c2d36'));}
  async openCityInterior(sceneKey,errorMessage){
    if(this.disposed||this.navigating||this.piTimeModalOpen)return false;
    const token=this.runToken,location=PI_SCENE_LOCATIONS[sceneKey],status=getPILocationStatus(location);
    if(!status.available){
      const name=this.buildings.find(b=>b.id===location)?.name||'Location';
      this.piClockUI.offerWait({title:`${name} is closed.`,status,onReady:()=>{
        if(!this.disposed&&this.runToken===token)void this.openCityInterior(sceneKey,errorMessage);
      }});return false;
    }
    this.navigating=true;this.heldArrows.clear();this.remember();let moved=false;
    try{moved=await this.goto(sceneKey,{entrySource:'city',fromScene:KEY,gameState});}
    catch(error){console.error('[HomeCityScene] Interior navigation failed:',error);}
    if(this.disposed||this.runToken!==token)return moved!==false;
    this.navigating=false;if(moved===false)this.say(errorMessage);return moved!==false;
  }
  remember(){
    if(!this.position)return;
    const camera=this.cameras?.main;
    if(Number.isFinite(camera?.scrollX)&&Number.isFinite(camera?.scrollY))this.lastCameraPosition={x:camera.scrollX,y:camera.scrollY,ox:OX};
    const previousCamera=gameState.homeCity?.version===1?gameState.homeCity.camera:null;
    const fallbackCamera=previousCamera?.ox===OX&&Number.isFinite(previousCamera?.x)&&Number.isFinite(previousCamera?.y)?{x:previousCamera.x,y:previousCamera.y,ox:OX}:null;
    const cameraPosition=this.lastCameraPosition??fallbackCamera;
    gameState.homeCity={version:1,player:{...this.position},camera:cameraPosition?{...cameraPosition}:null,lastEntryPoint:this.entryPoint};
    if(gameState.isGameActive)requestAutosave();
  }
  say(text){
    if(this.disposed||!this.feedback?.active)return;
    this.feedbackTimer?.remove(false);this.feedback.setText(text);this.refreshHud();
    this.feedbackTimer=this.time.delayedCall(6000,()=>{
      if(!this.disposed&&this.feedback?.active){this.feedback.setText(INSTRUCTION);this.refreshHud();}this.feedbackTimer=null;
    });
  }
  disposeCity(){
    if(this.disposed)return;
    this.piClockUI?.destroy();this.piClockUI=null;this.disposed=true;this.runToken=null;this.heldArrows.clear();this.remember();
    this.feedbackTimer?.remove(false);this.feedbackTimer=null;this.path=[];this.destinationBuilding=null;
    this.cityArt?.destroy();this.cityArt=null;
  }
}
