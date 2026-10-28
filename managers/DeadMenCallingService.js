import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';

export const DEAD_MEN_QUEST = 'pi_dead_men_calling';
const KEY = 'piDeadMenCalling';
const CONTACT = {
  id: 'dead_men_margaret', number: '619', name: 'Margaret Vale',
  listed: true, status: 'available', dialogueId: null
};
const INTRO = 'dead_men_client_mail';
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

export function getDeadMenProgress() {
  const value = gameState[KEY];
  const state = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    ...state,
    version: 1,
    read: Array.isArray(state.read) ? state.read.filter(id => typeof id === 'string') : [],
    interviewCompleted: state.interviewCompleted === true
  };
}
function save(patch) {
  gameState[KEY] = { ...getDeadMenProgress(), ...patch, version: 1 };
  requestAutosave();
}
function completeObjectives(ids) {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest || quest.status !== 'active') return;
  const objectives = quest.objectives.map(item => ids.includes(item.id) ? { ...item, completed: true } : item);
  if (JSON.stringify(objectives) === JSON.stringify(quest.objectives)) return;
  const state = gameState.piQuests;
  gameState.piQuests = {
    ...state,
    quests: { ...state.quests, [DEAD_MEN_QUEST]: { ...quest, objectives } }
  };
  requestAutosave();
}
export function getDeadMenMail() {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest || !['active', 'completed'].includes(quest.status)) return [];
  const progress = getDeadMenProgress();
  const result = [
    {
      id: INTRO, from: 'Margaret Vale', subject: 'Dead Men Calling — the messages',
      date: 'Case correspondence',
      body: 'Detective,\n\nThank you for taking my case. My name is Margaret Vale. My husband Edward died a year ago. Since Monday, I have received three voicemail messages in what sounds like his voice.\n\nI have supplied transcripts of all three recordings as separate attachments in this mailbox. The original audio files are preserved. The descriptions in square brackets record sounds heard on the recordings.\n\nThe caller wants a blue folder and insists that I tell no one. I have decided that this instruction does not apply to someone I am paying.\n\nPlease call me on 619. I would rather explain the rest to a person with a pulse.\n\nMargaret Vale\n\nAttachments: Monday, 20:14; Tuesday, 20:14; Wednesday, 20:14.'
    },
    ...recordings.map(item => ({ ...item, from: 'Margaret Vale — attachment', date: 'Original voicemail transcript' }))
  ];
  if (progress.interviewCompleted) result.unshift({
    id: 'dead_men_archive_pending', from: 'Your case notes',
    subject: 'Next lead — Edward’s older recordings', date: 'After the interview',
    body: 'Margaret Vale says she has retained old voicemails and office recordings of Edward. She has agreed to supply copies.\n\nNext step: obtain the older recordings and compare them with the three recent messages.\n\nNo sender has been identified. A familiar voice is not proof of who placed a call.\n\nThe archive comparison belongs to the next stage of this investigation.'
  });
  return result;
}
export function syncDeadMenEvidence() {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest) return;
  const progress = getDeadMenProgress();
  if (progress.read.includes(INTRO)) {
    addPIEvidence(DEAD_MEN_QUEST, {
      id: 'dead_men_client_contact', label: 'Margaret Vale — 619',
      text: 'The client supplied three recent voicemail recordings. Call Margaret Vale on 619 to obtain her account.',
      metaText: 'Source: client email', color: 'blue'
    });
    completeObjectives(['read_client_email']);
  }
  for (const recording of recordings) {
    if (!progress.read.includes(recording.id)) continue;
    addPIEvidence(DEAD_MEN_QUEST, {
      id: recording.id, label: recording.subject, text: recording.body,
      metaText: 'Source: client-supplied recording transcript', color: 'yellow'
    });
  }
  if (recordings.every(item => progress.read.includes(item.id))) completeObjectives(['review_recordings']);
  if (progress.interviewCompleted) {
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
}
function markRead(id) {
  if (!getDeadMenMail().some(item => item.id === id)) return;
  const progress = getDeadMenProgress();
  if (!progress.read.includes(id)) save({ read: [...progress.read, id] });
  syncDeadMenEvidence();
}
export function installDeadMenMail(ui) {
  const documents = ui.documents;
  if (documents.deadMenInstalled) return;
  documents.deadMenInstalled = true;
  const getMail = documents.getMail.bind(documents);
  documents.getMail = () => {
    const own = getDeadMenMail();
    const ids = new Set(own.map(item => item.id));
    return [...own, ...getMail().filter(item => !ids.has(item.id))];
  };
  const render = documents.render.bind(documents);
  documents.render = () => {
    render();
    if (ui.app === 'mail') markRead(ui.selectedId);
    syncDeadMenEvidence();
  };
}
function contactAvailable() {
  return getPIQuest(DEAD_MEN_QUEST)?.status === 'active' && getDeadMenProgress().read.includes(INTRO);
}
export function installDeadMenPhone(phone) {
  if (phone.deadMenInstalled) return;
  phone.deadMenInstalled = true;
  const start = phone.startCall.bind(phone);
  phone.startCall = () => {
    if (phone.number !== CONTACT.number || !contactAvailable()) return start();
    phone.cancelActivity();
    phone.state = 'ringing';
    phone.status = 'Ringing...';
    phone.render();
    phone.startRing();
    phone.later(3000, () => {
      if (!phone.destroyed && phone.isOpen && phone.state === 'ringing' && contactAvailable()) phone.connect(CONTACT);
    });
  };
  const connect = phone.connect.bind(phone);
  phone.connect = contact => {
    phone.deadMenInterview = false;
    if (contact.id !== CONTACT.id || !contactAvailable()) return connect(contact);
    phone.investigation?.resetCall?.();
    phone.cancelActivity();
    phone.deadMenInterview = true;
    phone.state = 'connected';
    phone.contactName = CONTACT.name;
    phone.lines = clone(interview);
    phone.lineIndex = 0;
    phone.callStart = phone.scene.time.now;
    phone.clearLog();
    phone.showDialogueLine();
  };
  const next = phone.nextLine.bind(phone);
  phone.nextLine = () => {
    if (!phone.deadMenInterview) return next();
    if (phone.state !== 'connected' || phone.directoryOpen) return;
    if (phone.typingItem) { phone.finishTyping(phone.typingItem); return; }
    if (phone.lineIndex < phone.lines.length - 1) {
      phone.lineIndex += 1;
      phone.showDialogueLine();
      return;
    }
    save({ interviewCompleted: true });
    syncDeadMenEvidence();
    phone.deadMenInterview = false;
    phone.finishCall('Interview saved. New lead added to your case file.');
  };
  const hang = phone.hangUp.bind(phone);
  phone.hangUp = () => { phone.deadMenInterview = false; hang(); };
}
