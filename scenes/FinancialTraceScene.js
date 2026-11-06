import { BaseScene } from './BaseScene.js';
import { financialTraceData as DATA,getFinancialTraceStory,storeFinancialTrace } from '../financialTraceService.js';
import { normalizeFinancial,chooseFinancialTransaction,chooseAlteredSeal } from './financial/FinancialTraceModel.js';
export class FinancialTraceScene extends BaseScene{
 constructor(){super({key:'FinancialTraceScene'});}
 init(data={}){this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;this.progress=null;this.closing=false;this.describe=false;this.message='';this.savedOk=null;this.layers=[];this.parentPaused=false;this.lockUntil=0;}
 preload(){if(!this.textures.exists('pi_phone_desk'))this.load.image('pi_phone_desk','assets/ui/pi-phone/desk.jpg');}
 create(){
  super.create();const s=getFinancialTraceStory();this.allowed=this.preview||s.eligible;this.progress=normalizeFinancial(DATA,this.preview?null:s);
  this.root=this.add.container(0,0);this.root.add(this.add.image(800,500,'pi_phone_desk').setDisplaySize(1600,1000));this.root.add(this.add.rectangle(800,500,1600,1000,0x000000,0.65));
  this.text(740,55,'JOHN / FINANCIAL TRAIL',24,1350,'#ffe2ae',this.root,'PressStart2P');this.button(1440,55,'BACK / ESC',()=>this.closeVisit(),this.root);
  this.content=this.add.container(0,0);this.root.add(this.content);this.render();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',e=>{if(!e.repeat)this.closeVisit();});
  this.suspend();this.events.once('shutdown',()=>{this.restore();this.onFinished=null;});
 }
 text(x,y,value,size=25,width=1400,color='#342d23',parent=this.content,font='SpecialElite'){const t=this.add.text(x,y,value,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:6}).setOrigin(.5);parent.add(t);return t;}
 button(x,y,value,callback,parent=this.content){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:'23px',color:'#ffe2ae',backgroundColor:'#294331',padding:{x:18,y:12},align:'center'}).setOrigin(.5).setInteractive({useHandCursor:true});t.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation();if(!this.closing&&this.time.now>=this.lockUntil){this.lockUntil=this.time.now+180;callback();}});parent.add(t);return t;}
 persist(){if(!this.preview&&this.allowed)this.savedOk=storeFinancialTrace(this.progress).saved;}
 render(){
  this.content.removeAll(true);this.content.add(this.add.rectangle(800,515,1480,790,0xeee2c4).setStrokeStyle(4,0xa18b55));
  if(!this.allowed){this.text(800,450,'Complete mission ten, the medical review and Holly\'s financial-record conversation first.',30);return;}
  if(this.progress.companyCompleted){this.text(800,270,'PRIOR SEARCH / COMPANY CONFIRMED',31);this.text(800,470,'Holly commissioned a search before your retainer.\nThe company confirms she received and acknowledged\na survival verification before hiring you.\n\nThe altered receipt does not identify its forger.\nThis does not establish an attempted killing or John\'s address.',29);this.text(800,735,DATA.objective,25);return;}
  if(this.progress.alteredId){
   this.text(800,270,'ALTERED COPY IDENTIFIED',31);this.text(800,450,'The receipt dated after your retainer carries a mismatched seal.\nThe earlier payment points to Second Opinion Tracing.\n\nReturn to your PI telephone. The company appears in its directory.\nAsk the company to verify SOT-17 before concluding what Holly knew.',28);
   this.text(800,715,this.preview?'Preview stops here. It does not unlock a real contact.':'Use the phone directory; finish the company conversation to record its confirmation.',23);return;
  }
  if(!this.progress.transactionId){
   this.text(800,200,'DAY 0 = THE START OF YOUR RETAINER',27);this.text(800,250,'These are supplied copies, not a live bank connection. Select the payment worth following up.',23);
   DATA.transactions.forEach((row,i)=>{const y=360+i*145;this.button(410,y,row.payee,()=>{const r=chooseFinancialTransaction(DATA,this.progress,row.id);this.progress=r.state;this.message=r.ok?'':'That is not the tracing enquiry. Check the payee and memo.';this.persist();this.render();});this.text(1030,y,`Day ${row.offset>0?'+':''}${row.offset} / $${row.amount}\n${row.reference} / ${row.memo}`,24,650);});
  }else{
   this.text(800,185,'SOT-17 / WHICH COPY HAS THE ALTERED SEAL?',27);
   this.drawSeal(800,320,DATA.specimen);this.text(800,440,'COMPANY SEAL SPECIMEN',21);
   DATA.copies.forEach((copy,i)=>{const x=410+i*780;this.text(x,300,copy.title,26,600);this.text(x,360,`Receipt SOT-17 / Day ${copy.offset>0?'+':''}${copy.offset}`,24,600);this.drawSeal(x,525,copy.seal);this.button(x,720,'FLAG THIS COPY',()=>{const r=chooseAlteredSeal(DATA,this.progress,copy.id);this.progress=r.state;this.message=r.ok?'':'That seal matches the specimen. Inspect the notch and dots.';this.persist();this.render();});
    if(this.describe)this.text(x,650,this.sealDescription(copy.seal),20,620);
   });
   this.button(800,820,this.describe?'HIDE DESCRIPTIONS':'DESCRIBE SEALS / FREE',()=>{this.describe=!this.describe;this.render();});
   if(this.describe)this.text(800,465,this.sealDescription(DATA.specimen),18,500);
  }
  this.text(800,900,this.message||'Compare sources. Wrong selections do not cost points or resources.',22);
  this.text(800,965,this.preview?'PREVIEW / no story changes':this.savedOk===false?DATA.messages.saveFailed:'Progress saved when you make a selection or leave.',18,1450,'#ffe2ae');
 }
 sealDescription(seal){return`Notch: ${seal.notch}. Dots: ${seal.dots}. Centre: ${seal.center}.`;}
 drawSeal(x,y,seal){
  const g=this.add.graphics();this.content.add(g);g.lineStyle(4,0x734a3e,.9);g.strokeCircle(x,y,64);g.lineStyle(2,0x734a3e,.9);g.strokeCircle(x,y,54);
  const direction=seal.notch==='right'?1:-1;g.lineStyle(9,0xeee2c4,1);g.lineBetween(x+direction*55,y,x+direction*69,y);
  for(let i=0;i<seal.dots;i++){g.fillStyle(0x734a3e,.9);g.fillCircle(x+(i-(seal.dots-1)/2)*17,y+34,4);}
  this.text(x,y-8,seal.center,41,100,'#734a3e');
 }
 layout(){if(!this.root)return;const{width,height}=this.scale,s=Math.min(width/1600,height/1000);this.root.setScale(s).setPosition((width-1600*s)/2,(height-1000*s)/2);}
 suspend(){this.layers=['PlayerHudScene','UIScene','NewsHud'].filter(k=>this.isSceneActive(k)).map(key=>{const visible=this.getRegisteredScene(key).sys.settings.visible;this.scene.setVisible(false,key);this.scene.pause(key);return{key,visible};});if(this.returnSceneKey&&this.isSceneActive(this.returnSceneKey)){this.parentPaused=true;this.scene.pause(this.returnSceneKey);}}
 restore(){for(const{key,visible}of this.layers){if(!this.hasScene(key))continue;this.scene.setVisible(visible,key);if(this.isScenePaused(key))this.scene.resume(key);}this.layers=[];if(this.parentPaused&&this.isScenePaused(this.returnSceneKey))this.scene.resume(this.returnSceneKey);this.parentPaused=false;}
 closeVisit(){if(this.closing)return;this.closing=true;this.persist();const callback=this.onFinished;this.onFinished=null;this.restore();try{callback?.({preview:this.preview,completed:this.progress.companyCompleted,companyUnlocked:Boolean(this.progress.alteredId),saved:this.savedOk});}finally{this.scene.stop();}}
}
