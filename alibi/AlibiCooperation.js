import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';

export const COOPERATION_LABELS = ['Guarded', 'Cautious', 'Cooperative', 'Open'];
export const APPROACHES = [
  { id: 'reassure', label: 'Reassure', line: 'We can take this one question at a time.' },
  { id: 'direct', label: 'Be direct', line: 'Let us separate what happened from what you assumed.' },
  { id: 'joke', label: 'Share a joke', line: 'The notebook is intimidating. The handwriting is worse.' }
];
export const CHALLENGES = [
  { id: 'host', label: "The host's location" },
  { id: 'room', label: 'The sealed room' },
  { id: 'departure', label: 'The early departure' },
  { id: 'arrival', label: 'The late arrival' },
  { id: 'date', label: 'The attendance date' },
  { id: 'duration', label: 'The length of the visit' }
];

const PROFILES = [
  { id: 'worried', likes: 'reassure', dislikes: 'direct',
    hint: 'Keeps checking whether you are writing down every word.',
    openings: [
      'Am I in trouble, or merely adjacent to trouble? I need to dress appropriately.',
      'You said a few questions. Is that a legal quantity or an optimistic one?',
      'I have never been interviewed before. Unless the bank counts. That felt hostile.',
      'Please do not underline my name. It looks much guiltier underlined.',
      'Can we start with a question I cannot accidentally incriminate myself answering?',
      'I made tea. Then I worried that offering tea looked suspicious. So now it is cold.' ] },
  { id: 'busy', likes: 'direct', dislikes: 'joke',
    hint: 'Watches the clock, but listens closely when you mention a specific detail.',
    openings: [
      'Five minutes. My unfinished work has started reproducing.',
      'Please have a question ready. I have already postponed postponing something.',
      'Can we skip the ceremonial introduction and proceed to the actual problem?',
      'I scheduled a nervous breakdown for four. You are in its slot.',
      'You have my attention. Temporarily. It is on loan from several deadlines.',
      'I do not mind questions. I mind questions with a scenic route.' ] },
  { id: 'chatty', likes: 'joke', dislikes: 'direct',
    hint: 'Answers questions you have not asked yet. Some of them twice.',
    openings: [
      'Finally, someone taking notes. My family has stopped even pretending.',
      'Where shall I begin? Before you say the beginning, I have several.',
      'I was hoping you would visit. Not because of the theft. Terrible business. Lovely notebook.',
      'Do you want the short version or the version with the interesting people?',
      'I promised myself I would not gossip. Fortunately, this is a public service.',
      'Sit down. The chair squeaks, but it has never contradicted me.' ] },
  { id: 'precise', likes: 'direct', dislikes: 'reassure',
    hint: 'Corrects your wording before answering your question.',
    openings: [
      'I can tell you what I observed. Please do not promote it to omniscience.',
      'Approximately is a perfectly good word. People should use it more honestly.',
      'Are you recording facts, impressions, or the dangerous soup made from both?',
      'Before we begin: remembering a detail and explaining it are different activities.',
      'Ask one question at a time. Compound questions produce decorative answers.',
      'I have brought my notes. No, you may not rearrange the tabs.' ] },
  { id: 'proud', likes: 'reassure', dislikes: 'joke',
    hint: 'Straightens up whenever the conversation touches on their reputation.',
    openings: [
      'I assume this is a request for assistance, not an accusation wearing a hat.',
      'My name has never appeared in a police report. I would prefer a favourable debut.',
      'I am happy to clarify matters. I am less happy to become a matter.',
      'You may ask your questions. Please remember that courtesy remains legal.',
      'I have a reputation. Unfortunately, it has arrived before my explanation.',
      'Let us conduct this professionally. My neighbours are conducting it through the curtains.' ] },
  { id: 'dry', likes: 'joke', dislikes: 'reassure',
    hint: 'Uses humour to keep the conversation at arm’s length.',
    openings: [
      'A detective. Excellent. The afternoon was threatening to become affordable.',
      'Do come in. The furniture has already retained counsel.',
      'I suppose telling you I am boring would sound like an elaborate cover story.',
      'Ask away. My diary is less exciting than the stationery suggests.',
      'Should I look natural? People asking me to look natural generally ruin it.',
      'I knew buying a suspiciously comfortable chair would eventually attract investigators.' ] }
];

