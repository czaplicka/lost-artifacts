import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { moneyManager,MONEY_SOURCE } from '../../managers/MoneyManager.js';
import { prepareComputerNotebookAudio } from './ComputerNotebookAudio.js';
import { computerActionButton } from './ComputerActionButton.js';
export class ComputerLedger{
 constructor(ui){this.ui=ui;prepareComputerNotebookAudio(ui.scene);}
 formatDate(value){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='string'){const match=value.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:value;}
  if(typeof value==='number'&&Number.isFinite(value)){
   const date=new Date(value);if(!Number.isNaN(date.getTime()))return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  }return String(value);
 }
 getBalance(){try{const cash=moneyManager.getState().cash;return Number.isFinite(cash)?cash:null;}catch(error){return null;}}
 getData(){
  const state=moneyManager.getState();
  const transactions=state.moneyLog.filter(t=>t&&t.source===MONEY_SOURCE.CASH&&t.type==='expense'&&Number.isFinite(t.amount)&&t.amount>=0)
   .map(t=>({id:t.id,type:'expense',source:t.source,amount:t.amount,description:t.description||__dialogueText("ui/pi-computer/ComputerLedger.js", "t_c22b6c9d8ef65ec1799e"),date:this.formatDate(t.createdAt),createdAt:t.createdAt,category:t.category,missionId:t.missionId}));
  return{balance:state.cash,transactions};
 }
 render(){
  const ui=this.ui,d=ui.drawing,scene=ui.scene,box=ui.window,ledger=this.getData();
  const expenses=ledger.transactions.map(t=>({id:t.id,date:this.formatDate(t.date),description:t.description||__dialogueText("ui/pi-computer/ComputerLedger.js", "t_c22b6c9d8ef65ec1799e"),expense:Math.abs(Number(t.amount))})).filter(t=>Number.isFinite(t.expense));
  const total=expenses.reduce((sum,entry)=>sum+entry.expense,0);
  const paperX=box.x+14,paperY=box.y+48,paperW=box.w-28,paperH=box.h-92;
  d.rectangle(paperX,paperY,paperW,paperH,0xe9efdc).setStrokeStyle(1,0x9aa88a);
  d.rectangle(paperX+5,paperY+4,paperW-10,4,0xf7fbee);d.rectangle(paperX,paperY,22,paperH,0xb7c4a6);
  const g=scene.add.graphics();ui.content.add(g);
  for(let i=0;i<6;i++){const hy=paperY+36+i*62;g.fillStyle(0x2a2c27,1);g.fillCircle(paperX+11,hy,6);g.fillStyle(0x000000,.35);g.fillCircle(paperX+11,hy+1,4);}
  g.lineStyle(4,0x7a5230,.18);g.strokeCircle(paperX+paperW-120,paperY+paperH-70,34);
  g.lineStyle(2,0x7a5230,.12);g.strokeCircle(paperX+paperW-120,paperY+paperH-70,30);
  d.pixel(paperX+40,paperY+18,__dialogueText("ui/pi-computer/ComputerLedger.js", "t_e94a8d84ee971e0ba8d3"),14,'#35372f');
  const balance=Number.isFinite(ledger.balance)?ui.money(ledger.balance):__dialogueText("ui/pi-computer/ComputerLedger.js", "t_0303e182467081801f8b");
  d.text(paperX+paperW-18,paperY+16,`${__dialogueText("ui/pi-computer/ComputerLedger.js", "t_90dce8fe9b03dc7eecc7")}${balance}`,17,'#2d5a3d').setOrigin(1,0);
  d.text(paperX+40,paperY+46,__dialogueText("ui/pi-computer/ComputerLedger.js", "t_18a9c95064cb65f51d68"),13,'#6d7a5e');
  const tableX=paperX+36,tableY=paperY+77,tableW=paperW-54,headerH=30,rowH=29,dateW=135,expenseW=155;
  const descriptionW=tableW-dateW-expenseW,dateX=tableX+10,descriptionX=tableX+dateW+10,expenseRight=tableX+tableW-12;
  const perPage=Math.max(1,Math.floor((paperH-170)/rowH)),pages=Math.max(1,Math.ceil(expenses.length/perPage));
  ui.listPage=Phaser.Math.Clamp(ui.listPage,0,pages-1);
  const visible=expenses.slice(ui.listPage*perPage,(ui.listPage+1)*perPage);
  d.rectangle(tableX,tableY,tableW,headerH,0xbccaa9);
  d.pixel(dateX,tableY+10,'DATE',9,'#34402b');d.pixel(descriptionX,tableY+10,'DESCRIPTION',9,'#34402b');
  d.pixel(expenseRight,tableY+10,'EXPENSE',9,'#34402b').setOrigin(1,0);
  const tableBottom=tableY+headerH+perPage*rowH;
  for(let i=0;i<perPage;i++){
   const rowY=tableY+headerH+i*rowH,entry=visible[i];
   if(i%2===0)d.rectangle(tableX,rowY,tableW,rowH,0xdfe8cf);d.rectangle(tableX,rowY+rowH-1,tableW,1,0xa9bb98);if(!entry)continue;
   const dateText=d.text(dateX,rowY+6,entry.date,15,'#4c5640'),descriptionText=d.text(descriptionX,rowY+6,entry.description,15,'#2c3327');
   this.fitText(dateText,entry.date,dateW-20);this.fitText(descriptionText,entry.description,descriptionW-20);
   d.text(expenseRight,rowY+6,ui.money(entry.expense),15,'#8b3d31').setOrigin(1,0);
  }
  d.rectangle(tableX+dateW,tableY,1,tableBottom-tableY,0xc9625a);d.rectangle(tableX+dateW+3,tableY,1,tableBottom-tableY,0xc9625a);
  d.rectangle(tableX+tableW-expenseW,tableY,1,tableBottom-tableY,0xa9bb98);
  if(!expenses.length)d.text(descriptionX,tableY+headerH+6,__dialogueText("ui/pi-computer/ComputerLedger.js", "t_66eff85935bda5da224f"),15,'#6d7a5e');
  const footerY=tableBottom+13;
  const change=direction=>{
   const before=ui.listPage,next=(before+direction+pages)%pages;if(next===before)return;
   ui.listPage=next;ui.render();return 'page';
  };
  computerActionButton(ui,tableX,footerY,'<',()=>change(-1),pages>1);
  d.pixel(tableX+58,footerY+10,`${__dialogueText("ui/pi-computer/ComputerLedger.js", "t_6076934f99bd42435b95")}${ui.listPage+1}${__dialogueText("ui/pi-computer/ComputerLedger.js", "t_8a5edab282632443219e")}${pages}`,9,'#55603f');
  computerActionButton(ui,tableX+190,footerY,'>',()=>change(1),pages>1);
  d.pixel(expenseRight,footerY+9,`${__dialogueText("ui/pi-computer/ComputerLedger.js", "t_41fa4620c6341756e885")}${ui.money(total)}`,11,'#8b2f25').setOrigin(1,0);
 }
 fitText(object,value,maxWidth){return this.ui.drawing.fit(object,value,maxWidth);}
}
