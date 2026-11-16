import { PERSONNEL_TEXT } from './PersonnelRoster.js';

const ATTENDANCE_VERSION = 1;
const STYLE_ID = 'personnel-attendance-styles';
const DAY = 1440;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function integer(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function substitute(text, values) {
  return String(text || '').replace(/\{(\w+)\}/g, (all, key) => values[key] ?? all);
}

export function formatPersonnelClock(minute, withDay = false) {
  const local = ((minute % DAY) + DAY) % DAY;
  const value = `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`;
  const day = Math.floor(minute / DAY);
  return withDay && day !== 0 ? `${value} (day ${day > 0 ? '+' : ''}${day})` : value;
}

function crimeWindowOf(state) {
  const window = state.caseData?.crimeWindow;
  if (!Number.isInteger(window?.startMinute) ||
      !Number.isInteger(window?.endMinute) ||
      window.endMinute <= window.startMinute) {
    throw new Error('Personnel access records require a valid crime time window.');
  }
  return { startMinute: window.startMinute, endMinute: window.endMinute };
}

export function personnelLogExcludesWindow(log, window) {
  return log?.verified === true &&
    (log.lastExitMinute < window.startMinute ||
     log.firstEntryMinute > window.endMinute);
}

export function getTimeClearedPersonnelIds(roster) {
  const window = roster.attendance?.crimeWindow;
  if (!window) return [];
  return roster.people
    .filter(person => personnelLogExcludesWindow(person.accessLog, window))
    .map(person => person.id);
}

function validate(roster, window) {
  const people = roster.people;
  const targets = new Set(roster.targetIds);
  if (!Array.isArray(people) || people.length !== 50 ||
      new Set(people.map(person => person.id)).size !== 50 || targets.size !== 10 ||
      [...targets].some(id => !people.some(person => person.id === id))) {
    throw new Error('Personnel access records require the existing fifty people and ten canonical suspects.');
  }
  const cleared = new Set(roster.statements.flatMap(statement => statement.clearedIds || []));
  if (cleared.size !== 40 || [...targets].some(id => cleared.has(id)) ||
      [...cleared].some(id => !people.some(person => person.id === id))) {
    throw new Error('Personnel access records cannot change the existing forty-person solution.');
  }
  if (roster.attendance) {
    const pairs = new Set();
    for (const person of people) {
      const log = person.accessLog;
      if (!Number.isInteger(log?.firstEntryMinute) ||
          !Number.isInteger(log?.lastExitMinute) ||
          log.firstEntryMinute >= log.lastExitMinute || log.verified !== true) {
        throw new Error('Saved personnel access records are invalid.');
      }
      pairs.add(`${log.firstEntryMinute}:${log.lastExitMinute}`);
      if (targets.has(person.id) && personnelLogExcludesWindow(log, window)) {
        throw new Error('An access record contradicts the canonical shortlist.');
      }
    }
    if (pairs.size !== people.length) throw new Error('Saved personnel access records contain duplicate time pairs.');
    for (const id of getTimeClearedPersonnelIds(roster)) {
      if (!cleared.has(id)) throw new Error('An access record excludes someone outside the existing solution.');
    }
  }
}

function categoryHint(statement, people) {
  const ids = new Set(statement.clearedIds || []);
  const jobs = [...new Set(people.filter(person => ids.has(person.id))
    .map(person => person.occupation).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'en'));
  if (!jobs.length) return statement.hint;
  return `This category includes: ${jobs.join('; ')}. ` +
    'Match these job titles on the cards; ignore floors and appearance.';
}

function uniqueLog(factory, used) {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const log = factory();
    const key = `${log.firstEntryMinute}:${log.lastExitMinute}`;
    if (log.firstEntryMinute < log.lastExitMinute && !used.has(key)) {
      used.add(key);
      return { ...log, verified: true };
    }
  }
  throw new Error('Could not generate varied personnel access records.');
}

