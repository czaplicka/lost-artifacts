import { computerUiCanInteract, playComputerUiClick } from './ComputerUiAudio.js';
import { playComputerNotebookAudio } from './ComputerNotebookAudio.js';
export function computerActionButton(ui,x,y,label,action,enabled=true){
 const token=ui.viewToken,app=ui.app;
 const button=ui.drawing.button(x,y,label,()=>{},enabled);
 if(!enabled)return button;
 button.removeAllListeners('pointerdown');
 button.on('pointerdown',()=>{
  if(!computerUiCanInteract(ui)||ui.booting||ui.app!==app||ui.viewToken!==token||button.active===false||!button.scene)return;
  const effect=action();
  if(effect==='page')playComputerNotebookAudio(ui,'page');
  else if(effect==='click')playComputerUiClick(ui);
 });return button;
}
