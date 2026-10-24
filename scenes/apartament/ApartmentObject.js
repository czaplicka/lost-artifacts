import { inventoryManager } from '../../managers/InventoryManager.js';
import { ensureApartmentIdentityItem, collectApartmentIdentityItem, getKnownApartmentIdentityClues } from './ApartmentIdentityEvidence.js';

const MOVABLE=new Set(['painting','framed_photo','sofa','lamp']);
const HINTS={
  painting:'The loose frame could conceal something against the wall.',
  framed_photo:'Turn the frame over and check its backing.',
  sofa:'Lift the cushions and check the gaps.',
  lamp:'The base looks hollow. Check underneath it.'
};

export class ApartmentObject {
  constructor(scene,config) {
    this.scene=scene;
    this.config=config;
    this.state=config.state || 'default';
    this.isInteracted=false;
    this.contentsCollected=false;
    this.inspected=false;
    this.revealed=false;
    this.collectedIds=new Set();
    this.container=this.background=this.label=this.icon=null;
    this.menu=null;
    this.busy=false;
    this.identityItem=ensureApartmentIdentityItem(scene,config);
    this.restoreProgress();
    if (this.identityItem && !getKnownApartmentIdentityClues().some(c=>c.id===this.identityItem.id)) {
      this.collectedIds.delete(this.identityItem.id);
      this.contentsCollected=false;
    }
    this.create();
    this.shutdownHandler=()=>this.closeMenu();
    scene.events.once('shutdown',this.shutdownHandler);
  }

  restoreProgress() {
    const saved=this.scene.getObjectProgress?.(this.config.id);
    if (!saved) return;
    this.state=saved.state || this.state;
    this.isInteracted=saved.isInteracted===true;
    this.contentsCollected=saved.contentsCollected===true;
    this.inspected=saved.inspected===true;
    this.revealed=saved.revealed===true;
    this.collectedIds=new Set(saved.collectedIds || []);
  }

  saveProgress() {
    this.scene?.onObjectStateChanged?.(this.config.id,{
      state:this.state,isInteracted:this.isInteracted,contentsCollected:this.contentsCollected,
      inspected:this.inspected,revealed:this.revealed,collectedIds:[...this.collectedIds]
    });
  }

  create() {
    const {position={},size={}}=this.config;
    const w=Math.max(10,Number(size.w)||80),h=Math.max(10,Number(size.h)||80);
    this.container=this.scene.add.container(position.x||0,position.y||0).setDepth(5);
    this.background=this.scene.add.zone(0,0,w,h).setOrigin(0.5).setInteractive({useHandCursor:true});
    this.container.add(this.background);
    this.background.on('pointerover',()=>this.onHover());
    this.background.on('pointerout',()=>this.onHoverOut());
    this.background.on('pointerdown',()=>this.onInteract());
  }

  isAvailable() {
    return Boolean(this.scene?.sys.isActive() && !this.scene.isTransitioning && !this.scene.leaveDialog &&
      !this.scene.debugMode && !this.scene.getPlayerHudScene()?.isAnyPanelOpen());
  }
  get discoveryAction() {return this.config.discoveryAction || (MOVABLE.has(this.config.id)?'move':'search');}
  getHoverDescription() {return `${this.config.label || 'Object'} — choose an action`;}
  onHover() {if(this.isAvailable()) this.scene.showDescription?.(this.getHoverDescription());}
  onHoverOut() {if(!this.menu) this.scene?.showDescription?.('');}
  onInteract() {if(this.isAvailable()) this.openActions();}

  getInspectionText() {
    const text=this.config.inspectText || this.config.description || 'Worth a closer look.';
    if(this.state==='locked') return `${text}\n\nLocked. A matching item may help.`;
    const hint=this.config.actionHint || HINTS[this.config.id];
    return hint ? `${text}\n\n${hint}` : text;
  }

  openActions(note='') {
    const actions=[
      ['INSPECT',()=>this.inspect()],['SEARCH',()=>this.performAction('search')],
      ['MOVE',()=>this.performAction('move')],['USE ITEM',()=>this.openItemPicker()]
    ];
    if(this.revealed && !this.contentsCollected) actions.push(['VIEW FINDINGS',()=>this.showContents()]);
    this.renderMenu(this.config.label || 'Object',note || 'What do you want to do?',actions);
  }

  inspect() {
    this.inspected=true;
    this.saveProgress();
    if(this.discoveryAction==='inspect' && this.state!=='locked') this.reveal();
    else this.openActions(this.getInspectionText());
  }

