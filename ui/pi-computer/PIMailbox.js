import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const KEY='piMailboxV1';
const NOTIFICATIONS='piComputerMailNotifications';
const list=value=>Array.isArray(value)?value:[];
export function isMailboxDraft(message){
  return Boolean(message && (message.id==='alibi_box17_draft'||/^Draft:/i.test(message.subject||'')||/^(?:Draft|Unsent)/i.test(message.date||'')));
}
function uniqueMessages(items){
  const seen=new Set();
  return list(items).filter(message=>{
    if(!message||typeof message.id!=='string'||!message.id||seen.has(message.id))return false;
    seen.add(message.id);return true;
  });
}
function snapshot(message){
  const copy={};
  for(const field of ['id','from','to','subject','date','body','threadId','inReplyTo']){
    if(typeof message[field]==='string')copy[field]=message[field];
  }
  if(Array.isArray(message.attachments)){
    try{copy.attachments=JSON.parse(JSON.stringify(message.attachments));}catch(error){console.warn('[PIMailbox] Attachment snapshot failed:',error);}
  }
  return copy;
}

export class PIMailboxStore{
  constructor(state=gameState,save=requestAutosave){this.state=state;this.save=save;}
  read(){
    const raw=this.state[KEY];
    const records=list(raw?.records).filter(record=>record&&typeof record.id==='string'&&Number.isFinite(record.order));
    const sequence=Math.max(0,Number(raw?.sequence)||0,...records.map(record=>record.order));
    return{version:1,sequence,records,deleted:[...new Set(list(raw?.deleted).filter(id=>typeof id==='string'))]};
  }
  write(next){this.state[KEY]=next;this.save();}
  sync(items){
    const messages=uniqueMessages(items),state=this.read(),records=[...state.records],seen=new Set(records.map(record=>record.id));
    let sequence=state.sequence,changed=false;
    // Older notifications preserve first-observed arrival order where available.
    if(!records.length){
      const current=new Map(messages.filter(message=>!isMailboxDraft(message)).map(message=>[message.id,message]));
      for(const id of list(this.state[NOTIFICATIONS]?.known)){
        if(!current.has(id)||seen.has(id))continue;
        records.push({id,order:++sequence});seen.add(id);changed=true;
      }
    }
    // Producers generally prepend a batch. Reverse only that new batch,
    // never existing records, so later renders cannot reshuffle old mail.
    for(const message of [...messages].reverse()){
      if(isMailboxDraft(message)||seen.has(message.id))continue;
      records.push({id:message.id,order:++sequence});seen.add(message.id);changed=true;
    }
    const next={...state,sequence,records};
    if(changed)this.write(next);
    const byId=new Map(records.map(record=>[record.id,record]));
    const combined=[...messages],present=new Set(messages.map(message=>message.id));
    for(const record of records){
      if(!present.has(record.id)&&record.copy){combined.push(record.copy);present.add(record.id);}
    }
    combined.sort((a,b)=>{
      const aa=isMailboxDraft(a)?Infinity:byId.get(a.id)?.order||0;
      const bb=isMailboxDraft(b)?Infinity:byId.get(b.id)?.order||0;
      return aa===bb?0:bb-aa;
    });
    return{state:next,messages:combined};
  }
  visible(items,trash=false){
    const result=this.sync(items),deleted=new Set(result.state.deleted);
    return result.messages.filter(message=>trash?deleted.has(message.id):!deleted.has(message.id));
  }
  remove(message){
    if(!message?.id||isMailboxDraft(message))return false;
    const state=this.sync([message]).state;
    if(state.deleted.includes(message.id))return false;
    this.write({...state,deleted:[...state.deleted,message.id],records:state.records.map(record=>record.id===message.id?{...record,copy:snapshot(message)}:record)});
    return true;
  }
  restore(id){
    const state=this.read();if(!state.deleted.includes(id))return false;
    this.write({...state,deleted:state.deleted.filter(value=>value!==id)});return true;
  }
}

export class PIMailbox{
  constructor(ui,documents){
    this.ui=ui;this.documents=documents;this.store=new PIMailboxStore();this.trash=false;
    this.dead=false;this.installed=false;this.restorers=[];this.raw=null;
    this.onShutdown=()=>this.destroy();ui.scene.events.once('shutdown',this.onShutdown);
    queueMicrotask(()=>this.install());
  }
  install(){
    if(this.dead||this.ui.destroyed||this.installed)return;
    this.installed=true;
    const docs=this.documents,originalMail=docs.getMail;
    this.raw=originalMail.bind(docs);
    const wrappedMail=(...args)=>this.store.visible(this.raw(...args),false);
    docs.getMail=wrappedMail;
    this.restorers.push(()=>{if(docs.getMail===wrappedMail)docs.getMail=originalMail;});
    const originalRender=docs.render,ui=this.ui;
    const wrappedRender=(...args)=>{
      if(ui.app==='mail'&&this.trash&&ui.selectedId){
        const deleted=new Set(this.store.read().deleted);
        if(!deleted.has(ui.selectedId)&&this.raw().some(message=>message.id===ui.selectedId))this.trash=false;
      }
      const oldButton=ui.drawing.button;
      const moved=function(x,y,label,...rest){
        const box=ui.window;
        if(box&&label==='HINT'&&Math.abs(x-(box.x+180))<2&&Math.abs(y-(box.y+box.h-77))<2){
          // The old case-help control occupied the mail-list footer.
          return oldButton.call(this,box.x+180,box.y+6,label,...rest);
        }
        return oldButton.call(this,x,y,label,...rest);
      };
      ui.drawing.button=moved;
      try{return originalRender.apply(docs,args);}
      finally{if(ui.drawing.button===moved)ui.drawing.button=oldButton;}
    };
    docs.render=wrappedRender;
    this.restorers.push(()=>{if(docs.render===wrappedRender)docs.render=originalRender;});
    for(const method of ['open','openApp']){
      if(typeof ui[method]!=='function')continue;
      const original=ui[method],owner=this;
      const wrapped=function(...args){
        if(method==='open'||args[0]==='mail')owner.trash=false;
        return original.apply(this,args);
      };
      ui[method]=wrapped;
      this.restorers.push(()=>{if(ui[method]===wrapped)ui[method]=original;});
    }
  }
  displayed(){
    if(!this.installed||!this.raw)return this.documents.getMail();
    return this.store.visible(this.raw(),this.trash);
  }
  switchFolder(trash){
    this.trash=Boolean(trash);const ui=this.ui;
    ui.selectedId=null;ui.listPage=0;ui.bodyPage=0;ui.notice='';ui.viewToken++;
    this.documents.artworkUI.zoom=null;ui.render();
  }
  act(message){
    const ui=this.ui;
    if(this.dead||!ui.isOpen||ui.suspended||ui.app!=='mail')return;
    const before=this.displayed(),index=before.findIndex(item=>item.id===message.id);
    if(index<0)return;
    const changed=this.trash?this.store.restore(message.id):this.store.remove(message);
    if(!changed)return;
    const after=this.displayed();
    ui.selectedId=after[Math.min(Math.max(0,index),Math.max(0,after.length-1))]?.id||null;
    ui.bodyPage=0;ui.viewToken++;
    ui.notice=this.trash?'Message restored to Inbox.':'Message moved to Trash. Case progress has not been changed.';
    this.documents.artworkUI.zoom=null;ui.render();
  }
  destroy(){
    if(this.dead)return;this.dead=true;this.ui.scene.events.off('shutdown',this.onShutdown);
    for(const restore of this.restorers.reverse())restore();this.restorers=[];this.raw=null;
  }
}
