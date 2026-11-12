import { gameState } from '../GameData.js';
import { worldPIRecordMessages } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();

export function installPIWorldReactionMail(ui){
  if(!ui||ui.destroyed||typeof ui.documents?.getMail!=='function')return null;
  if(installed.has(ui))return installed.get(ui);
  const documents=ui.documents;
  const mailbox=documents.mailbox;
  if(mailbox&&(!mailbox.installed||typeof mailbox.raw!=='function'))return null;
  // Inject before folder filtering, so Archive and Trash work normally.
  const target=mailbox||documents;
  const method=mailbox?'raw':'getMail';
  const original=target[method];
  let dead=false;
  const wrapped=function(...args){
    const messages=original.apply(this,args);
    if(dead||ui.destroyed)return messages;
    const extra=worldPIRecordMessages(gameState);
    const ids=new Set(extra.map(message=>message.id));
    return [...extra,...(Array.isArray(messages)?messages:[]).filter(message=>!ids.has(message.id))];
  };
  target[method]=wrapped;
  const originalDestroy=ui.destroy;
  const wrappedDestroy=function(...args){destroy();return originalDestroy.apply(this,args);};
  if(typeof originalDestroy==='function')ui.destroy=wrappedDestroy;
  function destroy(){
    if(dead)return;dead=true;
    if(target[method]===wrapped)target[method]=original;
    if(ui.destroy===wrappedDestroy)ui.destroy=originalDestroy;
    ui.scene.events.off('shutdown',destroy);
    installed.delete(ui);
  }
  const api={destroy};installed.set(ui,api);
  ui.scene.events.once('shutdown',destroy);
  return api;
}
