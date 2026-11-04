import { CrimeBoardUI } from './CrimeBoardUI.js';
import { CrimeBoard } from '../CrimeBoard.js';
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import {
  registerPICase, getPICase, getPICases, getSelectedPICaseId,
  selectPICase, savePIBoard
} from '../managers/PIInvestigationManager.js';

const HOLLY_CASE_ID='holly_missing_husband';
const EDITOR_IDS={
  formId:'crime-board-form',emptyStateId:'crime-board-empty-state',fieldsWrapId:'crime-board-fields',
  dynamicFieldsId:'crime-board-type-fields',jsonOutputId:'board-json-output',saveBtnId:'board-save-btn',
  loadBtnId:'board-load-btn',applyBtnId:'crime-board-apply-btn',deleteBtnId:'crime-board-delete-btn',
  addPhotoBtnId:'add-photo-btn',addNoteBtnId:'add-note-btn',addEvidenceBtnId:'add-evidence-btn',
  linksListId:'crime-board-links-list',linksEmptyId:'crime-board-links-empty',verifyMotiveBtnId:'crime-board-verify-motive-btn'
};
const PI_STYLE=`
.pi-crime-board-ui .pi-board-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}
.pi-crime-board-ui .pi-board-header button[aria-pressed="true"]{background:#7b2529;color:#fff4d4;}
.pi-crime-board-ui .crime-board__anchor{opacity:.85!important;pointer-events:auto!important;width:14px;height:14px;background:#b3131b;border:2px solid #ffe3b0;border-radius:50%;z-index:30;}
.pi-crime-board-ui .crime-board__item.is-hidden .crime-board__anchor{pointer-events:none!important;}
.pi-crime-board-ui .crime-board__photo-frame{position:relative;}
.pi-crime-board-ui .pi-board-photo-zoom{position:absolute;right:6px;bottom:6px;z-index:20;padding:5px 8px;border:1px solid #d6b375;background:#18231eea;color:#fff0cf;font:14px SpecialElite,monospace;cursor:zoom-in;}
.pi-crime-board-ui .pi-board-link-mode .crime-board__item{cursor:crosshair;}
.pi-board-photo-dialog{box-sizing:border-box;width:min(96vw,1400px);max-width:96vw;max-height:94vh;padding:14px;border:2px solid #b9975b;background:#19221e;color:#fff0cf;font-family:SpecialElite,monospace;}
.pi-board-photo-dialog::backdrop{background:#000c;}
.pi-board-photo-dialog[open]{display:flex;flex-direction:column;gap:10px;}
.pi-board-photo-dialog .pi-photo-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.pi-board-photo-dialog .pi-photo-title{flex:1;min-width:140px;margin:0;font-size:20px;}
.pi-board-photo-dialog button{font:16px SpecialElite,monospace;padding:7px 12px;cursor:pointer;background:#eee2c0;color:#18231e;border:1px solid #b9975b;}
.pi-board-photo-dialog .pi-photo-stage{overflow:auto;max-height:70vh;min-height:120px;background:#0b100e;padding:8px;}
.pi-board-photo-dialog img{display:block;max-width:none;max-height:none;height:auto;margin:0 auto;}
.pi-board-photo-dialog .pi-photo-caption{margin:0;white-space:pre-wrap;}
`;

