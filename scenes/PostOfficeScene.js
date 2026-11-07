import { BaseScene } from './BaseScene.js';
import * as Postal from '../managers/PostOfficeManager.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
import { POST_OFFICE_ART, POST_OFFICE_HOTSPOTS } from '../config/postOfficeConfig.js';
import { POSTAL_EVIDENCE_ART, POSTAL_DOCUMENTS } from '../config/postOfficeEvidenceConfig.js';
import {
  replyIsWaiting, canViewPostalDocument, inspectPostalDetail, syncPostalEvidenceImages
} from '../managers/PostOfficeEvidence.js';
import { syncPostalNotebook } from '../managers/PostOfficeNotebook.js';

const clone = value => JSON.parse(JSON.stringify(value));
const NAV = {
  back:{key:'back',url:'assets/buttons/back.webp'},
  exit:{key:'btnExit',url:'assets/buttons/exit.webp'}
};

export class PostOfficeScene extends BaseScene {
  constructor() { super({key:'PostOfficeScene'}); }

  init() {
    this.view='room';
    this.documentId=null;
    this.documentOrigin='room';
    this.exiting=false;
    this.config=clone(POST_OFFICE_HOTSPOTS);
    this.documents=clone(POSTAL_DOCUMENTS);
    this.hotspots=[];
    this.modal=null;
    this.dialogue=null;
    this.visuals=null;
    this.tooltip=null;
    this.showTranscription=true;
  }

  preload() {
    const art=[...Object.values(POST_OFFICE_ART),...Object.values(POSTAL_EVIDENCE_ART),...Object.values(NAV)];
    for (const asset of art) {
      if (!this.textures.exists(asset.key)) this.load.image(asset.key,asset.url);
    }
  }

  create() {
    super.create();
    this.registry.set('currentSceneKey','PostOfficeScene');
    Postal.visitPostOffice();
    syncPostalEvidenceImages();
    syncPostalNotebook();
    this.cameras.main.setBackgroundColor('#181b18');
    this.dialogue=new HomeTownDialogue(this,()=>{
      this.modal=null;
      this.clearHover();
      syncPostalNotebook();
    });
    this.trackInputEvent(this.scale,'resize',this.resizeView);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    this.renderView();
    this.events.once('shutdown',()=>{
      this.dialogue?.destroy();
      this.dialogue=null;
      this.modal=null;
      this.hotspots=[];
      this.visuals=null;
      this.tooltip=null;
    });
  }

  style(size=21) {
    return {
      fontFamily:'SpecialElite, monospace',fontSize:size,color:'#fff1ce',
      backgroundColor:'#22251f',padding:{x:9,y:7},
      wordWrap:{width:Math.max(100,this.scale.width-64)}
    };
  }

  spots() {
    return this.view==='document'
      ? this.documents[this.documentId]?.spots || []
      : this.config[this.view] || [];
  }

  artwork() {
    if (this.view==='document') return POSTAL_EVIDENCE_ART[this.documentId];
    if (this.view==='restante') return replyIsWaiting()
      ? POST_OFFICE_ART.restante : POSTAL_EVIDENCE_ART.restanteEmpty;
    return POST_OFFICE_ART.room;
  }

