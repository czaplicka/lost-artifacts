export function normalizeFinancial(data,raw){
 const s={version:1,transactionId:null,alteredId:null,companyLine:0,companyCompleted:false,attempts:0};if(raw?.version!==1)return s;
 if(raw.transactionId===data.leadTransaction)s.transactionId=raw.transactionId;
 if(s.transactionId&&raw.alteredId===data.alteredCopy)s.alteredId=raw.alteredId;
 if(s.alteredId)s.companyLine=Number.isInteger(raw.companyLine)?Math.max(0,Math.min(data.companyLines.length-1,raw.companyLine)):0;
 s.companyCompleted=Boolean(s.alteredId&&raw.companyCompleted===true&&s.companyLine===data.companyLines.length-1);
 s.attempts=Number.isInteger(raw.attempts)&&raw.attempts>=0?raw.attempts:0;return s;
}
export function chooseFinancialTransaction(data,raw,id){const state=normalizeFinancial(data,raw);if(state.transactionId)return{ok:true,state};state.attempts++;if(id!==data.leadTransaction)return{ok:false,state};state.transactionId=id;return{ok:true,state};}
export function chooseAlteredSeal(data,raw,id){const state=normalizeFinancial(data,raw);if(!state.transactionId)return{ok:false,state};if(state.alteredId)return{ok:true,state};state.attempts++;if(id!==data.alteredCopy)return{ok:false,state};state.alteredId=id;return{ok:true,state};}
export function advanceFinancialCompany(data,raw){const s=normalizeFinancial(data,raw);if(!s.alteredId||s.companyCompleted)return s;if(s.companyLine<data.companyLines.length-1)s.companyLine++;else s.companyCompleted=true;return s;}
export function financialEligible(data,count,hasFlag){return Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
