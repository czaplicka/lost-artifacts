export const CASE_ID = 'pi_table_for_three';
export const VERSION = 1;
export const RING_ID = 'table_for_three_ring';

export const STAGES = Object.freeze({
  BRIEFING:'briefing', COMPANY:'company', OFFICE:'office', LEAD:'lead',
  OBSERVATION:'observation', RING:'ring', KITCHEN:'kitchen', REVEAL:'reveal', REPORT:'report', CLOSED:'closed'
});

export function createCaseState() {
  return {
    version:VERSION, stage:STAGES.BRIEFING, briefingRead:false,
    receptionTalked:false, appointmentBooked:false, employeeAway:false,
    maintenanceHelped:false, deliveryAssigned:false, afterHours:false,
    officeRoute:null, calendarRead:false, venueIdentified:false,
    nextMeetingFound:false, venueVisited:false, cameraChecked:false,
    romancePhoto:null, dessertOfferRead:false, ringPurchased:false,
    ringHandedOver:false, returnToVantage:false, revealPhase:'waiting',
    ringPhoto:null, facePhoto:null, reportSubmitted:false, clientReplyRead:false,
    sequence:0, history:[]
  };
}
function failure(state, reason) { return {ok:false, reason, state}; }
function requirement(condition, message) { if(!condition) throw new Error(message); }
function photo(record, kind, sequence) {
  requirement(record && typeof record.evidenceId==='string' && record.evidenceId.length>0,'A captured evidence record is required.');
  requirement(record.kind===kind,'Wrong photograph type.');
  requirement(record.validated===true,'The scene must validate the framing before recording a photograph.');
  return {evidenceId:record.evidenceId,kind,sequence};
}
export function getObjectives(state) {
  return [
    {id:'briefing',text:'Read the client’s account and reference photograph.',completed:state.briefingRead},
    {id:'office',text:'Find a way into the employee’s office.',completed:!!state.officeRoute},
    {id:'meeting',text:'Identify the venue and locate the next matching appointment.',completed:state.venueIdentified&&state.nextMeetingFound},
    {id:'observation',text:'Document the meeting before intervening.',completed:!!state.romancePhoto},
    {id:'identity',text:'Obtain a clear photograph of the companion’s face.',completed:!!state.facePhoto},
    {id:'report',text:'Send the original observations and disclose your intervention.',completed:state.reportSubmitted}
  ];
}
export function canSubmitReport(s) {
  return !!(s.romancePhoto && s.ringPhoto && s.facePhoto && s.ringHandedOver &&
    s.romancePhoto.sequence<s.ringPhoto.sequence && s.ringPhoto.sequence<s.facePhoto.sequence);
}
export function buildReport(s) {
  requirement(canSubmitReport(s),'The photographic sequence is incomplete.');
  return {
    caseId:CASE_ID,
    evidenceIds:[s.romancePhoto.evidenceId,s.ringPhoto.evidenceId,s.facePhoto.evidenceId],
    observed:'The woman in the supplied reference photograph met a male companion at table 6. They kissed before any intervention by the investigator.',
    intervention:'The investigator bought a ring and asked restaurant staff to place it beside a complimentary dessert at table 6. The ring was not supplied by the companion.',
    subsequentEvents:'The woman reacted angrily to the ring and struck the companion. He turned towards the observation position, allowing a clear identification photograph.',
    limitations:'The dessert and ring photographs must not be represented as evidence of a genuine marriage proposal. The client is asked to identify the photographed companion.'
  };
}

