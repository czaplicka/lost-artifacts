import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getPIQuestStatus } from '../managers/PIQuestManager.js';
import { TAVERN_CONFIG } from '../config/tavernConfig.js';
import { HomeTownDialogue } from '../ui/HomeTownDialogue.js';
const KEY='TavernScene',TEXT_KEY='tavernDialogues',EXTRA_KEY='tavernExtras';
const clone=data=>JSON.parse(JSON.stringify(data));
export function rollTavernPresence(definitions,random=Math.random){return Object.fromEntries(Object.entries(definitions).map(([id,d])=>[id,d.alwaysPresent===true||random()<d.chance]));}
export function adjustTavernHotspot(cfg,code,shift,alt,width,height){
  const horizontal=['ArrowLeft','ArrowRight'].includes(code),direction=['ArrowLeft','ArrowUp'].includes(code)?-1:1;
  const field=shift?(horizontal?'w':'h'):(horizontal?'x':'y'),size=Math.max(1,horizontal?width:height);
  cfg[field]=Math.max(shift?Math.min(1,20/size):0,Math.min(1,cfg[field]+direction*(alt?1:5)/size));
}
const CSS=`${__dialogueText("scenes/TavernScene.js", "t_da07df321d5a434b67b1")}`;
export class TavernScene extends BaseScene {
  constructor(){super({key:KEY});}
  init(){
    this.disposed=false;this.ready=false;this.navigating=false;this.token=Symbol(KEY);this.panel=null;this.root=null;
    this.spots=[];this.layers=new Map();this.pendingPresence=new Map();this.config=clone(TAVERN_CONFIG);this.hotspotDefs=this.config.hotspots;
    this.presence=rollTavernPresence(this.config.npcs);this.activeNpcId=null;this.debugMode=false;this.selectedIndex=0;
    this.lastBox=null;this.styleElement=null;this.background=null;this.label=null;this.domKey=null;this.statusTimer=null;
    this.dialogue=null;this.portraitKeys=new Set();
  }
  preload(){
    const assets=[{key:this.config.backgroundKey,url:this.config.backgroundUrl},...Object.values(this.config.npcs)];
    for(const a of new Map(assets.map(a=>[a.key,a])).values())if(!this.textures.exists(a.key))this.load.image(a.key,a.url);
    for(const[key,url]of[[TEXT_KEY,'assets/data/tavernDialogues.json'],[EXTRA_KEY,'assets/data/tavernExtras.json'],['piOfficeClassifieds','assets/data/piClassifieds.json']])if(!this.cache.json.exists(key))this.load.json(key,url);
  }
  create(){
    super.create();this.events.once('shutdown',this.disposeTavern,this);this.events.once('destroy',this.disposeTavern,this);
    this.registry.set('currentSceneKey',KEY);this.textData=this.cache.json.get(TEXT_KEY);this.extraData=this.cache.json.get(EXTRA_KEY);
    this.cameras.main.setBackgroundColor('#171b18');this.hideGameplayHud();
    this.dialogue=new HomeTownDialogue(this,()=>this.closePanel());
    if(!this.textData?.ui||!this.textData?.npcs||!this.textData?.rumors||!this.extraData?.ui||!this.extraData?.comments||!this.textures.exists(this.config.backgroundKey)){
      this.add.text(24,24,__dialogueText("scenes/TavernScene.js", "t_6f9aac0ce41bd8fb840c"),{fontFamily:'monospace',fontSize:'20px',color:'#fff',wordWrap:{width:Math.max(100,this.scale.width-48)}}).setInteractive({useHandCursor:true}).on('pointerdown',()=>void this.leave());return;
    }
    this.background=this.add.image(0,0,this.config.backgroundKey).setOrigin(0).setDepth(0);
    for(const[id,def]of Object.entries(this.config.npcs)){
      if(!this.textures.exists(def.key)){console.warn('[TavernScene] Missing NPC texture:',id,def.key);continue;}
      this.layers.set(id,this.add.image(0,0,def.key).setOrigin(0).setDepth(def.depth).setVisible(this.presence[id]));
    }
    this.label=this.add.text(0,0,'',{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',backgroundColor:'#18201c',padding:{x:8,y:5}}).setDepth(1000).setOrigin(.5,1).setVisible(false);
    this.createInterface();this.hotspotDefs.forEach((d,i)=>this.createHotspot(d,i));
    this.trackInputEvent(this.scale,'resize',this.layout);this.trackInputEvent(this.input,'drag',this.onHotspotDrag);
    this.domKey=event=>this.onKey(event);window.addEventListener('keydown',this.domKey,true);
    this.ready=true;this.layout();this.refreshHotspots();
  }
  hideGameplayHud(){
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();this.getRegisteredScene('NewsHud')?.closeMenu?.(true);this.getRegisteredScene('NewsHud')?.setHudVisible?.(false);
    for(const key of['PlayerHudScene','UIScene','NewsHud'])if(this.hasScene(key))this.scene.setVisible(false,key);
    this.styleElement=document.createElement('style');this.styleElement.textContent=CSS;document.head.appendChild(this.styleElement);document.documentElement.classList.add('tavern-active');
  }
  format(value,values={}){return String(value).replace(/\{(\w+)\}/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);}
  text(key,values={}){return this.format(this.textData?.ui?.[key]??`[${key}]`,values);}
  extra(key,values={}){return this.format(this.extraData?.ui?.[key]??`[${key}]`,values);}
  createInterface(){
    this.root=document.createElement('div');this.root.className='la-tavern-ui';const top=document.createElement('div');top.className='top';
    const title=document.createElement('div');title.className='title';title.textContent=this.text('title');const buttons=document.createElement('div');buttons.className='buttons';
    buttons.append(this.button(this.text('backToTown'),()=>{if(!this.debugMode&&!this.panel)void this.leave();}));top.append(title,buttons);
    this.hint=document.createElement('div');this.hint.className='hint';this.hint.textContent=this.text('hint');
    this.debugText=document.createElement('div');this.debugText.className='debug';this.debugText.hidden=true;
    this.root.append(top,this.hint,this.debugText);document.body.appendChild(this.root);
  }
  button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',event=>{event.stopPropagation();if(!this.disposed&&!this.navigating)action();});return b;}
  canInteract(){return this.ready&&!this.disposed&&!this.navigating&&!this.panel;}
  isNpcPresent(id){return Boolean(!this.disposed&&this.presence[id]&&this.layers.has(id));}
  getNpcPresence(){return{...this.presence};}
  setNpcPresent(id,present){
    const def=this.config.npcs[id];if(!this.ready||this.disposed||!def||typeof present!=='boolean')return false;if(def.alwaysPresent&&!present)return false;
    if(!present&&this.activeNpcId===id&&this.panel){this.pendingPresence.set(id,present);return true;}
    this.pendingPresence.delete(id);this.applyPresence(id,present);return true;
  }
  applyPresence(id,present){this.presence[id]=present;this.layers.get(id)?.setVisible(present);this.label?.setVisible(false);this.refreshHotspots();}
  flushPresence(){const pending=[...this.pendingPresence];this.pendingPresence.clear();for(const[id,present]of pending)this.applyPresence(id,present);}
  createHotspot(cfg,index){
    const rect=this.add.rectangle(0,0,1,1,0xffd27d,0).setDepth(100).setInteractive({useHandCursor:true}).setData('hotspotIndex',index);
    const label=this.add.text(0,0,cfg.label,{fontFamily:'SpecialElite, monospace',fontSize:'20px',color:'#ffe3a4',backgroundColor:'#18201c',padding:{x:8,y:5}}).setOrigin(.5,1).setDepth(110).setVisible(false);
    const hot={cfg,rect,label};this.spots.push(hot);
    rect.on('pointerover',()=>{if(!this.canInteract()||this.debugMode)return;label.setVisible(true);});rect.on('pointerout',()=>{if(!this.debugMode)label.setVisible(false);});
    rect.on('pointerdown',()=>{
      if(!this.canInteract())return;if(this.debugMode){this.selectedIndex=index;this.refreshHotspots();return;}
      if(cfg.action==='talk'&&!this.isNpcPresent(cfg.npcId))return;
      if(cfg.action==='exit')void this.leave();else if(cfg.action==='talk')this.talk(cfg.npcId);else if(cfg.action==='comment')this.comment(cfg);
    });this.syncHotspot(hot);return hot;
  }
  syncHotspot({cfg,rect,label}){const{width,height}=this.scale,w=Math.max(1,cfg.w*width),h=Math.max(1,cfg.h*height);rect.setPosition(cfg.x*width,cfg.y*height).setSize(w,h);rect.input?.hitArea?.setTo(0,0,w,h);label.setPosition(cfg.x*width,Math.max(35,cfg.y*height-h/2-6));}
  refreshHotspots(){
    if(this.disposed)return;for(const[index,hot]of this.spots.entries()){
      const available=hot.cfg.action!=='talk'||this.isNpcPresent(hot.cfg.npcId),enabled=this.canInteract()&&(this.debugMode||available);
      if(hot.rect.input)hot.rect.input.enabled=enabled;this.input.setDraggable(hot.rect,enabled&&this.debugMode);
      hot.rect.setFillStyle(available?0xffd27d:0x999999,enabled&&this.debugMode ? .2 : 0).setStrokeStyle(enabled&&this.debugMode?3:0,index===this.selectedIndex?0xff77c8:0xffd27d);
      hot.label.setText(hot.cfg.label).setVisible(enabled&&this.debugMode);
    }
    const hot=this.spots[this.selectedIndex];if(this.debugText){this.debugText.hidden=!this.debugMode;if(hot&&this.debugMode){const c=hot.cfg,p=c.action==='talk'?this.extra(this.isNpcPresent(c.npcId)?'present':'absent'):this.extra('environment');this.debugText.textContent=this.extra('debugState',{id:c.id,presence:p,x:c.x.toFixed(4),y:c.y.toFixed(4),w:c.w.toFixed(4),h:c.h.toFixed(4)})+'\n'+this.extra('debugHelp');}}
  }
  toggleDebug(){if(!this.canInteract())return;this.debugMode=!this.debugMode;this.label?.setVisible(false);this.refreshHotspots();}
  onHotspotDrag(_pointer,object,x,y){
    if(!this.canInteract()||!this.debugMode)return;const index=object.getData('hotspotIndex');if(!Number.isInteger(index)||!this.spots[index])return;
    this.selectedIndex=index;const hot=this.spots[index];hot.cfg.x=Math.max(0,Math.min(1,x/this.scale.width));hot.cfg.y=Math.max(0,Math.min(1,y/this.scale.height));this.syncHotspot(hot);this.refreshHotspots();
  }
  addHotspot(){
    if(!this.canInteract()||!this.debugMode)return;let number=1;while(this.hotspotDefs.some(h=>h.id===`extra_${number}`))number++;
    const d={id:`extra_${number}`,label:`${__dialogueText("scenes/TavernScene.js", "t_ce94c871d50f0039f8e5")}${number}`,action:'comment',textKey:'extraComment',x:.5,y:.5,w:.1,h:.1};this.hotspotDefs.push(d);this.createHotspot(d,this.hotspotDefs.length-1);this.selectedIndex=this.hotspotDefs.length-1;this.refreshHotspots();this.say(this.extra(__dialogueText("scenes/TavernScene.js", "t_279b8a60f444fa8b6275")));
  }
  exportConfig(){console.log('COPY TO config/tavernConfig.js:');console.log('export const TAVERN_CONFIG = '+JSON.stringify(this.config,null,2)+';');this.say(this.extra(__dialogueText("scenes/TavernScene.js", "t_427da8ba22c9532ad803")));}
  onKey(event){
    if(this.disposed||!this.ready||!this.sys.isActive()||this.navigating||event.ctrlKey||event.metaKey)return;
    if(event.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName))return;
    const code=event.code,handled=code===__dialogueText("scenes/TavernScene.js", "t_037c968467aa3fd7c059")||(!this.panel&&code==='KeyD')||(!this.panel&&this.debugMode&&[__dialogueText("scenes/TavernScene.js", "t_90ddf1963abb36c9921c"),'KeyC','KeyN','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code));
    if(!handled)return;event.preventDefault();event.stopImmediatePropagation();
    if(code===__dialogueText("scenes/TavernScene.js", "t_037c968467aa3fd7c059")){if(event.repeat)return;if(this.panel)this.closePanel();else if(this.debugMode)this.toggleDebug();else void this.leave();return;}
    if(this.panel)return;if(code==='KeyD'){if(!event.repeat)this.toggleDebug();return;}if(!this.debugMode)return;
    if(code===__dialogueText("scenes/TavernScene.js", "t_90ddf1963abb36c9921c")&&this.spots.length)this.selectedIndex=(this.selectedIndex+(event.shiftKey?-1:1)+this.spots.length)%this.spots.length;
    else if(code==='KeyC'){if(!event.repeat)this.exportConfig();}else if(code==='KeyN'){if(!event.repeat)this.addHotspot();}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code)){const hot=this.spots[this.selectedIndex];if(hot){adjustTavernHotspot(hot.cfg,code,event.shiftKey,event.altKey,this.scale.width,this.scale.height);this.syncHotspot(hot);}}this.refreshHotspots();
  }
  layout(){
    if(this.disposed||!this.root)return;const{width,height}=this.scale;this.background?.setDisplaySize(width,height);for(const layer of this.layers.values())layer.setPosition(0,0).setDisplaySize(width,height);for(const hot of this.spots)this.syncHotspot(hot);
    const b=this.game.canvas.getBoundingClientRect();Object.assign(this.root.style,{left:`${b.left}px`,top:`${b.top}px`,width:`${b.width}px`,height:`${b.height}px`,fontSize:`${Math.max(12,Math.min(22,b.width/65))}px`});
  }
  update(){if(this.disposed||!this.root)return;const b=this.game.canvas.getBoundingClientRect(),sig=`${b.left}/${b.top}/${b.width}/${b.height}`;if(sig!==this.lastBox){this.lastBox=sig;this.layout();}}
  say(text){if(!this.hint)return;this.statusTimer?.remove(false);this.hint.textContent=text;this.statusTimer=this.time.delayedCall(5000,()=>{if(!this.disposed)this.hint.textContent=this.text('hint');this.statusTimer=null;});}
  portraitForNpc(id){
    if(!id)return null;const key=`tavern_dialogue_portrait_${id}`;if(this.portraitKeys.has(key)&&this.textures.exists(key))return key;
    const def=this.config.npcs[id],hot=this.hotspotDefs.find(h=>h.npcId===id);
    if(!def||!hot||!this.textures.exists(def.key))return null;
    try{
      const image=this.textures.get(def.key).getSourceImage(),iw=image.width,ih=image.height;
      const x=Math.max(0,Math.floor((hot.x-hot.w/2)*iw)),y=Math.max(0,Math.floor((hot.y-hot.h/2)*ih));
      const w=Math.max(1,Math.min(iw-x,Math.ceil(hot.w*iw))),h=Math.max(1,Math.min(ih-y,Math.ceil(hot.h*ih*.48)));
      if(this.textures.exists(key))this.textures.remove(key);
      const tex=this.textures.createCanvas(key,w,h);tex.getContext().drawImage(image,x,y,w,h,0,0,w,h);tex.refresh();this.portraitKeys.add(key);return key;
    }catch(error){console.warn('[TavernScene] Portrait crop failed:',id,error);return null;}
  }
  show(title,text,choices){
    if(this.disposed||!this.root||this.debugMode)return;this.label?.setVisible(false);for(const hot of this.spots)hot.label.setVisible(false);
    this.panel=this.dialogue.show({title,text,choices,portrait:this.portraitForNpc(this.activeNpcId)});
    this.hint.style.display='none';this.refreshHotspots();
  }
  closePanel(){this.dialogue?.close(false);this.panel=null;this.activeNpcId=null;if(this.hint)this.hint.style.display='';this.flushPresence();this.refreshHotspots();}
  comment(cfg){this.activeNpcId=null;this.show(cfg.label,this.extraData.comments[cfg.textKey]||this.extra('unknownComment'),[]);}
  board(){const cfg=this.hotspotDefs.find(h=>h.id==='board');if(cfg)this.comment(cfg);}
  adverts(){const d=this.cache.json.get('piOfficeClassifieds');return Array.isArray(d?.advertisements)?d.advertisements:[];}
  talk(id){
    const npc=this.textData.npcs[id];if(!npc||!this.isNpcPresent(id)||this.debugMode)return;this.activeNpcId=id;
    this.show(npc.name,npc.greeting,[...npc.chat.map(c=>[c.question,()=>this.show(npc.name,c.answer,[[this.text('somethingElse'),()=>this.talk(id)]])]),[this.text('askForWork'),()=>this.leads(id)]]);
  }
  leads(id){
    const npc=this.textData.npcs[id];if(!npc||!this.isNpcPresent(id))return;this.activeNpcId=id;
    const ads=npc.leads.map(key=>this.adverts().find(a=>a.id===key&&a.kind==='pi')).filter(Boolean);
    this.show(npc.name,this.text(ads.length?'leadsAvailable':'leadsEmpty'),[...ads.map(ad=>[ad.title,()=>this.lead(id,ad)]),[this.text('somethingElse'),()=>this.talk(id)]]);
  }
  lead(id,ad){
    const npc=this.textData.npcs[id];if(!npc||!this.isNpcPresent(id))return;this.activeNpcId=id;const status=getPIQuestStatus(ad.missionId);
    const text=status==='completed'?this.text('completedRumor'):status!=='available'?this.text('activeRumor'):[this.textData.rumors[ad.id]||ad.description||'',this.text('contact',{contact:ad.contact||this.text('contactFallback')}),this.text('rumorDisclaimer')].join('\n\n');
    this.show(npc.name,text,[[this.text('readNotice'),()=>this.notice(ad,()=>this.lead(id,ad))],[this.text('somethingElse'),()=>this.talk(id)]]);
  }
  notice(ad,back){
    const job=ad.kind==='pi'&&typeof ad.missionId==='string',parts=[ad.description||'',this.text('contact',{contact:ad.contact||this.text('contactMissing')})];
    if(job){const status=getPIQuestStatus(ad.missionId);parts.push(this.text('status',{status:status==='available'?this.text('notAccepted'):(this.textData.ui.statusLabels?.[status]||status)}));}
    this.show(ad.title,parts.join('\n\n'),[...(job?[[this.text('goToOffice'),()=>void this.navigate('DetectiveOfficeScene',{entrySource:'tavern',fromScene:KEY,gameState})]]:[]),[this.text('back'),back]]);
  }
  leave(){return this.navigate('HomeCityScene',{entryPoint:'tavern',fromScene:KEY,gameState});}
  async navigate(key,data){
    if(this.disposed||this.navigating||this.debugMode)return false;const token=this.token;this.navigating=true;this.refreshHotspots();const result=await this.goto(key,data);
    if(this.disposed||this.token!==token)return result!==false;this.navigating=false;
    if(result===false&&this.root)this.show(this.text('navigationErrorTitle'),this.text('navigationError'),[]);return result!==false;
  }
  disposeTavern(){
    if(this.disposed)return;this.disposed=true;this.ready=false;this.token=null;
    if(this.domKey)window.removeEventListener('keydown',this.domKey,true);this.domKey=null;this.statusTimer?.remove(false);this.statusTimer=null;this.pendingPresence.clear();
    this.dialogue?.destroy();this.dialogue=null;for(const key of this.portraitKeys)if(this.textures.exists(key))this.textures.remove(key);this.portraitKeys.clear();
    this.root?.remove();this.root=null;this.panel=null;this.styleElement?.remove();this.styleElement=null;document.documentElement.classList.remove('tavern-active');
    this.events.off('shutdown',this.disposeTavern,this);this.events.off('destroy',this.disposeTavern,this);
  }
}
