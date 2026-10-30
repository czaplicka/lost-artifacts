import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';

export const DEAD_MEN_QUEST = 'pi_dead_men_calling';
const KEY = 'piDeadMenCalling';
const INTRO = 'dead_men_client_mail';
const REVIEW = 'dead_men_archive_review';
const CONTACT = {
  id: 'dead_men_margaret', number: '619', name: 'Margaret Vale',
  listed: true, status: 'available', dialogueId: null
};
const clone = value => JSON.parse(JSON.stringify(value));
const recordings = [
  {
    id: 'dead_men_recording_1', subject: 'Attachment 1 — Monday, 20:14',
    body: 'VOICEMAIL TRANSCRIPT — 1\nSource: recording supplied by Margaret Vale\nReceived: Monday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Margaret. It is me. I need you to find the blue folder. Do not tell anyone.”\n\n[brief silence]\n[end of message]\n\nClient note: Edward used to keep blue folders in his study. I have not searched them yet.'
  },
  {
    id: 'dead_men_recording_2', subject: 'Attachment 2 — Tuesday, 20:14',
    body: 'VOICEMAIL TRANSCRIPT — 2\nSource: recording supplied by Margaret Vale\nReceived: Tuesday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Margaret. Listen carefully. The blue folder. You know where to look.”\n\n[abrupt click]\n[end of message]\n\nClient note: This sounds like his voice. That does not mean I know who made the call.'
  },
  {
    id: 'dead_men_recording_3', subject: 'Attachment 3 — Wednesday, 20:14',
    body: 'VOICEMAIL TRANSCRIPT — 3\nSource: recording supplied by Margaret Vale\nReceived: Wednesday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Have you found it? Do not tell anyone. I will call again.”\n\n[brief silence]\n[end of message]\n\nClient note: No number was displayed for any of the three calls. I saved the original files.'
  }
];
const interview = [
  { speaker: 'Margaret Vale', text: 'Margaret Vale speaking. If this is my husband, please use email. I need a paper trail.' },
  { speaker: 'You', text: 'Your investigator. I have your messages. May I ask about Edward?' },
  { speaker: 'Margaret Vale', text: 'He died a year ago. I identified him. I have the death certificate. I am not asking you to hold a seance.' },
  { speaker: 'You', text: 'When did the calls start? Did you speak to the caller?' },
  { speaker: 'Margaret Vale', text: 'Monday. All three went to voicemail. The number was withheld. I have never had a live conversation with whoever is doing this.' },
  { speaker: 'You', text: 'Did the caller say anything that only Edward could know?' },
  { speaker: 'Margaret Vale', text: 'Not that I can prove. Blue folders were practically his filing system. He owned enough to qualify as weather.' },
  { speaker: 'You', text: 'Do you still have older recordings of his voice?' },
  { speaker: 'Margaret Vale', text: 'Yes. Old voicemails and some recordings from his office. I will send copies. Please compare them before deciding what these new messages mean.' },
  { speaker: 'You', text: 'Keep the originals, and do not hand over any documents to the caller.' },
  { speaker: 'Margaret Vale', text: 'Agreed. He never called when he was alive. Apparently death has improved his communication skills.' },
  { speaker: 'You', text: 'I will record your statement and request the older recordings. We do not yet know who is calling.' }
];
const archive = [
  {
    id: 'dead_men_archive_a', subject: 'Archive A — the blue folder',
    body: 'ARCHIVE A — OLD VOICEMAIL\nSupplied by Margaret Vale after your interview.\nClient dates this message to before Edward’s death. Original file retained by the client.\n\n“Margaret. It is me. I need you to find the blue folder. The plumber’s invoice is inside. Listen carefully. The blue folder. You know where to look. Top drawer, beneath the takeaway menus.”\n\n[message ends]\n\nMargaret’s note: I found the invoice. The plumber had filed himself under Emergency Noodles.\n\nThese are Edward’s words in the older recording. They do not identify the person making the recent calls.'
  },
  {
    id: 'dead_men_archive_b', subject: 'Archive B — office recorder test',
    body: 'ARCHIVE B — OFFICE RECORDER TEST\nSupplied by Margaret Vale after your interview.\nClient dates this file to before Edward’s death. Label on the retained file: Office recorder test.\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Recorder test. Window open. Tram outside. Three taps on the microphone stand. This should help identify the room track. Not a musical career.”\n\n[test ends]\n\nMargaret’s note: Edward recorded notes in his office. It faced the tram stop.\n\nThe sound sequence matches the descriptions in all three recent transcripts. A transcription match is a reason to compare the original audio, not proof of a present-day location.'
  },
  {
    id: 'dead_men_archive_c', subject: 'Archive C — a surprise for Margaret',
    body: 'ARCHIVE C — OLD OFFICE MESSAGE\nSupplied by Margaret Vale after your interview.\nClient dates this message to before Edward’s death. Original file retained by the client.\n\n“Have you found it? Do not tell anyone. I will call again. If Margaret asks, the anniversary tickets are in the blue folder.”\n\n[message ends]\n\nMargaret’s note: He was arranging a surprise with someone from the office. I heard this later. Apparently secrecy was easier than choosing a restaurant.\n\nThe first three sentences also appear in Wednesday’s recent message. This archive does not establish who had access to a copy.'
  }
];
const questions = [
  {
    id: 'voice_fragments',
    prompt: 'Which older material contains the spoken phrases reused in the recent messages?',
    options: [
      { label: 'Archive B only', correct: false },
      { label: 'Archives A and C', correct: true },
      { label: 'No older source', correct: false }
    ],
    feedback: 'Compare the actual sentences in Archives A and C with the recent messages, not just the voice description.'
  },
  {
    id: 'background_track',
    prompt: 'Which archive contains the hiss, two tram-bell rings and three metallic taps described in all three recent messages?',
    options: [
      { label: 'Archive C', correct: false },
      { label: 'Archive A', correct: false },
      { label: 'Archive B', correct: true }
    ],
    feedback: 'Look for the whole sound sequence, in order. A tram bell alone would not distinguish one recording from another.'
  },
  {
    id: 'supported_conclusion',
    prompt: 'What do these comparisons support?\n\nA. Edward must still be alive.\nB. Reused recordings are a plausible explanation; compare the original audio next.\nC. Margaret has been proved to be the caller.',
    options: [
      { label: 'A: Edward is alive', correct: false },
      { label: 'B: Possible editing', correct: true },
      { label: 'C: Margaret did it', correct: false }
    ],
    feedback: 'The transcripts show matching material. They do not establish who placed the calls, or prove that Edward is alive.'
  }
];

