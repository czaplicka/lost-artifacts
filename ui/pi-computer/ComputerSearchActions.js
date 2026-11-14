import { computerUiCanInteract, playComputerUiClick } from './ComputerUiAudio.js';
export function searchAction(search,object,callback,{sound=false,enabled=()=>true}={}){
 const ui=search.ui,token=ui.viewToken,caseId=search.definition?.id;
 return (...args)=>{
  if(search.dead||!computerUiCanInteract(ui)||ui.booting||ui.app!=='search'||ui.viewToken!==token||
    search.definition?.id!==caseId||object?.active===false||(object&&!object.scene)||!enabled())return;
  if(sound)playComputerUiClick(ui);
  return callback(...args);
 };
}
export function bindSearchClick(search,object,callback,enabled=()=>true){
 object.setInteractive({useHandCursor:true});
 object.on('pointerdown',searchAction(search,object,callback,{sound:true,enabled}));
 return object;
}
