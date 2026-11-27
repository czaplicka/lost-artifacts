import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ComputerThiefdokuArt } from './ComputerThiefdokuArt.js';
import { thiefdokuService, prepareDailyPuzzle } from '../../systems/thiefdoku/ThiefdokuService.js';
import { thiefdokuColumnLabel, thiefdokuCellLabel, fillThiefdokuText } from '../../systems/thiefdoku/ThiefdokuPuzzle.js';

const ROOM_SHORT={bathroom:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9ecf208936ec2a6bde91"),kitchen:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6095fd85b9a8a55cedb0"),bedroom:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_acb806eb01986ad2952c"),living:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_02561a65476ac6b02729"),study:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c022e98ff6f1422c4259"),dining:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f50f2787146052fedca3"),guest_room:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_16ceb2796ccd9d52d4f2"),laundry:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f70f1b7b460f75de275f"),conservatory:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_4d9ca3ee5a3346324a34"),attic:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_4c0b97033375f9eff927"),gallery:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_316a1d8733d73abafc88"),sculpture_hall:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_d0d9c4faa95203e8a14f"),archive:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b22a9799327ae5c2ede9"),restoration_lab:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7a62e3ac3d7c06e27346"),museum_reception:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_288d768d7c3c56a4c0fc"),gift_shop:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1ed8f0748b4186f626eb"),security:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c3a409ae6f7ebfb40817"),exhibit_hall:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2e07c3fd5c293275c791"),museum_kitchen:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6095fd85b9a8a55cedb0"),museum_bathroom:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fc233d527d220e5bea38"),reception:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f850633979e8f94cb2e2"),open_office:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_5e696ec8a6a12d4335db"),conference:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c944f09f101b3f54923d"),office_kitchen:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6095fd85b9a8a55cedb0"),ceo_office:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_57f0df0e3d01f3f2b0aa"),library:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_d77982267d9699c2a57b"),copy_room:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1ccc2ff8d04ed7150540"),accounts:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_681649696598cced9230"),break_room:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b4534ebcc988f3101cc8"),office_bathroom:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fc233d527d220e5bea38")};
const LABEL={
 title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8cdcfff6982ee24638cd"),medals:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7cd55983a979c43b65af"),solved:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_38df84ca9b8cfdcd4c0d"),
 prev:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_39a40026763d321d830b"),next:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7a66eabf637f6a4c162d"),cancel:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ad8d698573fcb090121f"),close:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f13a1ed0cf3c4197ec8f"),
 tries:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6d68503781948f577599"),innocent:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_5c18b45a6a4d891d375e"),cleared:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2026e813d70cc656862b"),suspect:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_edfa2c31b6de69133e64"),
 cross:'X',erase:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fc0510589f8e26ed575c"),place:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_068853f9278bb1599213"),undo:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6f8365b681f85c9b5633"),zoom:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b842a849cdda253cb5b9"),all:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b5c7aed7cd2a308523e7"),
 up:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_42cb4e6f84970e97d515"),down:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c1ad8f358a0652523011"),left:'<',right:'>',help:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_37a6760fa43caf5b1ea0"),
 topLeft:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_bf2796080e9b4284a5bd"),
 legend:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1664ca0e8cafe47f1635"),
 woman:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_cf2e5bff1ef03dcd20d1"),man:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_48b676e2b107da679512")
};
const GROUP_LABEL={staff:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1562206543da764123c2"),resident:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_84816ff383c826e9c11e"),visitor:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_5f14f9e6d80f802a6526")};
const GOLD=0xd4af37;
// The layout is designed for this area; smaller windows get a scaled copy.
const DESIGN_W=720,DESIGN_H=460,MIN_SCALE=0.45,PER_PAGE=4,DRAG_DISTANCE=8,INIT_RETRY_MS=10000;
const KEY_TOOLS={KeyX:'cross',KeyE:'erase',KeyP:'place'};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const SUSPECT_QUIPS={
 curator:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_95f21c7d60cb2f9410ce"),
 guard:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_48959d24ee670edd698f"),
 assistant:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2e2239d2e5fa730b30f2"),
 cleaner:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b9606b3036ac6c7c4967"),
 cook:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_cbd99fc7e85db43c6525"),
 gardener:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1386b23bc7e6b617bae4"),
 butler:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_255c9355a0a6bd49328e"),
 guest:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_3b4d2fa4e74c385f2fbd"),
 driver:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f6f40b4a8c6498ad3092"),
 neighbour:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_10b7a65dbee50ea41f2f")
};
const PLACE_QUIPS=[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_936f168c5989db3bc3c8"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f2e531e40a2282babb9b"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_0eac9f4467895117ee9c"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e2ff4341f7d9509d45ca")];
const WRONG_QUIPS=[n=>`${n}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1d8f92abe0778db21bd3")}`,n=>`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_3e7a525b547552d3f09c")}${n}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8dccf256f6d5783e62bb")}${n}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b7eb990ff3e468e888c4")}`,n=>`${n}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_6bc41a523fc946b45e95")}`,n=>`${n}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_93b26c010b459842e1ef")}`];
const WIN_QUIPS=[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_900b1adc4328ab751add"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_491128cc033f61e1c2a9"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_04230d00491b1b49436b")];
const LOSE_QUIPS=[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2997dd962e402a823110"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_0f51fcac2516caa1276e"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1b95f83c3a59c8ceb345")];
const DENIED_QUIPS=[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_aa0a7dcbf9a7a5f29c63"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_62f5b4c5480109082d3e"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_709c72ac3ba81d52bbfa"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_0a938a7a4ba852d44f57")];
const HELP_PAGES=[
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_995f2589d22391a5173a"),lines:[
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_860e268dd5c87ea0921a"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9ae0d6a89a6de5bb7afb"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_3c24f1e09d5910d1e4a3"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8108d37d0ba377658655")
 ]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_335b345c171d96c575f0"),lines:[
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9bcc3fa7a4b60a16c1c2"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8fca28a95059299c55c3"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_a31d109f7b86f9fc3739"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_38c7c9540eabd8bd3af6")
 ]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c5cb1af6cd55caafd6f7"),lines:[
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1e3d1fc196b1fae607bb"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_979251fda4e098b90e9b"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8c9918df1346bb0f92a3"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_cd980401b79f984d2c8a")
 ]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e910f44e38d3a0d41585"),lines:[
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_d4c541065d29719e89a2"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b6c493bbea3a127aa1d5"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7877215c22d259587566"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_01e3c793cff7916d27a3")
 ]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_dacfbb8de26532d0a4e3"),lines:[
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e51a89d89e9c1bb16fce"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_89266d7b2b3f36d7908f"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c98b4edc03f9d447cd63"),
  __dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_021b1129a8562d44747d")
 ]}
];

