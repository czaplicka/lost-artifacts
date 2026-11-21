import {readTableForThreeOfficeLock,useTableForThreeOfficeLock,enterTableForThreePickedOffice} from '../managers/TableForThreeLockService.js';
import {validOfficeLock,LOCK_NOISE_LIMIT} from '../managers/TableForThreeLockModel.js';
export function showTableForThreeOfficeLock(scene,selected=0,message=''){
  const state=readTableForThreeOfficeLock();
  if(!validOfficeLock(state)){scene.screen('Office lock','The saved lock state could not be read. Use reception or the caretaker; no progress has been deleted.',[['BACK',()=>scene.menu()]]);return;}
  if(state.status==='caught'){
    scene.screen('Security guard','“Checking the fire door?”\n\nYou look at the very ordinary office door.\n\n“Then why is your fire extinguisher shaped like a lockpick?”\n\nSecurity is now watching this corridor. The lockpick route is closed for this case. Reception and the caretaker remain alternative routes.'+(message?'\n\n'+message:''),[['LEAVE THE CORRIDOR',()=>scene.menu()]]);return;
  }
  if(state.status==='open'){
    scene.screen('Office unlocked','The tools come away cleanly. Nothing is broken.\n\n'+message,[['ENTER OFFICE',()=>{
      const result=enterTableForThreePickedOffice();if(result.ok)scene.menu();else scene.screen('Cannot enter',result.reason,[['BACK',()=>scene.menu()]]);
    }],['BACK',()=>scene.menu()]]);return;
  }
  const choose=state.seated[selected]?state.seated.findIndex(v=>!v):selected;
  const revision=state.revision;
  const perform=(type,depth)=>{
    const result=useTableForThreeOfficeLock({type,pin:choose,...(depth?{depth}:{})},revision);
    if(result.ok)showTableForThreeOfficeLock(scene,choose,[result.message,result.warning].filter(Boolean).join('\n\n'));
    else scene.screen('Lock attempt paused',result.reason,[['REOPEN LOCK',()=>showTableForThreeOfficeLock(scene,choose)],['BACK',()=>scene.menu()]]);
  };
  scene.screen('Office lock','Set all three pins. Probe a pin to feel its binding depth, then choose pressure.\n\n'+
    state.seated.map((set,i)=>'PIN '+(i+1)+': '+(set?'SET':i===choose?'SELECTED':'UNSET')).join('\n')+
    '\n\nNoise: '+state.noise+' / '+LOCK_NOISE_LIMIT+'. The third scrape attracts security. Probing and reading do not increase noise.'+
    (message?'\n\n'+message:''),[
      ...state.seated.map((set,i)=>['SELECT PIN '+(i+1),()=>showTableForThreeOfficeLock(scene,i),set]),
      ['PROBE SELECTED PIN',()=>perform('PROBE')],['LIGHT PRESSURE',()=>perform('SET_PIN',1)],['MEDIUM PRESSURE',()=>perform('SET_PIN',2)],['DEEP PRESSURE',()=>perform('SET_PIN',3)],['BACK OUT QUIETLY',()=>scene.menu()]
    ]);
}
