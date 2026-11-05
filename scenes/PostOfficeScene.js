import { BaseScene } from './BaseScene.js';
import * as Postal from '../managers/PostOfficeManager.js';
import { POST_OFFICE_ART, POST_OFFICE_HOTSPOTS } from '../config/postOfficeConfig.js';

const LOCAL = typeof window !== 'undefined' && ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);
const clone = value => JSON.parse(JSON.stringify(value));
export class PostOfficeScene extends BaseScene {
  constructor(){super({key:'PostOfficeScene'});}
  init(){
    this.view='room';this.debugMode=false;this.selectedIndex=0;this.exiting=false;
    this.config=clone(POST_OFFICE_HOTSPOTS);this.hotspots=[];this.modal=null;
  }
  preload(){
    for(const asset of Object.values(POST_OFFICE_ART))if(!this.textures.exists(asset.key))this.load.image(asset.key,asset.url);
  }
  create(){
    super.create();this.registry.set('currentSceneKey','PostOfficeScene');
    Postal.visitPostOffice();this.cameras.main.setBackgroundColor('#181b18');
    this.trackInputEvent(this.scale,'resize',this.resizeView);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown',this.onKey);
    this.renderView();
    this.events.once('shutdown',()=>{this.modalGeometryMask?.destroy();this.modalGeometryMask=null;this.modal=null;this.hotspots=[];this.visuals=null;});
  }
  style(size=21){return {fontFamily:'SpecialElite, monospace',fontSize:size,color:'#fff1ce',backgroundColor:'#22251f',padding:{x:9,y:7},wordWrap:{width:Math.max(130,this.scale.width-64)}};}
  renderView(){
    this.visuals?.destroy(true);this.visuals=this.add.container(0,0);this.hotspots=[];
    const {width:w,height:h}=this.scale;
    this.fit={s:Math.min(w/1920,h/1080),x:0,y:0};this.fit.x=(w-1920*this.fit.s)/2;this.fit.y=(h-1080*this.fit.s)/2;
    const key=this.view==='restante'?POST_OFFICE_ART.restante.key:POST_OFFICE_ART.room.key;
    const texture=this.textures.exists(key)?key:this.view==='room'&&this.textures.exists(POST_OFFICE_ART.empty.key)?POST_OFFICE_ART.empty.key:null;
    if(texture)this.visuals.add(this.add.image(this.fit.x,this.fit.y,texture).setOrigin(0).setDisplaySize(1920*this.fit.s,1080*this.fit.s));
    else this.visuals.add(this.add.text(25,90,'Postal artwork could not be loaded. Check assets/local.',this.style()));
    this.tooltip=this.add.text(20,h-55,'',this.style(19)).setDepth(30).setVisible(false);this.visuals.add(this.tooltip);
    this.config[this.view].forEach((cfg,index)=>this.makeHotspot(cfg,index));
    this.nav=this.add.text(w-18,14,this.view==='room'?'[ EXIT ]':'[ BACK ]',this.style(20)).setOrigin(1,0).setDepth(40).setInteractive({useHandCursor:true});
    this.nav.on('pointerdown',()=>{if(this.modal||this.debugMode)return;if(this.view==='restante')this.changeView('room');else void this.leave();});this.visuals.add(this.nav);
    if(LOCAL){
      this.debugText=this.add.text(12,12,'',this.style(16)).setDepth(50);this.visuals.add(this.debugText);
    }
    this.selectedIndex=Math.min(this.selectedIndex,Math.max(0,this.hotspots.length-1));this.updateDebug();
  }
  resizeView(){
    const reopen=this.modalFactory;this.closeModal();this.renderView();if(reopen)reopen();
  }
  changeView(view){this.closeModal();this.debugMode=false;this.selectedIndex=0;this.view=view;this.renderView();}
  makeHotspot(cfg,index){
    const {s,x,y}=this.fit;
    const zone=this.add.zone(x+cfg.x*s,y+cfg.y*s,cfg.w*s,cfg.h*s).setDepth(10).setInteractive({useHandCursor:true});
    const highlight=this.add.graphics().setDepth(11);
    const label=this.add.text(0,0,cfg.label,this.style(15)).setOrigin(.5,1).setDepth(20).setVisible(false);
    const hs={cfg,index,zone,highlight,label,hovered:false};this.hotspots.push(hs);this.visuals.add([zone,highlight,label]);
    zone.on('pointerover',()=>{if(this.modal||this.debugMode||this.exiting)return;hs.hovered=true;this.tooltip.setText(cfg.label).setVisible(true);this.drawHotspot(hs);});
    zone.on('pointerout',()=>{hs.hovered=false;this.tooltip.setVisible(false);this.drawHotspot(hs);});
    zone.on('pointerdown',()=>{if(this.modal||this.exiting)return;if(this.debugMode){this.selectedIndex=index;this.updateDebug();}else this.dispatch(cfg.action);});
    zone.on('drag',(pointer,dx,dy)=>{if(!LOCAL||!this.debugMode||this.modal)return;cfg.x=Math.round((dx-this.fit.x)/this.fit.s);cfg.y=Math.round((dy-this.fit.y)/this.fit.s);this.selectedIndex=index;this.syncHotspot(hs);this.updateDebug();});
    this.input.setDraggable(zone,LOCAL&&this.debugMode);this.syncHotspot(hs);
  }
  syncHotspot(hs){
    const {s,x,y}=this.fit,c=hs.cfg;
    hs.zone.setPosition(x+c.x*s,y+c.y*s).setSize(c.w*s,c.h*s);
    hs.zone.input.hitArea.setTo(0,0,c.w*s,c.h*s);
    hs.label.setPosition(x+c.x*s,y+(c.y-c.h/2)*s-4);this.drawHotspot(hs);
  }
  drawHotspot(hs){
    const {s,x,y}=this.fit,c=hs.cfg,g=hs.highlight;g.clear();
    const debug=LOCAL&&this.debugMode,hover=hs.hovered&&!this.modal&&!this.exiting;
    if(debug||hover){
      g.fillStyle(debug?0x00ff88:0xffd166,debug ? 0.2 : 0.15).fillRect(x+(c.x-c.w/2)*s,y+(c.y-c.h/2)*s,c.w*s,c.h*s);
      if(debug)g.lineStyle(2,hs.index===this.selectedIndex?0xff44ff:0x00ff88,1).strokeRect(x+(c.x-c.w/2)*s,y+(c.y-c.h/2)*s,c.w*s,c.h*s);
    }
    hs.label.setVisible(debug);
  }
  updateDebug(){
    this.hotspots.forEach(hs=>this.drawHotspot(hs));const c=this.hotspots[this.selectedIndex]?.cfg;
    this.debugText?.setVisible(this.debugMode).setText(`LOCAL DEBUG / ${this.view} / ${c?.id||'-'}\nx:${c?.x} y:${c?.y} w:${c?.w} h:${c?.h} (1920x1080)\nDrag / Arrows: move | Shift+Arrows: resize | Alt: 1px\nTab / Shift+Tab: select | C: export | D: close\nStory actions disabled.`);
  }
  onKey(e){
    if(e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'){
      e.preventDefault();if(this.modal)this.closeModal();else if(this.debugMode){this.debugMode=false;this.renderView();}else if(this.view==='restante')this.changeView('room');else void this.leave();return;
    }
    if(!LOCAL||this.modal||this.exiting)return;
    if(e.code==='KeyD'){if(!e.repeat){this.debugMode=!this.debugMode;this.renderView();}return;}
    if(!this.debugMode)return;
    if(e.code==='KeyC'){if(!e.repeat)console.log('COPY INTO config/postOfficeConfig.js -> POST_OFFICE_HOTSPOTS:\n'+JSON.stringify(this.config,null,2));return;}
    if(e.code==='Tab'){e.preventDefault();this.selectedIndex=(this.selectedIndex+(e.shiftKey?-1:1)+this.hotspots.length)%this.hotspots.length;this.updateDebug();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;
    e.preventDefault();const hs=this.hotspots[this.selectedIndex];if(!hs)return;
    const horizontal=['ArrowLeft','ArrowRight'].includes(e.code),direction=['ArrowLeft','ArrowUp'].includes(e.code)?-1:1;
    const field=e.shiftKey?(horizontal?'w':'h'):(horizontal?'x':'y');hs.cfg[field]+=direction*(e.altKey?1:5);hs.cfg.w=Math.max(10,hs.cfg.w);hs.cfg.h=Math.max(10,hs.cfg.h);
    this.syncHotspot(hs);this.updateDebug();
  }
  closeModal(){this.modal?.destroy(true);this.modalGeometryMask?.destroy();this.modalGeometryMask=null;this.modal=null;this.modalFactory=null;this.hotspots.forEach(hs=>{hs.hovered=false;this.drawHotspot(hs);});}
  panel(title,text,choices=[],portrait=false,factory=null){
    this.closeModal();this.modalFactory=factory;this.tooltip.setVisible(false);
    const {width:w,height:h}=this.scale,small=w<680,pad=18;
    this.modal=this.add.container(0,0).setDepth(100);
    const shield=this.add.rectangle(0,0,w,h,0x000000,.74).setOrigin(0).setInteractive();this.modal.add(shield);
    const pw=Math.min(w-24,1040),px=(w-pw)/2,py=12;
    const box=this.add.rectangle(px,py,pw,h-24,0x24271f,.98).setOrigin(0).setStrokeStyle(2,0xb89a58);this.modal.add(box);
    const heading=this.add.text(px+pad,py+pad,title,{...this.style(small?20:25),wordWrap:{width:pw-2*pad}});this.modal.add(heading);
    const close=this.add.text(px+pw-pad,h-57,'[ CLOSE ]',this.style(18)).setOrigin(1,0).setInteractive({useHandCursor:true});close.on('pointerdown',()=>this.closeModal());this.modal.add(close);
    const viewportTop=py+pad+heading.height+12,viewportBottom=h-76;
    const content=this.add.container(px+pad,viewportTop);this.modal.add(content);
    const portraitW=portrait&&!small&&this.textures.exists(POST_OFFICE_ART.portrait.key)?160:0;
    if(portraitW){const im=this.add.image(0,0,POST_OFFICE_ART.portrait.key).setOrigin(0);im.setDisplaySize(160,160*1200/896);content.add(im);}
    const textX=portraitW?portraitW+18:0,cw=pw-2*pad-textX;
    const body=this.add.text(textX,0,text,{...this.style(small?18:21),backgroundColor:undefined,padding:{x:0,y:0},wordWrap:{width:cw},lineSpacing:5});content.add(body);
    let cy=Math.max(body.height,portraitW?160*1200/896:0)+20;
    for(const [label,fn] of choices){
      const button=this.add.text(0,cy,label,{...this.style(small?18:20),wordWrap:{width:pw-2*pad-20}}).setInteractive({useHandCursor:true});
      button.on('pointerdown',()=>{if(!this.exiting)fn();});content.add(button);cy+=button.height+10;
    }
    const maskGraphics=this.make.graphics({x:0,y:0,add:false});maskGraphics.fillStyle(0xffffff).fillRect(px+pad,viewportTop,pw-2*pad,Math.max(1,viewportBottom-viewportTop));
    this.modalGeometryMask=maskGraphics.createGeometryMask();content.setMask(this.modalGeometryMask);maskGraphics.setVisible(false);this.modal.add(maskGraphics);
    let offset=0;const max=Math.max(0,cy-(viewportBottom-viewportTop));
    const scroll=dy=>{offset=Phaser.Math.Clamp(offset+dy,0,max);content.y=viewportTop-offset;};
    shield.on('wheel',(p,o,dx,dy)=>scroll(dy*.6));box.setInteractive().on('wheel',(p,o,dx,dy)=>scroll(dy*.6));
    if(max){
      const up=this.add.text(px+pw-110,h-57,'↑',this.style(18)).setInteractive({useHandCursor:true});const down=this.add.text(px+pw-155,h-57,'↓',this.style(18)).setInteractive({useHandCursor:true});
      up.on('pointerdown',()=>scroll(-120));down.on('pointerdown',()=>scroll(120));close.x=px+pw-185;this.modal.add([up,down]);
    }
  }
  info(title,text){const open=()=>this.panel(title,text,[],false,open);open();}
  dispatch(action){
    if(this.debugMode||this.modal||this.exiting)return;
    if(action==='talk')return this.talk();
    if(action==='return')return this.caseMenu();
    if(action==='restante')return this.changeView('restante');
    if(action==='notice'){
      const text=Postal.inspectReturnClue('notice');return this.info('PUBLIC NOTICES',text||'CLOCK REPAIRS — ELLIS BELL. Formerly trading as A. Reed. Correspondence: poste restante, CLOCKWORK.');
    }
    if(action==='route')return this.info('DELIVERY ROUTE','A working route sheet. Private courier deliveries are not part of the local postal round. Ask the postman about a specific delivery.');
    if(action==='parcels')return this.info('UNDELIVERED PARCELS','“FRAGILE” on every side. The contents have better legal protection than I do.');
    if(action==='collect')return this.info('POSTE RESTANTE',Postal.collectPostalReply());
    if(['write','deposit'].includes(action))return this.correspondence();
    if(action==='service')return this.caseMenu();
    if(action==='policy')return this.info('POSTAL POLICY','No name. No problem. No refunds.\n\nA remarkably complete business plan.');
  }
  talk(message='“I don’t read people’s mail. I judge them by the envelopes.”'){
    const open=()=>this.talk(message),choices=[['Ask about the returning letter',()=>this.caseMenu()],['Ask about poste restante',()=>this.changeView('restante')]];
    if(Postal.canCheckDeadMail()){
      for(const [id,label] of [['photo','Show Florence’s photograph'],['route','Did you deliver the parcel?'],['gate','Ask about SERVICE GATE B']])choices.push([label,()=>this.talk(Postal.postalDeadTopic(id))]);
    }else choices.push(['Ask about Dead Mail',()=>this.talk('Bring Florence’s account and the delivery photograph first. Speak to her about her postal work.')]);
    this.panel('POSTMAN',message,choices,true,open);
  }
  caseMenu(message=''){
    const r=Postal.postalState().returnCase;let text=message;const choices=[];
    if(r.stage==='new'){
      text=text||'“Three addresses, four returns. The last forwarding address is your office. Inspect the envelope and authorised records — leave the seal intact.”';
      choices.push(['ACCEPT CASE',()=>{Postal.startReturnCase();this.caseMenu('Case added to your PI board.');}]);
    }else if(r.stage==='investigating'){
      text=text||'Compare the envelope, the signed forwarding card and the public notice.';
      for(const [id,[label]] of Object.entries(Postal.RETURN_CLUES))choices.push([(r.clues.includes(id)?'[READ] ':'')+label,()=>this.caseMenu(Postal.inspectReturnClue(id))]);
      if(r.clues.length===3)choices.push(['IDENTIFY THE RECIPIENT',()=>this.deduction()]);
    }else if(r.stage==='identified'){
      text=text||'Ellis Bell receives correspondence as CLOCKWORK. His business gives old timepieces a second life.';
      choices.push(['GO TO POSTE RESTANTE',()=>this.changeView('restante')]);
    }else if(r.stage==='waiting'){
      text=text||'The message is on file. Return on your next visit to check for a reply.';
      choices.push(['CHECK FOR A REPLY',()=>this.caseMenu(Postal.collectPostalReply())]);
    }else if(r.stage==='reply'){
      text=text||'Ellis asks you to deliver the sealed letter through CLOCKWORK and keep his new name private.';
      choices.push(['Deliver it / Keep his new name private',()=>this.caseMenu(Postal.completeReturnCase('private'))],['Deliver it / Tell the sender his new name',()=>this.caseMenu(Postal.completeReturnCase('disclose'))]);
    }else text=text||'Case closed. Your decision and the delivery are recorded on your PI board.';
    this.panel('RETURN TO SENDER',text,choices,true,()=>this.caseMenu(message));
  }
  deduction(message='Which interpretation connects all three authorised sources?'){
    this.panel('IDENTIFY THE RECIPIENT',message,[['Ellis Bell, formerly trading as A. Reed',()=>this.caseMenu(Postal.identifyRecipient('ellis'))],['The PI office is the intended recipient',()=>this.deduction(Postal.identifyRecipient('office'))],['CLOCKWORK is a residential address',()=>this.deduction(Postal.identifyRecipient('address'))]],false,()=>this.deduction(message));
  }
  correspondence(message=''){
    const r=Postal.postalState().returnCase;
    if(!['identified','waiting','reply','completed'].includes(r.stage))return this.info('POSTE RESTANTE','Establish the intended recipient from the envelope and authorised records first.');
    const choices=[];
    if(r.stage==='identified')for(const pass of ['SECOND HAND','OPEN SESAME','DEAD LETTER'])choices.push([pass,()=>this.correspondence(Postal.leavePostalMessage('CLOCKWORK',pass,'A sealed letter addressed to your former trading name has reached the PI office. Please confirm how you wish to receive it.'))]);
    else choices.push(['CHECK FOR A REPLY',()=>this.correspondence(Postal.collectPostalReply())],['RETURN TO SENDER / Review case',()=>this.caseMenu()]);
    this.panel('CLOCKWORK / CORRESPONDENCE',message||'Select the contact password. Hint: old clocks can have a second life.',choices,false,()=>this.correspondence(message));
  }
  async leave(){
    if(this.exiting||this.modal)return;this.exiting=true;
    const ok=await this.goto('HomeCityScene',{entryPoint:'post-office'});
    if(ok===false){this.exiting=false;this.info('EXIT','Could not return to town. Please try again.');}
  }
}
