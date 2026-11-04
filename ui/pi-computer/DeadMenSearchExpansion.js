const CASE='dead_men_calling';
const APPLIED=new WeakMap();
const word=(keywordId,text)=>({keywordId,text});
const page=(id,title,brand,address,template,blocks,links=[])=>({
  id,title,brand,address,template,theme:template==='directory'?'directory':template==='news'?'magazine':'business',
  blocks,links,snippet:blocks.slice(0,2).flat().map(part=>typeof part==='string'?part:part.text||'').join(' ')
});

export function deadMenAdditionalPages(){
  return[
    page('dm_edward_directory','Edward Vale | Archived business listing','PUBLIC DIRECTORY',
      'www.publicdirectory.local/archive/edward-vale','directory',[
      ['ARCHIVED ENTRY — no longer an active business listing.'],
      [word('dm_edward','Edward Vale'),' — small-business administration and record keeping.'],
      ['The retained listing describes office administration and the organisation of ',word('dm_accounts','company records'),'. It is not a register of individual transactions.'],
      ['The old business telephone number has been removed. The directory cannot put you through to the past, despite several persistent requests.'],
      ['Family correspondence is handled through the Vale family archive. No private papers or recordings are available in this listing.']
    ],[{label:'Family memorial',pageId:'dm_memorial'},{label:'Family contact',pageId:'dm_family_contact'}]),
    page('dm_edward_filing_profile','Edward Vale and the triumph of the blue folder','COMMUNITY LEDGER',
      'www.communityledger.local/archive/edward-vale-filing','news',[
      ['FROM THE LOCAL FEATURES ARCHIVE — published before the family memorial.'],
      [word('dm_edward','Edward Vale'),' preferred a ',word('dm_folder','blue folder'),' to a complicated filing system. Asked how he found anything, he replied that the difficult part was remembering which blue.'],
      ['The feature describes everyday office habits: written notes, labelled papers and dictated reminders. It does not reproduce any documents.'],
      ['The editor recommended labels. Edward recommended buying more folders. The stationery shop declined to take sides.'],
      ['This is an old profile, not a record of recent activity or evidence about who has access to private material.']
    ],[{label:'Archived business listing',pageId:'dm_edward_directory'},{label:'Keeping a useful archive',pageId:'dm_audio_article'}]),
    page('dm_edward_recorder_notice','From the archive: Edward Vale on recording reminders','SMALL BUSINESS CIRCULAR',
      'www.smallbusinesscircular.local/archive/recording-reminders','news',[
      ['ARCHIVED WORKSHOP NOTE — everyday office routines.'],
      [word('dm_edward','Edward Vale'),' described using an ',word('dm_recorder','office recorder'),' for reminders and short dictated notes.'],
      ['The workshop summary discusses labelling files and retaining the original ',word('dm_voice','voicemail'),' when copying messages.'],
      ['No recordings were published with the article. No individual message is quoted or identified.'],
      ['The session ended early when someone recorded the tea order over the minutes. The tea order was considerably clearer.']
    ],[{label:'Archive preservation guide',pageId:'dm_audio_article'},{label:'Local profile: filing',pageId:'dm_edward_filing_profile'}]),
    page('dm_edward_bowls_namesake','Edward Vale | Bowls club captain','GREEN JACK BOWLS CLUB',
      'www.greenjack.local/team/edward-vale','business',[
      ['Edward Vale — club captain and retired garden-centre manager.'],
      ['His member biography describes years of competitive bowls and a carefully maintained collection of gardening trophies.'],
      ['Latest club update: the captain has again asked members to stop calling a narrow defeat a conspiracy.'],
      ['This biography gives a different occupation from the archived office-administration listing. It supplies no family-archive connection.']
    ]),
    page('dm_margaret_directory','Margaret Vale | Public correspondence listing','PUBLIC DIRECTORY',
      'www.publicdirectory.local/people/margaret-vale','directory',[
      [word('dm_margaret','Margaret Vale'),' — correspondence concerning the Vale family memorial.'],
      ['The listing directs enquiries to the family archive’s own contact page. No additional contact details are published here.'],
      ['Private messages, personal papers and copies of recordings must be requested from the person authorised to release them.'],
      ['Please do not send offers to improve the memorial’s search ranking. The family has enough unwelcome messages.']
    ],[{label:'Published family contact',pageId:'dm_family_contact'},{label:'Family memorial',pageId:'dm_memorial'},{label:'Public acknowledgement',pageId:'dm_margaret_thanks'}]),
    page('dm_margaret_library_notice','Margaret Vale thanks the library book volunteers','COMMUNITY LEDGER',
      'www.communityledger.local/community/vale-book-volunteers','news',[
      ['COMMUNITY NOTICE — a book-donation acknowledgement.'],
      [word('dm_margaret','Margaret Vale'),' thanked the volunteers who helped sort books donated in memory of ',word('dm_edward','Edward Vale'),'.'],
      ['The notice concerns books, not private office papers or recordings. The library has no family archive available for inspection.'],
      ['One box arrived labelled MISCELLANEOUS. Volunteers considered this unusually optimistic.'],
      ['No attendance register or information about anyone’s recent movements is included.']
    ],[{label:'Family acknowledgement',pageId:'dm_margaret_thanks'},{label:'Memorial page',pageId:'dm_memorial'}]),
    page('dm_margaret_thanks','A thank-you from Margaret Vale','VALE FAMILY ARCHIVE',
      'www.valefamily.local/edward/thanks','business',[
      [word('dm_margaret','Margaret Vale'),' thanks everyone who sent kind messages in memory of ',word('dm_edward','Edward Vale'),'.'],
      ['The family is keeping personal papers and the ',word('dm_archive','recording archive'),' privately. Public photographs and memorial notices do not imply permission to copy private files.'],
      ['Please use the published contact page for genuine correspondence. No downloads of private messages are offered here.'],
      ['Thank you also to whoever returned the borrowed casserole dish. Identifying the lid remains an open investigation.']
    ],[{label:'Family contact',pageId:'dm_family_contact'},{label:'Remembering Edward',pageId:'dm_memorial'}]),
    page('dm_margaret_costumes_namesake','Margaret Vale | Theatre alterations','VALE COSTUME REPAIRS',
      'www.valecostumerepairs.local/about','business',[
      ['Margaret Vale — theatrical alterations, costume repairs and emergency hems.'],
      ['The workshop biography describes a full-time costume maker serving touring theatre companies.'],
      ['Please state the production and collection date when enquiring. We cannot repair a dramatic exit once it has happened.'],
      ['The business page does not mention Edward or the Vale family memorial. A matching name alone does not connect the two listings.']
    ])
  ];
}