export class ComputerThiefdoku {
 constructor(ui){
  this.ui=ui;this.art=new ComputerThiefdokuArt(ui);this.scene=ui.scene;
  this.puzzle=null;
  this.dailyServiceInstalled=false;
  this.page=0;this.statementPage={};this.accused=null;this.tool='place';this.confirmNew=false;
  this.zoom=false;this.offsetRow=0;this.offsetCol=0;this.help=false;this.helpPage=0;this.destroyed=false;
  this.fx=[];this.fxObjects=[];this.hoverCell=null;this.cursor=null;this.popId=null;this.slam=false;this.celebrate=false;
  // References to the drawn screen, used for partial updates between full renders.
  this.view=null;this.drag=null;
  this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_229003e1b589cae59f23");
  this.onKey=event=>this.handleKey(event);
  this.onPointerUp=pointer=>this.handlePointerUp(pointer);
  this.scene?.input?.keyboard?.on('keydown',this.onKey);
  this.scene?.input?.on('pointerup',this.onPointerUp);
 }
 // Stops tweens and removes the objects they animated (confetti), so nothing
 // waits for an onComplete that a stopped tween never fires.
 killFx(){
  for(const t of this.fx){try{t.stop?.();}catch(_){}}this.fx=[];
  for(const o of this.fxObjects){try{if(o.active)o.destroy();}catch(_){}}this.fxObjects=[];
 }
 // Game clock, the same one canIssueCase() uses; never the device clock.
 nextCaseIn(){
  const mins=Math.max(1,Math.ceil(Number(thiefdokuService.minutesToNextCase())||0));
  return `${Math.floor(mins/60)}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_17c76396f75dbc3aeb88")}${String(mins%60).padStart(2,'0')}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_62c66a7a5dd70c314661")}`;
 }
 hit(x,y,w,h,callback){
  const o=this.art.add(this.ui.scene.add.rectangle(x+w/2,y+h/2,w,h,0xffffff,0.001).setInteractive({useHandCursor:true}));
  o.on('pointerdown',pointer=>{if(this.destroyed)return;this.ui.options?.onSfx?.('click');callback(pointer);});return o;
 }
 button(x,y,w,label,callback,{enabled=true,active=false,hint=null}={}){
  const g=this.art.graphic();this.art.panel(g,x,y,w,25,active?0xf0d98e:enabled?0xf5eee1:0xd2c9bd,4);
  this.art.text(x+w/2,y+6,label,11,enabled?'#302833':'#8c8278').setOrigin(0.5,0);
  if(enabled)this.hit(x,y,w,25,callback);
  else if(hint)this.hit(x,y,w,25,()=>{this.feedback=hint;this.refresh();});
 }
 judge(id){
  if(!this.puzzle)return {status:'invalid',message:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_31592a35a472b0279260")};
  const result=this.puzzle.submitGuess(id);
  if(result.status==='success'){this.celebrate=true;this.slam=true;}
  if(result.status==='failed')this.slam=true;
  return result;
 }
 verdict(result,id){
  const name=this.puzzle?.getPersonName(id)||__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b764cdc0eab713746721");
  if(result.status==='success')return `${result.message} ${pick(WIN_QUIPS)}`;
  if(result.status==='wrong'){const left=this.puzzle.maxAttempts-this.puzzle.attempts;return `${pick(WRONG_QUIPS)(name)}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_36a9e7f1c95b82ffb997")}${left}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9b0180ed54ba8c2cb969")}${left===1?'':'s'}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_797b8c5f435dfe0bc8ab")}`;}
  if(result.status==='failed')return `${result.message} ${pick(LOSE_QUIPS)}`;
  return result.message;
 }
 reset(){
  if(this.destroyed||!this.puzzle)return;
  this.puzzle.reset();this.page=0;this.statementPage={};this.accused=null;
  this.confirmNew=false;this.tool='place';this.offsetRow=0;this.offsetCol=0;this.zoom=false;
  this.hoverCell=null;this.cursor=null;this.popId=null;this.slam=false;this.celebrate=false;this.drag=null;
  this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_18acc03041c7229ec86e");this.ui.render();
 }
 requestNew(){
  if(this.destroyed||!this.puzzle)return;
  if(!thiefdokuService.canIssueCase()){this.feedback=pick(DENIED_QUIPS);this.refresh();return;}
  if(this.puzzle.completed||this.puzzle.failed||this.confirmNew){
   try{this.reset();}catch(error){
    // The service restores the previous case; the puzzle keeps its old data.
    console.error('[Thiefdoku] New case generation failed:',error);
    this.confirmNew=false;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2da30a8e66e035eda690");this.ui.render();
   }
   return;
  }
  this.confirmNew=true;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_dfd1ed4fd368e2441c4f");this.ui.render();
 }
 /* ---------------------------------------------------------------- */
 /*  Full render                                                       */
 /* ---------------------------------------------------------------- */
 render(){
  if(this.destroyed||!this.ui.window)return;
  this.view=null;
  if(!this.puzzle){
   if(!thiefdokuService.isInstalled()){
    this.art.text(this.ui.window.x+30,this.ui.window.y+60,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_75d119b7c7f0d225d02b"),15,'#302833',this.ui.window.w-60);
    return;
   }
   // After a failure, wait before trying again instead of regenerating on every render.
   if(this.initFailedAt&&Date.now()-this.initFailedAt<INIT_RETRY_MS){
    this.art.text(this.ui.window.x+30,this.ui.window.y+60,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2da30a8e66e035eda690"),15,'#a03d46',this.ui.window.w-60);
    return;
   }
   try{prepareDailyPuzzle(this.ui);this.initFailedAt=0;}catch(error){
    this.initFailedAt=Date.now();
    console.error('[Thiefdoku] Daily case initialization failed:',error);
    this.art.text(this.ui.window.x+30,this.ui.window.y+60,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2da30a8e66e035eda690"),15,'#a03d46',this.ui.window.w-60);
    return;
   }
   if(!this.puzzle)return;
  }
  this.killFx();
  const b=this.ui.window,a=this.art,s=this.puzzle.getState();if(!s.allPlaced)this.accused=null;
  const x=b.x+12,y=b.y+43,w=b.w-24,h=b.h-84;
  if(w>=DESIGN_W&&h>=DESIGN_H){this.drawScreen(x,y,w,h,s);return;}
  // Smaller windows show the same screen scaled down instead of locking the game.
  const bg=a.graphic();bg.fillStyle(0xf1ebe5,1);bg.fillRect(x,y,w,h);
  const scale=Math.min(w/DESIGN_W,h/DESIGN_H);
  if(scale<MIN_SCALE){a.text(x+20,y+20,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_d2efcfb94d66b9a29d84"),15,'#302833',w-40);return;}
  const stage=this.ui.scene.add.container(x+(w-DESIGN_W*scale)/2,y).setScale(scale);this.ui.drawing.add(stage);
  a.base=stage;
  try{this.drawScreen(0,0,DESIGN_W,DESIGN_H,s);}finally{a.base=null;}
 }
 drawScreen(x,y,w,h,s){
  const a=this.art,bg=a.graphic();
  bg.fillStyle(0xf1ebe5,1);bg.fillRect(x,y,w,h);
  bg.lineStyle(1,0x302838,0.05);for(let ly=y+44;ly<y+h;ly+=22)bg.lineBetween(x,ly,x+w,ly);
  const view=this.view={root:a.base||this.ui.content||this.ui.root,cards:new Map(),board:null,header:null,feedback:null,structural:this.structuralKey(s)};
  this.drawHeader(x,y,w,s);
  const leftW=Math.min(354,Math.floor(w*0.38)),cardY=y+76,cardH=Math.floor((h-150)/2),gap=10;
  const cardW=Math.floor((leftW-gap)/2),pages=Math.ceil(s.people.length/PER_PAGE);this.page=Math.max(0,Math.min(this.page,pages-1));
  this.withProbe(cardW-16,()=>s.people.slice(this.page*PER_PAGE,(this.page+1)*PER_PAGE).forEach((p,i)=>
   this.drawCardView(p,{x:x+9+(i%2)*(cardW+gap),y:cardY+Math.floor(i/2)*(cardH+8),w:cardW,h:cardH},s)));
  const navY=y+h-65;
  this.button(x+10,navY,55,LABEL.prev,()=>this.turnPage(-1),{enabled:this.page>0});a.text(x+74,navY+7,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e8fe0fd1a401c5613e4d")}${this.page+1}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${pages}`,11);
  this.button(x+leftW-52,navY,55,LABEL.next,()=>this.turnPage(1),{enabled:this.page<pages-1});
  const availableW=w-leftW-85,side=Math.floor(Math.min(h-139,availableW)),bx=x+leftW+29+(availableW-side)/2,by=y+85;
  this.drawBoard(bx,by,side,s);this.drawTools(x+w-48,by,s);
  a.text(bx,by+side+8,LABEL.legend,10,'#5b474b',side);
  this.drawStamp(bx,by,side,s);
  if(this.help)this.drawHelp(bx,by,side);
  const footerY=y+h-32,canNew=thiefdokuService.canIssueCase(),over=s.completed||s.failed,pending=this.confirmNew&&!over;
  const label=!canNew?`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f04bd3e522e9debc102c")}${this.nextCaseIn()}`:over?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fa558aa2d550c86d76e4"):pending?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7ccd7455c04cd9dccec3"):__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1cdca5bc751013a144d3");
  this.button(x+10,footerY,150,label,()=>this.requestNew(),{enabled:canNew,hint:canNew?null:pick(DENIED_QUIPS)});
  if(pending)this.button(x+166,footerY,65,LABEL.cancel,()=>{this.confirmNew=false;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_adbdfe16f573460dbc61");this.ui.render();});
  const fx=pending?x+240:x+172;
  view.feedback=a.text(fx,footerY+2,this.feedback,12,this.feedbackColor(s),x+w-fx-12);
 }
 feedbackColor(s){return s.completed?'#2d714d':s.failed?'#a03d46':'#6b444b';}
 drawHeader(x,y,w,s){
  const a=this.art,g=a.graphic();
  a.panel(g,x+6,y+4,w-12,36,0x2b2433,5);g.fillStyle(GOLD,1);g.fillRect(x+9,y+36,w-18,2);
  a.title(x+18,y+10,LABEL.title,18);
  a.text(x+178,y+8,`${s.themeName}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ffa9044b934017b2aed8")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fc191eafd9c50bef4eed")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ffa9044b934017b2aed8")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_34023a88446333c75d30")}`,11,'#e8dcc4');
  const bx=x+178,bw=Math.min(220,Math.floor(w*0.28));
  this.view.header={g:a.graphic(),text:a.text(bx+bw+8,y+22,'',10,'#e8dcc4'),bx,y,bw};
  this.drawProgress(s);
  const r=x+w-20;
  a.text(r,y+8,fillThiefdokuText(LABEL.medals,{count:thiefdokuService.getMedals()}),11,'#f0d98e').setOrigin(1,0);
  a.text(r,y+22,fillThiefdokuText(LABEL.solved,{count:s.solved}),10,'#bfb3c4').setOrigin(1,0);
  a.magnifier(x+22,y+58,18);
  a.text(x+38,y+46,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_859bb20bb8d5093a89a8")}${s.stolenItem}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f327f4cba9fca599dae4")}${s.roomNames[s.theftRoom].toLowerCase()}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_cdb4ee2aea69cc6a8333")}`,12,'#5b474b',w-60);
 }
 drawProgress(s){
  const {g,text,bx,y,bw}=this.view.header;g.clear();
  g.fillStyle(0x4a3f52,1);g.fillRect(bx,y+24,bw,6);g.fillStyle(0x7fc4a0,1);g.fillRect(bx,y+24,bw*s.placedCount/s.people.length,6);
  g.lineStyle(1,0xe8dcc4,0.6);g.strokeRect(bx,y+24,bw,6);
  text.setText(`${s.placedCount}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${s.people.length}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1da621181d3d2fdad1be")}`);
 }
 // Off-screen text used to measure statement wrapping; always removed again.
 withProbe(width,callback){
  this.probe=this.art.text(-10000,-10000,'',12,'#352e37',width);
  try{return callback();}finally{this.probe.destroy();this.probe=null;}
 }
 statementChunks(texts,width,maxLines){
  const probe=this.probe,chunks=[];probe.setWordWrapWidth(width);
  for(const text of texts){const lines=probe.getWrappedText(text);for(let i=0;i<lines.length;i+=maxLines)chunks.push(lines.slice(i,i+maxLines).join('\n'));}
  return chunks.length?chunks:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f90c7959cae2779e4a41")];
 }
 /* ---------------------------------------------------------------- */
 /*  Suspect cards                                                     */
 /* ---------------------------------------------------------------- */
 cardSig(p,s){
  return [s.selectedPersonId===p.id,s.board.some(row=>row.includes(p.id)),s.wrongAccusations.includes(p.id),s.allPlaced&&this.accused===p.id,this.statementPage[p.id]||0].join('|');
 }
 // Each card lives in its own container so it can be redrawn alone.
 drawCardView(p,box,s){
  const a=this.art,container=this.ui.scene.add.container(0,0);this.view.root.add(container);
  const previous=a.parent;a.parent=container;
  try{this.drawCard(box.x,box.y,box.w,box.h,p,s);}finally{a.parent=previous;}
  this.view.cards.set(p.id,{container,box,sig:this.cardSig(p,s)});
 }
 drawCard(x,y,w,h,p,s){
  const a=this.art,g=a.graphic(),selected=s.selectedPersonId===p.id,chosen=s.allPlaced&&this.accused===p.id,locked=s.completed||s.failed;
  const placed=s.board.some(row=>row.includes(p.id)),cleared=s.wrongAccusations.includes(p.id);
  g.fillStyle(0x342b37,0.16);g.fillRoundedRect(x+3,y+4,w,h,5);
  a.panel(g,x,y,w,h,selected?0xffedaa:placed?0xd6d5d1:0xfaf5ed,5);
  if(selected){g.lineStyle(3,GOLD,1);g.strokeRoundedRect(x+1,y+1,w-2,h-2,5);}
  if(chosen){g.lineStyle(3,0xb66b61,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,4);}
  a.clip(g,x+w-16,y-5);
  const portraitW=Math.min(52,w*0.32),portraitH=Math.min(60,h*0.32),px=x+8,py=y+7;
  a.panel(g,px-3,py-3,portraitW+6,portraitH+6,placed?0xc6c6c4:0xfff9ed,2);
  a.portrait(p,px,py,portraitW,portraitH,{muted:placed&&!selected});
  if(cleared){const xg=a.graphic();xg.lineStyle(3,0xb34a4a,0.85);xg.lineBetween(px,py,px+portraitW,py+portraitH);xg.lineBetween(px+portraitW,py,px,py+portraitH);}
  const metaX=px+portraitW+9,metaW=x+w-7-metaX;
  a.nameTag(metaX+metaW/2,y+17,p.name,metaW,16);
  a.text(metaX,y+31,p.role,9,'#5c535c',metaW);
  a.text(metaX,y+54,GROUP_LABEL[p.group]||p.group,9,'#5c535c',metaW);
  a.text(metaX,y+65,p.gender==='f'?LABEL.woman:LABEL.man,9,'#5c535c',metaW);
  const sy=y+82;
  if(!locked)this.hit(x+3,y+3,w-6,sy-y-6,pointer=>{
   if(this.toggleSelect(p.id))this.beginDrag(p.id,null,pointer);
   this.refresh();
  });
  const bottom=s.allPlaced?52:24,maxLines=Math.max(1,Math.floor((y+h-bottom-sy)/15));
  const chunks=this.statementChunks(s.clues.filter(c=>c.personId===p.id).map(c=>c.text),w-16,maxLines),index=Math.min(this.statementPage[p.id]||0,chunks.length-1);
  a.text(x+8,sy,chunks[index],12,'#352e37',w-16);
  const pagerY=y+h-(s.allPlaced?48:18);
  if(chunks.length>1){
   a.text(x+w-8,pagerY,`${index+1}/${chunks.length} >`,10,'#79566a').setOrigin(1,0);
   this.hit(x+5,sy,w-10,Math.max(15,pagerY+14-sy),()=>{this.statementPage[p.id]=(index+1)%chunks.length;this.refresh();});
  }
  if(s.allPlaced)this.button(x+7,y+h-29,w-14,cleared?LABEL.cleared:chosen?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_63b39c6d5a6528cc681e")+p.name:LABEL.suspect,()=>{
   if(!this.puzzle.allPlaced()){this.accused=null;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_31551b71219148998543");this.ui.render();return;}
   this.confirmNew=false;
   if(this.accused===p.id){this.feedback=this.verdict(this.judge(p.id),p.id);this.accused=null;}
   else{this.accused=p.id;this.feedback=`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_29742aa2e714f1f7a889")}${p.name}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_09d9f751cdc140eaa789")}`;}
   this.ui.render();
  },{enabled:!locked&&!cleared,active:chosen});
  if(cleared)a.stamp(x+w/2,y+h*0.6,LABEL.innocent,Math.max(10,Math.min(16,Math.floor(w/10))),0xb34a4a,-11).setAlpha(0.78);
 }
 // Returns true when the person is now selected.
 toggleSelect(id){
  const p=this.puzzle?.people.find(q=>q.id===id);if(!p||this.puzzle.completed||this.puzzle.failed)return false;
  this.tool='place';this.confirmNew=false;
  if(this.puzzle.selectedPersonId===id){this.puzzle.clearSelection();this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_06158db31f05320bf16f");return false;}
  this.puzzle.selectPerson(id);this.feedback=`${SUSPECT_QUIPS[id]||`${p.name}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b5651aaad22ac1af8ca1")}`}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e9271b345db13bef2346")}`;
  return true;
 }
 /* ---------------------------------------------------------------- */
 /*  Board                                                             */
 /* ---------------------------------------------------------------- */
 drawBoard(x,y,side,s){
  const a=this.art,sc=this.ui.scene,n=s.size,visible=this.zoom?Math.min(4,n):n,cell=side/visible,locked=s.completed||s.failed;
  const r0=this.zoom?Math.max(0,Math.min(this.offsetRow,n-visible)):0,c0=this.zoom?Math.max(0,Math.min(this.offsetCol,n-visible)):0;this.offsetRow=r0;this.offsetCol=c0;
  const shadow=a.graphic();shadow.fillStyle(0x2e2537,0.2);shadow.fillRect(x+6,y+8,side,side);
  const frame=a.graphic();frame.fillStyle(0x3a2f3f,1);frame.fillRoundedRect(x-4,y-4,side+8,side+8,5);frame.lineStyle(2,GOLD,0.9);frame.strokeRoundedRect(x-4,y-4,side+8,side+8,5);
  const coordinateLabel=a.text(x+side,y-31,this.hoverCell?thiefdokuCellLabel(this.hoverCell.r,this.hoverCell.c):LABEL.topLeft,10,'#5b474b').setOrigin(1,0);
  const layer=sc.add.container(x,y);a.add(layer);
  const board=this.view.board={x,y,side,cell,r0,c0,visible,layer,pieces:null,cells:new Map(),hover:null,showHover:null,coordinateLabel};
  const previous=a.parent;a.parent=layer;
  try{
   const floors=a.graphic();
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++)a.floor(floors,vc*cell,vr*cell,cell,s.layout[r0+vr][c0+vc],r0+vr,c0+vc);
   for(const o of [...s.objects].sort((p,q)=>(p.kind==='rug'?-1:0)-(q.kind==='rug'?-1:0))){
    if(o.row+o.h<=r0||o.col+o.w<=c0||o.row>=r0+visible||o.col>=c0+visible)continue;
    a.furniture(o,(o.col-c0)*cell,(o.row-r0)*cell,o.w*cell,o.h*cell);
   }
   const hover=board.hover=a.graphic();
   // Reads live puzzle state, so it stays correct after partial updates.
   board.showHover=(vr,vc)=>{
    if(this.destroyed||!hover.scene||!this.puzzle)return;
    hover.clear();
    const puzzle=this.puzzle,r=r0+vr,c=c0+vc,room=puzzle.layout[r][c],blocked=puzzle.isBlocked(r,c);
    if(coordinateLabel.scene)coordinateLabel.setText(thiefdokuCellLabel(r,c));
    hover.fillStyle(0xffffff,0.16);hover.fillRect(0,vr*cell,side,cell);hover.fillRect(vc*cell,0,cell,side);
    hover.fillStyle(0xfff2b0,0.18);
    for(let i=0;i<visible;i++)for(let j=0;j<visible;j++)if(puzzle.layout[r0+i][c0+j]===room)hover.fillRect(j*cell,i*cell,cell,cell);
    hover.lineStyle(2,blocked?0xb34a4a:0xfff2b0,0.95);hover.strokeRect(vc*cell+1,vr*cell+1,cell-2,cell-2);
    const sel=puzzle.people.find(p=>p.id===puzzle.selectedPersonId);
    if(sel&&!blocked&&this.tool==='place'){
     const px=vc*cell,py=vr*cell;hover.fillStyle(sel.shirt,0.6);
     hover.fillRoundedRect(px+cell*0.3,py+cell*0.4,cell*0.4,cell*0.38,cell*0.08);hover.fillCircle(px+cell*0.5,py+cell*0.3,cell*0.13);
    }
   };
   const grid=a.graphic();grid.lineStyle(1,0x302934,0.65);
   for(let i=0;i<=visible;i++){grid.lineBetween(i*cell,0,i*cell,side);grid.lineBetween(0,i*cell,side,i*cell);}
   const walls=a.graphic();walls.lineStyle(Math.max(4,cell*0.065),0x201e27,1);
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,room=s.layout[r][c],px=vc*cell,py=vr*cell;
    if(vr===0||s.layout[r-1][c]!==room)walls.lineBetween(px,py,px+cell,py);
    if(vc===0||s.layout[r][c-1]!==room)walls.lineBetween(px,py,px,py+cell);
    if(vr===visible-1)walls.lineBetween(px,py+cell,px+cell,py+cell);
    if(vc===visible-1)walls.lineBetween(px+cell,py,px+cell,py+cell);
   }
   const disp=s.objects.find(o=>o.kind==='display');
   if(disp&&disp.row>=r0&&disp.row<r0+visible&&disp.col>=c0&&disp.col<c0+visible){
    const m=a.magnifier((disp.col-c0+1)*cell-cell*0.2,(disp.row-r0)*cell+cell*0.22,cell*0.42);
    this.fx.push(sc.tweens.add({targets:m,scale:{from:0.85,to:1.15},duration:700,yoyo:true,repeat:-1,ease:'Sine.InOut'}));
   }
   for(const room of new Set(s.layout.flat())){
    let best=null;
    for(let vr=0;vr<visible;vr++)for(let start=0;start<visible;start++){
     if(s.layout[r0+vr][c0+start]!==room)continue;
     let len=0;while(start+len<visible&&s.layout[r0+vr][c0+start+len]===room)len++;
     const hasPerson=s.board[r0+vr].slice(c0+start,c0+start+len).some(Boolean),score=len-(hasPerson?0.4:0);
     if(!best||score>best.score)best={vr,start,len,score};
    }
    if(!best)continue;
    const text=ROOM_SHORT[room]||s.roomNames[room],font=Math.min(10,Math.max(7,best.len*cell/(text.length*0.72)));
    const tag=a.text((best.start+best.len/2)*cell,best.vr*cell+5,text,font,'#fff7ed').setOrigin(0.5,0);
    if(tag.width>best.len*cell-8)tag.setScale((best.len*cell-8)/tag.width,1);
    tag.setShadow(1,1,'#211c28',2,true,true);
   }
   board.pieces=sc.add.container(0,0);layer.add(board.pieces);
  }finally{a.parent=previous;}
  for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++)this.drawCell(r0+vr,c0+vc,s);
  const matrix=layer.getWorldTransformMatrix?.();
  if(matrix&&sc.make?.graphics){
   const top=matrix.transformPoint(0,0),bottom=matrix.transformPoint(side,side),maskGraphic=sc.make.graphics({add:false});
   maskGraphic.fillStyle(0xffffff,1);maskGraphic.fillRect(top.x,top.y,bottom.x-top.x,bottom.y-top.y);
   const mask=maskGraphic.createGeometryMask();layer.setMask(mask);layer.once('destroy',()=>{mask.destroy();maskGraphic.destroy();});
  }
  for(let i=0;i<visible;i++){
   a.text(x+i*cell+cell/2,y-15,thiefdokuColumnLabel(c0+i),10,'#6f6069').setOrigin(0.5,0);
   a.text(x-11,y+i*cell+cell/2,String(r0+i+1),10,'#6f6069').setOrigin(0.5);
  }
  const border=a.graphic();border.lineStyle(4,0x201e27,1);border.strokeRect(x,y,side,side);
  if(!locked){
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,zone=this.hit(x+vc*cell+2,y+vr*cell+2,cell-4,cell-4,pointer=>this.pressCell(r,c,pointer));
    zone.on('pointerover',()=>{this.hoverCell={r,c};board.showHover(vr,vc);});
    zone.on('pointerout',()=>{this.hoverCell=null;if(board.hover.scene)board.hover.clear();if(coordinateLabel.scene)coordinateLabel.setText(LABEL.topLeft);});
   }
   this.showHoverAt(this.hoverCell);
  }
 }
 cellSig(r,c,s){const id=s.board[r][c];return id?`p:${id}`:s.crosses[r][c]?'mark':s.autoCrosses[r][c]?'auto':'';}
 // Draws (or redraws) the pawn or cross of one square in its own container.
 drawCell(r,c,s){
  const board=this.view.board,key=r*s.size+c,sig=this.cellSig(r,c,s);
  board.cells.get(key)?.container?.destroy();
  if(!sig){board.cells.set(key,{container:null,sig});return;}
  const a=this.art,sc=this.ui.scene,cell=board.cell,px=(c-board.c0)*cell,py=(r-board.r0)*cell,id=s.board[r][c];
  const container=sc.add.container(0,0);board.pieces.add(container);
  const previous=a.parent;a.parent=container;
  try{
   if(!id){
    const manual=s.crosses[r][c],g=a.graphic();g.lineStyle(manual?3:1.8,manual?0x624151:0x806c84,manual?0.9:0.42);
    g.lineBetween(px+cell*0.32,py+cell*0.32,px+cell*0.68,py+cell*0.68);g.lineBetween(px+cell*0.68,py+cell*0.32,px+cell*0.32,py+cell*0.68);
   }else{
    const person=s.people.find(p=>p.id===id);
    if(this.popId===id){
     this.popId=null;
     const pc=sc.add.container(px+cell*0.5,py+cell*0.4);container.add(pc);a.parent=pc;
     a.pawn(person,-cell*0.36,-cell*0.36,cell*0.72);a.parent=container;
     pc.setScale(0.2);this.fx.push(sc.tweens.add({targets:pc,scale:1,duration:300,ease:'Back.Out'}));
    }else a.pawn(person,px+cell*0.14,py+cell*0.04,cell*0.72);
    a.nameTag(px+cell/2,py+cell-10,person.name,cell-5,Math.min(14,Math.max(11,cell*0.2)));
   }
  }finally{a.parent=previous;}
  board.cells.set(key,{container,sig});
 }
 showHoverAt(cellRef){
  const board=this.view?.board;if(!cellRef||!board?.showHover)return;
  const vr=cellRef.r-board.r0,vc=cellRef.c-board.c0;
  if(vr>=0&&vc>=0&&vr<board.visible&&vc<board.visible)board.showHover(vr,vc);
 }
 drawStamp(bx,by,side,s){
  if(!s.completed&&!s.failed)return;
  const size=Math.max(16,Math.min(34,Math.round(side*0.075)));
  const c=this.art.stamp(bx+side/2,by+side/2,s.completed?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_3825cb7a28815e93b278"):__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2a282ac69abf6004b01e"),size,s.completed?0x2d714d:0xa03d46,-12);
  if(this.slam){
   this.slam=false;c.setScale(2.6).setAlpha(0);
   this.fx.push(this.ui.scene.tweens.add({targets:c,scale:1,alpha:0.92,duration:340,ease:'Back.Out'}));
  }
  if(this.celebrate){this.celebrate=false;this.confetti(bx+side/2,by+side/2,side);}
 }
 confetti(cx,cy,side){
  const sc=this.ui.scene,colors=[GOLD,0xe0707f,0x7fc4a0,0x7f9be0,0xf5eee1];
  for(let i=0;i<46;i++){
   const p=this.art.add(sc.add.rectangle(cx,cy,5+Math.random()*4,3+Math.random()*4,colors[i%colors.length]));
   p.setAngle(Math.random()*360);this.fxObjects.push(p);
   this.fx.push(sc.tweens.add({targets:p,x:cx+(Math.random()-0.5)*side*1.2,y:cy+(Math.random()*0.8-0.1)*side*0.6,angle:p.angle+Math.random()*540,alpha:0,duration:900+Math.random()*700,ease:'Cubic.Out',onComplete:()=>{if(p.active)p.destroy();}}));
  }
 }
 /* ---------------------------------------------------------------- */
 /*  Partial update                                                    */
 /* ---------------------------------------------------------------- */
 // Anything outside the board squares, cards, progress bar and feedback line.
 structuralKey(s){
  return JSON.stringify([s.allPlaced,s.completed,s.failed,s.canUndo,s.attempts,this.page,this.zoom,this.offsetRow,this.offsetCol,
   this.help,this.helpPage,this.confirmNew,this.tool,this.accused,thiefdokuService.canIssueCase()]);
 }
 // Updates only what changed after a board or card action; anything that
 // moves buttons or layout falls back to a full render.
 refresh(){
  if(this.destroyed||!this.ui)return;
  const view=this.view;
  if(!view||!this.puzzle||!view.feedback?.scene||this.ui.app!=='thiefdoku'){this.ui.render();return;}
  const s=this.puzzle.getState();if(!s.allPlaced)this.accused=null;
  if(this.structuralKey(s)!==view.structural){this.ui.render();return;}
  try{
   const board=view.board;
   if(board?.pieces?.scene){
    for(let vr=0;vr<board.visible;vr++)for(let vc=0;vc<board.visible;vc++){
     const r=board.r0+vr,c=board.c0+vc;
     if((board.cells.get(r*s.size+c)?.sig??'')!==this.cellSig(r,c,s))this.drawCell(r,c,s);
    }
    this.showHoverAt(this.hoverCell);
   }
   const changed=[...view.cards].map(([id,card])=>[s.people.find(p=>p.id===id),card]).filter(([p,card])=>p&&card.sig!==this.cardSig(p,s));
   if(changed.length)this.withProbe(changed[0][1].box.w-16,()=>{for(const [p,card] of changed){card.container.destroy();this.drawCardView(p,card.box,s);}});
   this.drawProgress(s);
   view.feedback.setText(this.feedback).setColor(this.feedbackColor(s));
  }catch(error){
   console.error('[Thiefdoku] Partial update failed, redrawing:',error);
   this.ui.render();
  }
 }
 /* ---------------------------------------------------------------- */
 /*  Actions                                                           */
 /* ---------------------------------------------------------------- */
 clickCell(r,c){
  if(this.destroyed||!this.puzzle||this.puzzle.completed||this.puzzle.failed)return;
  this.confirmNew=false;
  if(this.puzzle.isBlocked(r,c)){this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_40d211b703d3658f83eb");this.refresh();return;}
  const id=this.puzzle.board[r][c];
  if(this.tool==='erase')this.puzzle.removePerson(r,c);
  else if(this.tool==='cross'){if(id)this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_a1fdce6982f505cac83a");else this.puzzle.toggleCross(r,c);}
  else if(this.puzzle.selectedPersonId){
   const chosen=this.puzzle.selectedPersonId;
   if(this.puzzle.placePerson(r,c)){this.popId=chosen;this.feedback=this.puzzle.allPlaced()?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_397e999c135a8183aa03"):pick(PLACE_QUIPS);}
  }
  else if(id){this.puzzle.removePerson(r,c);this.puzzle.selectPerson(id);this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_84d99fa5aa51c7582577");}
  else this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2e9cb880b9689a167b1e");
  if(!this.puzzle.allPlaced())this.accused=null;this.refresh();
 }
 // A press on a placed person picks them up; releasing elsewhere drops them.
 pressCell(r,c,pointer){
  const before=this.puzzle?.board[r][c];
  this.cursor={r,c};
  this.clickCell(r,c);
  if(before&&this.tool==='place'&&this.puzzle?.selectedPersonId===before)this.beginDrag(before,{r,c},pointer);
 }
 beginDrag(personId,from,pointer){
  this.drag=pointer?{personId,from,x:pointer.x,y:pointer.y,pointerId:pointer.id}:null;
 }
 handlePointerUp(pointer){
  const drag=this.drag;this.drag=null;
  if(!drag||!this.isActive()||pointer.id!==drag.pointerId)return;
  if(Math.hypot(pointer.x-drag.x,pointer.y-drag.y)<DRAG_DISTANCE)return;
  if(this.tool!=='place'||this.puzzle.selectedPersonId!==drag.personId)return;
  const target=this.cellAtPointer(pointer);
  if(drag.from&&target&&target.r===drag.from.r&&target.c===drag.from.c)return;
  if(target&&!this.puzzle.isBlocked(target.r,target.c)){this.cursor=target;this.clickCell(target.r,target.c);return;}
  // Picked up from the board but not dropped on a free square: put them back.
  if(drag.from&&this.puzzle.board[drag.from.r][drag.from.c]===null&&this.puzzle.undo()){
   if(!this.puzzle.allPlaced())this.accused=null;this.refresh();
  }
 }
 cellAtPointer(pointer){
  const board=this.view?.board;if(!board?.layer?.scene||!board.layer.getWorldTransformMatrix)return null;
  const camera=this.ui.scene.cameras?.main,world=camera?camera.getWorldPoint(pointer.x,pointer.y):{x:pointer.x,y:pointer.y};
  const local=board.layer.getWorldTransformMatrix().applyInverse(world.x,world.y);
  const vc=Math.floor(local.x/board.cell),vr=Math.floor(local.y/board.cell);
  if(vr<0||vc<0||vr>=board.visible||vc>=board.visible)return null;
  return {r:board.r0+vr,c:board.c0+vc};
 }
 setTool(tool){this.tool=tool;if(tool!=='place')this.puzzle.clearSelection();this.ui.render();}
 undo(){if(!this.puzzle.undo())return;if(!this.puzzle.allPlaced())this.accused=null;this.refresh();}
 toggleZoom(){if(this.puzzle.size<=4)return;this.zoom=!this.zoom;this.offsetRow=0;this.offsetCol=0;this.ui.render();}
 toggleHelp(){this.help=!this.help;this.ui.render();}
 turnPage(delta){
  const pages=Math.ceil(this.puzzle.people.length/PER_PAGE),page=Math.max(0,Math.min(pages-1,this.page+delta));
  if(page!==this.page){this.page=page;this.ui.render();}
 }
 /* ---------------------------------------------------------------- */
 /*  Keyboard                                                          */
 /* ---------------------------------------------------------------- */
 isActive(){
  const ui=this.ui;
  return Boolean(ui&&!this.destroyed&&!ui.destroyed&&ui.isOpen&&!ui.suspended&&!ui.booting&&!ui.menuOpen&&ui.app==='thiefdoku'&&this.puzzle&&this.view);
 }
 handleKey(event){
  if(!this.isActive())return;
  const target=event.target;
  if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||event.altKey)return;
  const code=event.code,locked=this.puzzle.completed||this.puzzle.failed;
  let handled=true;
  if(event.ctrlKey||event.metaKey){if(code==='KeyZ'&&!locked)this.undo();else handled=false;}
  else if(this.help){
   if(code==='ArrowRight'||code==='ArrowLeft'){const n=HELP_PAGES.length;this.helpPage=(this.helpPage+(code==='ArrowRight'?1:n-1))%n;this.ui.render();}
   else if(code==='KeyH'||code==='Enter'||code==='Space')this.toggleHelp();
   else handled=false;
  }
  else if(code==='ArrowUp')this.moveCursor(-1,0);
  else if(code==='ArrowDown')this.moveCursor(1,0);
  else if(code==='ArrowLeft')this.moveCursor(0,-1);
  else if(code==='ArrowRight')this.moveCursor(0,1);
  else if(code==='Enter'||code==='NumpadEnter'||code==='Space'){if(this.cursor&&!locked)this.clickCell(this.cursor.r,this.cursor.c);}
  else if(code==='Delete'||code==='Backspace'){
   if(this.cursor&&!locked&&this.puzzle.removePerson(this.cursor.r,this.cursor.c)){if(!this.puzzle.allPlaced())this.accused=null;this.refresh();}
  }
  else if(KEY_TOOLS[code]){if(!locked)this.setTool(KEY_TOOLS[code]);}
  else if(code==='KeyU'){if(!locked)this.undo();}
  else if(code==='KeyZ')this.toggleZoom();
  else if(code==='KeyH')this.toggleHelp();
  else if(code==='PageUp'||code==='PageDown')this.turnPage(code==='PageDown'?1:-1);
  else{
   const digit=/^(?:Digit|Numpad)(\d)$/.exec(code);
   if(digit){if(!locked)this.pickByNumber(Number(digit[1]));}
   else handled=false;
  }
  if(handled)event.preventDefault?.();
 }
 moveCursor(dr,dc){
  const n=this.puzzle.size,clampCell=v=>Math.max(0,Math.min(n-1,v)),current=this.cursor||this.hoverCell;
  // The first arrow press only shows the cursor.
  const next=current?{r:clampCell(current.r+dr),c:clampCell(current.c+dc)}:{r:this.zoom?this.offsetRow:0,c:this.zoom?this.offsetCol:0};
  this.cursor=next;this.hoverCell={...next};
  if(this.zoom){
   const visible=Math.min(4,n),row=Math.max(next.r-visible+1,Math.min(this.offsetRow,next.r)),col=Math.max(next.c-visible+1,Math.min(this.offsetCol,next.c));
   if(row!==this.offsetRow||col!==this.offsetCol){this.offsetRow=row;this.offsetCol=col;this.ui.render();return;}
  }
  this.showHoverAt(next);
 }
 pickByNumber(digit){
  const index=digit===0?9:digit-1,person=this.puzzle.people[index];if(!person)return;
  this.toggleSelect(person.id);
  this.page=Math.floor(index/PER_PAGE);
  this.refresh();
 }
 /* ---------------------------------------------------------------- */
 /*  Tools and help                                                    */
 /* ---------------------------------------------------------------- */
 drawTools(x,y,s){
  const a=this.art,locked=s.completed||s.failed;
  [[LABEL.cross,'cross'],[LABEL.erase,'erase'],[LABEL.place,'place']].forEach(([label,tool],i)=>this.button(x,y+i*31,43,label,()=>this.setTool(tool),{active:this.tool===tool,enabled:!locked}));
  this.button(x,y+98,43,LABEL.undo,()=>this.undo(),{enabled:s.canUndo&&!locked});
  this.button(x,y+136,43,this.zoom?LABEL.all:LABEL.zoom,()=>this.toggleZoom(),{enabled:s.size>4});
  [[LABEL.up,-1,0],[LABEL.down,1,0],[LABEL.left,0,-1],[LABEL.right,0,1]].forEach(([label,dr,dc],i)=>{
   const r=this.offsetRow+dr,c=this.offsetCol+dc;this.button(x,y+167+i*29,43,label,()=>{this.offsetRow=r;this.offsetCol=c;this.ui.render();},{enabled:this.zoom&&r>=0&&c>=0&&r<=s.size-4&&c<=s.size-4});
  });
  this.button(x,y+289,43,LABEL.help,()=>this.toggleHelp(),{active:this.help});
  a.text(x+21,y+316,LABEL.tries,9,'#7a4c56').setOrigin(0.5,0);
  const pg=a.graphic();for(let i=0;i<s.maxAttempts;i++)a.pip(pg,x+8+i*13.5,y+338,5,i<s.attempts);
 }
 drawHelp(x,y,side){
  const a=this.art,g=a.graphic(),page=HELP_PAGES[Math.max(0,Math.min(this.helpPage,HELP_PAGES.length-1))];
  a.panel(g,x+8,y+15,side-16,side-30,0xfff8e6,8);
  g.fillStyle(0x2b2433,1);g.fillRoundedRect(x+10,y+17,side-20,28,6);
  a.title(x+22,y+24,page.title,12);
  a.text(x+22,y+59,page.lines.join('\n\n'),side<380?10:12,'#4d414d',side-44);
  this.hit(x+8,y+15,side-16,side-30,()=>{});
  this.button(x+20,y+side-47,60,LABEL.close,()=>this.toggleHelp());
  this.button(x+side-95,y+side-47,75,`${this.helpPage+1}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${HELP_PAGES.length}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fee71df89dfd64393f95")}`,()=>{this.helpPage=(this.helpPage+1)%HELP_PAGES.length;this.ui.render();});
 }
 destroy(){
  if(this.destroyed)return;
  this.scene?.input?.keyboard?.off('keydown',this.onKey);
  this.scene?.input?.off('pointerup',this.onPointerUp);
  this.killFx();this.puzzle?.save();this.destroyed=true;this.view=null;this.drag=null;this.scene=null;this.ui=null;this.art=null;this.puzzle=null;
 }
}
