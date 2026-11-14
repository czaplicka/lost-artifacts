import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  identity:__dialogueText("crimeBoard/CaseTheory.js", "t_222109abef4089a6c07e"),
  motive:__dialogueText("crimeBoard/CaseTheory.js", "t_c5834efcb601fee83179"),
  means:__dialogueText("crimeBoard/CaseTheory.js", "t_a93ac8e5818b52c95f54"),
  opportunity:__dialogueText("crimeBoard/CaseTheory.js", "t_61194a6b6b784dd8034d")
};
export function installCaseTheory(api,initialState,host) {
  const boardApp=api.board.root.closest(__dialogueText("crimeBoard/CaseTheory.js", "t_5f4a8917bd85d04d9691"));
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
  style.textContent=`${__dialogueText("crimeBoard/CaseTheory.js", "t_cad52e6d3c7538f59ca9")}`;
  const uid=`ct-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  const tabs=element('nav',undefined,'ct-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',__dialogueText("crimeBoard/CaseTheory.js", "t_6df4bc4ed62d79e01c26"));
  const panel=element('section',undefined,'ct-panel');panel.id=`${uid}-theory`;boardApp.id||=`${uid}-evidence`;
  const evidenceTab=button(__dialogueText("crimeBoard/CaseTheory.js", "t_6344acfbe34b805f5010"),()=>switchTab('evidence'),'ct-tab');
  const theoryTab=button(__dialogueText("crimeBoard/CaseTheory.js", "t_43071101a92f96747165"),()=>switchTab('theory'),'ct-tab');
  for(const [node,target,suffix] of [[evidenceTab,boardApp,'evidence'],[theoryTab,panel,'theory']]) {
    node.id=`${uid}-${suffix}-tab`;node.setAttribute('role','tab');node.setAttribute('aria-controls',target.id);
    target.setAttribute('role','tabpanel');target.setAttribute('aria-labelledby',node.id);
  }
  tabs.append(evidenceTab,theoryTab);
  const head=element('header',undefined,'ct-head'),titleBox=element('div');
  titleBox.append(element('p',__dialogueText("crimeBoard/CaseTheory.js", "t_24956ae96aff28abc266"),'ct-eyebrow'),element('h2',__dialogueText("crimeBoard/CaseTheory.js", "t_43071101a92f96747165")));
  const meter=element('div',undefined,'ct-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label',__dialogueText("crimeBoard/CaseTheory.js", "t_342e05f500fe1cffa16b"));
  const pips=new Map(THEORY_FIELDS.map(([field,title])=>{
    const pip=element('span',title.slice(0,4),'ct-pip');pip.dataset.state='empty';meter.append(pip);return [field,pip];
  }));
  head.append(titleBox,meter);
  panel.append(head,element('p',__dialogueText("crimeBoard/CaseTheory.js", "t_55058ebdd05fd8499b25"),'ct-intro'));
  const grid=element('div',undefined,'ct-grid');panel.append(grid);
  const footer=element('div',undefined,'ct-footer'),status=element('span','');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const saveButton=button(__dialogueText("crimeBoard/CaseTheory.js", "t_5ffa709523727cd9d541"),()=>{save();updateProgress();status.textContent=__dialogueText("crimeBoard/CaseTheory.js", "t_1dddf055dd3b0bd8824e");},__dialogueText("crimeBoard/CaseTheory.js", "t_20908f23fe9881350162"));
  const retryButton=button(__dialogueText("crimeBoard/CaseTheory.js", "t_c5a231e3fd3918df88ab"),()=>loadOptions());retryButton.hidden=true;
  footer.append(saveButton,retryButton,status);panel.append(footer);
  panel.append(element('p',__dialogueText("crimeBoard/CaseTheory.js", "t_6d112ecbe5f6ad20eac3"),'ct-muted'));
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
    saveButton.textContent=`${__dialogueText("crimeBoard/CaseTheory.js", "t_4a8361130b3b87bc68e9")}${count}${__dialogueText("crimeBoard/CaseTheory.js", "t_faad34921f8fe4c21fd5")}`;
    saveButton.title=result.complete?__dialogueText("crimeBoard/CaseTheory.js", "t_9c68a56dbbcf9dfda3e0"):result.missing.join('\n');
    status.textContent=result.complete?__dialogueText("crimeBoard/CaseTheory.js", "t_822c994185fbc4a053a4"):result.missing.join(' ');
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
    meter.setAttribute('aria-label',`${count}${__dialogueText("crimeBoard/CaseTheory.js", "t_a8949f16c73a9823e676")}`);
    const hints=hintManager.getAvailableCount(),deduction=deductionManager.getSummary().available;
    for(const row of rows.values()) {
      row.hint.textContent=`${__dialogueText("crimeBoard/CaseTheory.js", "t_3ae7f543a38da68eeaeb")}${hints}${__dialogueText("crimeBoard/CaseTheory.js", "t_ba5ec51d07a4ac0e9516")}`;row.deduction.textContent=`${__dialogueText("crimeBoard/CaseTheory.js", "t_aaba65653f4f26932427")}${deduction}${__dialogueText("crimeBoard/CaseTheory.js", "t_ba5ec51d07a4ac0e9516")}`;
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
      const label=element('label',__dialogueText("crimeBoard/CaseTheory.js", "t_1729473529304ecaa089"));label.append(select);section.append(label);
      listen(select,'change',()=>{draft.sections[field].answerId=select.value;changed(field);});
    } else {skillList.setAttribute('role','group');skillList.setAttribute('aria-label',__dialogueText("crimeBoard/CaseTheory.js", "t_5333ef4abc78f2204a73"));section.append(skillList);}
    const preview=field==='identity'?element('div'):null;if(preview)section.append(preview);
    const help=element('p','','ct-muted');section.append(help,element('h4',__dialogueText("crimeBoard/CaseTheory.js", "t_fb06dfa2981381610417")));
    const evidence=element('div',undefined,'ct-evidence');evidence.setAttribute('role','group');evidence.setAttribute('aria-label',`${title}${__dialogueText("crimeBoard/CaseTheory.js", "t_dacbccdc9243c251bf00")}`);section.append(evidence);
    const noteLabel=element('label',__dialogueText("crimeBoard/CaseTheory.js", "t_e292ece917c7227d3707")),note=element('textarea');note.maxLength=8000;note.rows=3;noteLabel.append(note);section.append(noteLabel);
    listen(note,'input',()=>{draft.sections[field].note=note.value;save();});
    const actions=element('div',undefined,'ct-actions'),target=field==='means'?element('select'):null;
    if(target){target.setAttribute('aria-label',__dialogueText("crimeBoard/CaseTheory.js", "t_d64ff633f5b7577298b8"));section.append(target);}
    const hint=button('HINT',()=>openHint(field),__dialogueText("crimeBoard/CaseTheory.js", "t_b286b44085a14ea23f17")),deduction=button('DEDUCTION',()=>checkDeduction(field),__dialogueText("crimeBoard/CaseTheory.js", "t_498efacdfa0bdc2f5755"));
    actions.append(hint,deduction);section.append(actions);
    const verdict=element('p','','ct-verdict');verdict.setAttribute('role','status');verdict.setAttribute('aria-live','polite');section.append(verdict);
    rows.set(field,{section,select,skillList,help,evidence,note,hint,deduction,target,verdict,preview});grid.append(section);
  }
  function renderIdentityPreview() {
    const host=rows.get('identity').preview;host.replaceChildren();
    const all=cards(),selected=draft.sections.identity.answerId;
    const candidate=selected ? all.find(card=>String(card.suspectId)===selected && card.type==='photo' && !card.tags?.includes('unknown'))
      : all.find(card=>card.tags?.includes('warrant-identity'));
    if(!candidate){host.append(element('p',selected?__dialogueText("crimeBoard/CaseTheory.js", "t_adfca9db18a17a70577b"):__dialogueText("crimeBoard/CaseTheory.js", "t_92687baeaa54241a782e"),'ct-muted'));return;}
    const figure=element('figure',undefined,'ct-identity-preview');
    const caption=element('figcaption',`${candidate.label}${__dialogueText("crimeBoard/CaseTheory.js", "t_01ba4719c80b6fe911b0")}${selected?__dialogueText("crimeBoard/CaseTheory.js", "t_4bf8456b297fe93a1c10"):__dialogueText("crimeBoard/CaseTheory.js", "t_39550f8b99827b2818fa")}${__dialogueText("crimeBoard/CaseTheory.js", "t_0bd38257abd522c26a23")}`);
    if(candidate.image) {
      const image=element('img');image.src=candidate.image;image.alt=`${__dialogueText("crimeBoard/CaseTheory.js", "t_3979ff8ba110ef5c6e68")}${candidate.label}`;
      listen(image,'error',()=>{image.hidden=true;caption.textContent+=__dialogueText("crimeBoard/CaseTheory.js", "t_4b8e15307ea5da120dc9");});figure.append(image);
    }
    figure.append(caption);host.append(figure);
  }
  function renderSkillTargets() {
    const target=rows.get('means').target,previous=target.value;target.replaceChildren();
    const whole=element('option',__dialogueText("crimeBoard/CaseTheory.js", "t_aefa75dc7c0bc9bb548f"));whole.value='';target.append(whole);
    for(const id of draft.sections.means.skillIds){const option=element('option',`${__dialogueText("crimeBoard/CaseTheory.js", "t_b6deebbb0118f22ef88b")}${new Map(skills).get(id)||id}`);option.value=id;target.append(option);}
    if(draft.sections.means.skillIds.includes(previous))target.value=previous;
  }
  function render() {
    const available=cards();
    for(const [field] of THEORY_FIELDS) {
      const row=rows.get(field),value=draft.sections[field];
      if(field==='means') {
        row.skillList.replaceChildren();const options=new Map(skills);
        for(const id of value.skillIds)if(!options.has(id))options.set(id,`${__dialogueText("crimeBoard/CaseTheory.js", "t_3e730153645b56d04aca")}${id}`);
        for(const [id,label] of options)checkbox(row.skillList,id,label,value.skillIds.includes(id),checked=>{
          const selected=new Set(value.skillIds);checked?selected.add(id):selected.delete(id);value.skillIds=[...selected];changed(field);renderSkillTargets();
        });
        row.help.textContent=loading?__dialogueText("crimeBoard/CaseTheory.js", "t_7cf5fa27969286cfd187"):loadError || __dialogueText("crimeBoard/CaseTheory.js", "t_de255519b4394ce653e8");
        if(value.legacyAnswerId)row.help.textContent+=`${__dialogueText("crimeBoard/CaseTheory.js", "t_8a0da0ae06bbcefad8b7")}${value.legacyAnswerId}${__dialogueText("crimeBoard/CaseTheory.js", "t_e2de3451d5fc3141e52d")}`;
        renderSkillTargets();
      } else {
        row.select.replaceChildren();const options=answerOptions(field),placeholder=element('option',__dialogueText("crimeBoard/CaseTheory.js", "t_87f7853a1227f6738725"));placeholder.value='';row.select.append(placeholder);
        for(const [id,label] of options){const option=element('option',label);option.value=id;row.select.append(option);}
        if(value.answerId && !options.some(([id])=>id===value.answerId)) {
          const old=element('option',`${__dialogueText("crimeBoard/CaseTheory.js", "t_3e730153645b56d04aca")}${value.answerId}${__dialogueText("crimeBoard/CaseTheory.js", "t_1ef3c4eedb19e2519eff")}`);old.value=value.answerId;row.select.append(old);
        }
        row.select.value=value.answerId;
        row.help.textContent=field==='identity'?__dialogueText("crimeBoard/CaseTheory.js", "t_9ffa547c8195ed8afa61"):field==='motive' && loadError?loadError:__dialogueText("crimeBoard/CaseTheory.js", "t_2b9f52f14110a89ce2fc");
      }
      row.note.value=value.note;row.evidence.replaceChildren();const all=new Map(available.map(card=>[card.id,card]));
      for(const id of value.evidenceIds)if(!all.has(id))all.set(id,{id,label:`${__dialogueText("crimeBoard/CaseTheory.js", "t_b40a19b8b881cfcfdb15")}${id}`});
      for(const card of all.values())checkbox(row.evidence,card.id,card.label || card.id,value.evidenceIds.includes(card.id),checked=>{
        const selected=new Set(value.evidenceIds);checked?selected.add(card.id):selected.delete(card.id);value.evidenceIds=[...selected];changed(field);
      },card.body || card.text || card.caption || '');
      if(!all.size)row.evidence.append(element('p',__dialogueText("crimeBoard/CaseTheory.js", "t_e67fc50ffa0538b95d5d"),'ct-muted'));
    }
    renderIdentityPreview();retryButton.hidden=!loadError;updateProgress();
  }
  function checkDeduction(field) {
    if(dead || busy)return;
    const row=rows.get(field),value=draft.sections[field];
    const selection=field==='means'?row.target.value?{skillId:row.target.value}:{skillIds:[...value.skillIds].sort()}:{answerId:value.answerId};
    if((field==='means' && !value.skillIds.length) || (field!=='means' && !value.answerId)){setVerdict(row,__dialogueText("crimeBoard/CaseTheory.js", "t_bfa016840b08d473366d"),'warn');return;}
    const options=field==='means'?skills:answerOptions(field);
    const valid=field==='means'?value.skillIds.every(id=>options.some(([key])=>key===id)):options.some(([id])=>id===value.answerId);
    if(!valid){setVerdict(row,__dialogueText("crimeBoard/CaseTheory.js", "t_ccb24c59cd179b1dc8c2"),'warn');return;}
    if(field==='motive' && !getMotiveById(state.caseData?.motiveId)){setVerdict(row,__dialogueText("crimeBoard/CaseTheory.js", "t_f403b1ff12162ac6b78c"),'warn');return;}
    if(!deductionManager.getSummary().unlocked){setVerdict(row,__dialogueText("crimeBoard/CaseTheory.js", "t_ff31138db6091196876f"),'warn');return;}
    const request={sceneId:'CaseTheory',targetId:field,selection},previous=deductionManager.getPreviousCheck(request);
    const evaluation=previous?.result || evaluateTheorySelection(state,field,selection,isCorrectMotiveAnswer);
    if(evaluation.status==='inconclusive'){setVerdict(row,evaluation.message,'warn');return;}
    busy=true;
    try {
      const result=deductionManager.check({...request,evaluate:()=>evaluation});
      if(result.success)setVerdict(row,result.entry.result.message+(result.cached?__dialogueText("crimeBoard/CaseTheory.js", "t_9849c73cf5854ce62e19"):'')+(result.saved===false?__dialogueText("crimeBoard/CaseTheory.js", "t_66128468010a07b83e9c"):''),
        result.entry.result.status==='supported'?__dialogueText("crimeBoard/CaseTheory.js", "t_2689367b205c16ce32ed"):'bad');
      else setVerdict(row,({no_checks_left:__dialogueText("crimeBoard/CaseTheory.js", "t_1a8686ae7aa49f6987b6"),deduction_too_low:__dialogueText("crimeBoard/CaseTheory.js", "t_9f3187e3bab576eb820c"),no_active_case:__dialogueText("crimeBoard/CaseTheory.js", "t_179d34b15d3d6eead19a")}[result.reason] || __dialogueText("crimeBoard/CaseTheory.js", "t_d21f36e6cc27a409f5ea")),'warn');
    }catch(error){console.error('[CaseTheory] Deduction:',error);setVerdict(row,__dialogueText("crimeBoard/CaseTheory.js", "t_14a452296f1488a270e7"),'warn');}
    finally{busy=false;if(!dead)updateProgress();}
  }
  function openHint(field) {
    if(dead || busy || dialog.open)return;const energy=getEnergyManager();
    if(energy.isForcedSleepActive() || energy.isManualSleepActive()){setVerdict(rows.get(field),__dialogueText("crimeBoard/CaseTheory.js", "t_10d2aa46c8c66098eea4"),'warn');return;}
    const receipt=draft.hintReceipts[field];dialog.replaceChildren();
    dialog.append(element('h2',`${new Map(THEORY_FIELDS.map(([id,label])=>[id,label])).get(field)}${__dialogueText("crimeBoard/CaseTheory.js", "t_4feffa1008c9a8a217d9")}`));
    const body=element('p',receipt?.text || __dialogueText("crimeBoard/CaseTheory.js", "t_2514c23da721b4f34ab6"));dialog.append(body);
    const actions=element('div',undefined,'ct-help-actions');dialog.append(actions);
    if(!receipt)for(const [method,label] of [['free_hint',`${__dialogueText("crimeBoard/CaseTheory.js", "t_9aa56441d1dbebae2beb")}${hintManager.getAvailableCount()}${__dialogueText("crimeBoard/CaseTheory.js", "t_ba5ec51d07a4ac0e9516")}`],['cut_corners',__dialogueText("crimeBoard/CaseTheory.js", "t_ca51b51ac89c7e57dcb7")],['squad_help',__dialogueText("crimeBoard/CaseTheory.js", "t_63cf0e4b8e60565d8bb8")]]) {
      const option=button(label,()=>purchaseHint(field,method,body,actions));
      option.disabled=method==='free_hint'?hintManager.getAvailableCount()<1:!energy.canAfford(HELP_COSTS[method].energy).ok;actions.append(option);
    }
    else body.append(element('p',__dialogueText("crimeBoard/CaseTheory.js", "t_d04d563538bd705a9ba7")));
    actions.append(button(__dialogueText("crimeBoard/CaseTheory.js", "t_3376fb78b72a280bf670"),()=>dialog.close()));dialog.showModal();
  }
  function purchaseHint(field,method,body,actions) {
    if(busy || dead || draft.hintReceipts[field])return;
    const energy=getEnergyManager(),cost=HELP_COSTS[method];
    const context={caseId:state.currentCaseId,sceneId:'CaseTheory',itemId:field};busy=true;
    try {
      let result;
      if(method==='free_hint')result=hintManager.useFreeHint(context);
      else {
        if(!cost || !energy.canAfford(cost.energy).ok){body.textContent=__dialogueText("crimeBoard/CaseTheory.js", "t_b161418114a5385fbaae");return;}
        const paid=energy.consumeCustom(cost.energy,`${__dialogueText("crimeBoard/CaseTheory.js", "t_27d2f727b3b3fb161244")}${method}${__dialogueText("crimeBoard/CaseTheory.js", "t_ba5ec51d07a4ac0e9516")}`,{requireFullAmount:true,activityType:'case_theory_hint'});
        if(!paid.success){body.textContent=paid.message || __dialogueText("crimeBoard/CaseTheory.js", "t_2bb676c747e5732a43f2");return;}
        result=hintManager.recordPaidHint(method,context,{...cost,cash:0});
      }
      if(!result?.success){body.textContent=__dialogueText("crimeBoard/CaseTheory.js", "t_acb432e83b7163eea864");return;}
      draft.hintReceipts[field]={method,text:HELP_TEXT[field],historyEntryId:result.entry.id,createdAt:result.entry.createdAt};save();
      if(cost)EventBus.emit('advanceTime',0,cost.minutes);if(dead)return;
      body.textContent=HELP_TEXT[field]+(result.saved===false?__dialogueText("crimeBoard/CaseTheory.js", "t_c7a9dd9c221547234c9b"):'');
      actions.replaceChildren(button(__dialogueText("crimeBoard/CaseTheory.js", "t_3376fb78b72a280bf670"),()=>dialog.close()));setVerdict(rows.get(field),HELP_TEXT[field],'hint');
    }catch(error){console.error('[CaseTheory] Hint:',error);if(!dead)body.textContent=__dialogueText("crimeBoard/CaseTheory.js", "t_76ceadb2047de10656c0");}
    finally{busy=false;if(!dead)updateProgress();}
  }
  function switchTab(tab) {
    activeTab=tab;const theory=tab==='theory';boardApp.hidden=theory;panel.hidden=!theory;
    for(const [node,selected] of [[evidenceTab,!theory],[theoryTab,theory]]){node.setAttribute('aria-selected',String(selected));node.tabIndex=selected?0:-1;}
    if(theory)render();else api.board.onResize();
  }
  listen(tabs,'keydown',event=>{
    if(!['ArrowLeft','ArrowRight',__dialogueText("crimeBoard/CaseTheory.js", "t_3a78695388b38b5cceef"),__dialogueText("crimeBoard/CaseTheory.js", "t_f4db1e48476f60753980")].includes(event.key))return;
    event.preventDefault();const next=event.key===__dialogueText("crimeBoard/CaseTheory.js", "t_3a78695388b38b5cceef")?'evidence':event.key===__dialogueText("crimeBoard/CaseTheory.js", "t_f4db1e48476f60753980")?'theory':activeTab==='theory'?'evidence':'theory';
    switchTab(next);(next==='theory'?theoryTab:evidenceTab).focus();
  });
  async function loadOptions() {
    const run=++dataRun;loading=true;loadError='';
    try {
      const responses=await Promise.all(['suspects','motives'].map(name=>fetch(new URL(`${__dialogueText("crimeBoard/CaseTheory.js", "t_a4e918d9e7482e61244e")}${name}${__dialogueText("crimeBoard/CaseTheory.js", "t_12157ab04ed2c6accc3d")}`,import.meta.url),{signal:abort.signal})));
      for(const response of responses)if(!response.ok)throw new Error(`Options: ${response.status}`);
      const [database,data]=await Promise.all(responses.map(response=>response.json()));if(dead || run!==dataRun)return;
      skills=buildSkillOptions(database);const labels=new Map();
      for(const motive of data.motives || [])if(motive.crimeBoard?.answerId && motive.crimeBoard.label)labels.set(motive.crimeBoard.answerId,motive.crimeBoard.label);
      for(const motive of data.motives || [])for(const id of motive.crimeBoard?.falseOptions || [])if(!labels.has(id))labels.set(id,id.replaceAll('_',' '));
      motives=[...labels].sort((a,b)=>a[1].localeCompare(b[1]));
    }catch(error){if(dead || run!==dataRun || error.name==='AbortError')return;loadError=__dialogueText("crimeBoard/CaseTheory.js", "t_46172b89f9914241a784");console.error('[CaseTheory] Options:',error);}
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