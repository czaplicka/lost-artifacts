import {
  applyHardEvidenceToSuspect,forceSuspectToFailHardEvidence,getDefaultHardEvidenceFromThief,
  normalizeHardEvidence,validateExactlyTwoForensicCandidates,validateProgressiveForensicCandidates
} from './forensicEvidence.js';
import {createDecoySuspect,createVisibleTraits,ensureUniqueIds,ensureUniqueNames,normalizeForensicAttributes,normalizeGenderCode} from './suspectFactory.js';
import {normalizeCityId,safeClone,shuffle} from './suspectGeneratorUtils.js';
import {prepareCaseSuspectState} from './SuspectCaseState.js';
import {createMaterialProfile,getMaterialDossierNotes} from './MaterialEvidence.js';
import {createDustProfile,getDustDossierNotes,getDustProfiles} from './DustEvidence.js';
function resetProgress(s) {
  s.deductionState={eliminated:false,eliminationReasons:[],evidenceMismatches:[],notesUnlocked:[],labStatus:'pending',hypothesisStatus:'pending',interviewStatus:'pending',alibiStatus:'pending'};
  s.restrictedProfile??={};s.restrictedProfile.unlockedFields=[];
  Object.values(s.restrictedProfile.forensicAttributes||{}).forEach(a=>{
    if(a&&typeof a==='object'){a.unlocked=false;delete a.source;delete a.unlockedAt;}
  });return s;
}
function refreshTraits(s) {
  s.publicProfile??={};
  const prev=(s.publicProfile.visibleTraits||[]).filter(t=>!/\bhair\b/i.test(String(t)));
  const visible=createVisibleTraits(s.restrictedProfile.forensicAttributes,prev);
  s.publicProfile.visibleTraits=[...new Set([...visible,
    ...getMaterialDossierNotes(s).map(n=>n.text),...getDustDossierNotes(s).map(n=>n.text)])];
}
function buildPlan(total) {
  const n=total-2;if(n===8)return[5,2,1];
  const first=Math.min(n-2,Math.max(1,Math.round(n*.625))),second=Math.max(1,Math.ceil((n-first)/2));
  return[first,second,n-first-second];
}
export class SuspectGenerator {
  constructor(citySuspectsData={}){this.citySuspectsData=citySuspectsData;}
  getCitySuspects(crimeCityId) {
    const city=normalizeCityId(crimeCityId),data=this.citySuspectsData;
    const filter=items=>items.filter(s=>{const id=normalizeCityId(s.cityId||s.city_id||s.city);return!id||id===city;});
    if(Array.isArray(data))return filter(data);
    if(Array.isArray(data?.suspects))return filter(data.suspects);
    if(Array.isArray(data?.cities)){
      const entry=data.cities.find(e=>normalizeCityId(e.id||e.cityId||e.city)===city);
      return Array.isArray(entry?.suspects)?entry.suspects:[];
    }
    return Array.isArray(data?.[city])?data[city]:[];
  }
  generateCaseSuspects(thief,crimeCityId,{total=10,hardEvidence=[]}={}) {
    if(!thief||typeof thief!=='object')throw new Error('A real thief profile is required.');
    if(!Number.isInteger(total)||total<5)throw new Error('Three-stage generation requires at least five suspects.');
    if(!Array.isArray(hardEvidence))throw new Error('hardEvidence must be an array.');
    const evidence=normalizeHardEvidence(hardEvidence.length?hardEvidence:getDefaultHardEvidenceFromThief(thief));
    if(evidence.length!==3||!['hair_color','blood_type','biological_sex','fingerprint_pattern'].includes(evidence[0].forensicField)||
      !['shoe_size_category','dust_profile'].includes(evidence[1].forensicField)||
      !['handedness','material_profile'].includes(evidence[2].forensicField))throw new Error('Expected identity, footwear/microtrace, handedness/material.');
    const bases=shuffle(this.getCitySuspects(crimeCityId)).slice(0,total-1).map((source,i)=>createDecoySuspect(i,source,{preserveCaseProgress:false}));
    while(bases.length<total-1)bases.push(createDecoySuspect(bases.length));
    const real=safeClone(bases.shift());real.isRealThief=true;
    real.restrictedProfile={unlockedFields:[],forensicAttributes:normalizeForensicAttributes(thief,normalizeGenderCode(thief.gender_code||thief.genderCode||thief.gender))};
    if(thief.materialProfile)real.materialProfile=safeClone(thief.materialProfile);
    if(thief.dustProfile)real.dustProfile=safeClone(thief.dustProfile);
    real.hiddenIdentity=thief.hiddenIdentity?safeClone(thief.hiddenIdentity):{realName:thief.realName||thief.name||null,revealStage:thief.revealStage||'identity_reveal'};
    real.hiddenCaseData={isTrueThief:true,realThiefId:thief.id||null,realThiefName:thief.name||null,realThiefProfile:safeClone(thief)};
    applyHardEvidenceToSuspect(real,evidence);
    const twin=createDecoySuspect(total);twin.isRealThief=false;twin.hiddenIdentity=null;
    twin.hiddenCaseData={isTrueThief:false,isForensicTwin:true};applyHardEvidenceToSuspect(twin,evidence);
    const ordinary=bases.slice(0,total-2),plan=buildPlan(total);
    ordinary.forEach(s=>{s.isRealThief=false;s.hiddenIdentity=null;s.hiddenCaseData={isTrueThief:false,isForensicTwin:false};applyHardEvidenceToSuspect(s,evidence);});
    let cursor=0;
    plan.forEach((count,stage)=>{for(let i=0;i<count;i++){
      const s=ordinary[cursor++];forceSuspectToFailHardEvidence(s,[evidence[stage]],0);
      s.hiddenCaseData.forensicFailureStage=stage;s.hiddenCaseData.forensicFailureField=evidence[stage].forensicField;
    }});
    const suspects=shuffle([real,twin,...ordinary]);ensureUniqueIds(suspects);ensureUniqueNames(suspects);
    const profiles=getDustProfiles();
    suspects.forEach(s=>{
      if(!s.materialProfile)s.materialProfile=createMaterialProfile(Math.random()<.5?'natural_leather':'wool_lanolin',{compatible:Math.random()<.6});
      if(!s.dustProfile)s.dustProfile=createDustProfile(profiles[Math.floor(Math.random()*profiles.length)].id,{compatible:Math.random()<.6});
      refreshTraits(s);resetProgress(s);
    });
    const pacing=validateProgressiveForensicCandidates(suspects,evidence,[total-plan[0],total-plan[0]-plan[1],2]);
    const valid=validateExactlyTwoForensicCandidates(suspects,evidence);console.table(pacing);
    return {
      cityId:normalizeCityId(crimeCityId),suspects,citySuspects:suspects,
      realThiefId:valid.realThiefCaseSuspect.id,realThiefSuspectId:valid.realThiefCaseSuspect.id,trueThiefCaseSuspectId:valid.realThiefCaseSuspect.id,
      forensicTwinSuspectId:valid.forensicTwin.id,hardEvidence:evidence.map(({matches,...e})=>safeClone(e)),
      forensicSurvivorIds:valid.survivors.map(s=>s.id),actualCriminalId:thief.id||null,generatedAt:new Date().toISOString()
    };
  }
  prepareCaseState(data={}){return prepareCaseSuspectState(data,{preserveCaseProgress:false});}
  restoreSavedCaseState(data={}){return prepareCaseSuspectState(data,{preserveCaseProgress:true});}
}
export default SuspectGenerator;
