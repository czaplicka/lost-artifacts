import { EventBus } from '../../EventBus.js';
import { getMissionCaseKey } from '../../crimeCaseKey.js';

const PANEL_ID='csi-save-recovery';
let disposeCurrent=null;

export function showLabRecovery(state,cityId,error) {
  console.error('[CrimeLabManager] Recovery required:',error);
  if (typeof document==='undefined'||!document.body) return;
  disposeCurrent?.();
  const key=getMissionCaseKey(state,cityId), mission=state.currentMission;
  const root=document.createElement('section');
  root.id=PANEL_ID; root.setAttribute('role','alertdialog'); root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Laboratory save recovery');
  root.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(8,6,5,.97);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;color:#f5e7c6;';
  const box=document.createElement('div');
  box.style.cssText='max-width:650px;max-height:90vh;overflow:auto;padding:28px;border:3px solid #d4af37;background:#211711;font:18px/1.6 SpecialElite,monospace;';
  const title=document.createElement('h2'); title.textContent='LABORATORY SAVE RECOVERY';
  const message=document.createElement('p'); message.textContent='This save contains incomplete or conflicting laboratory records. No evidence, suspects or completed analyses were replaced. You can return to the city and load another save, or download this save for repair.';
  const detail=document.createElement('p'); detail.textContent=error.message;
  const status=document.createElement('p'); status.setAttribute('aria-live','polite');
  box.append(title,message,detail,status); root.append(box); document.body.append(root);
  const current=()=>state.currentMission===mission&&getMissionCaseKey(state,cityId)===key;
  const dispose=()=>{root.remove();EventBus.off('gameState:restored',dispose);if(disposeCurrent===dispose)disposeCurrent=null;};
  disposeCurrent=dispose; EventBus.on('gameState:restored',dispose);
  const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='margin:6px;padding:12px;font:16px SpecialElite,monospace;cursor:pointer;';b.addEventListener('click',()=>Promise.resolve().then(action).catch(e=>{status.textContent=e.message;console.error('[LabRecoveryUI]',e);}));box.append(b);return b;};
  button('Download save backup',()=>{
    if(!current()){dispose();return;}
    const data=typeof state.exportForSave==='function'?state.exportForSave():state;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='csi-recovery-save.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Backup downloaded. The browser autosave was not overwritten.';
  });
  button('Return to city',async()=>{
    if(!current()){dispose();return;}
    const game=typeof window!=='undefined'?window.game:null;
    if(!game?.scene)throw Error('The game instance is unavailable. Keep the backup and reload the page.');
    await game.sceneLoader?.ensure('CrimeCityScene');
    if(!current()){dispose();return;}
    if(!game.scene.keys.CrimeCityScene)throw Error('The city scene is unavailable. Download a backup before reloading.');
    // Start directly: the laboratory may have failed during init().
    game.scene.stop('CrimeLabScene');
    game.scene.start('CrimeCityScene',{gameState:state,cityId,labRecoveryRequired:true});
    dispose();
  });
  root.querySelector('button')?.focus();
}