  renderView() {
    this.visuals?.destroy(true);
    this.visuals=this.add.container(0,0);
    this.hotspots=[];
    const {width:w,height:h}=this.scale;
    const doc=this.view==='document';
    const navHeight=Math.min(64,Math.max(36,h*.075));
    const top=doc ? navHeight+12 : 0;
    const bottom=doc ? 42 : 0;
    this.fit={s:Math.min(w/1920,Math.max(1,h-top-bottom)/1080),x:0,y:0};
    this.fit.x=(w-1920*this.fit.s)/2;
    this.fit.y=top+(h-top-bottom-1080*this.fit.s)/2;
    const art=this.artwork();
    let key=art?.key;
    if (!this.textures.exists(key) && this.view==='room' && this.textures.exists(POST_OFFICE_ART.empty.key)) {
      key=POST_OFFICE_ART.empty.key;
    }
    const missing=!key || !this.textures.exists(key);
    if (!missing) {
      this.visuals.add(this.add.image(this.fit.x,this.fit.y,key).setOrigin(0)
        .setDisplaySize(1920*this.fit.s,1080*this.fit.s));
    } else {
      this.visuals.add(this.add.text(20,top+20,
        'Image not loaded:\n'+(art?.url||'unknown asset')+'\nText and inspection controls remain available.',this.style(18)));
    }
    this.tooltip=this.add.text(15,h-42,'',this.style(17)).setVisible(false);
    this.visuals.add(this.tooltip);
    this.spots().forEach((cfg,index)=>this.makeHotspot(cfg,index));
    if (doc) {
      this.visuals.add(this.add.text(14,12,this.documents[this.documentId].title,{
        ...this.style(17),wordWrap:{width:Math.max(80,w*.5-24)}
      }));
      const overlay=this.documents[this.documentId].overlay;
      if (overlay && this.showTranscription && !missing) {
        const {s,x,y}=this.fit;
        const text=this.add.text(x+overlay.x*s,y+overlay.y*s,overlay.text,{
          fontFamily:'SpecialElite, monospace',fontSize:Math.max(8,27*s),color:'#302923',
          lineSpacing:3*s,wordWrap:{width:overlay.w*s}
        });
        while (text.height>overlay.h*s && parseInt(text.style.fontSize)>7) {
          text.setFontSize(parseInt(text.style.fontSize)-1);
        }
        this.visuals.add(text);
      }
      this.addButton(14,h-40,'[ READ TRANSCRIPT ]',()=>this.readTranscript(),16);
      this.addButton(w/2,h-40,'[ TEXT ON/OFF ]',()=>{
        this.showTranscription=!this.showTranscription;
        this.renderView();
      },15,.5);
    }
    if (this.view!=='room') {
      this.addNavigationButton(w-28-w*.22,12,NAV.back,()=>this.goBack(),navHeight);
    }
    this.addNavigationButton(w-14,12,NAV.exit,()=>void this.leave(),navHeight);
  }

  addNavigationButton(x,y,asset,action,height) {
    if (!this.textures.exists(asset.key)) {
      console.error('[PostOfficeScene] Missing navigation image:',asset.url);
      return this.addButton(x,y,asset===NAV.back?'BACK':'EXIT',action,18,1);
    }
    const image=this.add.image(x,y,asset.key).setOrigin(1,0);
    const scale=Math.min(height/image.height,(this.scale.width*.20)/image.width);
    image.setScale(scale).setInteractive({useHandCursor:true});
    image.on('pointerdown',()=>{
      if (!this.modal && !this.exiting) action();
    });
    this.visuals.add(image);
    return image;
  }

  addButton(x,y,label,fn,size=18,origin=0) {
    const text=this.add.text(x,y,label,this.style(size)).setOrigin(origin,0)
      .setInteractive({useHandCursor:true});
    text.on('pointerdown',()=>{if (!this.modal && !this.exiting) fn();});
    this.visuals.add(text);
    return text;
  }

  resizeView() { this.renderView(); this.modal=this.dialogue?.root||null; }
  goBack() {
    if (this.view==='document') this.closeDocument();
    else if (this.view==='restante') this.changeView('room');
  }
  changeView(view) {
    this.closeModal();this.view=view;this.documentId=null;this.renderView();
  }
  clearHover() { this.tooltip?.setVisible(false); }

