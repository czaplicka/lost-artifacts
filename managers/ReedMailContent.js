import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
export const REED_MAIL_VARIANTS = [
 {id:'formal',label:__dialogueText("managers/ReedMailContent.js", "t_6561aafebbd0580df69a"),body:__dialogueText("managers/ReedMailContent.js", "t_37fa177e69268425bcbb")},
 {id:'discreet',label:__dialogueText("managers/ReedMailContent.js", "t_7185bae96cfc29712457"),body:__dialogueText("managers/ReedMailContent.js", "t_b405aee8cebc8a73f092")},
 {id:'direct',label:__dialogueText("managers/ReedMailContent.js", "t_5b196d41da99d8a63f73"),body:__dialogueText("managers/ReedMailContent.js", "t_8eb45575726bb88ff041")}
];
export function buildReedMailBody(variantId,number,detective){
 const variant=REED_MAIL_VARIANTS.find(v=>v.id===variantId);
 if(!variant||typeof number!=='string'||!number.trim())return null;
 return variant.body.replaceAll('{number}',number.trim()).replaceAll('{detective}',String(detective||__dialogueText("managers/ReedMailContent.js", "t_2653ceeec1fd951707a3")));
}
export function validateReedMailSelection(config,selection,number,detective){
 if(!config||!selection||selection.to!==config.email)return {ok:false,message:__dialogueText("managers/ReedMailContent.js", "t_8412d52a7ec8f7151d7f")};
 const body=buildReedMailBody(selection.variantId,number,detective);
 if(!body)return {ok:false,message:__dialogueText("managers/ReedMailContent.js", "t_edbe78bb2fbcee0ec936")};
 return {ok:true,body,to:config.email,variantId:selection.variantId};
}
