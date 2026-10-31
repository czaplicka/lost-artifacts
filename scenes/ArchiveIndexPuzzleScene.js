import { BaseScene } from './BaseScene.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { createArchiveIcon } from './archive/ArchiveCardIcons.js';

const STATE_KEY = 'archive_index_puzzle';
const FLAG = 'duplicate_record_found';
const DATA = [
  {
    "id": "expenses_0",
    "pairId": "expenses",
    "title": "EXPENSE CLAIM",
    "body": "Taxi to the airport.\nReceipt attached.",
    "icon": "receipt",
    "type": "DOCUMENT"
  },
  {
    "id": "expenses_1",
    "pairId": "expenses",
    "title": "FINANCE",
    "body": "Ground transport\nreimbursements.",
    "icon": "coins",
    "type": "DEPARTMENT"
  },
  {
    "id": "conservation_0",
    "pairId": "conservation",
    "title": "CONDITION REPORT",
    "body": "Ceramic vessel.\nNew crack after transit.",
    "icon": "vase",
    "type": "DOCUMENT"
  },
  {
    "id": "conservation_1",
    "pairId": "conservation",
    "title": "CONSERVATION",
    "body": "Objects requiring\nrepair or stabilisation.",
    "icon": "brush",
    "type": "DEPARTMENT"
  },
  {
    "id": "customs_0",
    "pairId": "customs",
    "title": "IMPORT DECLARATION",
    "body": "Antiquity entering\nthe country.",
    "icon": "crate",
    "type": "DOCUMENT"
  },
  {
    "id": "customs_1",
    "pairId": "customs",
    "title": "CUSTOMS",
    "body": "Border clearance\nand import paperwork.",
    "icon": "barrier",
    "type": "DEPARTMENT"
  },
  {
    "id": "training_0",
    "pairId": "training",
    "title": "COURSE CERTIFICATE",
    "body": "Agent passed the\nlockpicking assessment.",
    "icon": "key",
    "type": "DOCUMENT"
  },
  {
    "id": "training_1",
    "pairId": "training",
    "title": "TRAINING",
    "body": "Staff qualifications\nand completed courses.",
    "icon": "cap",
    "type": "DEPARTMENT"
  },
  {
    "id": "loan_0",
    "pairId": "loan",
    "title": "LOAN AGREEMENT",
    "body": "Museum borrows a mask.\nReturn due in June.",
    "icon": "mask",
    "type": "DOCUMENT"
  },
  {
    "id": "loan_1",
    "pairId": "loan",
    "title": "LOANS",
    "body": "Temporary transfers\nwith a return date.",
    "icon": "calendar",
    "type": "DEPARTMENT"
  },
  {
    "id": "maintenance_0",
    "pairId": "maintenance",
    "title": "SERVICE REQUEST",
    "body": "Projector emits smoke.\nNot a special effect.",
    "icon": "projector",
    "type": "DOCUMENT"
  },
  {
    "id": "maintenance_1",
    "pairId": "maintenance",
    "title": "MAINTENANCE",
    "body": "Broken equipment\nand repair requests.",
    "icon": "wrench",
    "type": "DEPARTMENT"
  },
  {
    "id": "leave_0",
    "pairId": "leave",
    "title": "LEAVE REQUEST",
    "body": "Five days off.\nReason: not being here.",
    "icon": "suitcase",
    "type": "DOCUMENT"
  },
  {
    "id": "leave_1",
    "pairId": "leave",
    "title": "PERSONNEL",
    "body": "Staff leave\nand absence records.",
    "icon": "person",
    "type": "DEPARTMENT"
  },
  {
    "id": "john_general",
    "pairId": null,
    "title": "CATALOGUE INDEX",
    "body": "JM-041 / McCLANE, J.\nField report\nGENERAL ARCHIVE",
    "icon": "folder",
    "type": "INDEX"
  },
  {
    "id": "john_restricted",
    "pairId": null,
    "title": "CATALOGUE INDEX",
    "body": "JM-041 / McCLANE, J.\nField report\nRESTRICTED STORAGE",
    "icon": "lock",
    "type": "INDEX"
  }
];
const PAIR_IDS = [...new Set(DATA.map(card => card.pairId).filter(Boolean))];

