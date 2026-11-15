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
import {preloadDocumentSfx,playDocumentSfx} from './archive/DocumentSfx.js';
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
  preload(){
    for(const asset of [...Object.values(POST_OFFICE_ART),...Object.values(POSTAL_EVIDENCE_ART),...Object.values(NAV)])if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);
    preloadDocumentSfx(this,['paper','page','click']);
  }
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
  postalDocumentSfx(name){
    if(this.exiting||this.editor?.enabled)return;
    try{playDocumentSfx(this,name,name==='click'?0.15:0.25);}
    catch(error){console.debug('[PostOfficeScene] Document audio unavailable:',error);}
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
    else this.visuals.add(this.add.text(20,top+20,'Image not loaded:\n'+(art?.url||'unknown asset'),this.style(18)));
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
      this.addButton(14,h-40,'[ READ TRANSCRIPT ]',()=>this.readTranscript(),16);
    }
    this.addButton(w-14,h-40,'[ HINT ]',()=>this.openHints(),16,1);
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
  changeView(view){
    const changed=this.view!==view||this.documentId!==null;
    this.closeModal();this.view=view;this.documentId=null;this.renderView();
    if(changed)this.postalDocumentSfx('click');
  }
  clearHover(){this.tooltip?.setVisible(false);}
  openDocument(id){
    if(!canViewPostalDocument(id))return this.info('RETURN TO SENDER','This document is not available at this stage.');
    const previousView=this.view,previousId=this.documentId;
    this.closeModal();if(this.view!=='document')this.documentOrigin=this.view;
    this.view='document';this.documentId=id;this.renderView();
    if(previousView!=='document'||previousId!==id)this.postalDocumentSfx(previousView==='document'?'page':'paper');
  }
  closeDocument(){
    const changed=this.view==='document';
    this.closeModal();this.view=this.documentOrigin==='restante'?'restante':'room';this.documentId=null;this.renderView();
    if(changed)this.postalDocumentSfx('click');
  }
  readTranscript(){
    const doc=this.documents[this.documentId];
    const before=this.modal;
    this.panel(doc.title,doc.overlay?.text||'Choose a detail to read it.',doc.spots.map(spot=>[spot.label,()=>this.inspectDocumentSpot(spot.id)]));
    if(this.modal&&this.modal!==before)this.postalDocumentSfx('paper');
  }
  inspectDocumentSpot(spotId){
    const result=inspectPostalDetail(this.documentId,spotId);syncPostalNotebook();
    const doc=this.documents[this.documentId];
    this.panel(doc.title,result.text+(result.complete&&doc.clue?'\n\nAll details inspected. Evidence recorded in your case notes.':''),
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
      if(event.code==='Escape'&&this.editor.enabled)this.editor.toggle();
      return;
    }
    if(event.code==='Escape'){event.preventDefault();if(this.modal)this.closeModal();else if(this.view==='room')void this.leave();else this.goBack();}
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
    if(action==='return'||action==='service')return this.talk('“Ding. Yes, that is the full extent of the bell’s investigative powers. How can I help?”');
    if(action==='restante')return this.changeView('restante');
    if(action==='notice')return this.openDocument('notice');
    if(action==='collect')return this.collectReply();
    if(['write','deposit'].includes(action))return this.correspondence();
    if(action==='route')return this.info('DELIVERY ROUTE','Private courier deliveries are not part of the local postal round. Ask the postman about a specific delivery.');
    if(action==='parcels')return this.info('UNDELIVERED PARCELS','“FRAGILE” on every side. The contents have better legal protection than I do.');
    if(action==='policy')return this.info('POSTAL POLICY','No name. No problem. No refunds. A remarkably complete business plan.');
  }
  collectReply(){
    if(canViewPostalDocument('reply'))return this.openDocument('reply');
    const message=Postal.collectPostalReply();syncPostalNotebook();
    if(canViewPostalDocument('reply')){syncPostalEvidenceImages();return this.openDocument('reply');}
    this.info('POSTE RESTANTE',message);
  }
  talk(message='“I don’t read people’s mail. I judge them by the envelopes.”'){
    const choices=[['Returning letter',()=>this.caseMenu()],['Poste restante',()=>this.changeView('restante')]];
    if(canDiscussPostalDeadMail())choices.push(['Dead Mail / Florence',()=>this.deadMail()]);
    this.panel('POSTMAN',message,choices,true);
  }
  deadMail(message='“Florence Finch? Yes, I can discuss our service. A private courier’s business is another matter. Show me what you have.”'){
    this.panel('POSTMAN',message,[...['photo','route','gate'].map((id,i)=>[['Delivery photo','Your route','Service Gate B'][i],()=>this.deadMail(discussPostalDeadMail(id))]),['Other matters',()=>this.talk()]],true);
  }
  caseMenu(message=''){
    syncPostalNotebook();const record=Postal.postalState().returnCase,choices=[];let text=message;
    if(record.stage==='new'){
      text=text||'“Three addresses, four returns. The last forwarding address is your office. You may inspect the envelope. The seal stays intact.”';
      choices.push(['Accept case',()=>{Postal.startReturnCase();syncPostalNotebook();this.openDocument('envelope');}]);
    }else{
      text=text||'“What would you like to follow up on?”';
      choices.push(['Examine the envelope',()=>this.openDocument('envelope')]);
      if(record.clues.includes('envelope'))choices.push(['Ask about forwarding permission',()=>this.openDocument('card')]);
      if(record.clues.includes('notice'))choices.push(['Review the public notice',()=>this.openDocument('notice')]);
      if(record.stage==='investigating'&&record.clues.length===3)choices.push(['Identify recipient',()=>this.deduction()]);
      if(['identified','waiting'].includes(record.stage))choices.push(['Poste restante',()=>this.changeView('restante')]);
      if(record.stage==='waiting')choices.push(['Check reply',()=>this.collectReply()]);
      if(record.stage==='reply'){
        text=message||'Ellis asks you to leave the sealed letter for CLOCKWORK and keep his new name private.';
        choices.push(['Read Ellis’s reply',()=>this.openDocument('reply')],['Keep name private (+2 integrity)',()=>this.finishCase('private')],['Disclose name (-2 integrity)',()=>this.finishCase('disclose')]);
      }
      if(record.stage==='completed'){
        text=message||'Case closed. Base reward: 80 cash and 100 points. Your decision is recorded in your case notes.';
        choices.push(['Read reply',()=>this.openDocument('reply')],['Postal commendation',()=>this.openDocument('reward')]);
      }
    }
    choices.push(['Other matters',()=>this.talk()]);this.panel('POSTMAN',text,choices,true);
  }
  finishCase(choice){
    const message=finishPostalCase(choice);syncPostalNotebook();
    if(Postal.postalState().returnCase.stage==='completed'){
      syncPostalEvidenceImages();this.openDocument('reward');
      this.panel('CASE CLOSED',choice==='private'
        ? 'Delivered. Eventually.\n\nBase reward: 80 cash + 100 points.\nIntegrity +2: Ellis’s new name remains private.'
        : 'Delivered. Eventually.\n\nBase reward: 80 cash + 100 points.\nIntegrity -2: Ellis’s new name was disclosed despite his request.');
    }else this.caseMenu(message);
  }
  deduction(message='Which interpretation connects all three authorised sources?'){
    this.panel('RETURN TO SENDER',message,[['Ellis Bell / A. Reed',()=>this.caseMenu(Postal.identifyRecipient('ellis'))],['The PI office',()=>this.deduction(Postal.identifyRecipient('office'))],['CLOCKWORK is a home',()=>this.deduction(Postal.identifyRecipient('address'))],['Review evidence',()=>this.caseMenu()]]);
  }
  correspondence(message=''){
    const record=Postal.postalState().returnCase;
    if(!['identified','waiting','reply','completed'].includes(record.stage))return this.info('POSTE RESTANTE','Establish the intended recipient from the envelope and authorised records first.');
    const choices=[];
    if(record.stage==='identified'){
      for(const password of ['SECOND HAND','OPEN SESAME','DEAD LETTER'])choices.push([password,()=>this.correspondence(Postal.leavePostalMessage('CLOCKWORK',password,'A sealed letter addressed to your former trading name has reached the PI office. Please confirm how you wish to receive it.'))]);
    }else choices.push(['Check reply',()=>this.collectReply()],['Review case',()=>this.caseMenu()]);
    this.panel('CLOCKWORK',message||'Select the contact password. Hint: old clocks can have a second life.',choices);
  }
  openHints(){
    const count=hintManager.getAvailableCount();const choices=[];
    if(count>0)choices.push([`USE FREE HINT (${count})`,()=>this.applyHint('free_hint')]);
    if(!postalHintUsed('squad_help'))choices.push(['ASK FOR AUTHORISED HELP (+1 integrity)',()=>this.applyHint('squad_help')]);
    if(!postalHintUsed('cut_corners'))choices.push(['PEEK AT PRIVATE RECORDS (-1 integrity)',()=>this.applyHint('cut_corners')]);
    this.panel('A LITTLE HELP?',`Free hints available: ${count}.\n\nFree hints use your shared supply. Authorised help and private-record access can each be used once for this case. No money, time or energy cost. A hint points to one next step; it does not collect evidence.`,choices);
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
    try{const opened=await this.goto('HomeCityScene',{entryPoint:'post-office'});if(opened===false&&!this._cleanupDone){this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');}}
    catch(error){console.error('[PostOfficeScene] Exit failed:',error);if(!this._cleanupDone){this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');}}
  }
}
