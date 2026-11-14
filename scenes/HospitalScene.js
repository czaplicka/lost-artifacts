import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getReputation } from '../managers/ReputationManager.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { installHospitalWorldReactions } from '../ui/WorldHospitalReactionHooks.js';

const KEY='HospitalScene';
const BACKGROUND_KEY='hospital_reception_nurse';
const BACKGROUND_URL='assets/pi/hospital/nurse.webp';
export const HOSPITAL_MIN_FAME=30;
export function canEnterHospital(){return getReputation().fame>=HOSPITAL_MIN_FAME;}

export class HospitalScene extends BaseScene{
  constructor(){super({key:KEY});}
  init(){
    this.disposed=false;this.navigating=false;this.token=Symbol(KEY);
    this.background=null;this.nurseHotspot=null;this.nurseLabel=null;this.exitButton=null;
    this.dialogue=null;this.dialogueOpen=false;this.errorText=null;this.imageBox=null;
    this.hiddenHudElement=null;this.previousHudDisplay='';
  }
  preload(){if(!this.textures.exists(BACKGROUND_KEY))this.load.image(BACKGROUND_KEY,BACKGROUND_URL);}
  create(){
    super.create();
    installHospitalWorldReactions(this,{canEnter:canEnterHospital});
    this.registry.set('currentSceneKey',KEY);
    this.events.once('shutdown',this.disposeHospital,this);
    this.events.once('destroy',this.disposeHospital,this);
    this.hideGameplayHud();this.cameras.main.setBackgroundColor('#11191c');
    this.dialogue=new HomeTownDialogue(this,()=>{
      this.dialogueOpen=false;this.refreshHotspot();void this.leave();
    });
    if(this.textures.exists(BACKGROUND_KEY)){
      this.background=this.add.image(0,0,BACKGROUND_KEY).setOrigin(0).setDepth(0);
      this.createNurseHotspot();
    }else{
      this.errorText=this.add.text(24,90,[
        __dialogueText("scenes/HospitalScene.js", "t_940405beb6a225060ce1"),'',__dialogueText("scenes/HospitalScene.js", "t_a59531ee131478a79104"),BACKGROUND_URL,'',__dialogueText("scenes/HospitalScene.js", "t_e78e6cb773453ed2df43")
      ].join(__dialogueText("scenes/HospitalScene.js", "t_01ba4719c80b6fe911b0")),{
        fontFamily:'SpecialElite, monospace',fontSize:22,color:'#ffe4c0',
        wordWrap:{width:Math.max(100,this.scale.width-48)}
      }).setDepth(20);
    }
    this.exitButton=this.add.text(18,16,__dialogueText("scenes/HospitalScene.js", "t_05a9505481b14d636cc5"),{
      fontFamily:'SpecialElite, monospace',fontSize:20,color:'#ffe0a0',backgroundColor:'#24352e',padding:{x:12,y:10}
    }).setDepth(100).setInteractive({useHandCursor:true});
    this.exitButton.on('pointerdown',()=>{void this.leave();});
    this.trackInputEvent(this.scale,'resize',this.layoutHospital);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',this.onEscape);
    this.layoutHospital();
    if(this.background)this.talk();
  }
  hideGameplayHud(){
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    const news=this.getRegisteredScene('NewsHud');news?.closeMenu?.(true);news?.setHudVisible?.(false);
    for(const key of ['PlayerHudScene','UIScene','NewsHud'])if(this.hasScene(key))this.scene.setVisible(false,key);
    const hud=document.getElementById('hud-container');
    if(hud){this.hiddenHudElement=hud;this.previousHudDisplay=hud.style.display;hud.style.display='none';}
  }
  createNurseHotspot(){
    this.nurseHotspot=this.add.rectangle(0,0,1,1,0xffffff,0).setDepth(10).setInteractive({useHandCursor:true});
    this.nurseLabel=this.add.text(0,0,__dialogueText("scenes/HospitalScene.js", "t_41e96c33cee3543fb051"),{
      fontFamily:'SpecialElite, monospace',fontSize:20,color:'#ffe3a4',backgroundColor:'#18201c',padding:{x:10,y:6}
    }).setOrigin(0.5,1).setDepth(30).setVisible(false);
    this.nurseHotspot.on('pointerover',()=>{if(this.canInteract())this.nurseLabel.setVisible(true);});
    this.nurseHotspot.on('pointerout',()=>{this.nurseLabel.setVisible(false);});
    this.nurseHotspot.on('pointerdown',()=>{if(this.canInteract())this.talk();});
  }
  canInteract(){return !this.disposed&&!this.navigating&&!this.dialogueOpen;}
  refreshHotspot(){
    if(this.nurseHotspot?.input)this.nurseHotspot.input.enabled=this.canInteract();
    this.nurseLabel?.setVisible(false);
  }
  layoutHospital(){
    if(this.disposed)return;
    const {width,height}=this.scale;
    if(this.background){
      const source=this.textures.get(BACKGROUND_KEY).getSourceImage();
      const scale=Math.min(width/source.width,height/source.height);
      const imageWidth=source.width*scale,imageHeight=source.height*scale;
      const left=(width-imageWidth)/2,top=(height-imageHeight)/2;
      this.imageBox={left,top,width:imageWidth,height:imageHeight};
      this.background.setPosition(left,top).setDisplaySize(imageWidth,imageHeight);
      if(this.nurseHotspot){
        const hotspotWidth=imageWidth*0.11,hotspotHeight=imageHeight*0.27;
        const x=left+imageWidth*0.655,y=top+imageHeight*0.485;
        this.nurseHotspot.setPosition(x,y).setSize(hotspotWidth,hotspotHeight);
        this.nurseHotspot.input?.hitArea?.setTo(0,0,hotspotWidth,hotspotHeight);
        this.nurseLabel.setPosition(x,y-hotspotHeight/2-8);
      }
    }
    this.exitButton?.setPosition(18,16);
    this.errorText?.setWordWrapWidth(Math.max(100,width-48));
  }
  showDialogue(text,choices=[]){
    if(this.disposed||this.navigating)return;
    this.dialogueOpen=true;this.refreshHotspot();
    this.dialogue.show({title:__dialogueText("scenes/HospitalScene.js", "t_41e96c33cee3543fb051"),text,choices});
  }
  talk(){
    if(this.disposed||this.navigating)return;
    const fame=getReputation().fame;
    if(!canEnterHospital()){
      this.showDialogue([
        __dialogueText("scenes/HospitalScene.js", "t_049c7edbefc5856ee465"),
        __dialogueText("scenes/HospitalScene.js", "t_cfab992a935e61a71f96"),'',
        `${__dialogueText("scenes/HospitalScene.js", "t_50db7e2c64f442a59192")}${HOSPITAL_MIN_FAME}${__dialogueText("scenes/HospitalScene.js", "t_92f33d623e93610818f9")}${fame}${__dialogueText("scenes/HospitalScene.js", "t_cdb4ee2aea69cc6a8333")}`
      ].join('\n'),[[__dialogueText("scenes/HospitalScene.js", "t_dc9fe32279628cfe7fe1"),()=>void this.leave()]]);
      return;
    }
    this.showDialogue(__dialogueText("scenes/HospitalScene.js", "t_0fa341d5ef1f46aa9ad9")+__dialogueText("scenes/HospitalScene.js", "t_810ffb221674a798d24e"),[
      [__dialogueText("scenes/HospitalScene.js", "t_7c35228e8fbd83330da4"),()=>this.showAdvice()],
      [__dialogueText("scenes/HospitalScene.js", "t_4e318cef134c9b7e5815"),()=>this.closeDialogue()]
    ]);
  }
  showAdvice(){
    if(!canEnterHospital()){this.talk();return;}
    this.showDialogue(__dialogueText("scenes/HospitalScene.js", "t_68b129c1a4eed3db8cea")+__dialogueText("scenes/HospitalScene.js", "t_d10249d5e821e4f43084"),[
      [__dialogueText("scenes/HospitalScene.js", "t_240f1c9f302be82fb90a"),()=>this.talk()],
      [__dialogueText("scenes/HospitalScene.js", "t_4e318cef134c9b7e5815"),()=>this.closeDialogue()]
    ]);
  }
  closeDialogue(){
    if(!canEnterHospital()){void this.leave();return;}
    this.dialogue?.close(false);this.dialogueOpen=false;this.refreshHotspot();
  }
  onEscape(event){
    if(event?.repeat||this.disposed||this.navigating)return;
    event?.preventDefault();void this.leave();
  }
  async leave(){
    if(this.disposed||this.navigating)return false;
    this.navigating=true;this.refreshHotspot();
    const token=this.token;
    try{
      const result=await this.goto('HomeCityScene',{entryPoint:'hospital',fromScene:KEY,gameState});
      if(!this.disposed&&this.token===token&&result===false)this.showNavigationError();
      return result!==false;
    }catch(error){
      console.error('[HospitalScene]',error);
      if(!this.disposed&&this.token===token)this.showNavigationError();
      return false;
    }
  }
  showNavigationError(){
    this.navigating=false;
    this.showDialogue(__dialogueText("scenes/HospitalScene.js", "t_842cf46b73dce3f1f443"),[[__dialogueText("scenes/HospitalScene.js", "t_a0c2cc1374d949943e01"),()=>void this.leave()]]);
  }
  disposeHospital(){
    if(this.disposed)return;
    this.disposed=true;this.token=null;
    this.dialogue?.destroy();this.dialogue=null;this.nurseLabel?.setVisible(false);
    if(this.hiddenHudElement){this.hiddenHudElement.style.display=this.previousHudDisplay;this.hiddenHudElement=null;}
    this.events.off('shutdown',this.disposeHospital,this);this.events.off('destroy',this.disposeHospital,this);
  }
}