export function getDeadMenProgress() {
  const value = gameState[KEY];
  const state = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const solved = Array.isArray(state.archiveAnswers) ? state.archiveAnswers : [];
  const archiveAnswers = questions.filter(q => solved.includes(q.id)).map(q => q.id);
  return {
    ...state, version: 2,
    read: Array.isArray(state.read) ? [...new Set(state.read.filter(id => typeof id === 'string'))] : [],
    interviewCompleted: state.interviewCompleted === true,
    archiveAnswers,
    archiveCompared: questions.every(q => archiveAnswers.includes(q.id))
  };
}
function save(patch) {
  gameState[KEY] = { ...getDeadMenProgress(), ...patch, version: 2 };
  requestAutosave();
}
function questActive() { return getPIQuest(DEAD_MEN_QUEST)?.status === 'active'; }
function completeObjectives(ids) {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest || quest.status !== 'active') return;
  const objectives = quest.objectives.map(item => ids.includes(item.id) ? { ...item, completed: true } : item);
  if (JSON.stringify(objectives) === JSON.stringify(quest.objectives)) return;
  const state = gameState.piQuests;
  gameState.piQuests = { ...state, quests: { ...state.quests, [DEAD_MEN_QUEST]: { ...quest, objectives } } };
  requestAutosave();
}
function canCompare() {
  const state = getDeadMenProgress();
  return questActive() && state.interviewCompleted && [...recordings, ...archive].every(item => state.read.includes(item.id));
}
function currentQuestion() {
  const state = getDeadMenProgress();
  return questions.find(q => !state.archiveAnswers.includes(q.id)) || null;
}
function reviewBody() {
  const state = getDeadMenProgress();
  if (state.archiveCompared) return 'COMPARISON RECORDED\n\nThe recent messages contain phrases found in Archives A and C. Their background descriptions also match the recorder test in Archive B.\n\nReusing older material is a plausible explanation. These text comparisons do not prove a sample-perfect audio match, the caller’s identity, or Edward’s survival.\n\nNext: compare the original audio and establish who could obtain these files.\n\nNo suspect has been identified. The case remains open.';
  if (!canCompare()) {
    const missing = [...recordings, ...archive].filter(item => !state.read.includes(item.id)).map(item => item.subject);
    return 'ARCHIVE COMPARISON\n\nOpen all three recent transcripts and all three archive attachments before making a comparison.\n\nStill to review:\n' + missing.map(title => '• ' + title).join('\n');
  }
  const q = currentQuestion();
  return `ARCHIVE COMPARISON — ${state.archiveAnswers.length + 1}/${questions.length}\n\n${q.prompt}\n\nUse NEXT OPTION to choose an answer, then CHECK ANSWER. You can return to the other messages at any time.`;
}
export function getDeadMenMail() {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest || !['active', 'completed'].includes(quest.status)) return [];
  const state = getDeadMenProgress();
  const result = [
    {
      id: INTRO, from: 'Margaret Vale', subject: 'Dead Men Calling — the messages', date: 'Case correspondence',
      body: 'Detective,\n\nThank you for taking my case. My name is Margaret Vale. My husband Edward died a year ago. Since Monday, I have received three voicemail messages in what sounds like his voice.\n\nI have supplied transcripts of all three recordings as separate attachments in this mailbox. The original audio files are preserved. The descriptions in square brackets record sounds heard on the recordings.\n\nThe caller wants a blue folder and insists that I tell no one. I have decided that this instruction does not apply to someone I am paying.\n\nPlease call me on 619. I would rather explain the rest to a person with a pulse.\n\nMargaret Vale\n\nAttachments: Monday, 20:14; Tuesday, 20:14; Wednesday, 20:14.'
    },
    ...recordings.map(item => ({ ...item, from: 'Margaret Vale — attachment', date: 'Original voicemail transcript' }))
  ];
  if (state.interviewCompleted) result.unshift(
    {
      id: REVIEW, from: 'Your investigation notebook', subject: 'Compare the recordings',
      date: state.archiveCompared ? 'Comparison recorded' : 'Evidence review', body: reviewBody()
    },
    {
      id: 'dead_men_archive_delivery', from: 'Margaret Vale', subject: 'Edward’s older recordings — three attachments',
      date: 'After your telephone interview',
      body: 'Detective,\n\nAs promised, here are copies of three older recordings. I have kept the originals. The attachments are labelled Archive A, Archive B and Archive C.\n\nA concerns the blue folder, B is a recorder test from Edward’s office, and C concerns an anniversary surprise. All predate his death, according to my records.\n\nPlease compare them with the recent messages. I would prefer an explanation requiring neither a medium nor another telephone contract.\n\nMargaret Vale\n\nThese copies preserve the material I have. I cannot tell you who else might have copies.'
    },
    ...archive.map(item => ({ ...item, from: 'Margaret Vale — archive attachment', date: 'Client-supplied older recording' }))
  );
  return result;
}
export function syncDeadMenEvidence() {
  if (!getPIQuest(DEAD_MEN_QUEST)) return;
  const state = getDeadMenProgress();
  if (state.read.includes(INTRO)) {
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_client_contact', label: 'Margaret Vale — 619',
      text: 'The client supplied three recent voicemail recordings. Call Margaret Vale on 619 to obtain her account.',
      metaText: 'Source: client email', color: 'blue'
    });
    completeObjectives(['read_client_email']);
  }
  for (const item of [...recordings, ...(state.interviewCompleted ? archive : [])]) {
    if (!state.read.includes(item.id)) continue;
    addPIEvidence(DEAD_MEN_QUEST, {
      id: item.id, label: item.subject, text: item.body,
      metaText: 'Source: client-supplied recording transcript', color: 'yellow'
    });
  }
  if (recordings.every(item => state.read.includes(item.id))) completeObjectives(['review_recordings']);
  if (state.interviewCompleted) {
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_client_interview', label: 'Margaret’s account',
      text: interview.map(line => `${line.speaker}: ${line.text}`).join('\n\n'),
      metaText: 'Source: completed telephone interview — client testimony, not independent verification', color: 'blue'
    });
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_archive_lead', label: 'Older recordings of Edward',
      text: 'Margaret has retained older voicemail and office recordings. Obtain copies and compare them with the recent calls. The caller is not yet identified.',
      metaText: 'Open lead — archive comparison', color: 'yellow'
    });
    completeObjectives(['contact_client']);
  }
  if (state.archiveCompared) {
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_archive_comparison', label: 'Comparison: matching older material',
      text: 'The phrases in the recent messages also occur in Archives A and C. The described background sequence appears in Archive B. Reused recordings are a plausible explanation. Compare the original audio before asserting an exact match. These findings do not identify the caller.',
      metaText: 'Source: player’s completed transcript comparison', color: 'yellow'
    });
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_access_lead', label: 'Who could obtain the recordings?',
      text: 'Establish who could obtain Edward’s voicemail and office recordings. Having access is a lead, not proof of making the recent calls.',
      metaText: 'Open lead — source material and access', color: 'blue'
    });
    completeObjectives(['compare_archive']);
  }
}
function markRead(id) {
  if (!getDeadMenMail().some(item => item.id === id)) return;
  const state = getDeadMenProgress();
  if (!state.read.includes(id)) save({ read: [...state.read, id] });
  syncDeadMenEvidence();
}
function checkAnswer(questionId, index) {
  const q = currentQuestion();
  if (!canCompare() || !q || q.id !== questionId) return { ok: false, message: 'Review the available evidence first.' };
  if (!q.options[index]?.correct) return { ok: false, message: q.feedback };
  const state = getDeadMenProgress();
  save({ archiveAnswers: [...state.archiveAnswers, q.id] });
  syncDeadMenEvidence();
  return { ok: true, message: getDeadMenProgress().archiveCompared ? 'Comparison recorded. New lead added to the board.' : 'Evidence matched. Continue to the next question.' };
}
export function installDeadMenMail(ui) {
  const documents = ui.documents;
  if (documents.deadMenInstalled) return;
  documents.deadMenInstalled = true;
  const getMail = documents.getMail.bind(documents);
  documents.getMail = () => {
    const own = getDeadMenMail(), ids = new Set(own.map(item => item.id));
    return [...own, ...getMail().filter(item => !ids.has(item.id) && item.id !== 'dead_men_archive_pending')];
  };
  let choiceQuestion = null, choice = 0, feedback = '';
  const paged = documents.renderPagedText.bind(documents);
  documents.renderPagedText = (content, x, y, w, h) => {
    if (ui.app !== 'mail' || ui.selectedId !== REVIEW || !canCompare() || getDeadMenProgress().archiveCompared) {
      return paged(content, x, y, w, h);
    }
    const q = currentQuestion();
    if (!q) return paged(content, x, y, w, h);
    if (choiceQuestion !== q.id) { choiceQuestion = q.id; choice = 0; feedback = ''; ui.bodyPage = 0; }
    const selected = q.options[choice];
    const text = content + '\n\nSelected answer: ' + selected.label + (feedback ? '\n\n' + feedback : '');
    const reserve = 42;
    paged(text, x, y, w, Math.max(24, h - reserve));
    const buttonY = y + h - 32;
    ui.drawing.button(x, buttonY, 'NEXT OPTION', () => {
      choice = (choice + 1) % q.options.length; feedback = ''; ui.bodyPage = 0; ui.render();
    });
    ui.drawing.button(x + Math.max(150, Math.floor(w / 2)), buttonY, 'CHECK ANSWER', () => {
      if (ui.app !== 'mail' || ui.selectedId !== REVIEW) return;
      const result = checkAnswer(q.id, choice);
      feedback = result.message; ui.notice = result.message; ui.bodyPage = 0; ui.render();
    });
  };
  const render = documents.render.bind(documents);
  documents.render = () => {
    render();
    if (ui.app === 'mail') markRead(ui.selectedId);
    syncDeadMenEvidence();
  };
}
function contactAvailable() {
  return questActive() && getDeadMenProgress().read.includes(INTRO);
}
export function installDeadMenPhone(phone) {
  if (phone.deadMenInstalled) return;
  phone.deadMenInstalled = true;
  const start = phone.startCall.bind(phone);
  phone.startCall = () => {
    if (phone.number !== CONTACT.number || !contactAvailable()) return start();
    phone.cancelActivity(); phone.state = 'ringing'; phone.status = 'Ringing...';
    phone.render(); phone.startRing();
    phone.later(3000, () => {
      if (!phone.destroyed && phone.isOpen && phone.state === 'ringing' && contactAvailable()) phone.connect(CONTACT);
    });
  };
  const connect = phone.connect.bind(phone);
  phone.connect = contact => {
    phone.deadMenInterview = false;
    if (contact.id !== CONTACT.id || !contactAvailable()) return connect(contact);
    phone.investigation?.resetCall?.(); phone.cancelActivity();
    phone.deadMenInterview = true; phone.state = 'connected'; phone.contactName = CONTACT.name;
    phone.lines = clone(interview); phone.lineIndex = 0; phone.callStart = phone.scene.time.now;
    phone.clearLog(); phone.showDialogueLine();
  };
  const next = phone.nextLine.bind(phone);
  phone.nextLine = () => {
    if (!phone.deadMenInterview) return next();
    if (phone.state !== 'connected' || phone.directoryOpen) return;
    if (phone.typingItem) { phone.finishTyping(phone.typingItem); return; }
    if (phone.lineIndex < phone.lines.length - 1) { phone.lineIndex += 1; phone.showDialogueLine(); return; }
    save({ interviewCompleted: true }); syncDeadMenEvidence();
    phone.deadMenInterview = false;
    phone.finishCall('Interview saved. Archive copies are now available in your mailbox.');
  };
  const hang = phone.hangUp.bind(phone);
  phone.hangUp = () => { phone.deadMenInterview = false; hang(); };
}