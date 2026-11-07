import { APPEARANCE_OPTIONS, renderAvatarPreview } from '../ui/characterCreation/AppearanceControls.js';
import { createRandomIdentity } from '../ui/characterCreation/CharacterCreationData.js';
import { saveGameState } from '../gameStatePersistence.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  const result = [...a];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function appearanceFor(person, used) {
  const raw = person.restrictedProfile?.forensicAttributes?.hair_color;
  const hair = String(raw?.value ?? raw ?? '').toLowerCase();
  const mapped = ({blond:'blonde',gray:'grey',ginger:'red',auburn:'red'})[hair] || hair;
  if (hair && !APPEARANCE_OPTIONS.hairColor.options.some(x => x.id === mapped)) {
    throw new Error(`Unsupported forensic hair colour: ${hair}. Add it to AppearanceControls before generating portraits.`);
  }
  for (let attempt = 0; attempt < 10000; attempt++) {
    const appearance = createRandomIdentity().appearance;
    if (hair) appearance.hairColor = mapped;
    appearance.hairStyle = pick(['neat','messy','bob','long','curly','braids','pixie']);
    const signature = JSON.stringify(appearance);
    if (!used.has(signature)) {
      used.add(signature);
      return appearance;
    }
  }
  throw new Error('Could not generate distinct personnel portraits.');
}

function buildRoster(state, suspects) {
  if (suspects.length !== 10 || new Set(suspects.map(s => s.id)).size !== 10) {
    throw new Error('Personnel roster requires exactly ten distinct case suspects.');
  }
  const window = state.caseData?.crimeWindow;
  if (!Number.isInteger(window?.startMinute) || !Number.isInteger(window?.endMinute)) {
    throw new Error('Personnel roster requires the actual crime time window.');
  }
  const usedLooks = new Set();
  const usedNames = new Set(suspects.map(s => String(s.publicProfile?.displayName || s.name).toLowerCase()));
  const usedIds = new Set(suspects.map(s => s.id));
  const people = suspects.map(s => ({
    id:s.id, name:s.publicProfile?.displayName || s.name,
    occupation:s.publicProfile?.occupation || s.occupation || 'Staff member',
    assignment:'On-site / attendance not independently verified',
    appearance:appearanceFor(s, usedLooks)
  }));
  const groups = shuffle([
    {tag:'IT off-site workshop',count:8,role:'IT technician',speaker:'Hotel events manager',
      text:'Every person assigned to the IT off-site workshop was in our hotel conference room throughout the theft window. Continuous room footage and the attendance check identify all eight. The projector also has eight witnesses to its murder.',proof:'Hotel room footage + checked attendance register'},
    {tag:'Archaeology research visit',count:7,role:'Archaeology researcher',speaker:'University laboratory supervisor',
      text:'The seven people on the archaeology research visit were working in our university lab throughout the theft window. Entry records and continuous lab footage confirm each person. Their experiment was still more exciting than the budget meeting.',proof:'University access logs + continuous laboratory footage'},
    {tag:'Conservation training session',count:6,role:'Conservation specialist',speaker:'Training centre coordinator',
      text:'All six participants in the conservation training session were at our off-site centre for the entire theft window. The recording and signed identity checks cover everyone. They spent forty minutes restoring a biscuit tin. It was not on the syllabus.',proof:'Training recording + identity-checked attendance'},
    {tag:'Archive digitisation shift',count:7,role:'Archive assistant',speaker:'Municipal archive supervisor',
      text:'The seven staff assigned to the archive digitisation shift were at the municipal archive throughout the theft window. Our continuous room recording identifies each of them. Nobody escaped. The scanner tried twice.',proof:'Municipal archive room recording + staff register'},
    {tag:'Exhibition courier run',count:6,role:'Exhibition courier',speaker:'Receiving gallery registrar',
      text:'All six people assigned to the exhibition courier run were unloading at our gallery throughout the theft window. The loading-bay recording identifies everyone without a gap. They delivered seventeen crates and one unsolicited opinion.',proof:'Receiving gallery loading-bay footage + delivery manifest'},
    {tag:'Visitor services rehearsal',count:6,role:'Visitor services assistant',speaker:'Theatre stage manager',
      text:'All six participants in the visitor services rehearsal were at our theatre throughout the theft window. Continuous rehearsal footage and identity checks confirm it. The emergency-exit demonstration received a standing evacuation.',proof:'Theatre rehearsal footage + identity-checked participant list'}
  ]);
  const statements = [];
  const missionKey = String(state.currentCaseId || `${state.currentMission.id}:${Date.now()}`);
  let serial = 0;
  for (const group of groups) {
    const ids = [];
    for (let n = 0; n < group.count; n++) {
      let identity;
      let attempt = 0;
      do {
        identity = createRandomIdentity();
        if (++attempt > 10000) throw new Error('Could not generate unique employee names.');
      } while (usedNames.has(identity.name.toLowerCase()));
      usedNames.add(identity.name.toLowerCase());
      let id;
      do { id = `roster:${missionKey}:${++serial}`; } while (usedIds.has(id));
      usedIds.add(id);
      people.push({id,name:identity.name,occupation:group.role,assignment:group.tag,appearance:appearanceFor({},usedLooks)});
      ids.push(id);
    }
    statements.push({id:`statement_${statements.length+1}`,speaker:group.speaker,
      text:`Crime window: ${clock(window.startMinute)}–${clock(window.endMinute)}. ${group.text}`,
      proof:group.proof, clearedIds:ids});
  }
  const cleared = new Set(statements.flatMap(s => s.clearedIds));
  if (people.length !== 50 || cleared.size !== 40 || suspects.some(s => cleared.has(s.id))) {
    throw new Error('Invalid personnel roster elimination plan.');
  }
  return {version:1, people:shuffle(people), statements:shuffle(statements),
    targetIds:suspects.map(s => s.id), excludedIds:[], completed:false, attempts:0};
}

