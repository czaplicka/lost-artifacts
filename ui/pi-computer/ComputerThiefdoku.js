import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ComputerThiefdokuArt } from './ComputerThiefdokuArt.js';
import { thiefdokuService, prepareDailyPuzzle } from '../../systems/thiefdoku/ThiefdokuService.js';

const ROOM_SHORT={bathroom:'BATH',kitchen:'KITCHEN',bedroom:'BEDROOM',living:'LOUNGE',study:'STUDY',dining:'DINING',guest_room:'GUEST',laundry:'LAUNDRY',conservatory:'GARDEN',attic:'ATTIC',gallery:'GALLERY',sculpture_hall:'SCULPTURE',archive:'ARCHIVE',restoration_lab:'LAB',museum_reception:'LOBBY',gift_shop:'SHOP',security:'SECURITY',exhibit_hall:'EXHIBITS',museum_kitchen:'KITCHEN',museum_bathroom:'WC',reception:'RECEPTION',open_office:'CUBICLES',conference:'MEETING',office_kitchen:'KITCHEN',ceo_office:'CEO',library:'LIBRARY',copy_room:'COPIER',accounts:'ACCOUNTS',break_room:'BREAK',office_bathroom:'WC'};
const GOLD=0xd4af37;
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
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ec7f0d9728178b8c9652"),lines:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7123478e9da00349b5ac"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_19eef6b9c9f2c488894e"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e852d119a15536cb7a17"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_674786bb0f55a128a69d"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9bdc022fa1456c8fef5f")]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f29a4ff320937d3e26e2"),lines:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_97c892fe8e0004b2ea8f"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_a3a86de14da290d6de1a"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_5564640e783c1b9ee7b1"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_48df5ba5317a476f5873")]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f49dc5768a4e4c11ac67"),lines:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_3e446c3c2975694d3b43"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_45a5080ba20f298d3e88"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8f5e20ad5e66179cd098"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b4f859ba5598f78d33a0")]},
 {title:__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_49b2ae0b077409ec092c"),lines:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_58cb2280f8816dcede2c"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_c3c68e501ae8035f76be"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_abba4b70f8bbcb5991f8"),__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_beb49e2ddf7c0f096e9d")]}
];