class PrivateInvestigationBoard extends CrimeBoard{
  constructor(root,options={}){
    super(root,options);
    this.piLinkMode=false;this.piLoading=false;
    this.piOnChange=options.onChange;this.piOnStatus=options.onLinkState;this.piOnPhoto=options.onPhoto;
  }
  createDeductionPanel(){}
  getMotiveDeductionRequest(){return null;}
  refreshDeductionPanel(){}
  verifyMotiveGuess(){return{verified:false,reason:'PI_MOTIVE_CHECK_DISABLED'};}
  hasVerifiedCorrectMotive(){return false;}
  loadBoard(data){
    this.piLoading=true;
    try{return super.loadBoard(data);}finally{this.piLoading=false;}
  }
  syncJsonOutput(...args){
    const result=super.syncJsonOutput(...args);
    if(!this.piLoading&&!this.destroyed)this.piOnChange?.(this.getBoardData());
    return result;
  }
  setLinkMode(active){
    this.piLinkMode=Boolean(active);this.resetConnectionMode();
    this.root.classList.toggle('pi-board-link-mode',this.piLinkMode);this.reportLinkState();
  }
  reportLinkState(){
    this.piOnStatus?.({active:this.piLinkMode,from:this.getItemById(this.connectionMode.fromId)?.label||null});
  }
  onItemPointerDown(event,itemId){
    if(event.target?.closest?.('button,[data-anchor],input,textarea,select,a'))return;
    if(this.piLinkMode)return;
    return super.onItemPointerDown(event,itemId);
  }
  createItemElement(item){
    const element=super.createItemElement(item);
    element.addEventListener('click',event=>{
      if(!this.piLinkMode||event.target?.closest?.('button,[data-anchor],input,textarea,select,a'))return;
      event.preventDefault();event.stopImmediatePropagation();
      this.handleAnchorClick(item.id,this.connectionMode.active?'left':'right');
    },true);
    if(item.type==='photo'){
      const frame=element.querySelector('.crime-board__photo-frame');
      if(frame){
        const zoom=document.createElement('button');zoom.type='button';zoom.className='pi-board-photo-zoom';zoom.textContent='ZOOM';
        zoom.setAttribute('aria-label',`Enlarge photograph: ${item.label||'Photo'}`);
        zoom.addEventListener('pointerdown',event=>event.stopPropagation());
        zoom.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.piOnPhoto?.(item);});frame.appendChild(zoom);
        frame.querySelector('img')?.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();this.piOnPhoto?.(item);});
      }
    }
    return element;
  }
  handleAnchorClick(itemId,anchor){
    if(!this._isBoardUsable()||!this.canStartLinkFromItem(itemId))return;
    if(!this.connectionMode.active){this.startConnectionMode(itemId,anchor);this.reportLinkState();return;}
    if(this.connectionMode.fromId===itemId){this.resetConnectionMode();this.reportLinkState();return;}
    const fromId=this.connectionMode.fromId;
    const link=this.addLink({from:fromId,to:itemId,fromAnchor:this.connectionMode.fromAnchor||'right',toAnchor:anchor||'left',
      color:'#b3131b',createdByPlayer:true,editableByPlayer:true});
    this.resetConnectionMode();if(link)this.syncJsonOutput();this.reportLinkState();
  }
}

