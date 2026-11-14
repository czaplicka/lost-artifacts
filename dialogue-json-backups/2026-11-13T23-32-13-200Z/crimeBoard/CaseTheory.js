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
  const button=(text,action,className='ct-btn')=>{const node=element('button',text,className);node.type='button';listen(node,'click',action);return node;};
  const setVerdict=(row,text,tone='')=>{row.verdict.textContent=text;if(tone)row.verdict.dataset.tone=tone;else delete row.verdict.dataset.tone;};
  let state=initialState,key=theoryCaseKey(state),caseId=state.currentCaseId,campaignId=state._createdAt;
  let draft=readTheory(state),dead=false,busy=false,activeTab='evidence';
  let skills=[],motives=[],loadError='',loading=true,dataRun=0;
  const originalRefresh=api.refresh.bind(api),originalDestroy=api.destroy.bind(api);
  const originalSave=api.saveWorkspace?.bind(api),rows=new Map();
  const style=element('style');
  style.textContent=`
    /* ---------- Case Theory: dossier / manila-folder look ---------- */
    .ct-panel,.ct-tabs,.ct-help{--ct-ink:#2c2117;--ct-ink-soft:#5a4838;--ct-black:#0d0804;--ct-gold:#d4af37;--ct-gold-dim:#8d6b31;--ct-paper:#e9d7ae;--ct-red:#9d1d14;--ct-green:#2f6b2f;--ct-pixel:"PressStart2P","Press Start 2P",monospace;--ct-type:SpecialElite,"Courier New",monospace}

    /* tabs (folder tabs) */
    .ct-tabs{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end;padding:12px 100px 0 14px;background:#120c07;border-bottom:4px solid var(--ct-black);position:relative;z-index:20}
    .ct-tab{margin-bottom:-4px;padding:12px 14px 9px;border:3px solid var(--ct-black);border-bottom:0;border-radius:0;background:#3a2a1b;color:#c9b48c;font:10px/1.4 var(--ct-pixel);text-transform:uppercase;cursor:pointer;position:relative}
    .ct-tab:hover{background:#4a3623;color:#f4e6cb}
    .ct-tab[aria-selected=true]{background:var(--ct-paper);color:var(--ct-ink);padding-top:15px;box-shadow:inset 0 3px 0 var(--ct-gold)}

    /* panel = dark desk */
    .ct-panel{box-sizing:border-box;padding:18px;color:#f4e6cb;font:15px var(--ct-type);min-height:600px;
      background:radial-gradient(rgba(212,175,55,.07) 1px,transparent 1px) 0 0/16px 16px,#1a120c}
    .ct-panel[hidden],.crime-board-app[hidden]{display:none!important}
    .ct-head{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-end;justify-content:space-between}
    .ct-eyebrow{margin:0 0 8px;color:#d5b378;font:12px/1 var(--ct-type);text-transform:uppercase;letter-spacing:.16em}
    .ct-panel h2{margin:0;color:var(--ct-gold);font:20px/1.3 var(--ct-pixel);text-shadow:3px 3px 0 #000;text-transform:uppercase}
    .ct-intro{max-width:720px;margin:14px 0 0;color:#e9d7ae;line-height:1.5}

    /* progress pips */
    .ct-meter{display:flex;gap:6px;align-items:center}
    .ct-pip{padding:8px 7px 6px;border:3px solid var(--ct-black);background:#2b2018;color:#8d7a58;font:8px/1 var(--ct-pixel);text-transform:uppercase}
    .ct-pip[data-state=answered]{background:var(--ct-gold-dim);color:#fff1cf}
    .ct-pip[data-state=sourced]{background:var(--ct-green);color:#eaffd8}

    /* sections = manila folders */
    .ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:44px 20px;margin-top:40px;counter-reset:ct}
    .ct-section{counter-increment:ct;position:relative;min-width:0;padding:20px 16px 16px;color:var(--ct-ink);
      background:linear-gradient(180deg,#ebd9b0,#dcc291);border:3px solid var(--ct-black);
      box-shadow:5px 6px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,248,224,.35)}
    .ct-section::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(120,90,40,.045) 0 1px,transparent 1px 3px)}
    .ct-section h3{position:absolute;top:-31px;left:-3px;margin:0;padding:10px 12px 7px;background:var(--ct-paper);color:var(--ct-ink);
      border:3px solid var(--ct-black);border-bottom:0;font:10px/1.2 var(--ct-pixel);text-transform:uppercase}
    .ct-section h3::before{content:counter(ct,decimal-leading-zero) ". ";color:var(--ct-red)}
    /* status stamp */
    .ct-section::after{content:"OPEN";position:absolute;top:12px;right:12px;padding:5px 6px 3px;border:2px dashed #7b6a52;color:#7b6a52;
      font:8px/1 var(--ct-pixel);transform:rotate(3deg)}
    .ct-section[data-state=answered]::after{content:"NO PROOF";border:2px solid #b9831f;color:#8a5f10;background:rgba(244,226,179,.6)}
    .ct-section[data-state=sourced]::after{content:"FILED";border:2px solid var(--ct-green);color:var(--ct-green);background:rgba(220,235,201,.6)}
    .ct-section p{line-height:1.5;white-space:pre-line}
    .ct-question{margin:6px 0 10px;padding-right:92px;font-size:16px}
    .ct-section h4{margin:12px 0 0;color:var(--ct-red);font:9px/1.4 var(--ct-pixel);text-transform:uppercase}
    .ct-section label{display:block;color:var(--ct-ink-soft);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    .ct-muted{color:#c6b28f;font-size:13px}
    .ct-section .ct-muted{color:var(--ct-ink-soft)}

    /* form fields: typewriter paper */
    .ct-panel select,.ct-panel textarea{box-sizing:border-box;width:100%;margin:7px 0 12px;padding:10px;background:#f7ecc9;color:var(--ct-ink);
      border:3px solid var(--ct-black);border-radius:0;font:15px var(--ct-type);letter-spacing:0;text-transform:none;font-weight:400;
      box-shadow:inset 2px 2px 0 rgba(60,40,10,.18)}
    .ct-panel textarea{min-height:80px;resize:vertical;line-height:24px;background-image:repeating-linear-gradient(transparent 0 23px,rgba(60,40,20,.15) 23px 24px)}

    /* evidence checklist */
    .ct-evidence,.ct-skills{display:grid;gap:4px;max-height:230px;overflow:auto;border:3px solid var(--ct-black);background:#f3e8c8;padding:6px;margin:10px 0;
      box-shadow:inset 2px 2px 0 rgba(60,40,10,.15);scrollbar-color:var(--ct-gold-dim) #f3e8c8;scrollbar-width:thin}
    .ct-evidence label,.ct-skills label{display:flex;align-items:flex-start;gap:9px;padding:7px;overflow-wrap:anywhere;cursor:pointer;
      color:var(--ct-ink);font-size:14px;font-weight:400;letter-spacing:0;text-transform:none}
    .ct-evidence label:hover,.ct-skills label:hover{background:rgba(212,175,55,.2)}
    .ct-evidence label:has(input:checked),.ct-skills label:has(input:checked){background:rgba(212,175,55,.32)}
    .ct-evidence input,.ct-skills input{appearance:none;flex:0 0 auto;display:grid;place-content:center;width:18px;height:18px;margin:1px 0 0;
      border:3px solid var(--ct-black);border-radius:0;background:#fff8e0;cursor:pointer}
    .ct-evidence input::after,.ct-skills input::after{content:"";width:8px;height:8px;background:var(--ct-red);transform:scale(0);transition:transform 80ms linear}
    .ct-evidence input:checked::after,.ct-skills input:checked::after{transform:scale(1)}
    .ct-evidence p,.ct-skills p{margin:6px}

    /* verdict strip */
    .ct-verdict{margin:12px 0 0;padding:9px 10px;border:2px solid var(--ct-black);border-left-width:6px;border-left-color:var(--ct-gold-dim);background:#f3e8c8;color:var(--ct-ink);line-height:1.45}
    .ct-verdict:empty{display:none}
    .ct-verdict[data-tone=ok]{border-left-color:var(--ct-green);background:#dcebc9}
    .ct-verdict[data-tone=bad]{border-left-color:var(--ct-red);background:#f1d3c9}
    .ct-verdict[data-tone=warn]{border-left-color:#b9831f;background:#f4e2b3}
    .ct-verdict[data-tone=hint]{border-left-color:#3b6a8f;background:#d6e4ee}

    /* pixel buttons */
    .ct-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .ct-btn{appearance:none;padding:10px 12px 8px;border:3px solid var(--ct-black);border-radius:0;background:#5e4630;color:#fff1cf;
      font:10px/1.4 var(--ct-pixel);text-transform:uppercase;cursor:pointer;
      box-shadow:inset 3px 3px 0 rgba(255,240,200,.22),inset -3px -3px 0 rgba(0,0,0,.35),0 3px 0 var(--ct-black);
      transition:background 120ms linear}
    .ct-btn:hover:not(:disabled){background:#75563a}
    .ct-btn:active:not(:disabled){transform:translateY(3px);box-shadow:inset 3px 3px 0 rgba(255,240,200,.22),inset -3px -3px 0 rgba(0,0,0,.35),0 0 0 var(--ct-black)}
    .ct-btn:disabled{opacity:.45;cursor:not-allowed}
    .ct-btn--hint{background:#3b5a73}
    .ct-btn--hint:hover:not(:disabled){background:#4a7092}
    .ct-btn--deduction{background:#7a5a14}
    .ct-btn--deduction:hover:not(:disabled){background:#96711f}
    .ct-btn--primary{background:var(--ct-gold);color:#21190e;box-shadow:inset 3px 3px 0 rgba(255,245,200,.45),inset -3px -3px 0 rgba(0,0,0,.25),0 3px 0 var(--ct-black)}
    .ct-btn--primary:hover:not(:disabled){background:#e8c55a}

    /* sticky footer */
    .ct-footer{position:sticky;bottom:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:22px -18px -18px;padding:12px 18px;
      background:#120c07;border-top:4px solid var(--ct-black);box-shadow:inset 0 3px 0 rgba(212,175,55,.35)}
    .ct-footer span{flex:1 1 240px;color:var(--ct-paper);font-size:13px;line-height:1.4}
    .ct-panel>.ct-muted{margin:16px 0 0}

    /* identity photo */
    .ct-identity-preview{display:flex;gap:15px;align-items:center;margin:10px 0;padding:12px;background:rgba(60,40,10,.1);border:2px dashed var(--ct-gold-dim);color:var(--ct-ink)}
    .ct-identity-preview img{width:112px;height:128px;object-fit:contain;background:#e8dcc4;border:5px solid #f5f0e1;box-shadow:3px 4px 0 rgba(20,10,4,.4);transform:rotate(-2deg);flex:0 0 auto}
    .ct-identity-preview figcaption{white-space:pre-line;line-height:1.5;overflow-wrap:anywhere}

    /* hint dialog */
    .ct-help{box-sizing:border-box;max-width:560px;width:calc(100vw - 50px);padding:22px;background:#ecdcb4;color:var(--ct-ink);
      border:4px solid var(--ct-black);border-radius:0;font:16px var(--ct-type);box-shadow:0 0 0 3px var(--ct-gold),8px 10px 0 rgba(0,0,0,.5)}
    .ct-help::backdrop{background:rgba(5,3,1,.8)}
    .ct-help h2{margin:0 0 12px;color:var(--ct-red);font:12px/1.6 var(--ct-pixel);text-transform:uppercase}
    .ct-help p{white-space:pre-line;line-height:1.5}
    .ct-help-actions{display:grid;gap:12px}

    .ct-panel :focus-visible,.ct-help :focus-visible,.ct-tabs :focus-visible{outline:3px dashed var(--ct-gold);outline-offset:3px}
    @media(max-width:760px){
      .ct-grid{grid-template-columns:1fr}
      .ct-panel{padding:10px}
      .ct-footer{margin:22px -10px -10px;padding:12px 10px}
      .ct-question{padding-right:0;margin-top:34px}
    }
    @media(prefers-reduced-motion:reduce){.ct-btn,.ct-evidence input::after,.ct-section input::after{transition:none}}
  `;
  const uid=`ct-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  const tabs=element('nav',undefined,'ct-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Investigation workspace');
  const panel=element('section',undefined,'ct-panel');panel.id=`${uid}-theory`;boardApp.id||=`${uid}-evidence`;
  const evidenceTab=button('Evidence Board',()=>switchTab('evidence'),'ct-tab');
  const theoryTab=button('Case Theory',()=>switchTab('theory'),'ct-tab');
  for(const [node,target,suffix] of [[evidenceTab,boardApp,'evidence'],[theoryTab,panel,'theory']]) {
    node.id=`${uid}-${suffix}-tab`;node.setAttribute('role','tab');node.setAttribute('aria-controls',target.id);
    target.setAttribute('role','tabpanel');target.setAttribute('aria-labelledby',node.id);
  }
  tabs.append(evidenceTab,theoryTab);
  const head=element('header',undefined,'ct-head'),titleBox=element('div');
  titleBox.append(element('p','Form 7-B (Rev. 2, coffee-stained)','ct-eyebrow'),element('h2','Case Theory'));
  const meter=element('div',undefined,'ct-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label','0 of 4 conclusions chosen');
  const pips=new Map(THEORY_FIELDS.map(([field,title])=>{
    const pip=element('span',title.slice(0,4),'ct-pip');pip.dataset.state='empty';meter.append(pip);return [field,pip];
  }));
  head.append(titleBox,meter);
  panel.append(head,element('p','Choose four conclusions and attach evidence to each. Completeness permits an arrest; it does not guarantee a conviction.','ct-intro'));
  const grid=element('div',undefined,'ct-grid');panel.append(grid);
  const footer=element('div',undefined,'ct-footer'),status=element('span','');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const saveButton=button('Save Theory',()=>{save();updateProgress();status.textContent='Theory saved. No arrest or accusation submitted.';},'ct-btn ct-btn--primary');
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
    // Visual state only: folder stamps and header pips.
    const known=new Set(cards().map(card=>card.id));
    for(const [field] of THEORY_FIELDS) {
      const value=draft.sections[field];
      const answered=field==='means'?value.skillIds.length>0:Boolean(value.answerId);
      const sourced=answered && value.evidenceIds.some(id=>known.has(id));
      const stage=sourced?'sourced':answered?'answered':'empty';
      const row=rows.get(field);if(row)row.section.dataset.state=stage;
      pips.get(field).dataset.state=stage;
    }
    meter.setAttribute('aria-label',`${count} of 4 conclusions chosen`);
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
    setVerdict(rows.get(field),'');save();updateProgress();if(field==='identity')renderIdentityPreview();
  }
  for(const [field,title,question] of THEORY_FIELDS) {
    const section=element('section',undefined,'ct-section');section.dataset.state='empty';
    section.append(element('h3',title),element('p',question,'ct-question'));
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
    const hint=button('HINT',()=>openHint(field),'ct-btn ct-btn--hint'),deduction=button('DEDUCTION',()=>checkDeduction(field),'ct-btn ct-btn--deduction');
    actions.append(hint,deduction);section.append(actions);
    const verdict=element('p','','ct-verdict');verdict.setAttribute('role','status');verdict.setAttribute('aria-live','polite');section.append(verdict);
    rows.set(field,{section,select,skillList,help,evidence,note,hint,deduction,target,verdict,preview});grid.append(section);
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
      if(!all.size)row.evidence.append(element('p','No discovered cards yet. The corkboard is, regrettably, just cork.','ct-muted'));
    }
    renderIdentityPreview();retryButton.hidden=!loadError;updateProgress();
  }
  function checkDeduction(field) {
    if(dead || busy)return;
    const row=rows.get(field),value=draft.sections[field];
    const selection=field==='means'?row.target.value?{skillId:row.target.value}:{skillIds:[...value.skillIds].sort()}:{answerId:value.answerId};
    if((field==='means' && !value.skillIds.length) || (field!=='means' && !value.answerId)){setVerdict(row,'Choose a conclusion first. No check used.','warn');return;}
    const options=field==='means'?skills:answerOptions(field);
    const valid=field==='means'?value.skillIds.every(id=>options.some(([key])=>key===id)):options.some(([id])=>id===value.answerId);
    if(!valid){setVerdict(row,'This saved selection is not currently available. Review it first. No check used.','warn');return;}
    if(field==='motive' && !getMotiveById(state.caseData?.motiveId)){setVerdict(row,'Motive data is unavailable. No check used.','warn');return;}
    if(!deductionManager.getSummary().unlocked){setVerdict(row,'Requires Deduction 3. The theory is currently travelling without adult supervision.','warn');return;}
    const request={sceneId:'CaseTheory',targetId:field,selection},previous=deductionManager.getPreviousCheck(request);
    const evaluation=previous?.result || evaluateTheorySelection(state,field,selection,isCorrectMotiveAnswer);
    if(evaluation.status==='inconclusive'){setVerdict(row,evaluation.message,'warn');return;}
    busy=true;
    try {
      const result=deductionManager.check({...request,evaluate:()=>evaluation});
      if(result.success)setVerdict(row,result.entry.result.message+(result.cached?' Previously checked — free.':'')+(result.saved===false?' Warning: save failed.':''),
        result.entry.result.status==='supported'?'ok':'bad');
      else setVerdict(row,({no_checks_left:'No deduction checks left for this case.',deduction_too_low:'Requires Deduction 3.',no_active_case:'No active case.'}[result.reason] || 'The check failed. No check was used.'),'warn');
    }catch(error){console.error('[CaseTheory] Deduction:',error);setVerdict(row,'Could not finish the check. Review the console before retrying.','warn');}
    finally{busy=false;if(!dead)updateProgress();}
  }
  function openHint(field) {
    if(dead || busy || dialog.open)return;const energy=getEnergyManager();
    if(energy.isForcedSleepActive() || energy.isManualSleepActive()){setVerdict(rows.get(field),'Finish sleeping before requesting assistance.','warn');return;}
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
      actions.replaceChildren(button('BACK TO THEORY',()=>dialog.close()));setVerdict(rows.get(field),HELP_TEXT[field],'hint');
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