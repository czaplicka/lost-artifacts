import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { addPIEvidence } from './PIInvestigationManager.js';

export const DEAD_MEN_QUEST = 'pi_dead_men_calling';
const KEY = 'piDeadMenCalling';
const INTRO = 'dead_men_client_mail';
const REVIEW = 'dead_men_archive_review';
const ACCESS_REVIEW = 'dead_men_access_review';
const clone = value => JSON.parse(JSON.stringify(value));
const MARGARET = { id:'dead_men_margaret', number:'619', name:'Margaret Vale', listed:true, status:'available', dialogueId:null };
const LEO = { id:'dead_men_leo', number:'620', name:'Leo Mercer', listed:true, status:'available', dialogueId:null };

const recordings = [
  {
    "id": "dead_men_recording_1",
    "subject": "Attachment 1 — Monday, 20:14",
    "body": "VOICEMAIL TRANSCRIPT — 1\nSource: recording supplied by Margaret Vale\nReceived: Monday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Margaret. It is me. I need you to find the blue folder. Do not tell anyone.”\n\n[brief silence]\n[end of message]\n\nClient note: Edward used to keep blue folders in his study. I have not searched them yet."
  },
  {
    "id": "dead_men_recording_2",
    "subject": "Attachment 2 — Tuesday, 20:14",
    "body": "VOICEMAIL TRANSCRIPT — 2\nSource: recording supplied by Margaret Vale\nReceived: Tuesday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Margaret. Listen carefully. The blue folder. You know where to look.”\n\n[abrupt click]\n[end of message]\n\nClient note: This sounds like his voice. That does not mean I know who made the call."
  },
  {
    "id": "dead_men_recording_3",
    "subject": "Attachment 3 — Wednesday, 20:14",
    "body": "VOICEMAIL TRANSCRIPT — 3\nSource: recording supplied by Margaret Vale\nReceived: Wednesday, 20:14\nVoice: identified by Margaret as her late husband, Edward\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Have you found it? Do not tell anyone. I will call again.”\n\n[brief silence]\n[end of message]\n\nClient note: No number was displayed for any of the three calls. I saved the original files."
  }
];

const archive = [
  {
    "id": "dead_men_archive_a",
    "subject": "Archive A — the blue folder",
    "body": "ARCHIVE A — OLD VOICEMAIL\nSupplied by Margaret Vale after your interview.\nClient dates this message to before Edward’s death. Original file retained by the client.\n\n“Margaret. It is me. I need you to find the blue folder. The plumber’s invoice is inside. Listen carefully. The blue folder. You know where to look. Top drawer, beneath the takeaway menus.”\n\n[message ends]\n\nMargaret’s note: I found the invoice. The plumber had filed himself under Emergency Noodles.\n\nThese are Edward’s words in the older recording. They do not identify the person making the recent calls."
  },
  {
    "id": "dead_men_archive_b",
    "subject": "Archive B — office recorder test",
    "body": "ARCHIVE B — OFFICE RECORDER TEST\nSupplied by Margaret Vale after your interview.\nClient dates this file to before Edward’s death. Label on the retained file: Office recorder test.\n\n[low hiss]\n[tram bell: two short rings]\n[three metallic taps]\n\n“Recorder test. Window open. Tram outside. Three taps on the microphone stand. This should help identify the room track. Not a musical career.”\n\n[test ends]\n\nMargaret’s note: Edward recorded notes in his office. It faced the tram stop.\n\nThe sound sequence matches the descriptions in all three recent transcripts. A transcription match is a reason to compare the original audio, not proof of a present-day location."
  },
  {
    "id": "dead_men_archive_c",
    "subject": "Archive C — a surprise for Margaret",
    "body": "ARCHIVE C — OLD OFFICE MESSAGE\nSupplied by Margaret Vale after your interview.\nClient dates this message to before Edward’s death. Original file retained by the client.\n\n“Have you found it? Do not tell anyone. I will call again. If Margaret asks, the anniversary tickets are in the blue folder.”\n\n[message ends]\n\nMargaret’s note: He was arranging a surprise with someone from the office. I heard this later. Apparently secrecy was easier than choosing a restaurant.\n\nThe first three sentences also appear in Wednesday’s recent message. This archive does not establish who had access to a copy."
  }
];

