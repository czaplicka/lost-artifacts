import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
const PI_STYLE=`${__dialogueText("ui/PICrimeBoardUI.js", "t_7f7d3fa397e62372e97a")}`;

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
      const frame=element.querySelector(__dialogueText("ui/PICrimeBoardUI.js", "t_ad0888c1e327214ffa6d"));
      if(frame){
        const zoom=document.createElement('button');zoom.type='button';zoom.className='pi-board-photo-zoom';zoom.textContent='ZOOM';
        zoom.setAttribute('aria-label',`${__dialogueText("ui/PICrimeBoardUI.js", "t_65e1d6dfbffbcc98b5b2")}${item.label||__dialogueText("ui/PICrimeBoardUI.js", "t_d84eebada93efee12b02")}`);
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
    const otherBoard=document.querySelector(__dialogueText("ui/PICrimeBoardUI.js", "t_9ca898e851a2e447d500"));if(otherBoard&&otherBoard!==this.overlay)return false;
    const token=++this._openToken;this.isOpen=true;this.overlay.classList.add('is-open');this.root.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_636fa41950d3b8f2731e");
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
    const title=document.createElement('h2');title.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_bbc638660cdde9fbfde6");
    this.mainButton=document.createElement('button');this.mainButton.type='button';this.mainButton.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_53ce1163b8db3ef2f662");this.mainButton.onclick=()=>this.switchMode('main');
    this.sideButton=document.createElement('button');this.sideButton.type='button';this.sideButton.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_7ce72987a1d1ea3f72b9");this.sideButton.onclick=()=>this.switchMode('side');
    this.caseSelect=document.createElement('select');this.caseSelect.setAttribute('aria-label',__dialogueText("ui/PICrimeBoardUI.js", "t_9603b9bfc657440b0f57"));this.caseSelect.onchange=()=>this.switchCase(this.caseSelect.value);
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
    if(this.message)this.message.textContent=mode==='main'?__dialogueText("ui/PICrimeBoardUI.js", "t_5d7c1b6c5cdc556e0cca"):__dialogueText("ui/PICrimeBoardUI.js", "t_535656a3101be1670aec");
  }
  refreshSelector(){
    if(!this.caseSelect||!this.mainButton||!this.sideButton)return;
    const cases=this.getAvailableCases(this.mode),mainCases=this.getAvailableCases('main');this.caseSelect.replaceChildren();
    for(const investigation of cases){
      const option=document.createElement('option');option.value=investigation.id;option.textContent=investigation.title+(investigation.status==='completed'?__dialogueText("ui/PICrimeBoardUI.js", "t_43a2324f71a3a2f3308d"):'');this.caseSelect.appendChild(option);
    }
    this.caseSelect.disabled=cases.length===0;
    if(this.caseId&&cases.some(investigation=>investigation.id===this.caseId))this.caseSelect.value=this.caseId;
    this.mainButton.hidden=mainCases.length===0;this.mainButton.setAttribute('aria-pressed',String(this.mode==='main'));this.sideButton.setAttribute('aria-pressed',String(this.mode==='side'));
  }
  updateLinkStatus(status={}){
    if(this.linkButton){this.linkButton.disabled=!this.renderer;this.linkButton.setAttribute('aria-pressed',String(Boolean(status.active)));this.linkButton.textContent=status.active?__dialogueText("ui/PICrimeBoardUI.js", "t_28d9f010c669e7f8b067"):'CONNECT';}
    if(!this.message)return;
    const title=getPICase(this.caseId)?.title||__dialogueText("ui/PICrimeBoardUI.js", "t_59c3b2f62d408f1fef1e");
    this.message.textContent=status.from?`${title}${__dialogueText("ui/PICrimeBoardUI.js", "t_a1396135290e3a5ef24b")}`:
      status.active?`${title}${__dialogueText("ui/PICrimeBoardUI.js", "t_9175c649e5d844cc13a3")}`:
      `${title}${__dialogueText("ui/PICrimeBoardUI.js", "t_bfcc40f8c2a5bbaf5748")}`;
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
    this.mount.querySelector('#pi-crime-board-verify-motive-btn')?.remove();this.mount.querySelectorAll(__dialogueText("ui/PICrimeBoardUI.js", "t_03922db657aa2168dbef")).forEach(element=>element.remove());
    const heading=this.mount.querySelector(__dialogueText("ui/PICrimeBoardUI.js", "t_30dafb2f1ae40627ab67"));if(heading)heading.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_49304763a6b3c2159e7c");
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
    const previousFocus=document.activeElement,dialog=document.createElement('dialog');dialog.className='pi-board-photo-dialog';dialog.setAttribute('aria-label',item.label||__dialogueText("ui/PICrimeBoardUI.js", "t_bb1de97207977776fc64"));
    const toolbar=document.createElement('div');toolbar.className='pi-photo-toolbar';
    const title=document.createElement('h3');title.className='pi-photo-title';title.textContent=item.label||__dialogueText("ui/PICrimeBoardUI.js", "t_bb1de97207977776fc64");toolbar.appendChild(title);
    const stage=document.createElement('div');stage.className='pi-photo-stage';
    const image=document.createElement('img');image.alt=item.label||__dialogueText("ui/PICrimeBoardUI.js", "t_bb1de97207977776fc64");image.draggable=false;
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
    image.addEventListener('error',()=>{if(this.photoDialog===dialog)caption.textContent=__dialogueText("ui/PICrimeBoardUI.js", "t_4d9c22e5dab6e48fe09d");});
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
    if(event.key===__dialogueText("ui/PICrimeBoardUI.js", "t_037c968467aa3fd7c059")&&this.isOpen&&!this.isDestroyed){
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
