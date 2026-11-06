import {BaseScene} from './BaseScene.js';
import * as Postal from '../managers/PostOfficeManager.js';
import {HomeTownDialogue} from '../ui/HomeTownDialogue.js';
import {POST_OFFICE_ART,POST_OFFICE_HOTSPOTS} from '../config/postOfficeConfig.js';
import {POSTAL_EVIDENCE_ART,POSTAL_DOCUMENTS} from '../config/postOfficeEvidenceConfig.js';
import {replyIsWaiting,canViewPostalDocument,inspectPostalDetail,syncPostalEvidenceImages} from '../managers/PostOfficeEvidence.js';
const LOCAL=typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
const clone=o=>JSON.parse(JSON.stringify(o));
export class PostOfficeScene extends BaseScene {
  constructor(){super({key:'PostOfficeScene'});}
  init(){
    this.view='room';this.documentId=null;this.documentOrigin='room';this.debugMode=false;this.selectedIndex=0;this.exiting=false;
    this.config=clone(POST_OFFICE_HOTSPOTS);this.documents=clone(POSTAL_DOCUMENTS);this.hotspots=[];this.modal=null;this.dialogue=null;this.showTranscription=true;
  }
  preload(){for(const a of [...Object.values(POST_OFFICE_ART),...Object.values(POSTAL_EVIDENCE_ART)])if(!this.textures.exists(a.key))this.load.image(a.key,a.url);}
  create(){
    super.create();this.registry.set('currentSceneKey','PostOfficeScene');Postal.visitPostOffice();syncPostalEvidenceImages();
    this.cameras.main.setBackgroundColor('#181b18');this.dialogue=new HomeTownDialogue(this,()=>{this.modal=null;this.clearHover();});
    this.trackInputEvent(this.scale,'resize',this.resizeView);if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    this.renderView();this.events.once('shutdown',()=>{this.dialogue?.destroy();this.dialogue=null;this.modal=null;this.hotspots=[];this.visuals=null;});
  }
  style(size=21){return{fontFamily:'SpecialElite, monospace',fontSize:size,color:'#fff1ce',backgroundColor:'#22251f',padding:{x:9,y:7},wordWrap:{width:Math.max(100,this.scale.width-64)}};}
  spots(){return this.view==='document'?this.documents[this.documentId]?.spots||[]:this.config[this.view]||[];}
  artwork(){
    if(this.view==='document')return POSTAL_EVIDENCE_ART[this.documentId];
    if(this.view==='restante')return replyIsWaiting()?POST_OFFICE_ART.restante:POSTAL_EVIDENCE_ART.restanteEmpty;
    return POST_OFFICE_ART.room;
  }
  renderView(){
    this.visuals?.destroy(true);this.visuals=this.add.container(0,0);this.hotspots=[];
    const{width:w,height:h}=this.scale,doc=this.view==='document',top=doc?58:0,bottom=doc?42:0;
    this.fit={s:Math.min(w/1920,Math.max(1,h-top-bottom)/1080),x:0,y:0};this.fit.x=(w-1920*this.fit.s)/2;this.fit.y=top+(h-top-bottom-1080*this.fit.s)/2;
    const a=this.artwork();let key=a?.key;
    if(!this.textures.exists(key)&&this.view==='room'&&this.textures.exists(POST_OFFICE_ART.empty.key))key=POST_OFFICE_ART.empty.key;
    const missing=!key||!this.textures.exists(key);
    if(!missing)this.visuals.add(this.add.image(this.fit.x,this.fit.y,key).setOrigin(0).setDisplaySize(1920*this.fit.s,1080*this.fit.s));
    else this.visuals.add(this.add.text(20,70,'Image not loaded:\n'+(a?.url||'unknown asset')+'\nText and inspection controls remain available.',this.style(18)));
    this.tooltip=this.add.text(15,h-42,'',this.style(17)).setVisible(false);this.visuals.add(this.tooltip);
    this.spots().forEach((c,i)=>this.makeHotspot(c,i));
    if(doc){
      this.visuals.add(this.add.text(14,12,this.documents[this.documentId].title,this.style(17)));
      const overlay=this.documents[this.documentId].overlay;
      if(overlay&&this.showTranscription&&!missing){
        const{s,x,y}=this.fit;const t=this.add.text(x+overlay.x*s,y+overlay.y*s,overlay.text,{fontFamily:'SpecialElite, monospace',fontSize:Math.max(8,27*s),color:'#302923',lineSpacing:3*s,wordWrap:{width:overlay.w*s}});
        while(t.height>overlay.h*s&&parseInt(t.style.fontSize)>7)t.setFontSize(parseInt(t.style.fontSize)-1);this.visuals.add(t);
      }
      this.addButton(14,h-40,'[ READ TRANSCRIPT ]',()=>this.readTranscript(),16);
      this.addButton(w/2,h-40,'[ TEXT ON/OFF ]',()=>{this.showTranscription=!this.showTranscription;this.renderView();},15,.5);
    }
    this.addButton(w-14,12,this.view==='room'?'[ EXIT ]':'[ BACK ]',()=>{if(this.view==='document')this.closeDocument();else if(this.view==='restante')this.changeView('room');else void this.leave();},18,1);
    if(LOCAL){this.debugText=this.add.text(12,doc?62:12,'',this.style(15));this.visuals.add(this.debugText);}
    this.selectedIndex=Math.min(this.selectedIndex,Math.max(0,this.hotspots.length-1));this.updateDebug();
  }
  addButton(x,y,label,fn,size=18,origin=0){const t=this.add.text(x,y,label,this.style(size)).setOrigin(origin,0).setInteractive({useHandCursor:true});t.on('pointerdown',()=>{if(!this.modal&&!this.debugMode&&!this.exiting)fn();});this.visuals.add(t);return t;}
  resizeView(){this.renderView();this.modal=this.dialogue?.root||null;}
  changeView(view){this.closeModal();this.view=view;this.documentId=null;this.selectedIndex=0;this.debugMode=false;this.renderView();}
  clearHover(){this.hotspots.forEach(h=>{h.hovered=false;this.drawHotspot(h);});this.tooltip?.setVisible(false);}
  openDocument(id){
    if(!canViewPostalDocument(id))return this.info('RETURN TO SENDER','This document is not available at this stage.');
    this.closeModal();if(this.view!=='document')this.documentOrigin=this.view;
    this.view='document';this.documentId=id;this.debugMode=false;this.selectedIndex=0;this.renderView();
  }
  closeDocument(){this.closeModal();this.view=this.documentOrigin==='restante'?'restante':'room';this.documentId=null;this.debugMode=false;this.selectedIndex=0;this.renderView();}
  readTranscript(){
    const id=this.documentId,doc=this.documents[id];
    const text=id==='reply'?'Yes, A. Reed was my old trading name. I changed it after a business partnership ended. Please leave the sealed letter here for CLOCKWORK. Tell the sender I can receive a reply through this desk, but please do not pass on my new name. — Ellis Bell':doc.spots.map(s=>s.text).join('\n\n');
    this.panel(doc.title,text,doc.spots.map(s=>[s.label,()=>this.inspectDocumentSpot(s.id)]));
  }
  inspectDocumentSpot(spotId){
    const result=inspectPostalDetail(this.documentId,spotId);const doc=this.documents[this.documentId];
    const text=result.text+(result.complete&&doc.clue?'\n\nAll details inspected. Evidence recorded on the case board.':'');
    this.panel(doc.title,text,doc.spots.filter(s=>s.id!==spotId).map(s=>[s.label,()=>this.inspectDocumentSpot(s.id)]));
  }
  makeHotspot(cfg,index){
    const{s,x,y}=this.fit;const zone=this.add.zone(x+cfg.x*s,y+cfg.y*s,cfg.w*s,cfg.h*s).setInteractive({useHandCursor:true});
    const highlight=this.add.graphics(),label=this.add.text(0,0,cfg.label,this.style(15)).setOrigin(.5,1).setVisible(false);
    const hs={cfg,index,zone,highlight,label,hovered:false};this.hotspots.push(hs);this.visuals.add([zone,highlight,label]);
    zone.on('pointerover',()=>{if(this.modal||this.debugMode||this.exiting)return;hs.hovered=true;this.tooltip.setText(cfg.label).setVisible(true);this.drawHotspot(hs);});
    zone.on('pointerout',()=>{hs.hovered=false;this.tooltip.setVisible(false);this.drawHotspot(hs);});
    zone.on('pointerdown',()=>{if(this.modal||this.exiting)return;if(this.debugMode){this.selectedIndex=index;this.updateDebug();}else if(this.view==='document')this.inspectDocumentSpot(cfg.id);else this.dispatch(cfg.action);});
    zone.on('drag',(_pointer,dx,dy)=>{if(!LOCAL||!this.debugMode||this.modal)return;cfg.x=Math.round((dx-this.fit.x)/this.fit.s);cfg.y=Math.round((dy-this.fit.y)/this.fit.s);this.selectedIndex=index;this.syncHotspot(hs);this.updateDebug();});
    this.input.setDraggable(zone,LOCAL&&this.debugMode);this.syncHotspot(hs);
  }
  syncHotspot(h){const{s,x,y}=this.fit,c=h.cfg;h.zone.setPosition(x+c.x*s,y+c.y*s).setSize(c.w*s,c.h*s);h.zone.input.hitArea.setTo(0,0,c.w*s,c.h*s);h.label.setPosition(x+c.x*s,y+(c.y-c.h/2)*s-3);this.drawHotspot(h);}
  drawHotspot(h){const{s,x,y}=this.fit,c=h.cfg,g=h.highlight;g.clear();const debug=LOCAL&&this.debugMode,hover=h.hovered&&!this.modal&&!this.exiting;if(debug||hover){g.fillStyle(debug?0x00ff88:0xffd166,debug ? .2 : .15).fillRect(x+(c.x-c.w/2)*s,y+(c.y-c.h/2)*s,c.w*s,c.h*s);if(debug)g.lineStyle(2,h.index===this.selectedIndex?0xff44ff:0x00ff88,1).strokeRect(x+(c.x-c.w/2)*s,y+(c.y-c.h/2)*s,c.w*s,c.h*s);}h.label.setVisible(debug);}
  updateDebug(){this.hotspots.forEach(h=>this.drawHotspot(h));const c=this.hotspots[this.selectedIndex]?.cfg;this.debugText?.setVisible(this.debugMode).setText(`LOCAL DEBUG / ${this.documentId||this.view} / ${c?.id||'-'}\nx:${c?.x} y:${c?.y} w:${c?.w} h:${c?.h} / 1920x1080\nDrag / Arrows: move | Shift+Arrows: resize | Alt: 1px\nTab: select | C: export all | D: close\nStory actions disabled.`);}
  onKey(e){
    if(e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'){e.preventDefault();if(e.repeat)return;if(this.modal)this.closeModal();else if(this.debugMode){this.debugMode=false;this.renderView();}else if(this.view==='document')this.closeDocument();else if(this.view==='restante')this.changeView('room');else void this.leave();return;}
    if(this.modal||this.exiting)return;
    if(e.code==='KeyT'&&this.view==='document'&&!this.debugMode){if(!e.repeat){this.showTranscription=!this.showTranscription;this.renderView();}return;}
    if(!LOCAL)return;if(e.code==='KeyD'){if(!e.repeat){this.debugMode=!this.debugMode;this.renderView();}return;}if(!this.debugMode)return;
    if(e.code==='KeyC'){if(!e.repeat){console.log('POST_OFFICE_HOTSPOTS / config/postOfficeConfig.js:\n'+JSON.stringify(this.config,null,2));console.log('POSTAL_DOCUMENTS / config/postOfficeEvidenceConfig.js:\n'+JSON.stringify(this.documents,null,2));}return;}
    if(e.code==='Tab'&&this.hotspots.length){e.preventDefault();this.selectedIndex=(this.selectedIndex+(e.shiftKey?-1:1)+this.hotspots.length)%this.hotspots.length;this.updateDebug();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();const h=this.hotspots[this.selectedIndex];if(!h)return;
    const horizontal=['ArrowLeft','ArrowRight'].includes(e.code),direction=['ArrowLeft','ArrowUp'].includes(e.code)?-1:1;
    const field=e.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');h.cfg[field]+=direction*(e.altKey?1:5);h.cfg.w=Math.max(10,h.cfg.w);h.cfg.h=Math.max(10,h.cfg.h);this.syncHotspot(h);this.updateDebug();
  }
  closeModal(){this.dialogue?.close(false);this.modal=null;this.clearHover();}
  panel(title,text,choices=[],portrait=false){if(this.debugMode||this.exiting)return;this.clearHover();this.modal=this.dialogue.show({title,text,choices,portrait:portrait?POST_OFFICE_ART.portrait.key:null});}
  info(title,text){this.panel(title,text);}
  dispatch(action){
    if(this.modal||this.debugMode||this.exiting)return;
    if(action==='talk')return this.talk();if(action==='return'||action==='service')return this.caseMenu();if(action==='restante')return this.changeView('restante');if(action==='notice')return this.openDocument('notice');
    if(action==='collect')return this.collectReply();if(['write','deposit'].includes(action))return this.correspondence();
    if(action==='route')return this.info('DELIVERY ROUTE','Private courier deliveries are not part of the local postal round. Ask the postman about a specific delivery.');
    if(action==='parcels')return this.info('UNDELIVERED PARCELS','“FRAGILE” on every side. The contents have better legal protection than I do.');
    if(action==='policy')return this.info('POSTAL POLICY','No name. No problem. No refunds. A remarkably complete business plan.');
  }
  collectReply(){
    const before=Postal.postalState();if(canViewPostalDocument('reply',before))return this.openDocument('reply');
    const message=Postal.collectPostalReply();
    if(canViewPostalDocument('reply')){syncPostalEvidenceImages();return this.openDocument('reply');}
    this.info('POSTE RESTANTE',message);
  }
  talk(message='“I don’t read people’s mail. I judge them by the envelopes.”'){
    const choices=[['Returning letter',()=>this.caseMenu()],['Poste restante',()=>this.changeView('restante')]];
    if(Postal.canCheckDeadMail())choices.push(['Dead Mail',()=>this.deadMail()]);this.panel('POSTMAN',message,choices,true);
  }
  deadMail(message='“Show me the photograph. I can tell you what belongs to our service — and what doesn’t.”'){
    this.panel('POSTMAN',message,[...([['photo','Delivery photo'],['route','Your route'],['gate','Service Gate B']].map(([id,label])=>[label,()=>this.deadMail(Postal.postalDeadTopic(id))])),['Other matters',()=>this.talk()]],true);
  }
  caseMenu(message=''){
    const r=Postal.postalState().returnCase,choices=[];let text=message;
    if(r.stage==='new'){text=text||'“Three addresses, four returns. The last forwarding address is your office. Inspect the envelope and authorised records — leave the seal intact.”';choices.push(['Accept case',()=>{Postal.startReturnCase();this.openDocument('envelope');}]);}
    else{
      text=text||'Review the documents. Inspect every highlighted detail before identifying the recipient.';
      for(const id of ['envelope','card','notice'])choices.push([(r.clues.includes(id)?'[READ] ':'')+this.documents[id].title,()=>this.openDocument(id)]);
      if(r.stage==='investigating'&&r.clues.length===3)choices.push(['Identify recipient',()=>this.deduction()]);
      if(['identified','waiting'].includes(r.stage))choices.push(['Poste restante',()=>this.changeView('restante')]);
      if(r.stage==='waiting')choices.push(['Check reply',()=>this.collectReply()]);
      if(r.stage==='reply'){
        text=message||'Ellis asks you to leave the sealed letter for CLOCKWORK and keep his new name private.';
        choices.push(['Read Ellis’s reply',()=>this.openDocument('reply')],['Keep name private',()=>this.finishCase('private')],['Disclose new name',()=>this.finishCase('disclose')]);
      }
      if(r.stage==='completed'){text=message||'Case closed. Your decision is recorded on the PI board.';choices.push(['Read reply',()=>this.openDocument('reply')],['Postal commendation',()=>this.openDocument('reward')]);}
    }
    choices.push(['Other matters',()=>this.talk()]);this.panel('POSTMAN',text,choices,true);
  }
  finishCase(choice){const message=Postal.completeReturnCase(choice);if(Postal.postalState().returnCase.stage==='completed'){syncPostalEvidenceImages();this.openDocument('reward');}else this.caseMenu(message);}
  deduction(message='Which interpretation connects all three authorised sources?'){
    this.panel('RETURN TO SENDER',message,[['Ellis Bell / A. Reed',()=>this.caseMenu(Postal.identifyRecipient('ellis'))],['The PI office',()=>this.deduction(Postal.identifyRecipient('office'))],['CLOCKWORK is a home',()=>this.deduction(Postal.identifyRecipient('address'))],['Review evidence',()=>this.caseMenu()]]);
  }
  correspondence(message=''){
    const r=Postal.postalState().returnCase;if(!['identified','waiting','reply','completed'].includes(r.stage))return this.info('POSTE RESTANTE','Establish the intended recipient from the envelope and authorised records first.');
    const choices=[];if(r.stage==='identified')for(const pass of ['SECOND HAND','OPEN SESAME','DEAD LETTER'])choices.push([pass,()=>this.correspondence(Postal.leavePostalMessage('CLOCKWORK',pass,'A sealed letter addressed to your former trading name has reached the PI office. Please confirm how you wish to receive it.'))]);
    else choices.push(['Check reply',()=>this.collectReply()],['Review case',()=>this.caseMenu()]);
    this.panel('CLOCKWORK',message||'Select the contact password. Hint: old clocks can have a second life.',choices);
  }
  async leave(){if(this.modal||this.exiting)return;this.exiting=true;const ok=await this.goto('HomeCityScene',{entryPoint:'post-office'});if(ok===false){this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');}}
}