export class ArchiveIndexPuzzleScene extends BaseScene {
  constructor() { super({ key: 'ArchiveIndexPuzzleScene' }); }
  init(data = {}) {
    this.preview = data.preview === true;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.resumeReturnScene = data.resumeReturnScene === true;
    this.manageBackground = data.manageBackground === true;
    this.onFinished = typeof data.onFinished === 'function' ? data.onFinished : null;
    this.selected = []; this.cards = []; this.matched = new Set(); this.mistakes = 0;
    this.finished = false; this.locked = false; this.closing = false;
    this.pendingReset = null; this.layerStates = []; this.parentPausedByMe = false; this.savedOk = null;
  }
  create() {
    super.create();
    const saved = this.preview ? null : MainStoryManager.getSideClue(STATE_KEY);
    this.finished = !this.preview && MainStoryManager.hasFlag(FLAG);
    if (Array.isArray(saved?.matchedPairIds)) this.matched = new Set(saved.matchedPairIds.filter(id => PAIR_IDS.includes(id)));
    this.mistakes = Number.isInteger(saved?.mistakes) && saved.mistakes >= 0 ? saved.mistakes : 0;
    const ids = DATA.map(card => card.id), order = saved?.order;
    const valid = Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && order.every(id => ids.includes(id));
    this.order = valid ? [...order] : Phaser.Utils.Array.Shuffle([...ids]);
    this.cameras.main.setBackgroundColor('#171619');
    this.root = this.add.container(0, 0);
    this.root.add(this.add.rectangle(640, 450, 1280, 900, 0x302729));
    this.label(640,45,'THE FILING INCIDENT',23,'#f0ce88','PressStart2P');
    this.label(640,88,'Select a document, then the department that should receive it.',23);
    this.progress = this.label(640,123,'',20,'#bbccb2');
    this.message = this.label(640,782,'Match by meaning. The pictures are clues, not identical pairs.',22);
    this.label(485,850,this.preview ? 'PREVIEW / no story changes' : 'FRANK: "I have a system. Allegedly."',20,'#bbaa94');
    const back = this.add.text(1080,850,'BACK',{fontFamily:'SpecialElite, monospace',fontSize:'23px',color:'#f1d89d',backgroundColor:'#4a3933',padding:{x:24,y:13}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.root.add(back); back.on('pointerdown',()=>this.closePuzzle());
    if (this.finished) this.showDiscovery(); else this.buildCards();
    this.updateProgress(); this.layout();
    this.trackInputEvent(this.scale,'resize',this.layout);
    if (this.manageBackground) this.suspendBackground();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.pendingReset?.remove(false); this.pendingReset=null; this.releaseParent(); this.onFinished=null;
    });
  }
  label(x,y,text,size=21,color='#e9dfc8',font='SpecialElite') {
    const object=this.add.text(x,y,text,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width:1190}}).setOrigin(0.5);
    this.root.add(object); return object;
  }
  buildCards() {
    this.order.forEach((id,index)=>{
      const data=DATA.find(card=>card.id===id);
      const item=this.add.container(184+(index%4)*304,235+Math.floor(index/4)*143);
      const paper=this.add.rectangle(0,0,286,129,0xe2d4b6).setStrokeStyle(2,0x9c8969);
      const type=this.add.text(-130,-53,data.type,{fontFamily:'SpecialElite, monospace',fontSize:'13px',color:'#79684f'});
      const badge=this.add.rectangle(-108,4,46,58,0xd3c3a2).setStrokeStyle(1,0xb7a37d);
      const icon=createArchiveIcon(this,data.icon,-128,-17,1.25);
      const title=this.add.text(-73,-29,data.title,{fontFamily:'SpecialElite, monospace',fontSize:'18px',color:'#352c29',wordWrap:{width:208}}).setOrigin(0,0.5);
      const body=this.add.text(-73,17,data.body,{fontFamily:'SpecialElite, monospace',fontSize:'16px',color:'#4d4339',lineSpacing:2,wordWrap:{width:208}}).setOrigin(0,0.5);
      const stamp=this.add.text(85,49,'FILED',{fontFamily:'SpecialElite, monospace',fontSize:'19px',color:'#245f3e',backgroundColor:'#d3d8bc',padding:{x:4,y:1}}).setOrigin(0.5).setAngle(-10).setVisible(false);
      item.add([paper,type,badge,icon,title,body,stamp]); this.root.add(item);
      const card={...data,item,paper,stamp,matched:this.matched.has(data.pairId)}; this.cards.push(card);
      paper.setInteractive({useHandCursor:true}); paper.on('pointerdown',()=>this.selectCard(card));
      if(card.matched){paper.disableInteractive();stamp.setVisible(true);}
      this.paint(card);
    });
    if(this.matched.size===PAIR_IDS.length)this.message.setText('Only two index cards remain. Select both and compare the destinations.');
  }
  paint(card) {
    const selected=this.selected.includes(card), ready=card.type==='INDEX'&&this.matched.size===PAIR_IDS.length;
    card.paper.setFillStyle(card.matched?0xc1c8ad:selected?0xf5e6bd:0xe2d4b6);
    card.paper.setStrokeStyle(selected||ready?4:2,selected||ready?0xe7ac48:card.matched?0x6a8160:0x9c8969);
  }
  selectCard(card) {
    if(this.locked||this.finished||this.closing||card.matched)return;
    const index=this.selected.indexOf(card);
    if(index!==-1){this.selected.splice(index,1);this.paint(card);return;}
    this.selected.push(card);this.paint(card);if(this.selected.length<2)return;
    const [a,b]=this.selected;
    if(a.type==='INDEX'&&b.type==='INDEX'){
      if(this.matched.size===PAIR_IDS.length)this.finishPuzzle();
      else this.reject('Same report, different destinations. Set these aside; file the ordinary documents first.',false);
      return;
    }
    if(a.pairId&&a.pairId===b.pairId){
      this.matched.add(a.pairId);
      this.selected.forEach(chosen=>{chosen.matched=true;chosen.stamp.setVisible(true);chosen.paper.disableInteractive();});
      this.selected=[];this.cards.forEach(item=>this.paint(item));
      this.message.setText(this.matched.size===PAIR_IDS.length?'Only two index cards remain. Select both and compare the destinations.':'Filed correctly. Frank has postponed his disappointment.');
      this.updateProgress();this.persist();return;
    }
    this.reject(a.type===b.type&&a.type!=='INDEX'?'Choose one DOCUMENT and one DEPARTMENT.':'Different paperwork. Read what this department handles, then try again.',true);
  }
  reject(message,count) {
    this.locked=true;if(count)this.mistakes+=1;this.message.setText(message);
    this.selected.forEach(card=>card.paper.setStrokeStyle(4,0xb45a48));this.persist();
    this.pendingReset=this.time.delayedCall(1100,()=>{
      const previous=[...this.selected];this.selected=[];this.locked=false;this.pendingReset=null;previous.forEach(card=>this.paint(card));
    });
  }
  updateProgress(){this.progress.setText(this.finished?'ANOMALY FOUND':`FILED: ${this.matched.size} / ${PAIR_IDS.length}  |  No timer. No score penalty.`);}
  persist() {
    if(this.preview)return;
    MainStoryManager.setSideClue(STATE_KEY,{version:2,completed:this.finished,order:[...this.order],matchedPairIds:[...this.matched],matchedPairs:this.matched.size,mistakes:this.mistakes,documentId:this.finished?'JM-041':null,subject:this.finished?'John McClane':null,destinations:this.finished?['general_archive','restricted_storage']:[]});
    if(this.finished)MainStoryManager.setFlag(FLAG,true);this.savedOk=saveGameState();
  }
  finishPuzzle() {
    if(this.finished)return;
    this.finished=true;this.locked=true;this.selected=[];this.persist();
    this.cards.forEach(card=>card.item.setVisible(false));this.showDiscovery();this.updateProgress();
    if(!this.preview)this.emitBus('archive:indexPuzzleCompleted',{documentId:'JM-041',flag:FLAG});
  }
  showDiscovery() {
    this.root.add(this.add.rectangle(640,438,1060,500,0xe2d4b6).setStrokeStyle(3,0x9c8969));
    this.label(640,240,'ONE REPORT. TWO DESTINATIONS.',29,'#4c3028');
    this.label(640,320,'JM-041 / John McClane\nField report',27,'#38302b');
    this.root.add(createArchiveIcon(this,'folder',240,380,2));
    this.root.add(createArchiveIcon(this,'lock',750,380,2));
    this.label(385,475,'CATALOGUE A\nGENERAL ARCHIVE',25,'#354c3a');
    this.label(895,475,'CATALOGUE B\nRESTRICTED STORAGE',25,'#853b32');
    this.label(640,575,'The same report appears in two catalogues with different access rules.\nThat deserves an explanation.',23,'#38302b');
    this.label(640,645,'"One document. Twice the bureaucracy."',22,'#725747');
    this.message.setText(this.preview?'Preview complete. No story progress was changed.':this.savedOk===false?'Discovery recorded, but saving failed. Save manually before leaving.':'New lead: ask Frank about the duplicate report.');
  }
  layout(){if(!this.root)return;const{width,height}=this.scale;const s=Math.min(width/1280,height/900);this.root.setScale(s).setPosition((width-1280*s)/2,(height-900*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{
      const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};
    });
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  releaseParent(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];
    if((this.parentPausedByMe||this.resumeReturnScene)&&this.returnSceneKey&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);
    this.parentPausedByMe=false;this.resumeReturnScene=false;
  }
  closePuzzle(){
    if(this.closing)return;this.closing=true;this.persist();const callback=this.onFinished;this.onFinished=null;this.releaseParent();
    try{callback?.({completed:this.finished,preview:this.preview,mistakes:this.mistakes,documentId:this.finished?'JM-041':null});}finally{this.scene.stop();}
  }
}
