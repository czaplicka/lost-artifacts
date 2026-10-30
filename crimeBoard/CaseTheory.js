import { boardCaseKey } from './BoardWorkspace.js';
import { requestAutosave } from '../gameStatePersistence.js';

export const THEORY_FIELDS = [
  ['identity', 'Identity', 'Who committed the theft?'],
  ['motive', 'Motive', 'Why was the artifact stolen?'],
  ['means', 'Means', 'How was the theft carried out?'],
  ['opportunity', 'Opportunity', 'What made the theft possible?']
];
// Player hypotheses, not generated solutions or a correctness oracle.
export const THEORY_OPTIONS = {
  means: [
    ['forced_entry', 'Forced entry and physical removal'],
    ['lockpicking', 'Picked locks and covert entry'],
    ['disguise', 'Disguise or impersonation'],
    ['security_bypass', 'Bypassed security systems'],
    ['insider_assistance', 'Assistance from someone inside'],
    ['authorized_removal', 'Removal disguised as legitimate work'],
    ['stealth', 'Concealment and stealth']
  ],
  opportunity: [
    ['work_access', 'Work duties provided access during the crime window'],
    ['unobserved_interval', 'An unobserved interval during the crime window'],
    ['false_alibi', 'A false alibi concealed presence at the scene'],
    ['borrowed_access', 'Borrowed or stolen credentials provided access'],
    ['security_gap', 'A gap in security created an opening'],
    ['public_access', 'Public opening hours provided an opportunity']
  ]
};
const clone = value => JSON.parse(JSON.stringify(value));
export function normalizeTheory(raw = {}) {
  const result = { version: 1, status: 'draft', sections: {}, updatedAt: raw.updatedAt || null };
  for (const [key] of THEORY_FIELDS) {
    const field = raw.sections?.[key] || {};
    result.sections[key] = {
      answerId: typeof field.answerId === 'string' ? field.answerId : '',
      evidenceIds: [...new Set(Array.isArray(field.evidenceIds)
        ? field.evidenceIds.filter(id => typeof id === 'string') : [])],
      note: typeof field.note === 'string' ? field.note : ''
    };
  }
  return result;
}