const interview = [
  {
    "speaker": "Margaret Vale",
    "text": "Margaret Vale speaking. If this is my husband, please use email. I need a paper trail."
  },
  {
    "speaker": "You",
    "text": "Your investigator. I have your messages. May I ask about Edward?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "He died a year ago. I identified him. I have the death certificate. I am not asking you to hold a seance."
  },
  {
    "speaker": "You",
    "text": "When did the calls start? Did you speak to the caller?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "Monday. All three went to voicemail. The number was withheld. I have never had a live conversation with whoever is doing this."
  },
  {
    "speaker": "You",
    "text": "Did the caller say anything that only Edward could know?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "Not that I can prove. Blue folders were practically his filing system. He owned enough to qualify as weather."
  },
  {
    "speaker": "You",
    "text": "Do you still have older recordings of his voice?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "Yes. Old voicemails and some recordings from his office. I will send copies. Please compare them before deciding what these new messages mean."
  },
  {
    "speaker": "You",
    "text": "Keep the originals, and do not hand over any documents to the caller."
  },
  {
    "speaker": "Margaret Vale",
    "text": "Agreed. He never called when he was alive. Apparently death has improved his communication skills."
  },
  {
    "speaker": "You",
    "text": "I will record your statement and request the older recordings. We do not yet know who is calling."
  }
];

const accessInterview = [
  {
    "speaker": "Margaret Vale",
    "text": "Margaret Vale. Has my husband developed a customer service department yet?"
  },
  {
    "speaker": "You",
    "text": "The transcripts contain matching older material. I need to establish who could obtain copies. This does not yet identify the caller."
  },
  {
    "speaker": "Margaret Vale",
    "text": "Leo Mercer at Mercer Audio transferred Edward’s recordings. After Edward died, I asked him to preserve the voicemail files and office recordings together."
  },
  {
    "speaker": "You",
    "text": "Did anyone else receive them?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "Colin Ward, Edward’s former business partner, asked for records to reconcile the company accounts. I authorised one copy. I will forward my original authorisation."
  },
  {
    "speaker": "You",
    "text": "Did that authorisation include the voice recordings?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "It covered the archive. I thought that meant invoices and dictation. I should have asked. Edward’s folders were more organised than my grief."
  },
  {
    "speaker": "You",
    "text": "May Mercer Audio discuss the transfer and supply the relevant records to me?"
  },
  {
    "speaker": "Margaret Vale",
    "text": "Yes. I have sent Leo written permission through the same email thread. His number is 620. Ask for the transfer job and delivery acknowledgement, not his opinion of Colin."
  },
  {
    "speaker": "You",
    "text": "I will treat access as a lead, not proof. Please keep the blue folder and all original messages safe."
  },
  {
    "speaker": "Margaret Vale",
    "text": "I will. The folder is currently receiving better security than our wedding silver."
  }
];

