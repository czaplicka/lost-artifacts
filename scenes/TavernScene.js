import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getPIQuestStatus } from '../managers/PIQuestManager.js';

const KEY = 'TavernScene';
const NPCS = {
  bartender: {
    name: 'Bartender',
    greeting: 'Welcome. If you are looking for trouble, try the menu.',
    chat: [
      ['How is business?', 'People come here to forget. Then they forget to pay.'],
      ['You polish that glass a lot.', 'It has seen things. I am trying to remove the evidence.'],
      ['What do you recommend?', 'Lower expectations. Goes with everything.']
    ],
    leads: ['dead_men_calling']
  },
  regular: {
    name: 'The Regular',
    greeting: 'Sit down. I have a theory. Several, actually. None improved by evidence.',
    chat: [
      ['What is your theory?', 'The pigeons work for someone. Nobody walks that confidently without a pension.'],
      ['Is this your usual table?', 'We have an understanding. I support it emotionally. Those beer mats handle the structural work.'],
      ['Anything in the newspaper?', 'Yesterday I was worried about tomorrow. Today the paper confirms I was right.']
    ],
    leads: ['stolen_alibi']
  },
  guest: {
    name: 'Woman in the Mustard Coat',
    greeting: 'If you are selling insurance, I am already anxious enough.',
    chat: [
      ['Waiting for someone?', 'No. That is the beauty of it. Nobody can be late.'],
      ['Nice place.', 'The coffee is terrible, but nobody asks me to join a mailing list.'],
      ['Do you come here often?', 'Only when I need peace. So, increasingly often.']
    ],
    leads: ['dead_mail']
  }
};
const RUMORS = {
  dead_mail: 'Florence Finch says someone delivered a parcel to her grave. Awkward, considering she is still using her body.',
  dead_men_calling: 'A widow says her late husband keeps leaving phone messages. Apparently even death does not improve communication.',
  stolen_alibi: 'Someone says three strangers used them as a dinner alibi. They ate alone. Imagine having your social life stolen before you even acquire one.'
};
const SPOTS = [
  ['bartender', 'Talk to the bartender', .145, .23, .125, .28],
  ['regular', 'Talk to the regular', .475, .30, .11, .38],
  ['guest', 'Talk to the woman', .79, .395, .105, .25],
  ['board', 'Read the noticeboard', .731, .216, .10, .15],
  ['exit', 'Return to the neighborhood', .875, .10, .075, .29]
];

