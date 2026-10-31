import { boardCaseKey } from './BoardWorkspace.js';
import { requestAutosave } from '../gameStatePersistence.js';

export const THEORY_FIELDS = [
  ['identity', 'Identity', 'Who committed the theft?'],
  ['motive', 'Motive', 'Why was the artifact stolen?'],
  ['means', 'Means', 'Which skills were used to commit this theft?'],
  ['opportunity', 'Opportunity', 'What made the theft possible?']
];

export const THEORY_OPTIONS = {
  opportunity: [
    ['work_access', 'Work duties provided access during the crime window'],
    ['unobserved_interval', 'An unobserved interval during the crime window'],
    ['false_alibi', 'A false alibi concealed presence at the scene'],
    ['borrowed_access', 'Borrowed or stolen credentials provided access'],
    ['security_gap', 'A gap in security created an opening'],
    ['public_access', 'Public opening hours provided an opportunity']
  ]
};

const LEGACY_MEANS_LABELS = {
  forced_entry: 'Forced entry and physical removal',
  lockpicking: 'Picked locks and covert entry',
  disguise: 'Disguise or impersonation',
  security_bypass: 'Bypassed security systems',
  insider_assistance: 'Assistance from someone inside',
  authorized_removal: 'Removal disguised as legitimate work',
  stealth: 'Concealment and stealth'
};

const clone = value => JSON.parse(JSON.stringify(value));

function uniqueStrings(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .filter(value => typeof value === 'string' && value.trim())
      .map(value => value.trim())
  )];
}

export function normalizeSkillId(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (
    normalized === 'pickpocket' ||
    normalized === 'pickpocketing' ||
    normalized === 'pick pocketing'
  ) {
    return 'pickpocket';
  }

  return normalized;
}

function skillLabel(value) {
  const id = normalizeSkillId(value);

  if (id === 'pickpocket') {
    return 'Pickpocket';
  }

  const text = String(value ?? '').trim();

  return text
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : '';
}

export function buildSkillOptions(database) {
  if (!Array.isArray(database)) {
    throw new Error('Case Theory: suspects.json must contain an array.');
  }

  const skills = new Map();

  for (const suspect of database) {
    const raw = suspect?.skills;

    const entries = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(',')
        : [];

    for (const entry of entries) {
      if (typeof entry !== 'string' || !entry.trim()) {
        continue;
      }

      const id = normalizeSkillId(entry);

      if (id && !skills.has(id)) {
        skills.set(id, skillLabel(entry));
      }
    }
  }

  if (!skills.size) {
    throw new Error('Case Theory: no skills found in suspects.json.');
  }

  return [...skills].sort((a, b) => a[1].localeCompare(b[1]));
}

export function normalizeTheory(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const result = {
    version: 2,
    status: 'draft',
    sections: {},
    updatedAt: source.updatedAt || null
  };

  for (const [key] of THEORY_FIELDS) {
    const field = source.sections?.[key] || {};

    result.sections[key] = {
      answerId: key === 'means'
        ? ''
        : typeof field.answerId === 'string'
          ? field.answerId
          : '',
      evidenceIds: uniqueStrings(field.evidenceIds),
      note: typeof field.note === 'string' ? field.note : ''
    };

    if (key === 'means') {
      result.sections.means.skillIds = [
        ...new Set(
          uniqueStrings(field.skillIds)
            .map(normalizeSkillId)
            .filter(Boolean)
        )
      ];

      result.sections.means.legacyAnswerId =
        typeof field.legacyAnswerId === 'string'
          ? field.legacyAnswerId
          : typeof field.answerId === 'string'
            ? field.answerId
            : '';
    }
  }

  return result;
}

