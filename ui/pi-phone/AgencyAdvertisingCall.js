import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import { advertisingContact, getAgencyName, normalizeAgencyName, registerAgencyName } from '../../managers/PIAgencyAdvertising.js';

export function closeAgencyAdvertisingCall(phone) {
  const call=phone.agencyAdvertisingCall;
  phone.agencyAdvertisingCall=null;
  call?.destroy();
}

function showRegistration(phone) {
  if(phone.destroyed||!phone.isOpen||typeof document==='undefined')return;
  closeAgencyAdvertisingCall(phone);
  const run=phone.run, campaignId=gameState._createdAt, previousFocus=document.activeElement;
  const knownName=getAgencyName();
  const root=document.createElement('div');
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Newspaper Advertising Desk');
  root.style.cssText='position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:#000c;padding:16px;box-sizing:border-box;';
  const form=document.createElement('form');
  form.style.cssText='box-sizing:border-box;max-width:100%;width:600px;max-height:90vh;overflow:auto;padding:26px;border:4px double #705037;background:#ecdfbe;color:#30251a;box-shadow:10px 12px 0 #0008;font:19px/1.5 SpecialElite,monospace;';
  root.appendChild(form);
  const add=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;form.appendChild(n);return n;};
  add('h2','ADVERTISING DESK // 207').style.cssText='font:14px/1.7 PressStart2P,monospace;';
  add('p','“We make small businesses look suspiciously successful.”');
  const label=add('label',knownName?'Your registered agency':'“What is your detective agency called?”');
  const input=document.createElement('input');
  input.type='text';input.name='agencyName';input.autocomplete='off';input.value=knownName;
  input.maxLength=64;input.required=true;input.readOnly=Boolean(knownName);
  input.style.cssText='box-sizing:border-box;display:block;width:100%;padding:12px;margin:8px 0;background:#fff8df;border:2px solid #82613a;color:#251c13;font:inherit;';
  label.appendChild(input);
  add('small','3-32 characters. This is your own PI agency, not Mark Agency.');
  add('p','“Let us put a name on your file. Something we can print without consulting our lawyer.”');
  const preview=add('p');
  preview.style.cssText='padding:16px;border:3px double #674b30;background:#f7edcf;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;';
  const refresh=()=>{preview.textContent=`ADVERTISEMENT DRAFT\n${normalizeAgencyName(input.value)||'YOUR AGENCY NAME'}\nDiscreet enquiries. Inconvenient answers.\nCall 205.`;};
  input.addEventListener('input',refresh);refresh();
  add('p','Advertising campaigns are not available for purchase yet. Registering your agency name is free. Existing case listings are unchanged.');
  const status=add('p');status.setAttribute('role','status');status.style.color='#842d20';
  const controls=add('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:12px;';
  const button=(text,type)=>{const b=document.createElement('button');b.textContent=text;b.type=type;b.style.cssText='padding:12px;border:2px solid #82613a;background:#e6ca86;color:#251c13;font:inherit;cursor:pointer;';controls.appendChild(b);return b;};
  const save=button(knownName?'NAME REGISTERED':'REGISTER AGENCY NAME','submit');save.disabled=Boolean(knownName);
  const cancel=button('HANG UP','button');
  let destroyed=false,submitted=false;
  const alive=()=>!destroyed&&!phone.destroyed&&phone.isOpen&&phone.run===run&&gameState._createdAt===campaignId&&phone.scene.sys.isActive();
  const finish=()=>{closeAgencyAdvertisingCall(phone);if(!phone.destroyed&&phone.isOpen)phone.finishCall('Advertising call ended.');};
  const destroy=()=>{
    if(destroyed)return;destroyed=true;root.remove();
    phone.scene.events.off('shutdown',onClose);phone.scene.events.off('destroy',onClose);
    EventBus.off('gameState:restored',onClose);
    if(previousFocus?.isConnected)previousFocus.focus();
  };
  const onClose=()=>closeAgencyAdvertisingCall(phone);
  phone.agencyAdvertisingCall={destroy};
  phone.scene.events.once('shutdown',onClose);phone.scene.events.once('destroy',onClose);
  EventBus.on('gameState:restored',onClose);
  cancel.addEventListener('click',finish);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(submitted||!alive())return;
    const result=registerAgencyName(input.value);status.textContent=result.message;
    if(result.ok){submitted=true;save.disabled=true;input.readOnly=true;cancel.textContent='DONE';cancel.focus();}
  });
  root.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();finish();return;}
    if(event.key==='Tab'){
      const nodes=[...form.querySelectorAll('input,button')].filter(n=>!n.disabled),first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  document.body.appendChild(root);(knownName?cancel:input).focus();
}

export function installAgencyAdvertisingPhone(phone) {
  if(phone.agencyAdvertisingInstalled)return;
  phone.agencyAdvertisingInstalled=true;
  const connect=phone.connect,next=phone.nextLine;
  phone.connect=function(contact,...args){
    if(contact?.id!==advertisingContact().id)return connect.call(this,contact,...args);
    this.cancelActivity();this.state='connected';this.contactName=contact.name;this.lines=[];this.lineIndex=0;
    this.callStart=this.scene.time.now;this.clearLog();this.status='Advertising desk connected.';this.render();
    showRegistration(this);
  };
  phone.nextLine=function(...args){if(!this.agencyAdvertisingCall)return next.apply(this,args);};
}
