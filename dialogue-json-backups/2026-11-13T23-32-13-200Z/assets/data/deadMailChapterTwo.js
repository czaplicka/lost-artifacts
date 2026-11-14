export const STAFF = {
  admin: {
    name: 'EDWIN VALE / ADMINISTRATOR',
    opening: '“Our residents rarely complain. You appear to have brought an exception.”',
    topics: [
      ['marker', 'Who installed Florence\'s marker?', '“Not my staff. It is a display marker, not a registered burial. We use those for layout demonstrations.”'],
      ['deliveries', 'What about the courier vans?', '“I assumed they were bringing supplies for the Last Walk event. The delivery register is on my desk. You may inspect the relevant pages.”'],
      ['access', 'Who can open service gate B?', '“Staff keys open it. Contractors can also borrow a key and sign it out. A courier should not have one.”']
    ]
  },
  gravedigger: {
    name: 'MILO GRAVES / GROUNDSKEEPER',
    opening: '“Yes, Graves is my real name. No, I did not get the job through family connections.”',
    topics: [
      ['soil', 'Has anyone dug at plot 114?', '“No. That soil has not been turned this month. Someone pushed a display marker into the grass.”'],
      ['boxes', 'What are the crates in your cart?', '“Foam skulls. For the Halloween walk. The real ones are terrible at taking stage directions.”'],
      ['collection', 'Did you see anyone collect parcels?', '“Someone wheeled sealed boxes from gate B towards the chapel after the afternoon bell. Hood up. Could have been staff or an event worker. I did not see a face.”']
    ]
  },
  florist: {
    name: 'ROSE THORNE / FLORIST',
    opening: '“Flowers for a loved one, an apology, or an alibi? Different ribbons.”',
    topics: [
      ['flowers', 'Who ordered the flowers on old graves?', '“Nobody. I leave the unsold bunches there. Some people deserve visitors even when they cannot tip.”'],
      ['van', 'Were the deliveries funeral supplies?', '“Not mine. My supplier uses green reusable crates. The courier brought small cardboard boxes marked fragile.”'],
      ['sound', 'What is happening at the chapel?', '“Someone rang its bell after closing. The Last Walk organiser says it was not in her rehearsal. She sounded offended by the competition.”']
    ]
  }
};

export const FACTS = {
  marker: ['A staged burial', 'The marker at plot 114 stands in undisturbed ground. It is a temporary display marker, not evidence of a burial.', 'Scene observation'],
  carton: ['Camera packaging', 'A torn carton at service gate B bears a lens-kit product label. It could be discarded rubbish; its connection to the deliveries remains unproven.', 'Scene observation'],
  lock: ['Controlled entrance', 'Gate B has a staff-key lock. There are no visible signs of forced entry. An open gate or borrowed key remains possible.', 'Scene observation'],
  admin: ['Staff and contractor access', 'Edwin Vale says staff and signed-in contractors can use service gate B. He gives permission to inspect the relevant delivery records.', 'Administrator statement'],
  gravedigger: ['A hooded collector', 'Milo Graves says a hooded person moved sealed boxes from gate B towards the chapel after the afternoon bell. He did not see a face.', 'Groundskeeper statement'],
  florist: ['Not the florist\'s delivery', 'Rose Thorne says her deliveries use green crates, unlike the fragile cardboard parcels. She also reports a bell after closing.', 'Florist statement'],
  register: ['The burial register', 'Ada Bell: plot 108, died 2014. Victor Moss: plot 112, died 2018. Elsie Pike: plot 119, died 2020. All are in the West Garden. No burial is registered for Florence Finch.', 'Burial register'],
  gateLog: ['Gate B key log', 'The event team and cemetery staff both used gate B this week. Entries include Edwin Vale, Milo Graves and event coordinator Nora Wicks. The log alone does not identify the collector.', 'Gate key log'],
  manifest: ['Courier collection sheet', 'Recent deliveries name Ada Bell, Victor Moss and Elsie Pike. One later delivery names Florence Finch. All use West Garden plots and gate B. The next parcel is due at 21:10 during the Last Walk.', 'Courier sheet in the administration office'],
  recipients: ['Three deceased recipients', 'Ada Bell, Victor Moss and Elsie Pike appear in both the burial register and recent courier records. Florence does not appear in the burial register. The shared delivery route is established, but the identity of whoever ordered or collected the goods is not.', 'Cross-reference: burial register and courier sheet']
};

export const DOCUMENTS = {
  register: {
    title: 'BURIAL REGISTER / WEST GARDEN',
    text: 'PLOT 108  |  ADA BELL     |  DIED 2014\nPLOT 112  |  VICTOR MOSS  |  DIED 2018\nPLOT 119  |  ELSIE PIKE   |  DIED 2020\n\nFLORENCE FINCH: NO BURIAL ENTRY\n\nDisplay markers do not establish a burial.\nRelevant extract supplied with administrator permission.'
  },
  gateLog: {
    title: 'SERVICE GATE B / KEY SIGN-OUT',
    text: 'STAFF KEYS: E. VALE / M. GRAVES\nCONTRACTOR KEY: N. WICKS / LAST WALK\n\nAll three used the gate this week.\nNo courier is listed as a key holder.\n\nThe log records access, not parcel collection.\nIt cannot establish who was under the hood.'
  },
  manifest: {
    title: 'COURIER COLLECTION SHEET',
    text: 'MON  | ADA BELL      | PLOT 108 | GATE B\nTUE  | VICTOR MOSS   | PLOT 112 | GATE B\nWED  | ELSIE PIKE    | PLOT 119 | GATE B\nTHU  | FLORENCE FINCH| PLOT 114 | GATE B\n\nNEXT DELIVERY: FRIDAY / 21:10 / GATE B\nEvent note: LAST WALK ACCESS WINDOW\n\nContents and purchaser identity are not listed.'
  }
};

export const DEDUCTIONS = [
  { id:'route', question:'What connects the delivery addresses?',
    options:['The same recipient ordered everything.', 'Different names lead to the same service entrance.', 'Each parcel was buried in a different grave.'],
    answer:1, explanation:'The courier sheet names different people, but every delivery uses gate B. There is no evidence of buried parcels.' },
  { id:'identity', question:'What does the document comparison establish?',
    options:['Three recent parcels use the names of people in the burial register.', 'Florence is legally dead.', 'The florist ordered the camera equipment.'],
    answer:0, explanation:'Three names appear in both records. Florence has no burial entry. Neither a staged marker nor a delivery label proves a death.' },
  { id:'next', question:'What is the strongest next investigative step?',
    options:['Accuse the administrator because he owns a key.', 'Arrest everyone wearing a hood.', 'Observe the next 21:10 delivery at gate B.'],
    answer:2, explanation:'The records give a specific next delivery. Access alone does not identify the collector, and a hood is not a face.' }
];
