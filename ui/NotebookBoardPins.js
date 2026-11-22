import { gameState } from '../GameData.js';
import { getResearchPinStatus, pinResearchKeyword } from '../managers/PIResearchPins.js';
import { piResearchPinText as t } from '../dialogues/PIResearchPinText.js';

const INSTALLED=Symbol('notebook-board-pins');
const normal=value=>String(value||'').replace(/\s+/g,' ').trim();
const CSS=`
.pcn .pcn-word .pcn-board-pin{
 flex:0 0 auto;align-self:center;min-height:1.8em;max-width:8.8em;
 padding:.15em .4em;border:1px solid #8a6a16;border-bottom-width:2px;
 border-radius:3px;background:#e9d595;color:#3a3017;font-size:.58em;
 line-height:1.35;letter-spacing:.02em;text-transform:uppercase;text-align:center;
 white-space:normal;box-shadow:none;cursor:pointer;
}
.pcn .pcn-word .pcn-board-pin:disabled{opacity:.62;cursor:default}
.pcn .pcn-pin-feedback{margin:.4em .5em;font-size:.8em;color:var(--red,#9b2f22)}
`;

export function researchWordForRow(row,definition,known){
  const candidates=[...row.children].filter(node=>!node.classList?.contains('pcn-board-pin'));
  const checkbox=candidates.find(node=>node.tagName==='INPUT');
  const aria=checkbox?.getAttribute('aria-label')||'';
  const label=aria.startsWith('Select note: ')?aria.slice('Select note: '.length):
    candidates.find(node=>['SPAN','BUTTON'].includes(node.tagName))?.textContent;
  const matches=(definition?.keywords||[]).filter(word=>known.includes(word.id)&&normal(word.label)===normal(label));
  return matches.length===1?matches[0]:null;
}

export function installNotebookBoardPins(ui,notebook,previousRoots=new Set()){
  if(!notebook||notebook[INSTALLED])return notebook?.[INSTALLED]||null;
  const roots=[...document.querySelectorAll('.pcn')];
  const root=roots.find(node=>!previousRoots.has(node))||(roots.length===1?roots[0]:null);
  if(!root)return null;
  const state=ui.state||gameState;
  let dead=false,message='',queued=false;
  const style=document.createElement('style');style.textContent=CSS;document.head.append(style);
  const feedback=document.createElement('p');feedback.className='pcn-pin-feedback';
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const originalDestroy=notebook.destroy;
  const caseDefinitions=()=>ui.scene?.cache?.json?.get('piCases')?.cases||[];
  function current(){
    const id=notebook.selectedCaseId||state.playerCloudViewV1?.selectedCaseId||state.piKeywordSearch?.selectedCaseId;
    return ui.search?.data?.cases?.find(entry=>entry.id===id)||null;
  }
  function sync(){
    if(dead)return;
    const definition=current();
    const known=state.piKeywordSearch?.cases?.[definition?.id]?.known||[];
    const paper=root.querySelector('.pcn-paper');
    for(const row of root.querySelectorAll('.pcn-word')){
      const word=researchWordForRow(row,definition,known);
      let button=row.querySelector('.pcn-board-pin');
      if(!word){button?.remove();continue;}
      if(!button){
        button=document.createElement('button');button.type='button';button.className='pcn-board-pin';
        button.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          if(dead||ui.destroyed||ui.suspended||root.hidden||!ui.scene?.sys?.isActive())return;
          const active=current();
          if(active?.id!==button.dataset.caseId)return;
          if(state!==gameState){message=t('unavailable');sync();return;}
          try{
            const result=pinResearchKeyword(active,button.dataset.keywordId,caseDefinitions());
            message=result.message;
          }catch(error){console.error('[NotebookBoardPins]',error);message=t('unavailable');}
          sync();
        });
        row.append(button);
      }
      button.dataset.caseId=definition.id;button.dataset.keywordId=word.id;
      const status=getResearchPinStatus(state,definition,word.id,caseDefinitions());
      const label=t(status.pinned?'pinned':'pin');
      if(button.textContent!==label)button.textContent=label;
      button.disabled=!status.ok||status.pinned;
      button.title=status.ok?t('help'):t(status.reason);
      button.setAttribute('aria-label',label+': '+word.label);
    }
    if(feedback.textContent!==message)feedback.textContent=message;
    feedback.hidden=!message;
    if(paper&&feedback.parentNode!==paper)paper.append(feedback);
  }
  function queueSync(){
    if(dead||queued)return;queued=true;
    queueMicrotask(()=>{queued=false;if(!dead)sync();});
  }
  const observer=new MutationObserver(queueSync);
  observer.observe(root,{childList:true,subtree:true});
  // Board deletion can happen outside the notebook's DOM.
  let lastCheck=-Infinity;
  function step(){
    const now=ui.scene.time?.now??Date.now();
    if(dead||root.hidden||now-lastCheck<350)return;
    lastCheck=now;sync();
  }
  function cleanup(){
    if(dead)return;dead=true;observer.disconnect();
    root.querySelectorAll('.pcn-board-pin').forEach(button=>button.remove());
    feedback.remove();style.remove();
    ui.scene?.events?.off('update',step);
    ui.scene?.events?.off('shutdown',cleanup);ui.scene?.events?.off('destroy',cleanup);
    if(notebook.destroy===wrappedDestroy)notebook.destroy=originalDestroy;
    if(notebook[INSTALLED]===api)delete notebook[INSTALLED];
  }
  function wrappedDestroy(...args){cleanup();return originalDestroy?.apply(this,args);}
  const api={destroy:cleanup,sync};notebook[INSTALLED]=api;
  if(typeof originalDestroy==='function')notebook.destroy=wrappedDestroy;
  ui.scene?.events?.on('update',step);
  ui.scene?.events?.once('shutdown',cleanup);ui.scene?.events?.once('destroy',cleanup);
  sync();return api;
}
