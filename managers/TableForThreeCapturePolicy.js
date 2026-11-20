export const CAPTURE_TARGETS = Object.freeze({
  kiss: Object.freeze({kind:'romance',action:'PHOTOGRAPH_KISS',x:.43,y:.30,w:.15,h:.22}),
  ring: Object.freeze({kind:'ring',action:'PHOTOGRAPH_RING',x:.33,y:.27,w:.36,h:.42}),
  face: Object.freeze({kind:'face',action:'PHOTOGRAPH_FACE',x:.585,y:.31,w:.10,h:.20})
});
export function validateRestaurantFrame(beat,frame){
  const target=CAPTURE_TARGETS[beat];
  if(!target)return {ok:false,reason:'There is no useful photographic event yet.'};
  if(!frame||!['x','y','w','h'].every(k=>Number.isFinite(frame[k])))return {ok:false,reason:'Invalid frame.'};
  if(frame.x<0||frame.y<0||frame.w<=0||frame.h<=0||frame.x+frame.w>1.000001||frame.y+frame.h>1.000001)return {ok:false,reason:'Keep the frame inside the observation view.'};
  const overlap=Math.max(0,Math.min(frame.x+frame.w,target.x+target.w)-Math.max(frame.x,target.x))*Math.max(0,Math.min(frame.y+frame.h,target.y+target.h)-Math.max(frame.y,target.y));
  if(overlap/(target.w*target.h)<.88)return {ok:false,reason:beat==='face'?'Include the entire face.':'Include the interaction, not just one person or the dessert.'};
  if((target.w*target.h)/(frame.w*frame.h)<.23)return {ok:false,reason:'The subject is too small. Use a tighter frame.'};
  return {ok:true,kind:target.kind,action:target.action};
}
