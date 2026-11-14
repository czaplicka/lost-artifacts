import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { medicalReviewData as DATA,getMedicalReviewStory,storeMedicalReview } from '../medicalReviewService.js';
import { normalizeMedical,medicalTestsDone,advanceMedicalFindings } from './medical/MedicalReviewModel.js';
import { MedicalTestsController } from './medical/MedicalTestsController.js';
import { RoomHotspotDebug } from '../ui/RoomHotspotDebug.js';
export class MedicalReviewScene extends BaseScene{
  constructor(){super({key:'MedicalReviewScene'});}
  init(data={}){
    this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.progress=null;this.hotspots=[];this.modal=null;this.closing=false;this.lockedUntil=0;this.savedOk=null;this.layerStates=[];this.parentPausedByMe=false;this.findingsIndex=0;
  }
  preload(){for(const asset of Object.values(DATA.backgrounds))if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);}
  create(){
    super.create();this.cameras.main.setBackgroundColor('#080b08');const story=getMedicalReviewStory();this.allowed=this.preview||story.eligible;this.progress=normalizeMedical(DATA,this.preview?null:story);
    this.root=this.add.container(0,0);this.background=this.add.image(DATA.width/2,DATA.height/2,DATA.backgrounds.occupied.key).setDisplaySize(DATA.width,DATA.height).setVisible(this.allowed);this.root.add(this.background);
    this.label(25,23,__dialogueText("scenes/MedicalReviewScene.js", "t_adf981ebd77937236ed5"),22).setOrigin(0,0);
    this.exit=this.label(25,80,__dialogueText("scenes/MedicalReviewScene.js", "t_db26b7d387791ba818bb"),20).setOrigin(0,0).setInteractive({useHandCursor:true});this.exit.on('pointerdown',()=>{if(!this.modal&&!this.debug.enabled)this.closeReview();});
    this.status=this.label(DATA.width-25,80,'',18).setOrigin(1,0);this.tooltip=this.label(0,0,'',19).setVisible(false);
    this.tests=new MedicalTestsController(this,DATA);
    for(const source of DATA.hotspots){const def={...source},zone=this.add.zone(def.x,def.y,def.w,def.h).setOrigin(0).setInteractive({useHandCursor:true});this.root.add(zone);const h={def,zone};this.hotspots.push(h);
      zone.on('pointerover',()=>{if(!this.canInteract())return;this.tooltip.setText(def.label).setPosition(def.x+def.w/2,Math.max(125,def.y-10)).setOrigin(0.5,1).setVisible(true);this.root.bringToTop(this.tooltip);});
      zone.on('pointerout',()=>this.tooltip.setVisible(false));zone.on('pointerdown',()=>{if(this.debug.enabled){this.debug.select(h);return;}if(this.canInteract())this.activate(def.id);});
    }
    this.debug=new RoomHotspotDebug(this,this.hotspots,{width:DATA.width,height:DATA.height,path:'assets/data/medicalReview.json'});
    this.refreshReview();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',event=>{if(event.repeat)return;if(this.tests.isOpen)this.tests.close();else if(this.modal)this.closeModal();else if(this.debug.enabled)this.debug.setEnabled(false);else this.closeReview();});
    this.suspendBackground();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.closing=true;this.tests?.destroy();this.debug?.destroy();this.restoreBackground();this.onFinished=null;});
  }
  canInteract(){return this.allowed&&!this.closing&&!this.modal&&!this.debug?.enabled&&this.time.now>=this.lockedUntil;}
  label(x,y,text,size=23,parent=this.root){const object=this.add.text(x,y,text,{fontFamily:'SpecialElite',fontSize:`${size}px`,color:'#ffe3b3',backgroundColor:'#102219',padding:{x:10,y:7},align:'center',wordWrap:{width:DATA.width-100},lineSpacing:5}).setOrigin(0.5);parent.add(object);return object;}
  persist(){if(this.preview||!this.allowed)return;this.savedOk=storeMedicalReview(this.progress).saved;}
  refreshReview(){this.status?.setText(this.allowed?(this.preview?__dialogueText("scenes/MedicalReviewScene.js", "t_50d1058f5474fe46bb88"):'')+`${__dialogueText("scenes/MedicalReviewScene.js", "t_77370e3b5cd3e4aa9be9")}${this.progress.reflex}${__dialogueText("scenes/MedicalReviewScene.js", "t_8a5edab282632443219e")}${DATA.rounds}${__dialogueText("scenes/MedicalReviewScene.js", "t_13c9e0f58dbbb4ff23ea")}${this.progress.coordination}${__dialogueText("scenes/MedicalReviewScene.js", "t_8a5edab282632443219e")}${DATA.rounds}`:__dialogueText("scenes/MedicalReviewScene.js", "t_23e34823c6d383e6744c"));}
  activate(id){
    if(id==='door'){this.closeReview();return;}
    if(id==='reflex'||id==='coordination'){this.tests.open(id);return;}
    if(id==='doctor'||id==='folder'){
      if(!medicalTestsDone(DATA,this.progress)){this.notice(__dialogueText("scenes/MedicalReviewScene.js", "t_a178cd313931199f23c9"),__dialogueText("scenes/MedicalReviewScene.js", "t_5a9c4a8a753c02633f08"));return;}
      this.findingsIndex=this.progress.completed?0:this.progress.line;this.openFindings();return;
    }
    const messages={couch:__dialogueText("scenes/MedicalReviewScene.js", "t_2d49489fe3be05627a7a"),eye_chart:__dialogueText("scenes/MedicalReviewScene.js", "t_4122663dd823abdabee2"),cabinet:__dialogueText("scenes/MedicalReviewScene.js", "t_a9ab6a265a4e6f3d4ea0"),telephone:__dialogueText("scenes/MedicalReviewScene.js", "t_f4857ebe92d6444d9707"),apple:__dialogueText("scenes/MedicalReviewScene.js", "t_34f6783b006993746f90")};
    this.notice(__dialogueText("scenes/MedicalReviewScene.js", "t_5a8854e11cc56fe0379f"),messages[id]||__dialogueText("scenes/MedicalReviewScene.js", "t_aeccb8e50be763b8ca45"));
  }
  makeModal(){this.tooltip.setVisible(false);const layer=this.add.container(0,0);this.root.add(layer);this.modal=layer;return layer;}
  drawModal(layer){
    const shade=this.add.rectangle(688,384,1376,768,0x000000,0.75).setInteractive();shade.on('pointerdown',(p,x,y,e)=>e?.stopPropagation());layer.add(shade);
    layer.add(this.add.rectangle(688,395,1170,455,0x14271d).setStrokeStyle(3,0xb19457));
  }
  modalButton(layer,x,y,text,callback){const button=this.label(x,y,text,22,layer).setInteractive({useHandCursor:true});button.on('pointerdown',(p,a,b,e)=>{e?.stopPropagation();if(this.time.now<this.lockedUntil)return;this.lockedUntil=this.time.now+180;callback();});return button;}
  notice(title,text){const layer=this.makeModal();this.drawModal(layer);this.label(688,235,title,27,layer);this.label(688,385,text,25,layer).setWordWrapWidth(1040);this.modalButton(layer,688,555,'BACK',()=>this.closeModal());}
  openFindings(){if(!this.modal)this.makeModal();this.renderFindings();}
  renderFindings(){
    const layer=this.modal;layer.removeAll(true);this.drawModal(layer);const line=DATA.findings[this.findingsIndex];
    this.label(688,235,line.speaker,27,layer);this.label(688,385,line.text,26,layer).setWordWrapWidth(1040);
    this.modalButton(layer,688,555,this.findingsIndex===DATA.findings.length-1?__dialogueText("scenes/MedicalReviewScene.js", "t_e8088c12ac0235618d67"):'CONTINUE',()=>{
      if(this.progress.completed){if(this.findingsIndex<DATA.findings.length-1){this.findingsIndex++;this.renderFindings();}else this.closeModal();return;}
      this.progress=advanceMedicalFindings(DATA,this.progress);this.persist();this.findingsIndex=this.progress.line;
      if(this.progress.completed){this.closeModal();this.notice(__dialogueText("scenes/MedicalReviewScene.js", "t_245629e777c482467b50"),DATA.objective+(this.savedOk===false?' '+DATA.messages.saveFailed:''));}else this.renderFindings();
    });
  }
  closeModal(){const layer=this.modal;this.modal=null;layer?.destroy(true);this.lockedUntil=this.time.now+180;}
  restoreOccupiedBackground(){this.background?.setTexture(DATA.backgrounds.occupied.key).setDisplaySize(DATA.width,DATA.height);}
  toggleDebugBackground(){const key=this.background.texture.key===DATA.backgrounds.occupied.key?DATA.backgrounds.empty.key:DATA.backgrounds.occupied.key;this.background.setTexture(key).setDisplaySize(DATA.width,DATA.height);}
  layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/DATA.width,height/DATA.height);this.root.setScale(s).setPosition((width-DATA.width*s)/2,(height-DATA.height*s)/2);}
  suspendBackground(){this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}}
  restoreBackground(){for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;}
  closeReview(){if(this.closing)return;if(this.tests.isOpen){this.tests.close();return;}if(this.modal){this.closeModal();return;}this.closing=true;this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();try{callback?.({completed:this.progress.completed,preview:this.preview,saved:this.savedOk});}finally{this.scene.stop();}}
}
