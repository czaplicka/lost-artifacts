import { gameState } from '../GameData.js';
import { requestAutosave,getPersistenceStatus } from '../gameStatePersistence.js';
import { moneyManager,MONEY_SOURCE } from './MoneyManager.js';
import { PI_ADVERTISING_CAMPAIGN as CONFIG } from '../config/piAdvertisingCampaign.js';
import { PI_ADVERTISING_CASES } from '../content/pi-advertising/cases.js';

export const PI_ADVERTISING_NUMBER=CONFIG.phoneNumber;
let writing=false;
const copy=value=>JSON.parse(JSON.stringify(value));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const safeId=id=>typeof id==='string'&&/^pi_ad_client_[a-z0-9_-]+$/.test(id);
const canWrite=()=>{const s=getPersistenceStatus();return !s.busy&&!s.automaticSaveBlocked&&!s.rollbackUnsafe;};
function readState(){
 const raw=gameState.piAdvertising;
 if(raw?.version===2)return raw;
 const next={version:2,campaigns:[],unlockedCaseIds:[],mails:[]};
 if(raw?.version!==1)return next;
 // Preserve paid legacy requests as emails; never ask the player to accept them by phone.
 const requests=raw.requests&&typeof raw.requests==='object'?raw.requests:{};
 for(const old of Array.isArray(raw.campaigns)?raw.campaigns:[]){
  const ids=(Array.isArray(old.requestIds)?old.requestIds:[]).filter(id=>safeId(id)&&own(requests,id));
  const mailIds=[];
  for(const id of ids){
   if(next.unlockedCaseIds.includes(id))continue;
   const r=requests[id],mailId='pi_ad_mail_'+id;
   next.unlockedCaseIds.push(id);mailIds.push(mailId);
   next.mails.push({id:mailId,from:'Prospective client',subject:r.title||'Private enquiry',
    body:[r.summary,r.briefing].filter(Boolean).join('\n\n'),date:'New',advertisingCaseId:id,
    advertisingCampaignId:old.id,queuedAt:old.createdAt||r.createdAt||null,deliveredAt:null});
  }
  next.campaigns.push({...old,mailIds,deliveredMailIds:[],status:mailIds.length?'active':'expired',expiredAt:mailIds.length?null:old.expiredAt});
 }
 return next;
}
function commit(next){gameState.piAdvertising=next;requestAutosave();}
function campaigns(s=readState()){return Array.isArray(s.campaigns)?s.campaigns:[];}
function mails(s=readState()){return Array.isArray(s.mails)?s.mails:[];}
export function advertisingContact(){return {id:'newspaper_advertising',number:PI_ADVERTISING_NUMBER,name:'Newspaper Advertising Desk',listed:true,status:'available',dialogueId:null};}
export function normalizeAgencyName(value){return String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/\s+/g,' ').trim();}
export function getAgencyName(){return typeof gameState.piAgencyProfile?.name==='string'?gameState.piAgencyProfile.name:'';}
function validateName(value){
 const name=normalizeAgencyName(value);
 if([...name].length<3||[...name].length>32)return {ok:false,message:'Please use 3-32 characters for your agency name.'};
 if(getAgencyName()&&getAgencyName()!==name)return {ok:false,message:'Your agency name is already registered.'};
 return {ok:true,name};
}
export function registerAgencyName(value){
 if(writing||!canWrite())return {ok:false,message:'Saving is paused. Resolve the save warning first.'};
 const valid=validateName(value);if(!valid.ok)return valid;
 gameState.piAgencyProfile={...gameState.piAgencyProfile,version:1,name:valid.name,registeredAt:gameState.piAgencyProfile?.registeredAt||new Date().toISOString()};
 requestAutosave();return {...valid,message:'Agency name registered. No money has been charged.'};
}
function catalog(){
 const counts=new Map(),mailCounts=new Map();
 for(const c of PI_ADVERTISING_CASES){counts.set(c?.caseId,(counts.get(c?.caseId)||0)+1);mailCounts.set(c?.mail?.id,(mailCounts.get(c?.mail?.id)||0)+1);}
 return PI_ADVERTISING_CASES.filter(c=>c?.enabled===true&&safeId(c.caseId)&&counts.get(c.caseId)===1&&
  typeof c.mail?.id==='string'&&/^pi_ad_mail_[a-z0-9_-]+$/.test(c.mail.id)&&mailCounts.get(c.mail.id)===1&&
  ['from','subject','body'].every(k=>typeof c.mail[k]==='string'&&c.mail[k].trim())&&
  !own(gameState.piQuests?.quests,c.caseId));
}
export function isAdvertisingCaseUnlocked(caseId){return (readState().unlockedCaseIds||[]).includes(caseId);}
export function getActiveAdvertisingCampaign(){const c=campaigns().find(c=>c.status==='active');return c?copy(c):null;}
export function getAdvertisingMail(){return copy(mails());}
export function getAdvertisingQuote(){
 if(getActiveAdvertisingCampaign())return {ok:false,reason:'active',message:'Your advertisement is running. The campaign ends after its client emails have been delivered.'};
 if(!canWrite())return {ok:false,reason:'save_paused',message:'Saving is paused. No payment can be taken.'};
 const s=readState(),known=new Set(s.unlockedCaseIds||[]),knownMail=new Set(mails(s).map(m=>m.id));
 const entries=catalog().filter(c=>!known.has(c.caseId)&&!knownMail.has(c.mail.id)).slice(0,CONFIG.clientSlots);
 if(!entries.length)return {ok:false,reason:'no_new_cases',message:'No new advertising cases are available yet. Existing classified jobs are separate. No money will be charged.'};
 const price=Math.ceil(CONFIG.price*entries.length/CONFIG.clientSlots);
 const signature=JSON.stringify([getAgencyName(),price,entries]);
 return {ok:true,price,count:entries.length,signature,message:`$${price} to unlock ${entries.length} new case${entries.length===1?'':'s'}. Clients will contact you by email. No automatic renewal.`};
}
export function buyAdvertisingCampaign(value,approved){
 if(writing)return {ok:false,message:'Your booking is already being processed.'};
 const valid=validateName(value);if(!valid.ok)return valid;
 if(!getAgencyName())return {ok:false,message:'Register your agency name first.'};
 const quote=getAdvertisingQuote();if(!quote.ok)return quote;
 if(approved?.signature!==quote.signature||approved?.price!==quote.price)return {ok:false,message:'The offer has changed. Review its current price before confirming.'};
 moneyManager.ensureState();
 if(moneyManager.getBalance(MONEY_SOURCE.CASH)<quote.price)return {ok:false,message:`You need $${quote.price} in personal cash. Mark Agency funds cannot be used.`};
 const s=readState(),known=new Set(s.unlockedCaseIds||[]),knownMail=new Set(mails(s).map(m=>m.id));
 const entries=catalog().filter(c=>!known.has(c.caseId)&&!knownMail.has(c.mail.id)).slice(0,CONFIG.clientSlots);
 const id=`pi-ad-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,now=new Date().toISOString();
 const campaign={id,agencyName:valid.name,price:quote.price,status:'active',createdAt:now,expiredAt:null,
  caseIds:entries.map(c=>c.caseId),mailIds:entries.map(c=>c.mail.id),deliveredMailIds:[]};
 const queued=entries.map(c=>({id:c.mail.id,from:c.mail.from,subject:c.mail.subject,body:c.mail.body,date:'New',
  advertisingCaseId:c.caseId,advertisingCampaignId:id,queuedAt:now,deliveredAt:null}));
 const old=gameState.piAdvertising,cash=gameState.cash,log=copy(gameState.moneyLog);
 writing=true;
 try{
  gameState.piAdvertising={...s,version:2,campaigns:[...campaigns(s),campaign],unlockedCaseIds:[...new Set([...known,...campaign.caseIds])],mails:[...mails(s),...queued]};
  const payment=moneyManager.spend(quote.price,{source:MONEY_SOURCE.CASH,category:'pi_advertising',missionId:null,
   description:`Newspaper campaign: ${valid.name}`,metadata:{campaignId:id,caseIds:campaign.caseIds,mailIds:campaign.mailIds}});
  if(!payment.ok){gameState.piAdvertising=old;return {ok:false,message:'No advertisement was booked. Insufficient personal cash.'};}
  const current=readState();
  commit({...current,campaigns:campaigns(current).map(c=>c.id===id?{...c,transactionId:payment.transaction.id}:c)});
  return {ok:true,message:`Advertisement booked. ${entries.length} new case${entries.length===1?'':'s'} unlocked. Check your PI email for the clients' messages.`};
 }catch(error){
  gameState.piAdvertising=old;gameState.cash=cash;gameState.moneyLog=log;requestAutosave();
  console.error('[PI advertising] Rolled back:',error);
  return {ok:false,message:'Booking failed. Payment, unlocks and queued emails were cancelled.'};
 }finally{writing=false;}
}
// Called ONLY after PIMailDelivery has actually passed the messages through its delay filter.
export function acknowledgeAdvertisingMailDelivery(visibleMessages){
 if(writing||!canWrite()||!Array.isArray(visibleMessages))return false;
 const s=readState(),visible=new Set(visibleMessages.map(m=>m?.id)),now=new Date().toISOString();
 let changed=gameState.piAdvertising?.version===1;
 const nextMails=mails(s).map(m=>{
  if(m.deliveredAt||!visible.has(m.id))return m;
  changed=true;return {...m,deliveredAt:now};
 });
 const delivered=new Set(nextMails.filter(m=>m.deliveredAt).map(m=>m.id));
 const nextCampaigns=campaigns(s).map(c=>{
  if(c.status!=='active')return c;
  const deliveredMailIds=(c.mailIds||[]).filter(id=>delivered.has(id));
  if(deliveredMailIds.length===(c.deliveredMailIds||[]).length&&deliveredMailIds.length!==(c.mailIds||[]).length)return c;
  const complete=(c.mailIds||[]).length>0&&c.mailIds.every(id=>delivered.has(id));
  if(JSON.stringify(deliveredMailIds)===JSON.stringify(c.deliveredMailIds||[])&&!complete)return c;
  changed=true;return {...c,deliveredMailIds,status:complete?'expired':'active',expiredAt:complete?now:null};
 });
 if(changed)commit({...s,mails:nextMails,campaigns:nextCampaigns});
 return changed;
}
export function advertisingNewspaperNotice(){
 const c=getActiveAdvertisingCampaign();
 return c?{head:'PRIVATE INVESTIGATOR',text:`${c.agencyName}. Discreet enquiries. Inconvenient answers. Call ${CONFIG.officePhoneNumber}.`}:
  {head:'ADVERTISE HERE',text:`Running a detective agency? Stop investigating why nobody calls. For advertising enquiries, call ${PI_ADVERTISING_NUMBER}.`};
}
