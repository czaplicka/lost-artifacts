import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { discoverSearchKeywords, getSearchProgress } from '../ui/pi-computer/ComputerSearchCore.js';
import { drawEvidenceText } from '../ui/pi-computer/EvidenceText.js';
import { FONT_TEXT, AMBER, GREEN } from '../ui/pi-phone/PhoneConfig.js';

export const DEAD_MEN_WEB_CASE='dead_men_calling';
const QUEST='pi_dead_men_calling';
const CONTACTS={
  '619':{id:'dead_men_margaret',number:'619',name:__dialogueText("managers/DeadMenWebIntegration.js", "t_e3683593d8ba71a5c369"),keyword:'dm_phone_margaret'},
  '620':{id:'dead_men_leo',number:'620',name:__dialogueText("managers/DeadMenWebIntegration.js", "t_9b91e7842e8557c83048"),keyword:'dm_phone_leo'},
  '621':{id:'dead_men_colin',number:'621',name:__dialogueText("managers/DeadMenWebIntegration.js", "t_b7e5ae2ffc6f69bea5b4"),keyword:'dm_phone_colin'}
};
const UI_INSTALLED=Symbol.for(__dialogueText("managers/DeadMenWebIntegration.js", "t_5cc7cd1dd530717053da"));
const PHONE_INSTALLED=Symbol.for(__dialogueText("managers/DeadMenWebIntegration.js", "t_bd8dca4e8778d00f4a72"));
const EXTRA_KEYWORDS=[
  {id:'dm_hiss',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_8f6c848dbd2c49fc24fb"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_8747c3dba568177c1be8"),'hiss']},
  {id:'dm_tram_bell',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_97f6829421830ff15cd0"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_7e3fc1a807434d697a9d"),__dialogueText("managers/DeadMenWebIntegration.js", "t_b2ca8bd89d8b6e961dff"),__dialogueText("managers/DeadMenWebIntegration.js", "t_5e14c6cc67686cb06363"),__dialogueText("managers/DeadMenWebIntegration.js", "t_9e4da66da8917aafdb93")]},
  {id:'dm_metallic_taps',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_41b7519a15347d8a68b9"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_99c44a1c505e00864379"),__dialogueText("managers/DeadMenWebIntegration.js", "t_0ab5972850e6868bed63"),__dialogueText("managers/DeadMenWebIntegration.js", "t_d437bf3b1ab3e8c1a954")]},
  {id:'dm_archive_a',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_0119f78a405fde9a4a68"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_0119f78a405fde9a4a68")]},
  {id:'dm_archive_b',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_8536ac2c518e5f80801d"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_8536ac2c518e5f80801d")]},
  {id:'dm_archive_c',label:__dialogueText("managers/DeadMenWebIntegration.js", "t_a6e13b5b3a4d7efaf739"),cloudId:'recordings',aliases:[__dialogueText("managers/DeadMenWebIntegration.js", "t_a6e13b5b3a4d7efaf739")]}
];
const REPLAYS=new Set([
  __dialogueText("managers/DeadMenWebIntegration.js", "t_4a3e06c03cff0b9abc78"),
  __dialogueText("managers/DeadMenWebIntegration.js", "t_9116b3020c8b6fbc984a"),
  __dialogueText("managers/DeadMenWebIntegration.js", "t_81e0dee31a3dcd8f653f"),
  __dialogueText("managers/DeadMenWebIntegration.js", "t_7c5c6ce0b1111549317f")
]);
const PLAYER_IDS=new Set(['dead_men_recording_1','dead_men_recording_2','dead_men_recording_3','dead_men_archive_a','dead_men_archive_b','dead_men_archive_c']);
function accepted(){return ['active','completed'].includes(gameState.piQuests?.quests?.[QUEST]?.status);}
function known(){return getSearchProgress().cases[DEAD_MEN_WEB_CASE]?.known||[];}
const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();

export function ensureDeadMenNotebook(data){
  const definition=data?.cases?.find(item=>item.id===DEAD_MEN_WEB_CASE);
  if(!definition)return null;
  if(!definition.clouds.some(item=>item.id==='recordings'))definition.clouds.push({id:'recordings',title:__dialogueText("managers/DeadMenWebIntegration.js", "t_54b3d651c0236d64d703")});
  for(const spec of EXTRA_KEYWORDS){
    const old=definition.keywords.find(item=>item.id===spec.id);
    if(!old)definition.keywords.push({...spec,aliases:[...spec.aliases]});
    else old.aliases=[...new Set([...(old.aliases||[]),...spec.aliases])];
  }
  const targets=['dm_audio_article'].filter(id=>definition.pages.some(page=>page.id===id));
  if(targets.length){
    const recipes=definition.recipes;
    for(const spec of EXTRA_KEYWORDS){
      if(!recipes.some(recipe=>recipe.terms.length===1&&recipe.terms[0]===spec.id))recipes.push({terms:[spec.id],pageIds:[...targets]});
    }
  }
  return definition;
}

