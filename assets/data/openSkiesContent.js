export const OPEN_SKIES={
 caseId:'pi_open_skies',advertId:'open_skies_president',messageId:'open_skies_briefing',title:'Open Skies — Missing President',organisation:'Open Skies Foundation',
 advert:{id:'open_skies_president',kind:'pi',missionId:'pi_open_skies',title:'Open Skies — Missing President',contact:'Vice President, Open Skies Foundation',reward:200,
  description:'Our president has stolen foundation funds and disappeared. He has admitted the theft. Establish his current location. No travel or confrontation required. Fee: $200 for a supported location report.'},
 definition:{id:'pi_open_skies',kind:'side',title:'Open Skies — Missing President',description:'Locate the president who stole from Open Skies Foundation. No travel is required.',requiresBoard:true,reward:200,
  objectives:[{id:'collect_package',text:'Collect the foundation case materials sent by post.'},{id:'locate_president',text:'Establish the president\'s location.'},{id:'submit_location',text:'Submit a supported location report.'}],
  initialItems:[{id:'open_skies_assignment',type:'note',label:'Open Skies Foundation',text:'The foundation president has admitted stealing its funds. The client wants his current location.',metaText:'Client assignment',color:'yellow',x:100,y:100,pinned:true,discovered:true,createdByPlayer:false,editableByPlayer:false}],initialLinks:[],
  metadata:{contentId:'open_skies',contentVersion:4,implementedStage:'location_finale',developmentOnly:true}},
 briefing:['Detective,','Our president has taken money from Open Skies Foundation and disappeared. He called me after leaving, admitted the theft and said we would never find him.',
  'We need you to establish his current location. You do not need to travel there or approach him. The agreed fee is $200 upon acceptance of a supported report.',
  'I am sending our case materials to your office by post. The documents include notes on enquiries already completed.','Vice President\nOpen Skies Foundation'],
 deliveryDelayMs:10000,
 call:{receivedIn:'New York',receiverZone:'America/New_York',audioUrl:'assets/audio/pi/open_skies_environment.wav',audioKind:'environment_preview'},
 documents:[
  {id:'cover',title:'Cover letter',body:'Enclosed: financial records, hotel enquiries, company-address checks and a copy of the telephone recording. Please report the president\'s current location to the foundation. The agreed fee is $200 for a supported report.'},
  {id:'finance',title:'Financial summary',body:'Internal review confirms unauthorised transfers from foundation accounts. The president admitted making them.\n\nThe records establish the loss. They do not establish his present location.'},
  {id:'hotel',title:'Hotel enquiry',body:'The reservation found in his files has already been checked. Hotel staff confirm that he did not check in. No verified sighting was obtained.'},
  {id:'company',title:'Company address',body:'The overseas company address has already been checked. It is a registered-office service. Staff have not met the president and cannot confirm that he has ever been there.'},
  {id:'recording',title:'Telephone recording',body:'Copy of the call received by the Vice President. Original file retained by the foundation.'}
 ]
};
