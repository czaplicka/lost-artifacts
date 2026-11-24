import { dialogueText as t } from '../../dialogues/DialogueText.js';
import { COURT_CONFIG } from '../../systems/courtRapport.js';
import { CourtDialogue } from '../../ui/CourtDialogue.js';
const text = id => t('scenes/CourtScene.js',id);
export const courtPresentation = {
  fitRoot() {
    if (!this.root) return;
    const scale = Math.min(this.scale.width/1920,this.scale.height/1080);
    this.root.setScale(scale).setPosition((this.scale.width-1920*scale)/2,(this.scale.height-1080*scale)/2);
  },
  rect(x,y,w,h,color,alpha=1) { const o=this.add.rectangle(x,y,w,h,color,alpha);this.root.add(o);return o; },
  text(x,y,value,size=24,color='#f7e6bc',width=1600) {
    const o=this.add.text(x,y,value,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color,
      align:'center',wordWrap:{width,useAdvancedWrap:true},lineSpacing:5}).setOrigin(.5);this.root.add(o);return o;
  },
  drawCourtroom() {
    if(this.textures.exists('courtroom'))this.root.add(this.add.image(960,540,'courtroom').setDisplaySize(1920,1080));
    else {this.backgroundFailed=true;this.rect(960,540,1920,1080,0x29251f);this.rect(960,245,520,200,0x65462c);
      this.rect(350,290,480,180,0x4c3424);this.rect(1570,290,480,180,0x4c3424);}
    this.rect(960,57,1920,114,0x15110e,.9);
  },
  smallButton(parent,x,y,w,h,label,callback,size=20) {
    const root=this.add.container(x,y),bg=this.add.rectangle(0,0,w,h,0x302218,1).setStrokeStyle(2,0xc7ad73).setInteractive({useHandCursor:true});
    const words=this.add.text(0,0,label,{fontFamily:'SpecialElite, monospace',fontSize:`${size}px`,color:'#ffe3a0',align:'center',wordWrap:{width:w-16,useAdvancedWrap:true}}).setOrigin(.5);
    root.add([bg,words]);parent.add(root);
    bg.on('pointerover',()=>{if(bg.input?.enabled)bg.setFillStyle(0x62472d);});
    bg.on('pointerout',()=>bg.setFillStyle(0x302218));bg.on('pointerdown',()=>{if(bg.input?.enabled)callback();});
    return {root,bg,label:words};
  },
  enableButton(button,enabled) {if(!button)return;button.root.setAlpha(enabled?1:.4);if(button.bg.input)button.bg.input.enabled=Boolean(enabled);},
  createInterface() {
    this.heading=this.text(760,35,text('t_b9273ae8082e2173c68e'),28,'#ffe3a0',1390);
    this.defendantText=this.text(760,78,`${text('t_24f7715cc455bf61a556')}${this.record.facts.defendantName}`,22,'#f7e6bc',1390);
    this.createTrustMeter();
    this.notice=this.text(760,455,'',18,'#ffb28d',1390);
    this.hintButton=this.smallButton(this.root,1780,38,190,48,text('t_091dd40e60f2e9b59368'),()=>this.openHint(),22).bg;
    this.text(1650,96,text('t_be3d3e7be90cc6e357db'),14,'#d5c5a3',530);
    this.previousPage=this.smallButton(this.root,680,470,220,42,text('t_cf47bf01ca2d4be9a7af'),()=>this.changePage(-1),18);
    this.nextPage=this.smallButton(this.root,1240,470,220,42,text('t_22730864a426b31fa91a'),()=>this.changePage(1),18);
    this.pageLabel=this.text(960,470,'',19,'#ffe3a0',300);
    this.dialogue=new CourtDialogue(this);
  },
  createTrustMeter() {
    this.rect(1650,275,420,310,0x18130f,.92).setStrokeStyle(2,0x9b8052);
    this.text(1650,145,text('t_576e5b6d3fd66512ba0f'),20,'#ffe3a0',390);
    this.meter=this.add.graphics();this.root.add(this.meter);
    this.trustValue=this.text(1650,323,'',30,'#ffe3a0',350);
    this.text(1650,366,`${text('t_9d7f2b2874f5f861b9ab')}${COURT_CONFIG.convictionThreshold}`,18,'#d5c5a3',390);
    const bonus=this.record.facts.courtRapportBonus??0,rapport=this.record.facts.courtRapport;
    this.rapportText=this.text(1650,402,rapport===undefined?text('t_93c534eea402e6c1b932'):
      `${text('t_37a7768eccdc0419d750')}${rapport}${text('t_b55cd8d99aaa449e79f1')}${bonus}`,18,'#98d6b0',390);
  },
  drawTrustMeter() {
    const g=this.meter;if(!g)return;
    const point=(v,r=135)=>({x:1650+Math.cos(Math.PI+Math.PI*v/100)*r,y:308+Math.sin(Math.PI+Math.PI*v/100)*r});
    g.clear();for(let v=0;v<100;v++){const a=point(v),b=point(v+1);g.lineStyle(18,v<35?0xb96150:v<COURT_CONFIG.convictionThreshold?0xd1aa56:0x79b68a,1);g.lineBetween(a.x,a.y,b.x,b.y);}
    for(let v=0;v<=100;v+=10){const a=point(v,120),b=point(v,147);g.lineStyle(2,0xf6e6c0,.8);g.lineBetween(a.x,a.y,b.x,b.y);}
    const a=point(COURT_CONFIG.convictionThreshold,112),b=point(COURT_CONFIG.convictionThreshold,152);
    g.lineStyle(5,0xffffff,1);g.lineBetween(a.x,a.y,b.x,b.y);
    const value=Phaser.Math.Clamp(this.record.trust,0,100),needle=point(value,107);
    g.lineStyle(5,0xffefb5,1);g.lineBetween(1650,308,needle.x,needle.y);g.fillStyle(0xffefb5,1);g.fillCircle(1650,308,8);
    this.trustValue.setText(`${value}${text('t_2f07766fd476de0ab959')}`);
  },
  createOverlays() {
    this.infoText=this.text(760,415,'',20,'#ffe3a0',1250).setBackgroundColor('#1a1410').setPadding(12,8).setVisible(false);
    if(this.backgroundFailed)this.showInfo(text('t_968cbc9e0f433d8d92e6'));
  },
  showInfo(message) {this.infoTimer?.remove(false);this.infoText?.setText(message).setVisible(true);
    this.infoTimer=this.time.delayedCall(5000,()=>{this.infoTimer=null;this.infoText?.setVisible(false);});},
  render() {
    const r=this.record;if(!r)return;
    this.drawTrustMeter();
    try {
      let title,messages,choices;
      if(r.phase==='question'){
        const q=r.questions[r.index];if(!q||q.answers?.length!==4){this.showRenderError();return;}
        title=`${q.side==='prosecutor'?text('t_5ae131912dad5af8ebe5'):text('t_9f3bed01ba593455014c')}${text('t_3b2e8119b6fcc97df985')}${r.index+1}${text('t_8a5edab282632443219e')}${r.questions.length}`;
        // Pełne odpowiedzi w dymkach; selektory po prawej odnoszą się do ich numerów.
        messages=[{speaker:'npc',text:q.text+'\n\n'+q.answers.map((a,i)=>`${i+1}. ${a.text}`).join('\n\n')}];
        choices=q.answers.map((a,i)=>({label:`Answer ${i+1}`}));
      }else if(r.phase==='feedback'){
        title=text('t_fe2ed2b3a64b2f8c2b78');messages=[{speaker:'npc',text:r.feedback}];choices=[{label:text('t_4dda5b3688460481be8d')}];
      }else if(r.phase==='verdict'){
        title=text('t_b5a12b170c05f093fd1c');const yes=r.verdict==='convicted';
        messages=[{speaker:'npc',text:(yes?text('t_f54758ef7109892cc2e9'):text('t_36e4fe0854e8b64decbe'))+(r.verdictExplanation?`\n\n${r.verdictExplanation}`:'')}];
        choices=[{label:yes?text('t_056680b1b366e9e15a76'):text('t_010008e310e8969f0576')}];
      }else {this.showRenderError();return;}
      this.heading.setText(title);this.dialogue.show({title,messages,choices});
    }catch(error){console.error('[CourtScene] Layout:',error);this.showRenderError();}
  },
  renderPage() {this.dialogue?.shared.panel?.renderTextPage();},
  changePage(delta) {if(this.busy||this.hintModal||this.time.now<this.inputLockUntil)return;this.dialogue?.turn(delta);},
  showRenderError() {
    this.busy=true;this.closeHint();
    this.heading?.setText(text('t_29ade348e70b7fde88ff'));
    this.dialogue?.show({title:text('t_29ade348e70b7fde88ff'),messages:[{speaker:'note',text:text('t_768203c8619f0eab235e')}],choices:[]});
    this.notice?.setText(text('t_d0810f3f6138cde6789c'));
  }
};