export function isDeadMenWebContactVisible(contact){
  const spec=CONTACTS[contact?.number];
  return !spec||(accepted()&&known().includes(spec.keyword));
}
export function deadMenWebContacts(){
  return Object.values(CONTACTS).filter(isDeadMenWebContactVisible)
    .map(({keyword,...contact})=>({...contact,listed:true,status:'available',dialogueId:null}));
}

export function fragmentDeadMenText(value,keywords){
  const aliases=[];
  for(const keyword of keywords||[]){
    // Phone numbers remain collectible only from their explicit website tags.
    if(keyword.id.startsWith('dm_phone_'))continue;
    for(const alias of keyword.aliases||[]){
      if(typeof alias!=='string'||!alias.trim())continue;
      const pattern=alias.trim().split(/\s+/).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
      aliases.push({alias,id:keyword.id,expression:new RegExp('^(?:'+pattern+')','i')});
    }
  }
  aliases.sort((a,b)=>b.alias.length-a.alias.length);
  const source=String(value),result=[];let plain='',index=0;
  while(index<source.length){
    let found=null;
    if(index===0||!/[a-z0-9_]/i.test(source[index-1])){
      for(const candidate of aliases){
        const match=source.slice(index).match(candidate.expression);
        if(!match)continue;
        const end=index+match[0].length;
        if(end<source.length&&/[a-z0-9_]/i.test(source[end]))continue;
        found={id:candidate.id,text:match[0]};break;
      }
    }
    if(!found){plain+=source[index++];continue;}
    if(plain){result.push(plain);plain='';}
    result.push({keywordId:found.id,text:found.text});index+=found.text.length;
  }
  if(plain)result.push(plain);
  return result;
}

function hasKeywords(parts){return parts.some(part=>part&&typeof part==='object'&&part.keywordId);}
function allowedMail(message){
  return Boolean(message?.id?.startsWith('dead_men_')&&!/(?:draft|review|pending)/i.test(message.id)&&!/^You\s*→/.test(message.from||''));
}

export function installDeadMenWebUI(ui){
  if(ui[UI_INSTALLED])return;
  ui[UI_INSTALLED]=true;
  const docs=ui.documents,search=ui.search,restorers=[];
  let dead=false,rendering=false,drawingRich=false,cached=null,loading=null;
  const alive=()=>!dead&&!ui.destroyed;
  const refresh=()=>{if(alive()&&ui.isOpen&&!ui.suspended&&!ui.booting)ui.render();};
  const wrap=(target,key,factory)=>{
    if(typeof target?.[key]!=='function')return;
    const original=target[key],wrapped=factory(original.bind(target));target[key]=wrapped;
    restorers.push(()=>{if(target[key]===wrapped)target[key]=original;});
  };
  const definition=()=>ensureDeadMenNotebook(search.data);
  function loadDefinitions(){
    if(definition()||loading||search.error||!accepted())return;
    loading=Promise.resolve().then(()=>search.load()).then(()=>{
      if(alive())definition();
    }).catch(error=>console.error('[DeadMenWebUI] Notebook data unavailable:',error))
      .finally(()=>{loading=null;if(alive()&&definition())refresh();});
  }
  function sourceMessage(){
    const id=ui.selectedId;
    if(cached?.id===id)return cached;
    const items=docs.getMail();
    const message=items.find(item=>item.id===id)||
      (docs.mailbox?.trash?docs.mailbox.displayed().find(item=>item.id===id):null);
    cached={id,message,body:normalize(message?.body)};return cached;
  }
  function collect(id,mailId){
    if(!alive()||!accepted()||!ui.isOpen||ui.suspended||ui.app!=='mail'||ui.selectedId!==mailId)return;
    const def=definition();
    if(!def?.keywords.some(keyword=>keyword.id===id)||id.startsWith('dm_phone_'))return;
    discoverSearchKeywords(DEAD_MEN_WEB_CASE,[id]);
    queueMicrotask(()=>{
      if(!alive()||!ui.isOpen||ui.suspended||ui.app!=='mail'||ui.selectedId!==mailId)return;
      if(!ui.caseCloudNotebook?.revealKeyword?.(DEAD_MEN_WEB_CASE,id))refresh();
    });
  }
  wrap(search,'load',original=>async(...args)=>{
    const result=await original(...args);if(alive())definition();return result;
  });
  wrap(ui.drawing,'text',original=>(x,y,value,size=17,color,wrapWidth=0,font='body')=>{
    const label=original(x,y,value,size,color,wrapWidth,font);
    if(!alive()||!rendering||drawingRich||!accepted()||ui.app!=='mail'||font==='pixel'||typeof value!=='string')return label;
    const def=definition();if(!def)return label;
    const source=sourceMessage();if(!allowedMail(source.message))return label;
    const text=normalize(value);
    const replay=PLAYER_IDS.has(ui.selectedId)&&REPLAYS.has(value);
    if(!text||(!replay&&!source.body.includes(text)))return label;
    const parts=fragmentDeadMenText(value,def.keywords);if(!hasKeywords(parts))return label;
    const mailId=ui.selectedId,width=wrapWidth>0?wrapWidth:Math.max(1,label.width);
    label.setVisible(false);drawingRich=true;
    try{
      drawEvidenceText(ui,{
        blocks:[parts],x,y,width,fontSize:size,lineHeight:size+4,
        isKnown:id=>known().includes(id),onCollect:id=>collect(id,mailId)
      });
    }finally{drawingRich=false;}
    return label;
  });
  wrap(docs,'render',original=>(...args)=>{
    cached=null;
    if(alive()&&accepted()){definition();loadDefinitions();}
    const previous=rendering;rendering=true;
    try{return original(...args);}finally{rendering=previous;}
  });
  const cleanup=()=>{
    if(dead)return;dead=true;cached=null;
    ui.scene.events.off('shutdown',cleanup);ui.scene.events.off('destroy',cleanup);
    for(const restore of restorers.reverse())restore();delete ui[UI_INSTALLED];
  };
  ui.scene.events.once('shutdown',cleanup);ui.scene.events.once('destroy',cleanup);
}

