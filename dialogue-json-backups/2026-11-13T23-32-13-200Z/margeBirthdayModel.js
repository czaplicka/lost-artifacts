export function evaluateMargeBirthday(data, discoveredClues, answers) {
  const found=new Set(Array.isArray(discoveredClues)?discoveredClues:[]);
  const missing=data.clues.filter(clue=>!found.has(clue.id));
  if(missing.length)return{ok:false,reason:'missing_clues',missingIds:missing.map(clue=>clue.id),message:'Inspect the laptop calendar, coffee mug and monitor note first.'};
  for(const question of data.questions){
    const answer=answers?.[question.id];
    if(!answer)return{ok:false,reason:'missing_answer',questionId:question.id,message:'Answer both deduction questions.'};
    if(!question.options.some(option=>option.id===answer))return{ok:false,reason:'invalid_answer',questionId:question.id,message:'Choose one of the available deductions.'};
    if(answer!==question.answer)return{ok:false,reason:'unsupported',questionId:question.id,message:'That conclusion is not supported. Keep the birthday clues separate from the insurance case.'};
  }
  return{ok:true,reason:'complete',message:data.success};
}
