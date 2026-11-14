export const REED_MAIL_VARIANTS = [
 {id:'formal',label:'FORMAL',body:'Dear Ms Sutton,\n\nI am a private investigator making enquiries concerning Daniel Reed and his recent visit to Hotel Miramar. I would appreciate an opportunity to speak with you privately.\n\nPlease contact me on {number}.\n\nKind regards,\n{detective}'},
 {id:'discreet',label:'DISCREET',body:'Hello Claire,\n\nI am looking into a private matter involving Daniel Reed. I would prefer not to discuss the details by email. Could you call me when you have a quiet moment?\n\nYou can reach me on {number}.\n\nThank you,\n{detective}'},
 {id:'direct',label:'DIRECT',body:'Hello Claire,\n\nI am a private investigator. I need to ask you about Daniel Reed and the Miramar reception. Please call me so that we can discuss it directly.\n\nMy number is {number}.\n\nRegards,\n{detective}'}
];
export function buildReedMailBody(variantId,number,detective){
 const variant=REED_MAIL_VARIANTS.find(v=>v.id===variantId);
 if(!variant||typeof number!=='string'||!number.trim())return null;
 return variant.body.replaceAll('{number}',number.trim()).replaceAll('{detective}',String(detective||'Detective'));
}
export function validateReedMailSelection(config,selection,number,detective){
 if(!config||!selection||selection.to!==config.email)return {ok:false,message:'Select the recipient from your field notes.'};
 const body=buildReedMailBody(selection.variantId,number,detective);
 if(!body)return {ok:false,message:'Choose a message and a reply telephone number.'};
 return {ok:true,body,to:config.email,variantId:selection.variantId};
}
