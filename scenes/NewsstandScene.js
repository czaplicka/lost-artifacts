import { dialogueText as __dialogueText, formatDialogueText } from '../dialogues/DialogueText.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { NEWSSTAND_CONFIG, normalizeNewsstandCityId, isEditableTarget } from '../config/newsstandConfig.js';
import { SPILL_BRAND as B } from '../config/spillBrand.js';
import { NewsstandPurchaseFeedback } from '../systems/newsstand/NewsstandPurchaseFeedback.js';
import { NewsstandBackground } from '../systems/newsstand/NewsstandBackground.js';
import { NewsstandHotspots } from '../systems/newsstand/NewsstandHotspots.js';
import { NewsstandComix } from '../systems/newsstand/NewsstandComix.js';
import { prepareNewspaperBackground, hasReadableCoverLines } from '../ui/NewspaperAssets.js';
import { preloadShopPurchaseAudio, playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';
import { MonthlySpillReader } from '../systems/newsstand/MonthlySpillReader.js';
import { MONTHLY_SPILL_ISSUE as ISSUE } from '../systems/newsstand/MonthlySpillIssue.js';
import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import { ensureDailyPaperTexture } from '../ui/NewspaperPaper.js';


const T=id=>__dialogueText('scenes/NewsstandScene.js',id);
const COMIC_TITLES=Object.freeze({
  comix_1:T('t_1440c04fa9bd6b64073a'),comix_2:T('t_fc3a4140d3d6bae0d001'),
  comix1:T('t_1440c04fa9bd6b64073a'),comix2:T('t_fc3a4140d3d6bae0d001'),
});
const MONTHLY_ID='monthly_spill';
const PAPER_KEY='paper_monthly_spill_clean';
// Kolory i fonty wspólne z Daily Spill online (config/spillBrand.js).
const PRIMARY=B.banner,DARK=B.bannerDark,ACCENT=B.accent,CREAM=B.panel;
const WHITE='#fff8e8',INK=B.ink,HEADLINE='Impact, Arial Black, sans-serif';
const HUD_SCENE_KEYS=['PlayerHudScene','UIScene','NewsHud'];
// Odległość prawej krawędzi licznika kasy od prawej krawędzi ekranu (px).
// Zwiększ, żeby przesunąć licznik bardziej w lewo.
const CASH_RIGHT_MARGIN=260;
const CASH_TOP=20;


function getComicTitle(config){
  return COMIC_TITLES[config.textureKey]||COMIC_TITLES[config.id]||config.title||config.label||T('t_57f03717b2540f999475');
}
function validTimeData(json){
  return (Array.isArray(json.covers)&&json.covers.some(cover=>hasReadableCoverLines(cover?.coverLines)))||hasReadableCoverLines(json.coverLines);
}


class MonthlySpillTabloidReader extends MonthlySpillReader {
  open(){
    if(this.isOpen||!ISSUE.pages.length)return;
    this.hudScene=this.scene.game.scene.keys?.PlayerHudScene;
    this.hudWasVisible=this.hudScene?.sys.isVisible()??false;
    this.hudScene?.sys.setVisible(false);
    try{super.open();}catch(error){this.dispose();throw error;}
  }
  dispose(){
    try{if(this.isOpen)super.dispose();}
    finally{this.hudScene?.sys.setVisible(this.hudWasVisible);this.hudScene=null;}
  }
  drawPage(parent,x,yOrIndex,explicitIndex){
    const index=explicitIndex??yOrIndex;
    const y=explicitIndex===undefined?0:yOrIndex;
    const data=ISSUE.pages[index];
    if(!data)return;
    const page=this.scene.add.container(x,y);parent.add(page);
    page.add(this.scene.add.image(0,0,this.paperKey).setOrigin(0).setDisplaySize(740,1000));
    const box=(left,top,w,h,color)=>{
      const shape=this.scene.add.rectangle(left,top,w,h,color).setOrigin(0);page.add(shape);return shape;
    };
    const text=(value,left,top,w,h,size,options={})=>{
      if(value==null||value==='')return;
      const label=this.scene.add.text(left,top,String(value),{
        fontFamily:options.display?B.fontDisplay:options.headline?HEADLINE:B.fontBody,
        fontStyle:options.headline&&!options.display?'bold':'',
        fontSize:`${size}px`,color:options.color||INK,lineSpacing:options.headline?-2:5,
        wordWrap:{width:w,useAdvancedWrap:true},
      });
      while((label.height>h||label.width>w)&&size>12)label.setFontSize(--size);
      if(label.height>h||label.width>w)label.setScale(Math.min(h/label.height,w/label.width));
      if(options.center)label.x+=(w-label.displayWidth)/2;
      page.add(label);return label;
    };
    const banner=(value,left,top,w,color,ink=WHITE)=>{
      box(left,top,w,37,color);
      text(value,left+9,top+3,w-18,31,18,{display:true,color:ink,center:true});
    };
    const big=(value,left,top,w,h,size)=>text(String(value??'').toUpperCase(),left,top,w,h,size,{headline:true});
    if(data.type==='cover'){
      text(ISSUE.edition,34,23,672,25,17,{color:B.muted});box(34,54,672,111,PRIMARY);
      text(B.monthlyTitle,48,63,644,87,78,{display:true,color:B.headline,center:true});
      text(B.tagline,34,180,672,40,23,{color:B.heading});banner('EXCLUSIVE',34,232,197,ACCENT,INK);
      big(data.headline,34,289,672,375,130);text(data.deck,34,682,672,120,30);
      const teasers=(data.teasers||[]).slice(0,3);
      teasers.forEach((line,i)=>{
        const w=(672-(teasers.length-1)*7)/teasers.length,left=34+i*(w+7);
        box(left,814,w,120,i%2?ACCENT:PRIMARY);
        text(String(line).toUpperCase(),left+10,826,w-20,99,31,{headline:true,color:i%2?INK:WHITE});
      });
    }else{
      banner(data.section||B.monthlyTitle,34,30,672,PRIMARY);big(data.headline,34,87,672,178,75);
      text(data.deck,34,269,672,72,26);
      const body=Array.isArray(data.body)?data.body.join('\n\n'):data.body;
      if(data.type==='contents'){
        text(body,34,376,672,190,25);
        if(data.quote)text(`“${data.quote}”`,34,580,672,85,28,{color:B.heading});
        banner('IN THIS ISSUE',34,674,672,DARK);
        const rows=data.contents||[],rowHeight=Math.min(42,215/Math.max(1,rows.length));
        rows.forEach(([number,label],i)=>{
          const top=719+i*rowHeight;
          const hit=box(34,top,672,rowHeight-2,i%2?CREAM:ACCENT).setInteractive({useHandCursor:true});
          text(label,46,top+4,586,rowHeight-8,23,{headline:true});
          text(number,650,top+4,46,rowHeight-8,23,{headline:true});
          hit.on('pointerup',(_pointer,_x,_y,event)=>{
            event?.stopPropagation();const next=Number(number)-1;
            if(!this.isOpen||this.busy||!Number.isInteger(next)||next<0||next>=ISSUE.pages.length)return;
            this.page=next;this.save();this.rustle();this.render();
          });
        });
      }else if(data.type==='horoscope'){
        const entries=data.entries||[],rowHeight=Math.min(57,556/Math.max(1,entries.length));
        entries.forEach(([sign,prediction],i)=>{
          const top=373+i*rowHeight;
          box(34,top,142,rowHeight-3,i%2?ACCENT:PRIMARY);
          text(sign,43,top+5,124,rowHeight-10,22,{headline:true,color:i%2?INK:WHITE});
          text(prediction,190,top+5,516,rowHeight-10,22);
        });
      }else{
        const copy=String(body??'').trim(),middle=Math.floor(copy.length/2);
        const before=copy.lastIndexOf(' ',middle),after=copy.indexOf(' ',middle);
        const split=before>0?before:after>0?after:copy.length;
        const left=copy.slice(0,split).trim(),right=copy.slice(split).trim();
        const bodyHeight=data.quote||data.fine?380:550;
        text(left,34,376,right?317:672,bodyHeight,26);
        if(right)text(right,389,376,317,bodyHeight,26);
        if(data.quote){box(34,774,672,106,ACCENT);text(`“${data.quote}”`,49,787,642,80,37,{headline:true});}
        if(data.fine)text(data.fine,34,896,672,38,17,{color:B.muted});
      }
    }
    text(ISSUE.edition,34,961,600,25,16,{color:B.muted});text(index+1,661,959,45,28,21,{headline:true,color:B.heading});
  }
}


export class NewsstandScene extends BaseScene {
  constructor(){
    super({key:'NewsstandScene'});
    this.handleResize=this.handleResize.bind(this);
    this.handleEscape=this.handleEscape.bind(this);
    this.handleShutdown=this.handleShutdown.bind(this);
  }
  init(data={}){
    this.cityId=normalizeNewsstandCityId(data.cityId||gameState.currentCityId||this.registry.get('currentCityId')||this.registry.get('currentCity')||'paris');
    this.isOpeningNewspaper=false;this.isShuttingDown=false;this.sceneRunToken={};
    this.background=null;this.hotspots=null;this.comix=null;this.closeButton=null;this.monthlyReader=null;
    this.cashLabel=null;this.cashTimer=null;this.hiddenHud=null;
  }
  preload(){preloadShopPurchaseAudio(this);}
  create(){
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.handleShutdown);
    this.scale.on('resize',this.handleResize);
    if(this.input.keyboard)this.trackInputEvent(this.input.keyboard,'keydown-ESC',this.handleEscape);
    EventBus.emit('hideHUD');
    this.hideBottomMenu();
    this.purchaseFeedback=new NewsstandPurchaseFeedback(this);
    this.background=new NewsstandBackground(this,()=>this.hotspots?.resize());this.background.create();
    this.comix=new NewsstandComix(this);this.comix.create();
    this.hotspots=new NewsstandHotspots(this,this.background);this.hotspots.create();
    this.createCloseButton();this.createCashLabel();
    this.monthlyReader=new MonthlySpillTabloidReader(this);
  }
  hideBottomMenu(){
    try{
      const manager=this.game.scene;
      const hudPlayer=manager.keys?.PlayerHudScene;
      hudPlayer?.closeAllUIPanels?.();
      hudPlayer?._panelInstances?.get('playerMenu')?.close?.();
      const news=manager.keys?.NewsHud;
      news?.closeMenu?.(true);
      news?.setHudVisible?.(false);
      const dom=document.getElementById('hud-container');
      this.hiddenHud={
        scenes:HUD_SCENE_KEYS.filter(key=>manager.keys?.[key]).map(key=>({key,visible:manager.keys[key].sys.settings.visible!==false})),
        news,newsEnabled:news?.hudEnabled,dom,display:dom?.style.display
      };
      for(const {key} of this.hiddenHud.scenes)manager.keys[key].sys.setVisible(false);
      if(dom)dom.style.display='none';
    }catch(error){console.warn('[NewsstandScene] Could not hide bottom menu:',error);}
  }
  restoreBottomMenu(){
    const saved=this.hiddenHud;this.hiddenHud=null;
    if(!saved)return;
    try{
      const manager=this.game.scene;
      for(const {key,visible} of saved.scenes)manager.keys?.[key]?.sys.setVisible(visible);
      if(saved.news&&saved.newsEnabled!==false)saved.news.setHudVisible?.(true);
      if(saved.dom)saved.dom.style.display=saved.display??'';
    }catch(error){console.warn('[NewsstandScene] Could not restore bottom menu:',error);}
  }
  readCash(){
    try{return Number(moneyManager.getBalance(MONEY_SOURCE.CASH))||0;}catch{return 0;}
  }
  getCashX(){
    return Math.max(120,this.scale.width-CASH_RIGHT_MARGIN);
  }
  createCashLabel(){
    this.cashLabel=this.add.text(this.getCashX(),CASH_TOP,formatDialogueText(__dialogueText("scenes/NewsstandScene.js", "t_0e8ba4f4b9de20a7acad"),{amount:this.readCash()}),{
      fontFamily:'PressStart2P',fontSize:'16px',color:'#ffd943',backgroundColor:'#111111',padding:{x:10,y:8},
    }).setOrigin(1,0).setDepth(30).setScrollFactor(0);
    this.cashTimer=this.time.addEvent({delay:300,loop:true,callback:()=>this.refreshCash()});
  }
  refreshCash(){
    if(!this.cashLabel?.active)return;
    this.cashLabel.setText(formatDialogueText(__dialogueText("scenes/NewsstandScene.js", "t_0e8ba4f4b9de20a7acad"),{amount:this.readCash()}));
    this.cashLabel.setPosition(this.getCashX(),CASH_TOP);
  }
  getActiveCityId(){
    return normalizeNewsstandCityId(gameState.currentCityId||this.cityId||this.registry.get('currentCityId')||this.registry.get('currentCity')||'paris');
  }
  isPurchaseBlocked(){
    return Boolean(this.monthlyReader?.isOpen||this.isShuttingDown||this.hotspots?.debugMode||
      this.isOpeningNewspaper||this.comix?.isOpen||this.comix?.isAnimating||this.scene.isActive('NewspaperOverlayScene'));
  }
  getCurrentGameDay(){
    return Math.max(1,Number(gameState.currentDay??gameState.day??this.registry.get('currentDay')??this.registry.get('day')??1)||1);
  }
  getNewspaperPurchaseKey(cityId,newspaperId){
    const normalize=value=>String(value).trim().toLowerCase().replace(/\s+/g,'_');
    return `${normalize(cityId||'unknown_city')}:${this.getCurrentGameDay()}:${normalize(newspaperId||'daily')}`;
  }
  ensureNewspaperAccessState(){
    const key=NEWSSTAND_CONFIG.newspaperAccessKey;
    if(!gameState[key]||typeof gameState[key]!=='object'||Array.isArray(gameState[key]))gameState[key]={};
    return gameState[key];
  }
  hasNewspaperAccessForToday(cityId,newspaperId){
    return this.ensureNewspaperAccessState()[this.getNewspaperPurchaseKey(cityId,newspaperId)]===true;
  }
  markNewspaperAccessForToday(cityId,newspaperId){
    const key=this.getNewspaperPurchaseKey(cityId,newspaperId);
    this.ensureNewspaperAccessState()[key]=true;requestAutosave();return key;
  }
  checkNewspaperAssets(config,cityId){
    const jsonKey=`newspaper_${config.type}_${cityId}`,json=this.cache.json.get(jsonKey);
    let backgroundKey=null,backgroundError=null;
    let dataValid=Boolean(json&&typeof json==='object'&&!Array.isArray(json));
    if(dataValid)dataValid=config.type==='time'?validTimeData(json):Array.isArray(json.articles);
    if(dataValid){
      try{backgroundKey=prepareNewspaperBackground(this,config.type,config.backgroundKey);}
      catch(error){backgroundError=error;}
    }
    if(!dataValid||!backgroundKey){
      console.error('[NewsstandScene] Newspaper unavailable:',{
        cityId,type:config.type,jsonKey,jsonExists:Boolean(json),dataValid,backgroundKey,
        backgroundExists:Boolean(backgroundKey),backgroundError,
        dataKeys:json&&typeof json==='object'?Object.keys(json):[],coverCount:Array.isArray(json?.covers)?json.covers.length:0,
      });
      this.showPurchaseErrorMessage([
        T('t_6e4e38a82d6da4220306'),'',`${config.label} — ${cityId}`,
        T('t_fc898ee3e828da14e14b'),T('t_14c5af19c1b64e0f2a0c'),'',T('t_856aaa20b1946b6a2f59'),
      ].join('\n'));return null;
    }
    return jsonKey;
  }
  async buyAndOpenNewspaper(config){
    if(config.id===MONTHLY_ID)return this.buyAndOpenMonthly();
    if(this.isPurchaseBlocked())return;
    this.isOpeningNewspaper=true;const runToken=this.sceneRunToken;
    try{
      const cityId=this.getActiveCityId(),jsonKey=this.checkNewspaperAssets(config,cityId);
      if(!jsonKey)return;
      const backgroundKey=prepareNewspaperBackground(this,config.type,config.backgroundKey);
      const alreadyPaidToday=this.hasNewspaperAccessForToday(cityId,config.id);
      let purchaseId=null;
      if(!alreadyPaidToday){
        const purchase=moneyManager.spend(config.price,{
          source:MONEY_SOURCE.CASH,category:ECONOMY_CATEGORY.NEWSPAPER,
          description:`${T('t_72376dd63e428c1936bd')}${config.type}${T('t_f66a4e8e007d929aae5a')}${cityId}${T('t_5a5b31ba89fb62fb5c09')}${this.getCurrentGameDay()}`,
          metadata:{cityId,newspaperId:config.id,newspaperType:config.type,gameDay:this.getCurrentGameDay()},
        });
        if(!purchase.ok){this.showNotEnoughMoneyMessage(config.label,purchase.required,purchase.available);return;}
        purchaseId=purchase.transaction?.id||null;
        if(Number(config.price)>0)playShopPurchaseAudio(this);
        this.markNewspaperAccessForToday(cityId,config.id);
        this.refreshCash();
      }
      this.showPurchaseConfirmation(config.label,alreadyPaidToday?0:config.price,alreadyPaidToday);
      this.cityId=cityId;this.stopSceneIfActive('NewspaperOverlayScene');
      const opened=await this.launchOverlay('NewspaperOverlayScene',{
        cityId,type:config.type,jsonKey,backgroundKey,purchaseId,alreadyPaidToday,sourceScene:'NewsstandScene',
      });
      if(!opened&&this.sceneRunToken===runToken&&this.sys.isActive())this.showPurchaseErrorMessage();
    }catch(error){
      console.error('[NewsstandScene] Newspaper purchase/open failed:',error);
      if(this.sceneRunToken===runToken&&this.sys.isActive())this.showPurchaseErrorMessage();
    }finally{if(this.sceneRunToken===runToken)this.isOpeningNewspaper=false;}
  }
  buyAndOpenComix(config){
    if(this.isPurchaseBlocked())return;
    if(!this.textures.exists(config.textureKey)){
      console.error('[NewsstandScene] Missing comix texture:',config.textureKey);
      this.showPurchaseErrorMessage(T('t_ebc2f256c7722e4e5425'));return;
    }
    const cityId=this.getActiveCityId(),comicTitle=getComicTitle(config);
    const purchase=moneyManager.spend(config.price,{
      source:MONEY_SOURCE.CASH,category:ECONOMY_CATEGORY.ITEM,
      description:`${T('t_d168dc3140834c69d373')}${comicTitle}${T('t_2eb9d0d30d4ceaac52e6')}${cityId}`,
      metadata:{cityId,comixId:config.id,textureKey:config.textureKey,comicTitle},
    });
    if(!purchase.ok){this.showNotEnoughMoneyMessage(comicTitle,purchase.required,purchase.available);return;}
    if(Number(config.price)>0)playShopPurchaseAudio(this);
    this.refreshCash();
    this.showPurchaseConfirmation(comicTitle,config.price);
    this.comix.open(config.textureKey);
  }
  buyAndOpenMonthly(){
    const reader=this.monthlyReader;
    if(!reader||this.isPurchaseBlocked())return;
    try{
      reader.paperKey=ensureDailyPaperTexture(this,{...NewspaperLayoutConfig.daily,structure:{}},PAPER_KEY);
      if(!reader.paperKey)throw new Error('Could not create clean Monthly Spill paper.');
      const alreadyOwned=gameState.monthlyMagazineAccess?.[ISSUE.id]===true;
      if(!alreadyOwned){
        const purchase=moneyManager.spend(ISSUE.price,{
          source:MONEY_SOURCE.CASH,category:ECONOMY_CATEGORY.NEWSPAPER,
          description:`Monthly magazine: ${ISSUE.title}, ${ISSUE.edition}`,
          metadata:{magazineId:ISSUE.id,newspaperType:'monthly',cityId:this.getActiveCityId()},
        });
        if(!purchase.ok){this.showNotEnoughMoneyMessage(ISSUE.title,purchase.required,purchase.available);return;}
        const access=gameState.monthlyMagazineAccess;
        if(!access||typeof access!=='object'||Array.isArray(access))gameState.monthlyMagazineAccess={};
        gameState.monthlyMagazineAccess[ISSUE.id]=true;requestAutosave();
        if(ISSUE.price>0)playShopPurchaseAudio(this);
        this.refreshCash();
      }
      this.showPurchaseConfirmation(ISSUE.title,alreadyOwned?0:ISSUE.price,alreadyOwned);
      reader.open();
    }catch(error){console.error('[NewsstandScene] Could not open Monthly Spill:',error);this.showPurchaseErrorMessage();}
  }
  showPurchaseConfirmation(item,paid,alreadyOwned=false){
    try{
      this.purchaseFeedback?.show(item,paid,moneyManager.getBalance(MONEY_SOURCE.CASH),alreadyOwned);
    }catch(error){console.warn('[NewsstandScene] Purchase feedback unavailable:',error);}
  }
  createMessage(text,options={}){
    const message=this.add.text(this.scale.width/2,this.scale.height/2,text,{
      fontFamily:'SpecialElite',fontSize:`${options.fontSize||26}px`,color:options.color||'#ffd966',
      backgroundColor:options.backgroundColor||'#2b1711',align:'center',padding:{x:26,y:22},
      stroke:T('t_7b2817bf9b80e66d07f2'),strokeThickness:5,wordWrap:{width:Math.max(100,this.scale.width-100)},
    }).setOrigin(0.5).setDepth(501).setInteractive({useHandCursor:true});
    if(options.animate){
      message.setAlpha(0);this.addTrackedTween(this.tweens.add({targets:message,alpha:1,duration:120,ease:'Quad.Out'}));
    }
    message.once('pointerup',()=>{
      if(!options.animate){message.destroy();return;}
      this.tweens.killTweensOf(message);
      this.addTrackedTween(this.tweens.add({targets:message,alpha:0,duration:120,ease:'Quad.In',onComplete:()=>message.destroy()}));
    });return message;
  }
  showNotEnoughMoneyMessage(itemName,required,available){
    this.createMessage([
      T('t_6be6ca2970b895ce233a'),'',`${itemName}: $${required}`,`${T('t_51c5271245b3a6604592')}${available}`,'',
      T('t_f12f9ac691c607b4dc58'),T('t_8816da0ecf3e6b3508a8'),
    ].join('\n'),{fontSize:28,color:'#f7e6b5',backgroundColor:'#1d1511',animate:true});
  }
  showPurchaseErrorMessage(text=null){
    this.createMessage(text||[
      T('t_e1ef1a69660e446c6464'),'',T('t_1c782f5df0ba65474f76'),T('t_f72ca12ba5ee2ce0788f'),'',T('t_6ab151e9af18ce933026'),
    ].join('\n'));
  }
  createCloseButton(){
    this.closeButton=this.add.text(28,20,T('t_4b68ab3847feda7d6c62'),{
      fontFamily:'PressStart2P',fontSize:'16px',color:'#ffffff',backgroundColor:'#111111',padding:{x:10,y:8},
    }).setOrigin(0,0).setDepth(30).setInteractive({useHandCursor:true});
    this.closeButton.on('pointerup',()=>{
      if(this.comix?.isOpen){this.comix.close(()=>this.closeScene());return;}this.closeScene();
    });
  }
  handleEscape(event){
    if(event?.repeat||event?.ctrlKey||event?.metaKey||event?.altKey||isEditableTarget(event))return;
    if(this.monthlyReader?.isOpen){this.monthlyReader.close();return;}
    if(this.scene.isActive('NewspaperOverlayScene'))return;
    if(this.hotspots?.debugMode){this.hotspots.setDebugMode(false);return;}
    if(this.comix?.isOpen){this.comix.close();return;}
    this.closeScene();
  }
  handleResize(){
    this.background?.resize();this.hotspots?.resize();this.comix?.resize();this.monthlyReader?.resize();
    this.refreshCash();
  }
  closeScene(){
    if(this.isOpeningNewspaper||this.comix?.isAnimating||this.isShuttingDown)return;
    this.hotspots?.setDebugMode(false);this.scene.stop();
  }
  handleShutdown(){
    if(this.isShuttingDown)return;
    this.isShuttingDown=true;this.sceneRunToken=null;
    this.cashTimer?.remove(false);this.cashTimer=null;this.cashLabel=null;
    this.purchaseFeedback?.destroy();this.purchaseFeedback=null;
    this.monthlyReader?.destroy();this.monthlyReader=null;
    this.scale.off('resize',this.handleResize);
    this.stopSceneIfActive('NewspaperOverlayScene');
    this.hotspots?.destroy();this.comix?.destroy();this.background?.destroy();
    this.hotspots=null;this.comix=null;this.background=null;this.closeButton=null;
    this.isOpeningNewspaper=false;
    this.restoreBottomMenu();
    EventBus.emit('showHUD');
  }
}