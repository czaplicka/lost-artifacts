import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { ALIBI_SEARCH_CASE, ALIBI_PHONE_CONTACT, ALIBI_CLUB_CONTACT } from './AlibiCaseData.js';
import { ALIBI_INTERVIEW_CONTACTS } from './AlibiInterviewData.js';
import { ALIBI_DIALOGUE_RULES } from './AlibiDialogueData.js';
import { ALIBI_GUIDANCE_RULES } from './AlibiGuidanceRules.js';

const MARKER = Symbol.for(__dialogueText("ui/pi-computer/AlibiBreakInTimes.js", "t_1b84df1bedadcc85d82a"));
export const ALIBI_BREAKIN_TIME_KEYWORDS = [
  { id: 'breakin_window_start', label: __dialogueText("ui/pi-computer/AlibiBreakInTimes.js", "t_6cf7350a37efb7dff4fa"), cloudId: 'incident_times' },
  { id: 'breakin_window_end', label: __dialogueText("ui/pi-computer/AlibiBreakInTimes.js", "t_7932c6e5dd799b7a4b22"), cloudId: 'incident_times' }
];

export function breakInTimeFragments(parts) {
  const result = [];
  for (const part of parts) {
    if (typeof part !== 'string') { result.push(part); continue; }
    let start = 0;
    for (const match of part.matchAll(/\b20:(10|25)(?![\d:])/g)) {
      if (match.index > start) result.push(part.slice(start, match.index));
      result.push({
        keywordId: match[1] === '10' ? 'breakin_window_start' : 'breakin_window_end',
        text: match[0]
      });
      start = match.index + match[0].length;
    }
    if (start < part.length) result.push(part.slice(start));
    if (!part.length) result.push(part);
  }
  return result;
}

function decorateLines(lines) {
  for (const line of lines || []) {
    if (typeof line?.text !== 'string') continue;
    const fragments = breakInTimeFragments(line.fragments || [line.text]);
    if (fragments.some(part => typeof part === 'object' &&
      ALIBI_BREAKIN_TIME_KEYWORDS.some(keyword => keyword.id === part.keywordId))) {
      line.fragments = fragments;
    }
  }
}

export function registerAlibiBreakInTimes(definition = ALIBI_SEARCH_CASE) {
  if (definition?.id !== 'borrowed_alibi') return;
  definition.clouds ??= [];
  if (!definition.clouds.some(cloud => cloud.id === 'incident_times')) {
    definition.clouds.push({ id: 'incident_times', title: __dialogueText("ui/pi-computer/AlibiBreakInTimes.js", "t_35291f87773574a4452c") });
  }
  definition.keywords ??= [];
  for (const keyword of ALIBI_BREAKIN_TIME_KEYWORDS) {
    if (!definition.keywords.some(item => item.id === keyword.id)) {
      definition.keywords.push({ ...keyword });
    }
  }
  for (const page of definition.pages || []) {
    if (Array.isArray(page.blocks)) {
      page.blocks = page.blocks.map(block =>
        Array.isArray(block) ? breakInTimeFragments(block) : block
      );
    }
  }
}

function prepareSources() {
  registerAlibiBreakInTimes();
  for (const rule of [...ALIBI_DIALOGUE_RULES, ...ALIBI_GUIDANCE_RULES]) {
    decorateLines(rule.lines);
  }
  for (const contact of [ALIBI_PHONE_CONTACT, ALIBI_CLUB_CONTACT, ...ALIBI_INTERVIEW_CONTACTS]) {
    decorateLines(contact.greeting);
    decorateLines(contact.fallback);
    for (const lines of contact.fallbackVariants || []) decorateLines(lines);
    for (const topic of contact.topics || []) decorateLines(topic.lines);
  }
}

// Definitions must exist before phone-data validation.
prepareSources();

export function installAlibiBreakInTimes(ui, documents) {
  if (ui[MARKER]) return ui[MARKER];
  prepareSources();
  const mail = documents.alibiMail;
  if (!mail || typeof mail.fragments !== 'function') {
    throw new TypeError('[AlibiBreakInTimes] BorrowedAlibiMail.fragments is unavailable.');
  }
  const original = mail.fragments;
  const wrapped = function (...args) {
    const loaded = ui.search?.data?.cases?.find(item => item.id === 'borrowed_alibi');
    if (loaded) registerAlibiBreakInTimes(loaded);
    return original.apply(this, args).map(breakInTimeFragments);
  };
  mail.fragments = wrapped;
  let dead = false;
  const destroy = () => {
    if (dead) return;
    dead = true;
    if (mail.fragments === wrapped) mail.fragments = original;
    ui.scene.events.off('shutdown', destroy);
    if (ui[MARKER] === api) delete ui[MARKER];
  };
  const api = { destroy };
  ui[MARKER] = api;
  ui.scene.events.once('shutdown', destroy);
  return api;
}
