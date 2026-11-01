import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getPIQuestStatus } from '../managers/PIQuestManager.js';

const KEY = 'TavernScene';
const TEXT_KEY = 'tavernDialogues';
const CSS = `
html.tavern-active #hud-container {display:none!important;pointer-events:none!important;}
.la-tavern-ui {position:fixed;z-index:10000;pointer-events:none;color:#f6e6bc;font-family:SpecialElite,monospace;box-sizing:border-box;}
.la-tavern-ui * {box-sizing:border-box;}
.la-tavern-ui button {font:inherit;color:#f6e6bc;background:#292c24;border:1px solid #9d8457;padding:9px 12px;cursor:pointer;text-align:left;min-height:40px;}
.la-tavern-ui button:hover,.la-tavern-ui button:focus-visible {background:#4b4932;outline:2px solid #e7c47d;outline-offset:-2px;}
.la-tavern-ui .top {position:absolute;top:2%;left:2%;right:2%;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.la-tavern-ui .title {background:#171b18dc;padding:10px;}
.la-tavern-ui .top button {pointer-events:auto;}
.la-tavern-ui .panel {position:absolute;left:2%;right:2%;bottom:2%;max-height:45%;overflow:auto;pointer-events:auto;background:#141b18f5;border:2px solid #9d8457;padding:12px;}
.la-tavern-ui h2 {font-size:1.05em;margin:0 0 8px;color:#efca83;}
.la-tavern-ui p {white-space:pre-wrap;line-height:1.4;margin:0 0 10px;}
.la-tavern-ui .choices {display:flex;flex-wrap:wrap;gap:8px;}
.la-tavern-ui .hint {position:absolute;left:2%;bottom:3%;padding:8px;background:#171b18d9;}
`;