export function ensurePersonnelRoster(state, suspects) {
  const index = state.currentMission?.caseIndex ?? state.currentCaseIndex ?? state.caseIndex;
  if (!Number.isInteger(index)) throw new Error('Missing campaign case index.');
  if (index < 1) return null;
  const mission = state.currentMission;
  const roster = mission.personnelRoster || buildRoster(state, suspects);
  const expected = new Set(suspects.map(s => s.id));
  if (roster.version !== 1 || roster.targetIds.length !== 10 ||
      roster.targetIds.some(id => !expected.has(id))) {
    throw new Error('Saved personnel roster does not match the current case.');
  }
  mission.personnelRoster = roster;
  // Portraits belong to the same case IDs; no forensic fields are changed.
  for (const suspect of suspects) {
    const person = roster.people.find(p => p.id === suspect.id);
    if (!person) throw new Error('Missing case suspect in personnel roster.');
    suspect.appearance = {...person.appearance};
  }
  saveGameState();
  return roster;
}

function loadStyles() {
  if (document.querySelector('[data-personnel-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('../assets/css/personnel-roster.css', import.meta.url).href;
  link.dataset.personnelStyles = 'true';
  document.head.append(link);
  const avatarLink = document.createElement('link');
  avatarLink.rel = 'stylesheet';
  avatarLink.href = new URL('../assets/css/character-creation.css', import.meta.url).href;
  document.head.append(avatarLink);
}

export class PersonnelRosterView {
  constructor(scene, roster, onComplete, onClose) {
    this.scene = scene;
    this.roster = roster;
    this.onComplete = onComplete;
    this.onClose = onClose;
    this.selectedStatement = 0;
    loadStyles();
    this.element = scene.add.dom(0,0).createFromHTML(`
      <section class="personnel-roster" aria-label="Personnel review">
        <header><h1>PERSONNEL REVIEW</h1><button type="button" data-close>Back</button></header>
        <p>Read the verified statements. Click a card to clear a person. Click again to undo.</p>
        <div class="personnel-layout">
          <aside><h2>Witness statements</h2><div data-statements></div><article data-statement></article></aside>
          <div class="personnel-grid" data-grid></div>
        </div>
        <footer><span data-count></span><span role="status" aria-live="polite" data-message></span>
          <button type="button" data-confirm>Confirm shortlist</button></footer>
      </section>`).setOrigin(0,0).setDepth(2000).setScrollFactor(0);
    this.root = this.element.node.querySelector('.personnel-roster');
    this.handleClick = this.handleClick.bind(this);
    this.resize = this.resize.bind(this);
    this.root.addEventListener('click',this.handleClick);
    scene.scale.on('resize',this.resize);
    this.render();
    this.resize();
  }
  resize() {
    if (!this.element?.node) return;
    const {width,height} = this.scene.scale;
    Object.assign(this.element.node.style,{width:`${width}px`,height:`${height}px`,pointerEvents:'auto'});
    this.root.style.width = `${width}px`;
    this.root.style.height = `${height}px`;
  }
  render() {
    const excluded = new Set(this.roster.excludedIds);
    this.root.querySelector('[data-grid]').innerHTML = this.roster.people.map(person => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderAvatarPreview({appearance:person.appearance,name:person.name});
      const avatar = wrapper.querySelector('.agency-id-avatar');
      avatar.removeAttribute('data-avatar-preview');
      avatar.setAttribute('aria-label',`Portrait of ${person.name}`);
      return `<button type="button" class="personnel-card${excluded.has(person.id)?' is-cleared':''}"
        data-person="${esc(person.id)}" aria-pressed="${excluded.has(person.id)}">
        <span class="personnel-photo">${avatar.outerHTML}</span>
        <span class="personnel-name">${esc(person.name)}</span>
        <span>${esc(person.occupation)}</span><small>${esc(person.assignment)}</small>
        <span class="personnel-status">${excluded.has(person.id)?'CLEARED':'UNDER REVIEW'}</span></button>`;
    }).join('');
    this.renderStatement();
    this.updateCount();
  }
  renderStatement() {
    this.root.querySelector('[data-statements]').innerHTML = this.roster.statements.map((s,i) =>
      `<button type="button" data-witness="${i}" aria-pressed="${i===this.selectedStatement}">${esc(s.speaker)}</button>`).join('');
    const s = this.roster.statements[this.selectedStatement];
    this.root.querySelector('[data-statement]').innerHTML = `<h3>${esc(s.speaker)}</h3><p>${esc(s.text)}</p><p class="personnel-proof">VERIFIED: ${esc(s.proof)}</p>`;
  }
  updateCount() {
    const count = this.roster.people.length - this.roster.excludedIds.length;
    this.root.querySelector('[data-count]').textContent = `${count} remaining / target: 10`;
    this.root.querySelector('[data-confirm]').disabled = count !== 10;
  }
  handleClick(event) {
    const button = event.target.closest('button');
    if (!button || !this.root.contains(button)) return;
    if (button.hasAttribute('data-close')) { this.onClose(); return; }
    if (button.hasAttribute('data-witness')) {
      this.selectedStatement = Number(button.dataset.witness);
      this.renderStatement(); return;
    }
    if (button.hasAttribute('data-person')) {
      const id = button.dataset.person;
      const ids = new Set(this.roster.excludedIds);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      this.roster.excludedIds = [...ids];
      button.classList.toggle('is-cleared',ids.has(id));
      button.setAttribute('aria-pressed',String(ids.has(id)));
      button.querySelector('.personnel-status').textContent = ids.has(id)?'CLEARED':'UNDER REVIEW';
      this.root.querySelector('[data-message]').textContent = '';
      this.updateCount(); saveGameState(); return;
    }
    if (button.hasAttribute('data-confirm')) {
      const excluded = new Set(this.roster.excludedIds);
      const remaining = this.roster.people.filter(p => !excluded.has(p.id));
      const target = new Set(this.roster.targetIds);
      if (remaining.length !== 10 || remaining.some(p => !target.has(p.id))) {
        this.roster.attempts++;
        this.root.querySelector('[data-message]').textContent = 'The shortlist contradicts the verified statements. Review your exclusions.';
        saveGameState(); return;
      }
      this.roster.completed = true;
      saveGameState(); this.destroy(); this.onComplete();
    }
  }
  destroy() {
    this.scene.scale.off('resize',this.resize);
    this.root?.removeEventListener('click',this.handleClick);
    this.element?.destroy();
    this.element = null;
    this.root = null;
  }
}
