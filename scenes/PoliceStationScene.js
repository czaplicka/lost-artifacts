import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

const KEY = 'PoliceStationScene';
const BACKGROUND_KEY = 'home-police';
const BACKGROUND_URL = 'assets/pi/police/home-police.webp';

// x/y oznaczają lewy górny róg, w/h rozmiar; wszystko względem tła.
const HOTSPOTS = [
  { id:'officer', label:'Desk officer', x:0.698, y:0.401, w:0.094, h:0.190 },
  { id:'exit', label:'Return to the street', x:0.024, y:0.198, w:0.091, h:0.680 },
  { id:'bench', label:'Waiting bench', x:0.177, y:0.537, w:0.220, h:0.224 },
  { id:'board', label:'Noticeboard', x:0.220, y:0.286, w:0.161, h:0.202 },
  { id:'machine', label:'Ticket machine', x:0.405, y:0.449, w:0.073, h:0.306 },
  { id:'staff-door', label:'Staff only', x:0.906, y:0.191, w:0.089, h:0.688 },
  { id:'back-door', label:'Door behind the desk', x:0.542, y:0.265, w:0.134, h:0.282 },
  { id:'clock', label:'Wall clock', x:0.710, y:0.239, w:0.065, h:0.117 }
];

const OBSERVATIONS = {
  bench: ['Waiting bench','A bench designed to make standing feel like a privilege.'],
  board: ['Noticeboard','Parking notices, public warnings, and a strongly worded reminder not to microwave fish.\n\nThe fish notice has been underlined twice.'],
  machine: ['Ticket machine','OUT OF ORDER.\n\nFor once, everyone is first in line.'],
  'staff-door': ['Staff only','The door is closed.\n\nThe sign seems unusually confident about your employment status.'],
  'back-door': ['Behind the desk','A closed door behind the reception counter.\n\nWalking around the officer would probably count as making an entrance.'],
  clock: ['Wall clock','Time passes normally here.\n\nIt just feels like it has submitted a request to stop.']
};
const TOPICS = [
  ["I'm a private investigator.",'investigator'],
  ['Anything I should know about the neighborhood?','neighborhood'],
  ["What's behind the staff door?",'staff'],
  ["What's wrong with the ticket machine?",'machine'],
  ['Goodbye.','goodbye']
];
const END = [['Ask something else.','topics'],['Goodbye.','goodbye']];
const DIALOGUE = {
  start: {text:"Welcome to the precinct. If you're here to report a crime, please tell me it's a short one.",choices:TOPICS},
  topics: {text:'Anything else?',choices:TOPICS},
  investigator: {player:"I'm a private investigator.",text:"Then you'll appreciate a good mystery. Someone keeps taking my stapler.",choices:[['Do you have any suspects?','stapler'],["I'll try not to interfere with police business.",'professional'],...END]},
  stapler: {player:'Do you have any suspects?',text:"Three officers, a civilian clerk, and me.\n\nI'm keeping an open mind. I have found it in my own drawer before.",choices:[['A classic inside job.','inside-job'],...END]},
  'inside-job': {player:'A classic inside job.',text:"Exactly. That's why I haven't ruled out the drawer.",choices:END},
  professional: {player:"I'll try not to interfere with police business.",text:'Much appreciated. Please extend the same courtesy to my coffee.',choices:END},
  neighborhood: {player:'Anything I should know about the neighborhood?',text:'Keep your valuables close and your expectations modest.',choices:[['Is it dangerous around here?','danger'],['Any advice for a newcomer?','advice'],...END]},
  danger: {player:'Is it dangerous around here?',text:"Use common sense. Watch your belongings.\n\nAnd don't mistake a quiet street for a personal invitation to leave your wallet on a bench.",choices:END},
  advice: {player:'Any advice for a newcomer?',text:"Read signs before opening doors.\n\nYou'd be amazed how much of my job that advice could prevent.",choices:END},
  staff: {player:"What's behind the staff door?",text:'Authorized personnel. And a printer that considers itself above the law.',choices:[['Can I take a look?','staff-access'],['Have you tried arresting the printer?','printer'],...END]},
  'staff-access': {player:'Can I take a look?',text:'No. But I admire your confidence in the face of a very clear sign.',choices:END},
  printer: {player:'Have you tried arresting the printer?',text:"We tried to issue a warrant.\n\nIt wouldn't print.",choices:END},
  machine: {player:"What's wrong with the ticket machine?",text:"It stopped at number thirteen. We're not superstitious. We're waiting for maintenance.",choices:[['How long have you been waiting?','maintenance'],['Do I still need a ticket?','ticket'],...END]},
  maintenance: {player:'How long have you been waiting?',text:'Long enough for the repair request to qualify as a historical document.',choices:END},
  ticket: {player:'Do I still need a ticket?',text:"No. You're the entire queue.\n\nCongratulations on your promotion.",choices:END},
  goodbye: {text:'Stay out of trouble. The paperwork is considerable.',choices:[['End conversation.',null]]}
};

