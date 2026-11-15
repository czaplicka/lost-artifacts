import { dialogueText } from './DialogueText.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import { getTheoryReadiness } from '../crimeBoard/CaseTheoryModel.js';

// Reuse the tutorial's existing catalog entries without starting or advancing it.
const TUTORIAL_TEXT = {
  crime_scene: ['t_396f8165e6c7ddf84c1d','t_698b9cf384ad2ceab4fb'],
  crime_lab: ['t_7eabc10201d8278c339b','t_8adc6da1cbd1d17bfe7b'],
  phone_lab: ['t_08808396627e86370fee','t_e9fbc37b2cdf6615f604'],
  hypothesis: ['t_5e5c6cd8f11508e06b2a','t_85ad93eafb3dae20fee4'],
  suspect_grid: ['t_97f30e451538697cf614','t_6cea0271c6fe2903439d'],
  talk_to_npcs: ['t_c3b96318a759db560542','t_a42b435fc930122264b7'],
  find_liar: ['t_b1f6dfad514e777ebc84','t_90300513a4af31cd8386'],
  visit_apartment: ['t_5b6588dd45cab881a3f5','t_a500a7ac6e4c61b384bc'],
  ticket_lab: ['t_9822c06f13c76e6c47ec','t_9ad172ebdf017a4d7bfa'],
  pursuit: ['t_e76bc9ed34c1b358fd42','t_330f6b7bee175fcfb9dc']
};
const list=value=>Array.isArray(value)?value:[];
function advice(id, lines) {return {id,lines};}
function tutorial(id, extra=[]) {
  return advice(id,[...TUTORIAL_TEXT[id].map(key=>dialogueText('tutorials/CrimeCityTutorial.js',key)),...extra]);
}
function reconstructionFor(state,key) {
  if (state.reconstructedHeists?.[key]) return state.reconstructedHeists[key];
  const r=state.reconstructedHeist;
  if (!r) return null;
  if (r.caseKey!=null && String(r.caseKey)!==key) return null;
  if (r.caseId!=null && String(r.caseId)!==String(state.currentCaseId)) return null;
  if (r.missionId!=null && String(r.missionId)!==String(state.currentMission?.id)) return null;
  if (r.campaignId!=null && r.campaignId!==state._createdAt) return null;
  return r;
}

export function getHQGuidance(state={}) {
  if (state.caseFailed) return advice('case_failed',[
    'This operation has ended. Return to the agency and review the case result before starting another assignment.'
  ]);
  if (state.caseResolved) return advice('case_resolved',[
    'This case is closed. Return to the agency to continue your work and check for your next assignment.'
  ]);
  const mission=state.currentMission;
  if (!mission) return advice('no_assignment',[
    'You have no active agency assignment. Check your agency computer for the next case.',
    'Private work in Home Town is separate: check the classifieds on your office computer.'
  ]);
  const city=state.crimeCityId||state.caseSuspectCityId||mission.city||'unknown_city';
  const key=String(mission.id||mission.caseId||`${city}_${mission.artifact||'default'}`);
  const apartment=state.apartmentProgress?.[String(mission.id||mission.missionId||'unknown_mission')];
  const visited=Boolean(apartment&&(apartment.inventoryVersion===2||apartment.updatedAt));
  const ticket=state.caseData?.ticketAnalyses?.[getEvidenceCaseKey(state)];
  const court=state.courtState;
  if (court && String(court.caseId)===String(state.currentCaseId) && court.campaignId===state._createdAt) {
    return advice('court',[
      'Continue the hearing. Answer from your collected evidence and final Case Theory.',
      'Use the courtroom help button if you need the trial rules again.'
    ]);
  }
  // Later, case-scoped milestones take precedence over old tutorial flags.
  if (visited || ticket?.completed===true) {
    if (ticket?.completed!==true) return tutorial('ticket_lab',[
      'If you have not taken the escape clue yet, finish searching the apartment first. Then have the relevant evidence examined at the lab.'
    ]);
    if (!state.arrestWarrantIssued || state.warrantSuspectId==null) return advice('warrant',[
      'Use the identity clues you have collected to identify the suspect and issue an arrest warrant.',
      'Check the police database. Do not choose a name just because it sounds guilty.'
    ]);
    const readiness=getTheoryReadiness(state);
    if (!readiness.complete) return advice('case_theory',[
      'Open the Case Board and complete Case Theory: identity, motive, means and opportunity.',
      'Choose each conclusion and attach evidence to support it. Keep gathering clues during the pursuit if a section is still missing.'
    ]);
    return tutorial('pursuit',[
      'Follow the travel clues, speak to contacts in each city, and keep your warrant and final theory ready for the arrest.'
    ]);
  }
  const exclusions=state.suspectExclusionState?.[key];
  const grid=state.caseForensics?.[key]?.suspectGrid;
  if (exclusions?.finished===true) {
    const subjects=list(state.caseData?.alibiCases?.[key]?.suspects);
    const filed=subject=>subject.playerConclusion?.locked===true &&
      ['confirmed','contradicted'].includes(subject.playerConclusion.status);
    if (subjects.length && subjects.every(filed)) {
      if (subjects.some(s=>s.playerConclusion.status==='contradicted')) return tutorial('visit_apartment');
      return advice('review_alibis',[
        'Your filed conclusions clear every suspect. Review the witness statements and your alibi reasoning before trying an arrest.',
        'A confirmed alibi is not grounds for an apartment raid.'
      ]);
    }
    const encounters=list(state.crimeCityEncounterState?.[key]);
    const waiting=subjects.filter(s=>!filed(s));
    const witnesses=waiting.flatMap(s=>list(s.witnesses));
    const interviewed=witnesses.length>0&&witnesses.every(w=>encounters.some(e=>
      e.npcId===w.npcId && e.interviewed===true && e.dialogueCompleted===true));
    return tutorial(interviewed?'find_liar':'talk_to_npcs');
  }
  if (grid?.ruledOutEveryone===true) return advice('review_grid',[
    'Your forensic comparison has excluded everyone. Recheck the evidence and your elimination marks before submitting a shortlist.'
  ]);
  if (reconstructionFor(state,key)?.playerTheoryResult) return tutorial('suspect_grid');
  const labDone=state.crimeCityProgress?.[key]?.crimeLabCompleted===true;
  if (labDone) {
    const decision=state.suspectFilesPhoneDecisions?.[key];
    if (!['answer','ignore'].includes(decision)) return tutorial('phone_lab');
    return tutorial('hypothesis');
  }
  const sceneId=mission.scene||'unknown_scene';
  const visitKey=mission.id?`${sceneId}_${mission.id}`:
    `${sceneId}_${mission.city||city||'unknown'}_${mission.artifact||state.currentArtifact||'artifact'}`;
  if (state.specialScenesCompleted?.[visitKey]) return tutorial('crime_lab');
  return tutorial('crime_scene');
}
