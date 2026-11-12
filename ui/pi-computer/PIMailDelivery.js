import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

export const MAIL_REPLY_DELAY_MS = 10000;
const KEY = 'piMailDeliveryV1';
const NATIVE_ARTHUR_IDS = new Set([
  'alibi_arthur_reply', 'alibi_forward_nora', 'alibi_forward_simon',
  'alibi_forward_evelyn', 'alibi_arthur_attachment'
]);
const RECEIPT_IDS = new Set(['alibi_copper_receipt', 'alibi_copper_permission_needed']);

export function isIncomingMessage(message) {
  if (!message?.id) return false;
  return !/^You(?:\s|$|\s*→)/i.test(message.from || '') &&
    !/^(?:Unsent|Draft|Sent)(?:\b|:)/i.test(message.date || '') &&
    !/^(?:Draft|Sent):/i.test(message.subject || '') &&
    message.id !== 'alibi_box17_draft' && message.id !== 'alibi_box17_sent';
}
function readState() {
  const value = gameState[KEY];
  return value?.version === 1 && Array.isArray(value.records)
    ? value : { version: 1, initialized: false, records: [] };
}
function saveState(value) { gameState[KEY] = value; requestAutosave(); }
function syncArthurDeadline() {
  const value = gameState.piBorrowedAlibi;
  if (!value?.sent || value.replyReceived !== false) return;
  const sentAt = Date.parse(value.sentAt);
  if (!Number.isFinite(sentAt)) return;
  const dueAt = sentAt + MAIL_REPLY_DELAY_MS;
  if (value.replyDueAt === dueAt) return;
  gameState.piBorrowedAlibi = { ...value, replyDueAt: dueAt };
  requestAutosave();
}
function receiptDeadline(message) {
  return RECEIPT_IDS.has(message.id) && Number.isFinite(message.mailDeliveryDueAt)
    ? message.mailDeliveryDueAt : null;
}

export class PIMailDelivery {
  constructor(ui) {
    this.ui=ui; this.dead=false; this.depth=0; this.bootstrapping=true;
    this.documents=ui.documents;
    this.source=this.documents.getMail;
    this.wrapper=this.makeWrapper(this.source);
    this.getter=()=>this.wrapper;
    this.setter=source=>{
      if(source===this.wrapper)return;
      if(typeof source!=='function')throw new TypeError('[PIMailDelivery] getMail must be a function.');
      this.source=source;this.wrapper=this.makeWrapper(source);
    };
    Object.defineProperty(this.documents,'getMail',{
      configurable:true,enumerable:true,get:this.getter,set:this.setter
    });
    this.onShutdown=()=>this.destroy();
    ui.scene.events.once('shutdown',this.onShutdown);
    queueMicrotask(()=>queueMicrotask(()=>{
      if(this.dead||ui.destroyed)return;
      this.documents.getMail();this.bootstrapping=false;
    }));
  }
  makeWrapper(source) {
    const owner=this;
    return function(...args){
      if(owner.dead)return source.apply(this,args);
      const outermost=owner.depth===0;
      if(outermost)syncArthurDeadline();
      owner.depth++;
      let items;
      try{items=source.apply(this,args);}finally{owner.depth--;}
      return outermost?owner.filter(items):items;
    };
  }
  filter(items) {
    if(!Array.isArray(items))return items;
    const now=Date.now(),state=readState();
    const records=new Map(state.records.map(record=>[record.id,record]));
    const legacy=gameState.piComputerMailNotifications||{};
    const alreadySeen=new Set([...(legacy.known||[]),...(legacy.read||[]),...(legacy.announced||[])]);
    let changed=false;
    for(const message of items){
      if(!isIncomingMessage(message))continue;
      const due=receiptDeadline(message);
      if(records.has(message.id)){
        if(due!==null&&records.get(message.id).dueAt!==due){
          records.set(message.id,{id:message.id,dueAt:due});changed=true;
        }
        continue;
      }
      const delivered=(!state.initialized&&this.bootstrapping)||alreadySeen.has(message.id)||NATIVE_ARTHUR_IDS.has(message.id);
      records.set(message.id,{id:message.id,dueAt:due??(delivered?now:now+MAIL_REPLY_DELAY_MS)});
      changed=true;
    }
    if(!state.initialized&&!this.bootstrapping)changed=true;
    if(changed)saveState({version:1,initialized:state.initialized||!this.bootstrapping,records:[...records.values()]});
    return items.filter(message=>{
      if(!isIncomingMessage(message)||NATIVE_ARTHUR_IDS.has(message.id))return true;
      return(records.get(message.id)?.dueAt??Infinity)<=now;
    });
  }
  destroy() {
    if(this.dead)return;
    this.dead=true;
    this.ui.scene.events.off('shutdown',this.onShutdown);
    const descriptor=Object.getOwnPropertyDescriptor(this.documents,'getMail');
    if(descriptor?.get===this.getter){
      delete this.documents.getMail;
      Object.defineProperty(this.documents,'getMail',{
        configurable:true,enumerable:true,writable:true,value:this.source
      });
    }
  }
}
