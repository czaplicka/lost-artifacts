import { ComputerDrawing } from './pi-computer/ComputerDrawing.js';
import { ComputerMonitor } from './pi-computer/ComputerMonitor.js';
import { ComputerDesktop } from './pi-computer/ComputerDesktop.js';
import { ComputerDocuments } from './pi-computer/ComputerDocuments.js';
import { ComputerLedger } from './pi-computer/ComputerLedger.js';
import { ComputerSearch } from './pi-computer/ComputerSearch.js';
import { PhotoPIQuest } from './pi-computer/PhotoPIQuest.js';

export class PIOfficeComputerUI{
  constructor(scene,options={}){
    Object.assign(this,{scene,options,isOpen:false,suspended:false,destroyed:false,app:'desktop',selectedId:null,listPage:0,bodyPage:0,
      notice:'',accepting:false,layout:null,window:null,content:null,viewToken:0,menuOpen:false,booting:false,bootStep:0,bootLines:null,
      hasBooted:false,powerOn:false,jokeIndex:0,fontsChecked:false});
    this.root=scene.add.container(0,0).setDepth(1500).setVisible(false);
    this.drawing=new ComputerDrawing(this);this.monitor=new ComputerMonitor(this);this.desktop=new ComputerDesktop(this);
    this.documents=new ComputerDocuments(this);this.ledger=new ComputerLedger(this);this.search=new ComputerSearch(this);this.photoQuest=new PhotoPIQuest(this);
    this.onKey=event=>{
      if(this.destroyed||!this.isOpen||this.suspended)return;
      const target=event.target;if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
      if(this.photoQuest.debugEditor.handleKey(event))return;
      if(event.code!=='Escape')return;event.preventDefault();
      if(this.booting){this.monitor.finishBoot();return;}
      if(this.menuOpen){this.menuOpen=false;this.render();return;}
      if(this.app==='photo'){this.photoQuest.returnToMail();return;}
      if(this.notice&&this.app==='desktop'){this.notice='';this.render();return;}
      if(this.app!=='desktop')this.openApp('desktop');else this.close();
    };
    this.onResize=()=>{if(this.isOpen&&!this.suspended&&!this.destroyed)this.render();};
    scene.input.keyboard?.on('keydown',this.onKey);scene.scale.on('resize',this.onResize);scene.events.once('shutdown',this.destroy,this);
  }
  open(){
    if(this.destroyed||this.isOpen)return;
    Object.assign(this,{isOpen:true,suspended:false,app:'desktop',selectedId:null,listPage:0,bodyPage:0,notice:'',menuOpen:false,booting:false,powerOn:true});
    this.viewToken++;this.root.setVisible(true);this.options.onOpen?.();this.ensureFonts();
    if(!this.options.skipBoot)this.monitor.startBoot();this.render();void this.photoQuest.load();
  }
  close(){
    if(this.destroyed||!this.isOpen||this.suspended)return;
    Object.assign(this,{isOpen:false,suspended:false,menuOpen:false,booting:false});this.photoQuest.debugEditor.enabled=false;
    this.monitor.stopBoot();this.monitor.clearFx();this.viewToken++;this.root.setVisible(false);this.options.onClose?.();
  }
  suspend(){
    if(this.destroyed||!this.isOpen)return;
    Object.assign(this,{suspended:true,menuOpen:false,booting:false});this.photoQuest.debugEditor.enabled=false;
    this.monitor.stopBoot();this.monitor.clearFx();this.viewToken++;this.root.setVisible(false);
  }
  resume(){
    if(this.destroyed||!this.isOpen)return;
    Object.assign(this,{suspended:false,app:'desktop',notice:'',menuOpen:false,booting:false,powerOn:false});this.viewToken++;this.root.setVisible(true);this.render();
  }
  openApp(app){
    if(this.destroyed||!this.isOpen||this.suspended)return;this.menuOpen=false;
    if(app==='investigations'){this.launchExternal(this.options.onOpenInvestigations,'The investigation board is currently unavailable.');return;}
    if(app==='travel'){this.launchExternal(this.options.onOpenWorldTravel,'World travel is currently unavailable.');return;}
    if(!['desktop','mail','ledger','classifieds','search'].includes(app))return;
    Object.assign(this,{app,selectedId:null,listPage:0,bodyPage:0,notice:''});this.viewToken++;this.render();
    if(app==='search')void this.search.load();if(app==='mail'||app==='classifieds')void this.photoQuest.load();
  }
  launchExternal(callback,message){
    if(typeof callback!=='function'){this.notice=message;this.render();return;}
    try{const result=callback();if(result?.catch)result.catch(error=>this.handleExternalError(error,message));}
    catch(error){this.handleExternalError(error,message);}
  }
  handleExternalError(error,message){
    console.error('[PIOfficeComputerUI] Application failed:',error);if(this.destroyed||!this.isOpen)return;
    if(this.suspended)this.resume();this.notice=message;this.render();
  }
  ensureFonts(){
    if(this.fontsChecked||typeof document==='undefined'||!document.fonts)return;this.fontsChecked=true;
    const specs=['16px "Special Elite"','10px "Press Start 2P"'];
    try{if(specs.every(spec=>document.fonts.check(spec)))return;}catch(_){return;}
    Promise.all(specs.map(spec=>document.fonts.load(spec))).then(()=>{if(!this.destroyed&&this.isOpen&&!this.suspended)this.render();}).catch(()=>{});
  }
  money(value){if(!Number.isFinite(value))return 'Unknown';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);}
  render(){this.monitor.render();}
  getMail(){return this.documents.getMail();}getClassifieds(){return this.documents.getClassifieds();}
  getLedger(){return this.ledger.getData();}formatLedgerDate(value){return this.ledger.formatDate(value);}
  addToContent(object){return this.drawing.add(object);}text(...args){return this.drawing.text(...args);}pixel(...args){return this.drawing.pixel(...args);}
  rectangle(...args){return this.drawing.rectangle(...args);}bevel(...args){return this.drawing.bevel(...args);}button(...args){return this.drawing.button(...args);}
  drawMonitorDetails(){return this.monitor.drawMonitorDetails();}drawWallpaper(){return this.monitor.drawWallpaper();}drawTaskbar(){return this.monitor.drawTaskbar();}
  renderDesktop(){return this.desktop.render();}createDesktopIcon(...args){return this.desktop.createIcon(...args);}renderApplication(){return this.monitor.renderApplication();}
  renderDocuments(){return this.documents.render();}changeListPage(...args){return this.documents.changeListPage(...args);}renderPagedText(...args){return this.documents.renderPagedText(...args);}
  renderLedger(){return this.ledger.render();}
  async acceptMission(advert){
    if(this.accepting||this.destroyed||!this.isOpen||this.suspended||this.app!=='classifieds'||typeof this.options.onAcceptMission!=='function'||!advert?.missionId)return;
    const token=this.viewToken,advertId=advert.id;this.accepting=true;this.notice='';this.render();let message='';
    try{const result=await this.options.onAcceptMission(advert);message=result?.ok?result.message||'Job accepted.':result?.message||'This job could not be accepted.';}
    catch(error){console.error('[PIOfficeComputerUI] Accept job failed:',error);message='Could not accept this job. Please try again.';}
    finally{this.accepting=false;if(!this.destroyed&&this.isOpen&&!this.suspended){if(token===this.viewToken&&this.app==='classifieds'&&this.selectedId===advertId)this.notice=message;this.render();}}
  }
  destroy(){
    if(this.destroyed)return;this.suspended=false;this.close();this.destroyed=true;this.photoQuest.destroy();this.search.destroy();this.viewToken++;
    this.monitor.stopBoot();this.monitor.clearFx();this.scene.input.keyboard?.off('keydown',this.onKey);this.scene.scale.off('resize',this.onResize);this.scene.events.off('shutdown',this.destroy,this);
    this.root?.destroy(true);this.root=null;this.content=null;this.layout=null;this.window=null;
  }
}
