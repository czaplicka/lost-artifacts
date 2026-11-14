import { SCORE_CONFIG } from './config/ScoreConfig.js';

export class HypothesisEvaluator {
  static SLOT_LABELS = ['ENTRY','ACCESS','ESCAPE'];
  static DEFAULT_FUNNY_LINES = [
    "The thief used... {card}? Bold. Wrong, but bold.",
    "A {card}. Really. Write that down — it's going in the report.",
    "Sure. The {card}. And I suppose the getaway was a unicycle.",
    "Detective, the {card} has an alibi. And a lawyer.",
    "The {card}. That's not evidence, that's a cry for help."
  ];
  static prepareCards(reconstruction,sceneId=null,cityId=null) {
    const allCards=Array.isArray(reconstruction?.allCards) ? reconstruction.allCards : [];
    let sourceCards=allCards.filter(card=>card && typeof card==='object')
      .filter(card=>!sceneId || card.scene===sceneId).filter(card=>!cityId || card.cityId===cityId);
    if (!sourceCards.length) sourceCards=allCards.filter(card=>card && typeof card==='object');
    const uniqueCards=[],seen=new Set();
    sourceCards.forEach((card,index)=>{
      const key=`${card.id || card.item || index}_${card.scene || ''}_${card.cityId || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      const reconstructionUses=Array.isArray(card.reconstructionUses) ? card.reconstructionUses
        .filter(use=>use && typeof use==='object').map(use=>({...use,skills:Array.isArray(use.skills) ? [...use.skills] : []})) : [];
      uniqueCards.push({...card,id:card.id || `card_${index}`,item:card.item || `Clue ${index+1}`,
        text:card.text || card.item || `Clue ${index+1}`,skills:Array.isArray(card.skills) ? [...card.skills] : [],
        scene:card.scene || sceneId,cityId:card.cityId || cityId,
        correctOrder:Number.isInteger(card.correctOrder) ? card.correctOrder : -1,
        isCorrect:Boolean(card.isCorrect),clueType:card.clueType || 'soft_clue',
        questionId:card.questionId ?? null,slotSentence:card.slotSentence ?? null,answer:card.answer ?? null,
        reconstructionUses,heistExplanation:card.heistExplanation || '',trueExplanation:card.trueExplanation || '',
        isRedHerring:Boolean(card.isRedHerring),funnyLines:Array.isArray(card.funnyLines) ? [...card.funnyLines] : []});
    });
    const correctCards=uniqueCards.filter(card=>card.isCorrect).sort((a,b)=>a.correctOrder-b.correctOrder).slice(0,3);
    const distractorCards=uniqueCards.filter(card=>!card.isCorrect).slice(0,3);
    let availableCards=this.shuffleArray([...correctCards,...distractorCards]);
    while (availableCards.length<6) {
      const missing=uniqueCards.find(card=>!availableCards.some(existing=>existing.id===card.id));
      if (!missing) break;
      availableCards.push({...missing});
    }
    availableCards=this.shuffleArray(availableCards.slice(0,6));
    return {correctCards,distractorCards,availableCards};
  }
  static evaluateGuess(orderedCards,activeSlotCount=3) {
    const result=new Array(activeSlotCount).fill('red');
    const solutionUsed=new Array(activeSlotCount).fill(false),guessUsed=new Array(activeSlotCount).fill(false);
    for (let i=0;i<activeSlotCount;i++) {
      const card=orderedCards[i];
      if (card?.isCorrect && card.correctOrder===i) {result[i]='green';solutionUsed[i]=true;guessUsed[i]=true;}
    }
    for (let i=0;i<activeSlotCount;i++) {
      if (guessUsed[i]) continue;
      const card=orderedCards[i];
      if (!card?.isCorrect) continue;
      for (let j=0;j<activeSlotCount;j++) {
        if (solutionUsed[j]) continue;
        if (card.correctOrder===j) {result[i]='yellow';solutionUsed[j]=true;guessUsed[i]=true;break;}
      }
    }
    return result;
  }
  static collectUniqueSkills(cards=[]) {
    const result=[];
    cards.forEach(card=>(Array.isArray(card?.skills) ? card.skills : []).forEach(skill=>{
      const text=String(skill).trim();
      if (text && !result.some(existing=>existing.toLowerCase()===text.toLowerCase())) result.push(text);
    }));
    return result;
  }
  static determineResult(feedback,attemptsLeft) {
    if (!Array.isArray(feedback) || feedback.length!==3) throw new Error('Expected three hypothesis feedback slots.');
    if (feedback.every(value=>value==='green')) {
      const attempt=Math.max(1,4-Math.max(0,Number(attemptsLeft)||0));
      const score=attempt===1 ? SCORE_CONFIG.HYPOTHESIS_FIRST_TRY
        : attempt===2 ? SCORE_CONFIG.HYPOTHESIS_SECOND_TRY : SCORE_CONFIG.HYPOTHESIS_THIRD_TRY;
      return {resultLabel:'exact',score,message:'Excellent reconstruction. You nailed the sequence.',color:'#7CFC00',isFinal:true};
    }
    if (attemptsLeft>0) return {resultLabel:'continue',score:0,
      message:'Not quite. Adjust the timeline and try again.',color:'#ffd966',isFinal:false};
    const matches=feedback.filter(value=>value==='green' || value==='yellow').length;
    return {resultLabel:matches>=2 ? 'partial' : 'weak',score:SCORE_CONFIG.HYPOTHESIS_EXHAUSTED_PENALTY,
      message:matches>=2 ? 'Promising lead. Part of the sequence fits.' : 'Theory recorded, but the sequence still needs work.',
      color:matches>=2 ? '#ffcf66' : '#ff9f80',isFinal:true};
  }
  static buildNarrative(orderedCards) {
    return orderedCards.filter(card=>card?.isCorrect && card.heistExplanation).map(card=>card.heistExplanation);
  }
  static getFunnyLine(card) {
    const lines=Array.isArray(card?.funnyLines) && card.funnyLines.length ? card.funnyLines : this.DEFAULT_FUNNY_LINES;
    return lines[Math.floor(Math.random()*lines.length)].replace('{card}',(card?.item || 'that').toLowerCase());
  }
  static shuffleArray(array) {
    const result=[...array];
    for (let i=result.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
}