  performAction(action) {
    if(!this.scene || this.busy) return;
    if(this.contentsCollected) return this.showAlreadySearchedMessage();
    if(this.state==='locked') return this.handleLockedObject();
    if(action!==this.discoveryAction) {
      this.openActions(action==='move'
        ? this.config.wrongMoveText || 'Moving the entire thing would be a career change. Try inspecting it.'
        : this.config.wrongSearchText || 'Nothing on the visible surface. Check underneath or behind it.');
      return;
    }
    this.reveal();
  }

  reveal() {
    this.revealed=true;
    this.isInteracted=true;
    this.state='open';
    this.saveProgress();
    this.showContents();
  }

  getPendingItems() {
    if(this.contentsCollected) return [];
    const recorded=new Set(getKnownApartmentIdentityClues().map(c=>c.id));
    return (this.config.unlocks || []).filter(item=>{
      if(!item?.id) return false;
      if(item.isIdentityLead) return !recorded.has(item.id);
      return !this.collectedIds.has(item.id) && !this.scene.hasItemAlready?.(item.id);
    });
  }

  showContents() {
    if(!this.revealed) return this.openActions('Choose how to examine this object first.');
    const pending=this.getPendingItems();
    if(!pending.length) {
      const already=this.contentsCollected || (this.config.unlocks || []).some(Boolean);
      this.contentsCollected=true;
      this.saveProgress();
      this.renderMenu(this.config.label || 'Search results',already
        ? this.config.afterSearchText || 'Nothing else to collect.'
        : this.config.emptySearchText || this.config.onInteract?.text || 'Nothing useful. A remarkably thorough collection of nothing.',[]);
      return;
    }
    const item=pending[0];
    const more=pending.length>1?`\n\n${pending.length} items remain here.`:'';
    this.renderMenu('DISCOVERED',`${item.label || item.name || 'Unknown item'}\n\n${item.description || item.hint || ''}${more}`,[
      ['TAKE',()=>this.takeItem(item)],['LEAVE HERE',()=>this.closeMenu()]
    ]);
  }

  takeItem(item) {
    if(!this.scene || this.busy || !this.revealed || this.state==='locked' ||
      !this.getPendingItems().some(candidate=>candidate.id===item.id)) return;
    this.busy=true;
    this.closeMenu();
    try {
      const collected=item.isIdentityLead
        ? collectApartmentIdentityItem(this.scene,item)
        : this.scene.collectApartmentItem(item,this.config);
      if(collected===true) {
        this.collectedIds.add(item.id);
        this.contentsCollected=this.getPendingItems().length===0;
        this.saveProgress();
      }
    } finally {this.busy=false;}
  }

  getUsableItems() {
    const items=new Map((this.scene.playerInventory?.getItems?.() || []).map(item=>[item.id,item]));
    for(const item of inventoryManager.getAllItems()) {
      if(!item.metadata?.apartment) items.set(item.id,item);
    }
    return [...items.values()].filter(item=>item?.id && Number(item.quantity??1)>0);
  }

  openItemPicker(page=0) {
    const items=this.getUsableItems(),perPage=4;
    const pages=Math.max(1,Math.ceil(items.length/perPage));
    page=Math.max(0,Math.min(page,pages-1));
    const actions=items.slice(page*perPage,(page+1)*perPage).map(item=>[
      item.label || item.name || item.id,()=>{
        if(!this.useItemOn(item.id)) this.openActions('That does not help here. Nothing has been consumed.');
      }
    ]);
    if(page>0) actions.push(['< PREVIOUS',()=>this.openItemPicker(page-1)]);
    if(page<pages-1) actions.push(['NEXT >',()=>this.openItemPicker(page+1)]);
    actions.push(['BACK',()=>this.openActions()]);
    this.renderMenu('USE ITEM',items.length?`Choose an item. Page ${page+1}/${pages}`:'Nothing available to use here.',actions);
  }

  canUseItemOn(id) {return Boolean(this.config.requiresItem && this.config.requiresItem===id);}
  useItemOn(id) {
    if(!this.scene || this.state!=='locked' || !this.canUseItemOn(id) || !this.scene.playerInventory?.hasItem(id)) return false;
    if(this.config.consumeRequiredItem!==false && !this.scene.playerInventory.removeItem(id,1)) return false;
    this.state='open';this.isInteracted=true;this.saveProgress();
    this.openActions('The lock clicks open. You can examine the contents now.');
    return true;
  }
  handleLockedObject() {this.openActions('Locked. Choose USE ITEM and select the matching item.');}
  open() {this.performAction(this.discoveryAction);}
  unlock() {this.openItemPicker();}
  showAlreadySearchedMessage() {this.openActions(this.config.afterSearchText || 'Already searched.');}
  updateVisuals() {}
  playConfiguredAnimation() {}
  playAnimation() {}

