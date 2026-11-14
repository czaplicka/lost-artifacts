import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';

const copy = value => JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value.trim() : '';
const skill = value => {
  const id = text(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  return ['pickpocket','pickpocketing','pick pocketing'].includes(id) ? 'pickpocket' : id;
};
const token = value => encodeURIComponent(String(value));
export function getBoardEvidenceRecord(state) {
  return state.caseData?.boardEvidenceCases?.[getEvidenceCaseKey(state)] || {};
}

function evidence(id,label,body,index,tags=[],fields=[]) {
  return { id,type:'evidence',label,body,tag:'Case evidence',fields,
    x:810+(index%2)*260,y:110+Math.floor(index/2)*215,z:8,
    rotation:index%2?1.2:-1.2,pinned:false,clueId:id,
    tags:['board-evidence-v2',...tags],discovered:true,
    createdByPlayer:false,editableByPlayer:false };
}

export function decorateBoardEvidence(input,state) {
  const data=copy(input);
  data.items=list(data.items);data.links=list(data.links);
  if(!state?.currentMission)return data;
  const record=getBoardEvidenceRecord(state);
  const previous=new Map(data.items.map(item=>[item.id,item]));
  // The old workspace adds this card as soon as the envelope is taken.
  // Regenerate it only from a recorded inventory view.
  data.items=data.items.filter(item=>item.createdByPlayer ||
    (!item.tags?.includes('apartment-identity-board') &&
     !item.tags?.includes('board-evidence-v2')));
  let index=0;
  const put=item=>{
    const old=previous.get(item.id);
    if(old)for(const field of ['x','y','z','rotation','pinned'])if(old[field]!==undefined)item[field]=old[field];
    const at=data.items.findIndex(entry=>entry.id===item.id);
    if(at<0)data.items.push(item);else data.items[at]=item;
    return item;
  };
  for(const clue of list(state.cluesCollected)) {
    if(clue?.type!=='suspect' || !['accent','features'].includes(clue.category) || !text(clue.value))continue;
    if(clue.caseId!=null && String(clue.caseId)!==String(state.currentCaseId))continue;
    const label=clue.category==='accent'?'Accent':'Distinctive feature';
    const source=text(clue.npcId)||text(clue.sourceLabel)||'Recorded NPC conversation';
    put(evidence(`npc-trait-${token(clue.id || `${clue.category}:${clue.value}`)}`,
      `${label}: ${clue.value}`,text(clue.text)||text(clue.tag)||`A witness reported: ${clue.value}.`,index++,
      ['npc-statement',clue.category],[{key:'Source',value:source}]));
  }
  const viewed=record.envelopeViewed;
  if(viewed?.clue?.category==='eyes' && text(viewed.clue.value)) {
    const clue=viewed.clue;
    const item=evidence(`board-${clue.id}`,'Recovered photograph / forged ID',clue.text,index++,
      ['apartment-identity-board','identity-evidence','eyes'],[
        {key:'Eye colour',value:clue.value},
        {key:'Source',value:'ID Preparation Envelope — viewed in inventory'},
        {key:'Identity',value:'The recorded name and occupation are false'}
      ]);
    item.clueId=clue.id;put(item);
  }
  const warrant=record.warrant;
  const activeWarrant=state.arrestWarrantIssued && state.warrantSuspectId!=null;
  if(activeWarrant) {
    const id=String(state.warrantSuspectId);
    const matching=warrant && String(warrant.id)===id ? warrant : null;
    const name=text(matching?.name)||text(state.warrantSuspectName);
    if(name) {
      put({id:`warrant-identity-${token(id)}`,type:'photo',
        x:70,y:125,z:9,rotation:-1.4,pinned:true,
        label:name,image:text(matching?.image)||'assets/suspects/unknown.webp',
        caption:'Identity named in the issued arrest warrant. This is not a finding of guilt.',
        meta:['Issued warrant',matching?.image?'Database photograph':'Photograph unavailable'],
        suspectId:id,clueId:`warrant-${id}`,tags:['board-evidence-v2','suspect','warrant-identity'],
        discovered:true,createdByPlayer:false,editableByPlayer:false});
      // Keep the discovery as history, but do not claim that the real name is
      // still unknown once the matching identity has actually been recorded.
      for(const item of data.items) {
        if(!item.tags?.includes('false-identity'))continue;
        if(viewed?.actualId && String(viewed.actualId)===id) {
          item.text=String(item.text || '').replace(
            'The suspect’s real name is still unknown.',
            `The issued warrant names ${name}. See the warrant identity card.`
          );
        }
      }
    }
  }
  for(const recovery of list(record.recoveredArtifacts)) {
    const missionKey=state.currentMission.artifactKey;
    if(!recovery?.artifactKey || !missionKey || recovery.artifactKey!==missionKey)continue;
    put(evidence(`apartment-artifact-${token(recovery.artifactKey)}`,
      'Artifact recovered',`${recovery.name || state.currentMission.artifact || 'The stolen artifact'} was recovered from the suspect’s apartment.`,
      index++,['artifact-recovered','apartment-evidence'],[
        {key:'Location',value:'Suspect apartment'},
        {key:'Status',value:'Recovered during the apartment search'}
      ]));
  }
  const caseKey=getEvidenceCaseKey(state);
  const examinations=state.caseData?.labEvidenceExaminations?.[caseKey] || {};
  const ticket=state.caseData?.ticketAnalyses?.[caseKey];
  for(const result of Object.values(examinations)) {
    if(!result?.itemId || !result.examinedAt || !text(result.text))continue;
    const name=text(record.materials?.[result.itemId]?.name)||'Apartment material';
    const body=[result.text];
    const fields=[{key:'Material',value:name},{key:'Source',value:'Crime Lab'},
      {key:'Finding',value:result.useful?'Useful lead recorded':'No useful travel information'}];
    if(ticket?.completed===true && ticket.sourceItemId===result.itemId) {
      if(text(ticket.clueText) && !result.text.includes(ticket.clueText))body.push(ticket.clueText);
      if(text(ticket.airportCode))fields.push({key:'Destination airport code',value:ticket.airportCode});
    }
    const item=evidence(`apartment-analysis-${token(result.itemId)}`,
      `Analysis: ${name}`,body.join('\n\n'),index++,['apartment-analysis','lab-result'],fields);
    item.sourceItemId=result.itemId;item.clueId=result.itemId;put(item);
  }
  // Replace generic reconstruction-skill text with the actual accepted card.
  const reconstruction=state.reconstructedHeist || {};
  const accepted=new Map();
  list(reconstruction.playerOrderedCards).slice(0,3).forEach((card,i)=>{
    const feedback=list(reconstruction.playerSlotFeedback)[i];
    if(!['green','yellow'].includes(feedback) || !card?.id)return;
    const claim=list(reconstruction.claims).find(c=>String(c?.solutionItemId)===String(card.id));
    if(!claim?.thiefSkill)return;
    const id=skill(claim.thiefSkill),old=accepted.get(id);
    if(!old || (old.feedback==='yellow' && feedback==='green'))accepted.set(id,{card,feedback});
  });
  for(const item of data.items) {
    if(!item.tags?.includes('hypothesis-skill'))continue;
    const source=accepted.get(skill(String(item.label || '').replace(/\s*\?$/,'')));
    if(!source)continue;
    const name=text(source.card.item)||text(source.card.label)||text(source.card.title)||text(source.card.name);
    if(!name)continue;
    const detail=text(source.card.description)||text(source.card.heistExplanation);
    const confirmed=source.feedback==='green';
    item.text=[`Source object: ${name}.`,detail,
      confirmed?'The object was correctly placed in your reconstruction.':
        'The object was relevant, but its position in your reconstruction was wrong. This skill remains uncertain.'
    ].filter(Boolean).join('\n\n');
    item.sourceObjectId=source.card.id;item.sourceObjectName=name;
    item.metaText=`Reconstruction evidence: ${name}`;
  }
  const ids=new Set(data.items.map(item=>item.id));
  data.links=data.links.filter(link=>ids.has(link.from)&&ids.has(link.to));
  const pairs=new Set(data.links.map(link=>[link.from,link.to].sort().join('\u0000')));
  const suspect=data.items.find(item=>item.tags?.includes('warrant-identity')) ||
    data.items.find(item=>item.tags?.includes('case-suspect')) ||
    data.items.find(item=>item.tags?.includes('suspect'));
  if(suspect)for(const item of data.items) {
    if(!item.tags?.includes('board-evidence-v2') || item.id===suspect.id)continue;
    const pair=[suspect.id,item.id].sort().join('\u0000');
    if(pairs.has(pair))continue;
    pairs.add(pair);data.links.push({id:`evidence-link-${token(item.id)}`,from:suspect.id,to:item.id,
      fromAnchor:'right',toAnchor:'left',color:'#b3131b',createdByPlayer:false,editableByPlayer:false});
  }
  return data;
}