const technicianInterview = [
  {
    "speaker": "Leo Mercer",
    "text": "Mercer Audio. We preserve memories. We do not improve the singing."
  },
  {
    "speaker": "You",
    "text": "I am investigating calls to Margaret Vale. She authorised you to discuss Edward’s archive with me."
  },
  {
    "speaker": "Leo Mercer",
    "text": "I have her written permission. Job MV-14 combined the voicemail files she supplied with Edward’s office recorder files. I made a preservation copy for Margaret."
  },
  {
    "speaker": "You",
    "text": "Was a copy supplied to anyone else?"
  },
  {
    "speaker": "Leo Mercer",
    "text": "A second copy went to Colin Ward under Margaret’s written authorisation. The delivery acknowledgement names Colin and lists the same archive manifest."
  },
  {
    "speaker": "You",
    "text": "Does the manifest include the three older recordings Margaret sent me?"
  },
  {
    "speaker": "Leo Mercer",
    "text": "Yes: the blue-folder voicemail, the office recorder test and the anniversary message. I will forward the manifest, authorisation and delivery acknowledgement."
  },
  {
    "speaker": "You",
    "text": "Does this prove Colin placed the recent calls?"
  },
  {
    "speaker": "Leo Mercer",
    "text": "No. It shows a copy was delivered to him. It cannot tell you who used it later or whether more copies exist."
  },
  {
    "speaker": "You",
    "text": "Have you compared the original recent audio against the archive?"
  },
  {
    "speaker": "Leo Mercer",
    "text": "Not yet. Matching transcript phrases are useful leads, but I have not performed an audio comparison. I will not invoice you for imaginary science."
  },
  {
    "speaker": "You",
    "text": "Please preserve the transfer records and source files. I will review the documents before contacting Colin."
  }
];

const questions = [
  {
    "id": "voice_fragments",
    "prompt": "Which older material contains the spoken phrases reused in the recent messages?",
    "options": [
      {
        "label": "Archive B only",
        "correct": false
      },
      {
        "label": "Archives A and C",
        "correct": true
      },
      {
        "label": "No older source",
        "correct": false
      }
    ],
    "feedback": "Compare the actual sentences in Archives A and C with the recent messages, not just the voice description."
  },
  {
    "id": "background_track",
    "prompt": "Which archive contains the hiss, two tram-bell rings and three metallic taps described in all three recent messages?",
    "options": [
      {
        "label": "Archive C",
        "correct": false
      },
      {
        "label": "Archive A",
        "correct": false
      },
      {
        "label": "Archive B",
        "correct": true
      }
    ],
    "feedback": "Look for the whole sound sequence, in order. A tram bell alone would not distinguish one recording from another."
  },
  {
    "id": "supported_conclusion",
    "prompt": "What do these comparisons support?\n\nA. Edward must still be alive.\nB. Reused recordings are a plausible explanation; compare the original audio next.\nC. Margaret has been proved to be the caller.",
    "options": [
      {
        "label": "A: Edward is alive",
        "correct": false
      },
      {
        "label": "B: Possible editing",
        "correct": true
      },
      {
        "label": "C: Margaret did it",
        "correct": false
      }
    ],
    "feedback": "The transcripts show matching material. They do not establish who placed the calls, or prove that Edward is alive."
  }
];

const accessQuestions = [
  {
    "id": "delivered_copy",
    "prompt": "Who is named as the recipient of the second archive copy in delivery acknowledgement MV-14-D2?",
    "options": [
      {
        "label": "Colin Ward",
        "correct": true
      },
      {
        "label": "Leo’s landlord",
        "correct": false
      },
      {
        "label": "An unknown caller",
        "correct": false
      }
    ],
    "feedback": "Read the delivery acknowledgement. The authorisation permits release; the acknowledgement records the recipient."
  },
  {
    "id": "included_material",
    "prompt": "What does the MV-14 manifest list?",
    "options": [
      {
        "label": "Only company invoices",
        "correct": false
      },
      {
        "label": "All three old sources",
        "correct": true
      },
      {
        "label": "The recent calls",
        "correct": false
      }
    ],
    "feedback": "The manifest lists the blue-folder voicemail, recorder test and anniversary message. It does not list the recent calls."
  },
  {
    "id": "access_not_guilt",
    "prompt": "What can you establish from the authorisation, manifest and acknowledgement?\n\nA. Colin received source material, but this does not prove he placed the calls.\nB. Colin is proved to be the caller.\nC. Leo has proved Edward is alive.",
    "options": [
      {
        "label": "A: Access established",
        "correct": true
      },
      {
        "label": "B: Caller proved",
        "correct": false
      },
      {
        "label": "C: Edward is alive",
        "correct": false
      }
    ],
    "feedback": "Receiving source material establishes access. It is not proof of who later made the calls."
  }
];

