import { drawPersonnelPortrait } from './PersonnelPortraits.js';
const STYLE_ID='personnel-card-zoom-styles-v5';
export function portraitZoomLayout(width,height,face=false){return{scale:Math.min(width/(face?150:280),height/(face?170:310)),centerX:140,centerY:face?151:155};}
function installStyles(){
  if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`.personnel-zoom-shell{position:relative;min-width:0;display:grid;align-self:stretch}.personnel-zoom-shell>.personnel-card{width:100%;height:100%;margin:0}.personnel-roster .personnel-zoom-open{position:absolute;right:5px;top:5px;z-index:60;width:36px;height:36px;min-height:36px;padding:6px;border:2px solid #725439;background:#fff4d9;color:#493322;cursor:zoom-in}.personnel-zoom-open svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2}dialog.personnel-zoom-dialog:not([open]){display:none!important}dialog.personnel-zoom-dialog[open]{position:fixed;inset:0;box-sizing:border-box;margin:auto;width:min(680px,calc(100vw - 24px));height:min(850px,calc(100dvh - 24px));padding:16px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:12px;overflow:hidden;border:4px solid #62432d;background:#e9d9b4;color:#302016;font-family:SpecialElite,monospace;pointer-events:auto}.personnel-zoom-dialog::backdrop{background:#100c0be8}.personnel-zoom-heading{display:flex;justify-content:space-between;gap:15px}.personnel-zoom-dialog h2{margin:0 0 7px;font-size:27px}.personnel-zoom-facts{margin:0;color:#614a33;font-size:21px}.personnel-zoom-dialog button{font:inherit;cursor:pointer;min-height:42px;padding:9px 14px;background:#f8edcf;color:#3b291d;border:2px solid #866747}.personnel-zoom-dialog button:focus-visible{outline:3px solid #9b352b}.personnel-zoom-dialog button[aria-pressed=true]{background:#64372e;color:#fff1d4}.personnel-zoom-stage{position:relative;min-height:0;overflow:hidden;background:radial-gradient(ellipse,#9ba59a,#4a584c);border:2px solid #836848}.personnel-zoom-stage>canvas{display:block;width:100%;height:100%;object-fit:contain}.personnel-zoom-controls{display:flex;justify-content:center;flex-wrap:wrap;gap:10px}`;
  document.head.append(style);
}
export class PersonnelCardZoom {
  constructor(view){
    Object.assign(this,{view,root:view.root,destroyed:false,dialog:null,observer:null,resizeObserver:null,face:false});
    for(const key of ['handleRootClick','handleDialogClick','handleCancel','handleKeys','layout','destroy'])this[key]=this[key].bind(this);
    if(!this.root)return;installStyles();this.root.addEventListener('click',this.handleRootClick,true);this.decorate();const grid=this.root.querySelector('[data-grid]');
    if(grid){this.observer=new MutationObserver(()=>this.decorate());this.observer.observe(grid,{childList:true,subtree:true});}
    view.scene.scale.on('resize',this.layout);window.addEventListener('resize',this.layout);view.scene.events.once('shutdown',this.destroy);view.scene.events.once('destroy',this.destroy);
  }
  decorate(){
    if(this.destroyed||!this.root)return;
    for(const card of this.root.querySelectorAll('[data-grid] [data-person]')){
      if(card.parentElement?.hasAttribute('data-personnel-zoom-shell'))continue;
      const shell=document.createElement('div');shell.className='personnel-zoom-shell';shell.setAttribute('data-personnel-zoom-shell','');
      const person=this.view.roster.people.find(p=>String(p.id)===card.dataset.person),button=document.createElement('button');button.type='button';button.className='personnel-zoom-open';button.dataset.personnelZoom=card.dataset.person;button.title='Inspect portrait';button.setAttribute('aria-label',`Inspect portrait: ${person?.name||''}`);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M10 6v8M6 10h8"/></svg>';card.parentNode.insertBefore(shell,card);shell.append(card,button);
    }
  }
  handleRootClick(event){const b=event.target?.closest?.('[data-personnel-zoom]');if(!b||!this.root.contains(b))return;event.preventDefault();event.stopImmediatePropagation();if(this.view.help?.modal)return;const person=this.view.roster.people.find(p=>String(p.id)===b.dataset.personnelZoom);if(person)this.open(person,null,b);}
  open(person,_source,trigger){
    if(this.destroyed)return;this.close(false);this.trigger=trigger;this.face=false;this.person=person;
    const dialog=document.createElement('dialog');dialog.className='personnel-roster personnel-zoom-dialog';dialog.setAttribute('aria-label','Personnel portrait inspection');
    dialog.innerHTML='<header class="personnel-zoom-heading"><div><h2 data-zoom-name></h2><p class="personnel-zoom-facts" data-zoom-facts></p></div><button type="button" data-zoom-close>Close</button></header><div class="personnel-zoom-stage" data-zoom-stage><canvas role="img"></canvas></div><div class="personnel-zoom-controls"><button type="button" data-zoom-mode="portrait" aria-pressed="true">Full portrait</button><button type="button" data-zoom-mode="face" aria-pressed="false">Face close-up</button></div>';
    dialog.querySelector('[data-zoom-name]').textContent=person.name||'';dialog.querySelector('[data-zoom-facts]').textContent=[person.occupation,Number.isInteger(person.floor)?person.floor===0?'Ground floor':`Floor ${person.floor}`:''].filter(Boolean).join(' · ');
    this.dialog=dialog;this.stage=dialog.querySelector('[data-zoom-stage]');this.canvas=this.stage.querySelector('canvas');this.canvas.setAttribute('aria-label',person.name||'Personnel portrait');
    this.source=document.createElement('canvas');
    if(!drawPersonnelPortrait(this.source,person.appearance,this.view.scene,1024)){this.close(false);this.view.message('The portrait could not be drawn. Reload the personnel portraits.');return;}
    dialog.addEventListener('click',this.handleDialogClick);dialog.addEventListener('cancel',this.handleCancel);dialog.addEventListener('keydown',this.handleKeys);document.body.append(dialog);dialog.showModal();
    if(typeof ResizeObserver==='function'){this.resizeObserver=new ResizeObserver(this.layout);this.resizeObserver.observe(this.stage);}this.layout();dialog.querySelector('[data-zoom-close]').focus();
  }
  layout(){
    if(!this.dialog?.open||!this.stage||!this.source||!this.canvas)return;
    const box=this.stage.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(box.width*ratio)),h=Math.max(1,Math.round(box.height*ratio));this.canvas.width=w;this.canvas.height=h;
    const context=this.canvas.getContext('2d');context.clearRect(0,0,w,h);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    const sw=this.source.width,sh=this.source.height;
    // Crop the same drawn bitmap for close-up; never clone a canvas DOM node.
    if(this.face){const cw=sw*.54,ch=sh*.55,x=(sw-cw)/2,y=sh*.06,scale=Math.min(w/cw,h/ch);context.drawImage(this.source,x,y,cw,ch,(w-cw*scale)/2,(h-ch*scale)/2,cw*scale,ch*scale);}
    else{const scale=Math.min(w/sw,h/sh);context.drawImage(this.source,0,0,sw,sh,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);}
  }
  handleDialogClick(event){const b=event.target?.closest?.('button');if(b?.hasAttribute('data-zoom-close')){this.close();return;}if(b?.hasAttribute('data-zoom-mode')){this.face=b.dataset.zoomMode==='face';for(const item of this.dialog.querySelectorAll('[data-zoom-mode]'))item.setAttribute('aria-pressed',String((item.dataset.zoomMode==='face')===this.face));this.layout();return;}if(event.target===this.dialog){const box=this.dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)this.close();}}
  handleKeys(event){event.stopPropagation();}
  handleCancel(event){event.preventDefault();event.stopPropagation();this.close();}
  close(restoreFocus=true){
    this.resizeObserver?.disconnect();this.resizeObserver=null;if(this.dialog){this.dialog.removeEventListener('click',this.handleDialogClick);this.dialog.removeEventListener('cancel',this.handleCancel);this.dialog.removeEventListener('keydown',this.handleKeys);if(this.dialog.open)this.dialog.close();this.dialog.remove();}
    this.dialog=this.stage=this.canvas=this.source=this.person=null;if(restoreFocus&&this.trigger?.isConnected)this.trigger.focus({preventScroll:true});this.trigger=null;
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.observer?.disconnect();this.observer=null;this.close(false);this.root?.removeEventListener('click',this.handleRootClick,true);this.view.scene.scale.off('resize',this.layout);window.removeEventListener('resize',this.layout);this.view.scene.events.off('shutdown',this.destroy);this.view.scene.events.off('destroy',this.destroy);this.root=null;}
}
