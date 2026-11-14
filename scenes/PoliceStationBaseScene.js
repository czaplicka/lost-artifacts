import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getAcceptedPIQuests } from '../managers/PIQuestManager.js';

const KEY='PoliceStationScene';
const BACKGROUND_KEY='home-police';
const BACKGROUND_URL='assets/pi/police/home-police.webp';
const HOTSPOTS=[
 {id:'officer',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_832bb16aeb9f95e761e9"),x:0.698,y:0.401,w:0.094,h:0.190},
 {id:'exit',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_6398180d50773dcd79cc"),x:0.024,y:0.198,w:0.091,h:0.680},
 {id:'bench',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_0177bc386e844ed17a27"),x:0.177,y:0.537,w:0.220,h:0.224},
 {id:'board',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_7e265a9a797b49d67957"),x:0.220,y:0.286,w:0.161,h:0.202},
 {id:'machine',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_13360a46a65d2ec65fec"),x:0.405,y:0.449,w:0.073,h:0.306},
 {id:'staff-door',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_b3a64b77c8a70675d232"),x:0.906,y:0.191,w:0.089,h:0.688},
 {id:'back-door',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_5e43b73e106f7a10f03d"),x:0.542,y:0.265,w:0.134,h:0.282},
 {id:'clock',label:__dialogueText("scenes/PoliceStationBaseScene.js", "t_fb3e44006b3e2089b94f"),x:0.710,y:0.239,w:0.065,h:0.117}
];
const OBSERVATIONS={
 bench:[__dialogueText("scenes/PoliceStationBaseScene.js", "t_0177bc386e844ed17a27"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_090a06e693a0b85dc976")],
 board:[__dialogueText("scenes/PoliceStationBaseScene.js", "t_7e265a9a797b49d67957"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_831d25822a85f127aded")],
 machine:[__dialogueText("scenes/PoliceStationBaseScene.js", "t_13360a46a65d2ec65fec"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_7d60f8c1e042d4d62b32")],
 'staff-door':[__dialogueText("scenes/PoliceStationBaseScene.js", "t_b3a64b77c8a70675d232"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_51f72594808bc5a5e891")],
 'back-door':[__dialogueText("scenes/PoliceStationBaseScene.js", "t_09d416b260dfdc3731b3"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_5217d3f9f4dc1ca91762")],
 clock:[__dialogueText("scenes/PoliceStationBaseScene.js", "t_fb3e44006b3e2089b94f"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_077ce5c72f46452f4c5b")]
};
const TOPICS=[
 [__dialogueText("scenes/PoliceStationBaseScene.js", "t_db20a920fba909cdf86e"),'investigator'],
 [__dialogueText("scenes/PoliceStationBaseScene.js", "t_d01cbbd4e85c316601ec"),'neighborhood'],
 [__dialogueText("scenes/PoliceStationBaseScene.js", "t_5efb402f94f0b50d7764"),'staff'],
 [__dialogueText("scenes/PoliceStationBaseScene.js", "t_347010c414033e6a0369"),'machine'],
 [__dialogueText("scenes/PoliceStationBaseScene.js", "t_2b687db6298b629d3bcb"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_82e35a63ceba37e96464")]
];
const END=[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_da0776b59d8c85cdba79"),'topics'],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_2b687db6298b629d3bcb"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_82e35a63ceba37e96464")]];
const DIALOGUE={
 start:{text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_be5a2b8755c9f319c4b8"),choices:TOPICS},
 topics:{text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_554e6ec0bec97ecc209b"),choices:TOPICS},
 investigator:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_db20a920fba909cdf86e"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_b5cfc462a952b9e59d6e"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_31110d2df95ef53efb9f"),'stapler'],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_a825c4507a307d685e0a"),'professional'],...END]},
 stapler:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_31110d2df95ef53efb9f"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_84cb4b210446c773c82e"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_a7e9c2c9c7c5dc37bac8"),'inside-job'],...END]},
 'inside-job':{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_a7e9c2c9c7c5dc37bac8"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_1ce5f6cf7d7a3b99ad61"),choices:END},
 professional:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_a825c4507a307d685e0a"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_7be2c01fd350efcda407"),choices:END},
 neighborhood:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_d01cbbd4e85c316601ec"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_64e62b7ddd10b3128cd7"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_6cec002353a715511b40"),'danger'],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_2102bff3a5c94da88b5b"),'advice'],...END]},
 danger:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_6cec002353a715511b40"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_db9f69a71938106ea9c9"),choices:END},
 advice:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_2102bff3a5c94da88b5b"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_973729b6be58e2212cc0"),choices:END},
 staff:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_5efb402f94f0b50d7764"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_0d0d3604c77a5c4f49bc"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_d79fae60b558cbf2cc0a"),'staff-access'],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_99d3d2a8612b2259ee00"),'printer'],...END]},
 'staff-access':{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_d79fae60b558cbf2cc0a"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_771e9bfa3353279c86f6"),choices:END},
 printer:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_99d3d2a8612b2259ee00"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_5aec79392ffb0ba26e86"),choices:END},
 machine:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_347010c414033e6a0369"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_e3523f54ff55c79c7ead"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_77ab9f99aa5039739619"),'maintenance'],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_f4e0ba901bd3ae073e30"),'ticket'],...END]},
 maintenance:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_77ab9f99aa5039739619"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_df8c02a4f72642451840"),choices:END},
 ticket:{player:__dialogueText("scenes/PoliceStationBaseScene.js", "t_f4e0ba901bd3ae073e30"),text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_0cde13f037fd5a1a772b"),choices:END},
 goodbye:{text:__dialogueText("scenes/PoliceStationBaseScene.js", "t_d67267305d3cf240847a"),choices:[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_9262fa57013ce584df7a"),null]]}
};
export function hasCompletedPolicePIQuest(quests=getAcceptedPIQuests()){
 return Array.isArray(quests)&&quests.some(quest=>quest!==null&&typeof quest==='object'&&quest.status==='completed');
}
const CSS=`${__dialogueText("scenes/PoliceStationBaseScene.js", "t_594d44405f8a01b59f21")}`;

export class PoliceStationScene extends BaseScene{
 constructor(){super({key:KEY});}
 init(){
  Object.assign(this,{
   disposed:false,navigating:false,runToken:Symbol(KEY),background:null,
   root:null,panel:null,hint:null,styleElement:null,hoverLabel:null,exitButton:null,
   lastCanvasBox:'',returnFocus:null,dialogueVersion:0,imageBox:null
  });
  this.spots=[];this.hotspotDefs=HOTSPOTS.map(h=>({...h}));this.visitedNodes=new Set();
 }
 preload(){if(!this.textures.exists(BACKGROUND_KEY))this.load.image(BACKGROUND_KEY,BACKGROUND_URL);}
 create(){
  super.create();this.registry.set('currentSceneKey',KEY);this.cameras.main.setBackgroundColor('#151b17');
  this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
  this.getRegisteredScene('NewsHud')?.closeMenu?.(true);this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
  for(const key of ['PlayerHudScene','UIScene','NewsHud'])if(this.hasScene(key))this.scene.setVisible(false,key);
  this.events.once('shutdown',this.disposePolice,this);this.events.once('destroy',this.disposePolice,this);
  this.createInterface();
  if(this.textures.exists(BACKGROUND_KEY)){
   this.background=this.add.image(0,0,BACKGROUND_KEY).setOrigin(0);
   this.hoverLabel=this.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',backgroundColor:'#18201c',padding:{x:9,y:6}}).setDepth(100).setVisible(false);
   this.createHotspots();
  }else this.showPanel(__dialogueText("scenes/PoliceStationBaseScene.js", "t_e81364417db7d7841fcb"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_e0a196e7ce126abbf3fa"),[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_8213a39963ca25c0184d"),()=>void this.leave()]]);
  this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
  this.handledKeys=new WeakSet();this.domKeyHandler=event=>this.onKey(event);
  this.root.addEventListener('keydown',this.domKeyHandler);this.layout();
 }
 createInterface(){
  this.styleElement=document.createElement('style');this.styleElement.textContent=CSS;document.head.appendChild(this.styleElement);
  document.documentElement.classList.add('la-police-active');
  this.root=document.createElement('div');this.root.className='la-police-ui';
  const top=document.createElement('div');top.className='police-top';
  const title=document.createElement('div');title.className='police-title';title.textContent=__dialogueText("scenes/PoliceStationBaseScene.js", "t_c47f6a6696545b1f04b9");
  const controls=document.createElement('div');controls.className='police-controls';
  this.exitButton=this.makeButton(__dialogueText("scenes/PoliceStationBaseScene.js", "t_c4002f3643a1871c17e6"),()=>void this.leave());controls.append(this.exitButton);top.append(title,controls);
  this.hint=document.createElement('div');this.hint.className='police-hint';
  this.root.append(top,this.hint);document.body.appendChild(this.root);this.refreshInteraction();
 }
 createHotspots(){
  for(const cfg of this.hotspotDefs){
   const zone=this.add.zone(0,0,1,1).setOrigin(0).setDepth(10).setInteractive({useHandCursor:true});
   zone.on('pointerover',()=>{
    if(!this.canInteract())return;
    this.hoverLabel.setText(cfg.label).setPosition(zone.x,Math.max(5,zone.y-36)).setVisible(true);
   });
   zone.on('pointerout',()=>this.hoverLabel?.setVisible(false));
   zone.on('pointerdown',()=>{
    if(!this.canInteract())return;this.hoverLabel?.setVisible(false);
    if(cfg.id==='exit')void this.leave();else if(cfg.id==='officer')this.openConversation();else this.inspect(cfg.id);
   });
   this.spots.push({cfg,zone});
  }
 }
 canInteract(){return !this.disposed&&!this.navigating&&!this.panel;}
 layout(){
  if(this.disposed||!this.root)return;
  const {width,height}=this.scale;
  if(this.background){
   const source=this.background.texture.getSourceImage(),scale=Math.min(width/source.width,height/source.height);
   const w=source.width*scale,h=source.height*scale;this.imageBox={x:(width-w)/2,y:(height-h)/2,w,h};
   this.background.setPosition(this.imageBox.x,this.imageBox.y).setDisplaySize(w,h);
   for(const spot of this.spots)this.syncHotspot(spot);
  }
  this.hoverLabel?.setVisible(false);
  const box=this.game.canvas.getBoundingClientRect();
  Object.assign(this.root.style,{left:`${box.left}px`,top:`${box.top}px`,width:`${box.width}px`,height:`${box.height}px`,fontSize:`${Math.max(14,Math.min(22,box.width/65))}px`});
  this.refreshInteraction();
 }
 syncHotspot(spot){
  if(!this.imageBox)return;
  const b=this.imageBox,c=spot.cfg;spot.zone.setPosition(b.x+c.x*b.w,b.y+c.y*b.h).setSize(c.w*b.w,c.h*b.h);
  spot.zone.input?.hitArea?.setTo(0,0,c.w*b.w,c.h*b.h);
 }
 update(){
  if(this.disposed||!this.root)return;
  const b=this.game.canvas.getBoundingClientRect(),signature=[b.left,b.top,b.width,b.height].join('/');
  if(signature!==this.lastCanvasBox){this.lastCanvasBox=signature;this.layout();}
 }
 setHotspotsEnabled(enabled){for(const spot of this.spots)if(spot.zone.input)spot.zone.input.enabled=enabled;}
 refreshInteraction(){
  if(this.disposed)return;this.setHotspotsEnabled(this.canInteract());
  if(this.hint){this.hint.hidden=Boolean(this.panel)||Boolean(this.coldCaseUI);this.hint.textContent=__dialogueText("scenes/PoliceStationBaseScene.js", "t_d22eb3a60f7d8db58eb1");}
 }
 // Compatibility with the existing cold-case subclass; no editor is created.
 refreshDebug(){this.refreshInteraction();}
 onKey(event){
  if(this.disposed||this.navigating||this.handledKeys?.has(event))return;
  const target=event.target;
  if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||event.ctrlKey||event.metaKey)return;
  this.handledKeys?.add(event);
  if(event.code!==__dialogueText("scenes/PoliceStationBaseScene.js", "t_037c968467aa3fd7c059"))return;
  event.preventDefault();if(event.repeat)return;
  if(this.panel)this.closePanel();else void this.leave();
 }
 makeButton(label,action,version=null){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('click',event=>{
   event.stopPropagation();if(this.disposed||this.navigating)return;
   if(version!==null&&version!==this.dialogueVersion)return;action();
  });return button;
 }
 showPanel(title,text,choices,playerLine=''){
  if(this.disposed||!this.root)return;
  if(!this.panel)this.returnFocus=document.activeElement;
  this.panel?.remove();this.hoverLabel?.setVisible(false);const version=++this.dialogueVersion;
  this.panel=document.createElement('section');this.panel.className='police-panel';this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label',title);
  const heading=document.createElement('h2');heading.textContent=title;this.panel.appendChild(heading);
  if(playerLine){const player=document.createElement('p');player.className='police-player';player.textContent=`${__dialogueText("scenes/PoliceStationBaseScene.js", "t_7b1aab937ca83cd9c085")}${playerLine}`;this.panel.appendChild(player);}
  const response=document.createElement('p');response.className='police-response';response.textContent=text;
  const options=document.createElement('div');options.className='police-choices';
  for(const [label,action,used=false] of choices){const button=this.makeButton(label,action,version);if(used)button.classList.add('police-choice-used');options.appendChild(button);}
  this.panel.append(response,options);this.root.appendChild(this.panel);this.refreshInteraction();options.querySelector('button')?.focus({preventScroll:true});
 }
 showOfficerRefusal(){
  if(this.disposed||this.navigating)return;
  this.showPanel(__dialogueText("scenes/PoliceStationBaseScene.js", "t_832bb16aeb9f95e761e9"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_476c4bf2f943c2d6c470"),[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_20e85dbfa211ba2eabf0"),()=>this.closePanel()]]);
 }
 openConversation(){
  if(!this.canInteract())return;
  if(!hasCompletedPolicePIQuest()){this.showOfficerRefusal();return;}this.showDialogue('start');
 }
 showDialogue(id){
  if(this.disposed||this.navigating)return;
  if(!hasCompletedPolicePIQuest()){this.showOfficerRefusal();return;}
  const node=DIALOGUE[id];if(!node)return;this.visitedNodes.add(id);
  this.showPanel(__dialogueText("scenes/PoliceStationBaseScene.js", "t_832bb16aeb9f95e761e9"),node.text,node.choices.map(([label,target])=>[label,()=>target===null?this.closePanel():this.showDialogue(target),target!==null&&this.visitedNodes.has(target)]),node.player||'');
 }
 inspect(id){const observation=OBSERVATIONS[id];if(observation)this.showPanel(observation[0],observation[1],[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_5ecec84ab0093dde81c8"),()=>this.closePanel()]]);}
 closePanel(){
  ++this.dialogueVersion;this.panel?.remove();this.panel=null;this.refreshInteraction();
  const focus=this.returnFocus;this.returnFocus=null;
  if(focus?.isConnected&&focus!==document.body)focus.focus?.({preventScroll:true});else this.exitButton?.focus({preventScroll:true});
 }
 async leave(){
  if(this.disposed||this.navigating)return false;
  this.navigating=true;const token=this.runToken;this.refreshInteraction();this.hoverLabel?.setVisible(false);
  if(this.exitButton)this.exitButton.disabled=true;
  let result=false;
  try{result=await this.goto('HomeCityScene',{entryPoint:'police-station',fromScene:KEY,gameState});}
  catch(error){console.error('[PoliceStationScene] Navigation failed:',error);}
  if(this.disposed||this.runToken!==token)return result!==false;
  this.navigating=false;if(this.exitButton)this.exitButton.disabled=false;
  if(result===false)this.showPanel(__dialogueText("scenes/PoliceStationBaseScene.js", "t_05164cc51845950a84e4"),__dialogueText("scenes/PoliceStationBaseScene.js", "t_cd113bd0b51d4c8d24f3"),[[__dialogueText("scenes/PoliceStationBaseScene.js", "t_a0c2cc1374d949943e01"),()=>void this.leave()],[__dialogueText("scenes/PoliceStationBaseScene.js", "t_28186fe612051fb5a150"),()=>this.closePanel()]]);
  this.refreshInteraction();return result!==false;
 }
 disposePolice(){
  if(this.disposed)return;
  this.disposed=true;this.runToken=null;++this.dialogueVersion;
  this.root?.removeEventListener('keydown',this.domKeyHandler);this.root?.remove();this.styleElement?.remove();
  document.documentElement.classList.remove('la-police-active');
  this.root=null;this.panel=null;this.hint=null;this.exitButton=null;this.returnFocus=null;this.styleElement=null;this.handledKeys=null;
  this.events.off('shutdown',this.disposePolice,this);this.events.off('destroy',this.disposePolice,this);
 }
}
