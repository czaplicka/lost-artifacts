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
    this.text(690,65,'ARCHIVE / FOLLOW-UP RECORDS',22,1100,'#ffe2ae',this.root,'PressStart2P');
    this.button(1260,65,'CLOSE / ESC',()=>this.closeVisit(),this.root);
    this.content=this.add.container(0,0);this.root.add(this.content);
    this.footer=this.text(720,965,'',19,1300,'#ffe2ae',this.root);
    this.view=!this.allowed?'locked':this.progress.verified?'summary':!this.progress.offered?'intro':allFollowupRead(DATA,this.progress)&&this.progress.discussionLine>0?'discussion':'menu';
    this.render();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',event=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.code==='Escape'){event.preventDefault();this.closeVisit();return;}
      if(['Space','Enter','NumpadEnter'].includes(event.code)&&['intro','discussion'].includes(this.view)&&this.time.now>=this.inputLockedUntil){event.preventDefault();this.inputLockedUntil=this.time.now+180;this.advance();}
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
    this.footer.setText(result.success?(result.saved?'Reading progress saved.':DATA.messages.saveFailed):'Story requirements changed. No progress was committed.');
  }
  render(){
    this.content.removeAll(true);this.footer.setText(this.preview?'PREVIEW / no story changes, no score or resource costs':this.savedOk===false?DATA.messages.saveFailed:'Reading is free. A document is recorded only after MARK AS READ.');
    if(this.view==='locked'){this.text(720,470,'Finish the confrontation with Gordon before requesting this follow-up.',30);return;}
    if(this.view==='intro'){
      this.text(720,230,'FRANK DREBIN',29,1100,'#635132');this.text(720,470,DATA.intro[this.progress.introLine],31);
      this.button(720,790,this.progress.introLine===DATA.intro.length-1?'EXAMINE THE RECORDS':'CONTINUE',()=>this.advance());return;
    }
    if(this.view==='menu'){
      this.text(720,195,'ONE INCIDENT / THREE REGISTRATIONS',29);
      DATA.documents.forEach((doc,index)=>this.button(720,325+index*115,`${this.progress.read.includes(doc.id)?'[READ] ':'[NEW] '}${doc.reference} / ${doc.title}`,()=>{this.selectedDocument=doc.id;this.view='document';this.render();}));
      if(allFollowupRead(DATA,this.progress))this.button(720,755,'DISCUSS FINDINGS WITH DREBIN',()=>{this.view='discussion';this.render();});
      else this.text(720,780,'Read and acknowledge all three records before drawing a conclusion.',23);return;
    }
    if(this.view==='document'){
      const doc=DATA.documents.find(doc=>doc.id===this.selectedDocument);
      this.text(720,185,`${doc.reference} / ${doc.title}`,28);
      this.text(720,490,doc.text,25,1160);this.button(480,825,'BACK / DO NOT MARK',()=>{this.view='menu';this.render();});
      this.button(960,825,'MARK AS READ',()=>{this.progress=acknowledgeFollowupDocument(DATA,this.progress,doc.id);this.persist();this.view='menu';this.render();});return;
    }
    if(this.view==='discussion'){
      this.text(720,230,'FRANK DREBIN',29,1100,'#635132');this.text(720,470,DATA.discussion[this.progress.discussionLine],31);
      this.button(720,790,this.progress.discussionLine===DATA.discussion.length-1?'RECORD FINDINGS':'CONTINUE',()=>this.advance());return;
    }
    this.text(720,215,'CROSS-REFERENCE VERIFIED',30);
    this.text(720,460,'The wreckage was located later.\nJohn\'s body and the artifact were not recovered.\nThe technical examination established sabotage.\n\nNeither survival nor the saboteur\'s identity is established.',29);
    this.text(720,690,DATA.objective,25,1160);this.button(720,820,'RETURN TO ARCHIVE',()=>this.closeVisit());
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