export function ensurePersonnelAttendance(state, roster) {
  if (!roster) return null;
  const window = crimeWindowOf(state);
  if (roster.attendance?.version === ATTENDANCE_VERSION) {
    const saved = roster.attendance.crimeWindow;
    if (saved.startMinute !== window.startMinute || saved.endMinute !== window.endMinute) {
      throw new Error('Saved personnel access records belong to a different crime window.');
    }
    validate(roster, window);
    return roster;
  }
  if (roster.attendance) throw new Error('Unsupported personnel attendance version.');
  validate(roster, window);

  const people = roster.people.map(person => ({ ...person }));
  const offsets = [25, 35, 45, 55, 70, 85, 100, 115, 130, 145, 160, 175];
  const leads = shuffle(offsets);
  const tails = shuffle(offsets);
  const statements = roster.statements.map((statement, index) => {
    const next = { ...statement };
    const from = window.startMinute - leads[index % leads.length] - Math.floor(index / leads.length);
    const to = window.endMinute + tails[index % tails.length] + Math.floor(index / tails.length);
    next.alibiStartMinute = from;
    next.alibiEndMinute = to;
    const data = next.kind === 'job'
      ? PERSONNEL_TEXT.jobs?.[next.collectionId]
      : PERSONNEL_TEXT[next.kind];
    const member = people.find(person => (next.clearedIds || []).includes(person.id));
    const floor = member?.floor === 0 ? PERSONNEL_TEXT.ui.ground
      : substitute(PERSONNEL_TEXT.ui.floor, { floor: member?.floor });
    const values = {
      from: formatPersonnelClock(from, true),
      to: formatPersonnelClock(to, true),
      floor
    };
    if (data) {
      next.text = substitute(data.text, values);
      next.corroboration = substitute(data.note, values);
      next.hint = substitute(data.hint, values);
    }
    if (next.kind === 'job') next.hint = categoryHint(next, people);
    return next;
  });

  const targetIds = new Set(roster.targetIds);
  const candidates = shuffle(people.filter(person => !targetIds.has(person.id)));
  const outside = candidates.slice(0, 8);
  const early = new Set(outside.slice(0, 4).map(person => person.id));
  const late = new Set(outside.slice(4).map(person => person.id));
  const used = new Set();

  for (const person of people) {
    const accounts = statements.filter(statement => (statement.clearedIds || []).includes(person.id));
    const before = Math.min(window.startMinute, ...accounts.map(statement => statement.alibiStartMinute));
    const after = Math.max(window.endMinute, ...accounts.map(statement => statement.alibiEndMinute));
    person.accessLog = uniqueLog(() => {
      if (early.has(person.id)) {
        const lastExitMinute = before - integer(45, 150);
        return { firstEntryMinute: lastExitMinute - integer(45, 240), lastExitMinute };
      }
      if (late.has(person.id)) {
        const firstEntryMinute = after + integer(45, 150);
        return { firstEntryMinute, lastExitMinute: firstEntryMinute + integer(45, 240) };
      }
      return {
        firstEntryMinute: before - integer(45, 240),
        lastExitMinute: after + integer(45, 240)
      };
    }, used);
  }

  const attendance = {
    version: ATTENDANCE_VERSION,
    mode: 'first-entry-last-exit',
    crimeWindow: window,
    verifiedPerimeter: true,
    intermediateTripsOmitted: true
  };
  const draft = { ...roster, people, statements, attendance };
  validate(draft, window);
  roster.people = people;
  roster.statements = statements;
  roster.attendance = attendance;
  return roster;
}

const ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v18h-7M3 12h13M11 7l5 5-5 5"/></svg>';
const EXIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3H3v18h7M9 12h12M16 7l5 5-5 5"/></svg>';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .personnel-roster .personnel-access-times{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px;width:100%;padding-right:32px;flex-shrink:0;color:#463925;font:12px SpecialElite,monospace;font-variant-numeric:tabular-nums;line-height:1.3;text-align:left}
    .personnel-access-times>span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
    .personnel-access-times svg{display:block;width:13px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
    .personnel-roster .personnel-access-context{flex-shrink:0;border:1px solid #b49a70;padding:7px 10px;background:#f7edd4;font-size:13px;line-height:1.35}
    .personnel-access-context .personnel-access-window{display:block;color:#71392e;font-size:16px;margin-bottom:2px}
    .personnel-access-context details{margin-top:3px}
    .personnel-access-context summary{cursor:pointer;width:fit-content}
    .personnel-access-context p{margin:5px 0 0}
    @media(max-width:700px){.personnel-roster .personnel-access-context{font-size:12px;padding:5px 7px}.personnel-access-context .personnel-access-window{font-size:14px}}
  `;
  document.head.append(style);
}

export class PersonnelAttendanceView {
  constructor(view) {
    this.view = view;
    this.root = view.root;
    this.destroyed = false;
    this.banner = null;
    this.observer = null;
    this.destroy = this.destroy.bind(this);
    if (!this.root || !view.roster.attendance) return;
    installStyles();
    this.installHintReview();
    this.installBanner();
    this.decorate();
    const grid = this.root.querySelector('[data-grid]');
    if (grid) {
      this.observer = new MutationObserver(() => this.decorate());
      this.observer.observe(grid, { childList: true, subtree: true });
    }
    view.scene.events.once('shutdown', this.destroy);
    view.scene.events.once('destroy', this.destroy);
  }

  installHintReview() {
    const help = this.view.help;
    if (!help) return;
    this.previousHelpText = help.text;
    help.text = {
      ...help.text,
      instructions: help.text.instructions + '\n\n' +
        'The gate times are verified first entry and last exit, not an uninterrupted stay. Intermediate trips are omitted. A time span overlapping the theft is not an alibi.'
    };
    this.previousReceipt = help.receipt;
    const original = this.previousReceipt;
    this.receiptWrapper = function(definition) {
      const receipt = original.call(this, definition);
      return receipt ? { ...receipt, text: definition.text } : null;
    };
    help.receipt = this.receiptWrapper;
    help.refresh();
  }

  installBanner() {
    const window = this.view.roster.attendance.crimeWindow;
    const banner = document.createElement('div');
    banner.className = 'personnel-access-context';
    banner.innerHTML = '<span class="personnel-access-window" data-access-window></span><span>First entry / last exit. Intermediate trips are omitted.</span><details><summary>Verified gate records</summary><p>Personal identity checks, all perimeter gates and entrance cameras were audited. The displayed entries are the earliest arrival and latest departure in the investigation period. A last exit strictly before the theft window or a first entry strictly after it rules out presence during the theft. An overlapping span does not prove continuous presence or guilt. Day offsets, if any, appear in the time tooltips; day 0 is the day of the theft.</p></details>';
    banner.querySelector('[data-access-window]').textContent =
      `Theft window: ${formatPersonnelClock(window.startMinute, true)}–${formatPersonnelClock(window.endMinute, true)}`;
    const header = this.root.querySelector('.personnel-header');
    if (header) header.after(banner);
    else this.root.prepend(banner);
    this.banner = banner;
  }

  decorate() {
    if (this.destroyed || !this.root) return;
    const byId = new Map(this.view.roster.people.map(person => [String(person.id), person]));
    for (const card of this.root.querySelectorAll('[data-grid] [data-person]')) {
      if (card.querySelector('[data-access-times]')) continue;
      const person = byId.get(card.dataset.person);
      if (!person?.accessLog) continue;
      const bar = document.createElement('span');
      bar.className = 'personnel-access-times';
      bar.setAttribute('data-access-times', '');
      for (const [label, value, icon] of [
        ['First entry', person.accessLog.firstEntryMinute, ENTER],
        ['Last exit', person.accessLog.lastExitMinute, EXIT]
      ]) {
        const item = document.createElement('span');
        item.title = `${label}: ${formatPersonnelClock(value, true)}`;
        item.setAttribute('aria-label', item.title);
        item.innerHTML = icon;
        const time = document.createElement('span');
        time.textContent = formatPersonnelClock(value);
        item.append(time);
        bar.append(item);
      }
      card.prepend(bar);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.banner?.remove();
    this.banner = null;
    const help = this.view.help;
    if (help && this.previousReceipt && help.receipt === this.receiptWrapper) {
      help.receipt = this.previousReceipt;
      help.text = this.previousHelpText;
    }
    this.view.scene.events.off('shutdown', this.destroy);
    this.view.scene.events.off('destroy', this.destroy);
    this.root = null;
  }
}
