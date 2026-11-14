import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import * as Postal from '../managers/PostOfficeManager.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { POST_OFFICE_ART, POST_OFFICE_HOTSPOTS } from '../config/postOfficeConfig.js';
import { POSTAL_EVIDENCE_ART, POSTAL_DOCUMENTS } from '../config/postOfficeEvidenceConfig.js';
import {replyIsWaiting,canViewPostalDocument,inspectPostalDetail,syncPostalEvidenceImages} from '../managers/PostOfficeEvidence.js';
import {syncPostalNotebook} from '../managers/PostOfficeNotebook.js';
import {PostalHotspotEditor} from '../ui/PostalHotspotEditor.js';
import {hintManager} from '../managers/HintManager.js';
import {installPostalAchievement,settlePostalCase,finishPostalCase,postalHintUsed,usePostalHint,canDiscussPostalDeadMail,discussPostalDeadMail} from '../managers/PostalCaseSupport.js';
const clone=v=>JSON.parse(JSON.stringify(v));
const NAV={back:{key:'back',url:'assets/buttons/back.webp'},exit:{key:'btnExit',url:'assets/buttons/exit.webp'}};

export class PostOfficeScene extends BaseScene {
  constructor(){super({key:'PostOfficeScene'});}
  init(){
    this.view='room';this.documentId=null;this.documentOrigin='room';this.exiting=false;
    this.config=clone(POST_OFFICE_HOTSPOTS);this.documents=clone(POSTAL_DOCUMENTS);
    this.hotspots=[];this.modal=null;this.dialogue=null;this.visuals=null;this.tooltip=null;
    this.editor=null;this.hintTarget=null;this.hintTimer=null;this.hintBusy=false;
  }
  preload(){for(const asset of [...Object.values(POST_OFFICE_ART),...Object.values(POSTAL_EVIDENCE_ART),...Object.values(NAV)])if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);}
  create(){
    super.create();this.registry.set('currentSceneKey','PostOfficeScene');
    installPostalAchievement();Postal.visitPostOffice();settlePostalCase();syncPostalEvidenceImages();syncPostalNotebook();
    this.cameras.main.setBackgroundColor('#181b18');
    this.dialogue=new HomeTownDialogue(this,()=>{this.modal=null;this.clearHover();syncPostalNotebook();});
    this.editor=new PostalHotspotEditor(this);
    this.trackInputEvent(this.scale,'resize',this.resizeView);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    this.renderView();
    this.events.once('shutdown',()=>{
      this.hintTimer?.remove(false);this.editor?.destroy();this.editor=null;
      this.dialogue?.destroy();this.dialogue=null;this.modal=null;this.hotspots=[];this.visuals=null;this.tooltip=null;
    });
  }
  style(size=21){return{fontFamily:'SpecialElite, monospace',fontSize:size,color:'#fff1ce',backgroundColor:'#22251f',padding:{x:9,y:7},wordWrap:{width:Math.max(100,this.scale.width-64)}};}
  spots(){return this.view==='document'?this.documents[this.documentId]?.spots||[]:this.config[this.view]||[];}
  artwork(){if(this.view==='document')return POSTAL_EVIDENCE_ART[this.documentId];if(this.view==='restante')return replyIsWaiting()?POST_OFFICE_ART.restante:POSTAL_EVIDENCE_ART.restanteEmpty;return POST_OFFICE_ART.room;}
  renderView(){
    this.visuals?.destroy(true);this.visuals=this.add.container(0,0);this.hotspots=[];
    const{width:w,height:h}=this.scale,doc=this.view==='document';
    const navHeight=Math.min(64,Math.max(36,h*.075)),top=doc?navHeight+12:0,bottom=doc?42:0;
    this.fit={s:Math.min(w/1920,Math.max(1,h-top-bottom)/1080),x:0,y:0};
    this.fit.x=(w-1920*this.fit.s)/2;this.fit.y=top+(h-top-bottom-1080*this.fit.s)/2;
    const art=this.artwork();let key=art?.key;
    if(!this.textures.exists(key)&&this.view==='room'&&this.textures.exists(POST_OFFICE_ART.empty.key))key=POST_OFFICE_ART.empty.key;
    const missing=!key||!this.textures.exists(key);
    if(!missing)this.visuals.add(this.add.image(this.fit.x,this.fit.y,key).setOrigin(0).setDisplaySize(1920*this.fit.s,1080*this.fit.s));
    else this.visuals.add(this.add.text(20,top+20,__dialogueText("scenes/PostOfficeScene.js", "t_c54ad1bbc1e09689f9e7")+(art?.url||__dialogueText("scenes/PostOfficeScene.js", "t_77d8435a38c1f74d60f0")),this.style(18)));
    this.tooltip=this.add.text(15,h-42,'',this.style(17)).setVisible(false);this.visuals.add(this.tooltip);
    this.spots().forEach((cfg,index)=>this.makeHotspot(cfg,index));
    if(doc){
      const titleX=28+w*.20;
      const title=this.add.text(titleX,12,this.documents[this.documentId].title,{
        ...this.style(17),wordWrap:{width:Math.max(20,w*.55-titleX-18)}
      });
      while(title.height>navHeight&&parseInt(title.style.fontSize)>8)title.setFontSize(parseInt(title.style.fontSize)-1);
      this.visuals.add(title);
      const overlay=this.documents[this.documentId].overlay;
      if(overlay&&!missing){
        const{s,x,y}=this.fit;
        const text=this.add.text(x+overlay.x*s,y+overlay.y*s,overlay.text,{fontFamily:'SpecialElite, monospace',fontSize:Math.max(8,27*s),color:'#302923',lineSpacing:3*s,wordWrap:{width:overlay.w*s}});
        while(text.height>overlay.h*s&&parseInt(text.style.fontSize)>7)text.setFontSize(parseInt(text.style.fontSize)-1);
        this.visuals.add(text);
      }
      this.addButton(14,h-40,__dialogueText("scenes/PostOfficeScene.js", "t_5846a5f11aa1614da230"),()=>this.readTranscript(),16);
    }
    this.addButton(w-14,h-40,__dialogueText("scenes/PostOfficeScene.js", "t_1d2748c1af57746f1812"),()=>this.openHints(),16,1);
    if(this.view!=='room')this.addNavigationButton(w-28-w*.22,12,NAV.back,()=>this.goBack(),navHeight);
    this.addNavigationButton(14,12,NAV.exit,()=>void this.leave(),navHeight,0);
    this.drawHintMarker();this.editor?.build();
  }
  addNavigationButton(x,y,asset,action,height,origin=1){
    if(!this.textures.exists(asset.key))return this.addButton(x,y,asset===NAV.back?'BACK':'EXIT',action,18,origin);
    const image=this.add.image(x,y,asset.key).setOrigin(origin,0);image.setScale(Math.min(height/image.height,(this.scale.width*.20)/image.width)).setInteractive({useHandCursor:true});
    image.on('pointerdown',()=>{if(!this.modal&&!this.exiting&&!this.editor?.enabled)action();});this.visuals.add(image);return image;
  }
  addButton(x,y,label,fn,size=18,origin=0){
    const text=this.add.text(x,y,label,this.style(size)).setOrigin(origin,0).setInteractive({useHandCursor:true});
    text.on('pointerdown',()=>{if(!this.modal&&!this.exiting&&!this.editor?.enabled)fn();});this.visuals.add(text);return text;
  }
  resizeView(){if(this.editor)this.editor.drag=null;this.renderView();this.modal=this.dialogue?.root||null;}
  goBack(){if(this.view==='document')this.closeDocument();else if(this.view==='restante')this.changeView('room');}
  changeView(view){this.closeModal();this.view=view;this.documentId=null;this.renderView();}
  clearHover(){this.tooltip?.setVisible(false);}
  openDocument(id){
    if(!canViewPostalDocument(id))return this.info(__dialogueText("scenes/PostOfficeScene.js", "t_ce246efc0e53c6412f7a"),__dialogueText("scenes/PostOfficeScene.js", "t_64629d348541da73cdeb"));
    this.closeModal();if(this.view!=='document')this.documentOrigin=this.view;
    this.view='document';this.documentId=id;this.renderView();
  }
  closeDocument(){this.closeModal();this.view=this.documentOrigin==='restante'?'restante':'room';this.documentId=null;this.renderView();}
  readTranscript(){
    const doc=this.documents[this.documentId];
    this.panel(doc.title,doc.overlay?.text||__dialogueText("scenes/PostOfficeScene.js", "t_9e237f22c4b775f0bd45"),doc.spots.map(spot=>[spot.label,()=>this.inspectDocumentSpot(spot.id)]));
  }
  inspectDocumentSpot(spotId){
    const result=inspectPostalDetail(this.documentId,spotId);syncPostalNotebook();
    const doc=this.documents[this.documentId];
    this.panel(doc.title,result.text+(result.complete&&doc.clue?__dialogueText("scenes/PostOfficeScene.js", "t_d92fdbb55497c176918c"):''),
      doc.spots.filter(spot=>spot.id!==spotId).map(spot=>[spot.label,()=>this.inspectDocumentSpot(spot.id)]));
  }
  makeHotspot(cfg,index){
    const{s,x,y}=this.fit;
    const zone=this.add.zone(x+cfg.x*s,y+cfg.y*s,cfg.w*s,cfg.h*s).setInteractive({useHandCursor:true});
    this.hotspots.push({cfg,index,zone});this.visuals.add(zone);
    zone.on('pointerover',()=>{if(!this.modal&&!this.exiting&&!this.editor?.enabled)this.tooltip.setText(cfg.label).setVisible(true);});
    zone.on('pointerout',()=>this.tooltip?.setVisible(false));
    zone.on('pointerdown',()=>{if(this.modal||this.exiting||this.editor?.enabled)return;if(this.view==='document')this.inspectDocumentSpot(cfg.id);else this.dispatch(cfg.action);});
  }
  onKey(event){
    if(event.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    if(this.editor?.key(event)){
      if(event.code===__dialogueText("scenes/PostOfficeScene.js", "t_037c968467aa3fd7c059")&&this.editor.enabled)this.editor.toggle();
      return;
    }
    if(event.code===__dialogueText("scenes/PostOfficeScene.js", "t_037c968467aa3fd7c059")){event.preventDefault();if(this.modal)this.closeModal();else if(this.view==='room')void this.leave();else this.goBack();}
  }
  closeModal(){this.dialogue?.close(false);this.modal=null;this.clearHover();}
  panel(title,text,choices=[],portrait=false){
    if(this.exiting)return;syncPostalNotebook();this.clearHover();
    this.modal=this.dialogue.show({title,text,choices,portrait:portrait?POST_OFFICE_ART.portrait.key:null});
  }
  info(title,text){this.panel(title,text);}
  dispatch(action){
    if(this.modal||this.exiting)return;
    if(action==='talk')return this.talk();
    if(action==='return'||action==='service')return this.talk(__dialogueText("scenes/PostOfficeScene.js", "t_b89122a79e83317ac2aa"));
    if(action==='restante')return this.changeView('restante');
    if(action==='notice')return this.openDocument('notice');
    if(action==='collect')return this.collectReply();
    if(['write','deposit'].includes(action))return this.correspondence();
    if(action==='route')return this.info(__dialogueText("scenes/PostOfficeScene.js", "t_c4044fad6c65500b9378"),__dialogueText("scenes/PostOfficeScene.js", "t_6a693eeda8cec77ae9e7"));
    if(action==='parcels')return this.info(__dialogueText("scenes/PostOfficeScene.js", "t_e48a8adb8d97406658af"),__dialogueText("scenes/PostOfficeScene.js", "t_1f50add92d063e046037"));
    if(action==='policy')return this.info(__dialogueText("scenes/PostOfficeScene.js", "t_a93f84f82992ddbdc19c"),__dialogueText("scenes/PostOfficeScene.js", "t_b74da47eeaa7ab2c48b3"));
  }
  collectReply(){
    if(canViewPostalDocument('reply'))return this.openDocument('reply');
    const message=Postal.collectPostalReply();syncPostalNotebook();
    if(canViewPostalDocument('reply')){syncPostalEvidenceImages();return this.openDocument('reply');}
    this.info(__dialogueText("scenes/PostOfficeScene.js", "t_9a1d4939c221991f52c6"),message);
  }
  talk(message=__dialogueText("scenes/PostOfficeScene.js", "t_db76acbe114fdff17f40")){
    const choices=[[__dialogueText("scenes/PostOfficeScene.js", "t_be792a0cb80d0c412e1c"),()=>this.caseMenu()],[__dialogueText("scenes/PostOfficeScene.js", "t_88aac9b0c74879698739"),()=>this.changeView('restante')]];
    if(canDiscussPostalDeadMail())choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_9faf1fd5294f364aa146"),()=>this.deadMail()]);
    this.panel('POSTMAN',message,choices,true);
  }
  deadMail(message=__dialogueText("scenes/PostOfficeScene.js", "t_e136c088138b947cf0b4")){
    this.panel('POSTMAN',message,[...['photo','route','gate'].map((id,i)=>[[__dialogueText("scenes/PostOfficeScene.js", "t_0293a4db8164d160e2ac"),__dialogueText("scenes/PostOfficeScene.js", "t_fdd85b70187dc8f62c41"),__dialogueText("scenes/PostOfficeScene.js", "t_6d140c2d564f9d1ffc76")][i],()=>this.deadMail(discussPostalDeadMail(id))]),[__dialogueText("scenes/PostOfficeScene.js", "t_64646486e814dc4b26d0"),()=>this.talk()]],true);
  }
  caseMenu(message=''){
    syncPostalNotebook();const record=Postal.postalState().returnCase,choices=[];let text=message;
    if(record.stage==='new'){
      text=text||__dialogueText("scenes/PostOfficeScene.js", "t_c2238db299edbd397c5a");
      choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_a178b6a78bdc3d07591a"),()=>{Postal.startReturnCase();syncPostalNotebook();this.openDocument('envelope');}]);
    }else{
      text=text||__dialogueText("scenes/PostOfficeScene.js", "t_823b0147968cc2638c4e");
      choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_c4f6cd042b4b6134593d"),()=>this.openDocument('envelope')]);
      if(record.clues.includes('envelope'))choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_a54b5da880bf890aec79"),()=>this.openDocument('card')]);
      if(record.clues.includes('notice'))choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_b103ce6128ade2838e13"),()=>this.openDocument('notice')]);
      if(record.stage==='investigating'&&record.clues.length===3)choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_76fa4b064aed8af78ad6"),()=>this.deduction()]);
      if(['identified','waiting'].includes(record.stage))choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_88aac9b0c74879698739"),()=>this.changeView('restante')]);
      if(record.stage==='waiting')choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_8fec81657ba8ebc8cf65"),()=>this.collectReply()]);
      if(record.stage==='reply'){
        text=message||__dialogueText("scenes/PostOfficeScene.js", "t_857b1a3ae0869e513e16");
        choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_2f867370392b000ec90d"),()=>this.openDocument('reply')],[__dialogueText("scenes/PostOfficeScene.js", "t_0590ec81ed567e85b375"),()=>this.finishCase('private')],[__dialogueText("scenes/PostOfficeScene.js", "t_03e78342efe8e7f3d6fa"),()=>this.finishCase('disclose')]);
      }
      if(record.stage==='completed'){
        text=message||__dialogueText("scenes/PostOfficeScene.js", "t_c7d8bcba8ba671730645");
        choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_fd2dbead2126d9634247"),()=>this.openDocument('reply')],[__dialogueText("scenes/PostOfficeScene.js", "t_982e6df090ccce717f2b"),()=>this.openDocument('reward')]);
      }
    }
    choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_64646486e814dc4b26d0"),()=>this.talk()]);this.panel('POSTMAN',text,choices,true);
  }
  finishCase(choice){
    const message=finishPostalCase(choice);syncPostalNotebook();
    if(Postal.postalState().returnCase.stage==='completed'){
      syncPostalEvidenceImages();this.openDocument('reward');
      this.panel(__dialogueText("scenes/PostOfficeScene.js", "t_3825cb7a28815e93b278"),choice==='private'
        ? __dialogueText("scenes/PostOfficeScene.js", "t_1c83f8bd40ca0ea6b75c")
        : __dialogueText("scenes/PostOfficeScene.js", "t_0ef31a7034b573d28ff5"));
    }else this.caseMenu(message);
  }
  deduction(message=__dialogueText("scenes/PostOfficeScene.js", "t_b25bb0bf239399c0d85b")){
    this.panel(__dialogueText("scenes/PostOfficeScene.js", "t_ce246efc0e53c6412f7a"),message,[[__dialogueText("scenes/PostOfficeScene.js", "t_c24a897eb2aeb610497f"),()=>this.caseMenu(Postal.identifyRecipient('ellis'))],[__dialogueText("scenes/PostOfficeScene.js", "t_4cae2e618eac4b894dc7"),()=>this.deduction(Postal.identifyRecipient('office'))],[__dialogueText("scenes/PostOfficeScene.js", "t_9b4044ed4336171eb6e0"),()=>this.deduction(Postal.identifyRecipient('address'))],[__dialogueText("scenes/PostOfficeScene.js", "t_5e068aeb73ef51893182"),()=>this.caseMenu()]]);
  }
  correspondence(message=''){
    const record=Postal.postalState().returnCase;
    if(!['identified','waiting','reply','completed'].includes(record.stage))return this.info(__dialogueText("scenes/PostOfficeScene.js", "t_9a1d4939c221991f52c6"),__dialogueText("scenes/PostOfficeScene.js", "t_107e1811a00e9dc1de58"));
    const choices=[];
    if(record.stage==='identified'){
      for(const password of [__dialogueText("scenes/PostOfficeScene.js", "t_9e3ce8d3f0616285504a"),__dialogueText("scenes/PostOfficeScene.js", "t_6278571567bd45616c6f"),__dialogueText("scenes/PostOfficeScene.js", "t_91f18fe806b2ef031916")])choices.push([password,()=>this.correspondence(Postal.leavePostalMessage('CLOCKWORK',password,__dialogueText("scenes/PostOfficeScene.js", "t_0ff04e715864d063e90d")))]);
    }else choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_8fec81657ba8ebc8cf65"),()=>this.collectReply()],[__dialogueText("scenes/PostOfficeScene.js", "t_1bf27bd9b754f9fc3a0d"),()=>this.caseMenu()]);
    this.panel('CLOCKWORK',message||__dialogueText("scenes/PostOfficeScene.js", "t_40bb39ed39768ef9da42"),choices);
  }
  openHints(){
    const count=hintManager.getAvailableCount();const choices=[];
    if(count>0)choices.push([`${__dialogueText("scenes/PostOfficeScene.js", "t_9aa56441d1dbebae2beb")}${count}${__dialogueText("scenes/PostOfficeScene.js", "t_ba5ec51d07a4ac0e9516")}`,()=>this.applyHint('free_hint')]);
    if(!postalHintUsed('squad_help'))choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_f785c58379cdf7bbac98"),()=>this.applyHint('squad_help')]);
    if(!postalHintUsed('cut_corners'))choices.push([__dialogueText("scenes/PostOfficeScene.js", "t_e5e9328332c5f8fa4907"),()=>this.applyHint('cut_corners')]);
    this.panel(__dialogueText("scenes/PostOfficeScene.js", "t_a5662670f19aa35c92d6"),`${__dialogueText("scenes/PostOfficeScene.js", "t_10e799b95ced0c089ce0")}${count}${__dialogueText("scenes/PostOfficeScene.js", "t_e6e749fdc44ba05e893a")}`,choices);
  }
  applyHint(method){
    if(this.hintBusy)return;this.hintBusy=true;
    try{
      const result=usePostalHint(method);
      if(result.success){
        this.hintTarget=result.target;
        this.hintTimer?.remove(false);
        this.hintTimer=this.time.delayedCall(20000,()=>{this.hintTarget=null;if(!this._cleanupDone)this.renderView();});
        this.renderView();
      }
      this.panel('HINT',result.text);
    }finally{this.hintBusy=false;}
  }
  drawHintMarker(){
    const t=this.hintTarget;if(!t||t.view!==this.view||(t.view==='document'&&t.documentId!==this.documentId))return;
    const cfg=this.spots().find(p=>p.id===t.id);if(!cfg)return;
    const{s,x,y}=this.fit;
    this.visuals.add(this.add.rectangle(x+cfg.x*s,y+cfg.y*s,cfg.w*s,cfg.h*s,0x89b94e,.1).setStrokeStyle(3,0xb9ec70));
  }
  async leave(){
    if(this.modal||this.exiting)return;this.exiting=true;syncPostalNotebook();
    try{const opened=await this.goto('HomeCityScene',{entryPoint:'post-office'});if(opened===false&&!this._cleanupDone){this.exiting=false;this.info('EXIT',__dialogueText("scenes/PostOfficeScene.js", "t_e02a1ccf9b3526681918"));}}
    catch(error){console.error('[PostOfficeScene] Exit failed:',error);if(!this._cleanupDone){this.exiting=false;this.info('EXIT',__dialogueText("scenes/PostOfficeScene.js", "t_e02a1ccf9b3526681918"));}}
  }
}
