import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
export function evaluateMargeBirthday(data, discoveredClues, answers) {
  const found=new Set(Array.isArray(discoveredClues)?discoveredClues:[]);
  const missing=data.clues.filter(clue=>!found.has(clue.id));
  if(missing.length)return{ok:false,reason:'missing_clues',missingIds:missing.map(clue=>clue.id),message:__dialogueText("margeBirthdayModel.js", "t_a4423598bbf04db5f11e")};
  for(const question of data.questions){
    const answer=answers?.[question.id];
    if(!answer)return{ok:false,reason:'missing_answer',questionId:question.id,message:__dialogueText("margeBirthdayModel.js", "t_37194657169650796874")};
    if(!question.options.some(option=>option.id===answer))return{ok:false,reason:'invalid_answer',questionId:question.id,message:__dialogueText("margeBirthdayModel.js", "t_b0e8a4832fd9250c325c")};
    if(answer!==question.answer)return{ok:false,reason:'unsupported',questionId:question.id,message:__dialogueText("margeBirthdayModel.js", "t_8009ccc7ae57067eb615")};
  }
  return{ok:true,reason:'complete',message:data.success};
}
