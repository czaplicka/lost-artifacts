export const NIGHT_EVENTS = [
  {time:'20:55',title:'THE LAST WALK BEGINS',text:'Visitors in matching grey cloaks crowd the main path. The costume programme lists eight performers dressed as cemetery ghosts.',facts:['costumes']},
  {time:'21:06',title:'A FIGURE AT THE CHAPEL',text:'From your observation point, you see a pale figure enter the chapel. It carries a small satchel, not a parcel. The recorder picks up fabric scraping the door.',facts:['chapelEntry']},
  {time:'21:10',title:'TWO PLACES AT ONCE',text:'Your camera at gate B captures a hooded collector taking a parcel from the courier. Throughout that same camera-recorded handover, you keep the pale figure in sight inside the chapel window. The chapel recorder captures the bell and an irritated voice: “Oh, for postage sake.”',facts:['gatePhoto','chapelWitness','bell']},
  {time:'21:14',title:'THE COLLECTOR LEAVES',text:'A second gate-camera image shows the collector wheeling the parcel towards the maintenance shed. The hood and glare conceal the face. This does not identify the collector.',facts:['shedRoute']},
  {time:'21:17',title:'A LESS CONVINCING GHOST',text:'The pale figure emerges from the chapel. Its sleeve catches on the bell rope. The figure pulls off a mask: “Before you ask, haunting is not my primary occupation.”',facts:['unmasked']}
];
export const NIGHT_FACTS = {
  costumes:['A crowd of ghosts','The Last Walk programme lists eight performers in matching grey cloaks. Costume alone cannot identify a suspect.','Event programme'],
  chapelEntry:['A figure enters the chapel','At 21:06 the detective saw a pale figure carrying a satchel enter the chapel.','Direct observation'],
  gatePhoto:['21:10 / collector at gate B','A time-stamped camera image shows a hooded person collecting a parcel at gate B. The face is concealed.','Gate camera'],
  chapelWitness:['21:10 / a separate figure','Throughout the camera-recorded handover, the detective continuously saw the pale figure inside the chapel, away from gate B. This distinguishes the two observed people, not their possible relationship.','Direct observation / synchronised watch'],
  bell:['The bell recording','The chapel recorder captures the bell and the voice “Oh, for postage sake.” A later snag in the costume suggests an ordinary mechanism, not a supernatural explanation.','Recorder transcript'],
  shedRoute:['Towards the maintenance shed','The gate camera shows the collector moving the parcel towards the maintenance shed at 21:14. A destination does not identify the person.','Gate camera'],
  unmasked:['The ghost removes a mask','The pale figure removed a costume mask outside the chapel at 21:17.','Direct observation'],
  courierStory:['Tessa Ward / claimed courier investigator','Tessa Ward says she is investigating misdelivered parcels for Parcel & Circumstance. She entered as a Halloween performer after failing to obtain an appointment with the administrator.','Witness statement / initially unverified'],
  courierVerified:['Tessa’s assignment confirmed','In the prototype contact check, the courier duty desk confirms Tessa Ward’s staff ID and assignment. This verifies her employment claim, not every statement she makes.','Duty-desk verification / scripted phone prototype'],
  courierSheet:['Matching consignment references','Tessa’s redacted consignment sheet uses the same delivery dates, recipient names and plot numbers as the cemetery courier sheet. It establishes a shared route, not the buyer or collector’s identity.','Cross-reference / redacted courier sheet']
};
export const COURIER_TOPICS = [
  ['identity','Who are you?','“Tessa Ward. Parcel & Circumstance. Missing-delivery investigations. The costume was a practical decision that has become difficult to defend.”'],
  ['costume','Why dress as a ghost?','“The administrator would not give me an appointment. The Last Walk needed another performer. A sheet got me further than three emails.”'],
  ['bell','Why did you ring the bell?','“My sleeve caught the rope. I was trying to remain discreet.”\n\nDETECTIVE: “You rang a church bell.”\n\nTESSA: “In hindsight, a setback.”'],
  ['records','What can you show me?','“A redacted route sheet. No payment details. Compare the recipients and plots with the cemetery copy. I cannot tell you who was under that hood.”']
];
export const NIGHT_DEDUCTIONS = [
  {id:'twoPeople',question:'What do the synchronised observations establish?',options:['The chapel figure and gate collector are two different observed people.','The chapel figure must be the collector.','The camera identifies Edwin Vale.'],answer:0,explanation:'The figures were observed at separate locations at the same synchronised minute. Neither observation identifies the collector’s face.'},
  {id:'limits',question:'What does verifying Tessa establish?',options:['She cannot be involved in any wrongdoing.','She works for the courier and has the stated assignment.','Everything she says is automatically true.'],answer:1,explanation:'Employment verification supports her identity and assignment. It does not prove every statement or rule out involvement.'},
  {id:'nextStep',question:'What should a controlled operation focus on next?',options:['Arrest everyone who can use a staff key.','Search the florist because cardboard was found nearby.','Coordinate a marked delivery and document the collector’s actions.'],answer:2,explanation:'The route is established, but a face, purchaser and full offence still need evidence. A controlled delivery should be coordinated, not improvised by accusing a costume.'}
];