const CSS = `
html.la-police-active #hud-container{display:none!important;pointer-events:none!important;}
.la-police-ui{position:fixed;z-index:10000;overflow:hidden;pointer-events:none;color:#f5e5bf;font-family:SpecialElite,monospace;}
.la-police-ui,.la-police-ui *{box-sizing:border-box;}
.la-police-ui button{display:block;min-height:44px;padding:10px 14px;border:1px solid #927950;border-radius:2px;background:#242a24;color:#f5e5bf;font:inherit;line-height:1.35;text-align:left;cursor:pointer;touch-action:manipulation;}
.la-police-ui button:hover,.la-police-ui button:focus-visible{background:#414b38;outline:2px solid #e7c47d;outline-offset:-2px;}
.la-police-ui button:disabled{opacity:.55;cursor:default;}
.la-police-ui .police-top{position:absolute;top:2%;left:2%;right:2%;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.la-police-ui .police-title{padding:12px;background:#18201ce8;color:#edcf91;font-family:PressStart2P,monospace;font-size:.65em;line-height:1.7;}
.la-police-ui .police-controls{display:flex;gap:8px;pointer-events:auto;}
.la-police-ui .police-hint{position:absolute;bottom:2%;left:2%;max-width:94%;padding:8px 12px;background:#18201cdd;white-space:pre-wrap;line-height:1.35;}
.la-police-ui .police-panel{position:absolute;left:2%;right:2%;bottom:2%;max-height:65%;overflow:auto;overscroll-behavior:contain;pointer-events:auto;padding:15px;border:2px solid #a48958;background:#151d18f7;box-shadow:0 8px 28px #0008;}
.la-police-ui h2{margin:0 0 10px;font-family:PressStart2P,monospace;font-size:.67em;line-height:1.8;color:#edcf91;}
.la-police-ui .police-player{margin:0 0 10px;color:#c8b58f;font-style:italic;line-height:1.4;}
.la-police-ui .police-response{margin:0 0 14px;line-height:1.45;white-space:pre-wrap;}
.la-police-ui .police-choices{display:grid;grid-template-columns:1fr;gap:7px;}
.la-police-ui .police-choice-used{color:#b5baaa;}
@media(max-width:600px){.la-police-ui .police-panel{left:1%;right:1%;bottom:1%;max-height:78%;padding:10px;}.la-police-ui .police-title{padding:8px;}.la-police-ui button{padding:8px 10px;}}
`;