const accessDocuments = [
  {
    "id": "dead_men_release",
    "subject": "Margaret’s authorisation — MV-14",
    "body": "COPY OF ORIGINAL AUTHORISATION\nSource: Margaret Vale’s retained correspondence\nReference: MV-14-A\n\nTo Mercer Audio:\nI authorise release of a copy of Edward Vale’s combined voicemail and office recording archive to Colin Ward for review of the former company records.\n\nSigned: Margaret Vale\n\nThis authorisation predates the three recent calls. It permits release; by itself it does not prove delivery.\n\nForwarded with Margaret’s permission. Personal contact details unrelated to this enquiry have been omitted."
  },
  {
    "id": "dead_men_manifest",
    "subject": "Mercer Audio — MV-14 archive manifest",
    "body": "ARCHIVE MANIFEST — MV-14\nSource: Mercer Audio transfer records\nClient: Margaret Vale\n\nCombined sources: voicemail files supplied by Margaret; Edward Vale’s office recorder files.\n\nIncluded items:\nA — Blue-folder voicemail\nB — Office recorder test: hiss, two tram-bell rings, three microphone-stand taps\nC — Anniversary message\n\nTwo archive copies prepared: D1 for Margaret Vale; D2 for the authorised second recipient. Both copies reference this manifest.\n\nNo recent Monday, Tuesday or Wednesday call is included in this older transfer job.\n\nThis document lists archive contents. It does not establish who subsequently used them."
  },
  {
    "id": "dead_men_delivery",
    "subject": "Mercer Audio — delivery acknowledgement D2",
    "body": "DELIVERY ACKNOWLEDGEMENT — MV-14-D2\nSource: Mercer Audio retained delivery record\n\nArchive supplied: MV-14, items A/B/C as listed in the attached manifest.\nAuthorisation: MV-14-A, Margaret Vale.\nRecipient: Colin Ward.\nRecipient acknowledgement: “Received the combined archive. Thank you. — Colin Ward”\n\nThe recorded delivery predates the three recent calls.\n\nProvided with Margaret’s permission.\n\nThis records delivery of a copy, not the identity of anyone who later made a call. Mercer Audio has not performed an original-audio comparison in this investigation."
  }
];


