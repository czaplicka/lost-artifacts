import { getAdvertisingMail } from '../../managers/PIAgencyAdvertising.js';
const INSTALLED=Symbol.for('lost-artifacts.advertising-mail');
export function installAdvertisingMail(ui,documents){
 if(documents[INSTALLED])return documents[INSTALLED];
 const previous=documents.getMail;
 let dead=false;
 const wrapper=function(...args){
  const existing=previous.apply(this,args);
  if(dead)return existing;
  const base=Array.isArray(existing)?existing:[];
  const ids=new Set(base.map(m=>m?.id));
  return [...getAdvertisingMail().filter(m=>!ids.has(m.id)),...base];
 };
 documents.getMail=wrapper;
 const destroy=()=>{
  if(dead)return;dead=true;
  if(documents.getMail===wrapper)documents.getMail=previous;
  ui.scene.events.off('shutdown',destroy);ui.scene.events.off('destroy',destroy);
 };
 const api={destroy};documents[INSTALLED]=api;
 ui.scene.events.once('shutdown',destroy);ui.scene.events.once('destroy',destroy);
 return api;
}
