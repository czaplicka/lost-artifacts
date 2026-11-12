import { agencyManualData,hasAgencyFieldManual,getAgencyManualChapter } from '../managers/AgencyManualService.js';
import { prepareManualReaderAudio,playManualReaderAudio } from './ManualReaderAudio.js';

let active=null;
const STYLE_ID='agency-field-manual-reader-style';
export function isAgencyManualOpen(){return Boolean(active);}
export function closeAgencyFieldManual(){active?.close();}
export function openAgencyFieldManual(chapterId='overview',{ownerScene=null}={}){
  if(!hasAgencyFieldManual())return{ok:false,consumed:false,message:agencyManualData.missingMessage};
  if(active){active.select(chapterId);active.dialog.focus();return{ok:true,consumed:false,openedDocument:true,message:''};}
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');style.id=STYLE_ID;
    style.textContent=`
      .agency-manual-reader{width:min(920px,92vw);max-height:90vh;box-sizing:border-box;margin:auto;
        padding:0;border:3px solid #ad8d50;background:#e9ddbd;color:#342d23;
        box-shadow:12px 14px 0 #0007;font-family:SpecialElite,monospace;}
      .agency-manual-reader::backdrop{background:#030906d9;}
      .agency-manual-reader header{display:flex;align-items:center;justify-content:space-between;
        gap:18px;padding:20px 24px;background:#173527;color:#ffe2a0;}
      .agency-manual-reader h1{font-size:21px;margin:0;}
      .agency-manual-reader nav{display:flex;flex-wrap:wrap;gap:10px;padding:16px 24px;border-bottom:1px solid #ac9468;}
      .agency-manual-reader button{font:inherit;font-size:18px;padding:9px 14px;cursor:pointer;
        border:1px solid #8d7144;background:#f6ebd0;color:#342d23;}
      .agency-manual-reader button[aria-current=true]{background:#284936;color:#ffe2a0;}
      .agency-manual-reader article{padding:8px 28px 18px;font-size:21px;line-height:1.5;}
      .agency-manual-reader h2{font-size:27px;}
      .agency-manual-reader footer{padding:14px 24px;background:#dac9a5;font-size:16px;}
      @media(max-width:600px){.agency-manual-reader article{font-size:17px;padding:8px 16px;} .agency-manual-reader header{padding:14px;}}
    `;document.head.appendChild(style);
  }
  const dialog=document.createElement('dialog');dialog.className='agency-manual-reader';dialog.tabIndex=-1;
  const header=document.createElement('header'),title=document.createElement('h1'),close=document.createElement('button');
  title.textContent=agencyManualData.title;close.textContent='CLOSE / ESC';close.type='button';header.append(title,close);
  const nav=document.createElement('nav'),article=document.createElement('article'),footer=document.createElement('footer');
  footer.textContent='Reading is free. The book remains in your inventory. Missing copy? Ask Alex in Storage.';
  dialog.append(header,nav,article,footer);document.body.appendChild(dialog);
  const buttons=[];
  let selectedChapterId=null;
  const select=(id,{sound=true}={})=>{
    const chapter=getAgencyManualChapter(id),changed=selectedChapterId!==chapter.id;article.replaceChildren();
    const heading=document.createElement('h2');heading.textContent=chapter.title;article.appendChild(heading);
    for(const text of chapter.paragraphs){const paragraph=document.createElement('p');paragraph.textContent=text;article.appendChild(paragraph);}
    buttons.forEach(({id,button})=>button.setAttribute('aria-current',String(id===chapter.id)));
    selectedChapterId=chapter.id;
    if(sound&&changed&&active?.dialog===dialog)playManualReaderAudio(owner,'page');
  };
  for(const chapter of agencyManualData.chapters){
    const button=document.createElement('button');button.type='button';button.textContent=chapter.title;
    button.addEventListener('click',()=>select(chapter.id));nav.appendChild(button);buttons.push({id:chapter.id,button});
  }
  const game=window.game;
  const owner=ownerScene||game?.scene?.keys?.[game.registry?.get('currentSceneKey')];
  prepareManualReaderAudio(owner);
  const stopKeys=event=>{
    if(active?.dialog!==dialog)return;
    event.stopPropagation();event.stopImmediatePropagation();
    if(event.key==='Escape'){event.preventDefault();finish();}
  };
  const finish=()=>{
    if(active?.dialog!==dialog)return;
    active=null;window.removeEventListener('keydown',stopKeys,true);
    owner?.events?.off('shutdown',finish);owner?.events?.off('sleep',finish);game?.events?.off('destroy',finish);
    if(dialog.open)dialog.close();dialog.remove();
  };
  active={dialog,select,close:finish};
  close.addEventListener('click',finish);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  dialog.addEventListener('close',finish);
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)finish();
  });
  window.addEventListener('keydown',stopKeys,true);
  owner?.events?.once('shutdown',finish);owner?.events?.once('sleep',finish);game?.events?.once('destroy',finish);
  select(chapterId,{sound:false});
  try{dialog.showModal();dialog.focus();}catch(error){finish();return{ok:false,consumed:false,message:`The manual could not be opened: ${error.message}`};}
  playManualReaderAudio(owner,'paper');
  return{ok:true,consumed:false,openedDocument:true,message:''};
}