const APPROACH_LINES = {
  reassure: [
    'We can take this one question at a time.',
    'You can correct a word without defending your entire character.',
    'I am interested in your account, not in making you nervous.',
    'If you are unsure, say so. Uncertainty is allowed in this notebook.',
    'There is no prize for answering before you have thought.',
    'I will listen first. We can untangle the difficult parts afterwards.',
    'Let us keep the questions manageable. One knot at a time.',
    'You do not have to make the story sound impressive. Just accurate.' ],
  direct: [
    'Let us separate what happened from what you assumed.',
    'One detail first. Then we can deal with the next.',
    'Tell me what you personally observed, without filling in the gaps.',
    'I will keep this brief and specific.',
    'Let us work through your account in order.',
    'A clear answer will help more than a polished one.',
    'Start with what you know. Leave the interpretation to me.',
    'I need precision, not a performance.' ],
  joke: [
    'The notebook is intimidating. The handwriting is worse.',
    'Relax. My pen only looks judgemental.',
    'I would offer coffee, but the agency classifies it as a coercive measure.',
    'This is the informal part. The formal part has considerably worse chairs.',
    'I promise not to say interesting while looking ominously at the ceiling.',
    'My job is mostly listening. The hat does the dramatic work.',
    'The notebook has heard worse. Mostly my expense claims.',
    'Let us disappoint the neighbours and have a perfectly ordinary conversation.' ]
};
const RESPONSES = {
  reassure: {
    positive: ['All right. One thing at a time sounds survivable.', 'Thank you. I was answering the accusation I imagined, not the question you asked.', 'That helps. I can stop preparing a defence for my choice of curtains.', 'Fine. Let me find the words before you find the conclusions.'],
    neutral: ['I understand. What would you like to ask?', 'All right. I am listening.', 'We can do that. Start with your question.'],
    negative: ['Please do not manage my feelings. Ask your question.', 'I am not a frightened child. I would prefer a precise question.', 'The soothing voice is making this feel considerably more serious.'] },
  direct: {
    positive: ['Good. A question with edges. I can work with that.', 'Thank you. Specific is much easier than suspiciously conversational.', 'Excellent. We may finish before my next obligation develops teeth.', 'Yes. Let us keep observation and interpretation in separate drawers.'],
    neutral: ['All right. Which detail first?', 'Ask. I will answer what I can.', 'That seems reasonable.'],
    negative: ['You could let me finish being a person before turning me into a bullet point.', 'That sounded less like a question than a verdict looking for furniture.', 'Please stop marching through the conversation. I am still in it.'] },
  joke: {
    positive: ['Ha. All right. You may interrogate the chair after me.', 'Fine. The notebook can stay. It seems adequately humiliated.', 'Good. Someone remembered we are allowed to breathe between questions.', 'I was expecting grim silence. This is an improvement, professionally speaking.'],
    neutral: ['Right. Your question?', 'I see. Shall we continue?', 'Noted. I am not sure the joke needs to go in the report.'],
    negative: ['Can we investigate first and workshop your material afterwards?', 'I did not realise my afternoon came with a supporting comedian.', 'I would rather you took my account seriously.'] }
};

const OPINIONS = {
  short: [
    'Sharing a room does not automatically create a friendship. Otherwise I would be married to my dentist.',
    'I can describe our contact. Their entire personality was not included in the booking.',
    'My opinion has never survived being shortened for someone else’s convenience.',
    'I try to keep personal taste out of official matters. It gets fingerprints on everything.',
    'We know each other. That is a fact, not a character reference.',
    'I am not their biographer. The advance would have been disappointing.',
    'There is a difference between recognising someone and understanding them.',
    'I would rather tell you what happened than provide a review with stars.',
    'My feelings are not a clock, a receipt, or an eyewitness.',
    'Please do not turn an awkward acquaintance into a criminal conspiracy.' ],
  open: [
    'I sometimes confuse being confident about someone with actually knowing them. I try to catch myself doing it.',
    'People can be irritating without being criminals. Otherwise this city would require a much larger prison.',
    'I would prefer you quoted my observations rather than my mood.',
    'I am trying not to let hindsight edit every impression I ever had.',
    'An investigation makes ordinary memories look theatrical. That does not make them evidence.',
    'I can dislike a habit without pretending it explains an entire person.',
    'The honest answer is that I do not know them as well as this conversation makes it sound.',
    'I have opinions. I would not trust all of them with a badge.' ],
  secret: [
    'I rehearsed sounding helpful. Unfortunately, it made me sound rehearsed.',
    'I was worried about being quoted badly. So I answered badly. A very efficient little disaster.',
    'I dislike not knowing an answer. That is my problem, not a reason for you to accept one.',
    'I wanted this conversation to be short. That is not the same thing as wanting it to be accurate.',
    'I nearly asked someone what I should say. Then I realised that was an appalling sentence.',
    'I have been imagining the neighbours discussing this. They already have terrible source standards.',
    'I am embarrassed by how much the notebook bothers me. It is just paper with ambition.',
    'I was trying to sound certain enough to be left alone. That is a feeling, not evidence.' ]
};

