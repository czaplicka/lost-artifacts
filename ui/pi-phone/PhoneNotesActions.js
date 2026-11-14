import { SFX } from './PhoneConfig.js';
export function bindPhoneNotesAction(inv,root,object,action){
 const phone=inv.phone,run=phone.run,caseId=inv.active?.caseId,contact=inv.active?.id||inv.active?.number;
 object.setInteractive({useHandCursor:true}).on('pointerdown',(pointer,x,y,event)=>{
  event?.stopPropagation();
  if(inv.dead||phone.destroyed||!phone.isOpen||phone.directoryOpen||phone.state!=='connected'||phone.run!==run||
    inv.active?.caseId!==caseId||(inv.active?.id||inv.active?.number)!==contact||inv.paper!==root||
    root.active===false||!root.visible||object.active===false||!object.scene||!phone.scene.sys.isActive())return;
  const before={page:inv.notePage,alibi:inv.alibiCloudId,deadMen:inv.dmCloudId,reed:inv.playerTopicCloudId,phase:inv.phase,pending:inv.pending,run:phone.run};
  action();
  const cloudChanged=before.alibi!==inv.alibiCloudId||before.deadMen!==inv.dmCloudId||before.reed!==inv.playerTopicCloudId;
  const phaseChanged=before.phase!==inv.phase||before.pending!==inv.pending||before.run!==phone.run;
  if(!cloudChanged&&!phaseChanged&&before.page!==inv.notePage)phone.playOnce(SFX.page,.5);
  else if(cloudChanged||phaseChanged)phone.sfxClick();
 });return object;
}