export function expandDeadMenSearch(data){
  const definition=data?.cases?.find(item=>item.id===CASE);
  if(!definition)return false;
  const old=APPLIED.get(definition);
  if(old&&old.pages===definition.pages&&old.recipes===definition.recipes&&old.words===definition.keywords&&
      old.pageCount===definition.pages.length&&old.recipeCount===definition.recipes.length&&old.wordCount===definition.keywords.length)return false;
  const keys=new Set(definition.keywords.map(keyword=>keyword.id));
  const additional=deadMenAdditionalPages();
  const usable=additional.filter(page=>page.blocks.flat().every(part=>typeof part==='string'||keys.has(part.keywordId)));
  const ids=new Set(definition.pages.map(page=>page.id));let changed=false;
  for(const extra of usable){if(!ids.has(extra.id)){definition.pages.push(extra);ids.add(extra.id);changed=true;}}
  for(const extra of definition.pages.filter(page=>usable.some(item=>item.id===page.id))){
    extra.links=(extra.links||[]).filter(link=>ids.has(link.pageId));
  }
  const additions=[
    [['dm_edward'],['dm_edward_directory','dm_edward_filing_profile','dm_edward_recorder_notice','dm_edward_bowls_namesake']],
    [['dm_margaret'],['dm_margaret_directory','dm_margaret_library_notice','dm_margaret_thanks','dm_margaret_costumes_namesake']],
    [['dm_edward','dm_margaret'],['dm_margaret_library_notice','dm_margaret_thanks']],
    [['dm_edward','dm_folder'],['dm_edward_filing_profile']],
    [['dm_edward','dm_voice'],['dm_edward_recorder_notice','dm_audio_article']],
    [['dm_edward','dm_archive'],['dm_edward_filing_profile','dm_edward_recorder_notice','dm_memorial']],
    [['dm_edward','dm_recorder'],['dm_edward_recorder_notice','dm_audio_article']],
    [['dm_edward','dm_accounts'],['dm_edward_directory','dm_edward_filing_profile']],
    [['dm_margaret','dm_voice'],['dm_margaret_directory','dm_family_contact','dm_audio_article']],
    [['dm_margaret','dm_archive'],['dm_margaret_thanks','dm_family_contact','dm_audio_article']],
    [['dm_margaret','dm_folder'],['dm_family_contact','dm_blue_shop']]
  ];
  for(const[terms,targets]of additions){
    if(!terms.every(id=>keys.has(id)))continue;
    const found=targets.filter(id=>ids.has(id));if(!found.length)continue;
    const signature=[...terms].sort().join('|');
    const recipe=definition.recipes.find(item=>[...item.terms].sort().join('|')===signature);
    if(recipe){
      const current=recipe.pageIds||[recipe.pageId];
      const merged=[...new Set([...current,...found].filter(Boolean))];
      if(JSON.stringify(current)!==JSON.stringify(merged)){recipe.pageIds=merged;delete recipe.pageId;changed=true;}
    }else{definition.recipes.push({terms:[...terms],pageIds:found});changed=true;}
  }
  APPLIED.set(definition,{pages:definition.pages,recipes:definition.recipes,words:definition.keywords,
    pageCount:definition.pages.length,recipeCount:definition.recipes.length,wordCount:definition.keywords.length});
  return changed;
}
