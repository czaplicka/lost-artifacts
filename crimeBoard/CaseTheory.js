import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { deductionManager, DEDUCTION_CHANGED } from '../managers/DeductionManager.js';
import { hintManager } from '../managers/HintManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { isCorrectMotiveAnswer, getMotiveById } from '../motiveService.js';
import {
  THEORY_FIELDS, THEORY_OPTIONS, normalizeSkillId, normalizeTheory,
  buildSkillOptions, theoryCaseKey, readTheory, getTheoryReadiness,
  evaluateTheorySelection
} from './CaseTheoryModel.js';
export { THEORY_FIELDS, THEORY_OPTIONS, normalizeSkillId, normalizeTheory, buildSkillOptions };
const clone=value=>JSON.parse(JSON.stringify(value));
const HELP_COSTS={cut_corners:{energy:5,minutes:10},squad_help:{energy:10,minutes:30}};
const HELP_TEXT={
  identity:'Compare the issued warrant with the identification evidence. A false name is not a second person. Attach the identification source, not just your confidence.',
  motive:'Read the apartment material and witness accounts about why the artifact was taken. Distinguish a reason from the method used.',
  means:'Return to the reconstruction. Connect each chosen skill to a specific object or action. A suspect may possess skills that were not used in this theft.',
  opportunity:'Look for access during the crime window. Employment, a gap in observation and a false alibi are different claims. Attach evidence for the claim you actually choose.'
};
export function installCaseTheory(api,initialState,host) {
  const boardApp=api.board.root.closest('.crime-board-app');
  if(!boardApp)throw new Error('Case Theory: crime-board-app is missing.');
  const abort=new AbortController();
  const listen=(node,event,handler)=>node.addEventListener(event,handler,{signal:abort.signal});
  const element=(tag,text,className='')=>{
    const node=document.createElement(tag);if(text!==undefined)node.textContent=text;node.className=className;return node;
  };
  const button=(text,action)=>{const node=element('button',text);node.type='button';listen(node,'click',action);return node;};
  let state=initialState,key=theoryCaseKey(state),caseId=state.currentCaseId,campaignId=state._createdAt;
  let draft=readTheory(state),dead=false,busy=false,activeTab='evidence';
  let skills=[],motives=[],loadError='',loading=true,dataRun=0;
  const originalRefresh=api.refresh.bind(api),originalDestroy=api.destroy.bind(api);
  const originalSave=api.saveWorkspace?.bind(api),rows=new Map();
  const style=element('style');
  style.textContent=`
    .ct-tabs,.ct-footer,.ct-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .ct-tabs{padding:10px 90px 10px 12px;background:#241d18;position:relative;z-index:20}
    .ct-tabs button,.ct-panel button,.ct-help button{padding:10px 14px;background:#d9bb79;color:#241d18;border:1px solid #927344;border-radius:6px;font:14px SpecialElite,monospace;cursor:pointer}
    .ct-tabs button[aria-selected=true]{background:#f3d69b}
    .ct-panel button:disabled,.ct-help button:disabled{opacity:.45;cursor:not-allowed}
    .ct-panel{padding:18px;color:#f4e6cb;background:#201914;font:15px SpecialElite,monospace;min-height:600px}
    .ct-panel[hidden],.crime-board-app[hidden]{display:none!important}
    .ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .ct-section{padding:16px;border:1px solid #8e7042;border-radius:9px;background:#34281f;min-width:0}
    .ct-section h3{margin:0;color:#f2d08e;font-size:22px}
    .ct-section p{line-height:1.5;white-space:pre-line}
    .ct-panel select,.ct-panel textarea{box-sizing:border-box;width:100%;margin:7px 0 12px;padding:10px;background:#f0dfba;color:#281e16;border:1px solid #a38654;font:15px SpecialElite,monospace}
    .ct-panel textarea{min-height:80px;resize:vertical}
    .ct-evidence,.ct-skills{display:grid;gap:5px;max-height:230px;overflow:auto;border:1px solid #6c5539;padding:7px;margin:10px 0}
    .ct-evidence label,.ct-skills label{display:flex;align-items:flex-start;gap:9px;padding:7px;overflow-wrap:anywhere;cursor:pointer}
    .ct-evidence input,.ct-skills input{flex:0 0 auto;width:17px;height:17px;accent-color:#d9bb79}
    .ct-muted{color:#c6b28f;font-size:13px}
    .ct-verdict{padding:8px;border-left:3px solid #ae8d51}
    .ct-footer{margin-top:16px}
    .ct-help{max-width:560px;width:calc(100vw - 50px);background:#201914;color:#f4e6cb;border:2px solid #bd9957;font:17px SpecialElite,monospace;padding:22px}
    .ct-help::backdrop{background:rgba(0,0,0,.8)}
    .ct-help p{white-space:pre-line;line-height:1.5}
    .ct-help-actions{display:grid;gap:12px}
    .ct-identity-preview{display:flex;gap:15px;align-items:center;margin:10px 0;padding:12px;background:#241d18;border:1px solid #927344}
    .ct-identity-preview img{width:112px;height:128px;object-fit:contain;background:#e8dcc4;border:4px solid #eee0bd;flex:0 0 auto}
    .ct-identity-preview figcaption{white-space:pre-line;line-height:1.5;overflow-wrap:anywhere}
    .ct-panel :focus-visible,.ct-help :focus-visible,.ct-tabs :focus-visible{outline:2px solid #ffd36c;outline-offset:3px}
    @media(max-width:760px){.ct-grid{grid-template-columns:1fr}.ct-panel{padding:10px}}
  `;
  const uid=`ct-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  const tabs=element('nav',undefined,'ct-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Investigation workspace');
  const panel=element('section',undefined,'ct-panel');panel.id=`${uid}-theory`;boardApp.id||=`${uid}-evidence`;
  const evidenceTab=button('Evidence Board',()=>switchTab('evidence'));
  const theoryTab=button('Case Theory',()=>switchTab('theory'));
  for(const [node,target,suffix] of [[evidenceTab,boardApp,'evidence'],[theoryTab,panel,'theory']]) {
    node.id=`${uid}-${suffix}-tab`;node.setAttribute('role','tab');node.setAttribute('aria-controls',target.id);
    target.setAttribute('role','tabpanel');target.setAttribute('aria-labelledby',node.id);
  }
  tabs.append(evidenceTab,theoryTab);
  panel.append(element('h2','Case Theory'),element('p','Choose four conclusions and attach evidence to each. Completeness permits an arrest; it does not guarantee a conviction.'));
  const grid=element('div',undefined,'ct-grid');panel.append(grid);
  const footer=element('div',undefined,'ct-footer'),status=element('span','');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const saveButton=button('Save Theory',()=>{save();updateProgress();status.textContent='Theory saved. No arrest or accusation submitted.';});
  const retryButton=button('Retry loading options',()=>loadOptions());retryButton.hidden=true;
  footer.append(saveButton,retryButton,status);panel.append(footer);
  panel.append(element('p','Deduction verifies only the selected conclusion or skill. It does not certify every attached document.','ct-muted'));
  host.insertBefore(tabs,boardApp);host.append(panel,style);
  const dialog=element('dialog',undefined,'ct-help');document.body.append(dialog);
  const cards=()=>(api.getData().items || []).filter(card=>card?.discovered!==false);
  function save() {
    if(dead)return;
    // Do not stamp an old open draft as belonging to a new case.
    if(String(state.currentCaseId)!==String(caseId) || state._createdAt!==campaignId)return;
    draft.caseId=caseId ?? null;draft.campaignId=campaignId ?? null;draft.updatedAt=new Date().toISOString();
    draft.status=getTheoryReadiness(state,draft,cards()).complete?'complete':'draft';
    state.caseTheories={...(state.caseTheories || {}),[key]:clone(draft)};requestAutosave();
  }
  function answerOptions(field) {
    if(field==='identity')return [...new Map(cards().filter(c=>c.suspectId && !c.tags?.includes('unknown') && !c.createdByPlayer)
      .map(c=>[String(c.suspectId),[String(c.suspectId),c.label]])).values()];
    return field==='motive'?motives:THEORY_OPTIONS[field] || [];
  }
  function updateProgress() {
    const result=getTheoryReadiness(state,draft,cards());
    const count=THEORY_FIELDS.filter(([field])=>field==='means'?draft.sections.means.skillIds.length:draft.sections[field].answerId).length;
    saveButton.textContent=`Save Theory — ${count}/4 conclusions`;
    saveButton.title=result.complete?'Complete. Correctness is not checked.':result.missing.join('\n');
    status.textContent=result.complete?'Complete — arrest requirement met. The defence may disagree with the contents.':result.missing.join(' ');
    const hints=hintManager.getAvailableCount(),deduction=deductionManager.getSummary().available;
    for(const row of rows.values()) {
      row.hint.textContent=`HINT (${hints})`;row.deduction.textContent=`DEDUCTION (${deduction})`;
      row.hint.disabled=busy;row.deduction.disabled=busy;
    }
  }
  function checkbox(container,id,label,checked,change,tooltip='') {
    const node=element('label'),input=element('input');input.type='checkbox';input.value=id;input.checked=checked;
    node.title=tooltip;node.append(input,element('span',label));listen(input,'change',()=>change(input.checked));container.append(node);
  }
  function changed(field) {
    rows.get(field).verdict.textContent='';save();updateProgress();if(field==='identity')renderIdentityPreview();
  }
  for(const [field,title,question] of THEORY_FIELDS) {
    const section=element('section',undefined,'ct-section');section.append(element('h3',title),element('p',question));
    const select=field==='means'?null:element('select'),skillList=field==='means'?element('div',undefined,'ct-skills'):null;
    if(select) {
      const label=element('label','Your conclusion');label.append(select);section.append(label);
      listen(select,'change',()=>{draft.sections[field].answerId=select.value;changed(field);});
    } else {skillList.setAttribute('role','group');skillList.setAttribute('aria-label','Skills used');section.append(skillList);}
    const preview=field==='identity'?element('div'):null;if(preview)section.append(preview);
    const help=element('p','','ct-muted');section.append(help,element('h4','Supporting evidence'));
    const evidence=element('div',undefined,'ct-evidence');evidence.setAttribute('role','group');evidence.setAttribute('aria-label',`${title}: supporting evidence`);section.append(evidence);
    const noteLabel=element('label','Your reasoning (optional)'),note=element('textarea');note.maxLength=8000;note.rows=3;noteLabel.append(note);section.append(noteLabel);
    listen(note,'input',()=>{draft.sections[field].note=note.value;save();});
    const actions=element('div',undefined,'ct-actions'),target=field==='means'?element('select'):null;
    if(target){target.setAttribute('aria-label','Choose a skill or the complete skill set to check');section.append(target);}
    const hint=button('HINT',()=>openHint(field)),deduction=button('DEDUCTION',()=>checkDeduction(field));
    actions.append(hint,deduction);section.append(actions);
    const verdict=element('p','','ct-verdict');verdict.setAttribute('role','status');verdict.setAttribute('aria-live','polite');section.append(verdict);
    rows.set(field,{select,skillList,help,evidence,note,hint,deduction,target,verdict,preview});grid.append(section);
  }
  function renderIdentityPreview() {
    const host=rows.get('identity').preview;host.replaceChildren();
    const all=cards(),selected=draft.sections.identity.answerId;
    const candidate=selected ? all.find(card=>String(card.suspectId)===selected && card.type==='photo' && !card.tags?.includes('unknown'))
      : all.find(card=>card.tags?.includes('warrant-identity'));
    if(!candidate){host.append(element('p',selected?'No confirmed photograph is recorded for this identity.':'Issue a warrant to add a named identity and photograph.','ct-muted'));return;}
    const figure=element('figure',undefined,'ct-identity-preview');
    const caption=element('figcaption',`${candidate.label}\n${selected?'Selected identity':'Issued warrant — no conclusion selected'}\nA warrant is not proof of guilt.`);
    if(candidate.image) {
      const image=element('img');image.src=candidate.image;image.alt=`Recorded photograph: ${candidate.label}`;
      listen(image,'error',()=>{image.hidden=true;caption.textContent+='\nPhotograph unavailable.';});figure.append(image);
    }
    figure.append(caption);host.append(figure);
  }
  function renderSkillTargets() {
    const target=rows.get('means').target,previous=target.value;target.replaceChildren();
    const whole=element('option','Check the complete selected skill set');whole.value='';target.append(whole);
    for(const id of draft.sections.means.skillIds){const option=element('option',`Check only: ${new Map(skills).get(id)||id}`);option.value=id;target.append(option);}
    if(draft.sections.means.skillIds.includes(previous))target.value=previous;
  }
  function render() {
    const available=cards();
    for(const [field] of THEORY_FIELDS) {
      const row=rows.get(field),value=draft.sections[field];
      if(field==='means') {
        row.skillList.replaceChildren();const options=new Map(skills);
        for(const id of value.skillIds)if(!options.has(id))options.set(id,`Previously selected: ${id}`);
        for(const [id,label] of options)checkbox(row.skillList,id,label,value.skillIds.includes(id),checked=>{
          const selected=new Set(value.skillIds);checked?selected.add(id):selected.delete(id);value.skillIds=[...selected];changed(field);renderSkillTargets();
        });
        row.help.textContent=loading?'Loading skills...':loadError || 'Select skills used in this theft, not every skill the suspect possesses.';
        if(value.legacyAnswerId)row.help.textContent+=` Previous legacy conclusion: ${value.legacyAnswerId}. Select skills manually.`;
        renderSkillTargets();
      } else {
        row.select.replaceChildren();const options=answerOptions(field),placeholder=element('option','Choose a conclusion...');placeholder.value='';row.select.append(placeholder);
        for(const [id,label] of options){const option=element('option',label);option.value=id;row.select.append(option);}
        if(value.answerId && !options.some(([id])=>id===value.answerId)) {
          const old=element('option',`Previously selected: ${value.answerId} (not currently available)`);old.value=value.answerId;row.select.append(old);
        }
        row.select.value=value.answerId;
        row.help.textContent=field==='identity'?'Only discovered named suspect cards are offered.':field==='motive' && loadError?loadError:'Your choice is not automatically verified.';
      }
      row.note.value=value.note;row.evidence.replaceChildren();const all=new Map(available.map(card=>[card.id,card]));
      for(const id of value.evidenceIds)if(!all.has(id))all.set(id,{id,label:`Unavailable evidence: ${id}`});
      for(const card of all.values())checkbox(row.evidence,card.id,card.label || card.id,value.evidenceIds.includes(card.id),checked=>{
        const selected=new Set(value.evidenceIds);checked?selected.add(card.id):selected.delete(card.id);value.evidenceIds=[...selected];changed(field);
      },card.body || card.text || card.caption || '');
      if(!all.size)row.evidence.append(element('p','No discovered cards yet.','ct-muted'));
    }
    renderIdentityPreview();retryButton.hidden=!loadError;updateProgress();
  }
  function checkDeduction(field) {
    if(dead || busy)return;
    const row=rows.get(field),value=draft.sections[field];
    const selection=field==='means'?row.target.value?{skillId:row.target.value}:{skillIds:[...value.skillIds].sort()}:{answerId:value.answerId};
    if((field==='means' && !value.skillIds.length) || (field!=='means' && !value.answerId)){row.verdict.textContent='Choose a conclusion first. No check used.';return;}
    const options=field==='means'?skills:answerOptions(field);
    const valid=field==='means'?value.skillIds.every(id=>options.some(([key])=>key===id)):options.some(([id])=>id===value.answerId);
    if(!valid){row.verdict.textContent='This saved selection is not currently available. Review it first. No check used.';return;}
    if(field==='motive' && !getMotiveById(state.caseData?.motiveId)){row.verdict.textContent='Motive data is unavailable. No check used.';return;}
    if(!deductionManager.getSummary().unlocked){row.verdict.textContent='Requires Deduction 3. The theory is currently travelling without adult supervision.';return;}
    const request={sceneId:'CaseTheory',targetId:field,selection},previous=deductionManager.getPreviousCheck(request);
    const evaluation=previous?.result || evaluateTheorySelection(state,field,selection,isCorrectMotiveAnswer);
    if(evaluation.status==='inconclusive'){row.verdict.textContent=evaluation.message;return;}
    busy=true;
    try {
      const result=deductionManager.check({...request,evaluate:()=>evaluation});
      row.verdict.textContent=result.success?result.entry.result.message+(result.cached?' Previously checked — free.':'')+(result.saved===false?' Warning: save failed.':''):
        ({no_checks_left:'No deduction checks left for this case.',deduction_too_low:'Requires Deduction 3.',no_active_case:'No active case.'}[result.reason] || 'The check failed. No check was used.');
    }catch(error){console.error('[CaseTheory] Deduction:',error);row.verdict.textContent='Could not finish the check. Review the console before retrying.';}
    finally{busy=false;if(!dead)updateProgress();}
  }
  function openHint(field) {
    if(dead || busy || dialog.open)return;const energy=getEnergyManager();
    if(energy.isForcedSleepActive() || energy.isManualSleepActive()){rows.get(field).verdict.textContent='Finish sleeping before requesting assistance.';return;}
    const receipt=draft.hintReceipts[field];dialog.replaceChildren();
    dialog.append(element('h2',`${new Map(THEORY_FIELDS.map(([id,label])=>[id,label])).get(field)} — assistance`));
    const body=element('p',receipt?.text || 'A hint guides your reasoning. It does not choose an answer or attach evidence.');dialog.append(body);
    const actions=element('div',undefined,'ct-help-actions');dialog.append(actions);
    if(!receipt)for(const [method,label] of [['free_hint',`USE FREE HINT (${hintManager.getAvailableCount()})`],['cut_corners','CUT CORNERS — 5 energy / 10 min / procedural misconduct'],['squad_help','ASK FOR HELP — 10 energy / 30 min / documented assistance']]) {
      const option=button(label,()=>purchaseHint(field,method,body,actions));
      option.disabled=method==='free_hint'?hintManager.getAvailableCount()<1:!energy.canAfford(HELP_COSTS[method].energy).ok;actions.append(option);
    }
    else body.append(element('p','Previously obtained — review is free.'));
    actions.append(button('BACK TO THEORY',()=>dialog.close()));dialog.showModal();
  }
  function purchaseHint(field,method,body,actions) {
    if(busy || dead || draft.hintReceipts[field])return;
    const energy=getEnergyManager(),cost=HELP_COSTS[method];
    const context={caseId:state.currentCaseId,sceneId:'CaseTheory',itemId:field};busy=true;
    try {
      let result;
      if(method==='free_hint')result=hintManager.useFreeHint(context);
      else {
        if(!cost || !energy.canAfford(cost.energy).ok){body.textContent='Not enough energy or assistance is currently blocked.';return;}
        const paid=energy.consumeCustom(cost.energy,`Case Theory assistance (${method})`,{requireFullAmount:true,activityType:'case_theory_hint'});
        if(!paid.success){body.textContent=paid.message || 'Unable to request assistance.';return;}
        result=hintManager.recordPaidHint(method,context,{...cost,cash:0});
      }
      if(!result?.success){body.textContent='No free hints remain. Choose another method.';return;}
      draft.hintReceipts[field]={method,text:HELP_TEXT[field],historyEntryId:result.entry.id,createdAt:result.entry.createdAt};save();
      if(cost)EventBus.emit('advanceTime',0,cost.minutes);if(dead)return;
      body.textContent=HELP_TEXT[field]+(result.saved===false?'\nWarning: the save failed.':'');
      actions.replaceChildren(button('BACK TO THEORY',()=>dialog.close()));rows.get(field).verdict.textContent=HELP_TEXT[field];
    }catch(error){console.error('[CaseTheory] Hint:',error);if(!dead)body.textContent='The assistance could not be displayed. Check the console before retrying.';}
    finally{busy=false;if(!dead)updateProgress();}
  }
  function switchTab(tab) {
    activeTab=tab;const theory=tab==='theory';boardApp.hidden=theory;panel.hidden=!theory;
    for(const [node,selected] of [[evidenceTab,!theory],[theoryTab,theory]]){node.setAttribute('aria-selected',String(selected));node.tabIndex=selected?0:-1;}
    if(theory)render();else api.board.onResize();
  }
  listen(tabs,'keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?'evidence':event.key==='End'?'theory':activeTab==='theory'?'evidence':'theory';
    switchTab(next);(next==='theory'?theoryTab:evidenceTab).focus();
  });
  async function loadOptions() {
    const run=++dataRun;loading=true;loadError='';
    try {
      const responses=await Promise.all(['suspects','motives'].map(name=>fetch(new URL(`../assets/data/${name}.json`,import.meta.url),{signal:abort.signal})));
      for(const response of responses)if(!response.ok)throw new Error(`Options: ${response.status}`);
      const [database,data]=await Promise.all(responses.map(response=>response.json()));if(dead || run!==dataRun)return;
      skills=buildSkillOptions(database);const labels=new Map();
      for(const motive of data.motives || [])if(motive.crimeBoard?.answerId && motive.crimeBoard.label)labels.set(motive.crimeBoard.answerId,motive.crimeBoard.label);
      for(const motive of data.motives || [])for(const id of motive.crimeBoard?.falseOptions || [])if(!labels.has(id))labels.set(id,id.replaceAll('_',' '));
      motives=[...labels].sort((a,b)=>a[1].localeCompare(b[1]));
    }catch(error){if(dead || run!==dataRun || error.name==='AbortError')return;loadError='Options could not be loaded. Saved choices have been retained.';console.error('[CaseTheory] Options:',error);}
    finally{if(!dead && run===dataRun){loading=false;if(activeTab==='theory')render();}}
  }
  const onResources=()=>{if(!dead)updateProgress();};EventBus.on('hints:changed',onResources);EventBus.on(DEDUCTION_CHANGED,onResources);
  api.refresh=(nextState=state)=>{
    save();const nextKey=theoryCaseKey(nextState);
    const changedCase=nextKey!==key || String(caseId)!==String(nextState.currentCaseId) || campaignId!==nextState._createdAt;
    const result=originalRefresh(nextState);state=nextState;
    if(changedCase){key=nextKey;caseId=state.currentCaseId;campaignId=state._createdAt;draft=readTheory(state);if(dialog.open)dialog.close();}
    if(activeTab==='theory')render();return result;
  };
  api.saveWorkspace=()=>{save();originalSave?.();};
  api.destroy=()=>{
    if(dead)return;save();dead=true;abort.abort();EventBus.off('hints:changed',onResources);EventBus.off(DEDUCTION_CHANGED,onResources);
    if(dialog.open)dialog.close();dialog.remove();tabs.remove();panel.remove();style.remove();boardApp.hidden=false;originalDestroy();
  };
  switchTab('evidence');loadOptions();return api;
}
