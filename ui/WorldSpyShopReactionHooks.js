import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC=__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_1a34c8f172305020d364");
const RESPONSES={
 agency_convicted:__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_49f02bd5591a69eee86e"),
 agency_released:__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_890f770734f95b1b2884"),
 agency_suspect_arrested:__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_70bdc1497b40a1c9146a"),
 agency_pursuit_escape:__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_9de31f28ca1e1a98a7ca"),
 agency_time_expired:__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_843539c2680e4a39fdff")
};
const key=id=>JSON.stringify(['discreet_electronics_shopkeeper',id]);
function seenEntries(state){
 const seen=readWorldReactions(state).spyShopNpcSeen;
 if(seen===undefined)return[];
 if(!Array.isArray(seen))throw new Error('[WorldSpyShop] Invalid spyShopNpcSeen history; it was not overwritten.');
 return seen;
}
export function getSpyShopWorldReaction(state){
 const event=latestWorldNewspaperEvent(state,'hq');
 if(!event||event.visibility!=='public'||event.system!=='agency'||String(event.campaignId)!==String(state._createdAt)||
   !RESPONSES[event.kind]||seenEntries(state).includes(key(event.id)))return null;
 return{eventId:event.id,text:`${__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_8eaad1d5679904cf64c8")}${event.artifact||__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_4edfbd28d0483e702f24")}${__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_0f53fb3533eb343bc155")}${__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_0673d69ff78439adfb40")}${RESPONSES[event.kind]}`};
}
export function markSpyShopWorldReaction(state,eventId){
 const history=readWorldReactions(state);
 const event=history.events.find(item=>item.id===eventId&&item.visibility==='public'&&item.system==='agency'&&
  String(item.campaignId)===String(state._createdAt)&&RESPONSES[item.kind]);
 if(!event)return false;
 const seen=seenEntries(state),id=key(eventId);
 if(seen.includes(id))return false;
 state.worldReactionsV1={...history,spyShopNpcSeen:[...seen,id]};return true;
}
function reaction(){
 try{return getSpyShopWorldReaction(gameState);}
 catch(error){console.error('[WorldSpyShop] Reaction unavailable:',error);return null;}
}
const available=scene=>!scene.disposed&&!scene._cleanupDone&&!scene.navigating&&!scene.buying&&!scene.confirmation&&!scene.debugMode&&Boolean(scene.sys?.isActive?.());

export function installSpyShopWorldReactions(scene){
 if(scene?.sys?.settings?.key!=='SpyShopScene'||typeof scene.openConversation!=='function'||typeof scene.closePanel!=='function')return null;
 if(installed.has(scene))return installed.get(scene);
 const originalConversation=scene.openConversation,originalClose=scene.closePanel;
 const conversationPanels=new WeakSet();
 let dead=false,reader=null;
 const disposeReader=()=>{
  if(!reader)return;
  scene.scale.off('resize',reader.draw);reader=null;
 };
 const validReader=state=>!dead&&reader===state&&available(scene)&&scene.runToken===state.token&&
  scene.panel===state.panel&&scene.panelType==='world-news'&&scene.panelBody;
 function openNews(token,panel){
  if(dead||!available(scene)||scene.runToken!==token||scene.panel!==panel||scene.panelType!=='conversation')return;
  const selected=reaction();if(!selected)return;
  scene.closePanel();
  if(scene.panel||!scene.openPanel(__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_fd95ed490d2e950165fa"),'world-news'))return;
  const state={token,panel:scene.panel,reaction:selected,page:0,pageCount:1,draw:null};
  reader=state;
  const back=()=>{
   if(!validReader(state))return;
   if(state.page===state.pageCount-1){
    try{if(markSpyShopWorldReaction(gameState,selected.eventId)&&gameState.caseFailed!==true)requestAutosave();}
    catch(error){console.error('[WorldSpyShop] Could not record reaction:',error);}
   }
   scene.closePanel();
   if(!scene.panel)scene.openConversation();
  };
  state.draw=()=>{
   if(!validReader(state))return;
   const body=scene.panelBody,{width:w,height:h}=scene.scale;
   body.removeAll(true);
   const font=Math.max(14,Math.min(25,Math.round(w/55)));
   const label=scene.add.text(w*0.11,h*0.25,'',{
    ...scene.style(font),wordWrap:{width:Math.max(80,w*0.73-24)},lineSpacing:4
   });body.add(label);
   const lines=label.getWrappedText(selected.text);
   const lineHeight=Math.max(font,label.getTextMetrics?.().fontSize||font)+4;
   const per=Math.max(1,Math.floor(Math.max(24,h*0.40-18)/lineHeight));
   const pages=[];for(let i=0;i<Math.max(1,lines.length);i+=per)pages.push(lines.slice(i,i+per).join('\n'));
   state.pageCount=pages.length;state.page=Math.min(state.page,state.pageCount-1);
   label.setText(pages[state.page]);
   const turn=direction=>{
    if(!validReader(state))return;
    state.page=Math.max(0,Math.min(state.pageCount-1,state.page+direction));state.draw();
   };
   const size=Math.max(14,Math.min(22,font));
   if(state.pageCount>1){
    scene.makeButton(body,w*0.11,h*0.71,'<',()=>turn(-1),size);
    scene.makeButton(body,w*0.24,h*0.71,'>',()=>turn(1),size);
    body.add(scene.add.text(w*0.36,h*0.71,`${state.page+1}${__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_8a5edab282632443219e")}${state.pageCount}`,scene.style(size)));
   }
   scene.makeButton(body,w*0.11,h*0.81,__dialogueText("ui/WorldSpyShopReactionHooks.js", "t_74ad9c3261b448d4112b"),back,size);
  };
  scene.scale.on('resize',state.draw);state.draw();
 }
 const wrappedConversation=function(...args){
  const result=originalConversation.apply(this,args);
  if(dead||!available(this)||this.panelType!=='conversation'||!this.panel||!this.panelBody||conversationPanels.has(this.panel)||!reaction())return result;
  const panel=this.panel,token=this.runToken,{width:w,height:h}=this.scale;
  const y=h*(0.48+(SPY_SHOP_CONFIG.dialogue||[]).length*0.075);
  if(y>h*0.84){console.warn('[WorldSpyShop] No free row for the news topic.');return result;}
  this.makeButton(this.panelBody,w*0.11,y,TOPIC,()=>openNews(token,panel),25);
  conversationPanels.add(panel);
  return result;
 };
 const wrappedClose=function(...args){
  const oldPanel=this.panel;
  const result=originalClose.apply(this,args);
  if(reader&&oldPanel===reader.panel&&this.panel!==oldPanel)disposeReader();
  return result;
 };
 scene.openConversation=wrappedConversation;scene.closePanel=wrappedClose;
 const destroy=()=>{
  if(dead)return;dead=true;disposeReader();
  if(scene.openConversation===wrappedConversation)scene.openConversation=originalConversation;
  if(scene.closePanel===wrappedClose)scene.closePanel=originalClose;
  scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);installed.delete(scene);
 };
 const api={destroy};installed.set(scene,api);
 scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
 return api;
}