export class ComputerThiefdoku {
 constructor(ui){
  this.ui=ui;this.art=new ComputerThiefdokuArt(ui);
  this.puzzle=null;
  this.dailyServiceInstalled=false;
  this.page=0;this.statementPage={};this.accused=null;this.tool='place';this.confirmNew=false;
  this.zoom=false;this.offsetRow=0;this.offsetCol=0;this.help=false;this.helpPage=0;this.destroyed=false;
  this.fx=[];this.probe=null;this.hoverCell=null;this.popId=null;this.slam=false;this.celebrate=false;
  this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_229003e1b589cae59f23");
 }
 killFx(){for(const t of this.fx){try{t.stop?.();}catch(_){}}this.fx=[];}
 nextCaseIn(){
  const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  const mins=Math.max(1,Math.ceil((midnight-now)/60000));
  return `${Math.floor(mins/60)}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_17c76396f75dbc3aeb88")}${String(mins%60).padStart(2,'0')}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_62c66a7a5dd70c314661")}`;
 }
 hit(x,y,w,h,callback){
  const o=this.ui.scene.add.rectangle(x+w/2,y+h/2,w,h,0xffffff,0.001).setInteractive({useHandCursor:true});this.ui.drawing.add(o);
  o.on('pointerdown',()=>{if(this.destroyed)return;this.ui.options?.onSfx?.('click');callback();});return o;
 }
 button(x,y,w,label,callback,{enabled=true,active=false,hint=null}={}){
  const g=this.art.graphic();this.art.panel(g,x,y,w,25,active?0xf0d98e:enabled?0xf5eee1:0xd2c9bd,4);
  this.art.text(x+w/2,y+6,label,11,enabled?'#302833':'#8c8278').setOrigin(0.5,0);
  if(enabled)this.hit(x,y,w,25,callback);
  else if(hint)this.hit(x,y,w,25,()=>{this.feedback=hint;this.ui.render();});
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
  this.hoverCell=null;this.popId=null;this.slam=false;this.celebrate=false;
  this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_18acc03041c7229ec86e");this.ui.render();
 }
 requestNew(){
  if(this.destroyed||!this.puzzle)return;
  if(!thiefdokuService.canIssueCase()){this.feedback=pick(DENIED_QUIPS);this.ui.render();return;}
  if(this.puzzle.completed||this.puzzle.failed||this.confirmNew){this.reset();return;}
  this.confirmNew=true;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_dfd1ed4fd368e2441c4f");this.ui.render();
 }
 render(){
  if(this.destroyed||!this.ui.window)return;
  if(!this.puzzle){
   if(!thiefdokuService.isInstalled()){
    this.art.text(this.ui.window.x+30,this.ui.window.y+60,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_75d119b7c7f0d225d02b"),15,'#302833',this.ui.window.w-60);
    return;
   }
   try{prepareDailyPuzzle(this.ui);}catch(error){
    console.error('[Thiefdoku] Daily case initialization failed:',error);
    this.art.text(this.ui.window.x+30,this.ui.window.y+60,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2da30a8e66e035eda690"),15,'#a03d46',this.ui.window.w-60);
    return;
   }
   if(!this.puzzle)return;
  }
  this.killFx();
  const b=this.ui.window,a=this.art,s=this.puzzle.getState();if(!s.allPlaced)this.accused=null;
  const x=b.x+12,y=b.y+43,w=b.w-24,h=b.h-84,bg=a.graphic();
  bg.fillStyle(0xf1ebe5,1);bg.fillRect(x,y,w,h);
  bg.lineStyle(1,0x302838,0.05);for(let ly=y+44;ly<y+h;ly+=22)bg.lineBetween(x,ly,x+w,ly);
  if(w<720||h<460){a.text(x+20,y+20,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_d2efcfb94d66b9a29d84"),15,'#302833',w-40);return;}
  this.drawHeader(x,y,w,s);
  const leftW=Math.min(354,Math.floor(w*0.38)),cardY=y+76,cardH=Math.floor((h-150)/2),gap=10;
  const cardW=Math.floor((leftW-gap)/2),perPage=4,pages=Math.ceil(s.people.length/perPage);this.page=Math.max(0,Math.min(this.page,pages-1));
  this.probe=a.text(-10000,-10000,'',12,'#352e37',cardW-16);
  s.people.slice(this.page*perPage,(this.page+1)*perPage).forEach((p,i)=>this.drawCard(x+9+(i%2)*(cardW+gap),cardY+Math.floor(i/2)*(cardH+8),cardW,cardH,p,s));
  this.probe.destroy();this.probe=null;
  const navY=y+h-65;
  this.button(x+10,navY,55,'PREV',()=>{this.page--;this.ui.render();},{enabled:this.page>0});a.text(x+74,navY+7,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e8fe0fd1a401c5613e4d")}${this.page+1}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${pages}`,11);
  this.button(x+leftW-52,navY,55,'NEXT',()=>{this.page++;this.ui.render();},{enabled:this.page<pages-1});
  const availableW=w-leftW-85,side=Math.floor(Math.min(h-139,availableW)),bx=x+leftW+29+(availableW-side)/2,by=y+85;
  this.drawBoard(bx,by,side,s);this.drawTools(x+w-48,by,s);
  a.text(bx,by+side+8,__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_bfdcae279693c2a535ff"),10,'#5b474b',side);
  this.drawStamp(bx,by,side,s);
  if(this.help)this.drawHelp(bx,by,side);
  const footerY=y+h-32,canNew=thiefdokuService.canIssueCase(),over=s.completed||s.failed,pending=this.confirmNew&&!over;
  const label=!canNew?`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f04bd3e522e9debc102c")}${this.nextCaseIn()}`:over?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fa558aa2d550c86d76e4"):pending?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_7ccd7455c04cd9dccec3"):__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1cdca5bc751013a144d3");
  this.button(x+10,footerY,150,label,()=>this.requestNew(),{enabled:canNew,hint:canNew?null:pick(DENIED_QUIPS)});
  if(pending)this.button(x+166,footerY,65,'CANCEL',()=>{this.confirmNew=false;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_adbdfe16f573460dbc61");this.ui.render();});
  const fx=pending?x+240:x+172;
  a.text(fx,footerY+2,this.feedback,12,s.completed?'#2d714d':s.failed?'#a03d46':'#6b444b',x+w-fx-12);
 }
 drawHeader(x,y,w,s){
  const a=this.art,g=a.graphic();
  a.panel(g,x+6,y+4,w-12,36,0x2b2433,5);g.fillStyle(GOLD,1);g.fillRect(x+9,y+36,w-18,2);
  a.title(x+18,y+10,'THIEFDOKU',18);
  a.text(x+178,y+8,`${s.themeName}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ffa9044b934017b2aed8")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fc191eafd9c50bef4eed")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_ffa9044b934017b2aed8")}${s.size}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_34023a88446333c75d30")}`,11,'#e8dcc4');
  const bx=x+178,bw=Math.min(220,Math.floor(w*0.28));
  g.fillStyle(0x4a3f52,1);g.fillRect(bx,y+24,bw,6);g.fillStyle(0x7fc4a0,1);g.fillRect(bx,y+24,bw*s.placedCount/s.people.length,6);
  g.lineStyle(1,0xe8dcc4,0.6);g.strokeRect(bx,y+24,bw,6);
  a.text(bx+bw+8,y+22,`${s.placedCount}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${s.people.length}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_1da621181d3d2fdad1be")}`,10,'#e8dcc4');
  const r=x+w-20;
  a.text(r,y+8,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2b16cc0ddac49e71b242")}${thiefdokuService.getMedals()}`,11,'#f0d98e').setOrigin(1,0);
  a.text(r,y+22,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_9654f663ae25bad69022")}${s.solved}`,10,'#bfb3c4').setOrigin(1,0);
  a.magnifier(x+22,y+58,18);
  a.text(x+38,y+46,`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_859bb20bb8d5093a89a8")}${s.stolenItem}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f327f4cba9fca599dae4")}${s.roomNames[s.theftRoom].toLowerCase()}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_cdb4ee2aea69cc6a8333")}`,12,'#5b474b',w-60);
 }
 statementChunks(texts,width,maxLines){
  const probe=this.probe,chunks=[];probe.setWordWrapWidth(width);
  for(const text of texts){const lines=probe.getWrappedText(text);for(let i=0;i<lines.length;i+=maxLines)chunks.push(lines.slice(i,i+maxLines).join('\n'));}
  return chunks.length?chunks:[__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_f90c7959cae2779e4a41")];
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
  a.text(metaX,y+54,p.group,9,'#5c535c',metaW);
  a.text(metaX,y+65,p.gender==='f'?'woman':'man',9,'#5c535c',metaW);
  const sy=y+82;
  if(!locked)this.hit(x+3,y+3,w-6,sy-y-6,()=>{
   this.tool='place';this.confirmNew=false;
   if(selected){this.puzzle.clearSelection();this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_06158db31f05320bf16f");}
   else{this.puzzle.selectPerson(p.id);this.feedback=`${SUSPECT_QUIPS[p.id]||`${p.name}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_b5651aaad22ac1af8ca1")}`}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_e9271b345db13bef2346")}`;}
   this.ui.render();
  });
  const bottom=s.allPlaced?52:24,maxLines=Math.max(1,Math.floor((y+h-bottom-sy)/15));
  const chunks=this.statementChunks(s.clues.filter(c=>c.personId===p.id).map(c=>c.text),w-16,maxLines),index=Math.min(this.statementPage[p.id]||0,chunks.length-1);
  a.text(x+8,sy,chunks[index],12,'#352e37',w-16);
  const pagerY=y+h-(s.allPlaced?48:18);
  if(chunks.length>1){
   a.text(x+w-8,pagerY,`${index+1}/${chunks.length} >`,10,'#79566a').setOrigin(1,0);
   this.hit(x+5,sy,w-10,Math.max(15,pagerY+14-sy),()=>{this.statementPage[p.id]=(index+1)%chunks.length;this.ui.render();});
  }
  if(s.allPlaced)this.button(x+7,y+h-29,w-14,cleared?'CLEARED':chosen?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_63b39c6d5a6528cc681e")+p.name:'SUSPECT',()=>{
   if(!this.puzzle.allPlaced()){this.accused=null;this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_31551b71219148998543");this.ui.render();return;}
   this.confirmNew=false;
   if(this.accused===p.id){this.feedback=this.verdict(this.judge(p.id),p.id);this.accused=null;}
   else{this.accused=p.id;this.feedback=`${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_29742aa2e714f1f7a889")}${p.name}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_09d9f751cdc140eaa789")}`;}
   this.ui.render();
  },{enabled:!locked&&!cleared,active:chosen});
  if(cleared)a.stamp(x+w/2,y+h*0.6,'INNOCENT',Math.max(10,Math.min(16,Math.floor(w/10))),0xb34a4a,-11).setAlpha(0.78);
 }
 drawBoard(x,y,side,s){
  const a=this.art,sc=this.ui.scene,n=s.size,visible=this.zoom?Math.min(4,n):n,cell=side/visible,locked=s.completed||s.failed;
  const r0=this.zoom?Math.max(0,Math.min(this.offsetRow,n-visible)):0,c0=this.zoom?Math.max(0,Math.min(this.offsetCol,n-visible)):0;this.offsetRow=r0;this.offsetCol=c0;
  const shadow=a.graphic();shadow.fillStyle(0x2e2537,0.2);shadow.fillRect(x+6,y+8,side,side);
  const frame=a.graphic();frame.fillStyle(0x3a2f3f,1);frame.fillRoundedRect(x-4,y-4,side+8,side+8,5);frame.lineStyle(2,GOLD,0.9);frame.strokeRoundedRect(x-4,y-4,side+8,side+8,5);
  const layer=sc.add.container(x,y);this.ui.drawing.add(layer);a.parent=layer;
  let hover=null,showHover=null;
  try{
   const floors=a.graphic();
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++)a.floor(floors,vc*cell,vr*cell,cell,s.layout[r0+vr][c0+vc],r0+vr,c0+vc);
   for(const o of [...s.objects].sort((p,q)=>(p.kind==='rug'?-1:0)-(q.kind==='rug'?-1:0))){
    if(o.row+o.h<=r0||o.col+o.w<=c0||o.row>=r0+visible||o.col>=c0+visible)continue;
    a.furniture(o,(o.col-c0)*cell,(o.row-r0)*cell,o.w*cell,o.h*cell);
   }
   hover=a.graphic();
   showHover=(vr,vc)=>{
    if(this.destroyed||!hover.scene)return;
    hover.clear();
    const r=r0+vr,c=c0+vc,room=s.layout[r][c],blocked=this.puzzle.isBlocked(r,c);
    hover.fillStyle(0xffffff,0.16);hover.fillRect(0,vr*cell,side,cell);hover.fillRect(vc*cell,0,cell,side);
    hover.fillStyle(0xfff2b0,0.18);
    for(let i=0;i<visible;i++)for(let j=0;j<visible;j++)if(s.layout[r0+i][c0+j]===room)hover.fillRect(j*cell,i*cell,cell,cell);
    hover.lineStyle(2,blocked?0xb34a4a:0xfff2b0,0.95);hover.strokeRect(vc*cell+1,vr*cell+1,cell-2,cell-2);
    const sel=s.people.find(p=>p.id===s.selectedPersonId);
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
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,id=s.board[r][c],px=vc*cell,py=vr*cell;
    if(!id&&(s.crosses[r][c]||s.autoCrosses[r][c])){
     const manual=s.crosses[r][c],g=a.graphic();g.lineStyle(manual?3:1.8,manual?0x624151:0x806c84,manual?0.9:0.42);
     g.lineBetween(px+cell*0.32,py+cell*0.32,px+cell*0.68,py+cell*0.68);g.lineBetween(px+cell*0.68,py+cell*0.32,px+cell*0.32,py+cell*0.68);
    }
    if(id){
     const person=s.people.find(p=>p.id===id);
     if(this.popId===id){
      this.popId=null;
      const pc=sc.add.container(px+cell*0.5,py+cell*0.4);layer.add(pc);a.parent=pc;
      a.pawn(person,-cell*0.36,-cell*0.36,cell*0.72);a.parent=layer;
      pc.setScale(0.2);this.fx.push(sc.tweens.add({targets:pc,scale:1,duration:300,ease:'Back.Out'}));
     }else a.pawn(person,px+cell*0.14,py+cell*0.04,cell*0.72);
     a.nameTag(px+cell/2,py+cell-10,person.name,cell-5,Math.min(14,Math.max(11,cell*0.2)));
    }
   }
  }finally{a.parent=null;}
  const matrix=layer.getWorldTransformMatrix?.();
  if(matrix&&sc.make?.graphics){
   const top=matrix.transformPoint(0,0),bottom=matrix.transformPoint(side,side),maskGraphic=sc.make.graphics({add:false});
   maskGraphic.fillStyle(0xffffff,1);maskGraphic.fillRect(top.x,top.y,bottom.x-top.x,bottom.y-top.y);
   const mask=maskGraphic.createGeometryMask();layer.setMask(mask);layer.once('destroy',()=>{mask.destroy();maskGraphic.destroy();});
  }
  for(let i=0;i<visible;i++){
   a.text(x+i*cell+cell/2,y-15,String(c0+i+1),10,'#6f6069').setOrigin(0.5,0);a.text(x-11,y+i*cell+cell/2,String(r0+i+1),10,'#6f6069').setOrigin(0.5);
  }
  const border=a.graphic();border.lineStyle(4,0x201e27,1);border.strokeRect(x,y,side,side);
  if(!locked){
   for(let vr=0;vr<visible;vr++)for(let vc=0;vc<visible;vc++){
    const r=r0+vr,c=c0+vc,zone=this.hit(x+vc*cell+2,y+vr*cell+2,cell-4,cell-4,()=>this.clickCell(r,c));
    zone.on('pointerover',()=>{this.hoverCell={r,c};showHover(vr,vc);});
    zone.on('pointerout',()=>{this.hoverCell=null;if(hover.scene)hover.clear();});
   }
   if(this.hoverCell){const vr=this.hoverCell.r-r0,vc=this.hoverCell.c-c0;if(vr>=0&&vc>=0&&vr<visible&&vc<visible)showHover(vr,vc);}
  }
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
   const p=sc.add.rectangle(cx,cy,5+Math.random()*4,3+Math.random()*4,colors[i%colors.length]);this.ui.drawing.add(p);
   p.setAngle(Math.random()*360);
   this.fx.push(sc.tweens.add({targets:p,x:cx+(Math.random()-0.5)*side*1.2,y:cy+(Math.random()*0.8-0.1)*side*0.6,angle:p.angle+Math.random()*540,alpha:0,duration:900+Math.random()*700,ease:'Cubic.Out',onComplete:()=>{if(p.active)p.destroy();}}));
  }
 }
 clickCell(r,c){
  if(this.destroyed||!this.puzzle||this.puzzle.completed||this.puzzle.failed)return;
  this.confirmNew=false;
  if(this.puzzle.isBlocked(r,c)){this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_40d211b703d3658f83eb");this.ui.render();return;}
  const id=this.puzzle.board[r][c];
  if(this.tool==='erase')this.puzzle.removePerson(r,c);
  else if(this.tool==='cross'){if(id)this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_a1fdce6982f505cac83a");else this.puzzle.toggleCross(r,c);}
  else if(this.puzzle.selectedPersonId){
   const chosen=this.puzzle.selectedPersonId;
   if(this.puzzle.placePerson(r,c)){this.popId=chosen;this.feedback=this.puzzle.allPlaced()?__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_397e999c135a8183aa03"):pick(PLACE_QUIPS);}
  }
  else if(id){this.puzzle.removePerson(r,c);this.puzzle.selectPerson(id);this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_84d99fa5aa51c7582577");}
  else this.feedback=__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_2e9cb880b9689a167b1e");
  if(!this.puzzle.allPlaced())this.accused=null;this.ui.render();
 }
 drawTools(x,y,s){
  const a=this.art,locked=s.completed||s.failed;
  [['X','cross'],['ERASE','erase'],['PLACE','place']].forEach(([label,tool],i)=>this.button(x,y+i*31,43,label,()=>{this.tool=tool;if(tool!=='place')this.puzzle.clearSelection();this.ui.render();},{active:this.tool===tool,enabled:!locked}));
  this.button(x,y+98,43,'UNDO',()=>{this.puzzle.undo();if(!this.puzzle.allPlaced())this.accused=null;this.ui.render();},{enabled:s.canUndo&&!locked});
  this.button(x,y+136,43,this.zoom?'ALL':'ZOOM',()=>{this.zoom=!this.zoom;this.offsetRow=0;this.offsetCol=0;this.ui.render();},{enabled:s.size>4});
  [['UP',-1,0],['DN',1,0],['<',0,-1],['>',0,1]].forEach(([label,dr,dc],i)=>{
   const r=this.offsetRow+dr,c=this.offsetCol+dc;this.button(x,y+167+i*29,43,label,()=>{this.offsetRow=r;this.offsetCol=c;this.ui.render();},{enabled:this.zoom&&r>=0&&c>=0&&r<=s.size-4&&c<=s.size-4});
  });
  this.button(x,y+289,43,'HELP',()=>{this.help=!this.help;this.ui.render();},{active:this.help});
  a.text(x+21,y+316,'TRIES',9,'#7a4c56').setOrigin(0.5,0);
  const pg=a.graphic();for(let i=0;i<s.maxAttempts;i++)a.pip(pg,x+8+i*13.5,y+338,5,i<s.attempts);
 }
 drawHelp(x,y,side){
  const a=this.art,g=a.graphic(),page=HELP_PAGES[Math.max(0,Math.min(this.helpPage,HELP_PAGES.length-1))];
  a.panel(g,x+8,y+15,side-16,side-30,0xfff8e6,8);
  g.fillStyle(0x2b2433,1);g.fillRoundedRect(x+10,y+17,side-20,28,6);
  a.title(x+22,y+24,page.title,12);
  a.text(x+22,y+59,page.lines.join('\n\n'),side<380?10:12,'#4d414d',side-44);
  this.hit(x+8,y+15,side-16,side-30,()=>{});
  this.button(x+20,y+side-47,60,'CLOSE',()=>{this.help=false;this.ui.render();});
  this.button(x+side-95,y+side-47,75,`${this.helpPage+1}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_8a5edab282632443219e")}${HELP_PAGES.length}${__dialogueText("ui/pi-computer/ComputerThiefdoku.js", "t_fee71df89dfd64393f95")}`,()=>{this.helpPage=(this.helpPage+1)%HELP_PAGES.length;this.ui.render();});
 }
 checkBoard(){if(this.destroyed||!this.puzzle)return;this.feedback=this.verdict(this.judge(this.accused),this.accused);this.accused=null;this.ui.render();}
 destroy(){if(this.destroyed)return;this.killFx();this.puzzle?.save();this.destroyed=true;this.ui=null;this.art=null;this.puzzle=null;}
}
