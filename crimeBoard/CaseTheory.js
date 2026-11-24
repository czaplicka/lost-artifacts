// identity-namespaces-v1
import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { requestAutosave, saveGameStateResult } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { deductionManager, DEDUCTION_CHANGED } from '../managers/DeductionManager.js';
import { hintManager } from '../managers/HintManager.js';
import { getReputation, REPUTATION_CHANGED } from '../managers/ReputationManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { isCorrectMotiveAnswer, getMotiveById } from '../motiveService.js';
import {
  THEORY_FIELDS, THEORY_OPTIONS, normalizeSkillId, normalizeTheory,
  buildSkillOptions, theoryCaseKey, readTheory, getTheoryReadiness,
  evaluateTheorySelection, getActualIdentityIds
} from './CaseTheoryModel.js';
import { createDraftSaver, checkHintEnergy, parseSkillCatalog, buyPaidHint } from './CaseTheorySupport.js';
export { THEORY_FIELDS, THEORY_OPTIONS, normalizeSkillId, normalizeTheory, buildSkillOptions };
const clone=value=>JSON.parse(JSON.stringify(value));
const text=key=>__dialogueText('crimeBoard/CaseTheory.js',key);
const HELP_COSTS={cut_corners:{energy:5,minutes:10},squad_help:{energy:10,minutes:30}};
const HELP_KEYS={identity:'t_222109abef4089a6c07e',motive:'t_c5834efcb601fee83179',means:'t_a93ac8e5818b52c95f54',opportunity:'t_61194a6b6b784dd8034d'};
export function installCaseTheory(api,initialState,host) {
  const boardApp=api.board.root.closest('.crime-board-app');
  if(!boardApp)throw Error('Case Theory: crime-board-app is missing.');
  const abort=new AbortController();
  const listen=(node,event,handler)=>node.addEventListener(event,handler,{signal:abort.signal});
  const element=(tag,value,className='')=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;node.className=className;return node;};
  const button=(value,action,className='ct-btn')=>{const node=element('button',value,className);node.type='button';listen(node,'click',action);return node;};
  const setVerdict=(row,value,tone='')=>{row.verdict.textContent=value;if(tone)row.verdict.dataset.tone=tone;else delete row.verdict.dataset.tone;};
  let state=initialState,key=theoryCaseKey(state),caseId=state.currentCaseId,campaignId=state._createdAt;
  let draft=readTheory(state),dead=false,busy=false,activeTab='evidence';
  let skills=[],motives=[],loadError='',loading=true,dataRun=0,optionsAbort=null;
  const originalRefresh=api.refresh.bind(api),originalDestroy=api.destroy.bind(api);
  const originalSave=api.saveWorkspace?.bind(api),rows=new Map();
  const saver=createDraftSaver(()=>{save();if(!dead)updateProgress();});
  const style=element('style');style.textContent=".ct-panel,.ct-tabs,.ct-help{--ct-ink:#2c2117;--ct-ink-soft:#5a4838;--ct-black:#0d0804;--ct-gold:#d4af37;--ct-gold-dim:#8d6b31;--ct-paper:#e9d7ae;--ct-red:#9d1d14;--ct-green:#2f6b2f;--ct-pixel:\"PressStart2P\",\"Press Start 2P\",monospace;--ct-type:SpecialElite,\"Courier New\",monospace}\n.ct-tabs{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end;padding:12px 100px 0 14px;background:#120c07;border-bottom:4px solid var(--ct-black);position:relative;z-index:20}\n.ct-tab{margin-bottom:-4px;padding:12px 14px 9px;border:3px solid var(--ct-black);border-bottom:0;border-radius:0;background:#3a2a1b;color:#c9b48c;font:10px/1.4 var(--ct-pixel);text-transform:uppercase;cursor:pointer;position:relative}.ct-tab:hover{background:#4a3623;color:#f4e6cb}.ct-tab[aria-selected=true]{background:var(--ct-paper);color:var(--ct-ink);padding-top:15px;box-shadow:inset 0 3px 0 var(--ct-gold)}\n.ct-panel{box-sizing:border-box;padding:18px;color:#f4e6cb;font:15px var(--ct-type);min-height:600px;background:radial-gradient(rgba(212,175,55,.07) 1px,transparent 1px) 0 0/16px 16px,#1a120c}.ct-panel[hidden],.crime-board-app[hidden]{display:none!important}.ct-head{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:flex-end;justify-content:space-between}.ct-eyebrow{margin:0 0 8px;color:#d5b378;font:12px/1 var(--ct-type);text-transform:uppercase;letter-spacing:.16em}.ct-panel h2{margin:0;color:var(--ct-gold);font:20px/1.3 var(--ct-pixel);text-shadow:3px 3px 0 #000;text-transform:uppercase}.ct-intro{max-width:720px;margin:14px 0 0;color:#e9d7ae;line-height:1.5}\n.ct-meter{display:flex;gap:6px;align-items:center}.ct-pip{padding:8px 7px 6px;border:3px solid var(--ct-black);background:#2b2018;color:#8d7a58;font:8px/1 var(--ct-pixel);text-transform:uppercase}.ct-pip[data-state=answered]{background:var(--ct-gold-dim);color:#fff1cf}.ct-pip[data-state=sourced]{background:var(--ct-green);color:#eaffd8}\n.ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:44px 20px;margin-top:40px;counter-reset:ct}.ct-section{counter-increment:ct;position:relative;min-width:0;padding:20px 16px 16px;color:var(--ct-ink);background:linear-gradient(180deg,#ebd9b0,#dcc291);border:3px solid var(--ct-black);box-shadow:5px 6px 0 rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,248,224,.35)}.ct-section::before{content:\"\";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(120,90,40,.045) 0 1px,transparent 1px 3px)}.ct-section h3{position:absolute;top:-31px;left:-3px;margin:0;padding:10px 12px 7px;background:var(--ct-paper);color:var(--ct-ink);border:3px solid var(--ct-black);border-bottom:0;font:10px/1.2 var(--ct-pixel);text-transform:uppercase}.ct-section h3::before{content:counter(ct,decimal-leading-zero) \". \";color:var(--ct-red)}.ct-section::after{content:\"OPEN\";position:absolute;top:12px;right:12px;padding:5px 6px 3px;border:2px dashed #7b6a52;color:#7b6a52;font:8px/1 var(--ct-pixel);transform:rotate(3deg)}.ct-section[data-state=answered]::after{content:\"NO PROOF\";border:2px solid #b9831f;color:#8a5f10;background:rgba(244,226,179,.6)}.ct-section[data-state=sourced]::after{content:\"FILED\";border:2px solid var(--ct-green);color:var(--ct-green);background:rgba(220,235,201,.6)}.ct-section p{line-height:1.5;white-space:pre-line}.ct-question{margin:6px 0 10px;padding-right:92px;font-size:16px}.ct-section h4{margin:12px 0 0;color:var(--ct-red);font:9px/1.4 var(--ct-pixel);text-transform:uppercase}.ct-section label{display:block;color:var(--ct-ink-soft);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.ct-muted{color:#c6b28f;font-size:13px}.ct-section .ct-muted{color:var(--ct-ink-soft)}\n.ct-panel select,.ct-panel textarea{box-sizing:border-box;width:100%;margin:7px 0 12px;padding:10px;background:#f7ecc9;color:var(--ct-ink);border:3px solid var(--ct-black);border-radius:0;font:15px var(--ct-type);letter-spacing:0;text-transform:none;font-weight:400;box-shadow:inset 2px 2px 0 rgba(60,40,10,.18)}.ct-panel textarea{min-height:80px;resize:vertical;line-height:24px;background-image:repeating-linear-gradient(transparent 0 23px,rgba(60,40,20,.15) 23px 24px)}\n.ct-evidence,.ct-skills{display:grid;gap:4px;max-height:230px;overflow:auto;border:3px solid var(--ct-black);background:#f3e8c8;padding:6px;margin:10px 0;box-shadow:inset 2px 2px 0 rgba(60,40,10,.15);scrollbar-color:var(--ct-gold-dim) #f3e8c8;scrollbar-width:thin}.ct-evidence label,.ct-skills label{display:flex;align-items:flex-start;gap:9px;padding:7px;overflow-wrap:anywhere;cursor:pointer;color:var(--ct-ink);font-size:14px;font-weight:400;letter-spacing:0;text-transform:none}.ct-evidence label:hover,.ct-skills label:hover{background:rgba(212,175,55,.2)}.ct-evidence label:has(input:checked),.ct-skills label:has(input:checked){background:rgba(212,175,55,.32)}.ct-evidence input,.ct-skills input{appearance:none;flex:0 0 auto;display:grid;place-content:center;width:18px;height:18px;margin:1px 0 0;border:3px solid var(--ct-black);border-radius:0;background:#fff8e0;cursor:pointer}.ct-evidence input::after,.ct-skills input::after{content:\"\";width:8px;height:8px;background:var(--ct-red);transform:scale(0);transition:transform 80ms linear}.ct-evidence input:checked::after,.ct-skills input:checked::after{transform:scale(1)}.ct-evidence p,.ct-skills p{margin:6px}\n.ct-verdict{margin:12px 0 0;padding:9px 10px;border:2px solid var(--ct-black);border-left-width:6px;border-left-color:var(--ct-gold-dim);background:#f3e8c8;color:var(--ct-ink);line-height:1.45}.ct-verdict:empty{display:none}.ct-verdict[data-tone=ok]{border-left-color:var(--ct-green);background:#dcebc9}.ct-verdict[data-tone=bad]{border-left-color:var(--ct-red);background:#f1d3c9}.ct-verdict[data-tone=warn]{border-left-color:#b9831f;background:#f4e2b3}.ct-verdict[data-tone=hint]{border-left-color:#3b6a8f;background:#d6e4ee}\n.ct-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.ct-btn{appearance:none;padding:10px 12px 8px;border:3px solid var(--ct-black);border-radius:0;background:#5e4630;color:#fff1cf;font:10px/1.4 var(--ct-pixel);text-transform:uppercase;cursor:pointer;box-shadow:inset 3px 3px 0 rgba(255,240,200,.22),inset -3px -3px 0 rgba(0,0,0,.35),0 3px 0 var(--ct-black);transition:background 120ms linear}.ct-btn:hover:not(:disabled){background:#75563a}.ct-btn:active:not(:disabled){transform:translateY(3px);box-shadow:inset 3px 3px 0 rgba(255,240,200,.22),inset -3px -3px 0 rgba(0,0,0,.35),0 0 0 var(--ct-black)}.ct-btn:disabled{opacity:.45;cursor:not-allowed}.ct-btn--hint{background:#3b5a73}.ct-btn--hint:hover:not(:disabled){background:#4a7092}.ct-btn--deduction{background:#7a5a14}.ct-btn--deduction:hover:not(:disabled){background:#96711f}.ct-btn--primary{background:var(--ct-gold);color:#21190e;box-shadow:inset 3px 3px 0 rgba(255,245,200,.45),inset -3px -3px 0 rgba(0,0,0,.25),0 3px 0 var(--ct-black)}.ct-btn--primary:hover:not(:disabled){background:#e8c55a}\n.ct-footer{position:sticky;bottom:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:22px -18px -18px;padding:12px 18px;background:#120c07;border-top:4px solid var(--ct-black);box-shadow:inset 0 3px 0 rgba(212,175,55,.35)}.ct-footer span{flex:1 1 240px;color:var(--ct-paper);font-size:13px;line-height:1.4}.ct-panel>.ct-muted{margin:16px 0 0}\n.ct-identity-preview{display:flex;gap:15px;align-items:center;margin:10px 0;padding:12px;background:rgba(60,40,10,.1);border:2px dashed var(--ct-gold-dim);color:var(--ct-ink)}.ct-identity-preview img{width:112px;height:128px;object-fit:contain;background:#e8dcc4;border:5px solid #f5f0e1;box-shadow:3px 4px 0 rgba(20,10,4,.4);transform:rotate(-2deg);flex:0 0 auto}.ct-identity-preview figcaption{white-space:pre-line;line-height:1.5;overflow-wrap:anywhere}\n.ct-help{box-sizing:border-box;max-width:560px;width:calc(100vw - 50px);padding:22px;background:#ecdcb4;color:var(--ct-ink);border:4px solid var(--ct-black);border-radius:0;font:16px var(--ct-type);box-shadow:0 0 0 3px var(--ct-gold),8px 10px 0 rgba(0,0,0,.5)}.ct-help::backdrop{background:rgba(5,3,1,.8)}.ct-help h2{margin:0 0 12px;color:var(--ct-red);font:12px/1.6 var(--ct-pixel);text-transform:uppercase}.ct-help p{white-space:pre-line;line-height:1.5}.ct-help-actions{display:grid;gap:12px}\n.ct-panel :focus-visible,.ct-help :focus-visible,.ct-tabs :focus-visible{outline:3px dashed var(--ct-gold);outline-offset:3px}@media(max-width:760px){.ct-grid{grid-template-columns:1fr}.ct-panel{padding:10px}.ct-footer{margin:22px -10px -10px;padding:12px 10px}.ct-question{padding-right:0;margin-top:34px}}@media(prefers-reduced-motion:reduce){.ct-btn,.ct-evidence input::after,.ct-section input::after{transition:none}}";
  const uid=`ct-${globalThis.crypto?.randomUUID?.()||Date.now()}`;
  const tabs=element('nav',undefined,'ct-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Investigation workspace');
  const panel=element('section',undefined,'ct-panel');panel.id=`${uid}-theory`;boardApp.id||=`${uid}-evidence`;
  const evidenceTab=button(text('t_6344acfbe34b805f5010'),()=>switchTab('evidence'),'ct-tab');
  const theoryTab=button(text('t_43071101a92f96747165'),()=>switchTab('theory'),'ct-tab');
  for(const [node,target,suffix]of[[evidenceTab,boardApp,'evidence'],[theoryTab,panel,'theory']]){
    node.id=`${uid}-${suffix}-tab`;node.setAttribute('role','tab');node.setAttribute('aria-controls',target.id);
    target.setAttribute('role','tabpanel');target.setAttribute('aria-labelledby',node.id);
  }
  tabs.append(evidenceTab,theoryTab);
  const head=element('header',undefined,'ct-head'),titleBox=element('div');
  titleBox.append(element('p',text('t_24956ae96aff28abc266'),'ct-eyebrow'),element('h2',text('t_43071101a92f96747165')));
  const meter=element('div',undefined,'ct-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label','0 of 4 conclusions chosen');
  const pips=new Map(THEORY_FIELDS.map(([field,title])=>{const pip=element('span',title.slice(0,4),'ct-pip');pip.dataset.state='empty';meter.append(pip);return[field,pip];}));
  head.append(titleBox,meter);panel.append(head,element('p',text('t_55058ebdd05fd8499b25'),'ct-intro'));
  const grid=element('div',undefined,'ct-grid');panel.append(grid);
  const footer=element('div',undefined,'ct-footer'),status=element('span','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const saveButton=button(text('t_5ffa709523727cd9d541'),()=>{save();updateProgress();status.textContent=text('t_1dddf055dd3b0bd8824e');},'ct-btn ct-btn--primary');
  const retryButton=button(text('t_c5a231e3fd3918df88ab'),()=>loadOptions());retryButton.hidden=true;
  footer.append(saveButton,retryButton,status);panel.append(footer,element('p',text('t_6d112ecbe5f6ad20eac3'),'ct-muted'));
  host.insertBefore(tabs,boardApp);host.append(panel,style);
  const dialog=element('dialog',undefined,'ct-help');document.body.append(dialog);
  // A short-lived read-only view: never deep-clone photos/objects while editing a note.
  const cards=()=>{const items=api.board.state?.items;return(Array.isArray(items)?items:api.getData().items||[]).filter(card=>card?.discovered!==false);};
  // Remain compatible both before and after the separate identity-namespaces installer.
  const identityMode=()=>getActualIdentityIds(state).some(id=>typeof id==='string'&&/^(case|thief):/.test(id));
  const getCardIdentityId=(card,qualified=identityMode())=>{
    if(card?.suspectId==null)return '';
    const id=String(card.suspectId);
    return qualified?`${card.tags?.includes('warrant-identity')?'thief':'case'}:${encodeURIComponent(id.trim())}`:id;
  };
  function save(){
    saver.cancel();
    if(dead||String(state.currentCaseId)!==String(caseId)||state._createdAt!==campaignId)return;
    draft.caseId=caseId??null;draft.campaignId=campaignId??null;draft.updatedAt=new Date().toISOString();
    draft.status=getTheoryReadiness(state,draft,cards()).complete?'complete':'draft';
    state.caseTheories={...(state.caseTheories||{}),[key]:clone(draft)};requestAutosave();
  }
  function answerOptions(field,available=cards()){
    if(field==='identity'){
      const qualified=identityMode();
      return[...new Map(available.filter(c=>c.suspectId!=null&&!c.tags?.includes('unknown')&&!c.createdByPlayer)
        .map(c=>[getCardIdentityId(c,qualified),[getCardIdentityId(c,qualified),c.label]])).values()];
    }
    return field==='motive'?motives:THEORY_OPTIONS[field]||[];
  }
  function updateProgress(available=cards()){
    if(dead)return;
    const result=getTheoryReadiness(state,draft,available);
    const count=THEORY_FIELDS.filter(([field])=>field==='means'?draft.sections.means.skillIds.length:draft.sections[field].answerId).length;
    saveButton.textContent=`${text('t_4a8361130b3b87bc68e9')}${count}${text('t_faad34921f8fe4c21fd5')}`;
    saveButton.title=result.complete?text('t_9c68a56dbbcf9dfda3e0'):result.missing.join('\n');
    status.textContent=result.complete?text('t_822c994185fbc4a053a4'):result.missing.join(' ');
    const known=new Set(available.map(card=>card.id));
    for(const[field]of THEORY_FIELDS){const value=draft.sections[field],answered=field==='means'?value.skillIds.length>0:Boolean(value.answerId);
      const stage=answered&&value.evidenceIds.some(id=>known.has(id))?'sourced':answered?'answered':'empty';
      const row=rows.get(field);if(row)row.section.dataset.state=stage;pips.get(field).dataset.state=stage;}
    meter.setAttribute('aria-label',`${count} of 4 conclusions chosen`);
    const hints=hintManager.getAvailableCount(),deduction=deductionManager.getSummary().available;
    for(const row of rows.values()){
      row.hint.textContent=`${text('t_3ae7f543a38da68eeaeb')}${hints}${text('t_ba5ec51d07a4ac0e9516')}`;
      row.deduction.textContent=`${text('t_aaba65653f4f26932427')}${deduction}${text('t_ba5ec51d07a4ac0e9516')}`;
      row.hint.disabled=busy;row.deduction.disabled=busy;
    }
  }
  function checkbox(container,id,label,checked,change,tooltip=''){
    const node=element('label'),input=element('input');input.type='checkbox';input.value=id;input.checked=checked;
    node.title=tooltip;node.append(input,element('span',label));listen(input,'change',()=>change(input.checked));container.append(node);
  }
  function changed(field){setVerdict(rows.get(field),'');save();updateProgress();if(field==='identity')renderIdentityPreview();}
  for(const[field,title,question]of THEORY_FIELDS){
    const section=element('section',undefined,'ct-section');section.dataset.state='empty';section.append(element('h3',title),element('p',question,'ct-question'));
    const select=field==='means'?null:element('select'),skillList=field==='means'?element('div',undefined,'ct-skills'):null;
    if(select){const label=element('label',text('t_1729473529304ecaa089'));label.append(select);section.append(label);listen(select,'change',()=>{draft.sections[field].answerId=select.value;changed(field);});}
    else{skillList.setAttribute('role','group');skillList.setAttribute('aria-label','Skills used');section.append(skillList);}
    const preview=field==='identity'?element('div'):null;if(preview)section.append(preview);
    const help=element('p','','ct-muted');section.append(help,element('h4',text('t_fb06dfa2981381610417')));
    const evidence=element('div',undefined,'ct-evidence');evidence.setAttribute('role','group');evidence.setAttribute('aria-label',`${title}: supporting evidence`);section.append(evidence);
    const noteLabel=element('label',text('t_e292ece917c7227d3707')),note=element('textarea');note.maxLength=8000;note.rows=3;noteLabel.append(note);section.append(noteLabel);
    listen(note,'input',()=>{draft.sections[field].note=note.value;saver.schedule();});listen(note,'blur',()=>saver.flush());
    const actions=element('div',undefined,'ct-actions'),target=field==='means'?element('select'):null;
    if(target){target.setAttribute('aria-label','Choose a skill or the complete skill set to check');section.append(target);}
    const hint=button('HINT',()=>openHint(field),'ct-btn ct-btn--hint'),deduction=button('DEDUCTION',()=>checkDeduction(field),'ct-btn ct-btn--deduction');actions.append(hint,deduction);section.append(actions);
    const verdict=element('p','','ct-verdict');verdict.setAttribute('role','status');verdict.setAttribute('aria-live','polite');section.append(verdict);
    rows.set(field,{section,select,skillList,help,evidence,note,hint,deduction,target,verdict,preview});grid.append(section);
  }
  function safePhoto(value){
    if(typeof value!=='string'||!value)return '';
    try{const base=new URL('../assets/',import.meta.url),url=new URL(value,new URL('../',import.meta.url));
      if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||!/^https?:$/.test(url.protocol)||url.username||url.password||/%(?:2f|5c|2e|25)/i.test(url.pathname)||!/\.(webp|png|jpe?g|gif|avif)$/i.test(url.pathname))return '';
      url.search='';url.hash='';return url.href;
    }catch{return '';}
  }
  function renderIdentityPreview(available=cards()){
    const preview=rows.get('identity').preview;preview.replaceChildren();const selected=draft.sections.identity.answerId,qualified=identityMode();
    const candidate=selected?available.find(card=>getCardIdentityId(card,qualified)===selected&&card.type==='photo'&&!card.tags?.includes('unknown')):available.find(card=>card.tags?.includes('warrant-identity'));
    if(!candidate){preview.append(element('p',selected?text('t_adfca9db18a17a70577b'):text('t_92687baeaa54241a782e'),'ct-muted'));return;}
    const figure=element('figure',undefined,'ct-identity-preview'),caption=element('figcaption',`${candidate.label}${text('t_01ba4719c80b6fe911b0')}${selected?text('t_4bf8456b297fe93a1c10'):text('t_39550f8b99827b2818fa')}${text('t_0bd38257abd522c26a23')}`);
    const src=safePhoto(candidate.image);
    if(src){const image=element('img');image.referrerPolicy='no-referrer';image.src=src;image.alt=`${text('t_3979ff8ba110ef5c6e68')}${candidate.label}`;
      listen(image,'error',()=>{image.hidden=true;caption.textContent+=text('t_4b8e15307ea5da120dc9');});figure.append(image);}
    figure.append(caption);preview.append(figure);
  }
  function renderSkillTargets(){
    const target=rows.get('means').target,previous=target.value;target.replaceChildren();const whole=element('option',text('t_aefa75dc7c0bc9bb548f'));whole.value='';target.append(whole);
    const labels=new Map(skills);for(const id of draft.sections.means.skillIds){const option=element('option',`${text('t_b6deebbb0118f22ef88b')}${labels.get(id)||id}`);option.value=id;target.append(option);}
    if(draft.sections.means.skillIds.includes(previous))target.value=previous;
  }
  function render(){
    const available=cards();
    for(const[field]of THEORY_FIELDS){const row=rows.get(field),value=draft.sections[field];
      if(field==='means'){
        row.skillList.replaceChildren();const options=new Map(skills);for(const id of value.skillIds)if(!options.has(id))options.set(id,`${text('t_3e730153645b56d04aca')}${id}`);
        for(const[id,label]of options)checkbox(row.skillList,id,label,value.skillIds.includes(id),checked=>{const selected=new Set(value.skillIds);checked?selected.add(id):selected.delete(id);value.skillIds=[...selected];changed(field);renderSkillTargets();});
        row.help.textContent=loading?text('t_7cf5fa27969286cfd187'):loadError||text('t_de255519b4394ce653e8');if(value.legacyAnswerId)row.help.textContent+=`${text('t_8a0da0ae06bbcefad8b7')}${value.legacyAnswerId}${text('t_e2de3451d5fc3141e52d')}`;renderSkillTargets();
      }else{
        row.select.replaceChildren();const options=answerOptions(field,available),placeholder=element('option',text('t_87f7853a1227f6738725'));placeholder.value='';row.select.append(placeholder);
        for(const[id,label]of options){const option=element('option',label);option.value=id;row.select.append(option);}
        if(value.answerId&&!options.some(([id])=>id===value.answerId)){const old=element('option',`${text('t_3e730153645b56d04aca')}${value.answerId}${text('t_1ef3c4eedb19e2519eff')}`);old.value=value.answerId;row.select.append(old);}
        row.select.value=value.answerId;row.help.textContent=field==='identity'?text('t_9ffa547c8195ed8afa61'):field==='motive'&&loadError?loadError:text('t_2b9f52f14110a89ce2fc');
      }
      row.note.value=value.note;row.evidence.replaceChildren();const all=new Map(available.map(card=>[card.id,card]));for(const id of value.evidenceIds)if(!all.has(id))all.set(id,{id,label:`${text('t_b40a19b8b881cfcfdb15')}${id}`});
      for(const card of all.values())checkbox(row.evidence,card.id,card.label||card.id,value.evidenceIds.includes(card.id),checked=>{const selected=new Set(value.evidenceIds);checked?selected.add(card.id):selected.delete(card.id);value.evidenceIds=[...selected];changed(field);},card.body||card.text||card.caption||'');
      if(!all.size)row.evidence.append(element('p',text('t_e67fc50ffa0538b95d5d'),'ct-muted'));
    }
    renderIdentityPreview(available);retryButton.hidden=!loadError;updateProgress(available);
  }
  function checkDeduction(field){
    saver.flush();if(dead||busy)return;const row=rows.get(field),value=draft.sections[field];
    const selection=field==='means'?row.target.value?{skillId:row.target.value}:{skillIds:[...value.skillIds].sort()}:{answerId:value.answerId};
    if((field==='means'&&!value.skillIds.length)||(field!=='means'&&!value.answerId)){setVerdict(row,text('t_bfa016840b08d473366d'),'warn');return;}
    const options=field==='means'?skills:answerOptions(field),valid=field==='means'?value.skillIds.every(id=>options.some(([key])=>key===id)):options.some(([id])=>id===value.answerId);
    if(!valid){setVerdict(row,text('t_ccb24c59cd179b1dc8c2'),'warn');return;}
    if(field==='motive'&&!getMotiveById(state.caseData?.motiveId)){setVerdict(row,text('t_f403b1ff12162ac6b78c'),'warn');return;}
    if(!deductionManager.getSummary().unlocked){setVerdict(row,text('t_ff31138db6091196876f'),'warn');return;}
    const request={sceneId:'CaseTheory',targetId:field,selection},previous=deductionManager.getPreviousCheck(request);
    const evaluation=previous?.result||evaluateTheorySelection(state,field,selection,isCorrectMotiveAnswer);if(evaluation.status==='inconclusive'){setVerdict(row,evaluation.message,'warn');return;}
    busy=true;
    try{const result=deductionManager.check({...request,evaluate:()=>evaluation});
      if(result.success)setVerdict(row,result.entry.result.message+(result.cached?text('t_9849c73cf5854ce62e19'):'')+(result.saved===false?text('t_66128468010a07b83e9c'):''),result.entry.result.status==='supported'?'ok':'bad');
      else setVerdict(row,({no_checks_left:text('t_1a8686ae7aa49f6987b6'),deduction_too_low:text('t_9f3187e3bab576eb820c'),no_active_case:text('t_179d34b15d3d6eead19a')}[result.reason]||text('t_d21f36e6cc27a409f5ea')),'warn');
    }catch(error){console.error('[CaseTheory] Deduction:',error);setVerdict(row,text('t_14a452296f1488a270e7'),'warn');}finally{busy=false;if(!dead)updateProgress();}
  }
  let hintOffer=null;
  function updateHintOffer(){
    if(!hintOffer||dead)return;const energy=getEnergyManager();
    for(const[method,option]of hintOffer.options){option.disabled=busy||(method==='free_hint'?hintManager.getAvailableCount()<1:!checkHintEnergy(energy,HELP_COSTS[method].energy).ok);}
  }
  listen(dialog,'close',()=>{hintOffer=null;});
  function openHint(field){
    saver.flush();if(dead||busy||dialog.open)return;const energy=getEnergyManager();
    if(energy.isForcedSleepActive()||energy.isManualSleepActive()){setVerdict(rows.get(field),text('t_10d2aa46c8c66098eea4'),'warn');return;}
    const receipt=draft.hintReceipts[field];dialog.replaceChildren();dialog.append(element('h2',`${new Map(THEORY_FIELDS.map(([id,label])=>[id,label])).get(field)}${text('t_4feffa1008c9a8a217d9')}`));
    const body=element('p',receipt?.text||text('t_2514c23da721b4f34ab6'));dialog.append(body);const actions=element('div',undefined,'ct-help-actions');dialog.append(actions);hintOffer={options:[]};
    if(!receipt)for(const[method,label]of[['free_hint',`${text('t_9aa56441d1dbebae2beb')}${hintManager.getAvailableCount()}${text('t_ba5ec51d07a4ac0e9516')}`],['cut_corners',text('t_ca51b51ac89c7e57dcb7')],['squad_help',text('t_63cf0e4b8e60565d8bb8')]]){
      const option=button(label,()=>purchaseHint(field,method,body,actions));hintOffer.options.push([method,option]);actions.append(option);
    }else body.append(element('p',text('t_d04d563538bd705a9ba7')));
    actions.append(button(text('t_3376fb78b72a280bf670'),()=>dialog.close()));updateHintOffer();dialog.showModal();
  }
  function persistHint(){try{return saveGameStateResult();}catch(error){console.error('[CaseTheory] Persistence:',error);return{status:'error',saved:false};}}
  function purchaseHint(field,method,body,actions){
    if(busy||dead||draft.hintReceipts[field])return;
    const energy=getEnergyManager(),cost=HELP_COSTS[method],hintText=text(HELP_KEYS[field]);
    const context={caseId:state.currentCaseId,sceneId:'CaseTheory',itemId:field};busy=true;updateHintOffer();
    const setReceipt=entry=>{draft.hintReceipts[field]={method,text:hintText,historyEntryId:entry.id,createdAt:entry.createdAt};save();};
    try{
      let result;
      if(method==='free_hint'){result=hintManager.useFreeHint(context);if(result?.success)setReceipt(result.entry);}
      else{
        if(!cost){body.textContent=text('t_b161418114a5385fbaae');return;}
        result=buyPaidHint({state,energy,manager:hintManager,method,context,cost,commitReceipt:setReceipt,
          rollbackReceipt:()=>{delete draft.hintReceipts[field];save();},persist:persistHint,
          notifyRollback:()=>{EventBus.emit('hints:changed',hintManager.getSummary());EventBus.emit(REPUTATION_CHANGED,{type:'hint_purchase_rollback',after:getReputation()});}});
      }
      if(!result?.success){if(!dead)body.textContent=result?.message||(result?.reason==='sleep_required'?energy.getInsufficientEnergyMessage(cost.energy):text('t_acb432e83b7163eea864'));return;}
      if(cost)EventBus.emit('advanceTime',0,cost.minutes);
      // Persist receipt, cost and time together after the manager's intermediate save.
      const persisted=persistHint();if(dead)return;
      body.textContent=hintText+(!persisted.saved?text('t_c7a9dd9c221547234c9b'):'');
      hintOffer=null;actions.replaceChildren(button(text('t_3376fb78b72a280bf670'),()=>dialog.close()));setVerdict(rows.get(field),hintText,'hint');
    }catch(error){console.error('[CaseTheory] Hint:',error);if(!dead)body.textContent=text('t_76ceadb2047de10656c0');}
    finally{busy=false;if(!dead){updateProgress();updateHintOffer();}}
  }
  function switchTab(tab){
    saver.flush();activeTab=tab;const theory=tab==='theory';boardApp.hidden=theory;panel.hidden=!theory;
    for(const[node,selected]of[[evidenceTab,!theory],[theoryTab,theory]]){node.setAttribute('aria-selected',String(selected));node.tabIndex=selected?0:-1;}
    if(theory)render();else api.board.onResize();
  }
  listen(tabs,'keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'evidence':event.key==='End'?'theory':activeTab==='theory'?'evidence':'theory';switchTab(next);(next==='theory'?theoryTab:evidenceTab).focus();});
  async function loadOptions(){
    const run=++dataRun;optionsAbort?.abort();const controller=new AbortController();optionsAbort=controller;loading=true;loadError='';
    try{
      const responses=await Promise.all(['skills','motives'].map(name=>fetch(new URL(`../assets/data/${name}.json`,import.meta.url),{signal:controller.signal})));
      for(const response of responses)if(!response.ok)throw Error(`Options: ${response.status}`);
      const[skillData,data]=await Promise.all(responses.map(response=>response.json()));if(dead||run!==dataRun)return;
      skills=parseSkillCatalog(skillData,normalizeSkillId);const labels=new Map();
      for(const motive of data.motives||[])if(motive.crimeBoard?.answerId&&motive.crimeBoard.label)labels.set(motive.crimeBoard.answerId,motive.crimeBoard.label);
      for(const motive of data.motives||[])for(const id of motive.crimeBoard?.falseOptions||[])if(!labels.has(id))labels.set(id,id.replaceAll('_',' '));
      motives=[...labels].sort((a,b)=>a[1].localeCompare(b[1]));
    }catch(error){if(dead||run!==dataRun||error.name==='AbortError')return;loadError=text('t_46172b89f9914241a784');console.error('[CaseTheory] Options:',error);}
    finally{if(!dead&&run===dataRun){loading=false;if(activeTab==='theory'){saver.flush();render();}}}
  }
  const resourceEvents=['hints:changed',DEDUCTION_CHANGED,'energyChanged','gameTime:advanced','manualSleepFinished','manualSleepStarted'];
  const onResources=()=>{if(!dead){updateProgress();updateHintOffer();}};
  for(const event of resourceEvents)EventBus.on(event,onResources,null,abort);
  listen(document,'visibilitychange',()=>{if(document.visibilityState==='hidden')saver.flush();});
  listen(window,'pagehide',()=>saver.flush());
  api.refresh=(nextState=state)=>{
    save();const nextKey=theoryCaseKey(nextState),changedCase=nextKey!==key||String(caseId)!==String(nextState.currentCaseId)||campaignId!==nextState._createdAt;
    const result=originalRefresh(nextState);state=nextState;
    if(changedCase){key=nextKey;caseId=state.currentCaseId;campaignId=state._createdAt;draft=readTheory(state);if(dialog.open)dialog.close();}
    if(activeTab==='theory')render();return result;
  };
  api.saveWorkspace=()=>{save();originalSave?.();};
  api.destroy=()=>{
    if(dead)return;save();dead=true;saver.cancel();optionsAbort?.abort();abort.abort();
    for(const event of resourceEvents)EventBus.off(event,onResources,null,abort);
    if(dialog.open)dialog.close();dialog.remove();tabs.remove();panel.remove();style.remove();boardApp.hidden=false;originalDestroy();
  };
  switchTab('evidence');loadOptions();return api;
}
