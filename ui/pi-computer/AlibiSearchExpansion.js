import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
import { ALIBI_CONTACTS } from './AlibiContactBook.js';
import { createSocialPage } from './SocialProfileTemplate.js';
const definition=ALIBI_SEARCH_CASE;
const hasPage=id=>definition.pages.some(p=>p.id===id);
const addPage=page=>{if(!hasPage(page.id))definition.pages.push(page);};
const key=(id,label,cloudId='people')=>{if(!definition.keywords.some(k=>k.id===id))definition.keywords.push({id,label,cloudId});};
const sig=terms=>[...terms].sort().join('|');
function recipe(terms,ids) {
 const valid=ids.filter(hasPage); if(!valid.length)return;
 const existing=definition.recipes.find(r=>sig(r.terms)===sig(terms));
 if(existing)existing.pageIds=[...new Set([...(existing.pageIds||[existing.pageId]).filter(Boolean),...valid])];
 else definition.recipes.push({terms,pageIds:[...new Set(valid)]});
}
const article=(id,title,body)=>({id,title,brand:'CITY INDEX',address:`www.cityindex.local/${id}`,snippet:body[0],blocks:body.map(text=>[text]),links:[]});
addPage(article('search_context','City Index | Checking a claim',[
 'Public listings are leads, not proof of attendance.',
 'Check the source, date and person before treating a matching name as evidence. The internet once identified our editor as a garden shed.'
]));
addPage(article('search_noise','Classifieds | Yesterday’s ordinary problems',[
 'Lost umbrella. Found umbrella. Neither party willing to negotiate.',
 'Unrelated listing. No connection to the dinner enquiry has been established.'
]));
addPage(article('cooker_repair','Local appliance repairs | We repair what chefs threaten',[
 'Kitchen failure? Our engineers specialise in dramatic cookers.',
 'General advertising only. This company does not identify the cause or duration of the Copper Spoon incident.'
]));
addPage(article('arthur_directory','Arthur Finch | Public directory',[
 'Arthur Finch has no public telephone listing in this directory.',
 'For the current enquiry, use his existing Box 17 correspondence. Please do not telephone everyone named Finch.'
]));
addPage(article('arthur_namesake','Arthur Finch | Antique spoon collection',[
 'An archive entry names an Arthur Finch as a spoon collector.',
 'No identifying details link this namesake to your client. A shared name is not a shared life.'
]));
const people=[
 ['arthur_finch','Arthur Finch','Quiet evenings enthusiast.','Enjoys cold sandwiches, sensible receipts and being consulted before appearing in other people’s plans.'],
 ['nora_bell','Nora Bell','Community events and optimistic portions.','Public contact details are available in the community directory. Family invitations are currently under review.'],
 ['simon_pike','Simon Pike','Board games. Serious business. Tiny wooden sheep.','Member of the local tabletop circle. A profile is not a timed attendance record.'],
 ['evelyn_shaw','Evelyn Shaw','Accounts assistant. No unsolicited networking.','Work contact appears in the Morrow Records staff directory. This preview contains no incident evidence.']
];
for(const [id,name,bio,about] of people){
 addPage(createSocialPage({id,keyword:id,name,bio,about}));
 const stem=id.split('_')[0];
 const targets=id==='arthur_finch'?['arthur_directory','arthur_namesake']:[`${stem}_profile`,'search_context'];
 recipe([id],[`social_${id}`,...targets]);
 for(const r of definition.recipes.filter(r=>r.terms.includes(id)))recipe(r.terms,[`social_${id}`]);
}
recipe(['kitchen_failure'],['copper_notice','copper_contact','cooker_repair']);
recipe(['copper_spoon','kitchen_failure'],['copper_notice','copper_contact','cooker_repair']);
recipe(['kitchen_failure','tuesday'],['copper_notice','copper_contact']);
recipe(['tomato_soup'],['copper_menu','copper_notice','search_noise']);
recipe(['receipt'],['copper_contact','search_context']);
recipe(['red_wine'],['copper_menu','search_noise']);
recipe(['tuesday'],['copper_notice','search_context','search_noise']);
for(const contact of ALIBI_CONTACTS){
 const k=definition.keywords.find(k=>k.id===contact.keyword);if(k){k.contactName=contact.name;k.label=`${contact.number} — ${contact.name}`;}
 if(contact.email){
  const id=contact.keyword.replace('_phone','_email');key(id,contact.email);
  const split=part=>{
   if(typeof part!=='string'||!part.includes(contact.email))return [part];
   return part.split(contact.email).flatMap((text,index)=>index?[{keywordId:id,text:contact.email},text]:[text]).filter(Boolean);
  };
  for(const page of definition.pages)page.blocks=page.blocks.map(block=>block.flatMap(split));
  recipe([id],[`${contact.keyword.split('_')[0]}_profile`,`social_${contact.name.toLowerCase().replaceAll(' ','_')}`]);
 }
}
// Supply contextual alternatives without exposing independent verification early.
for(const k of definition.keywords){
 if(!definition.recipes.some(r=>sig(r.terms)===sig([k.id])))recipe([k.id],['search_context','search_noise']);
}
for(const r of definition.recipes) {
 if((r.pageIds||[]).length<2)recipe(r.terms,['search_context']);
}
const nora=ALIBI_INTERVIEW_CONTACTS.find(c=>c.id==='alibi_nora_bell');
if(nora){
 nora.fallback=[{speaker:'Nora Bell',text:'Arthur sent you? Look, it was supposed to be one harmless excuse. What exactly did you find?'}];
 const intro=nora.topics.find(t=>t.id==='nora_intro');
 if(intro)intro.lines=[{speaker:'You',text:'You asked Arthur Finch to remember a dinner he says never happened.'},{speaker:'Nora Bell',text:'He says that, does he? I was hoping the awkward part would happen after my sister stopped asking questions.'},{speaker:'You',text:'Then let’s start with what you actually remember.'},{speaker:'Nora Bell',text:'I sent the message. I would rather not explain the rest over the phone unless you have something more than his word.'}];
 const confrontation=nora.topics.find(t=>t.id==='nora_confront');
 if(confrontation){
  confrontation.lines[1].text='Oh, wonderful. They sold everyone the same soup. Yes, I bought the story. Arthur knew nothing about it. I am sorry.';
  const alias={...confrontation,id:'nora_sample_direct',terms:['sample_code']};
  if(!nora.topics.some(t=>t.id===alias.id))nora.topics.push(alias);
 }
}
const simon=ALIBI_INTERVIEW_CONTACTS.find(c=>c.id==='alibi_simon_pike');
if(simon)simon.fallback=[{speaker:'Simon Pike',text:'Are we still talking about that dinner? If you found something wrong with the story, tell me what it is.'}];
export const ALIBI_ENRICHED_CASE=definition;

// Name plus another collected clue always retains the same public profile.
for(const [person] of people){
 for(const keyword of definition.keywords){
  if(keyword.id===person)continue;
  const fallback=person==='arthur_finch'?'arthur_directory':`${person.split('_')[0]}_profile`;
  recipe([person,keyword.id],[`social_${person}`,fallback]);
 }
}
