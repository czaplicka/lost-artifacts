export const CAPTURE_TARGETS = Object.freeze({
  lift: Object.freeze({kind:'lift',action:'PHOTOGRAPH_LIFT',x:.42,y:.35,w:.16,h:.335}),
  face: Object.freeze({kind:'face',action:'PHOTOGRAPH_FACE',x:.46,y:.23,w:.08,h:.14})
});
export function validateShortShortsFrame(beat,frame){
  const target=CAPTURE_TARGETS[beat];
  if(!target)return {ok:false,reason:'There is nothing worth photographing yet.'};
  if(!frame||!['x','y','w','h'].every(k=>Number.isFinite(frame[k])))return {ok:false,reason:'Invalid frame.'};
  if(frame.x<0||frame.y<0||frame.w<=0||frame.h<=0||frame.x+frame.w>1.000001||frame.y+frame.h>1.000001)return {ok:false,reason:'Keep the frame inside the observation view.'};
  const overlap=Math.max(0,Math.min(frame.x+frame.w,target.x+target.w)-Math.max(frame.x,target.x))*Math.max(0,Math.min(frame.y+frame.h,target.y+target.h)-Math.max(frame.y,target.y));
  if(overlap/(target.w*target.h)<.88)return {ok:false,reason:beat==='face'?'Include the entire face.':'Include the refrigerator and the shorts.'};
  if((target.w*target.h)/(frame.w*frame.h)<.23)return {ok:false,reason:'The subject is too small. Use a tighter frame.'};
  return {ok:true,kind:target.kind,action:target.action};
}
export function reviewShortShortsEvidence(state,evidence,rendererVersion=1){
  const issues=[];
  for(const [key,kind] of [['liftPhoto','lift'],['facePhoto','face']]){
    const photo=state?.[key];
    if(!photo){issues.push('Missing '+kind+' photograph.');continue;}
    const record=evidence?.[photo.evidenceId];
    if(!record){issues.push('Missing saved crop for '+kind+' photograph.');continue;}
    const checked=validateShortShortsFrame(record.beat,record.frame);
    if(record.rendererVersion!==rendererVersion||record.kind!==kind||record.beat!==kind||!checked.ok||checked.kind!==kind)issues.push('The '+kind+' crop is invalid.');
    if(record.event!==photo.event)issues.push('The '+kind+' crop belongs to a different event.');
  }
  if(state?.liftPhoto&&state?.facePhoto){
    if(state.liftPhoto.event!==state.facePhoto.event)issues.push('Photographs must come from the same lift.');
    if(state.liftPhoto.sequence>=state.facePhoto.sequence)issues.push('The lift must be photographed first.');
  }
  return {ok:issues.length===0,issues};
}
