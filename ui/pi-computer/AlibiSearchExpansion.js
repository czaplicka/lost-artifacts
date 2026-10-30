import { ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
import { ALIBI_CONTACTS } from './AlibiContactBook.js';
import { createSocialPage } from './SocialProfileTemplate.js';
const definition = ALIBI_SEARCH_CASE;
const hasPage = id => definition.pages.some(p => p.id === id);
const addPage = page => { if (!hasPage(page.id)) definition.pages.push(page); };
const key = (id, label, cloudId = 'people') => {
  if (!definition.keywords.some(k => k.id === id)) definition.keywords.push({ id, label, cloudId });
};
const sig = terms => [...terms].sort().join('|');
function recipe(terms, ids) {
  const valid = ids.filter(hasPage);
  if (!valid.length) return;
  const existing = definition.recipes.find(r => sig(r.terms) === sig(terms));
  if (existing) existing.pageIds = [...new Set([...(existing.pageIds || [existing.pageId]).filter(Boolean), ...valid])];
  else definition.recipes.push({ terms, pageIds: [...new Set(valid)] });
}
const article = (id, title, body) => ({ id, title, brand: 'CITY INDEX', address: `www.cityindex.local/${id}`, snippet: body[0], blocks: body.map(text => [text]), links: [] });
addPage(article('search_context', 'City Index | Checking a claim', [
  'Public listings are leads, not proof of attendance.',
  'Check the source, date and person before treating a matching name as evidence. The internet once identified our editor as a garden shed.'
]));
addPage(article('search_noise', 'Classifieds | Yesterday’s ordinary problems', [
  'Lost umbrella. Found umbrella. Neither party willing to negotiate.',
  'Unrelated listing. No connection to the dinner enquiry has been established.'
]));
addPage(article('cooker_repair', 'Local appliance repairs | We repair what chefs threaten', [
  'Kitchen failure? Our engineers specialise in dramatic cookers.',
  'General advertising only. This company does not identify the cause or duration of the Copper Spoon incident.'
]));
addPage(article('arthur_directory', 'Arthur Finch | Public directory', [
  'Arthur Finch has no public telephone listing in this directory.',
  'For the current enquiry, use his existing Box 17 correspondence. Please do not telephone everyone named Finch.'
]));
addPage(article('arthur_namesake', 'Arthur Finch | Antique spoon collection', [
  'An archive entry names an Arthur Finch as a spoon collector.',
  'No identifying details link this namesake to your client. A shared name is not a shared life.'
]));
const people = [
  ['arthur_finch','Arthur Finch','Quiet evenings enthusiast.','Enjoys cold sandwiches, sensible receipts and being consulted before appearing in other people’s plans.'],
  ['nora_bell','Nora Bell','Community events and optimistic portions.','Public contact details are available in the community directory. Family invitations are currently under review.'],
  ['simon_pike','Simon Pike','Board games. Serious business. Tiny wooden sheep.','Member of the local tabletop circle. A profile is not a timed attendance record.'],
  ['evelyn_shaw','Evelyn Shaw','Accounts assistant. No unsolicited networking.','Work contact appears in the Morrow Records staff directory. This preview contains no incident evidence.']
];
for (const [id, name, bio, about] of people) {
  addPage(createSocialPage({ id, keyword: id, name, bio, about }));
  const targets = id === 'arthur_finch' ? ['arthur_directory','arthur_namesake'] : [`${id.split('_')[0]}_profile`,'search_context'];
  recipe([id], [`social_${id}`, ...targets]);
  for (const r of definition.recipes.filter(r => r.terms.includes(id))) recipe(r.terms, [`social_${id}`]);
}
recipe(['kitchen_failure'], ['copper_notice','copper_contact','cooker_repair']);
recipe(['copper_spoon','kitchen_failure'], ['copper_notice','copper_contact','cooker_repair']);
recipe(['kitchen_failure','tuesday'], ['copper_notice','copper_contact']);
recipe(['tomato_soup'], ['copper_menu','copper_notice','search_noise']);
recipe(['receipt'], ['copper_contact','search_context']);
recipe(['red_wine'], ['copper_menu','search_noise']);
recipe(['tuesday'], ['copper_notice','search_context','search_noise']);
for (const contact of ALIBI_CONTACTS) {
  const keyword = definition.keywords.find(k => k.id === contact.keyword);
  if (keyword) { keyword.contactName = contact.name; keyword.label = `${contact.number} — ${contact.name}`; }
  if (contact.email) {
    const id = contact.keyword.replace('_phone','_email');
    key(id, contact.email);
    const split = part => {
      if (typeof part !== 'string' || !part.includes(contact.email)) return [part];
      return part.split(contact.email).flatMap((text, index) => index ? [{ keywordId: id, text: contact.email }, text] : [text]).filter(Boolean);
    };
    for (const page of definition.pages) page.blocks = page.blocks.map(block => block.flatMap(split));
    recipe([id], [`${contact.keyword.split('_')[0]}_profile`, `social_${contact.name.toLowerCase().replaceAll(' ','_')}`]);
  }
}
for (const keyword of definition.keywords) {
  if (!definition.recipes.some(r => sig(r.terms) === sig([keyword.id]))) recipe([keyword.id], ['search_context','search_noise']);
}
for (const r of definition.recipes) if ((r.pageIds || []).length < 2) recipe(r.terms, ['search_context']);
for (const [person] of people) {
  for (const keyword of definition.keywords) {
    if (keyword.id === person) continue;
    recipe([person, keyword.id], [`social_${person}`, person === 'arthur_finch' ? 'arthur_directory' : `${person.split('_')[0]}_profile`]);
  }
}

const line = (speaker, text) => ({ speaker, text });
function addTopic(contact, id, terms, lines, requiresFlags = []) {
  if (!contact.topics.some(t => sig(t.terms) === sig(terms))) {
    contact.topics.push({ id, terms, requiresFlags, grantKeywords: [], grantFlags: [], lines });
  }
}
const configs = [
  {
    id: 'alibi_nora_bell', stem: 'nora', person: 'nora_bell', name: 'Nora Bell',
    intro: [
      line('You', 'You asked Arthur Finch to confirm a Tuesday dinner. He says he ate alone.'),
      line('Nora Bell', 'I sent the message, yes. I was rather hoping this would end with him saying yes, not with a detective.'),
      line('You', 'Three people sent him the same soup, the same wine and the same waiter. Did you write yours yourself?'),
      line('Nora Bell', 'I am not discussing how I wrote it. Arthur has what I sent. Compare the original messages if you think something is wrong.')
    ],
    soup: [line('You', 'Your message describes tomato soup that Tuesday. Is that accurate?'), line('Nora Bell', 'That is what the message says. If you think the meal is impossible, ask the restaurant. I am not a menu archive.')],
    footer: [line('You', 'There is a document label in the material Arthur forwarded. Do you recognise it?'), line('Nora Bell', 'I am not going to explain somebody else’s attachment. Check the document itself.')],
    fallback: 'I can discuss the dinner request I sent Arthur. Ask about Tuesday, the restaurant or a specific detail in my message.'
  },
  {
    id: 'alibi_simon_pike', stem: 'simon', person: 'simon_pike', name: 'Simon Pike',
    intro: [
      line('You', 'Arthur Finch says he never agreed to confirm your Tuesday dinner.'),
      line('Simon Pike', 'That is an unfortunate development in what I had considered a complete plan.'),
      line('You', 'Two other people sent him almost the same account. Same table, soup and spilled wine.'),
      line('Simon Pike', 'Then compare what we sent. I am not adding a second version for you to compare with the first.')
    ],
    soup: [line('You', 'You describe tomato soup. Can you confirm it was served that Tuesday?'), line('Simon Pike', 'The restaurant can answer that better than I can. You have the venue and the evening in my message.')],
    footer: [line('You', 'One of the forwarded documents has a product-like label at the bottom.'), line('Simon Pike', 'Then start with the label. I would prefer not to provide commentary on other people’s paperwork.')],
    fallback: 'If this is about the request to Arthur, ask about that dinner or the details I included. I cannot answer for every name in your notebook.'
  },
  {
    id: 'alibi_evelyn_shaw', stem: 'evelyn', person: 'evelyn_shaw', name: 'Evelyn Shaw',
    intro: [
      line('You', 'You asked Arthur Finch to confirm dinner. He denies being with you.'),
      line('Evelyn Shaw', 'My account is in the message. The restaurant, the time and the meal.'),
      line('You', 'You also attached a document.'),
      line('Evelyn Shaw', 'Arthur has the original. Ask him to forward the attachment, not just the email text.'),
      line('You', 'He has sent it separately. I will compare both.')
    ],
    soup: [line('You', 'Your account specifically names tomato soup. Do you stand by that?'), line('Evelyn Shaw', 'I stand by the account I sent. If you dispute what the restaurant served, obtain its service record.')],
    footer: [line('You', 'The attachment ends with “Tuesday package — revision 2. Remove before forwarding.” What is that?'), line('Evelyn Shaw', 'A document label. You can search the phrase yourself. It does not tell you where I spent the evening.')],
    fallback: 'My dinner account is already in writing. Ask about a detail in it. If you want to contradict it, establish the facts first.'
  }
];
for (const config of configs) {
  const contact = ALIBI_INTERVIEW_CONTACTS.find(c => c.id === config.id);
  if (!contact) continue;
  contact.choicePrompt = 'Ask about the dinner request: choose a name, Tuesday, the restaurant or a detail from the message.';
  contact.greeting = [line(config.name, `${config.name} speaking.`), line('You', 'I am investigating the Tuesday dinner confirmation you sent Arthur Finch.'), line(config.name, 'All right. What do you want to ask about the message?')];
  contact.fallback = [line(config.name, config.fallback)];
  delete contact.fallbackVariants;
  const intro = contact.topics.find(t => t.id === `${config.stem}_intro`);
  if (intro) intro.lines = config.intro;
  for (const [suffix, terms] of [
    ['client',['arthur_finch']], ['tuesday',['tuesday']], ['venue',['copper_spoon']],
    ['named_tuesday',[config.person,'tuesday']], ['named_client',[config.person,'arthur_finch']],
    ['named_venue',[config.person,'copper_spoon']]
  ]) addTopic(contact, `${config.stem}_enquiry_${suffix}`, terms, config.intro);
  for (const [suffix, terms] of [
    ['soup',['tomato_soup']], ['named_soup',[config.person,'tomato_soup']],
    ['tuesday_soup',['tuesday','tomato_soup']], ['service',['kitchen_failure']],
    ['named_service',[config.person,'kitchen_failure']]
  ]) addTopic(contact, `${config.stem}_enquiry_${suffix}`, terms, config.soup);
  for (const [suffix, terms] of [
    ['wine',['red_wine']], ['named_wine',[config.person,'red_wine']], ['meal_pair',['tomato_soup','red_wine']]
  ]) addTopic(contact, `${config.stem}_enquiry_${suffix}`, terms, [line('You','Your message repeats the spilled wine and the waiter’s remark found in the other requests.'), line(config.name,'Then compare the original documents. Repeating the description to me will not establish whether the dinner happened.')]);
  for (const [suffix, terms] of [
    ['footer',['tuesday_package']], ['named_footer',[config.person,'tuesday_package']],
    ['revision',['revision_two']], ['footer_revision',['tuesday_package','revision_two']]
  ]) addTopic(contact, `${config.stem}_enquiry_${suffix}`, terms, config.footer);
  const confrontation = contact.topics.find(t => t.id === `${config.stem}_confront`);
  if (confrontation && !contact.topics.some(t => sig(t.terms) === sig(['sample_code']))) {
    contact.topics.push({ ...confrontation, id: `${config.stem}_sample_direct`, terms: ['sample_code'] });
  }
}
export const ALIBI_ENRICHED_CASE = definition;
