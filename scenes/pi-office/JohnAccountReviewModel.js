import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizeJohnReview(data,raw){
 const s={version:1,links:{},verdicts:{},completed:false};if(raw?.version!==1)return s;
 for(const c of data.claims){if(data.sources.some(e=>e.id===raw.links?.[c.id]))s.links[c.id]=raw.links[c.id];if(data.verdicts.some(v=>v.id===raw.verdicts?.[c.id]))s.verdicts[c.id]=raw.verdicts[c.id];}
 s.completed=raw.completed===true&&data.claims.every(c=>s.links[c.id]===c.source&&s.verdicts[c.id]===c.verdict);return s;
}
export function evaluateJohnReview(data,s){for(const c of data.claims){if(!s.links[c.id]||!s.verdicts[c.id])return{ok:false,claimId:c.id,message:__dialogueText("scenes/pi-office/JohnAccountReviewModel.js", "t_142a609c00d812675e0f")};if(s.links[c.id]!==c.source)return{ok:false,claimId:c.id,message:__dialogueText("scenes/pi-office/JohnAccountReviewModel.js", "t_83ca1ae587546de66c9e")};if(s.verdicts[c.id]!==c.verdict)return{ok:false,claimId:c.id,message:__dialogueText("scenes/pi-office/JohnAccountReviewModel.js", "t_d9a9ac436b34a1783073")};}return{ok:true,message:data.success};}
export function editJohnReview(data,raw,claimId,sourceId,verdictId){const s=normalizeJohnReview(data,raw);if(s.completed||!data.claims.some(c=>c.id===claimId))return s;if(data.sources.some(e=>e.id===sourceId))s.links[claimId]=sourceId;if(data.verdicts.some(v=>v.id===verdictId))s.verdicts[claimId]=verdictId;return s;}
