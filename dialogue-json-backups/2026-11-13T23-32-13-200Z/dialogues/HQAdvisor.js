import { isCompletedLabResult } from '../scenes/CSI/LabResultState.js';
import { getEvidenceCaseKey, readApartmentEvidence, evidenceMatchesCase } from '../managers/ApartmentEvidenceModel.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';
import { getPursuitCityContext, normalizePursuitCityId } from '../managers/PursuitCityContext.js';

const list = value => Array.isArray(value) ? value : [];
const finalAlibi = value => ['confirmed','contradicted'].includes(value);
const advice = (id,title,lines,details) => ({id,title,lines,details});

function keys(state) {
  const m=state.currentMission || {};
  const city=state.crimeCityId || 'unknown';
  const progress=String(m.id || m.caseId || `${city}_${m.artifact || 'default'}`);
  const lab=String(m.id ?? m.caseId ?? m.caseIndex ?? `${city}_${m.artifact ?? 'default_artifact'}`);
  const visit=m.id ? `${m.scene || 'unknown_scene'}_${m.id}`
    : `${m.scene || 'unknown_scene'}_${m.city || city}_${m.artifact || state.currentArtifact || 'artifact'}`;
  return {progress,lab,visit,evidence:getEvidenceCaseKey(state)};
}
function apartmentVisited(state,key) {
  if (state.caseData?.apartmentVisits?.[key]===true) return true;
  const caseId=state.currentCaseId ?? null,start=state.investigationStartTime ?? null;
  if (caseId===null && !Number.isFinite(start)) return false;
  const artifactKey=state.currentMission?.artifactKey || state.currentMission?.artifact?.artifactKey || '';
  return Object.values(state.apartmentProgress || {}).some(progress=>
    Object.keys(progress?.roomPackSelections || {}).some(raw=>{
      try {
        const identity=JSON.parse(raw);
        return Array.isArray(identity) && identity.length===5 && identity[2]===artifactKey
          && identity[3]===caseId && identity[4]===start;
      } catch {return false;}
    }));
}
function belongsToCase(record,state) {
  return record && record.caseId!=null && state.currentCaseId!=null
    && String(record.caseId)===String(state.currentCaseId)
    && (record.campaignId==null || record.campaignId===state._createdAt);
}
function labCompleted(state,k) {
  if (state.crimeCityProgress?.[k.progress]?.crimeLabCompleted===true) return true;
  if (state.crimeCityProgress?.[k.lab]?.crimeLabCompleted!==true) return false;
  const data=state.caseForensics?.[k.lab];
  return Boolean(data && [data.identityEvidenceResult,data.traceEvidenceResults?.[0],data.traceEvidenceResults?.[1]]
    .every(result=>isCompletedLabResult(result,{caseKey:k.lab})
      && (result.cityId==null || state.crimeCityId==null || result.cityId===state.crimeCityId)));
}
function alibiProgress(state,key) {
  const subjects=list(state.caseData?.alibiCases?.[key]?.suspects);
  if (!subjects.length) return {available:false,pending:0,contradicted:0};
  const ids=subjects.map(s=>s?.suspectId);
  if (ids.some(id=>typeof id!=='string' || !id.trim()) || new Set(ids).size!==ids.length) {
    return {available:false,pending:0,contradicted:0};
  }
  let pending=0,contradicted=0;
  for (const subject of subjects) {
    const filed=subject.playerConclusion;
    const legacy=list(state.caseSuspects).find(s=>s?.id===subject.suspectId)?.deductionState?.alibiStatus;
    const status=filed?.locked===true && finalAlibi(filed.status) ? filed.status : finalAlibi(legacy) ? legacy : null;
    if (!status) pending++;
    if (status==='contradicted') contradicted++;
  }
  return {available:true,pending,contradicted};
}

