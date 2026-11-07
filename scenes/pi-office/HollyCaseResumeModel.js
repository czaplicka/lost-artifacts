export const HOLLY_RESUME_STAGES=Object.freeze([
 {id:'finale',after:'john_formal_confrontation_completed',completion:'holly_final_choice_made',label:'HOLLY / FINAL DECISION',service:'./hollyFinaleService.js',getter:'getHollyFinale',launcher:'./hollyFinaleLauncher.js',open:'openHollyFinale'},
 {id:'confrontation',after:'john_incident_attachments_reviewed',completion:'john_formal_confrontation_completed',label:'HOLLY / CONFRONT JOHN',service:'./johnConfrontationService.js',getter:'getJohnConfrontation',launcher:'./johnConfrontationLauncher.js',open:'openJohnConfrontation'},
 {id:'incidents',after:'john_primary_records_examined',completion:'john_incident_attachments_reviewed',label:'HOLLY / INCIDENT FILES',service:'./johnIncidentFilesService.js',getter:'getJohnIncidentFiles',launcher:'./johnIncidentFilesLauncher.js',open:'openJohnIncidentFiles'},
 {id:'primary',after:'john_account_independent_review_completed',completion:'john_primary_records_examined',label:'HOLLY / PRIMARY RECORDS',service:'./johnPrimaryRecordsService.js',getter:'getJohnPrimaryRecords',launcher:'./johnPrimaryRecordsLauncher.js',open:'openJohnPrimaryRecords'},
 {id:'review',after:'john_met_in_warsaw',completion:'john_account_independent_review_completed',label:'HOLLY / VERIFY ACCOUNT',service:'./johnAccountReviewService.js',getter:'getJohnAccountReview',launcher:'./johnAccountReviewLauncher.js',open:'openJohnAccountReview'},
 {id:'warsaw',after:'john_warsaw_lead_unlocked',completion:'john_met_in_warsaw',label:'HOLLY / FIND JOHN',service:'./johnWarsawMeetingService.js',getter:'getWarsawMeeting',launcher:'./johnWarsawMeetingLauncher.js',open:'openWarsawMeeting'}
].map(s=>Object.freeze(s)));
export function selectHollyResume(hasFlag,mainCaseClosed=false){
 if(hasFlag('holly_final_choice_made'))return{...HOLLY_RESUME_STAGES[0],label:'HOLLY / VIEW ENDING',ending:true};
 if(mainCaseClosed)return{id:'legacy_closed',label:'HOLLY / CLOSED CASE',blocked:true,message:'This main investigation is already closed, but no ending from the new finale is recorded. No new choice will be created.'};
 const stage=HOLLY_RESUME_STAGES.find(s=>hasFlag(s.after));return stage?{...stage,ending:false}:null;
}
export function validateHollyResume(entry,state,hasFlag,mainCaseClosed=false){
 if(!state||state.eligible!==true)return'The saved prerequisites do not permit this stage. No story flags were changed.';
 if(state.completed===true&&!hasFlag(entry.completion))return'The stage progress and completion flag disagree. No story flags were repaired automatically.';
 if(entry.ending&&state.completed!==true)return'The ending flag exists, but its validated outcome is missing. No new ending will be selected.';
 if(entry.id==='finale'&&state.completed===true&&!mainCaseClosed)return'The ending and main-story milestone disagree. No new ending will be selected.';
 return null;
}
