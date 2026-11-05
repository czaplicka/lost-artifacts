import { gameState } from '../GameData.js';
import { notebookContact } from './pi-computer/NotebookContactActions.js';
export async function useCloudKeyword(ui,definition,keyword){
 if(ui.destroyed||!ui.isOpen||ui.suspended||ui.booting)return;
 if(!(gameState.piKeywordSearch?.cases?.[definition.id]?.known||[]).includes(keyword.id))return;
 const length=Number(ui.scene.cache.json.get('piPhoneDirectory')?.numberLength)||3;
 const contact=notebookContact(keyword,length);
 if(!contact){
  if(ui.app!=='search')ui.openApp('search');
  if(ui.search.definition?.id!==definition.id)ui.search.selectCase(definition.id);
  ui.search.selectKeyword(keyword.id);return;
 }
 if(contact.kind==='email'){
  const mail=ui.photoQuest?.contactMail;if(!mail)return;
  if(ui.app==='mail'&&mail.composing){ui.search.selectCase(definition.id);ui.search.selectKeyword(keyword.id);return;}
  ui.openApp('mail');ui.search.selectCase(definition.id);
  const opening=mail.openComposer(),token=ui.viewToken;await opening;
  if(ui.destroyed||!ui.isOpen||ui.suspended||ui.app!=='mail'||!mail.composing||ui.viewToken!==token)return;
  ui.search.selectKeyword(keyword.id);return;
 }
 const scene=ui.scene,phone=scene.phoneUI;
 if(!phone||phone.destroyed||typeof scene.openPhone!=='function'){ui.notice='The office phone is unavailable.';ui.render();return;}
 if(scene.navigating||scene.disposed||scene.debugMode)return;
 ui.close();scene.openPhone();
 if(!phone.isOpen||phone.destroyed)return;
 const run=phone.run;await phone.investigation?.load();
 if(phone.destroyed||!phone.isOpen||phone.run!==run||phone.state!=='on_hook')return;
 const target=phone.contacts.find(item=>String(item.number)===contact.value)||{number:contact.value,name:keyword.contactName||keyword.label};
 phone.pickContact(target);phone.pickUp();if(phone.state!=='ready')return;
 phone.number=contact.value;phone.startCall();
}
