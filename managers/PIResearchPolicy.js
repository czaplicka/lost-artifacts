// Research keywords must not be promoted to case-board facts automatically.
// Actual photographs, statements, receipts and verified findings are not filtered.
export const PI_SEARCH_BOARD_ALIASES = Object.freeze({
  miramar_demo:'pi_two_glasses',
  dead_men_calling:'pi_dead_men_calling',
  borrowed_alibi:'pi_stolen_alibi'
});

const REED_WORD_CARDS = Object.freeze({
  reed_napkin_emblem:'seahorse_logo',
  reed_badge_emblem:'swallow_logo',
  reed_checked_jacket:'checked_jacket',
  reed_miramar_lead:'miramar',
  reed_open_skies_lead:'open_skies',
  reed_claire_name:'claire',
  reed_nora_name:'nora',
  reed_claire_work_address:'claire_email'
});

export function automaticResearchKeyword(caseId,itemId){
  if(caseId==='pi_two_glasses')return REED_WORD_CARDS[itemId]||null;
  if(caseId==='pi_stolen_alibi'&&String(itemId).startsWith('alibi_evidence_contact_')){
    return String(itemId).slice('alibi_evidence_contact_'.length)||null;
  }
  return null;
}

export function isAutomaticResearchCard(caseId,item){
  return Boolean(item&&automaticResearchKeyword(caseId,item.id));
}

export function separateLegacyResearch(state,caseId,board){
  const items=Array.isArray(board?.items)?board.items:[];
  const linked=new Set((Array.isArray(board?.links)?board.links:[]).flatMap(link=>[link.from,link.to]));
  const archived=[],kept=[];
  for(const item of items){
    const automatic=item.createdByPlayer===false&&item.editableByPlayer===false&&
      isAutomaticResearchCard(caseId,item);
    // Never remove a card already used in the player's chain of evidence.
    if(automatic&&!linked.has(item.id))archived.push(item);
    else kept.push(item);
  }
  if(!archived.length)return {items,changed:false};
  const previous=state.piResearchArchiveV1||{version:1,cases:{}};
  const saved=Array.isArray(previous.cases?.[caseId]?.items)?previous.cases[caseId].items:[];
  const merged=new Map(saved.map(item=>[item.id,item]));
  for(const item of archived)merged.set(item.id,JSON.parse(JSON.stringify(item)));
  state.piResearchArchiveV1={...previous,version:1,cases:{...(previous.cases||{}),
    [caseId]:{...(previous.cases?.[caseId]||{}),items:[...merged.values()]}}};
  return {items:kept,changed:true};
}