const CUES = {
  space: [
    'You tap your pen again and I lose the sentence. Let me finish thinking before you ask the next part.',
    'I keep trying to answer quickly and tangling the words. I need a little room to put them in order.',
    'Every interruption sends me back to the beginning. Please let me get to the end of a thought.',
    'I am looking for the right words. Another question will not make them arrive faster.',
    'I can explain, but not while I am also trying to keep up with you.',
    'I need to say this in my own words. Otherwise I will just agree with yours.' ],
  press: [
    'You keep circling the issue. Ask me exactly which part you want explained.',
    'A gentle general question is still a general question. Put the disputed detail to me plainly.',
    'Do not soften the question until it has no shape. Say what needs answering.',
    'I cannot explain a vague suspicion. Give me a precise point to address.',
    'We are drifting. Bring me back to the detail you are challenging.',
    'Ask the difficult question directly. I would rather deal with it than dance around it.' ],
  pause: [
    'We are repeating each other now. I need to step back from this question before I answer it again.',
    'I am defending the sentence instead of thinking about it. Can we set it aside for a moment?',
    'Nothing useful is happening while we keep pushing this same point. Let us change the subject briefly.',
    'I need to come back to this with a clearer head. Right now I am just repeating myself.',
    'I have stopped listening properly. A short break would help more than another version of the question.',
    'Can we leave this point alone for a moment? I want to reconsider it, not rehearse it.' ]
};
const FOLLOWUPS = {
  space: ['Take your time. Finish the thought in your own words.', 'I will stop interrupting. Tell me what you can stand by.', 'There is no rush. Work through that sentence.'],
  press: ['Address the disputed detail directly. What exactly are you claiming?', 'Let us be precise. Explain that part of your account.', 'Stay with this point. I need a specific answer.'],
  pause: ['We will leave that point there for a moment.', 'All right. Take a step back from the question.', 'We can pause this line of questioning.']
};
const RETRACTIONS = {
  host: [
    'I withdraw my claim that we were together at my apartment. That meeting did not happen as I described it. I cannot provide that alibi.',
    'My account of us being together at my apartment was false. I withdraw it. Do not use that meeting as their alibi.',
    'I need to correct the claim about my apartment: the meeting I described did not happen that way. I cannot support that alibi.' ],
  room: [
    'I withdraw my claim that we were inside that room together. We were not having the meeting I described. I cannot provide that alibi.',
    'The meeting inside that room was not as I described it. My claim that we were there together was false. I withdraw it.',
    'Do not use my account of that room as their alibi. We were not inside having the meeting I claimed.' ],
  departure: [
    'I withdraw my claim that they stayed with me throughout that period. My account of uninterrupted attendance was false.',
    'They did not stay with me throughout the period I claimed. I withdraw that uninterrupted-attendance claim.',
    'I cannot stand by my claim that they remained with me the whole time. That part of my account was false.' ],
  arrival: [
    'I withdraw my claim that they were already with me before the theft. I cannot support that arrival time.',
    'The arrival time I gave you cannot stand. My claim that they were with me before the theft was false.',
    'Do not rely on my claim that they had arrived before the theft. I withdraw that part of the account.' ],
  date: [
    'I withdraw my claim that the meeting I described happened on the day of the theft. I presented the wrong day as their alibi.',
    'I used the wrong day. The meeting I described was not on the day of the theft. I withdraw that alibi.',
    'That meeting cannot support their alibi for the day of the theft. I presented a different day as if it were that one.' ],
  duration: [
    'I withdraw my claim that the visit lasted throughout the theft. I extended the visit in my account.',
    'I made the visit sound longer than it was. It did not last throughout the theft. I withdraw that claim.',
    'The length of the visit in my account was false. I extended it to cover the theft. I withdraw that alibi.' ]
};
const STAND_BY = [
  'I have reconsidered that point. I stand by my original account. Compare it with the other statements rather than my manner.',
  'I am not revising that claim. If there is a conflict, identify it in the accounts themselves.',
  'That question does not change my account. My willingness to talk is not a verdict on it.',
  'I can discuss the point, but I am not withdrawing it. The original statement is still my statement.'
];
const PROGRESS = [
  'All right. I can think about what I actually said rather than how this conversation looks.',
  'That is clearer. I am separating my account from my reaction to your question.',
  'I understand the point now. Let me reconsider the wording before I stand behind it.',
  'Yes. We should deal with the actual claim, not with who sounds more confident.'
];

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
function pick(pool, key) { return pool[hash(key) % pool.length]; }
function readCase(caseKey) {
  const entry = gameState.caseData?.alibiCases?.[caseKey];
  if (!entry) throw new Error('Missing stored alibi case.');
  return entry;
}
function findData(caseKey, encounterId) {
  const encounter = gameState.crimeCityEncounterState?.[caseKey]?.find(item => item.id === encounterId);
  if (!encounter) throw new Error('Missing witness encounter.');
  const subject = readCase(caseKey).suspects.find(item => item.suspectId === encounter.suspectId);
  const witness = subject?.witnesses.find(item => item.npcId === encounter.npcId);
  if (!subject || !witness) throw new Error('Missing stored witness.');
  return { encounter, subject, witness };
}
export function getRapport() {
  const stats = getEffectiveStats({ profile: gameState.detectiveProfile || 'analyst', stats: gameState.detectiveStats || {} });
  return Number.isFinite(Number(stats.rapport)) ? Math.max(0, Math.floor(Number(stats.rapport))) : 0;
}
export function getCooperationState(caseKey, encounterId) {
  const stored = readCase(caseKey);
  stored.cooperation ??= {};
  let dirty = false;
  if (!stored.cooperation[encounterId]) {
    const { encounter } = findData(caseKey, encounterId);
    stored.cooperation[encounterId] = {
      level: getRapport() >= 6 ? 2 : 1,
      usedApproaches: [], positiveBonusUsed: false, protectionUsed: false,
      asked: encounter.dialogueCompleted ? ['statement'] : [],
      transcript: [], challenges: [], pendingChallenge: null, revisedStatement: null
    };
    dirty = true;
  }
  const state = stored.cooperation[encounterId];
  state.challenges ??= [];
  state.pendingChallenge ??= null;
  state.revisedStatement ??= null;
  state.transcript ??= [];
  state.asked ??= [];
  state.usedApproaches ??= [];
  state.level = Math.max(0, Math.min(3, Number.isFinite(state.level) ? state.level : 1));
  if (state.version !== 3) {
    // Existing statements, history and completed revisions remain untouched.
    const legacy = ['worried', 'busy', 'chatty'][hash(`personality:${caseKey}:${encounterId}`) % 3];
    state.profileId = state.transcript.length ? legacy : pick(PROFILES, `profile:${caseKey}:${encounterId}`).id;
    state.dialogueSeed = hash(`dialogue-v3:${caseKey}:${encounterId}`);
    state.confrontations = {};
    state.version = 3;
    dirty = true;
  }
  state.confrontations ??= {};
  if (dirty) requestAutosave();
  return state;
}
export function getWitnessPersonality(caseKey, encounterId) {
  const state = getCooperationState(caseKey, encounterId);
  const profile = PROFILES.find(item => item.id === state.profileId) || PROFILES[0];
  return { ...profile, opening: pick(profile.openings, `${state.dialogueSeed}:opening`),
    positive: pick(RESPONSES[profile.likes].positive, `${state.dialogueSeed}:positive`),
    neutral: pick(RESPONSES[profile.likes].neutral, `${state.dialogueSeed}:neutral`),
    negative: pick(RESPONSES[profile.dislikes].negative, `${state.dialogueSeed}:negative`) };
}
function addEntry(state, id, detective, witness, note = '') {
  const entry = { id, detective, witness, note };
  state.transcript.push(entry);
  requestAutosave();
  return entry;
}
export function getInterviewView(caseKey, encounterId) {
  const state = getCooperationState(caseKey, encounterId);
  const { encounter, subject, witness } = findData(caseKey, encounterId);
  const encounters = gameState.crimeCityEncounterState?.[caseKey] || [];
  const othersReady = subject.witnesses.filter(item => item.npcId !== witness.npcId).every(other => encounters.some(item =>
    item.suspectId === subject.suspectId && item.npcId === other.npcId && item.interviewed === true && item.dialogueCompleted === true));
  return { state, personality: getWitnessPersonality(caseKey, encounterId),
    completed: encounter.interviewed === true && encounter.dialogueCompleted === true,
    canChallenge: state.asked.includes('statement') && othersReady,
    originalStatement: witness.statement, revisedStatement: state.revisedStatement };
}
export function applyApproach(caseKey, encounterId, approachId) {
  if (!APPROACHES.some(item => item.id === approachId)) return null;
  const state = getCooperationState(caseKey, encounterId);
  if (state.pendingChallenge || state.usedApproaches.includes(approachId)) return null;
  const personality = getWitnessPersonality(caseKey, encounterId);
  const previous = state.level;
  let change = 0;
  let kind = 'neutral';
  let note = '';
  if (approachId === personality.likes) {
    change = 1; kind = 'positive';
    if (getRapport() >= 3 && !state.positiveBonusUsed) {
      change = 2; state.positiveBonusUsed = true; note = 'Rapport helped establish trust.';
    }
  } else if (approachId === personality.dislikes) {
    change = -1; kind = 'negative';
    if (getRapport() >= 4 && !state.protectionUsed) {
      change = 0; state.protectionUsed = true; note = 'Rapport softened an awkward moment.';
    }
  }
  state.level = Math.max(0, Math.min(3, previous + change));
  state.usedApproaches.push(approachId);
  return addEntry(state, `approach:${approachId}`,
    pick(APPROACH_LINES[approachId], `${state.dialogueSeed}:approach:${approachId}`),
    pick(RESPONSES[approachId][kind], `${state.dialogueSeed}:response:${approachId}`),
    [`Cooperation ${state.level - previous >= 0 ? '+' : ''}${state.level - previous}.`, note].filter(Boolean).join(' '));
}
export function askWitness(caseKey, encounterId, topic) {
  const state = getCooperationState(caseKey, encounterId);
  const { subject, witness } = findData(caseKey, encounterId);
  if (state.pendingChallenge) return null;
  const existing = state.transcript.find(entry => entry.id === `question:${topic}`);
  if (existing) return existing;
  let question, answer, note = '';
  switch (topic) {
    case 'statement':
      question = `Where was ${subject.suspectName || 'the suspect'} during the theft?`;
      answer = witness.statement; break;
    case 'person':
      question = 'What do you think of them personally?';
      answer = pick(OPINIONS.short, `${state.dialogueSeed}:opinion`);
      note = 'Personal opinion — not proof of guilt.'; break;
    case 'personal':
      if (state.level < 2 || !state.asked.includes('person')) return null;
      question = 'And what is your personal impression?';
      answer = pick(OPINIONS.open, `${state.dialogueSeed}:personal`);
      note = 'Personal opinion — not proof of guilt.'; break;
    case 'withheld':
      if (state.level < 3 || !state.asked.includes('statement')) return null;
      question = 'Was there something you were reluctant to tell me?';
      answer = state.revisedStatement
        ? 'Keep both versions of my account. Correcting it does not erase what I originally said.'
        : pick(OPINIONS.secret, `${state.dialogueSeed}:withheld`);
      note = 'Personal disclosure — not independent evidence.'; break;
    case 'summary':
      if (state.level < 2 || !state.asked.includes('statement') || !witness.timelineCard?.label) return null;
      question = 'What is the key point of your original account?';
      answer = witness.timelineCard.label;
      note = state.revisedStatement ? 'Original account — subsequently withdrawn.' : 'Summary of a claim, not independent verification.';
      break;
    default: return null;
  }
  if (!answer) return null;
  if (!state.asked.includes(topic)) state.asked.push(topic);
  return addEntry(state, `question:${topic}`, question, answer, note);
}
function getThread(state, topic) {
  if (!state.confrontations[topic]) {
    const modes = ['space', 'press', 'pause'];
    const first = hash(`${state.dialogueSeed}:${topic}:first`) % 3;
    const second = (first + 1 + hash(`${state.dialogueSeed}:${topic}:second`) % 2) % 3;
    state.confrontations[topic] = { stage: 0, failures: 0, attempts: 0,
      modes: [modes[first], modes[second]], resolved: false };
  }
  return state.confrontations[topic];
}
function cue(state, topic, thread) {
  const mode = thread.modes[Math.min(thread.stage, 1)];
  return pick(CUES[mode], `${state.dialogueSeed}:${topic}:cue:${thread.stage}:${thread.failures}`);
}
export function challengeWitness(caseKey, encounterId, topic) {
  const view = getInterviewView(caseKey, encounterId);
  const state = view.state;
  if (!view.canChallenge || state.pendingChallenge || state.revisedStatement) return null;
  const challenge = CHALLENGES.find(item => item.id === topic);
  if (!challenge) return null;
  const thread = getThread(state, topic);
  if (thread.resolved) return state.transcript.find(entry => entry.id === `resolved:${topic}`) || null;
  if (!state.challenges.includes(topic)) state.challenges.push(topic);
  thread.attempts++;
  state.pendingChallenge = topic;
  // Every topic gets the same conversational process. Opening a topic never identifies a liar.
  return addEntry(state, `challenge:${topic}:${thread.attempts}`,
    `I would like to review your account in relation to ${challenge.label.toLowerCase()}.`,
    cue(state, topic, thread), 'Listen to the response before choosing how to continue.');
}
export function followUpChallenge(caseKey, encounterId, mode) {
  if (!['space', 'press', 'pause'].includes(mode)) return null;
  const state = getCooperationState(caseKey, encounterId);
  const topic = state.pendingChallenge;
  if (!topic) return null;
  const { subject, witness } = findData(caseKey, encounterId);
  const thread = getThread(state, topic);
  const question = pick(FOLLOWUPS[mode], `${state.dialogueSeed}:${topic}:question:${thread.stage}:${thread.failures}`);
  const expected = thread.modes[Math.min(thread.stage, 1)];
  if (mode !== expected) {
    thread.failures++;
    const previous = state.level;
    if (mode === 'press' && expected !== 'press') state.level = Math.max(0, state.level - 1);
    // A pause always allows leaving the topic. Progress and cue survive a later visit.
    if (mode === 'pause') state.pendingChallenge = null;
    return addEntry(state, `followup:${topic}:${state.transcript.length}`, question,
      (mode === 'pause' ? 'All right. We can return to it. ' : 'That is not helping me answer. ') + cue(state, topic, thread),
      previous !== state.level ? 'Cooperation -1. No revised account.' : 'No revised account. The evidence remains available.');
  }
  thread.stage++;
  if (thread.stage < 2) {
    if (mode === 'pause') state.pendingChallenge = null;
    return addEntry(state, `step:${topic}:1`, question,
      pick(PROGRESS, `${state.dialogueSeed}:${topic}:progress`) + ' ' + cue(state, topic, thread),
      mode === 'pause' ? 'Topic paused. Return to this challenge when ready.' : 'The discussion continues. No account has been withdrawn.');
  }
  state.pendingChallenge = null;
  thread.resolved = true;
  const scenarioMatch = String(subject.scenarioId || '').match(/_false_([0-5])$/);
  const relevant = witness.isLiar === true && scenarioMatch && CHALLENGES[Number(scenarioMatch[1])]?.id === topic;
  if (relevant) {
    state.revisedStatement = pick(RETRACTIONS[topic], `${state.dialogueSeed}:${topic}:revision`);
    return addEntry(state, 'revision', question,
      (mode === 'pause' ? 'Before we move on, I need to correct something. ' : '') + state.revisedStatement,
      'Revised account recorded. The original remains in the history.');
  }
  return addEntry(state, `resolved:${topic}`, question,
    pick(STAND_BY, `${state.dialogueSeed}:${topic}:standby`),
    'Account unchanged. This is not an independent verification or a verdict.');
}