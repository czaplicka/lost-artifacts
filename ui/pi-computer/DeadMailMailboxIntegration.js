import { DeadMailAttachment } from './DeadMailAttachment.js';
import { DEAD_MAIL_MESSAGE, getDeadMailMessages, isDeadMailMessage, markDeadMailMessageRead } from '../../managers/DeadMailCorrespondence.js';
import { deadMailMailActionHeight, renderDeadMailMailActions } from '../../managers/DeadMailOfficeIntegration.js';

export function installDeadMailMailbox(ui){
 if(ui.deadMailMailbox)return ui.deadMailMailbox;
 const docs=ui.documents,attachment=new DeadMailAttachment(ui);ui.deadMailAttachment=attachment;
 let dead=false,bodyBounds=null;
 const originalMail=docs.getMail;
 const getMail=()=>{
  const items=originalMail.call(docs),own=getDeadMailMessages(),ids=new Set(own.map(m=>m.id));
  return [...own,...items.filter(m=>!ids.has(m.id))];
 };
 docs.getMail=getMail;
 const originalPaged=docs.renderPagedText;
 const paged=(content,x,y,w,h)=>{
  bodyBounds=null;
  if(!dead&&ui.app==='mail'&&ui.selectedId===DEAD_MAIL_MESSAGE&&isDeadMailMessage({id:ui.selectedId})){
   const reserve=deadMailMailActionHeight(w);
   bodyBounds={x,y:y+Math.max(0,h-reserve),w};
   return originalPaged.call(docs,content,x,y,w,Math.max(24,h-reserve-8));
  }
  return originalPaged.call(docs,content,x,y,w,h);
 };
 docs.renderPagedText=paged;
 const originalRender=docs.render;
 const render=(...args)=>{
  bodyBounds=null;
  const result=originalRender.apply(docs,args);
  if(!dead&&ui.app==='mail'&&ui.selectedId===DEAD_MAIL_MESSAGE&&isDeadMailMessage({id:ui.selectedId})){
   markDeadMailMessageRead(ui.selectedId);
   if(bodyBounds)renderDeadMailMailActions(ui,bodyBounds.x,bodyBounds.y,bodyBounds.w);
  }
  return result;
 };
 docs.render=render;
 const api={destroy(){
  if(dead)return;dead=true;bodyBounds=null;attachment.destroy();
  if(docs.getMail===getMail)docs.getMail=originalMail;
  if(docs.renderPagedText===paged)docs.renderPagedText=originalPaged;
  if(docs.render===render)docs.render=originalRender;
 }};
 ui.deadMailMailbox=api;return api;
}