export function installCaseTheory(api, initialState, host) {
  const boardApp = api.board.root.closest('.crime-board-app');

  if (!boardApp) {
    throw new Error('Case Theory: crime-board-app is missing.');
  }

  const abort = new AbortController();

  const listen = (node, event, handler) => {
    node.addEventListener(event, handler, {
      signal: abort.signal
    });
  };

  let state = initialState;
  let key = boardCaseKey(state);
  let draft = normalizeTheory(state.caseTheories?.[key]);

  let dead = false;
  let motives = [];
  let skills = [];

  let motiveError = false;
  let skillError = false;
  let skillsLoading = true;

  let activeTab = 'evidence';

  const originalRefresh = api.refresh.bind(api);
  const originalDestroy = api.destroy.bind(api);
  const originalSave = api.saveWorkspace?.bind(api);

  const element = (tag, text, className) => {
    const node = document.createElement(tag);

    if (text !== undefined) {
      node.textContent = text;
    }

    if (className) {
      node.className = className;
    }

    return node;
  };

  const style = element('style');

  style.textContent = `
    .ct-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 90px 10px 12px;
      background: #241d18;
      position: relative;
      z-index: 20;
    }

    .ct-tabs button {
      padding: 10px 14px;
      background: #473222;
      color: #f4e6cb;
      border: 1px solid #927344;
      border-radius: 8px;
      font: 14px SpecialElite, monospace;
      cursor: pointer;
    }

    .ct-tabs button[aria-selected="true"] {
      background: #d9bb79;
      color: #241d18;
    }

    .ct-panel {
      padding: 18px;
      color: #f4e6cb;
      background: rgba(32, 25, 20, .96);
      font: 15px SpecialElite, monospace;
      min-height: 600px;
    }

    .ct-panel[hidden],
    .crime-board-app[hidden] {
      display: none !important;
    }

    .ct-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .ct-section {
      padding: 16px;
      border: 1px solid #8e7042;
      border-radius: 10px;
      background: #34281f;
      min-width: 0;
    }

    .ct-section h3 {
      margin: 0 0 6px;
      color: #f2d08e;
      font-size: 22px;
    }

    .ct-section p {
      line-height: 1.45;
    }

    .ct-section select,
    .ct-section textarea {
      box-sizing: border-box;
      width: 100%;
      margin: 6px 0 14px;
      padding: 10px;
      background: #f0dfba;
      color: #281e16;
      border: 1px solid #a38654;
      border-radius: 5px;
      font: 15px SpecialElite, monospace;
    }

    .ct-section textarea {
      resize: vertical;
      min-height: 85px;
    }

    .ct-evidence {
      display: grid;
      gap: 7px;
      max-height: 220px;
      overflow: auto;
      margin: 8px 0 14px;
      padding: 8px;
      border: 1px solid #6c5539;
    }

    .ct-evidence label,
    .ct-skills label {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      padding: 8px;
      cursor: pointer;
      overflow-wrap: anywhere;
    }

    .ct-evidence input,
    .ct-skills input {
      flex: 0 0 auto;
      width: 17px;
      height: 17px;
      margin: 1px 0 0;
      accent-color: #d9bb79;
    }

    .ct-skills {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 5px;
      max-height: 300px;
      overflow: auto;
      margin: 8px 0 12px;
      padding: 8px;
      border: 1px solid #927344;
      border-radius: 6px;
      background: rgba(0, 0, 0, .12);
    }

    .ct-skills label {
      border: 1px solid transparent;
      border-radius: 5px;
    }

    .ct-skills label:has(input:checked) {
      background: rgba(217, 187, 121, .13);
      border-color: #927344;
    }

    .ct-skills-empty {
      grid-column: 1 / -1;
    }

    .ct-muted {
      color: #c6b28f;
      font-size: 13px;
    }

    .ct-legacy {
      padding: 10px;
      border: 1px dashed #b99556;
      color: #f2d08e;
    }

    .ct-section .ct-legacy[hidden] {
      display: none !important;
    }

    .ct-footer {
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .ct-footer button,
    .ct-retry {
      padding: 12px 16px;
      background: #d9bb79;
      color: #241d18;
      border: 1px solid #927344;
      border-radius: 8px;
      font: 15px SpecialElite, monospace;
      cursor: pointer;
    }

    .ct-retry {
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 13px;
    }

    .ct-section .ct-retry[hidden] {
      display: none !important;
    }

    .ct-tabs button:focus-visible,
    .ct-footer button:focus-visible,
    .ct-retry:focus-visible,
    .ct-section input:focus-visible,
    .ct-section select:focus-visible,
    .ct-section textarea:focus-visible {
      outline: 2px solid #ffd36c;
      outline-offset: 3px;
    }

    @media (max-width: 760px) {
      .ct-grid {
        grid-template-columns: 1fr;
      }

      .ct-panel {
        padding: 12px;
      }
    }

    @media (max-width: 420px) {
      .ct-skills {
        grid-template-columns: 1fr;
      }
    }
  `;

  const tabs = element('nav', undefined, 'ct-tabs');

  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Investigation workspace');

  const evidenceTab = element('button', 'Evidence Board');
  const theoryTab = element('button', 'Case Theory');

  const unique = `ct-${globalThis.crypto.randomUUID()}`;

  const panel = element('section', undefined, 'ct-panel');
  panel.id = `${unique}-theory`;

  boardApp.id ||= `${unique}-evidence`;

  for (const [button, target, suffix] of [
    [evidenceTab, boardApp, 'evidence'],
    [theoryTab, panel, 'theory']
  ]) {
    button.type = 'button';
    button.id = `${unique}-${suffix}-tab`;

    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', target.id);

    target.setAttribute('role', 'tabpanel');
    target.setAttribute('aria-labelledby', button.id);
  }

  tabs.append(evidenceTab, theoryTab);

  panel.append(
    element('h2', 'Case Theory'),
    element(
      'p',
      'Choose your conclusions, then attach evidence supporting each claim. ' +
      'A complete theory is not necessarily a correct theory.'
    )
  );

  const grid = element('div', undefined, 'ct-grid');
  panel.append(grid);

  const footer = element('div', undefined, 'ct-footer');

  const saveButton = element('button', 'Save Theory');
  saveButton.type = 'button';

  const status = element('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  footer.append(saveButton, status);
  panel.append(footer);

  panel.append(
    element(
      'p',
      'Draft only. This tab does not file a final accusation, ' +
      'issue a warrant or make an arrest.',
      'ct-muted'
    )
  );

  host.insertBefore(tabs, boardApp);
  host.append(panel, style);

  const cards = () => {
    return api.getData().items.filter(
      item => item.discovered !== false
    );
  };

  const answerOptions = field => {
    if (field === 'identity') {
      return cards()
        .filter(item =>
          item.suspectId &&
          !item.tags?.includes('unknown') &&
          !item.createdByPlayer
        )
        .filter((item, index, all) =>
          all.findIndex(other =>
            other.suspectId === item.suspectId
          ) === index
        )
        .map(item => [
          String(item.suspectId),
          item.label
        ]);
    }

    if (field === 'motive') {
      return motives;
    }

    return THEORY_OPTIONS[field] || [];
  };

  const save = (message = 'Draft saved.') => {
    if (dead) return;

    draft.updatedAt = new Date().toISOString();

    state.caseTheories = {
      ...(state.caseTheories || {}),
      [key]: clone(draft)
    };

    status.textContent = message;
    requestAutosave();
  };

  const rows = new Map();

  for (const [field, title, question] of THEORY_FIELDS) {
    const section = element('section', undefined, 'ct-section');

    section.append(
      element('h3', title),
      element('p', question)
    );

    let select = null;
    let skillList = null;
    let skillSummary = null;
    let legacyMessage = null;
    let retrySkills = null;

    if (field === 'means') {
      section.append(element('h4', 'Skills used in this theft'));

      skillList = element('div', undefined, 'ct-skills');
      skillList.setAttribute('role', 'group');
      skillList.setAttribute(
        'aria-label',
        'Select the skills used in this theft'
      );

      skillSummary = element('p', '', 'ct-muted');
      skillSummary.setAttribute('aria-live', 'polite');

      legacyMessage = element('p', '', 'ct-legacy');
      legacyMessage.hidden = true;

      retrySkills = element('button', 'Retry loading skills', 'ct-retry');
      retrySkills.type = 'button';
      retrySkills.hidden = true;

      section.append(
        skillList,
        skillSummary,
        retrySkills,
        legacyMessage
      );

      listen(skillList, 'change', event => {
        const input = event.target;

        if (input.type !== 'checkbox') return;

        const selected = new Set(
          draft.sections.means.skillIds
        );

        if (input.checked) {
          selected.add(input.value);
        } else {
          selected.delete(input.value);
        }

        draft.sections.means.skillIds = [...selected];

        save();
        updateSkillSummary();
        updateProgress();
      });

      listen(retrySkills, 'click', () => {
        loadSkills();
      });
    } else {
      const answerLabel = element('label', 'Your conclusion');

      select = element('select');
      answerLabel.append(select);

      section.append(answerLabel);

      listen(select, 'change', () => {
        draft.sections[field].answerId = select.value;

        save();
        updateProgress();
      });
    }

    const answerHelp = element('p', '', 'ct-muted');
    section.append(answerHelp);

    section.append(element('h4', 'Supporting evidence'));

    const evidence = element('div', undefined, 'ct-evidence');

    evidence.setAttribute('role', 'group');
    evidence.setAttribute(
      'aria-label',
      `${title}: supporting evidence`
    );

    section.append(evidence);

    const noteLabel = element(
      'label',
      'Your reasoning (optional)'
    );

    const note = element('textarea');
    note.rows = 3;
    note.maxLength = 8000;

    noteLabel.append(note);
    section.append(noteLabel);

    listen(note, 'input', () => {
      draft.sections[field].note = note.value;
      save();
    });

    listen(evidence, 'change', event => {
      const input = event.target;

      if (input.type !== 'checkbox') return;

      const selected = new Set(
        draft.sections[field].evidenceIds
      );

      if (input.checked) {
        selected.add(input.value);
      } else {
        selected.delete(input.value);
      }

      draft.sections[field].evidenceIds = [...selected];

      save();
      updateProgress();
    });

    rows.set(field, {
      select,
      skillList,
      skillSummary,
      legacyMessage,
      retrySkills,
      evidence,
      note,
      answerHelp
    });

    grid.append(section);
  }

  function updateSkillSummary() {
    const count = draft.sections.means.skillIds.length;

    rows.get('means').skillSummary.textContent =
      `${count} skill${count === 1 ? '' : 's'} selected. ` +
      'Select skills used in this theft, not every skill the suspect possesses.';
  }

  function updateProgress() {
    const answered = THEORY_FIELDS.filter(([field]) => {
      if (field === 'means') {
        return draft.sections.means.skillIds.length > 0;
      }

      return Boolean(draft.sections[field].answerId);
    }).length;

    const supported = THEORY_FIELDS.filter(([field]) =>
      draft.sections[field].evidenceIds.length > 0
    ).length;

    saveButton.textContent =
      `Save Theory — ${answered}/4 conclusions`;

    saveButton.title =
      `${supported}/4 sections have attached evidence. ` +
      'This is not a correctness check.';
  }

  function appendCheckbox(container, id, text, checked, tooltip = '') {
    const label = element('label');
    const input = element('input');

    input.type = 'checkbox';
    input.value = id;
    input.checked = checked;

    label.append(
      input,
      element('span', text)
    );

    if (tooltip) {
      label.title = tooltip;
    }

    container.append(label);
  }

  function renderSkills() {
    const row = rows.get('means');
    const value = draft.sections.means;

    row.skillList.replaceChildren();

    const knownIds = new Set(
      skills.map(([id]) => id)
    );

    for (const [id, label] of skills) {
      appendCheckbox(
        row.skillList,
        id,
        label,
        value.skillIds.includes(id)
      );
    }

    for (const id of value.skillIds) {
      if (knownIds.has(id)) continue;

      appendCheckbox(
        row.skillList,
        id,
        `Previously selected: ${id}`,
        true
      );
    }

    if (!skills.length) {
      const message = skillsLoading
        ? 'Loading the complete skill list...'
        : skillError
          ? 'Could not load skills. Your saved selections have been retained.'
          : 'No skills are available.';

      row.skillList.append(
        element('p', message, 'ct-muted ct-skills-empty')
      );
    }

    row.retrySkills.hidden = !skillError || skillsLoading;

    row.legacyMessage.hidden = !value.legacyAnswerId;

    if (value.legacyAnswerId) {
      const oldLabel =
        LEGACY_MEANS_LABELS[value.legacyAnswerId] ||
        value.legacyAnswerId;

      row.legacyMessage.textContent =
        `Previous Means conclusion: "${oldLabel}". ` +
        'This was saved using the old format. ' +
        'Select the relevant skills above; none were selected automatically.';
    }

    row.answerHelp.textContent =
      'The list comes from the complete suspect database, ' +
      'not the current thief. No skills are selected or verified for you.';

    updateSkillSummary();
  }

  function render() {
    const availableCards = cards();

    for (const [field] of THEORY_FIELDS) {
      const row = rows.get(field);
      const value = draft.sections[field];

      if (field === 'means') {
        renderSkills();
      } else {
        row.select.replaceChildren();

        const placeholder = element(
          'option',
          'Choose a conclusion...'
        );

        placeholder.value = '';
        row.select.append(placeholder);

        const options = answerOptions(field);

        for (const [id, label] of options) {
          const option = element('option', label);
          option.value = id;

          row.select.append(option);
        }

        if (
          value.answerId &&
          !options.some(([id]) => id === value.answerId)
        ) {
          const missing = element(
            'option',
            `Previously selected: ${value.answerId} ` +
            '(not currently available)'
          );

          missing.value = value.answerId;
          row.select.append(missing);
        }

        row.select.value = value.answerId;

        if (field === 'motive') {
          row.answerHelp.textContent = motiveError
            ? 'Motive options could not be loaded. Reopen the board to retry.'
            : !motives.length
              ? 'Loading motive options...'
              : 'All motive hypotheses are offered; the case solution is not highlighted.';
        } else if (field === 'identity') {
          row.answerHelp.textContent =
            'Only named suspect cards already on your Evidence Board are listed.';
        } else {
          row.answerHelp.textContent =
            'Choose your hypothesis. It is not automatically verified against the solution.';
        }
      }

      row.note.value = value.note;
      row.evidence.replaceChildren();

      const seen = new Set();

      for (const card of availableCards) {
        seen.add(card.id);

        appendCheckbox(
          row.evidence,
          card.id,
          `${card.label}${card.createdByPlayer ? ' (your note/card)' : ''}`,
          value.evidenceIds.includes(card.id),
          card.body || card.text || card.caption || ''
        );
      }

      for (const id of value.evidenceIds) {
        if (seen.has(id)) continue;

        appendCheckbox(
          row.evidence,
          id,
          `Unavailable evidence: ${id} — uncheck to remove`,
          true
        );
      }

      if (!row.evidence.children.length) {
        row.evidence.append(
          element('p', 'No discovered cards yet.', 'ct-muted')
        );
      }
    }

    updateProgress();
  }

  const switchTab = tab => {
    activeTab = tab;

    const theory = tab === 'theory';

    boardApp.hidden = theory;
    panel.hidden = !theory;

    for (const [button, selected] of [
      [evidenceTab, !theory],
      [theoryTab, theory]
    ]) {
      button.setAttribute(
        'aria-selected',
        String(selected)
      );

      button.tabIndex = selected ? 0 : -1;
    }

    if (theory) {
      render();
    } else {
      api.board.onResize();
    }
  };

  listen(evidenceTab, 'click', () => {
    switchTab('evidence');
  });

  listen(theoryTab, 'click', () => {
    switchTab('theory');
  });

  listen(tabs, 'keydown', event => {
    if (
      !['ArrowLeft', 'ArrowRight', 'Home', 'End']
        .includes(event.key)
    ) {
      return;
    }

    event.preventDefault();

    const next = event.key === 'Home'
      ? 'evidence'
      : event.key === 'End'
        ? 'theory'
        : activeTab === 'theory'
          ? 'evidence'
          : 'theory';

    switchTab(next);

    (next === 'theory' ? theoryTab : evidenceTab).focus();
  });

  listen(saveButton, 'click', () => {
    save('Draft saved. No accusation submitted.');
  });

  async function loadSkills() {
    if (dead) return;

    skillsLoading = true;
    skillError = false;

    if (activeTab === 'theory') {
      renderSkills();
    }

    try {
      const response = await fetch(
        new URL('../assets/data/suspects.json', import.meta.url),
        { signal: abort.signal }
      );

      if (!response.ok) {
        throw new Error(`Skills: ${response.status}`);
      }

      const database = await response.json();

      if (dead) return;

      skills = buildSkillOptions(database);
    } catch (error) {
      if (dead || error.name === 'AbortError') return;

      skillError = true;
      console.error('Case Theory skill options:', error);
    } finally {
      if (!dead) {
        skillsLoading = false;

        if (activeTab === 'theory') {
          renderSkills();
        }
      }
    }
  }

  async function loadMotives() {
    try {
      const response = await fetch(
        new URL('../assets/data/motives.json', import.meta.url),
        { signal: abort.signal }
      );

      if (!response.ok) {
        throw new Error(`Motives: ${response.status}`);
      }

      const data = await response.json();

      if (dead) return;

      const labels = new Map();

      for (const motive of data.motives || []) {
        const entry = motive.crimeBoard;

        if (entry?.answerId && entry.label) {
          labels.set(entry.answerId, entry.label);
        }
      }

      for (const motive of data.motives || []) {
        for (const id of motive.crimeBoard?.falseOptions || []) {
          if (!labels.has(id)) {
            labels.set(id, id.replaceAll('_', ' '));
          }
        }
      }

      motives = [...labels].sort(
        (a, b) => a[1].localeCompare(b[1])
      );

      if (activeTab === 'theory') {
        render();
      }
    } catch (error) {
      if (dead || error.name === 'AbortError') return;

      motiveError = true;
      console.error('Case Theory motive options:', error);

      if (activeTab === 'theory') {
        render();
      }
    }
  }

  switchTab('evidence');

  loadSkills();
  loadMotives();

  api.refresh = (nextState = state) => {
    save();

    const nextKey = boardCaseKey(nextState);
    const result = originalRefresh(nextState);

    state = nextState;

    if (nextKey !== key) {
      key = nextKey;
      draft = normalizeTheory(state.caseTheories?.[key]);
    }

    if (activeTab === 'theory') {
      render();
    }

    return result;
  };

  api.saveWorkspace = () => {
    save();
    originalSave?.();
  };

  api.destroy = () => {
    if (dead) return;

    save();

    dead = true;
    abort.abort();

    tabs.remove();
    panel.remove();
    style.remove();

    boardApp.hidden = false;

    originalDestroy();
  };

  return api;
}