export class TavernScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init() {
    this.disposed = false;
    this.navigating = false;
    this.token = Symbol(KEY);
    this.panel = null;
    this.panelView = null;
    this.spots = [];
  }
  preload() {
    if (!this.textures.exists('tavern_bg')) this.load.image('tavern_bg', 'assets/local/tavern.webp');
    if (!this.cache.json.exists('piOfficeClassifieds')) this.load.json('piOfficeClassifieds', 'assets/data/piClassifieds.json');
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    this.cameras.main.setBackgroundColor('#171b18');
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.getRegisteredScene('NewsHud')?.closeMenu?.(true);
    this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for (const key of ['PlayerHudScene', 'UIScene', 'NewsHud']) {
      if (this.hasScene(key)) this.scene.setVisible(false, key);
    }
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
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
    document.head.appendChild(this.styleElement);
    document.documentElement.classList.add('tavern-active');
    if (this.textures.exists('tavern_bg')) this.background = this.add.image(0, 0, 'tavern_bg').setOrigin(0);
    this.label = this.add.text(0, 0, '', {fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',backgroundColor:'#18201c',padding:{x:8,y:5}}).setDepth(50).setVisible(false);
    for (const [id, label, x, y, w, h] of SPOTS) {
      const rect = this.add.rectangle(0,0,1,1,0xffcc77,0).setOrigin(0).setInteractive({useHandCursor:true});
      rect.on('pointerover', () => {
        if (!this.panel && !this.navigating) {
          this.label.setText(label).setPosition(rect.x, Math.max(5,rect.y-36)).setVisible(true);
        }
      });
      rect.on('pointerout', () => this.label.setVisible(false));
      rect.on('pointerdown', () => {
        if (this.panel || this.navigating) return;
        this.label.setVisible(false);
        if (id === 'exit') void this.leave();
        else if (id === 'board') this.board();
        else this.talk(id);
      });
      this.spots.push({rect,x,y,w,h});
    }
    this.root = document.createElement('div');
    this.root.className = 'la-tavern-ui';
    const top = document.createElement('div'); top.className = 'top';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = 'THE TAVERN';
    top.append(title, this.button('Back to town', () => void this.leave()));
    this.hint = document.createElement('div'); this.hint.className = 'hint'; this.hint.textContent = 'Select someone to talk. Escape: close / leave.';
    this.root.append(top,this.hint); document.body.appendChild(this.root);
    this.trackInputEvent(this.scale, 'resize', this.layout);
    this.trackInputEvent(this.input.keyboard, 'keydown-ESC', this.onEscape);
    this.domEscape = e => {
      if (e.code !== 'Escape' || e.repeat) return;
      if (!this.root?.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation(); this.onEscape();
    };
    this.root.addEventListener('keydown', this.domEscape);
    this.events.once('shutdown', this.disposeTavern, this);
    this.events.once('destroy', this.disposeTavern, this);
    this.layout();
  }
  layout() {
    if (this.disposed) return;
    const {width,height} = this.scale;
    this.background?.setDisplaySize(width,height);
    for (const s of this.spots) {
      s.rect.setPosition(s.x*width,s.y*height).setSize(s.w*width,s.h*height);
      s.rect.input.hitArea.setTo(0,0,s.w*width,s.h*height);
    }
    this.label?.setVisible(false);
    const box = this.game.canvas.getBoundingClientRect();
    Object.assign(this.root.style,{left:`${box.left}px`,top:`${box.top}px`,width:`${box.width}px`,height:`${box.height}px`,fontSize:`${Math.max(12,Math.min(22,box.width/65))}px`});
  }
  update() {
    if (this.disposed || !this.root) return;
    const b = this.game.canvas.getBoundingClientRect();
    const sig = `${b.left}/${b.top}/${b.width}/${b.height}`;
    if (sig !== this.lastBox) {this.lastBox=sig;this.layout();}
  }
  button(text, action) {
    const b = document.createElement('button'); b.type='button'; b.textContent=text;
    b.addEventListener('click', e => {e.stopPropagation();if(!this.disposed&&!this.navigating) action();});
    return b;
  }
  show(title, text, choices) {
    this.panelView = {title,text,choices};
    this.panel?.remove(); this.label?.setVisible(false);
    this.panel = document.createElement('section'); this.panel.className='panel';
    this.panel.setAttribute('aria-label',title);
    const h = document.createElement('h2'); h.textContent=title;
    const p = document.createElement('p'); p.textContent=text;
    const list = document.createElement('div'); list.className='choices';
    for (const [label, action] of choices) list.appendChild(this.button(label,action));
    this.panel.append(h,p,list); this.root.appendChild(this.panel);
    this.hint.style.display='none';
    for(const s of this.spots) s.rect.input.enabled=false;
    list.querySelector('button')?.focus({preventScroll:true});
  }
  closePanel() {
    this.panel?.remove(); this.panel=null; this.panelView=null;
    this.hint.style.display='';
    for(const s of this.spots) s.rect.input.enabled=true;
  }
  onEscape() {
    if(this.navigating||this.disposed) return;
    if(this.panel) this.closePanel(); else void this.leave();
  }
  adverts() {
    const data=this.cache.json.get('piOfficeClassifieds');
    return Array.isArray(data?.advertisements)?data.advertisements:[];
  }
  talk(id) {
    const npc=NPCS[id];
    this.show(npc.name,npc.greeting,[
      ...npc.chat.map(([question,answer]) => [question,()=>this.show(npc.name,answer,[['Something else…',()=>this.talk(id)],['Goodbye.',()=>this.closePanel()]])]),
      ['Heard of anyone needing a detective?',()=>this.leads(id)],
      ['Goodbye.',()=>this.closePanel()]
    ]);
  }
  leads(id) {
    const npc=NPCS[id];
    const ads=npc.leads.map(key=>this.adverts().find(a=>a.id===key&&a.kind==='pi')).filter(Boolean);
    this.show(npc.name,ads.length?'Word gets around. Whether it should is another matter.':'Nothing I can point you to today. Try the office classifieds later.',[
      ...ads.map(ad=>[ad.title,()=>this.lead(id,ad)]),
      ['Something else…',()=>this.talk(id)]
    ]);
  }
  lead(id,ad) {
    const status=getPIQuestStatus(ad.missionId);
    let text;
    if(status==='completed') text='You already closed that one. Good. I was running out of irresponsible theories.';
    else if(status!=='available') text='You have already taken that job. I can offer moral support, but not an alibi.';
    else text=`${RUMORS[ad.id]||ad.description}\n\nContact: ${ad.contact||'See the office classifieds.'}\n\nThe full notice is in your office classifieds. Hearing a rumor does not accept a job.`;
    this.show(NPCS[id].name,text,[
      ['Read the notice.',()=>this.notice(ad,()=>this.lead(id,ad))],
      ['Something else…',()=>this.talk(id)],['Goodbye.',()=>this.closePanel()]
    ]);
  }
  board() {
    const ads=this.adverts();
    this.show('Noticeboard',ads.length?'Local opportunities. Some more advisable than others.':'No notices available. The classifieds could not be loaded.',[
      ...ads.map(ad=>[ad.title,()=>this.notice(ad,()=>this.board())]),
      ['Step away.',()=>this.closePanel()]
    ]);
  }
  notice(ad,back) {
    const isJob=ad.kind==='pi'&&typeof ad.missionId==='string';
    const status=isJob?getPIQuestStatus(ad.missionId):null;
    const statusText=isJob?`\n\nStatus: ${status==='available'?'Not accepted':status}.`:'';
    this.show(ad.title,`${ad.description||''}\n\nContact: ${ad.contact||'Not provided'}${statusText}`, [
      ...(isJob?[['Go to the office classifieds.',()=>void this.navigate('DetectiveOfficeScene',{entrySource:'tavern',fromScene:KEY,gameState})]]:[]),
      ['Back.',back],['Close.',()=>this.closePanel()]
    ]);
  }
  leave() {return this.navigate('HomeCityScene',{entryPoint:'tavern',fromScene:KEY,gameState});}
  async navigate(key,data) {
    if(this.disposed||this.navigating) return false;
    const token=this.token; this.navigating=true;
    for(const s of this.spots) s.rect.input.enabled=false;
    const result=await this.goto(key,data);
    if(this.disposed||this.token!==token) return result!==false;
    this.navigating=false;
    if(result===false) this.show('Could not open location','Please try again.',[['Close.',()=>this.closePanel()]]);
    return result!==false;
  }
  disposeTavern() {
    if(this.disposed) return;
    this.disposed=true; this.token=null;
    this.root?.removeEventListener('keydown',this.domEscape);
    this.root?.remove(); this.root=null;
    this.styleElement?.remove(); this.styleElement=null;
    document.documentElement.classList.remove('tavern-active');
    this.events.off('shutdown',this.disposeTavern,this);
    this.events.off('destroy',this.disposeTavern,this);
  }
}
