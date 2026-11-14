import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';

const copy = value => JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value.trim() : '';
const skill = value => {
  const id = text(value).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  return ['pickpocket','pickpocketing',__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_fdb3d1ed938473e1e4ae")].includes(id) ? 'pickpocket' : id;
};
const token = value => encodeURIComponent(String(value));
export function getBoardEvidenceRecord(state) {
  return state.caseData?.boardEvidenceCases?.[getEvidenceCaseKey(state)] || {};
}

function evidence(id,label,body,index,tags=[],fields=[]) {
  return { id,type:'evidence',label,body,tag:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_8b59dc4ffecf624051e2"),fields,
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
    const label=clue.category==='accent'?__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_a5c6fb18c9af89b22a79"):__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_b67bb0b1f7b8b0dde907");
    const source=text(clue.npcId)||text(clue.sourceLabel)||__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_4acdba6cff1c8924bd1c");
    put(evidence(`npc-trait-${token(clue.id || `${clue.category}:${clue.value}`)}`,
      `${label}: ${clue.value}`,text(clue.text)||text(clue.tag)||`${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_5e4c3c78110d3c330a03")}${clue.value}${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_cdb4ee2aea69cc6a8333")}`,index++,
      ['npc-statement',clue.category],[{key:'Source',value:source}]));
  }
  const viewed=record.envelopeViewed;
  if(viewed?.clue?.category==='eyes' && text(viewed.clue.value)) {
    const clue=viewed.clue;
    const item=evidence(`board-${clue.id}`,__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_16a2ea7517342961d770"),clue.text,index++,
      ['apartment-identity-board','identity-evidence','eyes'],[
        {key:'Eye colour',value:clue.value},
        {key:'Source',value:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_6d25455ec020cd8ffef9")},
        {key:'Identity',value:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_a7f2fa193c5eed5e4e7f")}
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
        caption:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_95f725137a57609f2c57"),
        meta:[__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_878c7d9cd9d443ed07a1"),matching?.image?__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_c0bfdc0c2ff07aa72c0a"):__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_77f96ea433d744c50f06")],
        suspectId:id,clueId:`warrant-${id}`,tags:['board-evidence-v2','suspect','warrant-identity'],
        discovered:true,createdByPlayer:false,editableByPlayer:false});
      // Keep the discovery as history, but do not claim that the real name is
      // still unknown once the matching identity has actually been recorded.
      for(const item of data.items) {
        if(!item.tags?.includes('false-identity'))continue;
        if(viewed?.actualId && String(viewed.actualId)===id) {
          item.text=String(item.text || '').replace(
            __dialogueText("crimeBoard/BoardEvidenceModel.js", "t_bf87a2f06de395a96d1e"),
            `${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_18b4b1fe6487442543c4")}${name}${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_41461bc5bdbbbe8b3928")}`
          );
        }
      }
    }
  }
  for(const recovery of list(record.recoveredArtifacts)) {
    const missionKey=state.currentMission.artifactKey;
    if(!recovery?.artifactKey || !missionKey || recovery.artifactKey!==missionKey)continue;
    put(evidence(`apartment-artifact-${token(recovery.artifactKey)}`,
      __dialogueText("crimeBoard/BoardEvidenceModel.js", "t_229f6de571ec8fcf7318"),`${recovery.name || state.currentMission.artifact || __dialogueText("crimeBoard/BoardEvidenceModel.js", "t_eb4eac402ebfd272cdb8")}${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_b7d2ed3a7a67af88835b")}`,
      index++,['artifact-recovered','apartment-evidence'],[
        {key:'Location',value:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_4f5eeed47b35d39f068f")},
        {key:'Status',value:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_c70fb44912eff1a83162")}
      ]));
  }
  const caseKey=getEvidenceCaseKey(state);
  const examinations=state.caseData?.labEvidenceExaminations?.[caseKey] || {};
  const ticket=state.caseData?.ticketAnalyses?.[caseKey];
  for(const result of Object.values(examinations)) {
    if(!result?.itemId || !result.examinedAt || !text(result.text))continue;
    const name=text(record.materials?.[result.itemId]?.name)||__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_985f13ce263cb00b201b");
    const body=[result.text];
    const fields=[{key:'Material',value:name},{key:'Source',value:__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_742e27a5828691c412bc")},
      {key:'Finding',value:result.useful?__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_539409392b505be0653e"):__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_b81190943e451149dc9a")}];
    if(ticket?.completed===true && ticket.sourceItemId===result.itemId) {
      if(text(ticket.clueText) && !result.text.includes(ticket.clueText))body.push(ticket.clueText);
      if(text(ticket.airportCode))fields.push({key:'Destination airport code',value:ticket.airportCode});
    }
    const item=evidence(`apartment-analysis-${token(result.itemId)}`,
      `${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_3e2b8bb857d251fe62b6")}${name}`,body.join('\n\n'),index++,['apartment-analysis','lab-result'],fields);
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
    item.text=[`${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_33015d46faedfc82985e")}${name}${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_cdb4ee2aea69cc6a8333")}`,detail,
      confirmed?__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_21556dc598b5f96bb194"):
        __dialogueText("crimeBoard/BoardEvidenceModel.js", "t_eb3fca0d5bf4312cffd0")
    ].filter(Boolean).join('\n\n');
    item.sourceObjectId=source.card.id;item.sourceObjectName=name;
    item.metaText=`${__dialogueText("crimeBoard/BoardEvidenceModel.js", "t_4f997b90335a7aada43d")}${name}`;
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