  renderMenu(title,body,actions) {
    if(!this.scene?.sys.isActive()) return;
    this.closeMenu();
    const scene=this.scene;
    if(scene.leaveDialog || scene.isTransitioning) return;
    const hud=scene.getPlayerHudScene();
    const host=hud?.sys?.isActive() && hud.isHudReady ? hud : scene;
    hud?.closeAllUIPanels();
    if(host===hud) {hud.scene.setVisible(true);hud.scene.bringToTop();}
    const {width,height}=host.scale;
    const w=Math.max(100,Math.min(560,width-24)),h=Math.max(100,Math.min(650,height-24));
    const root=host.add.container(width/2,height/2).setDepth(30000).setScrollFactor(0);
    this.menu=root;scene.leaveDialog=root;
    const backdrop=host.add.rectangle(0,0,width,height,0x000000,0.68).setInteractive();
    backdrop.on('pointerdown',()=>this.closeMenu());
    root.add([backdrop,host.add.rectangle(0,0,w,h,0x241e19).setStrokeStyle(2,0xbca06a).setInteractive()]);
    root.add(host.add.text(0,-h/2+18,title,{
      fontFamily:'SpecialElite',fontSize:'23px',color:'#ffd788',align:'center',wordWrap:{width:w-32}
    }).setOrigin(0.5,0));
    const buttons=[...actions,['CLOSE',()=>this.closeMenu()]],gap=5;
    const bh=Math.max(22,Math.min(38,(h*0.55-gap*(buttons.length-1))/buttons.length));
    const top=h/2-14-(buttons.length*(bh+gap)-gap);
    const text=host.add.text(0,-h/2+57,body,{
      fontFamily:'SpecialElite',fontSize:'18px',color:'#eee1c9',align:'center',wordWrap:{width:w-40}
    }).setOrigin(0.5,0);
    const space=Math.max(16,top-(-h/2+57)-12);
    while(text.height>space && parseInt(text.style.fontSize,10)>10) text.setFontSize(parseInt(text.style.fontSize,10)-1);
    root.add(text);
    buttons.forEach(([label,callback],i)=>{
      const y=top+bh/2+i*(bh+gap);
      const bg=host.add.rectangle(0,y,w-32,bh,0x493c2e).setStrokeStyle(1,0x8f7955).setInteractive({useHandCursor:true});
      const caption=host.add.text(0,y,String(label),{
        fontFamily:'SpecialElite',fontSize:`${Math.min(18,bh-5)}px`,color:'#fff0d2'
      }).setOrigin(0.5);
      if(caption.width>w-48) caption.setScale((w-48)/caption.width);
      bg.on('pointerover',()=>bg.setFillStyle(0x665039));
      bg.on('pointerout',()=>bg.setFillStyle(0x493c2e));
      bg.on('pointerdown',()=>{if(this.menu===root && scene.sys.isActive()) callback();});
      root.add([bg,caption]);
    });
    this.escapeHandler=()=>this.closeMenu();
    this.resizeHandler=()=>this.closeMenu();
    this.panelHandler=state=>{if(state?.anyPanelOpen) this.closeMenu();};
    scene.input.keyboard?.on('keydown-ESC',this.escapeHandler);
    scene.scale.on('resize',this.resizeHandler);
    hud?.events.on('panelStateChanged',this.panelHandler);
    this.boundHud=hud;
  }

  closeMenu() {
    if(this.escapeHandler) this.scene?.input.keyboard?.off('keydown-ESC',this.escapeHandler);
    if(this.resizeHandler) this.scene?.scale.off('resize',this.resizeHandler);
    if(this.panelHandler) this.boundHud?.events.off('panelStateChanged',this.panelHandler);
    this.escapeHandler=this.resizeHandler=this.panelHandler=null;this.boundHud=null;
    const root=this.menu;
    if(root && this.scene?.leaveDialog===root) this.scene.leaveDialog=null;
    root?.destroy(true);this.menu=null;
  }

  destroy() {
    this.closeMenu();
    this.scene?.events.off('shutdown',this.shutdownHandler);
    this.background?.removeAllListeners();this.container?.destroy(true);
    this.scene=null;this.config=null;
    this.container=this.background=this.label=this.icon=null;
  }
}
export default ApartmentObject;
