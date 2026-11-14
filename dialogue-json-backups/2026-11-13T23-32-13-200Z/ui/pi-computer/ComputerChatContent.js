import { thiefdokuService } from '../../systems/thiefdoku/ThiefdokuService.js';
export const CONTACTS=[
 {id:'commandant',name:'Chief Comendant',role:'Classified sender',initials:'CC',intro:'This conversation is classified. So is the spelling.'},
 {id:'secretary',name:'Mildred Finch',role:'Office secretary',initials:'MF',intro:'I manage appointments, stationery, and occasionally the detectives.'},
 {id:'curator',name:'Dr. Evelyn Hart',role:'Museum curator',initials:'EH',intro:'I am rather busy. The museum does not catalogue interruptions.'},
 {id:'guard',name:'Arthur Bell',role:'Night guard',initials:'AB',intro:'I saw nothing. It was dark. That is why they call it night shift.'},
 {id:'informant',name:'N. Nobody',role:'Unknown contact',initials:'??',intro:'You did not get this number from me.'}
];
export const PROPOSAL='Detective. I am impressed by your work. '+'I have a proposal: I send you crime scenes and witness statements. '+'You solve the thefts. One case per real day. '+'Successful cases earn police medals. Interested?';
export const NORMAL_REPLIES=[['Where were you?','Where were you that night?'],['The artefact','What do you know about the artefact?'],['Other contacts','Who else should I talk to?'],['What happened?','Tell me what happened.']];
export function normalise(value){return String(value||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
export function chiefReply(message){
 const q=normalise(message);
 if(/name appears to be classified|redacted|black bar/.test(q))return 'Finally. Someone who can read it.';
 if(/not interested|no thanks|decline|refuse|maybe later/.test(q)||q==='no')return thiefdokuService.isInstalled()
 ?'You may leave the cases unopened. '+'The application will remain available. Unlike our funding.'
 :'Understood. No installation. '+'The offer remains open. Unlike most of our cases.';
 if(/\baccept\b|\binstall\b|sign me up|i am in|im in/.test(q)||['yes','ok','okay','deal'].includes(q)){
  if(!thiefdokuService.install())return 'THIEFDOKU is already installed. '+'The icon is on your desktop. It is not undercover.';
  return 'Accepted. Installing THIEFDOKU... done. '+'You will find it on your desktop. '+'One new case per real day. '+'One police medal for each solved case, credited to your profile. '+'The medals are currency. Please do not pin your balance to your coat.';
 }
 if(/how does|how it|what exactly|what do i solve|rules/.test(q))return 'You receive a crime-scene floor plan and witness statements. '+'Place one person in each row, column and room. '+'The person in the room with the empty display is the thief. '+'Read carefully. Furniture is rarely a reliable witness.';
 if(/new case|today|next case|delivery/.test(q)){
  if(!thiefdokuService.isInstalled())return 'Accept the proposal first. '+'Even classified software needs consent.';
  return thiefdokuService.canIssueCase()?'A new delivery is available in THIEFDOKU. '+'You may finish your previous case before requesting it.'
  :'Today’s case has already been delivered. '+'The next one becomes available after local midnight. '+'Yes, criminals apparently have a schedule.';
 }
 if(/medal|reward|currency|payment/.test(q))return `Your balance is ${thiefdokuService.getMedals()} police medals. `+'You can also see it in your player profile. '+'The exchange catalogue is not open yet. Procurement is investigating itself.';
 if(/who are you|real name|your name|really/.test(q))return 'Chief Comendant. The surname is classified. '+'The black rectangle has excellent references.';
 if(/thank/.test(q))return 'You are welcome. Please express further gratitude through competent detective work.';
 return thiefdokuService.isInstalled()?'Ask about the daily case, police medals, or the rules.':'You may accept the proposal, ask how it works, or decline. '+'This is a conversation, not a hostage situation.';
}
export function normalReply(contact,message,conversation){
 const q=normalise(message);
 if(/\b(hello|hi|hey|good morning)\b/.test(q))return 'Hello. I was wondering when you would message.';
 if(/where|alibi|last night|that night|yesterday/.test(q)){
  if(conversation.asked.includes('alibi'))return 'We have been over my whereabouts already. '+'My story has not improved with repetition.';
  if(contact.id==='guard')return 'I was on the museum night shift. '+'The cameras were temperamental, as usual.';
  if(contact.id==='curator')return 'At home, reviewing the acquisition records. '+'I already told the police.';
  return 'I was nowhere near anything suspicious. '+'That is my official opening statement.';
 }
 if(/artefact|artifact|relic|stolen/.test(q))return contact.id==='curator'?'The artefact was a small ceremonial object. '+'Valuable, fragile, and apparently irresistible to criminals.':'I have no useful information about the artefact. '+'Try someone closer to the case.';
 if(/museum|crime scene|gallery/.test(q))return ['guard','curator'].includes(contact.id)?'The museum was closed to visitors. '+'Staff and security still had access.':'I cannot help with museum details.';
 if(/who|suspect|person|talk to/.test(q))return 'Speak to the curator and the night guard. '+'They know more than they admit.';
 if(/happened|tell me|explain|case/.test(q))return 'Ask something specific. “What happened?” '+'is how people end up with a three-hour meeting.';
 if(/thank/.test(q))return 'You are welcome. '+'I shall add this to my annual performance review.';
 return 'Try asking about the alibi, the museum, the artefact, or another person.';
}
