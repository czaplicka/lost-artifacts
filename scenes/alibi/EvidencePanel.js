import { getEvidenceCatalog, CONTRADICTION_TYPES, challengeWitness } from '../../alibi/AlibiCooperation.js';

export function resetEvidenceDraft(scene) { scene.evidenceFeedback=false; scene.evidenceDraft={step:'claim',page:0,targetId:null,evidenceId:null,type:null}; }
function context(scene) {
 scene.evidenceDraft??={step:'claim',page:0};
 const catalog=getEvidenceCatalog(scene.caseKey,scene.encounterId),d=scene.evidenceDraft;
 return {d,...catalog,target:catalog.claims.find(c=>c.id===d.targetId),source:catalog.evidence.find(c=>c.id===d.evidenceId)};
}
export function evidencePreview(scene) {
 if(scene.evidenceFeedback||scene.tab!=='challenge'||scene.view.state.pendingChallenge||scene.view.revisedStatement||!scene.view.canChallenge)return null;
 const {d,target,source}=context(scene);
 const title={claim:'1 / SELECT THE DISPUTED CLAIM',evidence:'2 / SELECT THE OTHER ACCOUNT',type:'3 / IDENTIFY THE CONTRADICTION',confirm:'4 / REVIEW YOUR COMPARISON'}[d.step];
 const text=[title,target?`DISPUTED CLAIM — ${target.role}:\n"${target.text}"`:'Choose the exact passage you want to dispute.',
 source?`RECORDED ACCOUNT — ${source.role}:\n"${source.text}"`:d.step!=='claim'?'Choose a recorded account from another witness.':'Only details you obtained appear here.',
 d.type?`YOUR REASON: ${CONTRADICTION_TYPES.find(t=>t.id===d.type)?.label}`:'',
 d.step==='confirm'?'Submitting an unsupported comparison costs 5 minutes, but does not reduce cooperation.':'Nothing is checked or charged until you submit.'].filter(Boolean).join('\n\n');
 return {title:'EVIDENCE COMPARISON',body:text};
}
export function renderEvidenceActions(scene) {
 if(scene.view.revisedStatement){scene.info('A correction is recorded alongside the original. Review both in NOTES.');return;}
 if(!scene.view.canChallenge){scene.info('You need this witness\'s detailed account, Cooperative or Open cooperation, and the other two detailed accounts.');return;}
 if(scene.evidenceFeedback) {
  const paused=Object.entries(scene.view.state.confrontations||{}).find(([,t])=>t.evidenceProof&&!t.resolved);
  if(paused)scene.choice(0,'Resume recorded comparison',()=>scene.run(()=>challengeWitness(scene.caseKey,scene.encounterId,paused[0])));
  scene.choice(1,'Build another comparison',()=>{resetEvidenceDraft(scene);scene.replyPage=0;scene.render();});
  scene.choice(2,'Review interview notes',()=>{scene.tab='notes';scene.replyPage=0;scene.render();});
  scene.actionHint('Read the recorded response above. Neither a rejection nor a pause adds new alibi facts.');return;
 }
 const {d,claims,evidence,target,source}=context(scene);
 const go=step=>{d.step=step;d.page=0;scene.replyPage=0;scene.render();};
 const clear=()=>{resetEvidenceDraft(scene);scene.replyPage=0;scene.render();};
 const back=()=>{if(d.step==='claim'){scene.tab='questions';clear();}else go({evidence:'claim',type:'evidence',confirm:'type'}[d.step]);};
 if(d.step==='confirm') {
  scene.choice(0,'Present this comparison / 5 min if unsupported',()=>scene.run(()=>{
   const result=challengeWitness(scene.caseKey,scene.encounterId,{targetId:d.targetId,evidenceId:d.evidenceId,type:d.type});
   if(result)resetEvidenceDraft(scene);return result;
  }),Boolean(target&&source&&d.type));
  scene.choice(1,'Back: change the reason',back);
  scene.choice(2,'Start a different comparison',clear);
  scene.actionHint('The witness response follows submission. A matching topic alone is not evidence.');return;
 }
 if(d.step==='type') {
  CONTRADICTION_TYPES.forEach((item,i)=>scene.choice(i,item.label,()=>{d.type=item.id;go('confirm');}));
  scene.choice(4,'Back: change the source',back);scene.choice(5,'Start over',clear);return;
 }
 const items=d.step==='claim'?claims:evidence;
 const pages=Math.max(1,Math.ceil(items.length/3));d.page=Math.max(0,Math.min(d.page,pages-1));
 items.slice(d.page*3,d.page*3+3).forEach((item,i)=>{
  const label=d.step==='claim'?`"${item.text.length>70?item.text.slice(0,67)+'...':item.text}"`:
    `${item.role} / ${item.kind==='account'?'Recorded alibi account':'Additional case-file context'}`;
  scene.choice(i,label,()=>{
   if(d.step==='claim'){d.targetId=item.id;d.evidenceId=null;d.type=null;go('evidence');}
   else{d.evidenceId=item.id;d.type=null;go('type');}
  });
 });
 scene.choice(3,`Next page / ${d.page+1} of ${pages}`,()=>{d.page=(d.page+1)%pages;scene.render();},pages>1);
 scene.choice(4,d.step==='claim'?'Back to questions':'Back: change the claim',back);
 const paused=Object.entries(scene.view.state.confrontations||{}).find(([,t])=>t.evidenceProof&&!t.resolved);
 if(d.step==='claim'&&paused)scene.choice(5,'Resume recorded comparison',()=>scene.run(()=>challengeWitness(scene.caseKey,scene.encounterId,paused[0])));
 else scene.choice(5,'Start over',clear,Boolean(target||source));
}
