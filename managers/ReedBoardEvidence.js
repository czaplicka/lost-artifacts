const QUEST='pi_two_glasses',SEARCH='miramar_demo';
const note=(id,label,text,source,color='yellow')=>({id,type:'note',label,text,metaText:source,color});
export function buildReedBoardEvidence(state){
 if(!state.piQuests?.quests?.[QUEST])return [];
 const known=new Set(state.piKeywordSearch?.cases?.[SEARCH]?.known||[]);
 const flags=new Set(state.piPhoneInvestigations?.cases?.[SEARCH]?.flags||[]);
 const photo=state.piPhotoEvidence?.[QUEST]||{},gallery=state.reedGalleryEvidence||{};
 const cards=[];
 if(photo.opened)cards.push({id:'reed_client_photo',type:'photo',label:'Daniel’s photograph',image:'assets/side_quests/Reed/terrace.webp',caption:'Photograph supplied by Mrs Reed.',meta:['Source: client correspondence','The photograph alone does not establish who owns the jacket.']});
 if(gallery.opened)cards.push({id:'reed_conference_photo',type:'photo',label:'New Horizons reception',image:'assets/side_quests/Reed/conference.webp',caption:'Published caption: left to right, Claire Sutton and Nora Bell.',meta:['Source: Open Skies public gallery','Wearing an item does not establish ownership.']});
 if(known.has('seahorse_logo'))cards.push(note('reed_napkin_emblem','Seahorse emblem','An embroidered seahorse emblem appears on the napkin in Daniel’s photograph.','Observation — client photograph'));
 if(known.has('swallow_logo'))cards.push(note('reed_badge_emblem','Swallow emblem','An orange delegate badge in Daniel’s photograph has a swallow emblem. Its name is not visible.','Observation — client photograph'));
 if(known.has('checked_jacket'))cards.push(note('reed_checked_jacket','Green checked jacket','A green checked jacket with contrasting pocket trim appears in Daniel’s photograph. Its owner is not established by the image.','Observation — client photograph'));
 if(known.has('miramar'))cards.push(note('reed_miramar_lead','Hotel Miramar','Hotel Miramar is a candidate location associated with a seahorse crest. A matching motif alone does not identify the terrace.','Lead — public hotel website'));
 if(known.has('open_skies'))cards.push(note('reed_open_skies_lead','Open Skies Foundation','Open Skies uses a swallow emblem and organises the New Horizons programme. The emblem is a lead, not proof of attendance.','Public source — foundation website'));
 if(known.has('claire'))cards.push(note('reed_claire_name','Claire Sutton','Claire Sutton’s name has been recorded during the inquiry. This does not establish her connection to Daniel.','Recorded name — source material or conversation'));
 if(known.has('nora'))cards.push(note('reed_nora_name','Nora Bell','Nora Bell’s name has been recorded during the inquiry. This does not establish ownership of the jacket.','Recorded name — source material or conversation'));
 if(gallery.inspected?.includes('jacket'))cards.push(note('reed_nora_wearing_jacket','Nora wears the jacket','Nora is wearing the green checked jacket in the conference photograph. This observation does not establish that it belongs to her.','Observation — conference photograph'));
 if(flags.has('nora_discussed'))cards.push(note('reed_nora_statement','Nora’s role','The events coordinator identified Nora as the North Region coordinator and said the photograph was taken before the evening reception.','Witness statement — events coordinator','blue'));
 if(flags.has('jacket_verified'))cards.push(note('reed_jacket_ownership_statement','Jacket ownership: coordinator’s account','The events coordinator said the green checked jacket belongs to Claire Sutton and that Claire lent it to Nora after Nora spilled coffee on her blouse.','Witness statement — events coordinator','blue'));
 if(flags.has('jacket_returned'))cards.push(note('reed_jacket_return_statement','Jacket returned: coordinator’s account','The events coordinator said Nora returned the jacket to Claire immediately after the photograph. The coordinator said she witnessed this.','Witness statement — events coordinator','blue'));
 if(flags.has('claire_phone_refused'))cards.push(note('reed_privacy_refusal','Private number withheld','The events coordinator declined to disclose Claire’s private telephone number. This records the conversation; it does not collect a keyword or an email address.','Conversation record — events coordinator','blue'));
 if(known.has('claire_email'))cards.push(note('reed_claire_work_address','Claire’s work email','claire.sutton@openskies.local','Collected contact detail'));
 return cards.map(c=>({...c,discovered:true,createdByPlayer:false,editableByPlayer:false}));
}