  openDocument(id) {
    if (!canViewPostalDocument(id)) return this.info('RETURN TO SENDER','This document is not available at this stage.');
    this.closeModal();
    if (this.view!=='document') this.documentOrigin=this.view;
    this.view='document';this.documentId=id;this.renderView();
  }
  closeDocument() {
    this.closeModal();
    this.view=this.documentOrigin==='restante'?'restante':'room';
    this.documentId=null;this.renderView();
  }
  readTranscript() {
    const id=this.documentId,doc=this.documents[id];
    const text=id==='reply'
      ? 'Yes, A. Reed was my old trading name. I changed it after a business partnership ended. Please leave the sealed letter here for CLOCKWORK. Tell the sender I can receive a reply through this desk, but please do not pass on my new name. — Ellis Bell'
      : doc.spots.map(spot=>spot.text).join('\n\n');
    this.panel(doc.title,text,doc.spots.map(spot=>[spot.label,()=>this.inspectDocumentSpot(spot.id)]));
  }
  inspectDocumentSpot(spotId) {
    const result=inspectPostalDetail(this.documentId,spotId);
    syncPostalNotebook();
    const doc=this.documents[this.documentId];
    const text=result.text+(result.complete&&doc.clue
      ? '\n\nAll details inspected. Evidence recorded on the case board and in your case notes.' : '');
    this.panel(doc.title,text,doc.spots.filter(spot=>spot.id!==spotId)
      .map(spot=>[spot.label,()=>this.inspectDocumentSpot(spot.id)]));
  }

  makeHotspot(cfg,index) {
    const {s,x,y}=this.fit;
    const zone=this.add.zone(x+cfg.x*s,y+cfg.y*s,cfg.w*s,cfg.h*s)
      .setInteractive({useHandCursor:true});
    this.hotspots.push({cfg,index,zone});
    this.visuals.add(zone);
    zone.on('pointerover',()=>{
      if (this.modal || this.exiting) return;
      this.tooltip.setText(cfg.label).setVisible(true);
    });
    zone.on('pointerout',()=>this.tooltip?.setVisible(false));
    zone.on('pointerdown',()=>{
      if (this.modal || this.exiting) return;
      if (this.view==='document') this.inspectDocumentSpot(cfg.id);
      else this.dispatch(cfg.action);
    });
  }

