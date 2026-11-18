import { getAlibiKnowledge } from '../AlibiKnowledge.js';
import { findData, hash } from './Runtime.js';
import { RULES, falsePattern, EVIDENCE_RULE_VERSION } from './EvidenceRules.js';

export function splitStatement(text) {
 const value=String(text||'').trim();
 const result=[]; let start=0;
 for(let i=0;i<value.length;i++) {
  if(!'.!?'.includes(value[i])) continue;
  if(i+1<value.length && !/\s/.test(value[i+1])) continue;
  const last=value.slice(start,i+1).trim().split(/\s/).at(-1);
  if(value[i]==='.' && (/^(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No)\.$/i.test(last)||/^[A-Z]\.$/.test(last))) continue;
  const part=value.slice(start,i+1).trim();if(part)result.push(part);start=i+1;
 }
 const tail=value.slice(start).trim();if(tail)result.push(tail);
 return result;
}
function passages(witness) {
 const text=String(witness.statement||'');
 const marker=' Separately, the case file records:';
 const offset=text.indexOf(marker);
 const observed=(offset<0?text:text.slice(0,offset)).trim();
 const context=offset<0?'':text.slice(offset).trim();
 const make=(kind,index,text)=>({id:`${witness.npcId}:${kind}:${index}`,npcId:witness.npcId,
   role:witness.role||'Witness',kind,index,text,hash:hash(text)});
 const claims=splitStatement(observed).map((text,i)=>make('claim',i,text));
 if(context)claims.push(make('context',0,context));
 const evidence=observed?[make('account',0,observed)]:[];
 if(context)evidence.push(make('context',0,context));
 return {claims,evidence};
}
export function getEvidenceCatalog(caseKey,encounterId) {
 const {subject,witness}=findData(caseKey,encounterId);
 const claims=[],evidence=[];
 for(const other of subject.witnesses) {
  if(!getAlibiKnowledge(caseKey,other.npcId).details)continue;
  const units=passages(other);
  if(other.npcId===witness.npcId)claims.push(...units.claims);
  else evidence.push(...units.evidence);
 }
 return {claims,evidence};
}
export function validateEvidenceSelection(caseKey,encounterId,selection) {
 if(!selection||typeof selection!=='object')return {valid:false};
 const {subject,witness}=findData(caseKey,encounterId);
 if(!subject.witnesses.every(w=>getAlibiKnowledge(caseKey,w.npcId).details))return {valid:false};
 const catalog=getEvidenceCatalog(caseKey,encounterId);
 const target=catalog.claims.find(c=>c.id===selection.targetId);
 const evidence=catalog.evidence.find(c=>c.id===selection.evidenceId);
 if(!target||!evidence)return {valid:false};
 const pattern=falsePattern(subject), rule=pattern===null?null:RULES[pattern];
 if(!rule || witness.isLiar!==true || target.kind!=='claim' || evidence.kind!=='account' ||
    !rule.targets.includes(target.index) || !rule.types.includes(selection.type))return {valid:false};
 // Both independently corroborating witnesses in this generator are admissible sources.
 const other=subject.witnesses.find(w=>w.npcId===evidence.npcId);
 if(!other||other.isLiar===true||other.npcId===witness.npcId)return {valid:false};
 const contradiction=subject.contradiction;
 if(!contradiction || contradiction.witnessRoleId!==witness.roleId)return {valid:false};
 const sourceIndex=other.roleId===contradiction.supportingRoleId?1:2;
 if(rule.sources?.[target.index]&&!rule.sources[target.index].includes(sourceIndex))return {valid:false};

 if(selection.version!==undefined && (selection.version!==EVIDENCE_RULE_VERSION ||
    selection.caseKey!==caseKey || selection.encounterId!==encounterId ||
    selection.targetHash!==target.hash || selection.evidenceHash!==evidence.hash ||
    selection.targetText!==target.text || selection.evidenceText!==evidence.text))return {valid:false};
 return {valid:true,topic:rule.topic,proof:{version:EVIDENCE_RULE_VERSION,caseKey,encounterId,
   targetId:target.id,evidenceId:evidence.id,type:selection.type,
   targetHash:target.hash,evidenceHash:evidence.hash,targetText:target.text,
   evidenceText:evidence.text,evidenceRole:evidence.role}};
}
