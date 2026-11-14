import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import './AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { discoverSearchKeywords } from './ComputerSearchCore.js';
import { ALIBI_CONTACTS, contactFor, saveAlibiContact } from './AlibiContactBook.js';
import { getQuestHintOffer, purchaseQuestHint } from './QuestHintPurchase.js';
import { renderSocialPage } from './SocialProfileTemplate.js';
import { bindKeywordStyle, keywordSurface, refreshKeywordStyles } from './KeywordStyle.js';

const QUEST='pi_stolen_alibi';
const SEARCH='borrowed_alibi';
const INSTALLATION=Symbol.for(__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_1a8455ae476cba22cbbb"));
const emailKeyword=keyword=>/[^\s@]+@[^\s@]+\.[^\s@]+/.test(String(keyword?.email||keyword?.label||''));

export function installAlibiImprovements(ui,documents){
  if(ui[INSTALLATION])return ui[INSTALLATION];
  let dead=false,hint=null,queued=false,buyingHint=false,pendingReveal=null;
  const restorers=[],installedSearches=new WeakSet();
  const wrap=(target,method,factory)=>{
    if(typeof target?.[method]!=='function')return false;
    const original=target[method],wrapped=factory(original.bind(target));target[method]=wrapped;
    restorers.push(()=>{if(target[method]===wrapped)target[method]=original;});return true;
  };
  const alive=()=>!dead&&!ui.destroyed;
  const refresh=()=>{
    if(queued||!alive())return;queued=true;
    queueMicrotask(()=>{
      queued=false;
      if(!alive()||!ui.isOpen||ui.suspended||ui.booting)return;
      const focus=pendingReveal;pendingReveal=null;
      if(focus&&ui.caseCloudNotebook?.revealKeyword?.(focus.caseId,focus.keywordId))return;
      ui.render();
    });
  };
  const revealEmail=(caseId,keywordId)=>{pendingReveal={caseId,keywordId};refresh();};
  const addContact=(contact,kind)=>{
    if(!alive())return false;
    if(!saveAlibiContact(contact,kind)){ui.notice=__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_83b9af966e742ab07c7f");refresh();return false;}
    const keywordId=kind==='email'?contact.keyword.replace('_phone','_email'):contact.keyword;
    if(!discoverSearchKeywords(SEARCH,[keywordId])){
      ui.notice=__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_56a259b17bf23a981cb5");refresh();return false;
    }
    hint=null;ui.notice='';refreshKeywordStyles(ui.scene);
    if(kind==='email')revealEmail(SEARCH,keywordId);else refresh();
    return true;
  };
  function restoreSavedEmails(search){
    const definition=search.data?.cases?.find(item=>item.id===SEARCH);
    if(!definition)return;
    const known=new Set(gameState.piKeywordSearch?.cases?.[SEARCH]?.known||[]);
    const entries=Array.isArray(gameState.piSavedContacts?.entries)?gameState.piSavedContacts.entries:[];
    const missing=[];
    for(const entry of entries){
      if(entry.kind!=='email'||!entry.email)continue;
      const contact=ALIBI_CONTACTS.find(item=>item.email&&item.email.toLowerCase()===String(entry.email).toLowerCase());
      if(!contact)continue;
      const id=contact.keyword.replace('_phone','_email');
      if(known.has(id)||!definition.keywords.some(item=>item.id===id))continue;
      known.add(id);missing.push(id);
    }
    if(missing.length&&discoverSearchKeywords(SEARCH,missing))revealEmail(SEARCH,missing[missing.length-1]);
  }
  const openHints=()=>{
    if(!alive()||buyingHint)return;
    const offer=getQuestHintOffer(QUEST);
    if(!offer){ui.notice=__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_b637d98500350321a6cf");hint=null;refresh();return;}
    hint={app:ui.app,mode:'choose',offer,message:''};refresh();
  };
  const buyHint=method=>{
    if(!alive()||buyingHint||hint?.mode!=='choose')return;buyingHint=true;
    try{
      const result=purchaseQuestHint(QUEST,method,hint.offer,ui.scene.sys.settings.key);
      if(!result.success){hint.message=result.message;if(result.stale)hint.offer=getQuestHintOffer(QUEST);refresh();return;}
      hint={app:ui.app,mode:'read',receipt:result.receipt,message:result.saved?'':__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_a98fb6b0cc3aad6dbc17")};refresh();
    }catch(error){
      console.error('[AlibiImprovements] Hint purchase failed:',error);
      if(hint)hint.message=__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_5d2ae154dda34b5dc8c8");
      refresh();
    }finally{buyingHint=false;}
  };
  wrap(ui.drawing,'text',original=>(x,y,value,...args)=>{
    const object=original(x,y,value,...args);
    if(!alive()||!gameState.piQuests?.quests?.[QUEST])return object;
    const raw=String(value).trim();
    const contact=contactFor(raw)||ALIBI_CONTACTS.find(item=>raw===`${item.number} — ${item.name}`);
    if(!contact)return object;
    const kind=raw===contact.email?'email':'phone';
    const keywordId=kind==='email'?contact.keyword.replace('_phone','_email'):contact.keyword;
    bindKeywordStyle(ui.scene,object,{
      isKnown:()=>Boolean(gameState.piKeywordSearch?.cases?.[SEARCH]?.known?.includes(keywordId)),
      surface:()=>keywordSurface(ui,object)
    });
    object.setName(`${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_8d89e4a829ae847dcda9")}${contact.name}${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_ff7948b7392a6878d4f7")}${kind==='email'?'email':'number'}`);
    object.setInteractive({useHandCursor:true}).on('pointerdown',()=>addContact(contact,kind));
    return object;
  });
  wrap(documents,'getMail',original=>(...args)=>original(...args).map(message=>{
    if(dead||!message.id?.startsWith('alibi_'))return message;
    const state=gameState.piBorrowedAlibi||{};
    const advert=documents.getClassifieds().find(item=>item.missionId===QUEST);
    const originalAdvert=advert?.description||__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_1d38316fafd6d0151603");
    if(message.id==='alibi_box17_sent')return{...message,threadId:QUEST,body:message.body+__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_2367b2b3f56da7aca1a9")+originalAdvert};
    if(message.id==='alibi_arthur_reply')return{...message,threadId:QUEST,inReplyTo:'alibi_box17_sent',body:message.body+__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_855e857f109747ebe31e")+(state.sentBody||__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_7a9261978ca6c5260811"))+__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_2367b2b3f56da7aca1a9")+originalAdvert};
    return message;
  }));
  function installSearch(){
    const search=ui.search;
    if(!alive()||!search)return;
    restoreSavedEmails(search);
    if(installedSearches.has(search))return;
    const installed=wrap(search,'render',original=>(...args)=>{
      if(!alive())return original(...args);
      const page=search.view==='page'?search.definition?.pages.find(item=>item.id===search.pageId):null;
      return page?.socialProfile?renderSocialPage(ui,search,page):original(...args);
    });
    if(installed){
      installedSearches.add(search);
      wrap(search,'collect',original=>(id,...args)=>{
        const definition=search.definition,keyword=definition?.keywords?.find(item=>item.id===id);
        const result=original(id,...args);
        if(alive()&&keyword&&emailKeyword(keyword)&&gameState.piKeywordSearch?.cases?.[definition.id]?.known?.includes(id))revealEmail(definition.id,id);
        return result;
      });
    }
  }
  function panel(){
    const bounds=ui.window;if(!bounds)return null;const drawing=ui.drawing;
    drawing.rectangle(bounds.x+9,bounds.y+48,bounds.w-18,bounds.h-95,0x171e19,0.92).setInteractive();
    const width=Math.max(120,Math.min(730,bounds.w-48)),height=Math.max(120,Math.min(470,bounds.h-110));
    const x=bounds.x+(bounds.w-width)/2,y=bounds.y+48+Math.max(0,(bounds.h-95-height)/2);
    drawing.rectangle(x,y,width,height,0xeee1b7).setInteractive();return{d:drawing,x,y,width,height};
  }
  function fitBody(drawing,x,y,value,width,maxHeight,size=17){
    const label=drawing.text(x,y,value,size,'#344b3a',width);
    while(label.height>maxHeight&&size>12){size--;label.setFontSize(size);}return label;
  }
  function renderOverlay(){
    if(!alive()||!ui.isOpen||ui.suspended||ui.booting||!ui.window)return;
    if(hint&&hint.app!==ui.app)hint=null;if(!hint)return;
    const box=panel();if(!box)return;const{d,x,y,width,height}=box;
    d.text(x+22,y+18,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_dfbbedeca8c56f461882"),21,'#344b3a',width-44);
    if(hint.mode==='read'){
      const receipt=hint.receipt;
      fitBody(d,x+22,y+65,[`${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_2e45f90106c67c1a90d1")}${receipt.level+1}${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_8d2cedfe81c77aaa05d9")}`,'',receipt.text,'',hint.message||''].join('\n'),width-44,height-140);
      d.button(x+22,y+height-53,'BACK',()=>{hint=null;refresh();});
      const offer=getQuestHintOffer(QUEST);
      d.button(x+width-180,y+height-53,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_2e8a70d3d55717fa6b7a"),openHints,Boolean(offer?.next));return;
    }
    const offer=hint.offer;
    if(!offer)fitBody(d,x+22,y+65,hint.message||__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_cfbb2963406212edd445"),width-44,height-140);
    else if(offer.complete)fitBody(d,x+22,y+65,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_5b72339195634f3a77fb"),width-44,height-150);
    else{
      d.text(x+22,y+61,`${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_8f19bfc8a6eefa3f5daa")}${offer.level+1}${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_8d2cedfe81c77aaa05d9")}`,17,'#344b3a',width-44);
      d.button(x+22,y+101,`${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_286281680359f4274f89")}${offer.freeCount}${__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_ba5ec51d07a4ac0e9516")}`,()=>buyHint('free_hint'),offer.freeCount>0&&!buyingHint);
      d.text(x+22,y+135,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_e841b34a01be41e3e428"),14,'#5a604d',width-44);
      d.button(x+22,y+177,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_d1cbbf44341666456748"),()=>buyHint('cut_corners'),!buyingHint);
      d.text(x+22,y+211,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_0519764c0d52ab4fbd61"),14,'#8c493a',width-44);
      d.button(x+22,y+253,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_c8942777d1d2733fbd2c"),()=>buyHint('squad_help'),!buyingHint);
      d.text(x+22,y+287,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_9fa2041bfe120c38f0e8"),14,'#355c43',width-44);
    }
    if(hint.message&&offer)fitBody(d,x+22,y+height-112,hint.message,width-44,48,14);
    d.button(x+22,y+height-53,'CANCEL',()=>{hint=null;refresh();});
    if(offer?.latest)d.button(x+width-215,y+height-53,__dialogueText("ui/pi-computer/AlibiImprovementsBase.js", "t_7e195cb9f1f02521dde8"),()=>{hint={app:ui.app,mode:'read',receipt:offer.latest,message:''};refresh();});
  }
  wrap(documents,'render',original=>(...args)=>{
    installSearch();const result=original(...args),quest=gameState.piQuests?.quests?.[QUEST];
    if(!alive()||!quest||quest.status==='completed'||!ui.window)return result;
    const bounds=ui.window;ui.drawing.button(bounds.x+180,bounds.y+bounds.h-77,'HINT',openHints);return result;
  });
  wrap(ui,'render',original=>(...args)=>{installSearch();const result=original(...args);renderOverlay();return result;});
  const destroy=()=>{
    if(dead)return;dead=true;hint=null;pendingReveal=null;
    ui.scene.events.off('shutdown',destroy);
    for(const restore of restorers.reverse())restore();
    if(ui[INSTALLATION]===api)delete ui[INSTALLATION];
  };
  const api={destroy};ui[INSTALLATION]=api;ui.scene.events.once('shutdown',destroy);
  queueMicrotask(()=>{if(!alive())return;installSearch();wrap(ui,'destroy',original=>(...args)=>{destroy();return original(...args);});});
  return api;
}