  onKey(event) {
    if (event.target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)
      || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.code==='Escape') {
      event.preventDefault();
      if (this.modal) this.closeModal();
      else if (this.view==='room') void this.leave();
      else this.goBack();
      return;
    }
    if (this.modal || this.exiting) return;
    if (event.code==='KeyT' && this.view==='document') {
      this.showTranscription=!this.showTranscription;
      this.renderView();
    }
  }

  closeModal() { this.dialogue?.close(false);this.modal=null;this.clearHover(); }
  panel(title,text,choices=[],portrait=false) {
    if (this.exiting) return;
    syncPostalNotebook();
    this.clearHover();
    this.modal=this.dialogue.show({title,text,choices,portrait:portrait?POST_OFFICE_ART.portrait.key:null});
  }
  info(title,text) { this.panel(title,text); }
  dispatch(action) {
    if (this.modal || this.exiting) return;
    if (action==='talk') return this.talk();
    if (action==='return' || action==='service') return this.caseMenu();
    if (action==='restante') return this.changeView('restante');
    if (action==='notice') return this.openDocument('notice');
    if (action==='collect') return this.collectReply();
    if (['write','deposit'].includes(action)) return this.correspondence();
    if (action==='route') return this.info('DELIVERY ROUTE','Private courier deliveries are not part of the local postal round. Ask the postman about a specific delivery.');
    if (action==='parcels') return this.info('UNDELIVERED PARCELS','“FRAGILE” on every side. The contents have better legal protection than I do.');
    if (action==='policy') return this.info('POSTAL POLICY','No name. No problem. No refunds. A remarkably complete business plan.');
  }
  collectReply() {
    const before=Postal.postalState();
    if (canViewPostalDocument('reply',before)) return this.openDocument('reply');
    const message=Postal.collectPostalReply();
    syncPostalNotebook();
    if (canViewPostalDocument('reply')) {
      syncPostalEvidenceImages();return this.openDocument('reply');
    }
    this.info('POSTE RESTANTE',message);
  }
  talk(message='“I don’t read people’s mail. I judge them by the envelopes.”') {
    const choices=[['Returning letter',()=>this.caseMenu()],['Poste restante',()=>this.changeView('restante')]];
    if (Postal.canCheckDeadMail()) choices.push(['Dead Mail',()=>this.deadMail()]);
    this.panel('POSTMAN',message,choices,true);
  }
  deadMail(message='“Show me the photograph. I can tell you what belongs to our service — and what doesn’t.”') {
    this.panel('POSTMAN',message,[
      ...[['photo','Delivery photo'],['route','Your route'],['gate','Service Gate B']]
        .map(([id,label])=>[label,()=>this.deadMail(Postal.postalDeadTopic(id))]),
      ['Other matters',()=>this.talk()]
    ],true);
  }
  caseMenu(message='') {
    syncPostalNotebook();
    const record=Postal.postalState().returnCase,choices=[];
    let text=message;
    if (record.stage==='new') {
      text=text||'“Three addresses, four returns. The last forwarding address is your office. Inspect the envelope and authorised records — leave the seal intact.”';
      choices.push(['Accept case',()=>{
        Postal.startReturnCase();syncPostalNotebook();this.openDocument('envelope');
      }]);
    } else {
      text=text||'Review the documents. Inspect every relevant detail before identifying the recipient. Your findings are recorded in your case notes.';
      for (const id of ['envelope','card','notice']) choices.push([
        (record.clues.includes(id)?'[READ] ':'')+this.documents[id].title,
        ()=>this.openDocument(id)
      ]);
      if (record.stage==='investigating' && record.clues.length===3) choices.push(['Identify recipient',()=>this.deduction()]);
      if (['identified','waiting'].includes(record.stage)) choices.push(['Poste restante',()=>this.changeView('restante')]);
      if (record.stage==='waiting') choices.push(['Check reply',()=>this.collectReply()]);
      if (record.stage==='reply') {
        text=message||'Ellis asks you to leave the sealed letter for CLOCKWORK and keep his new name private.';
        choices.push(['Read Ellis’s reply',()=>this.openDocument('reply')],
          ['Keep name private',()=>this.finishCase('private')],['Disclose new name',()=>this.finishCase('disclose')]);
      }
      if (record.stage==='completed') {
        text=message||'Case closed. Your decision is recorded on the PI board and in your case notes.';
        choices.push(['Read reply',()=>this.openDocument('reply')],['Postal commendation',()=>this.openDocument('reward')]);
      }
    }
    choices.push(['Other matters',()=>this.talk()]);
    this.panel('POSTMAN',text,choices,true);
  }
  finishCase(choice) {
    const message=Postal.completeReturnCase(choice);
    syncPostalNotebook();
    if (Postal.postalState().returnCase.stage==='completed') {
      syncPostalEvidenceImages();this.openDocument('reward');
    } else this.caseMenu(message);
  }
  deduction(message='Which interpretation connects all three authorised sources?') {
    this.panel('RETURN TO SENDER',message,[
      ['Ellis Bell / A. Reed',()=>this.caseMenu(Postal.identifyRecipient('ellis'))],
      ['The PI office',()=>this.deduction(Postal.identifyRecipient('office'))],
      ['CLOCKWORK is a home',()=>this.deduction(Postal.identifyRecipient('address'))],
      ['Review evidence',()=>this.caseMenu()]
    ]);
  }
  correspondence(message='') {
    const record=Postal.postalState().returnCase;
    if (!['identified','waiting','reply','completed'].includes(record.stage)) {
      return this.info('POSTE RESTANTE','Establish the intended recipient from the envelope and authorised records first.');
    }
    const choices=[];
    if (record.stage==='identified') {
      for (const password of ['SECOND HAND','OPEN SESAME','DEAD LETTER']) choices.push([
        password,()=>this.correspondence(Postal.leavePostalMessage('CLOCKWORK',password,
          'A sealed letter addressed to your former trading name has reached the PI office. Please confirm how you wish to receive it.'))
      ]);
    } else choices.push(['Check reply',()=>this.collectReply()],['Review case',()=>this.caseMenu()]);
    this.panel('CLOCKWORK',message||'Select the contact password. Hint: old clocks can have a second life.',choices);
  }
  async leave() {
    if (this.modal || this.exiting) return;
    this.exiting=true;
    syncPostalNotebook();
    try {
      const opened=await this.goto('HomeCityScene',{entryPoint:'post-office'});
      if (opened===false && !this._cleanupDone) {
        this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');
      }
    } catch (error) {
      console.error('[PostOfficeScene] Exit failed:',error);
      if (!this._cleanupDone) {
        this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');
      }
    }
  }
}
