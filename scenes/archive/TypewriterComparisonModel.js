import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function evaluateTypewriter(data, selected) {
  if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.length!==data.correctIds.length)
    return{ok:false,message:__dialogueText("scenes/archive/TypewriterComparisonModel.js", "t_9fcf3d91b0635d7a3d8c")};
  const wrong=selected.find(id=>!data.correctIds.includes(id));
  if(wrong){const item=data.characters.find(item=>item.id===wrong);return{ok:false,characterId:wrong,message:item?.hint||__dialogueText("scenes/archive/TypewriterComparisonModel.js", "t_fbc0e6c35c412ea0c438")};}
  return{ok:true,message:data.success};
}
