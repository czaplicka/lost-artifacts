import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export const HOLLY_RESUME_STAGES=Object.freeze([
 {id:'finale',after:'john_formal_confrontation_completed',completion:'holly_final_choice_made',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_5fc2471ac5e5adbb2cb6"),service:'./hollyFinaleService.js',getter:'getHollyFinale',launcher:'./hollyFinaleLauncher.js',open:'openHollyFinale'},
 {id:'confrontation',after:'john_incident_attachments_reviewed',completion:'john_formal_confrontation_completed',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_4f645bbfda398340a129"),service:'./johnConfrontationService.js',getter:'getJohnConfrontation',launcher:'./johnConfrontationLauncher.js',open:'openJohnConfrontation'},
 {id:'incidents',after:'john_primary_records_examined',completion:'john_incident_attachments_reviewed',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_48f3938ee8cb7554cb5d"),service:'./johnIncidentFilesService.js',getter:'getJohnIncidentFiles',launcher:'./johnIncidentFilesLauncher.js',open:'openJohnIncidentFiles'},
 {id:'primary',after:'john_account_independent_review_completed',completion:'john_primary_records_examined',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_2122b892fab95ba73987"),service:'./johnPrimaryRecordsService.js',getter:'getJohnPrimaryRecords',launcher:'./johnPrimaryRecordsLauncher.js',open:'openJohnPrimaryRecords'},
 {id:'review',after:'john_met_in_warsaw',completion:'john_account_independent_review_completed',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_4dcd58e506ff92245184"),service:'./johnAccountReviewService.js',getter:'getJohnAccountReview',launcher:'./johnAccountReviewLauncher.js',open:'openJohnAccountReview'},
 {id:'warsaw',after:'john_warsaw_lead_unlocked',completion:'john_met_in_warsaw',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_c5af36ae7c4c3e3c57a4"),service:'./johnWarsawMeetingService.js',getter:'getWarsawMeeting',launcher:'./johnWarsawMeetingLauncher.js',open:'openWarsawMeeting'}
].map(s=>Object.freeze(s)));
export function selectHollyResume(hasFlag,mainCaseClosed=false){
 if(hasFlag('holly_final_choice_made'))return{...HOLLY_RESUME_STAGES[0],label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_9b5780b6d72567c6143f"),ending:true};
 if(mainCaseClosed)return{id:'legacy_closed',label:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_becd1cbf40464912f2fa"),blocked:true,message:__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_1e2b32f2caf1a024f2c7")};
 const stage=HOLLY_RESUME_STAGES.find(s=>hasFlag(s.after));return stage?{...stage,ending:false}:null;
}
export function validateHollyResume(entry,state,hasFlag,mainCaseClosed=false){
 if(!state||state.eligible!==true)return__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_4a21c2822a850beb0916");
 if(state.completed===true&&!hasFlag(entry.completion))return__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_13db54174ae19924e5f9");
 if(entry.ending&&state.completed!==true)return__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_f6f9e0666d009379e440");
 if(entry.id==='finale'&&state.completed===true&&!mainCaseClosed)return__dialogueText("scenes/pi-office/HollyCaseResumeModel.js", "t_69f7678aa45421beaf67");
 return null;
}