export class PoliceStationScene extends BaseScene {
  constructor(){ super({key:KEY}); }
  init(){
    Object.assign(this,{
      disposed:false,navigating:false,runToken:Symbol(KEY),background:null,
      root:null,panel:null,hint:null,styleElement:null,hoverLabel:null,
      exitButton:null,debugButton:null,debugGraphics:null,debugText:null,
      debugMode:false,selectedIndex:0,lastCanvasBox:'',returnFocus:null,
      dialogueVersion:0,exportMessage:'',imageBox:null
    });
    this.spots=[];
    this.hotspotDefs=HOTSPOTS.map(h=>({...h}));
    this.visitedNodes=new Set();
  }
  preload(){
    if(!this.textures.exists(BACKGROUND_KEY)) this.load.image(BACKGROUND_KEY,BACKGROUND_URL);
  }
  create(){
    super.create();
    this.registry.set('currentSceneKey',KEY);
    this.cameras.main.setBackgroundColor('#151b17');
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.getRegisteredScene('NewsHud')?.closeMenu?.(true);
    this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for(const key of ['PlayerHudScene','UIScene','NewsHud']){
      if(this.hasScene(key)) this.scene.setVisible(false,key);
    }
    this.events.once('shutdown',this.disposePolice,this);
    this.events.once('destroy',this.disposePolice,this);
    this.createInterface();
    if(this.textures.exists(BACKGROUND_KEY)){
      this.background=this.add.image(0,0,BACKGROUND_KEY).setOrigin(0);
      this.hoverLabel=this.add.text(0,0,'',{
        fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',
        backgroundColor:'#18201c',padding:{x:9,y:6}
      }).setDepth(100).setVisible(false);
      this.debugGraphics=this.add.graphics().setDepth(80);
      this.debugText=this.add.text(0,0,'',{
        fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#fff0ba',
        backgroundColor:'#142019',padding:{x:5,y:3}
      }).setDepth(90).setVisible(false);
      this.createHotspots();
    }else{
      this.showPanel('Background unavailable','The police station image could not be loaded.',[
        ['Try returning to town.',()=>void this.leave()]
      ]);
    }
    this.trackInputEvent(this.scale,'resize',this.layout);
    this.trackInputEvent(this.input,'dragstart',this.onHotspotDragStart);
    this.trackInputEvent(this.input,'drag',this.onHotspotDrag);
    if(this.input.keyboard) this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    // Phaser i DOM mogą otrzymać to samo zdarzenie; WeakSet zapobiega podwójnej obsłudze.
    this.handledKeys=new WeakSet();
    this.domKeyHandler=e=>this.onKey(e);
    this.root.addEventListener('keydown',this.domKeyHandler);
    this.layout();
  }
  createInterface(){
    this.styleElement=document.createElement('style');
    this.styleElement.textContent=CSS;
    document.head.appendChild(this.styleElement);
    document.documentElement.classList.add('la-police-active');
    this.root=document.createElement('div');this.root.className='la-police-ui';
    const top=document.createElement('div');top.className='police-top';
    const title=document.createElement('div');title.className='police-title';title.textContent='POLICE STATION';
    const controls=document.createElement('div');controls.className='police-controls';
    this.debugButton=this.makeButton('Debug [D]',()=>this.toggleDebug());
    this.exitButton=this.makeButton('Back to town',()=>void this.leave());
    controls.append(this.debugButton,this.exitButton);top.append(title,controls);
    this.hint=document.createElement('div');this.hint.className='police-hint';
    this.root.append(top,this.hint);document.body.appendChild(this.root);
    this.refreshDebug();
  }
  createHotspots(){
    this.hotspotDefs.forEach((cfg,index)=>{
      const zone=this.add.zone(0,0,1,1).setOrigin(0).setDepth(10)
        .setInteractive({useHandCursor:true}).setData('hotspotIndex',index);
      const debugLabel=this.add.text(0,0,cfg.id,{
        fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#ffedb0',
        backgroundColor:'#142019',padding:{x:4,y:2}
      }).setDepth(85).setVisible(false);
      zone.on('pointerover',()=>{
        if(!this.canInteract()||this.debugMode)return;
        this.hoverLabel.setText(cfg.label).setPosition(zone.x,Math.max(5,zone.y-36)).setVisible(true);
      });
      zone.on('pointerout',()=>this.hoverLabel?.setVisible(false));
      zone.on('pointerdown',()=>{
        if(!this.canInteract())return;
        if(this.debugMode){this.selectedIndex=index;this.refreshDebug();return;}
        this.hoverLabel?.setVisible(false);
        if(cfg.id==='exit')void this.leave();
        else if(cfg.id==='officer')this.openConversation();
        else this.inspect(cfg.id);
      });
      this.spots.push({cfg,zone,debugLabel});
    });
  }
  canInteract(){return !this.disposed&&!this.navigating&&!this.panel;}
  layout(){
    if(this.disposed||!this.root)return;
    const {width,height}=this.scale;
    if(this.background){
      const source=this.background.texture.getSourceImage();
      const scale=Math.min(width/source.width,height/source.height);
      const w=source.width*scale,h=source.height*scale;
      this.imageBox={x:(width-w)/2,y:(height-h)/2,w,h};
      this.background.setPosition(this.imageBox.x,this.imageBox.y).setDisplaySize(w,h);
      for(const spot of this.spots)this.syncHotspot(spot);
    }
    this.hoverLabel?.setVisible(false);
    const box=this.game.canvas.getBoundingClientRect();
    Object.assign(this.root.style,{
      left:`${box.left}px`,top:`${box.top}px`,width:`${box.width}px`,height:`${box.height}px`,
      fontSize:`${Math.max(14,Math.min(22,box.width/65))}px`
    });
    this.refreshDebug();
  }
  syncHotspot(spot){
    if(!this.imageBox)return;
    const b=this.imageBox,c=spot.cfg;
    spot.zone.setPosition(b.x+c.x*b.w,b.y+c.y*b.h).setSize(c.w*b.w,c.h*b.h);
    spot.zone.input?.hitArea?.setTo(0,0,c.w*b.w,c.h*b.h);
    spot.debugLabel.setPosition(spot.zone.x,Math.max(b.y,spot.zone.y-23));
  }
  update(){
    if(this.disposed||!this.root)return;
    const b=this.game.canvas.getBoundingClientRect();
    const signature=[b.left,b.top,b.width,b.height].join('/');
    if(signature!==this.lastCanvasBox){this.lastCanvasBox=signature;this.layout();}
  }
  setHotspotsEnabled(enabled){
    for(const spot of this.spots){
      if(spot.zone.input)spot.zone.input.enabled=enabled;
      this.input.setDraggable(spot.zone,enabled&&this.debugMode);
    }
  }
  toggleDebug(){
    if(!this.canInteract()||!this.imageBox)return;
    this.debugMode=!this.debugMode;this.exportMessage='';
    this.hoverLabel?.setVisible(false);this.refreshDebug();
  }
  refreshDebug(){
    if(this.disposed)return;
    const visible=this.debugMode&&this.canInteract();
    this.setHotspotsEnabled(this.canInteract());
    this.debugGraphics?.clear();
    this.debugText?.setVisible(visible);
    if(this.debugButton){
      this.debugButton.textContent=this.debugMode?'Debug ON [D]':'Debug [D]';
      this.debugButton.disabled=Boolean(this.panel)||this.navigating;
      this.debugButton.setAttribute('aria-pressed',String(this.debugMode));
    }
    for(const [index,spot] of this.spots.entries()){
      spot.debugLabel.setVisible(visible);
      if(!visible)continue;
      const selected=index===this.selectedIndex;
      const {x,y,width:w,height:h}=spot.zone;
      this.debugGraphics.fillStyle(selected?0xff77c8:0xffd27d,selected ? 0.22 : 0.12).fillRect(x,y,w,h);
      this.debugGraphics.lineStyle(selected?3:2,selected?0xff77c8:0xffd27d,1).strokeRect(x,y,w,h);
      spot.zone.setDepth(selected?20:10);
      spot.debugLabel.setColor(selected?'#ff91d5':'#ffedb0');
    }
    const selected=this.hotspotDefs[this.selectedIndex];
    if(visible&&selected&&this.imageBox){
      const b=this.imageBox;
      this.debugText.setPosition(b.x+8,b.y+Math.min(90,b.h*.14))
        .setText(`SELECTED: ${selected.id}\nx:${selected.x.toFixed(4)} y:${selected.y.toFixed(4)} w:${selected.w.toFixed(4)} h:${selected.h.toFixed(4)}`)
        .setWordWrapWidth(Math.max(80,b.w-26));
    }
    if(this.hint){
      this.hint.hidden=Boolean(this.panel);
      this.hint.textContent=visible?[
        'DEBUG: click / drag a hotspot | Tab: next | Shift + Tab: previous',
        'Arrows: move | Shift + arrows: resize | Alt: 1px instead of 5px',
        'C: export JSON | D / Escape: close debug',
        this.exportMessage
      ].filter(Boolean).join('\n'):'Speak to the officer or look around.';
    }
  }
  clampHotspot(cfg){
    const b=this.imageBox;if(!b)return;
    cfg.w=Math.max(Math.min(20/b.w,1),Math.min(1,cfg.w));
    cfg.h=Math.max(Math.min(20/b.h,1),Math.min(1,cfg.h));
    cfg.x=Math.max(0,Math.min(1-cfg.w,cfg.x));
    cfg.y=Math.max(0,Math.min(1-cfg.h,cfg.y));
  }
  onHotspotDragStart(_pointer,object){
    if(!this.debugMode||!this.canInteract())return;
    const index=object.getData('hotspotIndex');
    if(!Number.isInteger(index))return;
    this.selectedIndex=index;this.refreshDebug();
  }
  onHotspotDrag(_pointer,object,x,y){
    if(!this.debugMode||!this.canInteract()||!this.imageBox)return;
    const index=object.getData('hotspotIndex');
    if(!Number.isInteger(index))return;
    const spot=this.spots[index];if(!spot)return;
    this.selectedIndex=index;
    const b=this.imageBox;
    spot.cfg.x=(x-b.x)/b.w;spot.cfg.y=(y-b.y)/b.h;
    this.clampHotspot(spot.cfg);this.syncHotspot(spot);this.refreshDebug();
  }
  onKey(event){
    if(this.disposed||this.navigating||this.handledKeys?.has(event))return;
    const t=event.target;
    if(t?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t?.tagName))return;
    if(event.ctrlKey||event.metaKey)return;
    this.handledKeys?.add(event);
    if(event.code==='Escape'){
      event.preventDefault();
      if(event.repeat)return;
      if(this.panel)this.closePanel();
      else if(this.debugMode){this.debugMode=false;this.refreshDebug();}
      else void this.leave();
      return;
    }
    if(this.panel)return;
    if(event.code==='KeyD'){
      event.preventDefault();if(!event.repeat)this.toggleDebug();return;
    }
    if(!this.debugMode||!this.spots.length||!this.imageBox)return;
    if(event.code==='Tab'){
      event.preventDefault();
      this.selectedIndex=(this.selectedIndex+(event.shiftKey?-1:1)+this.spots.length)%this.spots.length;
    }else if(event.code==='KeyC'){
      event.preventDefault();if(!event.repeat)this.exportHotspots();return;
    }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
      event.preventDefault();
      const spot=this.spots[this.selectedIndex];
      const horizontal=['ArrowLeft','ArrowRight'].includes(event.code);
      const direction=['ArrowLeft','ArrowUp'].includes(event.code)?-1:1;
      const field=event.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');
      const size=horizontal?this.imageBox.w:this.imageBox.h;
      spot.cfg[field]+=direction*(event.altKey?1:5)/size;
      this.clampHotspot(spot.cfg);this.syncHotspot(spot);
    }else return;
    this.refreshDebug();
  }
  exportHotspots(){
    const data=this.hotspotDefs.map(cfg=>({
      ...cfg,x:+cfg.x.toFixed(6),y:+cfg.y.toFixed(6),w:+cfg.w.toFixed(6),h:+cfg.h.toFixed(6)
    }));
    const json=JSON.stringify(data,null,2);
    console.log('PoliceStationScene HOTSPOTS =\n'+json);
    const blob=new Blob([json+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='police-hotspots.json';
    document.body.appendChild(a);a.click();a.remove();
    // Opóźnienie pozwala przeglądarce rozpocząć pobieranie przed zwolnieniem URL.
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    this.exportMessage='JSON exported to console and downloaded. Source files are unchanged.';
    this.refreshDebug();
  }
  makeButton(label,action,version=null){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',event=>{
      event.stopPropagation();
      if(this.disposed||this.navigating)return;
      if(version!==null&&version!==this.dialogueVersion)return;
      action();
    });return button;
  }
  showPanel(title,text,choices,playerLine=''){
    if(this.disposed||!this.root)return;
    if(!this.panel)this.returnFocus=document.activeElement;
    this.panel?.remove();this.hoverLabel?.setVisible(false);
    const version=++this.dialogueVersion;
    this.panel=document.createElement('section');this.panel.className='police-panel';
    this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label',title);
    const heading=document.createElement('h2');heading.textContent=title;this.panel.appendChild(heading);
    if(playerLine){
      const player=document.createElement('p');player.className='police-player';
      player.textContent=`You: ${playerLine}`;this.panel.appendChild(player);
    }
    const response=document.createElement('p');response.className='police-response';response.textContent=text;
    const options=document.createElement('div');options.className='police-choices';
    for(const [label,action,used=false] of choices){
      const button=this.makeButton(label,action,version);
      if(used)button.classList.add('police-choice-used');options.appendChild(button);
    }
    this.panel.append(response,options);this.root.appendChild(this.panel);
    this.refreshDebug();options.querySelector('button')?.focus({preventScroll:true});
  }
  openConversation(){
    if(!this.canInteract()||this.debugMode)return;this.showDialogue('start');
  }
  showDialogue(id){
    const node=DIALOGUE[id];if(!node||this.disposed||this.navigating)return;
    this.visitedNodes.add(id);
    this.showPanel('Desk officer',node.text,node.choices.map(([label,target])=>[
      label,()=>target===null?this.closePanel():this.showDialogue(target),
      target!==null&&this.visitedNodes.has(target)
    ]),node.player||'');
  }
  inspect(id){
    const observation=OBSERVATIONS[id];if(!observation)return;
    this.showPanel(observation[0],observation[1],[['Step away.',()=>this.closePanel()]]);
  }
  closePanel(){
    ++this.dialogueVersion;this.panel?.remove();this.panel=null;this.refreshDebug();
    const focus=this.returnFocus;this.returnFocus=null;
    if(focus?.isConnected&&focus!==document.body)focus.focus?.({preventScroll:true});
    else this.exitButton?.focus({preventScroll:true});
  }
  async leave(){
    if(this.disposed||this.navigating)return false;
    this.navigating=true;const token=this.runToken;this.refreshDebug();
    this.hoverLabel?.setVisible(false);if(this.exitButton)this.exitButton.disabled=true;
    let result=false;
    try{result=await this.goto('HomeCityScene',{entryPoint:'police-station',fromScene:KEY,gameState});}
    catch(error){console.error('[PoliceStationScene] Navigation failed:',error);}
    if(this.disposed||this.runToken!==token)return result!==false;
    this.navigating=false;if(this.exitButton)this.exitButton.disabled=false;
    if(result===false)this.showPanel('Unable to leave','The street could not be opened. Please try again.',[
      ['Try again.',()=>void this.leave()],['Stay here.',()=>this.closePanel()]
    ]);
    this.refreshDebug();return result!==false;
  }
  disposePolice(){
    if(this.disposed)return;
    this.disposed=true;this.runToken=null;++this.dialogueVersion;
    this.root?.removeEventListener('keydown',this.domKeyHandler);
    this.root?.remove();this.styleElement?.remove();
    document.documentElement.classList.remove('la-police-active');
    this.root=null;this.panel=null;this.hint=null;this.exitButton=null;this.debugButton=null;
    this.returnFocus=null;this.styleElement=null;this.handledKeys=null;
    this.events.off('shutdown',this.disposePolice,this);
    this.events.off('destroy',this.disposePolice,this);
  }
}