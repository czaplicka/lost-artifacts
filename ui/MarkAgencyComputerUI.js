import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { ComputerDrawing } from './pi-computer/ComputerDrawing.js';
import { ComputerDocuments } from './pi-computer/ComputerDocuments.js';
import { ComputerSearch } from './pi-computer/ComputerSearch.js';
import { ComputerShell } from './pi-computer/ComputerShell.js';
import { AgencyMailApp } from './mark-agency/AgencyMailApp.js';
import { installReportIncidentUI } from './mark-agency/ReportIncidentUI.js';
import { canOpenNextAssignment } from '../config/markAgencyComputerConfig.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { moneyManager } from '../managers/MoneyManager.js';
import { agencyLedgerRows } from '../markAgencyComputerModel.js';
import { getArchiveCaseId, getMissionReportForm, saveMissionReportDraft, printMissionReport } from '../archiveReportService.js';
const APPS={mail:__dialogueText("ui/MarkAgencyComputerUI.js", "t_a0c34486be3c312748a9"),reports:__dialogueText("ui/MarkAgencyComputerUI.js", "t_02e4c75a6bc3e5fcaa52"),ledger:__dialogueText("ui/MarkAgencyComputerUI.js", "t_0b92a1685437305d12e9"),search:__dialogueText("ui/MarkAgencyComputerUI.js", "t_e5376a1fd930fceddb36")};
const APP_INFO={mail:{title:__dialogueText("ui/MarkAgencyComputerUI.js", "t_3c96cfd6d98b213a31e1"),color:0xe3d4a4,kind:'envelope'},reports:{title:__dialogueText("ui/MarkAgencyComputerUI.js", "t_11f894470164a991c7ef"),color:0xb7c9d1,kind:'report'},ledger:{title:__dialogueText("ui/MarkAgencyComputerUI.js", "t_b0eae702830c382ba1d9"),color:0x9bc6b8,kind:'ledger'},search:{title:__dialogueText("ui/MarkAgencyComputerUI.js", "t_6f6ca128fbbdf22488f9"),color:0x9fc9a9,kind:'globe'}};
const ICON_ART={mail:'envelope',report:'report',ledger:'ledger',globe:'globe'};
const COMPACT_WINDOWS={ledger:{w:780,h:500}};
const WINDOW_STATE_KEYS=['selectedId','listPage','bodyPage','notice','ledgerPage','form','answers','activeField','reportPage','optionPage','reportCaseId','errors','incidentMode','incidentCaseId','incidentBodyPage','incidentHistoryPage'];
const freshWindowState=()=>({selectedId:null,listPage:0,bodyPage:0,notice:'',ledgerPage:0,form:null,answers:{},activeField:null,reportPage:0,optionPage:0,reportCaseId:undefined,errors:new Set(),incidentMode:null,incidentCaseId:undefined,incidentBodyPage:0,incidentHistoryPage:0});
export class MarkAgencyComputerUI {
  constructor(scene,options={}) {
    Object.assign(this,{scene,options,isOpen:false,suspended:false,destroyed:false,app:'desktop',selectedId:null,listPage:0,bodyPage:0,notice:'',viewToken:0,layout:null,window:null,content:null,ledgerPage:0,form:null,answers:{},activeField:null,reportPage:0,optionPage:0,nextAssignmentBusy:false,menuOpen:false});
    this.state=scene.gameState??gameState;this.errors=new Set();
    this.root=scene.add.container(0,0).setDepth(1800).setScrollFactor(0).setVisible(false);
    this.drawing=new ComputerDrawing(this);
    this.shell=new ComputerShell(this,{theme:'mark',apps:APP_INFO,sizes:COMPACT_WINDOWS,stateKeys:WINDOW_STATE_KEYS,defaults:freshWindowState,
      defaultRect:()=>{const{x,y,w,h}=this.layout||{x:78,y:60,w:964,h:572};return{x:x+16,y:y+12,w:w-32,h:h-60};},
      area:()=>this.layout||{x:78,y:60,w:964,h:572},hooks:{beforeSwitch:()=>this.persistReport()}});
    this.documents=new ComputerDocuments(this);this.mail=new AgencyMailApp(this);
    this.desktop={render:()=>this.renderDesktop(),createIcon:(...args)=>this.createIcon(...args)};
    this.monitor={renderApplication:()=>this.renderApplication()};this.search=new ComputerSearch(this);
    this.onResize=()=>{if(this.isOpen)this.render();};
    this.onMoney=()=>{if(this.isOpen&&this.shell.has('ledger'))this.render();};
    this.onKey=event=>{
      if(!this.isOpen||this.destroyed||event.ctrlKey||event.metaKey||event.altKey)return;
      event.stopPropagation();
      if(this.nextAssignmentBusy){event.preventDefault();return;}
      if(event.code===__dialogueText("ui/MarkAgencyComputerUI.js", "t_037c968467aa3fd7c059")&&!event.repeat){event.preventDefault();if(this.menuOpen){this.menuOpen=false;this.render();}else if(this.app!=='desktop')this.openApp('desktop');else this.close();}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',__dialogueText("ui/MarkAgencyComputerUI.js", "t_20eac5aae274985fd886"),'KeyB','KeyL'].includes(event.code))event.preventDefault();
    };
    scene.scale.on('resize',this.onResize);window.addEventListener('lost-artifacts:money-changed',this.onMoney);
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    this.onSleep=()=>this.close({restoreHud:false});scene.events.on('sleep',this.onSleep);
  }
  open(){
    if(this.destroyed||this.isOpen||!this.scene.sys.isActive())return false;
    this.isOpen=true;this.app='desktop';this.notice='';this.menuOpen=false;this.viewToken++;this.shell.reset();
    document.addEventListener('keydown',this.onKey,true);this.root.setVisible(true);
    try{this.options.onOpen?.();this.render();}catch(error){this.close();throw error;}return true;
  }
  close({restoreHud=true}={}){
    if(!this.isOpen)return;this.persistReport();this.isOpen=false;this.menuOpen=false;this.viewToken++;
    this.root.setVisible(false);document.removeEventListener('keydown',this.onKey,true);this.options.onClose?.({restoreHud});
  }
  openApp(app){
    if(!this.isOpen||this.destroyed||this.nextAssignmentBusy||!['desktop',...Object.keys(APPS)].includes(app))return;
    this.persistReport();this.menuOpen=false;this.viewToken++;
    if(app==='desktop'){this.shell.closeFocused();this.render();return;}
    const fresh=this.shell.open(app);
    if(app==='reports'){
      this.form=getMissionReportForm(this.locations(),this.state);this.answers={...(this.form.answers||{})};this.reportCaseId=getArchiveCaseId(this.state);
      this.activeField=this.form.fields?.find(field=>!this.answers[field.id])?.id??this.form.fields?.[0]?.id;
      this.errors.clear();this.reportPage=0;this.optionPage=0;
    }
    if(app==='mail'&&fresh){this.selectedId=this.getMail()[0]?.id??null;if(this.selectedId)this.markRead(this.selectedId);}
    this.render();if(app==='search')void this.search.load();
  }
  locations(){return this.scene.cache.json.get('locations')||[];}
  money(value){return Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)):__dialogueText("ui/MarkAgencyComputerUI.js", "t_b764cdc0eab713746721");}
  getMail(){return this.mail.getMail();}
  isRead(id){return this.mail.isRead(id);}
  markRead(id){this.mail.markRead(id);}
  renderMail(){this.mail.render();}
  async runMailAction(message){
    if(!this.isOpen||this.destroyed||this.nextAssignmentBusy)return false;
    const current=this.getMail().find(item=>item.id===message?.id);
    if(!current?.actionEnabled){this.notice=__dialogueText("ui/MarkAgencyComputerUI.js", "t_fc8bb872077e876b33af");this.render();return false;}
    if(current.action.type==='reports'){this.openApp('reports');return true;}
    if(current.action.type==='next_mission')return this.openNextAssignment();return false;
  }
  async openNextAssignment(){
    if(!this.isOpen||this.destroyed||this.nextAssignmentBusy)return false;
    if(!canOpenNextAssignment(this.state)){this.notice=__dialogueText("ui/MarkAgencyComputerUI.js", "t_de49545ae836d348bfb0");this.render();return false;}
    const caseId=getArchiveCaseId(this.state);this.nextAssignmentBusy=true;saveGameState();this.close();this.scene.applyLock?.(true);
    try{const opened=await this.scene.goto('AgainScene',{afterReport:true});if(opened===false)throw Error('AgainScene could not be opened.');return true;}
    catch(error){console.error('[MarkAgencyComputerUI] Next assignment failed:',error);
      if(!this.destroyed&&!this.scene._cleanupDone&&this.scene.sys.isActive()&&getArchiveCaseId(this.state)===caseId){this.nextAssignmentBusy=false;this.open();this.openApp('mail');this.notice=__dialogueText("ui/MarkAgencyComputerUI.js", "t_0575858eafa81af1ae17");this.render();}return false;
    }finally{this.nextAssignmentBusy=false;if(!this.scene._cleanupDone&&this.scene.sys.isActive())this.scene.refreshPanelLock?.();}
  }
  pin(){const visit=node=>{node.setScrollFactor?.(0,0);node.list?.forEach(visit);};visit(this.root);}
  render(){
    if(this.destroyed||!this.isOpen)return;this.content=null;this.root.removeAll(true);
    const{width,height}=this.scene.scale;
    const blocker=this.scene.add.rectangle(0,0,width,height,0x040b12,.94).setOrigin(0).setInteractive();
    blocker.on('pointerdown',(pointer,x,y,event)=>event?.stopPropagation());this.root.add(blocker);
    const scale=Math.max(.01,Math.min((width-16)/1120,(height-16)/760));
    this.content=this.scene.add.container((width-1120*scale)/2,(height-760*scale)/2).setScale(scale);this.root.add(this.content);
    const d=this.drawing;d.rectangle(25,15,1070,690,0x202d36);d.frame(25,15,1070,690,0x788b8f,1,4);
    d.bevel(52,35,1016,617,0x0b151c,true);d.bevel(440,705,240,24,0x283a44);d.bevel(345,729,430,21,0x3c525b);
    this.layout={x:78,y:60,w:964,h:572};this.shell.beginFrame();this.drawWallpaper();this.desktop.render();this.shell.renderWindows();this.drawTaskbar();
    if(this.menuOpen)this.drawStartMenu();for(let sy=60;sy<632;sy+=4)d.rectangle(78,sy,964,1,0,.10);
    d.rectangle(70,665,360,27,0x101b22);d.pixel(82,674,__dialogueText("ui/MarkAgencyComputerUI.js", "t_4e7337223d19bdfe06eb"),9,'#dec98b');d.text(470,674,__dialogueText("ui/MarkAgencyComputerUI.js", "t_6d90769fcf97c4d962d4"),12,'#a9bdc0');
    for(let i=0;i<8;i++)d.rectangle(790+i*12,669,5,17,0x0a161e);
    d.rectangle(900,674,9,9,0x7ac9b7);d.button(960,661,'OFF',()=>this.close());this.pin();
  }
  drawWallpaper(){
    const d=this.drawing,scene=this.scene,{x,y,w,h}=this.layout,key=this.options.wallpaperKey||'mark_computer_wallpaper';
    if(!scene.textures.exists(key))this.shell.art(key,'wallpaper_mark.webp');
    if(scene.textures.exists(key))d.add(scene.add.image(x,y,key).setOrigin(0).setDisplaySize(w,h-36));
    else{
      d.rectangle(x,y,w,h,0x143a49);for(let i=0;i<10;i++)d.rectangle(x,y+i*53,w,53,0x0a2733,.05*i);
      for(let i=0;i<12;i++)d.rectangle(x,y+i*45,w,1,0x275060,.5);for(let i=0;i<20;i++)d.rectangle(x+i*50,y,1,h-36,0x275060,.4);
      d.frame(x+530,y+198,320,170,0xb8a56a,.5,3);d.pixel(x+566,y+235,'MARK',38,'#bac6b9');d.pixel(x+572,y+292,'AGENCY',22,'#d9c589');
      d.text(x+527,y+392,__dialogueText("ui/MarkAgencyComputerUI.js", "t_c9db56f29eaacf8d9018"),17,'#89a6a6',365);
    }
    if(this.app==='desktop'){
      d.pixel(x+24,y+205,__dialogueText("ui/MarkAgencyComputerUI.js", "t_5d69ce86afacf1782afc"),13,'#eadcae');
      d.text(x+24,y+244,`${__dialogueText("ui/MarkAgencyComputerUI.js", "t_5ffdd8dcfd2d441c7798")}${this.state.playerName||this.state.agentName||__dialogueText("ui/MarkAgencyComputerUI.js", "t_11b39c93777e8f1f3983")}${__dialogueText("ui/MarkAgencyComputerUI.js", "t_dcfcedff0e84bc1dffc9")}`,19,'#cbdada',410);
      if(this.notice)d.text(x+24,y+390,this.notice,17,'#ffe0a0',440);
    }
  }
  drawTaskbar(){
    this.shell.drawTaskbar(this.layout,{startLabel:'MARK',startIcon:'mark',startWidth:104,trayWidth:250,drawTray:(trayX,taskbarY)=>{
      this.drawing.text(trayX+10,taskbarY+9,`${__dialogueText("ui/MarkAgencyComputerUI.js", "t_3b83bd97552e7b897191")}${this.money(moneyManager.getBalances().agencyBudget)}`,14,'#dec98b');
    }});
  }
  drawStartMenu(){
    const items=[{app:'mail',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_3c96cfd6d98b213a31e1"),color:APP_INFO.mail.color,kind:'envelope'},{app:'reports',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_11f894470164a991c7ef"),color:APP_INFO.reports.color,kind:'report'},{app:'ledger',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_b0eae702830c382ba1d9"),color:APP_INFO.ledger.color,kind:'ledger'},{app:'search',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_6f6ca128fbbdf22488f9"),color:APP_INFO.search.color,kind:'globe'},{sep:true}];
    if(canOpenNextAssignment(this.state)){items.push({action:'next',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_0faa585c095d4e6b57de"),color:0xdec98b,kind:'report'});items.push({sep:true});}
    items.push({action:'off',label:__dialogueText("ui/MarkAgencyComputerUI.js", "t_5858fcc46968f80e0432"),color:0xb04a3a,kind:'power'});
    this.shell.drawStartMenu(this.layout,items,item=>{if(item.action==='off'){this.close();return;}if(item.action==='next'){void this.openNextAssignment();return;}this.openApp(item.app);},'MARKNET');
  }
  renderDesktop(){
    const{x,y}=this.layout;
    this.createIcon(x+16,y+10,128,__dialogueText("ui/MarkAgencyComputerUI.js", "t_3c96cfd6d98b213a31e1"),'mail',0xe3d4a4,()=>this.openApp('mail'));
    this.createIcon(x+288,y+10,128,__dialogueText("ui/MarkAgencyComputerUI.js", "t_11f894470164a991c7ef"),'report',0xb7c9d1,()=>this.openApp('reports'));
    this.createIcon(x+424,y+10,128,__dialogueText("ui/MarkAgencyComputerUI.js", "t_b0eae702830c382ba1d9"),'ledger',0x9bc6b8,()=>this.openApp('ledger'));
    const unread=this.getMail().filter(item=>!this.isRead(item.id)).length;
    this.drawing.text(x+22,y+132,`${unread}${__dialogueText("ui/MarkAgencyComputerUI.js", "t_669634a162538855e5b3")}${unread===1?'':'s'}`,15,'#eadcae');
    if(canOpenNextAssignment(this.state))this.drawing.button(x+24,y+460,__dialogueText("ui/MarkAgencyComputerUI.js", "t_25b0fb759c5e45203e2f"),()=>{void this.openNextAssignment();},!this.nextAssignmentBusy);
  }
  createIcon(x,y,width,label,kind,color,callback){
    const d=this.drawing,scene=this.scene,cx=x+width/2,highlight=d.rectangle(x+4,y,width-8,118,0x2b6b7a,0),key=this.shell.iconKey(ICON_ART[kind]||kind);
    if(key){d.rectangle(cx-22,y+56,44,6,0,.28);d.add(scene.add.image(cx,y+34,key).setDisplaySize(48,48));}
    else{d.bevel(x+(width-60)/2,y+6,60,58,color);d.pixel(x+(width-60)/2+11,y+24,({mail:'@',report:'DOC',ledger:'$',globe:'WWW'})[kind]||'?',kind==='mail'?24:12,'#1b3e49');}
    const text=d.text(x+3,y+76,label,15,'#f5ecd6',width-6).setAlign('center');text.setFixedSize?.(width-6,46);
    const hit=d.rectangle(x,y,width,123,0,0).setInteractive({useHandCursor:true});
    hit.on('pointerover',()=>{highlight.setFillStyle(0x2b6b7a,.45);highlight.setStrokeStyle(2,0xdec98b,.9);});
    hit.on('pointerout',()=>{highlight.setFillStyle(0x2b6b7a,0);highlight.setStrokeStyle();});hit.on('pointerdown',callback);
  }
  renderApplication(){
    const d=this.drawing,{x,y,w,h}=this.layout;this.window=this.shell.rectFor({x:x+16,y:y+12,w:w-32,h:h-60});const b=this.window;
    d.rectangle(b.x+6,b.y+6,b.w,b.h,0x050a10,.4);d.bevel(b.x,b.y,b.w,b.h,0xd4d8cb);
    d.rectangle(b.x+4,b.y+4,b.w-8,32,0x204d5b);d.rectangle(b.x+4,b.y+4,b.w-8,13,0x3b7686,.55);d.rectangle(b.x+4,b.y+34,b.w-8,2,0x12303a);
    const info=APP_INFO[this.app];if(info)this.shell.drawSmallIcon(info,b.x+12,b.y+12,16);
    d.pixel(b.x+36,b.y+14,APPS[this.app]||'MARKNET',11,'#fff0ba');d.button(b.x+b.w-46,b.y+4,'X',()=>this.openApp('desktop'));
    if(this.app==='mail')this.renderMail();if(this.app==='ledger')this.renderLedger();if(this.app==='reports')this.renderReport();
  }
  renderLedger(){
    const d=this.drawing,b=this.window,balances=moneyManager.getBalances();
    d.text(b.x+20,b.y+52,`${__dialogueText("ui/MarkAgencyComputerUI.js", "t_d3cf22645fbbb6545f43")}${this.money(balances.agencyBudget)}${__dialogueText("ui/MarkAgencyComputerUI.js", "t_5df886c5d3946c1ae906")}${this.money(balances.agencyDebt)}`,20,'#203e47');
    d.text(b.x+20,b.y+88,__dialogueText("ui/MarkAgencyComputerUI.js", "t_31a36ecbeb7274c384d8"),15,'#5e674d');
    const rows=agencyLedgerRows(moneyManager.getRecentTransactions(100)),pages=Math.max(1,Math.ceil(rows.length/6));
    this.ledgerPage=Math.max(0,Math.min(this.ledgerPage,pages-1));
    if(!rows.length)d.text(b.x+24,b.y+154,__dialogueText("ui/MarkAgencyComputerUI.js", "t_c5badcf84a087f4aba3a"),19,'#526756');
    rows.slice(this.ledgerPage*6,(this.ledgerPage+1)*6).forEach((entry,i)=>{
      const ry=b.y+125+i*49;d.rectangle(b.x+14,ry,b.w-28,46,i%2?0xe4e3d0:0xf1eddc);
      const title=d.text(b.x+24,ry+4,entry.description||entry.category||__dialogueText("ui/MarkAgencyComputerUI.js", "t_e977570a360f400260c2"),16,'#283f46');d.fit(title,title.text,b.w-270);
      const date=new Date(entry.createdAt);d.text(b.x+24,ry+26,`${entry.accountLabel} / ${Number.isFinite(date.getTime())?date.toLocaleString('en-GB'):__dialogueText("ui/MarkAgencyComputerUI.js", "t_f332fef6195ab3d8d86a")}`,12,'#6b7568');
      d.text(b.x+b.w-24,ry+13,`${entry.prefix}${this.money(entry.displayAmount)}`,16,entry.prefix===__dialogueText("ui/MarkAgencyComputerUI.js", "t_0aa8c9f301e65c4456f7")?'#a33430':'#244f40').setOrigin(1,0);
    });
    const step=delta=>{this.ledgerPage=(this.ledgerPage+delta+pages)%pages;this.render();};
    d.button(b.x+18,b.y+b.h-46,'<',()=>step(-1),pages>1);d.text(b.x+80,b.y+b.h-35,`${this.ledgerPage+1}/${pages}`,14,'#29454a');d.button(b.x+150,b.y+b.h-46,'>',()=>step(1),pages>1);
  }
  persistReport(){
    if(this.app!=='reports'||!this.form?.ok||this.form.printed||this.form.submitted||getArchiveCaseId(this.state)!==this.reportCaseId)return;
    const result=saveMissionReportDraft(this.answers,this.locations(),this.state);if(result.ok&&!result.saved)this.notice=__dialogueText("ui/MarkAgencyComputerUI.js", "t_6e371f6a200132228ada");
  }
  renderReport(){
    const d=this.drawing,b=this.window,form=this.form;
    if(!form?.ok){d.text(b.x+26,b.y+75,form?.error||__dialogueText("ui/MarkAgencyComputerUI.js", "t_d6ef34ee8c3e2973f609"),21,'#29454a',b.w-52);return;}
    const readonly=form.printed||form.submitted,perPage=6,pages=Math.max(1,Math.ceil(form.fields.length/perPage));
    this.reportPage=Math.max(0,Math.min(this.reportPage,pages-1));d.text(b.x+20,b.y+48,__dialogueText("ui/MarkAgencyComputerUI.js", "t_8405824e71027d62d5a3"),15,'#374b4b');
    form.fields.slice(this.reportPage*perPage,(this.reportPage+1)*perPage).forEach((field,i)=>{
      const ry=b.y+82+i*47,prefix=field.id==='artifact'?__dialogueText("ui/MarkAgencyComputerUI.js", "t_07457e4b191f3891bafe"):field.id==='suspect'?__dialogueText("ui/MarkAgencyComputerUI.js", "t_4313171d346bb94247a3"):`${__dialogueText("ui/MarkAgencyComputerUI.js", "t_a07153b4708ee45e8595")}${Number(field.id.split(':')[1])+1}${__dialogueText("ui/MarkAgencyComputerUI.js", "t_e7ac0786668e0ff0f02b")}`;
      d.text(b.x+22,ry+10,prefix,16,'#28454b');d.bevel(b.x+178,ry,398,39,this.errors.has(field.id)?0xf0b5a8:field.id===this.activeField?0xf4df9a:0xf4efdd,true);
      const label=form.options.find(option=>option.id===this.answers[field.id])?.label||`[ ${field.hint} ]`,text=d.text(b.x+190,ry+10,label,17,'#223b40');d.fit(text,label,372);
      if(!readonly)d.rectangle(b.x+178,ry,398,39,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{
        if(this.activeField===field.id&&this.answers[field.id]){delete this.answers[field.id];this.errors.delete(field.id);this.persistReport();}this.activeField=field.id;this.render();
      });
    });
    if(pages>1){d.button(b.x+20,b.y+370,'<',()=>{this.reportPage=(this.reportPage-1+pages)%pages;this.render();});d.text(b.x+76,b.y+381,`${this.reportPage+1}/${pages}`,14,'#29454a');d.button(b.x+146,b.y+370,'>',()=>{this.reportPage=(this.reportPage+1)%pages;this.render();});}
    else d.text(b.x+20,b.y+378,__dialogueText("ui/MarkAgencyComputerUI.js", "t_4c1a5dfa9fb6efab7243"),14,'#6d725c',550);
    const ox=b.x+598,ow=b.w-614;d.text(ox,b.y+50,readonly?__dialogueText("ui/MarkAgencyComputerUI.js", "t_2c0cb6141b59b8140817"):__dialogueText("ui/MarkAgencyComputerUI.js", "t_51ed51cbf9afc19dda88"),15,'#28454b');
    if(!readonly){
      const optionPages=Math.max(1,Math.ceil(form.options.length/8));this.optionPage=Math.max(0,Math.min(this.optionPage,optionPages-1));
      form.options.slice(this.optionPage*8,(this.optionPage+1)*8).forEach((option,i)=>{
        const used=Object.values(this.answers).includes(option.id),oy=b.y+80+i*34;d.bevel(ox,oy,ow,29,used?0xb9c2b8:0xe3e4cd);
        const text=d.text(ox+8,oy+6,option.label,15,used?'#7e897e':'#28454b');d.fit(text,option.label,ow-16);
        if(!used)d.rectangle(ox,oy,ow,29,0,0).setInteractive({useHandCursor:true}).on('pointerdown',()=>{
          if(getArchiveCaseId(this.state)!==this.reportCaseId){this.openApp('reports');return;}if(!this.activeField)return;
          this.answers[this.activeField]=option.id;this.errors.delete(this.activeField);this.activeField=form.fields.find(field=>!this.answers[field.id])?.id??this.activeField;
          this.reportPage=Math.floor(Math.max(0,form.fields.findIndex(field=>field.id===this.activeField))/perPage);this.persistReport();this.render();
        });
      });
      if(optionPages>1){d.button(ox,b.y+358,'<',()=>{this.optionPage=(this.optionPage-1+optionPages)%optionPages;this.render();});d.button(ox+70,b.y+358,'>',()=>{this.optionPage=(this.optionPage+1)%optionPages;this.render();});}
      d.text(ox,b.y+400,__dialogueText("ui/MarkAgencyComputerUI.js", "t_3a0b596c399fddb9b36c"),13,'#546954',ow);
    }else d.text(ox,b.y+90,form.submitted?__dialogueText("ui/MarkAgencyComputerUI.js", "t_67cd889e0cd2538379f2"):__dialogueText("ui/MarkAgencyComputerUI.js", "t_0548e8b9e42a3950783a"),18,'#30574a',ow);
    if(!form.submitted)d.button(b.x+20,b.y+b.h-77,readonly?__dialogueText("ui/MarkAgencyComputerUI.js", "t_a075e6c0c9999238411d"):__dialogueText("ui/MarkAgencyComputerUI.js", "t_f8a8438b2477eec70f4f"),()=>this.printReport());
    d.text(b.x+20,b.y+b.h-32,this.notice||(form.submitted?__dialogueText("ui/MarkAgencyComputerUI.js", "t_fcddcd1c3ff2b3357656"):readonly?__dialogueText("ui/MarkAgencyComputerUI.js", "t_e173c8934f9d4bfc6538"):__dialogueText("ui/MarkAgencyComputerUI.js", "t_60ec8a6283f58ef7e727")),13,'#665535',b.w-40);
  }
  printReport(){
    if(getArchiveCaseId(this.state)!==this.reportCaseId){this.openApp('reports');return;}
    const result=printMissionReport(this.answers,this.locations(),this.state);this.errors=new Set(result.errors||[]);this.form=getMissionReportForm(this.locations(),this.state);
    this.notice=result.ok?__dialogueText("ui/MarkAgencyComputerUI.js", "t_57910a06c88f363850ea"):result.reason==='incorrect'?__dialogueText("ui/MarkAgencyComputerUI.js", "t_52cc1fe1b1ff765d4bf9"):result.reason==='full'?__dialogueText("ui/MarkAgencyComputerUI.js", "t_5db4455aef1265d50ddc"):result.reason==='conflict'?__dialogueText("ui/MarkAgencyComputerUI.js", "t_2c1e74695eb2db0c90bf"):result.error||__dialogueText("ui/MarkAgencyComputerUI.js", "t_e57e9ef0105760960f05");
    if(result.saved===false)this.notice+=__dialogueText("ui/MarkAgencyComputerUI.js", "t_791543ce420d634539b9");this.render();
  }
  destroy(){
    if(this.destroyed)return;this.close({restoreHud:false});this.destroyed=true;this.search.destroy();this.shell?.destroy();
    document.removeEventListener('keydown',this.onKey,true);window.removeEventListener('lost-artifacts:money-changed',this.onMoney);
    this.scene.scale.off('resize',this.onResize);this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);this.scene.events.off('sleep',this.onSleep);
    this.root?.destroy(true);this.root=null;this.content=null;
  }
}
installReportIncidentUI(MarkAgencyComputerUI);
