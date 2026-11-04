import { supabase } from '../supabase-client.js';
import { hintManager } from './HintManager.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';

const PREFIX='lost-artefacts:holmes-pending-delivery:v2:';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function failure(reason,error=null) {return {success:false,available:false,reason,error};}
function bounded(operation,ms=12000) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Connection timed out.')),ms);})
  ]).finally(()=>clearTimeout(timer));
}
export class HolmesDailyHintService {
  constructor({client=supabase,hints=hintManager,state=gameState,save=saveGameState,
    storage=()=>globalThis.localStorage,uuid=()=>globalThis.crypto.randomUUID(),
    locks=()=>globalThis.navigator?.locks,emit=(...args)=>EventBus.emit(...args)}={}) {
    Object.assign(this,{client,hints,state,save,storage,uuid,locks,emit});
    this.inFlight=null;
  }
  scope() {
    const id=this.state._createdAt;
    if ((typeof id!=='string' && typeof id!=='number') || String(id).length===0) return null;
    return JSON.stringify(['campaign',String(id)]);
  }
  async account() {
    try {
      const {data,error}=await bounded(()=>this.client.auth.getUser());
      if (error) return failure(error.name==='AuthSessionMissingError' ? 'login_required' : 'connection_error',error);
      const user=data?.user;
      if (!user?.id) return failure('login_required');
      if (user.is_anonymous!==false) return failure('registered_account_required');
      return {success:true,userId:user.id};
    } catch(error) {return failure('connection_error',error);}
  }
  readPending(userId) {
    const storage=this.storage();
    if (!storage) throw new Error('Local delivery storage unavailable.');
    const raw=storage.getItem(PREFIX+userId);
    if (raw===null) return null;
    const record=JSON.parse(raw);
    if (record?.version!==2 || record.userId!==userId || !UUID.test(record.requestId)
      || typeof record.scope!=='string' || !record.scope) throw new Error('Invalid pending delivery.');
    return record;
  }
  writePending(record) {
    const storage=this.storage(),key=PREFIX+record.userId,text=JSON.stringify(record);
    storage.setItem(key,text);
    if (storage.getItem(key)!==text) throw new Error('Could not verify delivery journal.');
  }
  clearPending(record) {
    const current=this.readPending(record.userId);
    if (current?.requestId===record.requestId) this.storage().removeItem(PREFIX+record.userId);
  }
  async request(userId,args) {
    try {
      const {data,error}=await bounded(()=>this.client.rpc('holmes_daily_hint',{...args,p_expected_user_id:userId}));
      if (error) return failure(error.code==='PGRST202' ? 'migration_required' : 'connection_error',error);
      if (!data || typeof data!=='object' || Array.isArray(data)) return failure('invalid_response');
      if (data.ok!==true) return failure(data.reason || 'server_rejected');
      if (typeof data.delivery_allowed!=='boolean') return failure('migration_required');
      if (data.user_id!==userId || typeof data.available!=='boolean'
        || typeof data.delivery_allowed!=='boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(data.claim_day || '')) {
        return failure('invalid_response');
      }
      return {success:true,data};
    } catch(error) {return failure('connection_error',error);}
  }
  async getStatus() {
    const user=await this.account();
    if (!user.success) return user;
    const response=await this.request(user.userId,{p_claim:false});
    if (!response.success) return response;
    let pending;
    try {pending=this.readPending(user.userId);} catch(error) {return failure('storage_unavailable',error);}
    return {success:true,userId:user.userId,available:pending ? false : response.data.available,
      pendingDelivery:Boolean(pending),reason:pending ? 'pending_delivery' : response.data.available ? null : 'already_claimed',
      day:response.data.claim_day,nextResetAt:response.data.next_reset_at,timezone:'UTC'};
  }
  claim({expectedUserId=null}={}) {
    if (this.inFlight) return this.inFlight;
    this.inFlight=this.runLocked(expectedUserId).finally(()=>{this.inFlight=null;});
    return this.inFlight;
  }
  async runLocked(expectedUserId) {
    try {
      const locks=this.locks();
      return typeof locks?.request==='function'
        ? await locks.request('lost-artefacts:holmes-server-delivery',()=>this.performClaim(expectedUserId))
        : await this.performClaim(expectedUserId);
    } catch(error) {return failure('delivery_failed',error);}
  }
  async performClaim(expectedUserId) {
    const user=await this.account();
    if (!user.success) return user;
    if (expectedUserId && user.userId!==expectedUserId) return failure('account_changed');
    const scope=this.scope();
    if (!scope) return failure('no_active_save');
    let pending;
    try {
      pending=this.readPending(user.userId);
      if (pending && pending.scope!==scope) return failure('different_save');
      if (!pending) {
        if (this.save()!==true) return failure('save_failed');
        const requestId=this.uuid();
        if (!UUID.test(requestId)) return failure('delivery_failed');
        pending={version:2,userId:user.userId,requestId,scope};
        this.writePending(pending);
      }
    } catch(error) {return failure('storage_unavailable',error);}
    const response=await this.request(user.userId,{
      p_claim:true,p_request_id:pending.requestId,p_delivery_ref:pending.scope
    });
    if (!response.success) return response;
    if (!response.data.delivery_allowed) {
      try {this.clearPending(pending);} catch {}
      return {...failure('already_claimed'),nextResetAt:response.data.next_reset_at};
    }
    // Do not credit another account or a different campaign after an async request.
    const current=await this.account();
    if (!current.success || current.userId!==user.userId) return failure('account_changed');
    if (this.scope()!==scope) return failure('different_save');
    const grantId=`holmes_server_daily:${user.userId}:${response.data.claim_day}`;
    const already=this.hints.readState().bonusGrants.some(entry=>entry.id===grantId);
    if (already) {
      if (this.save()!==true) return failure('save_failed');
    } else {
      const before=this.state.hintState==null ? null : structuredClone(this.state.hintState);
      const result=this.hints.grantOnce(grantId,1,`Holmes daily free hint (${response.data.claim_day}, UTC)`);
      if (!result.success || result.saved!==true) {
        if (typeof this.state.updateState==='function') this.state.updateState({hintState:before});
        else this.state.hintState=before;
        this.emit('hints:changed',this.hints.buildSummary(this.hints.readState()));
        return failure('save_failed');
      }
    }
    let journalCleared=true;
    try {this.clearPending(pending);} catch {journalCleared=false;}
    return {success:true,granted:already ? 0 : 1,recovered:!response.data.new_claim,
      day:response.data.claim_day,nextResetAt:response.data.next_reset_at,journalCleared};
  }
}
export const holmesDailyHintService=new HolmesDailyHintService();
