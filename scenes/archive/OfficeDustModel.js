import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function evaluateOfficeDust(data, placements, missingTrace) {
  const entries=Object.entries(placements||{}).filter(([,id])=>id);
  if(entries.length!==data.objects.length)return{ok:false,message:__dialogueText("scenes/archive/OfficeDustModel.js", "t_988bcd3207e18ecc8f92")};
  if(new Set(entries.map(([,id])=>id)).size!==entries.length)return{ok:false,message:__dialogueText("scenes/archive/OfficeDustModel.js", "t_e5a651791c106e6a2146")};
  for(const [traceId,objectId]of entries){
    const trace=data.traces.find(item=>item.id===traceId);
    if(!trace||trace.objectId!==objectId)return{ok:false,traceId,message:__dialogueText("scenes/archive/OfficeDustModel.js", "t_bb7abe837ece6035e560")};
  }
  const empty=data.traces.find(trace=>trace.objectId===null);
  if(missingTrace!==empty.id)return{ok:false,message:__dialogueText("scenes/archive/OfficeDustModel.js", "t_58398998c71f219961f8")};
  return{ok:true,message:data.success,missingTrace:empty.id};
}