export class PICrimeBoardUI extends CrimeBoardUI{
  constructor(scene,options={}){
    super(scene);this.piOptions=options;this.caseId=null;this.mode='side';this.template=null;this.mount=null;this.message=null;
    this.caseSelect=null;this.mainButton=null;this.sideButton=null;this.linkButton=null;this.renderer=null;this.photoDialog=null;
    this.overlay.classList.add('pi-crime-board-ui');this.boundShutdown=()=>this.destroy();scene.events.once('shutdown',this.boundShutdown);
  }
  canOpen(){return Boolean(!this.isDestroyed&&this.scene?.sys?.isActive()&&this.scene.sys.settings.key==='DetectiveOfficeScene');}
  isCaseAvailable(investigation){
    if(!investigation)return false;
    return investigation.id!==HOLLY_CASE_ID||gameState.hollyIntroSeen===true;
  }
  getAvailableCases(mode=null){return getPICases().filter(investigation=>this.isCaseAvailable(investigation)&&(mode===null||investigation.kind===mode));}
  async open(){
    if(!this.canOpen())return false;if(this.isOpen)return true;
    const otherBoard=document.querySelector('.crime-board-ui-overlay.is-open');if(otherBoard&&otherBoard!==this.overlay)return false;
    const token=++this._openToken;this.isOpen=true;this.overlay.classList.add('is-open');this.root.textContent='Loading private investigations...';
    this.disableUnderlyingScenesInput();document.addEventListener('keydown',this.boundEscHandler);
    this._hudHidden=true;EventBus.emit('hideHUD');this.piOptions.onOpen?.();
    try{
      this.template=await this.loadTemplate();
      if(this.isDestroyed||!this.isOpen||token!==this._openToken)return false;
      const definitions=this.scene.cache.json.get('piCases'),mainDefinition=definitions?.cases?.find(item=>item.id===definitions.mainCaseId);
      if(!mainDefinition)throw new Error('The PI main case definition is missing.');
      if(this.isCaseAvailable(mainDefinition))registerPICase(mainDefinition);
      this.buildWorkspace();
      const cases=this.getAvailableCases(),selectedId=getSelectedPICaseId();
      const initial=cases.find(investigation=>investigation.id===selectedId)||cases.find(investigation=>investigation.id===mainDefinition.id)||cases[0];
      if(initial)this.switchCase(initial.id);else this.showEmptyMode('side');return true;
    }catch(error){
      console.error('[PICrimeBoardUI] Open failed:',error);if(!this.isDestroyed&&token===this._openToken)this.close();return false;
    }
  }
  buildWorkspace(){
    this.root.replaceChildren();
    const style=document.createElement('style');style.textContent=PI_STYLE;
    const header=document.createElement('div');header.className='pi-board-header';
    const title=document.createElement('h2');title.textContent='PRIVATE INVESTIGATIONS';
    this.mainButton=document.createElement('button');this.mainButton.type='button';this.mainButton.textContent='Main Case';this.mainButton.onclick=()=>this.switchMode('main');
    this.sideButton=document.createElement('button');this.sideButton.type='button';this.sideButton.textContent='Side Cases';this.sideButton.onclick=()=>this.switchMode('side');
    this.caseSelect=document.createElement('select');this.caseSelect.setAttribute('aria-label','Select private investigation');this.caseSelect.onchange=()=>this.switchCase(this.caseSelect.value);
    this.linkButton=document.createElement('button');this.linkButton.type='button';this.linkButton.textContent='CONNECT';this.linkButton.setAttribute('aria-pressed','false');
    this.linkButton.onclick=()=>this.renderer?.setLinkMode(!this.renderer.piLinkMode);
    this.message=document.createElement('p');this.message.className='pi-board-message';
    this.mount=document.createElement('div');this.mount.className='pi-board-workspace';
    header.append(title,this.mainButton,this.sideButton,this.caseSelect,this.linkButton);this.root.append(style,header,this.message,this.mount);
  }
  switchMode(mode){
    if(!this.mount||!['main','side'].includes(mode))return;
    const cases=this.getAvailableCases(mode);if(cases.length)this.switchCase(cases[0].id);else this.showEmptyMode(mode);
  }
  showEmptyMode(mode){
    this.saveToGameState();this.disposeBoard();this.mode=mode;this.caseId=null;this.mount?.replaceChildren();this.refreshSelector();
    if(this.linkButton){this.linkButton.disabled=true;this.linkButton.setAttribute('aria-pressed','false');}
    if(this.message)this.message.textContent=mode==='main'?'No main investigation is available yet.':'No side investigations require a crime board yet.';
  }
  refreshSelector(){
    if(!this.caseSelect||!this.mainButton||!this.sideButton)return;
    const cases=this.getAvailableCases(this.mode),mainCases=this.getAvailableCases('main');this.caseSelect.replaceChildren();
    for(const investigation of cases){
      const option=document.createElement('option');option.value=investigation.id;option.textContent=investigation.title+(investigation.status==='completed'?' — Completed':'');this.caseSelect.appendChild(option);
    }
    this.caseSelect.disabled=cases.length===0;
    if(this.caseId&&cases.some(investigation=>investigation.id===this.caseId))this.caseSelect.value=this.caseId;
    this.mainButton.hidden=mainCases.length===0;this.mainButton.setAttribute('aria-pressed',String(this.mode==='main'));this.sideButton.setAttribute('aria-pressed',String(this.mode==='side'));
  }
  updateLinkStatus(status={}){
    if(this.linkButton){this.linkButton.disabled=!this.renderer;this.linkButton.setAttribute('aria-pressed',String(Boolean(status.active)));this.linkButton.textContent=status.active?'CONNECT: ON':'CONNECT';}
    if(!this.message)return;
    const title=getPICase(this.caseId)?.title||'PI investigation';
    this.message.textContent=status.from?`${title} — choose the second card. Click the same card or press Escape to cancel.`:
      status.active?`${title} — click two cards to connect them. Press Escape to leave CONNECT mode.`:
      `${title} — CONNECT joins two cards; ZOOM enlarges a photograph. Connections are working theories, not confirmed facts.`;
  }
  switchCase(caseId){
    if(!this.mount||!this.template)return;
    const investigation=getPICase(caseId);if(!this.isCaseAvailable(investigation))return;
    this.saveToGameState();this.disposeBoard();this.caseId=investigation.id;this.mode=investigation.kind;this.mount.innerHTML=this.template;
    const rendererOptions={};
    for(const[optionName,originalId]of Object.entries(EDITOR_IDS)){
      const element=this.mount.querySelector(`#${originalId}`),nextId=`pi-${originalId}`;if(element)element.id=nextId;rendererOptions[optionName]=nextId;
    }
    const boardRoot=this.mount.querySelector('#crime-board');if(!boardRoot)throw new Error('PI board template is missing its board root.');boardRoot.id='pi-crime-board';
    this.mount.querySelector('#pi-crime-board-verify-motive-btn')?.remove();this.mount.querySelectorAll('.crime-board-deduction').forEach(element=>element.remove());
    const heading=this.mount.querySelector('.crime-board-sidebar__title');if(heading)heading.textContent='PI Crime Board';
    const activeCaseId=investigation.id;
    Object.assign(rendererOptions,{
      onChange:data=>{if(!this.isDestroyed&&this.isOpen&&this.caseId===activeCaseId)savePIBoard(activeCaseId,data);},
      onLinkState:status=>this.updateLinkStatus(status),onPhoto:item=>this.openPhoto(item)
    });
    const renderer=new PrivateInvestigationBoard(boardRoot,rendererOptions);this.renderer=renderer;
    this.boardApi={getData:()=>renderer.getBoardData(),destroy:()=>renderer.destroy()};
    renderer.loadBoard(investigation.board);selectPICase(investigation.id);this.refreshSelector();this.updateLinkStatus();
  }
  openPhoto(item){
    if(!this.isOpen||this.isDestroyed||!item?.image||item.type!=='photo')return;
    this.closePhoto();
    const previousFocus=document.activeElement,dialog=document.createElement('dialog');dialog.className='pi-board-photo-dialog';dialog.setAttribute('aria-label',item.label||'Photograph');
    const toolbar=document.createElement('div');toolbar.className='pi-photo-toolbar';
    const title=document.createElement('h3');title.className='pi-photo-title';title.textContent=item.label||'Photograph';toolbar.appendChild(title);
    const stage=document.createElement('div');stage.className='pi-photo-stage';
    const image=document.createElement('img');image.alt=item.label||'Photograph';image.draggable=false;
    const caption=document.createElement('p');caption.className='pi-photo-caption';caption.textContent=item.caption||'';
    let zoom=1,baseWidth=0;
    const apply=()=>{
      if(this.photoDialog!==dialog)return;
      if(!baseWidth)baseWidth=Math.max(1,Math.min(image.naturalWidth||1200,Math.max(1,stage.clientWidth-16)));
      image.style.width=`${Math.round(baseWidth*zoom)}px`;
    };
    const addButton=(label,action)=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',action);toolbar.appendChild(button);return button;
    };
    addButton('−',()=>{zoom=Math.max(.5,zoom-.25);apply();});
    addButton('+',()=>{zoom=Math.min(4,zoom+.25);apply();});
    addButton('FIT',()=>{baseWidth=0;zoom=1;apply();stage.scrollTop=0;stage.scrollLeft=0;});
    const close=addButton('CLOSE',()=>this.closePhoto());
    image.addEventListener('load',()=>{baseWidth=0;apply();});
    image.addEventListener('error',()=>{if(this.photoDialog===dialog)caption.textContent='The photograph could not be loaded.';});
    stage.appendChild(image);dialog.append(toolbar,stage,caption);document.body.appendChild(dialog);this.photoDialog=dialog;this.photoPreviousFocus=previousFocus;
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.closePhoto();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)this.closePhoto();});
    if(typeof dialog.showModal==='function')dialog.showModal();
    else{dialog.setAttribute('open','');Object.assign(dialog.style,{position:'fixed',left:'2vw',top:'3vh',zIndex:'100000'});}
    image.src=item.image;close.focus({preventScroll:true});
    if(image.complete&&image.naturalWidth)apply();
  }
  closePhoto(){
    const dialog=this.photoDialog;if(!dialog)return;
    this.photoDialog=null;
    if(dialog.open&&typeof dialog.close==='function')dialog.close();dialog.remove();
    const previous=this.photoPreviousFocus;this.photoPreviousFocus=null;if(previous?.isConnected)previous.focus?.({preventScroll:true});
  }
  onKeyDown(event){
    if(event.key==='Escape'&&this.isOpen&&!this.isDestroyed){
      if(this.photoDialog){event.preventDefault();event.stopPropagation();this.closePhoto();return;}
      if(this.renderer?.connectionMode.active||this.renderer?.piLinkMode){
        event.preventDefault();event.stopPropagation();this.renderer.setLinkMode(false);return;
      }
    }
    return super.onKeyDown(event);
  }
  saveToGameState(){if(this.caseId&&this.boardApi)savePIBoard(this.caseId,this.boardApi.getData());}
  disposeBoard(){this.closePhoto();this.boardApi?.destroy();this.boardApi=null;this.renderer=null;}
  disableUnderlyingScenesInput(){
    super.disableUnderlyingScenesInput();if(this.disabledScenesInput.some(record=>record.scene===this.scene))return;
    this.disabledScenesInput.push({scene:this.scene,inputEnabled:this.scene.input?.enabled??null,keyboardEnabled:this.scene.input?.keyboard?.enabled??null});
    if(this.scene.input)this.scene.input.enabled=false;if(this.scene.input?.keyboard)this.scene.input.keyboard.enabled=false;
  }
  close(){
    const wasOpen=this.isOpen;this.closePhoto();super.close();this.renderer=null;this.caseId=null;this.mount=null;
    this.caseSelect=null;this.mainButton=null;this.sideButton=null;this.linkButton=null;this.message=null;
    if(wasOpen)this.piOptions?.onClose?.();
  }
  destroy(){
    if(this.isDestroyed)return;this.scene?.events.off('shutdown',this.boundShutdown);super.destroy();
  }
}
