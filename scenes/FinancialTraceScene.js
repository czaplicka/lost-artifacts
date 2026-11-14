import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { financialTraceData as DATA,getFinancialTraceStory,storeFinancialTrace } from '../financialTraceService.js';
import { normalizeFinancial,chooseFinancialTransaction,chooseAlteredSeal } from './financial/FinancialTraceModel.js';
export class FinancialTraceScene extends BaseScene{
 constructor(){super({key:'FinancialTraceScene'});}
 init(data={}){this.preview=data.preview===true;this.returnSceneKey=data.returnSceneKey??null;this.onFinished=typeof data.onFinished==='function'?data.onFinished:null;this.progress=null;this.closing=false;this.describe=false;this.message='';this.savedOk=null;this.layers=[];this.parentPaused=false;this.lockUntil=0;}
 preload(){if(!this.textures.exists('pi_phone_desk'))this.load.image('pi_phone_desk','assets/ui/pi-phone/desk.webp');}
 create(){
  super.create();const s=getFinancialTraceStory();this.allowed=this.preview||s.eligible;this.progress=normalizeFinancial(DATA,this.preview?null:s);
  this.root=this.add.container(0,0);this.root.add(this.add.image(800,500,'pi_phone_desk').setDisplaySize(1600,1000));this.root.add(this.add.rectangle(800,500,1600,1000,0x000000,0.65));
  this.text(740,55,__dialogueText("scenes/FinancialTraceScene.js", "t_0350f6947d6339be077c"),24,1350,'#ffe2ae',this.root,'PressStart2P');this.button(1440,55,__dialogueText("scenes/FinancialTraceScene.js", "t_a31e9f98f863454d2602"),()=>this.closeVisit(),this.root);
  this.content=this.add.container(0,0);this.root.add(this.content);this.render();this.layout();this.trackInputEvent(this.scale,'resize',this.layout);
  if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',e=>{if(!e.repeat)this.closeVisit();});
  this.suspend();this.events.once('shutdown',()=>{this.restore();this.onFinished=null;});
 }
 text(x,y,value,size=25,width=1400,color='#342d23',parent=this.content,font='SpecialElite'){const t=this.add.text(x,y,value,{fontFamily:`${font}, monospace`,fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:6}).setOrigin(.5);parent.add(t);return t;}
 button(x,y,value,callback,parent=this.content){const t=this.add.text(x,y,value,{fontFamily:'SpecialElite',fontSize:'23px',color:'#ffe2ae',backgroundColor:'#294331',padding:{x:18,y:12},align:'center'}).setOrigin(.5).setInteractive({useHandCursor:true});t.on('pointerdown',(p,x,y,e)=>{e?.stopPropagation();if(!this.closing&&this.time.now>=this.lockUntil){this.lockUntil=this.time.now+180;callback();}});parent.add(t);return t;}
 persist(){if(!this.preview&&this.allowed)this.savedOk=storeFinancialTrace(this.progress).saved;}
 render(){
  this.content.removeAll(true);this.content.add(this.add.rectangle(800,515,1480,790,0xeee2c4).setStrokeStyle(4,0xa18b55));
  if(!this.allowed){this.text(800,450,__dialogueText("scenes/FinancialTraceScene.js", "t_a1dbf21d31a8152408fc"),30);return;}
  if(this.progress.companyCompleted){this.text(800,270,__dialogueText("scenes/FinancialTraceScene.js", "t_ebeea2da7c8073672252"),31);this.text(800,470,__dialogueText("scenes/FinancialTraceScene.js", "t_28d11efe2a2b7be48e28"),29);this.text(800,735,DATA.objective,25);return;}
  if(this.progress.alteredId){
   this.text(800,270,__dialogueText("scenes/FinancialTraceScene.js", "t_30b4ab8ee5b87326c352"),31);this.text(800,450,__dialogueText("scenes/FinancialTraceScene.js", "t_04474acb5dc546140ac9"),28);
   this.text(800,715,this.preview?__dialogueText("scenes/FinancialTraceScene.js", "t_22edab454b09912cd817"):__dialogueText("scenes/FinancialTraceScene.js", "t_8dc708f31ead21b5f7d3"),23);return;
  }
  if(!this.progress.transactionId){
   this.text(800,200,__dialogueText("scenes/FinancialTraceScene.js", "t_4ac53b5f36571ab3fdb2"),27);this.text(800,250,__dialogueText("scenes/FinancialTraceScene.js", "t_b1fae26e3d1c6ec61733"),23);
   DATA.transactions.forEach((row,i)=>{const y=360+i*145;this.button(410,y,row.payee,()=>{const r=chooseFinancialTransaction(DATA,this.progress,row.id);this.progress=r.state;this.message=r.ok?'':__dialogueText("scenes/FinancialTraceScene.js", "t_c1059c282c6731b5f295");this.persist();this.render();});this.text(1030,y,`${__dialogueText("scenes/FinancialTraceScene.js", "t_df2441a485d20426bd94")}${row.offset>0?'+':''}${row.offset}${__dialogueText("scenes/FinancialTraceScene.js", "t_dfd7a1215ec723c23ecf")}${row.amount}${__dialogueText("scenes/FinancialTraceScene.js", "t_01ba4719c80b6fe911b0")}${row.reference}${__dialogueText("scenes/FinancialTraceScene.js", "t_005e1574a2b5c8163046")}${row.memo}`,24,650);});
  }else{
   this.text(800,185,__dialogueText("scenes/FinancialTraceScene.js", "t_8a8121104a835e234163"),27);
   this.drawSeal(800,320,DATA.specimen);this.text(800,440,__dialogueText("scenes/FinancialTraceScene.js", "t_aa92d62e71408787cc06"),21);
   DATA.copies.forEach((copy,i)=>{const x=410+i*780;this.text(x,300,copy.title,26,600);this.text(x,360,`${__dialogueText("scenes/FinancialTraceScene.js", "t_f6bc3ae3a1f81fb76348")}${copy.offset>0?'+':''}${copy.offset}`,24,600);this.drawSeal(x,525,copy.seal);this.button(x,720,__dialogueText("scenes/FinancialTraceScene.js", "t_48348a655a2bb811c356"),()=>{const r=chooseAlteredSeal(DATA,this.progress,copy.id);this.progress=r.state;this.message=r.ok?'':__dialogueText("scenes/FinancialTraceScene.js", "t_64c2089ca1cbdfbb18b1");this.persist();this.render();});
    if(this.describe)this.text(x,650,this.sealDescription(copy.seal),20,620);
   });
   this.button(800,820,this.describe?__dialogueText("scenes/FinancialTraceScene.js", "t_420269d948dce02a7a74"):__dialogueText("scenes/FinancialTraceScene.js", "t_a8c0d3f18708c1704c4c"),()=>{this.describe=!this.describe;this.render();});
   if(this.describe)this.text(800,465,this.sealDescription(DATA.specimen),18,500);
  }
  this.text(800,900,this.message||__dialogueText("scenes/FinancialTraceScene.js", "t_d29a1c5e8d3e2a7763b2"),22);
  this.text(800,965,this.preview?__dialogueText("scenes/FinancialTraceScene.js", "t_db1d7313ec962ed15287"):this.savedOk===false?DATA.messages.saveFailed:__dialogueText("scenes/FinancialTraceScene.js", "t_e380548e238ca79d193f"),18,1450,'#ffe2ae');
 }
 sealDescription(seal){return`${__dialogueText("scenes/FinancialTraceScene.js", "t_a316ed40fd04570b6587")}${seal.notch}${__dialogueText("scenes/FinancialTraceScene.js", "t_6a10e3cf395c14fa7e76")}${seal.dots}${__dialogueText("scenes/FinancialTraceScene.js", "t_b438ce546c8910eca87f")}${seal.center}${__dialogueText("scenes/FinancialTraceScene.js", "t_cdb4ee2aea69cc6a8333")}`;}
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