export function transition(input, action, context={}) {
  if(!input || input.version!==VERSION) return failure(input,'Unsupported case state.');
  const s=structuredClone(input);
  const next=s.sequence+1;
  try {
    requirement(action && typeof action.type==='string','Missing action.');
    requirement(s.stage!==STAGES.CLOSED,'This case is already closed.');
    const t=action.type;
    switch(t) {
      case 'READ_BRIEFING':
        requirement(!s.briefingRead,'Briefing already read.');
        s.briefingRead=true;s.stage=STAGES.COMPANY;break;
      case 'TALK_RECEPTION':
        requirement(s.stage===STAGES.COMPANY,'Visit the company first.');
        s.receptionTalked=true;break;
      case 'BOOK_APPOINTMENT':
        requirement(s.receptionTalked,'Speak to reception first.');
        s.appointmentBooked=true;break;
      case 'EMPLOYEE_STEPS_OUT':
        requirement(s.stage===STAGES.COMPANY && s.appointmentBooked,'An office appointment is required.');
        s.employeeAway=true;break;
      case 'HELP_MAINTENANCE':
        requirement(s.stage===STAGES.COMPANY,'Visit the company first.');
        requirement(context.maintenancePuzzleSolved===true,'Complete the maintenance task first.');
        s.maintenanceHelped=true;break;
      case 'ACCEPT_DELIVERY':
        requirement(s.stage===STAGES.COMPANY&&s.maintenanceHelped,'Help the caretaker first.');
        s.deliveryAssigned=true;break;
      case 'WAIT_FOR_RECEPTION_TO_LEAVE':
        requirement(s.stage===STAGES.COMPANY,'Visit the company first.');
        s.afterHours=true;break;
      case 'ENTER_OFFICE': {
        requirement(s.stage===STAGES.COMPANY && !s.officeRoute,'The office route has already been selected.');
        const route=action.route;
        if(route==='appointment') requirement(s.appointmentBooked&&s.employeeAway,'Wait until the employee briefly leaves the room.');
        else if(route==='maintenance') requirement(s.maintenanceHelped&&s.deliveryAssigned,'You need the caretaker’s delivery assignment.');
        else if(route==='lockpick') requirement(s.afterHours&&context.hasLockpicks===true&&context.lockPuzzleSolved===true,'You need an unattended office, lockpicks and a solved lock.');
        else throw new Error('Unknown office route.');
        s.officeRoute=route;s.stage=STAGES.OFFICE;break;
      }
      case 'READ_CALENDAR':
        requirement(s.stage===STAGES.OFFICE,'Enter the office first.');
        s.calendarRead=true;break;
      case 'INSPECT_BUSINESS_CARD':
        requirement(s.stage===STAGES.OFFICE&&s.calendarRead,'Find the calendar entry first.');
        s.venueIdentified=true;break;
      case 'FIND_NEXT_APPOINTMENT':
        requirement(s.stage===STAGES.OFFICE&&s.calendarRead&&s.venueIdentified,'Identify what the earlier appointment refers to.');
        requirement(action.entryId==='next_m_table_6','That is not the matching appointment.');
        s.nextMeetingFound=true;s.stage=STAGES.LEAD;break;
      case 'ARRIVE_AT_RESTAURANT':
        requirement(s.stage===STAGES.LEAD,'Find the venue and next appointment first.');
        requirement(context.arrivedViaDrive===true,'Complete the drive before observing.');
        s.venueVisited=true;s.stage=STAGES.OBSERVATION;break;
      case 'CHECK_CAMERA':
        requirement(s.stage===STAGES.OBSERVATION&&context.hasCamera===true,'Bring the PI camera.');
        s.cameraChecked=true;break;
      case 'PHOTOGRAPH_KISS':
        requirement(s.stage===STAGES.OBSERVATION&&s.cameraChecked&&context.hasCamera===true,'Begin observation with the camera.');
        requirement(!s.romancePhoto,'The original observation has already been recorded.');
        requirement(context.sceneBeat==='kiss','Wait for a visible romantic interaction.');
        s.romancePhoto=photo(action.photo,'romance',next);break;
      case 'READ_DESSERT_OFFER':
        requirement(s.stage===STAGES.OBSERVATION,'Inspect the restaurant first.');
        s.dessertOfferRead=true;break;
      case 'PLAN_INTERVENTION':
        requirement(s.stage===STAGES.OBSERVATION&&s.romancePhoto&&s.dessertOfferRead,'Record the original meeting and inspect the dessert service first.');
        s.stage=STAGES.RING;break;
      case 'BUY_RING':
        requirement(s.stage===STAGES.RING&&!s.ringPurchased,'The ring is not needed now.');
        requirement(context.ringPurchaseCommitted===true&&context.hasRing===true,'The pawnshop must complete payment and inventory delivery first.');
        s.ringPurchased=true;s.stage=STAGES.KITCHEN;break;
      case 'GIVE_RING_TO_KITCHEN':
        requirement(s.stage===STAGES.KITCHEN&&s.ringPurchased&&!s.ringHandedOver,'Bring the purchased ring to the kitchen entrance.');
        requirement(action.table===6,'Choose the table you observed.');
        requirement(context.ringRemovedFromInventory===true,'Transfer the ring from PI inventory first.');
        s.ringHandedOver=true;break;
      case 'RETURN_TO_VANTAGE':
        requirement(s.stage===STAGES.KITCHEN&&s.ringHandedOver,'Arrange the dessert first.');
        s.returnToVantage=true;s.stage=STAGES.REVEAL;break;
      case 'SERVE_DESSERT':
        requirement(s.stage===STAGES.REVEAL&&s.returnToVantage&&s.revealPhase==='waiting','Return to your observation position first.');
        s.revealPhase='ring_visible';break;
      case 'PHOTOGRAPH_RING':
        requirement(s.stage===STAGES.REVEAL&&s.revealPhase==='ring_visible'&&context.hasCamera===true,'Photograph the dessert before the reaction.');
        requirement(!s.ringPhoto,'Dessert already photographed.');
        s.ringPhoto=photo(action.photo,'ring',next);break;
      case 'CONTINUE_REACTION':
        requirement(s.stage===STAGES.REVEAL&&s.ringPhoto&&s.revealPhase==='ring_visible','Record the ring before continuing.');
        s.revealPhase='face_visible';break;
      case 'PHOTOGRAPH_FACE':
        requirement(s.stage===STAGES.REVEAL&&s.revealPhase==='face_visible'&&context.hasCamera===true,'Wait until the companion turns.');
        requirement(!s.facePhoto,'Face already photographed.');
        s.facePhoto=photo(action.photo,'face',next);s.stage=STAGES.REPORT;break;
      case 'SUBMIT_REPORT':
        requirement(s.stage===STAGES.REPORT&&canSubmitReport(s),'Complete the photographic sequence first.');
        requirement(action.discloseIntervention===true,'The report must disclose the planted ring.');
        s.reportSubmitted=true;break;
      case 'READ_CLIENT_REPLY':
        requirement(s.stage===STAGES.REPORT&&s.reportSubmitted,'Send the report first.');
        s.clientReplyRead=true;s.stage=STAGES.CLOSED;break;
      default: throw new Error('Unknown action: '+t);
    }
    s.sequence=next;
    s.history.push({sequence:next,type:t,...(action.route?{route:action.route}:{})});
    return {ok:true,state:s,reason:null};
  } catch(error) { return failure(input,error.message); }
}