function normalAnswers(value, defs) {
  const items = Array.isArray(value) ? value : [];
  return defs.filter(q => items.includes(q.id)).map(q => q.id);
}
export function getDeadMenProgress() {
  const raw = gameState[KEY];
  const old = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const archiveAnswers = normalAnswers(old.archiveAnswers, questions);
  const accessAnswers = normalAnswers(old.accessAnswers, accessQuestions);
  return {
    ...old, version: 3,
    read: Array.isArray(old.read) ? [...new Set(old.read.filter(id => typeof id === 'string'))] : [],
    interviewCompleted: old.interviewCompleted === true,
    archiveAnswers,
    archiveCompared: questions.every(q => archiveAnswers.includes(q.id)),
    accessInterviewCompleted: old.accessInterviewCompleted === true,
    technicianCompleted: old.technicianCompleted === true,
    accessAnswers,
    accessReviewed: accessQuestions.every(q => accessAnswers.includes(q.id))
  };
}
function save(patch) {
  gameState[KEY] = { ...getDeadMenProgress(), ...patch, version: 3 };
  requestAutosave();
}
function questActive() { return getPIQuest(DEAD_MEN_QUEST)?.status === 'active'; }
function completeObjectives(ids) {
  const quest = getPIQuest(DEAD_MEN_QUEST);
  if (!quest || quest.status !== 'active') return;
  const objectives = quest.objectives.map(o => ids.includes(o.id) ? { ...o, completed:true } : o);
  if (JSON.stringify(objectives) === JSON.stringify(quest.objectives)) return;
  const state = gameState.piQuests;
  gameState.piQuests = { ...state, quests:{ ...state.quests, [DEAD_MEN_QUEST]:{ ...quest, objectives } } };
  requestAutosave();
}
function canCompare() {
  const s = getDeadMenProgress();
  return questActive() && s.interviewCompleted && [...recordings,...archive].every(m => s.read.includes(m.id));
}
function canReviewAccess() {
  const s = getDeadMenProgress();
  return questActive() && s.archiveCompared && s.accessInterviewCompleted && s.technicianCompleted && accessDocuments.every(m => s.read.includes(m.id));
}
function reviewSpec(id) {
  return id === REVIEW ? { defs:questions, key:'archiveAnswers', ready:canCompare(), done:getDeadMenProgress().archiveCompared }
    : id === ACCESS_REVIEW ? { defs:accessQuestions, key:'accessAnswers', ready:canReviewAccess(), done:getDeadMenProgress().accessReviewed } : null;
}
function currentQuestion(spec) {
  return spec.defs.find(q => !getDeadMenProgress()[spec.key].includes(q.id)) || null;
}
function reviewBody(id) {
  const s = getDeadMenProgress(), spec = reviewSpec(id);
  if (id === REVIEW && spec.done) return 'COMPARISON RECORDED\n\nThe recent messages contain phrases found in Archives A and C. Their background descriptions also match Archive B.\n\nReusing older material is plausible. The transcripts do not prove an exact audio match or identify the caller.\n\nNEXT: Call Margaret again on 619. Ask who could obtain the archive.';
  if (id === ACCESS_REVIEW && spec.done) return 'ACCESS REVIEW RECORDED\n\nMargaret authorised release. The manifest lists all three older sources. The delivery acknowledgement records a copy supplied to Colin Ward.\n\nThis establishes a documented access lead, not the caller’s identity. Other copies may exist.\n\nNEXT: Establish Colin’s explanation and what the blue folder contains. These enquiries belong to the next stage.\n\nThe case remains open.';
  if (!spec.ready) {
    const required = id === REVIEW ? [...recordings,...archive] : accessDocuments;
    const missing = required.filter(m => !s.read.includes(m.id)).map(m => m.subject);
    return (id === REVIEW ? 'ARCHIVE COMPARISON' : 'WHO HAD ACCESS?') + '\n\nReview the source documents before answering.\n\n' + (missing.length ? 'Still to read:\n' + missing.map(t => '• '+t).join('\n') : 'Complete the required interviews first.');
  }
  const q = currentQuestion(spec);
  return `${id === REVIEW ? 'ARCHIVE COMPARISON' : 'ACCESS REVIEW'} — ${getDeadMenProgress()[spec.key].length+1}/${spec.defs.length}\n\n${q.prompt}\n\nChoose with NEXT OPTION, then CHECK ANSWER. You can return to the source messages at any time.`;
}
function mail(id, from, subject, body, date='Case correspondence') {
  return { id, from, subject, body, date };
}
export function getDeadMenMail() {
  const q = getPIQuest(DEAD_MEN_QUEST);
  if (!q || !['active','completed'].includes(q.status)) return [];
  const s = getDeadMenProgress();
  const items = [mail(INTRO,'Margaret Vale','Dead Men Calling — the messages',
    'Detective,\n\nThank you for taking my case. My name is Margaret Vale. My husband Edward died a year ago. Since Monday, I have received three voicemail messages in what sounds like his voice.\n\nThe three transcripts are separate attachments in this mailbox. I have preserved the original audio. Square brackets describe sounds heard in each recording.\n\nThe caller wants a blue folder and insists I tell no one. I have decided this does not apply to someone I am paying.\n\nPlease call me on 619. I would rather explain the rest to someone with a pulse.\n\nMargaret Vale'),
    ...recordings.map(m => mail(m.id,'Margaret Vale — attachment',m.subject,m.body,'Original voicemail transcript'))];
  if (s.interviewCompleted) items.unshift(
    mail(REVIEW,'Your investigation notebook','Compare the recordings',reviewBody(REVIEW),'Evidence review'),
    mail('dead_men_archive_delivery','Margaret Vale','Edward’s older recordings — three attachments',
      'Detective,\n\nAs promised, I have supplied copies of three older recordings: Archive A, Archive B and Archive C. They predate Edward’s death according to my records. I have kept the originals.\n\nPlease compare them with the recent messages. I would prefer an explanation requiring neither a medium nor another telephone contract.\n\nMargaret Vale'),
    ...archive.map(m => mail(m.id,'Margaret Vale — archive attachment',m.subject,m.body,'Client-supplied older recording'))
  );
  if (s.archiveCompared) items.unshift(mail('dead_men_access_enquiry','Your case notes','Next enquiry — who had the archive?',
    'The transcript comparison is recorded.\n\nCall Margaret Vale again on 619. Ask who handled Edward’s archive and whether any copies were released. Do not accuse anyone on the strength of access alone.'));
  if (s.accessInterviewCompleted) items.unshift(
    mail('dead_men_mercer_permission','Margaret Vale','Mercer Audio — permission and contact',
      'Detective,\n\nI have authorised Leo Mercer at Mercer Audio to discuss job MV-14 and supply the relevant transfer records. Call him on 620.\n\nI have also forwarded my original authorisation for a copy to Colin Ward. Please distinguish what I permitted from what was actually delivered.\n\nMargaret Vale'),
    mail(accessDocuments[0].id,'Margaret Vale — forwarded original',accessDocuments[0].subject,accessDocuments[0].body)
  );
  if (s.technicianCompleted) items.unshift(
    mail(ACCESS_REVIEW,'Your investigation notebook','Review the archive access',reviewBody(ACCESS_REVIEW),'Document comparison'),
    ...accessDocuments.slice(1).map(m => mail(m.id,'Mercer Audio — authorised records',m.subject,m.body,'After your call to Leo'))
  );
  if (s.accessReviewed) items.unshift(mail('dead_men_colin_lead','Your case notes','Next lead — Colin Ward',
    'Colin Ward received a copy containing all three older source recordings. This is supported by the authorisation, archive manifest and delivery acknowledgement.\n\nIt does not establish that he made the recent calls.\n\nNEXT ENQUIRIES:\n• Obtain Colin’s explanation.\n• Establish what the blue folder contains.\n• Seek original-audio comparison, not just matching transcriptions.\n\nNo arrest, final report or payment is available in this stage.'));
  return items;
}
function addNote(id,label,text,meta='Source: investigation records',color='yellow') {
  addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color});
}
function transcript(ls) { return ls.map(l => `${l.speaker}: ${l.text}`).join('\n\n'); }
export function syncDeadMenEvidence() {
  if (!getPIQuest(DEAD_MEN_QUEST)) return;
  const s = getDeadMenProgress();
  if (s.read.includes(INTRO)) {
    addNote('dead_men_client_contact','Margaret Vale — 619','Call Margaret Vale on 619 to obtain her account.','Source: client email','blue');
    completeObjectives(['read_client_email']);
  }
  const visible = [...recordings,...(s.interviewCompleted ? archive : []),...(s.accessInterviewCompleted ? accessDocuments.slice(0,1) : []),...(s.technicianCompleted ? accessDocuments.slice(1) : [])];
  for (const m of visible) if (s.read.includes(m.id)) addNote(m.id,m.subject,m.body,'Source: client or authorised archive records');
  if (recordings.every(m => s.read.includes(m.id))) completeObjectives(['review_recordings']);
  if (s.interviewCompleted) {
    addNote('dead_men_client_interview','Margaret’s account',transcript(interview),'Source: completed client interview','blue');
    addNote('dead_men_archive_lead','Older recordings of Edward','Obtain and compare Margaret’s copies of the older recordings. The caller is not identified.','Open lead — archive comparison');
    completeObjectives(['contact_client']);
  }
  if (s.archiveCompared) {
    addNote('dead_men_archive_comparison','Comparison: matching older material','The recent phrases also occur in Archives A and C. The described background sequence appears in Archive B. Reused recordings are plausible. An original-audio comparison is still needed. This does not identify the caller.','Source: player’s transcript comparison');
    addNote('dead_men_access_lead','Who could obtain the recordings?','Call Margaret on 619 to ask who handled or received copies. Access is a lead, not proof.','Open lead — source material and access','blue');
    completeObjectives(['compare_archive']);
  }
  if (s.accessInterviewCompleted) {
    addNote('dead_men_access_interview','Margaret: the archive copies',transcript(accessInterview),'Source: completed follow-up interview','blue');
    addNote('dead_men_mercer_contact','Mercer Audio — 620','Margaret has authorised discussion of job MV-14. Call Leo Mercer on 620 for the transfer records.','Source: client authorisation','blue');
  }
  if (s.technicianCompleted) addNote('dead_men_technician_interview','Leo Mercer: transfer records',transcript(technicianInterview),'Source: completed technician interview','blue');
  if (s.accessReviewed) addNote('dead_men_access_result','Colin Ward received source material','The authorisation permits release to Colin. The MV-14 manifest includes the three older sources. MV-14-D2 records delivery of that archive to Colin Ward. This establishes access, not the caller’s identity. Seek his explanation and investigate the blue folder.','Source: player’s document comparison');
}
function markRead(id) {
  if (!getDeadMenMail().some(m => m.id === id)) return;
  const s = getDeadMenProgress();
  if (!s.read.includes(id)) save({read:[...s.read,id]});
  syncDeadMenEvidence();
}
function checkAnswer(reviewId, questionId, index) {
  const spec = reviewSpec(reviewId), q = spec && currentQuestion(spec);
  if (!spec?.ready || spec.done || !q || q.id !== questionId) return {ok:false,message:'Review the available evidence first.'};
  if (!q.options[index]?.correct) return {ok:false,message:q.feedback};
  save({[spec.key]:[...getDeadMenProgress()[spec.key],q.id]});
  syncDeadMenEvidence();
  return {ok:true,message:currentQuestion(spec) ? 'Evidence matched. Continue.' : 'Review recorded. New lead added to your board.'};
}
export function installDeadMenMail(ui) {
  const docs = ui.documents;
  if (docs.deadMenInstalled) return;
  docs.deadMenInstalled = true;
  const originalMail = docs.getMail.bind(docs);
  docs.getMail = () => {
    const own = getDeadMenMail(), ids = new Set(own.map(m => m.id));
    return [...own,...originalMail().filter(m => !ids.has(m.id) && m.id !== 'dead_men_archive_pending')];
  };
  const originalPaged = docs.renderPagedText.bind(docs);
  let choiceKey='', choice=0, feedback='';
  docs.renderPagedText = (content,x,y,w,h) => {
    const id = ui.selectedId, spec = ui.app === 'mail' ? reviewSpec(id) : null;
    if (!spec?.ready || spec.done) return originalPaged(content,x,y,w,h);
    const q = currentQuestion(spec);
    if (!q) return originalPaged(content,x,y,w,h);
    const key = id+':'+q.id;
    if (choiceKey !== key) {choiceKey=key;choice=0;feedback='';ui.bodyPage=0;}
    originalPaged(content+'\n\nSelected answer: '+q.options[choice].label+(feedback ? '\n\n'+feedback : ''),x,y,w,Math.max(24,h-42));
    const yy=y+h-32;
    ui.drawing.button(x,yy,'NEXT OPTION',() => {
      if (ui.app !== 'mail' || ui.selectedId !== id) return;
      choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();
    });
    ui.drawing.button(x+Math.max(150,Math.floor(w/2)),yy,'CHECK ANSWER',() => {
      if (ui.app !== 'mail' || ui.selectedId !== id) return;
      const result=checkAnswer(id,q.id,choice);
      feedback=result.message;ui.notice=result.message;ui.bodyPage=0;ui.render();
    });
  };
  const originalRender = docs.render.bind(docs);
  docs.render = () => {
    originalRender();
    if (ui.app === 'mail') markRead(ui.selectedId);
    syncDeadMenEvidence();
  };
}
function routeFor(number) {
  if (!questActive()) return null;
  const s = getDeadMenProgress();
  if (number === MARGARET.number && s.read.includes(INTRO)) {
    return s.interviewCompleted && s.archiveCompared
      ? {contact:MARGARET,lines:accessInterview,flag:'accessInterviewCompleted',message:'Interview saved. Call Mercer Audio on 620 and check your mailbox.'}
      : {contact:MARGARET,lines:interview,flag:'interviewCompleted',message:'Interview saved. Archive copies are available in your mailbox.'};
  }
  if (number === LEO.number && s.archiveCompared && s.accessInterviewCompleted) {
    return {contact:LEO,lines:technicianInterview,flag:'technicianCompleted',message:'Interview saved. Authorised transfer records are in your mailbox.'};
  }
  return null;
}
export function installDeadMenPhone(phone) {
  if (phone.deadMenInstalled) return;
  phone.deadMenInstalled = true;
  let activeRoute = null;
  const start = phone.startCall.bind(phone);
  phone.startCall = () => {
    const route = routeFor(phone.number);
    if (!route) return start();
    phone.cancelActivity();phone.state='ringing';phone.status='Ringing...';phone.render();phone.startRing();
    const number = phone.number;
    phone.later(3000,() => {
      if (!phone.destroyed && phone.isOpen && phone.state === 'ringing' && phone.number === number && routeFor(number)) phone.connect(route.contact);
    });
  };
  const connect = phone.connect.bind(phone);
  phone.connect = contact => {
    activeRoute=null;phone.deadMenInterview=false;
    const route=routeFor(contact.number);
    if (!route || route.contact.id !== contact.id) return connect(contact);
    phone.investigation?.resetCall?.();phone.cancelActivity();activeRoute=route;
    phone.deadMenInterview=true;phone.state='connected';phone.contactName=contact.name;
    phone.lines=clone(route.lines);phone.lineIndex=0;phone.callStart=phone.scene.time.now;
    phone.clearLog();phone.showDialogueLine();
  };
  const next = phone.nextLine.bind(phone);
  phone.nextLine = () => {
    if (!activeRoute) return next();
    if (phone.state !== 'connected' || phone.directoryOpen) return;
    if (phone.typingItem) {phone.finishTyping(phone.typingItem);return;}
    if (phone.lineIndex < phone.lines.length-1) {phone.lineIndex++;phone.showDialogueLine();return;}
    const route=activeRoute;activeRoute=null;phone.deadMenInterview=false;
    if (questActive()) {save({[route.flag]:true});syncDeadMenEvidence();}
    phone.finishCall(route.message);
  };
  const hang = phone.hangUp.bind(phone);
  phone.hangUp = () => {activeRoute=null;phone.deadMenInterview=false;hang();};
  const close = phone.close?.bind(phone);
  if (close) phone.close = () => {activeRoute=null;phone.deadMenInterview=false;close();};
  const finish = phone.finishCall.bind(phone);
  phone.finishCall = message => {activeRoute=null;phone.deadMenInterview=false;finish(message);};
}