export class TavernScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  init() {
    this.disposed = false;
    this.navigating = false;
    this.token = Symbol(KEY);
    this.panel = null;
    this.root = null;
    this.spots = [];
    this.lastBox = null;
    this.background = null;
    this.label = null;
    this.activeNpcId = null;
  }

  preload() {
    if (!this.textures.exists('tavern_bg')) {
      this.load.image('tavern_bg', 'assets/local/tavern.webp');
    }
    if (!this.cache.json.exists('piOfficeClassifieds')) {
      this.load.json('piOfficeClassifieds', 'assets/data/piClassifieds.json');
    }
    if (!this.cache.json.exists(TEXT_KEY)) {
      this.load.json(TEXT_KEY, 'assets/data/tavernDialogues.json');
    }
  }

  create() {
    super.create();
    this.textData = this.cache.json.get(TEXT_KEY);
    if (!this.validData(this.textData)) {
      console.error('[TavernScene] Missing or invalid assets/data/tavernDialogues.json');
      const error = this.add.text(24, 24,
        'Tavern data could not be loaded.\nCheck assets/data/tavernDialogues.json.\nClick here to return to town.',
        {fontFamily:'monospace',fontSize:'20px',color:'#ffffff',wordWrap:{width:Math.max(100,this.scale.width-48)}}
      ).setInteractive({useHandCursor:true});
      error.on('pointerdown',()=>void this.leave());
      return;
    }
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#171b18');
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.getRegisteredScene('NewsHud')?.closeMenu?.(true);
    this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for (const key of ['PlayerHudScene','UIScene','NewsHud']) {
      if (this.hasScene(key)) this.scene.setVisible(false,key);
    }
    this.events.once('shutdown',this.disposeTavern,this);
    this.events.once('destroy',this.disposeTavern,this);
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = CSS;
    document.head.appendChild(this.styleElement);
    document.documentElement.classList.add('tavern-active');
    if (this.textures.exists('tavern_bg')) {
      this.background = this.add.image(0,0,'tavern_bg').setOrigin(0);
    }
    this.label = this.add.text(0,0,'',{
      fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',
      backgroundColor:'#18201c',padding:{x:8,y:5}
    }).setDepth(50).setVisible(false);
    this.createHotspots();
    this.createInterface();
    this.trackInputEvent(this.scale,'resize',this.layout);
    if (this.input.keyboard) {
      this.trackInputEvent(this.input.keyboard,'keydown-ESC',this.onEscape);
    }
    this.domEscape = e => {
      if(e.code!=='Escape'||e.repeat||!this.root?.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation(); this.onEscape();
    };
    this.root.addEventListener('keydown',this.domEscape);
    this.layout();
  }

  validData(d) {
    return Boolean(d && d.ui && d.npcs && d.rumors && Array.isArray(d.hotspots) &&
      d.hotspots.every(s=>typeof s.id==='string'&&typeof s.label==='string'&&
        ['x','y','w','h'].every(k=>Number.isFinite(s[k]))&&s.w>0&&s.h>0) &&
      Object.values(d.npcs).every(n=>typeof n.name==='string'&&typeof n.greeting==='string'&&
        Array.isArray(n.leads)&&Array.isArray(n.chat)&&n.chat.every(c=>
          typeof c.question==='string'&&typeof c.answer==='string')));
  }

  text(key, values = {}) {
    const value=this.textData?.ui?.[key];
    if(typeof value!=='string') {
      console.warn('[TavernScene] Missing UI text:',key);
      return `[${key}]`;
    }
    return value.replace(/\{(\w+)\}/g,(match,k)=>
      Object.prototype.hasOwnProperty.call(values,k)?String(values[k]):match);
  }

  createHotspots() {
    for(const def of this.textData.hotspots) {
      const rect=this.add.rectangle(0,0,1,1,0xffcc77,0)
        .setOrigin(0).setInteractive({useHandCursor:true});
      rect.on('pointerover',()=>{
        if(this.panel||this.navigating) return;
        this.label.setText(def.label).setPosition(rect.x,Math.max(5,rect.y-36)).setVisible(true);
      });
      rect.on('pointerout',()=>this.label.setVisible(false));
      rect.on('pointerdown',()=>{
        if(this.panel||this.navigating) return;
        this.label.setVisible(false);
        if(def.id==='exit') void this.leave();
        else if(def.id==='board') this.board();
        else this.talk(def.id);
      });
      this.spots.push({...def,rect});
    }
  }

  createInterface() {
    this.root=document.createElement('div'); this.root.className='la-tavern-ui';
    const top=document.createElement('div');top.className='top';
    const title=document.createElement('div');title.className='title';title.textContent=this.text('title');
    top.append(title,this.button(this.text('backToTown'),()=>void this.leave()));
    this.hint=document.createElement('div');this.hint.className='hint';this.hint.textContent=this.text('hint');
    this.root.append(top,this.hint);document.body.appendChild(this.root);
  }

  layout() {
    if(this.disposed||!this.root) return;
    const {width,height}=this.scale;
    this.background?.setDisplaySize(width,height);
    for(const s of this.spots) {
      s.rect.setPosition(s.x*width,s.y*height).setSize(s.w*width,s.h*height);
      s.rect.input?.hitArea?.setTo(0,0,s.w*width,s.h*height);
    }
    this.label?.setVisible(false);
    const b=this.game.canvas.getBoundingClientRect();
    Object.assign(this.root.style,{
      left:`${b.left}px`,top:`${b.top}px`,width:`${b.width}px`,height:`${b.height}px`,
      fontSize:`${Math.max(12,Math.min(22,b.width/65))}px`
    });
  }

  update() {
    if(this.disposed||!this.root) return;
    const b=this.game.canvas.getBoundingClientRect();
    const sig=`${b.left}/${b.top}/${b.width}/${b.height}`;
    if(sig!==this.lastBox) {this.lastBox=sig;this.layout();}
  }

  button(text,action) {
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.addEventListener('click',e=>{
      e.stopPropagation();if(!this.disposed&&!this.navigating) action();
    });
    return b;
  }

  setInteractions(enabled) {
    for(const s of this.spots) if(s.rect.input) s.rect.input.enabled=enabled;
  }

  show(title,text,choices) {
    if(this.disposed||!this.root) return;
    this.panel?.remove();this.label?.setVisible(false);
    this.panel=document.createElement('section');this.panel.className='panel';
    this.panel.setAttribute('aria-label',title);
    const h=document.createElement('h2');h.textContent=title;
    const p=document.createElement('p');p.textContent=text;
    const list=document.createElement('div');list.className='choices';
    for(const [label,action] of choices) list.appendChild(this.button(label,action));
    this.panel.append(h,p,list);this.root.appendChild(this.panel);
    this.hint.style.display='none';this.setInteractions(false);
    list.querySelector('button')?.focus({preventScroll:true});
  }

  closePanel() {
    this.panel?.remove();this.panel=null;this.activeNpcId=null;
    if(this.hint) this.hint.style.display='';
    this.setInteractions(!this.navigating);
  }

  onEscape() {
    if(this.navigating||this.disposed) return;
    if(this.panel) this.closePanel();else void this.leave();
  }

  adverts() {
    const d=this.cache.json.get('piOfficeClassifieds');
    return Array.isArray(d?.advertisements)?d.advertisements:[];
  }

  talk(id) {
    const npc=this.textData.npcs[id];if(!npc) return;
    this.activeNpcId=id;
    this.show(npc.name,npc.greeting,[
      ...npc.chat.map(c=>[c.question,()=>this.show(npc.name,c.answer,[
        [this.text('somethingElse'),()=>this.talk(id)],
        [this.text('goodbye'),()=>this.closePanel()]
      ])]),
      [this.text('askForWork'),()=>this.leads(id)],
      [this.text('goodbye'),()=>this.closePanel()]
    ]);
  }

  leads(id) {
    const npc=this.textData.npcs[id];if(!npc) return;
    const ads=npc.leads.map(key=>this.adverts().find(a=>a.id===key&&a.kind==='pi')).filter(Boolean);
    this.show(npc.name,this.text(ads.length?'leadsAvailable':'leadsEmpty'),[
      ...ads.map(ad=>[ad.title,()=>this.lead(id,ad)]),
      [this.text('somethingElse'),()=>this.talk(id)]
    ]);
  }

  lead(id,ad) {
    const npc=this.textData.npcs[id];if(!npc) return;
    const status=getPIQuestStatus(ad.missionId);
    let text;
    if(status==='completed') text=this.text('completedRumor');
    else if(status!=='available') text=this.text('activeRumor');
    else text=[
      this.textData.rumors[ad.id]||ad.description||'',
      this.text('contact',{contact:ad.contact||this.text('contactFallback')}),
      this.text('rumorDisclaimer')
    ].join('\n\n');
    this.show(npc.name,text,[
      [this.text('readNotice'),()=>this.notice(ad,()=>this.lead(id,ad))],
      [this.text('somethingElse'),()=>this.talk(id)],
      [this.text('goodbye'),()=>this.closePanel()]
    ]);
  }

  board() {
    this.activeNpcId=null;
    const ads=this.adverts();
    this.show(this.text('boardTitle'),this.text(ads.length?'boardIntro':'boardEmpty'),[
      ...ads.map(ad=>[ad.title,()=>this.notice(ad,()=>this.board())]),
      [this.text('stepAway'),()=>this.closePanel()]
    ]);
  }

  notice(ad,back) {
    const isJob=ad.kind==='pi'&&typeof ad.missionId==='string';
    const parts=[ad.description||'',this.text('contact',{contact:ad.contact||this.text('contactMissing')})];
    if(isJob) {
      const status=getPIQuestStatus(ad.missionId);
      const label=status==='available'?this.text('notAccepted'):
        (this.textData.ui.statusLabels?.[status]||status);
      parts.push(this.text('status',{status:label}));
    }
    this.show(ad.title,parts.join('\n\n'),[
      ...(isJob?[[this.text('goToOffice'),()=>void this.navigate('DetectiveOfficeScene',{
        entrySource:'tavern',fromScene:KEY,gameState
      })]]:[]),
      [this.text('back'),back],[this.text('close'),()=>this.closePanel()]
    ]);
  }

  leave() {
    return this.navigate('HomeCityScene',{entryPoint:'tavern',fromScene:KEY,gameState});
  }

  async navigate(key,data) {
    if(this.disposed||this.navigating) return false;
    const token=this.token;this.navigating=true;this.setInteractions(false);
    const result=await this.goto(key,data);
    if(this.disposed||this.token!==token) return result!==false;
    this.navigating=false;
    if(result===false) {
      if(this.root) this.show(this.text('navigationErrorTitle'),this.text('navigationError'),[
        [this.text('close'),()=>this.closePanel()]
      ]);
      else console.error('[TavernScene] Could not return to town.');
    }
    return result!==false;
  }

  disposeTavern() {
    if(this.disposed) return;
    this.disposed=true;this.token=null;
    this.root?.removeEventListener('keydown',this.domEscape);
    this.root?.remove();this.root=null;this.panel=null;
    this.styleElement?.remove();this.styleElement=null;
    document.documentElement.classList.remove('tavern-active');
    this.events.off('shutdown',this.disposeTavern,this);
    this.events.off('destroy',this.disposeTavern,this);
  }
}