export function getHQAdvice(state={}, {inventoryItems=[]}={}) {
  const court=state.courtState,chase=state.chaseState;
  if (belongsToCase(court,state) && court.phase && court.phase!=='verdict') return advice('court','THE COURT HEARING',
    ['The case is in court. Answer from the evidence you actually collected.'],
    ['Read the prosecutor’s question carefully and check your notebook and Case Theory.','An impressive guess is still a guess. The defence has a special folder for those.']);
  if (state.caseFailed===true) return advice('failed','CASE CLOSED',
    ['This attempt has ended. Use the failure screen to review the result and choose your next action.'],
    ['HQ cannot reopen a failed case by telephone. Review the failure message before retrying.']);
  if (state.caseResolved===true) return advice('resolved','CASE COMPLETE',
    ['This case has been resolved. Finish the results screen and return to the agency.'],
    ['Review your case results before starting the next assignment.']);
  if (!state.currentMission || !state.isGameActive) return advice('no_case','NO ACTIVE AGENCY CASE',
    ['There is no active agency investigation to advise on. Return to the agency and check your assignment.'],
    ['This line covers agency cases. Private investigations follow their own leads. Different paperwork. Equally alarming filing cabinets.']);
  const clock=getCaseClockStatus(state);
  if (clock.totalExpired || clock.crimeExpired) return advice('expired','DEADLINE REACHED',
    ['The current investigation deadline has expired. A call to HQ does not reset the clock.'],
    ['Follow the game’s case-outcome screen. Repeated calls cannot extend an expired deadline.']);
  if (belongsToCase(chase,state) && ['running','active','pursuit','review','caught'].includes(chase.phase)) return advice('chase','THE PURSUIT',
    [chase.phase==='caught' ? 'The suspect has been caught. Follow the arrest and evidence-review prompts.' : 'Follow the pursuit screen and its available choices.'],
    ['Your warrant must identify the person you arrest. Keep the case evidence consistent with your Case Theory.','HQ cannot steer your legs over the telephone. We tried. Legal objected.']);
  const awake=state.currentMission?.energyBalance?.awakeMinutes;
  if ((Number.isFinite(awake) && awake>=20*60) || (Number.isFinite(state.energy) && state.energy<=3)) {
    return advice('rest','REST BEFORE CONTINUING',
      ['Get some sleep at a hotel before continuing the investigation.'],
      ['Open the hotel location or hotel option available in your current city and book a rest. Food does not replace sleep after twenty hours awake.',
       'Once you have rested, call HQ again for the next investigation step. Your pillow is not a suspect. Do not interrogate it.']);
  }
  const k=keys(state);
  const analysis=state.caseData?.ticketAnalyses?.[k.evidence];
  if (state.escapePhaseActive===true && analysis?.completed) {
    const manager=state.routeManager;
    const route=list(manager?.route ?? state.escapeRoute);
    const index=Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : Number(state.routeIndex)||0;
    const complete=manager?.state==='DONE' || (route.length>0 && index>=route.length);
    const context=getPursuitCityContext(state,state.currentCityId);
    if (!context.isCorrectCity && !complete && normalizePursuitCityId(state.currentCityId)!=='hq') return advice('wrong_city','RECHECK THE TRAIL',
      ['This location is not a confirmed stop on your current trail. Recheck the evidence before booking another trip.'],
      ['Open your notebook and compare the travel clues. Use your travel history to return to the last established stop if necessary.','HQ will not invent a destination. That is how we lost the previous geography department.']);
    if (complete) return advice('finale','PREPARE THE ARREST',
      [state.arrestWarrantIssued ? 'You have reached the end of the trail. Check your warrant and Case Theory before identifying the suspect.'
        : 'You have reached the end of the trail. Prepare the arrest warrant before committing to the arrest.'],
      ['Open the warrant form and check the identity against the evidence you gathered. Complete the required Case Theory fields.','Then use the suspect-identification and pursuit prompts. HQ will not select a photograph for you.']);
    return advice('travel','FOLLOW THE TRAVEL EVIDENCE',
      ['Use your notebook to work out the next destination, then compare the available travel options.'],
      [context.isCrimeCity ? 'The laboratory finding from the apartment evidence starts the international trail.'
        : 'Question local witnesses about onward travel and compare their clues with your atlas and notebook.',
       'An airport code, currency or landmark can narrow the destination. You still make the deduction.','Before the final arrest, prepare the warrant and complete your Case Theory.']);
  }
  const current=normalizePursuitCityId(state.currentCityId),crime=normalizePursuitCityId(state.crimeCityId);
  if (current && crime && current!==crime) return advice('go_crime_city','RETURN TO THE CRIME CITY',
    [`Your current investigation work is in ${state.currentMission.city || 'the crime city listed in your Case File'}.`],
    ['Open travel and return to the crime city named in the assignment. The international pursuit begins after the apartment evidence has been analysed.']);
  if (!state.specialScenesCompleted?.[k.visit]) return advice('hidden_objects','EXAMINE THE CRIME SCENE',
    ['Start with the Crime Scene. Collect the evidence from the hidden-object search.'],
    ['On the crime-city map, open Crime Scene and complete the search. Then take the collected evidence to the Crime Lab.','The thief left clues, not a forwarding address. Standards are slipping.']);
  if (!labCompleted(state,k)) {
    const data=state.caseForensics?.[k.lab];
    const done=[data?.identityEvidenceResult,data?.traceEvidenceResults?.[0],data?.traceEvidenceResults?.[1]]
      .filter(result=>isCompletedLabResult(result,{caseKey:k.lab})).length;
    return advice('csi','COMPLETE THE LAB ANALYSES',
      [`Visit the Crime Lab and finish the three evidence analyses. Recorded results: ${done}/3.`],
      ['Complete the identity-evidence station and both trace-evidence stations. Read each result before leaving.','Entering the laboratory is not the same thing as doing science. Apparently that distinction matters.']);
  }
  if (!['answer','ignore'].includes(state.suspectFilesPhoneDecisions?.[k.progress])) return advice('lab_call','RESPOND TO THE LAB-REPORT CALL',
    ['Return to the crime-city map and respond to the incoming HQ call about the lab report.'],
    ['The suspect files remain sealed until that call is answered or dismissed. Look for the incoming-call screen, not another laboratory analysis.']);
  const reconstruction=state.reconstructedHeists?.[k.progress] || state.reconstructedHeist;
  if (!(typeof reconstruction?.playerTheoryResult==='string' && reconstruction.playerTheoryResult.length)) return advice('hypothesis','RECONSTRUCT THE THEFT',
    ['Complete the heist reconstruction: match the evidence cards to the three questions.'],
    ['Use the reconstruction/Mastermind board. Feedback distinguishes a correct placement, a misplaced useful clue and an unsuitable clue.','A plausible story is a start. Evidence is the part that keeps it out of the fiction section.']);
  if (state.suspectExclusionState?.[k.progress]?.finished!==true) return advice('suspects','NARROW THE SUSPECT LIST',
    ['Open Suspect Files and use the laboratory evidence and reconstruction to narrow the list.'],
    ['Compare the suspects against your recorded findings. Finish the exclusion step before investigating the remaining alibis.','Do not choose the person with the most suspicious hat. We no longer accept that as a forensic method.']);
  const alibis=alibiProgress(state,k.progress);
  if (!alibis.available) return advice('alibi_setup','OPEN THE REMAINING ALIBIS',
    ['Open the remaining suspects’ alibi files to continue the witness investigation.'],
    ['Begin from Suspect Files and open an alibi investigation. If no alibi records appear, reopen the files; HQ cannot infer missing witness records.']);
  if (alibis.pending>0) return advice('alibis','FINISH EVERY ALIBI',
    [`There are ${alibis.pending} alibi conclusions still to file. Resolve every remaining suspect’s alibi.`],
    ['For each suspect, interview all three witnesses. Place their three cards on the alibi timeline and file a conclusion.','Disproving one alibi is not enough: the apartment dispatch stays locked until all the alibis are resolved.']);
  if (!alibis.contradicted) return advice('alibi_blocked','CHECK THE FILED CONCLUSIONS',
    ['Your filed conclusions do not contradict any suspect’s alibi. HQ cannot authorise the apartment dispatch on that basis.'],
    ['Review the filed witness timelines and conclusions in the alibi files. Filed conclusions are final; another phone call will not change them.']);
  if (!apartmentVisited(state,k.evidence)) return advice('apartment','VISIT THE SUSPECT APARTMENT',
    ['Return to the crime-city map and open the apartment linked to the disproved alibi.'],
    ['The apartment location becomes available after every alibi has a filed conclusion and at least one has been contradicted. Search it for evidence of where the suspect went.']);
  if (!analysis?.completed) {
    const evidence=list(inventoryItems).map(readApartmentEvidence).filter(item=>item && evidenceMatchesCase(item,state));
    const hasLead=evidence.some(item=>!item.isRedHerring && !item.isArtifact && (item.isEscapeClue || item.metadata?.ticketEvidence===true
      || ['torn_ticket','plane_ticket_receipt','plane_booking','ticket_identity_matched'].includes(item.originalId)));
    const hasFragments=evidence.some(item=>item.isEscapeFragment);
    return advice('apartment_evidence','ANALYSE THE ESCAPE EVIDENCE',
      [hasLead ? 'Take the apartment travel evidence back to the Crime Lab.'
        : hasFragments ? 'Check the fragments recovered from the apartment. Combine matching pieces before handing them to the lab.'
          : 'Search the apartment for evidence of onward travel, then bring the relevant item to the Crime Lab.'],
      ['At the lab, close the assistant’s conversation, open Inventory with I or the bottom menu, and drag the evidence onto the assistant.','Reading an object in your inventory is not a laboratory handover. Even if you read it in a scientific voice.']);
  }
  return advice('clock_check','RECHECK THE LAB FINDING',
    ['Your travel analysis is recorded, but the international pursuit is not active. Return to the lab and review the finding.'],
    ['Ask the assistant to remind you what the apartment evidence revealed. HQ will not silently regenerate a route or restart the clock.']);
}

export function makeHQEntry(hint,{detailed=false}={}) {
  return {speaker:'Headquarters',portraitKey:'portrait_hq',
    lines:[`HQ — ${hint.title}`,...(detailed ? hint.details : hint.lines)]};
}
