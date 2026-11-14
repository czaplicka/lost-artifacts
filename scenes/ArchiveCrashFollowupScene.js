import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { crashFollowupData as DATA,getCrashFollowupStory,storeCrashFollowup } from '../archiveCrashFollowupService.js';
import { normalizeFollowup,allFollowupRead,advanceFollowupIntro,acknowledgeFollowupDocument,advanceFollowupDiscussion } from './archive/CrashFollowupModel.js';
export class ArchiveCrashFollowupScene extends BaseScene{
  constructor(){super({key:'ArchiveCrashFollowupScene'});}
  init(data={}){
    this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;
    this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;
    this.progress=null;this.view='intro';this.selectedDocument=null;this.closing=false;this.inputLockedUntil=0;
    this.savedOk=null;this.layerStates=[];this.parentPausedByMe=false;
  }
  create(){
    super.create();this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    const story=getCrashFollowupStory();this.allowed=this.preview||story.eligible;
    this.progress=normalizeFollowup(DATA,this.preview?null:story);
    this.root=this.add.container(0,0);this.root.add(this.add.rectangle(720,500,1440,1000,0x000000,0.82).setInteractive());
    this.root.add(this.add.rectangle(720,500,1320,780,0xeee2c4).setStrokeStyle(4,0xa28a56));
    this.text(690,65,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_2cf0c88991621323d1aa"),22,1100,'#ffe2ae',this.root,'PressStart2P');
    this.button(1260,65,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_01244bcb87769b89d93f"),()=>this.closeVisit(),this.root);
    this.content=this.add.container(0,0);this.root.add(this.content);
    this.footer=this.text(720,965,'',19,1300,'#ffe2ae',this.root);
    this.view=!this.allowed?'locked':this.progress.verified?'summary':!this.progress.offered?'intro':allFollowupRead(DATA,this.progress)&&this.progress.discussionLine>0?'discussion':'menu';
    this.render();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',event=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.code===__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_037c968467aa3fd7c059")){event.preventDefault();this.closeVisit();return;}
      if([__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_20eac5aae274985fd886"),__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_dc8659db6d416dc32fca"),'NumpadEnter'].includes(event.code)&&['intro','discussion'].includes(this.view)&&this.time.now>=this.inputLockedUntil){event.preventDefault();this.inputLockedUntil=this.time.now+180;this.advance();}
    });
    this.suspendBackground();this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.restoreBackground();this.onFinished=null;});
  }
  text(x,y,value,size=27,width=1160,color='#342d23',parent=this.content,font='SpecialElite'){
    const object=this.add.text(x,y,value,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:7}).setOrigin(0.5);parent.add(object);return object;
  }
  button(x,y,label,callback,parent=this.content){
    const object=this.add.text(x,y,label,{fontFamily:'SpecialElite',fontSize:'24px',color:'#ffe2ae',backgroundColor:'#294331',padding:{x:20,y:12},align:'center'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    object.on('pointerdown',(p,localX,localY,event)=>{event?.stopPropagation();if(!this.closing&&this.time.now>=this.inputLockedUntil){this.inputLockedUntil=this.time.now+180;callback();}});parent.add(object);return object;
  }
  persist(){
    if(this.preview||!this.allowed)return;
    const result=storeCrashFollowup(this.progress);this.savedOk=result.saved;
    this.footer.setText(result.success?(result.saved?__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_ea11b0306f203799be81"):DATA.messages.saveFailed):__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_4df945541fa084b296ef"));
  }
  render(){
    this.content.removeAll(true);this.footer.setText(this.preview?__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_76c671c06fe86d039604"):this.savedOk===false?DATA.messages.saveFailed:__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_0e8489cf73d5d2873176"));
    if(this.view==='locked'){this.text(720,470,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_e73664b76f25684ba4b1"),30);return;}
    if(this.view==='intro'){
      this.text(720,230,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_a74fe164691ed886ba61"),29,1100,'#635132');this.text(720,470,DATA.intro[this.progress.introLine],31);
      this.button(720,790,this.progress.introLine===DATA.intro.length-1?__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_8dbd0d932670313c3729"):'CONTINUE',()=>this.advance());return;
    }
    if(this.view==='menu'){
      this.text(720,195,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_f4c92470e048c6091aa2"),29);
      DATA.documents.forEach((doc,index)=>this.button(720,325+index*115,`${this.progress.read.includes(doc.id)?__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_78c78dd961773adf990b"):__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_ea88f12f782defd87907")}${doc.reference} / ${doc.title}`,()=>{this.selectedDocument=doc.id;this.view='document';this.render();}));
      if(allFollowupRead(DATA,this.progress))this.button(720,755,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_81c5a9e1bc6f5ceb4621"),()=>{this.view='discussion';this.render();});
      else this.text(720,780,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_ab54526745eabc90adae"),23);return;
    }
    if(this.view==='document'){
      const doc=DATA.documents.find(doc=>doc.id===this.selectedDocument);
      this.text(720,185,`${doc.reference} / ${doc.title}`,28);
      this.text(720,490,doc.text,25,1160);this.button(480,825,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_72c3788f313c660da7a2"),()=>{this.view='menu';this.render();});
      this.button(960,825,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_b684630f23f6e03e7730"),()=>{this.progress=acknowledgeFollowupDocument(DATA,this.progress,doc.id);this.persist();this.view='menu';this.render();});return;
    }
    if(this.view==='discussion'){
      this.text(720,230,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_a74fe164691ed886ba61"),29,1100,'#635132');this.text(720,470,DATA.discussion[this.progress.discussionLine],31);
      this.button(720,790,this.progress.discussionLine===DATA.discussion.length-1?__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_e8088c12ac0235618d67"):'CONTINUE',()=>this.advance());return;
    }
    this.text(720,215,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_7f9c3c6f6cf2f295928b"),30);
    this.text(720,460,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_bc0a62d41b4b38f7cef3"),29);
    this.text(720,690,DATA.objective,25,1160);this.button(720,820,__dialogueText("scenes/ArchiveCrashFollowupScene.js", "t_23ed4bfb47639cd1866b"),()=>this.closeVisit());
  }
  advance(){
    if(!this.allowed)return;
    if(this.view==='intro'){this.progress=advanceFollowupIntro(DATA,this.progress);if(this.progress.offered)this.view='menu';}
    else if(this.view==='discussion'){this.progress=advanceFollowupDiscussion(DATA,this.progress);if(this.progress.verified)this.view='summary';}
    this.persist();this.render();
  }
  layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1440,height/1000);this.root.setScale(s).setPosition((width-1440*s)/2,(height-1000*s)/2);}
  suspendBackground(){
    this.layerStates=['PlayerHudScene','UIScene','NewsHud'].filter(key=>this.isSceneActive(key)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});
    if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPausedByMe=true;this.scene.pause(this.returnSceneKey);}
  }
  restoreBackground(){
    for(const{key,visible}of this.layerStates){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}
    this.layerStates=[];if(this.parentPausedByMe&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPausedByMe=false;
  }
  closeVisit(){
    if(this.closing)return;this.closing=true;this.persist();const callback=this.onFinished;this.onFinished=null;this.restoreBackground();
    try{callback?.({preview:this.preview,completed:this.allowed&&this.progress.verified,saved:this.savedOk});}finally{this.scene.stop();}
  }
}