export function installCaseTheory(api, initialState, host) {
  const boardApp = api.board.root.closest('.crime-board-app');
  if (!boardApp) throw new Error('Case Theory: crime-board-app is missing.');
  const abort = new AbortController();
  const listen = (node, event, fn) => node.addEventListener(event, fn, { signal: abort.signal });
  let state = initialState;
  let key = boardCaseKey(state);
  let draft = normalizeTheory(state.caseTheories?.[key]);
  let dead = false;
  let motives = [];
  let motiveError = false;
  let activeTab = 'evidence';
  const originalRefresh = api.refresh.bind(api);
  const originalDestroy = api.destroy.bind(api);
  const originalSave = api.saveWorkspace?.bind(api);
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const style = element('style');
  style.textContent = `
    .ct-tabs{display:flex;gap:8px;padding:10px 90px 10px 12px;background:#241d18;position:relative;z-index:20;flex-wrap:wrap}
    .ct-tabs button{padding:10px 14px;background:#473222;color:#f4e6cb;border:1px solid #927344;border-radius:8px;font:14px SpecialElite,monospace;cursor:pointer}
    .ct-tabs button[aria-selected=true]{background:#d9bb79;color:#241d18}
    .ct-panel{padding:18px;color:#f4e6cb;background:rgba(32,25,20,.96);font:15px SpecialElite,monospace;min-height:600px}
    .ct-panel[hidden],.crime-board-app[hidden]{display:none!important}
    .ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .ct-section{padding:16px;border:1px solid #8e7042;border-radius:10px;background:#34281f;min-width:0}
    .ct-section h3{margin:0 0 6px;color:#f2d08e;font-size:22px}
    .ct-section p{line-height:1.45}
    .ct-section select,.ct-section textarea{box-sizing:border-box;width:100%;margin:6px 0 14px;padding:10px;background:#f0dfba;color:#281e16;border:1px solid #a38654;border-radius:5px;font:15px SpecialElite,monospace}
    .ct-section textarea{resize:vertical;min-height:85px}
    .ct-evidence{display:grid;gap:7px;max-height:220px;overflow:auto;margin:8px 0 14px;padding:8px;border:1px solid #6c5539}
    .ct-evidence label{display:flex;gap:9px;align-items:flex-start;padding:6px;cursor:pointer;overflow-wrap:anywhere}
    .ct-evidence input{flex:0 0 auto;accent-color:#d9bb79}
    .ct-muted{color:#c6b28f;font-size:13px}
    .ct-footer{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:16px}
    .ct-footer button{padding:12px 16px;background:#d9bb79;color:#241d18;border:1px solid #927344;border-radius:8px;font:15px SpecialElite,monospace;cursor:pointer}
    @media(max-width:760px){.ct-grid{grid-template-columns:1fr}.ct-panel{padding:12px}}
  `;
  const tabs = element('nav', undefined, 'ct-tabs');
  tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Investigation workspace');
  const evidenceTab = element('button', 'Evidence Board');
  const theoryTab = element('button', 'Case Theory');
  const unique = `ct-${globalThis.crypto.randomUUID()}`;
  const panel = element('section', undefined, 'ct-panel');
  panel.id = `${unique}-theory`;
  boardApp.id ||= `${unique}-evidence`;
  for (const [button, target, suffix] of [[evidenceTab, boardApp, 'evidence'], [theoryTab, panel, 'theory']]) {
    button.type = 'button'; button.id = `${unique}-${suffix}-tab`;
    button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', target.id);
    target.setAttribute('role', 'tabpanel'); target.setAttribute('aria-labelledby', button.id);
  }
  tabs.append(evidenceTab, theoryTab);
  panel.append(element('h2', 'Case Theory'), element('p',
    'Choose your conclusions, then attach evidence supporting each claim. A complete theory is not necessarily a correct theory.'));
  const grid = element('div', undefined, 'ct-grid'); panel.append(grid);
  const footer = element('div', undefined, 'ct-footer');
  const saveButton = element('button', 'Save Theory'); saveButton.type = 'button';
  const status = element('span'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  footer.append(saveButton, status); panel.append(footer);
  panel.append(element('p', 'Draft only. This tab does not file a final accusation, issue a warrant or make an arrest.', 'ct-muted'));
  host.insertBefore(tabs, boardApp); host.append(panel, style);

  const cards = () => api.getData().items.filter(item => item.discovered !== false);
  const answerOptions = field => {
    if (field === 'identity') return cards()
      .filter(item => item.suspectId && !item.tags?.includes('unknown') && !item.createdByPlayer)
      .filter((item, index, all) => all.findIndex(other => other.suspectId === item.suspectId) === index)
      .map(item => [String(item.suspectId), item.label]);
    if (field === 'motive') return motives;
    return THEORY_OPTIONS[field];
  };
  const save = (message = 'Draft saved.') => {
    if (dead) return;
    draft.updatedAt = new Date().toISOString();
    state.caseTheories = { ...(state.caseTheories || {}), [key]: clone(draft) };
    status.textContent = message;
    requestAutosave();
  };
  const rows = new Map();
  for (const [field, title, question] of THEORY_FIELDS) {
    const section = element('section', undefined, 'ct-section');
    section.append(element('h3', title), element('p', question));
    const answerLabel = element('label', 'Your conclusion');
    const select = element('select'); answerLabel.append(select); section.append(answerLabel);
    const answerHelp = element('p', '', 'ct-muted'); section.append(answerHelp);
    section.append(element('h4', 'Supporting evidence'));
    const evidence = element('div', undefined, 'ct-evidence');
    evidence.setAttribute('role', 'group'); evidence.setAttribute('aria-label', `${title}: supporting evidence`);
    section.append(evidence);
    const noteLabel = element('label', 'Your reasoning (optional)');
    const note = element('textarea'); note.rows = 3; note.maxLength = 8000; noteLabel.append(note); section.append(noteLabel);
    listen(select, 'change', () => { draft.sections[field].answerId = select.value; save(); updateProgress(); });
    listen(note, 'input', () => { draft.sections[field].note = note.value; save(); });
    // Delegation avoids accumulating listeners when evidence lists refresh.
    listen(evidence, 'change', event => {
      const input = event.target;
      if (input.type !== 'checkbox') return;
      const ids = new Set(draft.sections[field].evidenceIds);
      if (input.checked) ids.add(input.value); else ids.delete(input.value);
      draft.sections[field].evidenceIds = [...ids]; save(); updateProgress();
    });
    rows.set(field, { select, evidence, note, answerHelp }); grid.append(section);
  }
  function updateProgress() {
    const answered = THEORY_FIELDS.filter(([field]) => draft.sections[field].answerId).length;
    const supported = THEORY_FIELDS.filter(([field]) => draft.sections[field].evidenceIds.length).length;
    saveButton.textContent = `Save Theory — ${answered}/4 conclusions`;
    saveButton.title = `${supported}/4 sections have attached evidence. This is not a correctness check.`;
  }
  function render() {
    const availableCards = cards();
    for (const [field] of THEORY_FIELDS) {
      const row = rows.get(field), value = draft.sections[field];
      row.select.replaceChildren();
      const placeholder = element('option', 'Choose a conclusion...'); placeholder.value = ''; row.select.append(placeholder);
      const options = answerOptions(field);
      for (const [id, label] of options) { const option = element('option', label); option.value = id; row.select.append(option); }
      if (value.answerId && !options.some(([id]) => id === value.answerId)) {
        const missing = element('option', `Previously selected: ${value.answerId} (not currently available)`);
        missing.value = value.answerId; row.select.append(missing);
      }
      row.select.value = value.answerId;
      row.answerHelp.textContent = field === 'motive'
        ? motiveError ? 'Motive options could not be loaded. Reopen the board to retry.' : !motives.length ? 'Loading motive options...' : 'All motive hypotheses are offered; the case solution is not highlighted.'
        : field === 'identity' ? 'Only named suspect cards already on your Evidence Board are listed.'
        : 'Choose your hypothesis. It is not automatically verified against the solution.';
      row.note.value = value.note;
      row.evidence.replaceChildren();
      const seen = new Set();
      for (const card of availableCards) {
        seen.add(card.id);
        const label = element('label'); const input = element('input'); input.type = 'checkbox'; input.value = card.id;
        input.checked = value.evidenceIds.includes(card.id);
        label.append(input, element('span', `${card.label}${card.createdByPlayer ? ' (your note/card)' : ''}`));
        label.title = card.body || card.text || card.caption || '';
        row.evidence.append(label);
      }
      for (const id of value.evidenceIds.filter(id => !seen.has(id))) {
        const label = element('label'); const input = element('input'); input.type = 'checkbox'; input.value = id; input.checked = true;
        label.append(input, element('span', `Unavailable evidence: ${id} — uncheck to remove`)); row.evidence.append(label);
      }
      if (!row.evidence.children.length) row.evidence.append(element('p', 'No discovered cards yet.', 'ct-muted'));
    }
    updateProgress();
  }
  const switchTab = tab => {
    activeTab = tab; const theory = tab === 'theory';
    boardApp.hidden = theory; panel.hidden = !theory;
    for (const [button, selected] of [[evidenceTab, !theory], [theoryTab, theory]]) {
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    }
    if (theory) render(); else api.board.onResize();
  };
  listen(evidenceTab, 'click', () => switchTab('evidence'));
  listen(theoryTab, 'click', () => switchTab('theory'));
  listen(tabs, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'evidence' : event.key === 'End' ? 'theory' : activeTab === 'theory' ? 'evidence' : 'theory';
    switchTab(next); (next === 'theory' ? theoryTab : evidenceTab).focus();
  });
  listen(saveButton, 'click', () => save('Draft saved. No accusation submitted.'));
  switchTab('evidence');

  fetch(new URL('../assets/data/motives.json', import.meta.url), { signal: abort.signal })
    .then(response => { if (!response.ok) throw new Error(`Motives: ${response.status}`); return response.json(); })
    .then(data => {
      if (dead) return;
      const labels = new Map();
      for (const motive of data.motives || []) {
        const entry = motive.crimeBoard;
        if (entry?.answerId && entry.label) labels.set(entry.answerId, entry.label);
        for (const id of entry?.falseOptions || []) if (!labels.has(id)) labels.set(id, id.replaceAll('_', ' '));
      }
      motives = [...labels].sort((a,b) => a[1].localeCompare(b[1]));
      if (activeTab === 'theory') render();
    }).catch(error => {
      if (dead || error.name === 'AbortError') return;
      motiveError = true; console.error('Case Theory motive options:', error);
      if (activeTab === 'theory') render();
    });
  api.refresh = (nextState = state) => {
    save(); const nextKey = boardCaseKey(nextState);
    const result = originalRefresh(nextState); state = nextState;
    if (nextKey !== key) { key = nextKey; draft = normalizeTheory(state.caseTheories?.[key]); }
    if (activeTab === 'theory') render();
    return result;
  };
  api.saveWorkspace = () => { save(); originalSave?.(); };
  api.destroy = () => {
    if (dead) return;
    save(); dead = true; abort.abort();
    tabs.remove(); panel.remove(); style.remove(); boardApp.hidden = false;
    originalDestroy();
  };
  return api;
}
