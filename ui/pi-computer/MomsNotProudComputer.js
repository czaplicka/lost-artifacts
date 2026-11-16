import { gameState } from '../../GameData.js';
import { piInventoryManager } from '../../managers/PIInventoryManager.js';
import { openMomsNotProudTrip, PIZZERIA_TOWN_ID } from '../../managers/MomsNotProudTravel.js';
import { getCurrentTownId, canStartRoadTrip } from '../../managers/RoadTripManager.js';

const ID='pi_moms_not_proud',MAIL='moms_not_proud_moretti_briefing';
const quest=()=>gameState.piQuests?.quests?.[ID];
const done=()=>quest()?.rewardSettlement?.completed===true;
export function installMomsNotProudComputer(ui,documents){
  const oldMail=documents.getMail,oldRender=documents.render,oldPaged=documents.renderPagedText;
  let destroyed=false,launching=false;
  const alive=()=>!destroyed&&!ui.destroyed&&ui.isOpen&&!ui.suspended;
  const viewing=()=>ui.app==='mail'&&ui.selectedId===MAIL&&!!quest();
  const getMail=function(...args){
    const messages=(oldMail.apply(this,args)||[]).filter(m=>m.id!==MAIL);
    if(!quest())return messages;
    return [{id:MAIL,from:'Vincenzo Moretti',date:'Case correspondence',
      subject:done()?'Mom’s Not Proud — case closed':'Mom’s Not Proud — WhateverVille',
      body:done()
        ? 'Detective,\n\nYour report has been received. The agreed fee has been processed.\n\n'+
          (gameState.piMomsNotProud?.reportChoice==='honest'
            ? 'I thought exterior communication meant a larger menu. Apparently the pigeon is holding one.\n\n'
            : 'An inconclusive report. For $150. I shall be discussing this with the pigeon.\n\n')+'Vincenzo Moretti'
        : 'Detective,\n\nSomeone is painting outside my pizzeria after closing. The artwork appears to depict a pigeon judging my pizza. I accept criticism from customers, but not birds.\n\n'+
          'LOCATION: Moretti Pizzeria, WhateverVille. Drive there before beginning your observation.\n\n'+
          'Please identify the person and establish what they are doing. Observe from the public pavement; do not enter the premises.\n\n'+
          'The family photograph shows me with my daughter Raven. She helps with advertising. This does not make her a suspect.\n\n'+
          'My wife restores historic buildings. If she hears “unauthorised mural”, I shall be sleeping next to the flour.\n\n'+
          'Agreed fee: $150. Bring your camera and enough cash for the return journey.\n\nVincenzo Moretti\n\nThe family photograph can be opened at the observation location.'
    },...messages];
  };
  const paged=function(body,x,y,w,h){return oldPaged.call(this,body,x,y,w,Math.max(40,h-(viewing()&&!done()?64:0)));};
  async function launch(){
    if(!alive()||launching||!viewing()||done())return;
    if(!['active','settling'].includes(quest()?.status))return;
    if(!piInventoryManager.hasItem('camera')){ui.notice='Bring your camera from the Spy Shop.';ui.render();return;}
    const here=getCurrentTownId();
    if(here!==PIZZERIA_TOWN_ID){
      const check=canStartRoadTrip(here,PIZZERIA_TOWN_ID,{mode:'pi'});
      if(!check.ok){ui.notice=check.message;ui.render();return;}
    }
    launching=true;ui.notice='Preparing your pizzeria visit...';ui.render();
    try{
      const result=await openMomsNotProudTrip(ui);
      if(!result.ok&&!ui.destroyed)ui.notice=result.message;
    }catch(error){console.error('[MomsNotProudComputer]',error);if(!ui.destroyed)ui.notice='Could not start the journey. Check the console.';}
    finally{launching=false;if(alive())ui.render();}
  }
  const render=function(...args){
    const result=oldRender.apply(this,args);
    if(viewing()&&!done()&&ui.window&&['active','settling'].includes(quest()?.status)){
      const b=ui.window,here=getCurrentTownId();
      const check=here===PIZZERIA_TOWN_ID?null:canStartRoadTrip(here,PIZZERIA_TOWN_ID,{mode:'pi'});
      const label=launching?'OPENING...':here===PIZZERIA_TOWN_ID?'VISIT PIZZERIA':`DRIVE TO WHATEVERVILLE${check?.ok?' — $'+check.quote.fuelCost:''}`;
      ui.drawing.button(b.x+312,b.y+b.h-108,label,()=>void launch(),!launching&&!ui.accepting);
    }
    return result;
  };
  documents.getMail=getMail;documents.render=render;documents.renderPagedText=paged;
  const destroy=()=>{
    destroyed=true;
    if(documents.getMail===getMail)documents.getMail=oldMail;
    if(documents.render===render)documents.render=oldRender;
    if(documents.renderPagedText===paged)documents.renderPagedText=oldPaged;
    ui.scene.events.off('shutdown',destroy);
  };
  ui.scene.events.once('shutdown',destroy);return {destroy};
}
