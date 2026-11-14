export function evaluateOfficeDust(data, placements, missingTrace) {
  const entries=Object.entries(placements||{}).filter(([,id])=>id);
  if(entries.length!==data.objects.length)return{ok:false,message:'Place all four objects before drawing a conclusion.'};
  if(new Set(entries.map(([,id])=>id)).size!==entries.length)return{ok:false,message:'An object cannot occupy two positions.'};
  for(const [traceId,objectId]of entries){
    const trace=data.traces.find(item=>item.id===traceId);
    if(!trace||trace.objectId!==objectId)return{ok:false,traceId,message:'An object does not fit this footprint. Compare the outline, handle and proportions.'};
  }
  const empty=data.traces.find(trace=>trace.objectId===null);
  if(missingTrace!==empty.id)return{ok:false,message:'Select the empty footprint, then mark it as the missing object.'};
  return{ok:true,message:data.success,missingTrace:empty.id};
}