export function installDeadMenWebPhone(phone){
  if(phone[PHONE_INSTALLED])return;
  phone[PHONE_INSTALLED]=true;
  const restorers=[];let dead=false;
  const wrap=(key,factory)=>{
    if(typeof phone[key]!=='function')return;
    const original=phone[key],wrapped=factory(original.bind(phone));phone[key]=wrapped;
    restorers.push(()=>{if(phone[key]===wrapped)phone[key]=original;});
  };
  function definition(){
    return ensureDeadMenNotebook(phone.investigation?.searchData)||ensureDeadMenNotebook(phone.scene.computerUI?.search?.data);
  }
  function activeCall(){
    const spec=CONTACTS[phone.number];
    return Boolean(!dead&&!phone.destroyed&&phone.isOpen&&phone.state==='connected'&&spec&&phone.contactName===spec.name&&accepted());
  }
  wrap('startCall',original=>()=>{
    if(CONTACTS[phone.number]&&!isDeadMenWebContactVisible({number:phone.number})){
      phone.finishCall(__dialogueText("managers/DeadMenWebIntegration.js", "t_14cfdf7e2dbfa3bd5adb"));return;
    }
    return original();
  });
  wrap('drawClickableFragments',original=>item=>{
    if(!activeCall()||item.richDrawn||item.typing||!phone.logItems.includes(item))return original(item);
    const def=definition();if(!def)return original(item);
    const parts=fragmentDeadMenText(item.full,def.keywords);if(!hasKeywords(parts))return original(item);
    const scene=phone.scene,root=scene.add.container(item.body.x,item.body.y);item.container.add(root);
    const normal=item.isYou?'#ffe6b8':'#d9f5e8';
    const surface=item.isYou?0x2a2010:0x14261d;
    const probe=scene.add.text(0,0,__dialogueText("managers/DeadMenWebIntegration.js", "t_468415f0e1128f85022b"),{fontFamily:FONT_TEXT,fontSize:'19px'}).setVisible(false);
    const lineHeight=Math.max(19,Math.ceil(probe.height));probe.destroy();
    const drawing={text(x,y,text,size){
      const label=scene.add.text(x,y,text,{fontFamily:FONT_TEXT,fontSize:`${size}px`,color:normal});root.add(label);return label;
    }};
    const height=drawEvidenceText({scene,drawing,content:root},{
      blocks:[parts],x:0,y:0,width:402,fontSize:19,lineHeight,surface,
      isKnown:id=>known().includes(id),
      onCollect:id=>{
        if(!activeCall()||phone.directoryOpen||!phone.logItems.includes(item)||item.typing||id.startsWith('dm_phone_'))return;
        discoverSearchKeywords(DEAD_MEN_WEB_CASE,[id]);
        phone.scene.computerUI?.caseCloudNotebook?.revealKeyword?.(DEAD_MEN_WEB_CASE,id);
        phone.render();
      }
    });
    item.richDrawn=true;item.body.setVisible(false);item.height=Math.max(item.height,height+42);
    const h=item.height-24;
    item.bg.clear();item.bg.fillStyle(surface,1);item.bg.fillRoundedRect(item.bubbleOffset,16,item.bubbleWidth,h,8);
    item.bg.lineStyle(1,item.isYou?AMBER:GREEN,.6);item.bg.strokeRoundedRect(item.bubbleOffset,16,item.bubbleWidth,h,8);
    phone.layoutLog();
  });
  const cleanup=()=>{
    if(dead)return;dead=true;phone.scene.events.off('shutdown',cleanup);
    for(const restore of restorers.reverse())restore();delete phone[PHONE_INSTALLED];
  };
  phone.scene.events.once('shutdown',cleanup);
}