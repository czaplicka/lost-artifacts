import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import {
 advertisingContact,getAgencyName,normalizeAgencyName,registerAgencyName,
 getAdvertisingQuote,buyAdvertisingCampaign,getActiveAdvertisingCampaign
} from '../../managers/PIAgencyAdvertising.js';

export function closeAgencyAdvertisingCall(phone){
 const call=phone.agencyAdvertisingCall;phone.agencyAdvertisingCall=null;call?.destroy();
}
function showAdvertisingDesk(phone){
 if(phone.destroyed||!phone.isOpen||typeof document==='undefined')return;
 closeAgencyAdvertisingCall(phone);
 const run=phone.run,campaignId=gameState._createdAt,previousFocus=document.activeElement;
 let destroyed=false,processing=false,notice='',input;
 const root=document.createElement('div');root.className='pi-advertising-desk';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Newspaper Advertising Desk');
 root.style.cssText='position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:#000c;padding:16px;box-sizing:border-box;';
 const style=document.createElement('style');
 style.textContent='.pi-advertising-desk *{box-sizing:border-box}.pi-advertising-desk button{padding:10px 14px;border:2px solid #82613a;background:#e6ca86;color:#251c13;font:inherit;cursor:pointer}.pi-advertising-desk button:disabled{opacity:.5;cursor:default}.pi-advertising-desk input{display:block;width:100%;padding:12px;margin:8px 0;background:#fff8df;border:2px solid #82613a;color:#251c13;font:inherit}.pi-advertising-desk button:focus-visible,.pi-advertising-desk input:focus-visible{outline:3px solid #6a3624;outline-offset:3px}';
 root.appendChild(style);
 const form=document.createElement('form');form.style.cssText='max-width:100%;width:650px;max-height:90vh;overflow:auto;padding:24px;border:4px double #705037;background:#ecdfbe;color:#30251a;box-shadow:10px 12px 0 #0008;font:18px/1.5 SpecialElite,monospace;';root.appendChild(form);
 const alive=()=>!destroyed&&!phone.destroyed&&phone.isOpen&&phone.run===run&&gameState._createdAt===campaignId&&phone.scene.sys.isActive();
 const add=(parent,tag,text='')=>{const n=document.createElement(tag);n.textContent=text;parent.appendChild(n);return n;};
 const button=(parent,label,action,disabled=false)=>{const n=add(parent,'button',label);n.type='button';n.disabled=disabled;n.addEventListener('click',()=>{if(alive()&&!processing&&!n.disabled)action();});return n;};
 const finish=()=>{closeAgencyAdvertisingCall(phone);if(!phone.destroyed&&phone.isOpen)phone.finishCall('Advertising call ended.');};
 function update(action){
  if(!alive()||processing)return;processing=true;
  try{const result=action();notice=result.message||'';}
  catch(error){console.error('[Advertising desk]',error);notice='The request could not be processed. Please try again.';}
  finally{processing=false;}
  if(alive())paint();
 }
 function paint(){
  form.replaceChildren();add(form,'h2','ADVERTISING DESK // 207').style.cssText='font:14px/1.7 PressStart2P,monospace;';
  add(form,'p','“We make small businesses look suspiciously successful.”');
  const name=getAgencyName();const label=add(form,'label',name?'Your registered detective agency':'“What is your detective agency called?”');
  input=add(label,'input');input.type='text';input.name='agencyName';input.autocomplete='off';input.value=name;input.maxLength=64;input.required=true;input.readOnly=Boolean(name);
  if(!name){add(form,'small','3-32 characters. Your PI agency, not Mark Agency. Naming it is free.');const save=add(form,'button','REGISTER AGENCY NAME');save.type='submit';}
  const active=getActiveAdvertisingCampaign();
  const preview=add(form,'p');preview.style.cssText='padding:16px;border:3px double #674b30;background:#f7edcf;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;';
  const refresh=()=>{preview.textContent=`${active?'PUBLISHED ADVERTISEMENT':'ADVERTISEMENT PREVIEW'}\n${normalizeAgencyName(input.value)||'YOUR AGENCY NAME'}\nDiscreet enquiries. Inconvenient answers.\nCall 205.`;};input.addEventListener('input',refresh);refresh();
  const quote=getAdvertisingQuote();add(form,'p',quote.message);
  if(active)add(form,'p',`Client emails delivered: ${(active.deliveredMailIds||[]).length} / ${(active.mailIds||[]).length}. Open your PI computer and check Mail.`);
  add(form,'p','The advertisement unlocks cases. Clients contact you through your normal PI mailbox. No client acceptance or rejection is handled by this desk.');
  add(form,'small','Personal cash only. No automatic renewal. Delivered emails and unlocked cases remain available after the campaign expires.');
  const controls=add(form,'div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;';
  button(controls,quote.ok?`PLACE AD — $${quote.price}`:active?'ADVERTISEMENT RUNNING':'NO NEW CAMPAIGN AVAILABLE',()=>update(()=>buyAdvertisingCampaign(input.value,quote)),!name||!quote.ok);
  button(controls,'REFRESH STATUS',()=>paint());button(controls,'HANG UP',finish);
  const status=add(form,'p',notice);status.setAttribute('role','status');status.style.color='#842d20';
 }
 form.addEventListener('submit',event=>{event.preventDefault();update(()=>registerAgencyName(input.value));});
 const destroy=()=>{
  if(destroyed)return;destroyed=true;root.remove();
  phone.scene.events.off('shutdown',onClose);phone.scene.events.off('destroy',onClose);EventBus.off('gameState:restored',onClose);
  if(previousFocus?.isConnected)previousFocus.focus();
 };
 const onClose=()=>closeAgencyAdvertisingCall(phone);phone.agencyAdvertisingCall={destroy};
 phone.scene.events.once('shutdown',onClose);phone.scene.events.once('destroy',onClose);EventBus.on('gameState:restored',onClose);
 root.addEventListener('keydown',event=>{
  event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish();return;}
  if(event.key==='Tab'){
   const nodes=[...form.querySelectorAll('input,button')].filter(n=>!n.disabled),first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 paint();document.body.appendChild(root);input.focus();
}
export function installAgencyAdvertisingPhone(phone){
 if(phone.agencyAdvertisingInstalled)return;phone.agencyAdvertisingInstalled=true;
 const connect=phone.connect,next=phone.nextLine;
 phone.connect=function(contact,...args){
  if(contact?.id!==advertisingContact().id)return connect.call(this,contact,...args);
  this.cancelActivity();this.state='connected';this.contactName=contact.name;this.lines=[];this.lineIndex=0;
  this.callStart=this.scene.time.now;this.clearLog();this.status='Advertising desk connected.';this.render();showAdvertisingDesk(this);
 };
 phone.nextLine=function(...args){if(!this.agencyAdvertisingCall)return next.apply(this,args);};
}
