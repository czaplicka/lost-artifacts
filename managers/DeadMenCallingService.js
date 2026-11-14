import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { deadMenTopicTranscript } from './DeadMenPhoneTopics.js';
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
const MARGARET = { id:'dead_men_margaret', number:'619', name:__dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"), listed:true, status:'available', dialogueId:null };
const LEO = { id:'dead_men_leo', number:'620', name:__dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"), listed:true, status:'available', dialogueId:null };

const recordings = [
  {
    "id": "dead_men_recording_1",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_378d0e716160696bd957"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_f3841ebe82724898f598")
  },
  {
    "id": "dead_men_recording_2",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_faffd99dff6f2aa9792c"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_09cf2a51c2f20828dc7a")
  },
  {
    "id": "dead_men_recording_3",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_82d113d186870bf4abcc"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_333372797e4fb13c223e")
  }
];

const archive = [
  {
    "id": "dead_men_archive_a",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_877af31737797ddf1511"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_7652627d275a041f07f1")
  },
  {
    "id": "dead_men_archive_b",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_336c8423e3fbd65ae463"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_1cebce38a60ea8fcfc39")
  },
  {
    "id": "dead_men_archive_c",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_58368029f28c66255f6d"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_9d2d7208e38c12a750cc")
  }
];

const interview = [
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_1f70c20d96aae10d9a29")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_09c65016fcb119842761")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_523ec1e89fbc957ac163")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_9be763692766c5663b93")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_89a6b0df9d748e38601d")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_7e606e0a50f72f6e035d")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_b5385cc5e4a563f2a4c9")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_ae45493383087d09dd2f")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_3895fcd70d23379a0f5a")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_bba42ee8ce73808017ce")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_81fc9bc2312bf3666fa4")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_84c4b73caafca370102a")
  }
];

const accessInterview = [
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_82d9211aa40d595a9ed6")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_1ea647cd83cb13729017")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_784f0dd71a79ce024c74")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_9c8e4d7e8987449364b1")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_d7a185e04e227cf5ec57")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_e6caedb8678a1bba6de1")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_3d4f20b7315362d3796b")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_ab3d88be06a168335348")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_43c992251ea180bf3068")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_a08ced53d10aff38aea4")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_6e1085d4b3e36da4f9d1")
  }
];

const technicianInterview = [
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_f046ec204f5ba1fc88e5")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_8c0dd8ea43670dc50cac")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_0e5586807082aa3faada")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_044f3ca91f30c37ac9d3")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_033b72fffd57a16a8fae")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_af3d070b9bee33d7a3f4")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_6a44541157a3fec5d5e9")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_0426cdd877252fa68368")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_ed4a20a0f387a317d219")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_1586eb28d49f38d2bcc5")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_9b91e7842e8557c83048"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_8ac58807884736655701")
  },
  {
    "speaker": __dialogueText("managers/DeadMenCallingService.js", "t_08b041935798fbf6fd6f"),
    "text": __dialogueText("managers/DeadMenCallingService.js", "t_1b7be489a485a95feb3b")
  }
];

const questions = [
  {
    "id": "voice_fragments",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_c1eb1ff899b0bb7d0f0c"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_e0d5d906c326e63abc16"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_ff63de19ddad8c87f266"),
        "correct": true
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_aaed66183fb7bc230c5d"),
        "correct": false
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_aea3c99a1b5078341534")
  },
  {
    "id": "background_track",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_49864ec883efaf98fcef"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_a6e13b5b3a4d7efaf739"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_0119f78a405fde9a4a68"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_8536ac2c518e5f80801d"),
        "correct": true
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_b7505b5176dbd4e800a9")
  },
  {
    "id": "supported_conclusion",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_7a4a1023d6f05d16a297"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_f4403ad115a97562c9f0"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_066787f585bb9722e32f"),
        "correct": true
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_ce5cdd000092eb858b83"),
        "correct": false
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_a82032fb10ac71cf2a1a")
  }
];

const accessQuestions = [
  {
    "id": "delivered_copy",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_4b5b02567919654f913c"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_b7e5ae2ffc6f69bea5b4"),
        "correct": true
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_004e197ecc11b6c8ed89"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_38d8da14121db66c7929"),
        "correct": false
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_b2bf7039ee25c6f8a28e")
  },
  {
    "id": "included_material",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_16bb12caf01b67679e0d"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_e59156e705a6eef4d24e"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_d0db2fc32a95f1195732"),
        "correct": true
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_e2fcc4149c86ce95a850"),
        "correct": false
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_aece91d8e2d6ba4be6ca")
  },
  {
    "id": "access_not_guilt",
    "prompt": __dialogueText("managers/DeadMenCallingService.js", "t_7b2f6a2ee601d7b79e9d"),
    "options": [
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_f12743ee03dde890ebc5"),
        "correct": true
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_9b82e8a981400e9696e0"),
        "correct": false
      },
      {
        "label": __dialogueText("managers/DeadMenCallingService.js", "t_3fa5c52d040cf703577a"),
        "correct": false
      }
    ],
    "feedback": __dialogueText("managers/DeadMenCallingService.js", "t_1250a15743c3b8674d02")
  }
];

const accessDocuments = [
  {
    "id": "dead_men_release",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_ca4bc0574bc86df6843e"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_4e0a69d1723f19bb4185")
  },
  {
    "id": "dead_men_manifest",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_17498d7e23984376e27a"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_4b73ff0325497df6a619")
  },
  {
    "id": "dead_men_delivery",
    "subject": __dialogueText("managers/DeadMenCallingService.js", "t_f4ff06ff836925e15ff1"),
    "body": __dialogueText("managers/DeadMenCallingService.js", "t_e264abf905ad71105c85")
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
  if (id === REVIEW && spec.done) return __dialogueText("managers/DeadMenCallingService.js", "t_f0cca8320d14c7b3cb83");
  if (id === ACCESS_REVIEW && spec.done) return __dialogueText("managers/DeadMenCallingService.js", "t_187c035c86b6c13915df");
  if (!spec.ready) {
    const required = id === REVIEW ? [...recordings,...archive] : accessDocuments;
    const missing = required.filter(m => !s.read.includes(m.id)).map(m => m.subject);
    return (id === REVIEW ? __dialogueText("managers/DeadMenCallingService.js", "t_54f78d58b826325855ed") : __dialogueText("managers/DeadMenCallingService.js", "t_56f6f2a9e725eefac53e")) + __dialogueText("managers/DeadMenCallingService.js", "t_69472dafdb0293137649") + (missing.length ? __dialogueText("managers/DeadMenCallingService.js", "t_942d44ef07b5289f8307") + missing.map(t => '• '+t).join('\n') : __dialogueText("managers/DeadMenCallingService.js", "t_bd2bf59724c22f65f775"));
  }
  const q = currentQuestion(spec);
  return `${id === REVIEW ? __dialogueText("managers/DeadMenCallingService.js", "t_54f78d58b826325855ed") : __dialogueText("managers/DeadMenCallingService.js", "t_ba9cf3941e70d6aa5419")}${__dialogueText("managers/DeadMenCallingService.js", "t_3b2e8119b6fcc97df985")}${getDeadMenProgress()[spec.key].length+1}${__dialogueText("managers/DeadMenCallingService.js", "t_8a5edab282632443219e")}${spec.defs.length}${__dialogueText("managers/DeadMenCallingService.js", "t_75a11da44c802486bc6f")}${q.prompt}${__dialogueText("managers/DeadMenCallingService.js", "t_7562cfe099bb6b221732")}`;
}
function mail(id, from, subject, body, date=__dialogueText("managers/DeadMenCallingService.js", "t_9a264749f9d43669aac5")) {
  return { id, from, subject, body, date };
}
export function getDeadMenMail() {
  const q = getPIQuest(DEAD_MEN_QUEST);
  if (!q || !['active','completed'].includes(q.status)) return [];
  const s = getDeadMenProgress();
  const items = [mail(INTRO,__dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingService.js", "t_f0cf35ee36611ae3e3dd"),
    __dialogueText("managers/DeadMenCallingService.js", "t_8bc28920fccd736bd906")),
    ...recordings.map(m => mail(m.id,__dialogueText("managers/DeadMenCallingService.js", "t_fd978730cce4ef724d37"),m.subject,m.body,__dialogueText("managers/DeadMenCallingService.js", "t_db7098a8699f848fa6d1")))];
  if (s.interviewCompleted) items.unshift(
    
    mail('dead_men_archive_delivery',__dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingService.js", "t_791fb9d90b4c3591d052"),
      __dialogueText("managers/DeadMenCallingService.js", "t_ad1844161947aab64bcd")),
    ...archive.map(m => mail(m.id,__dialogueText("managers/DeadMenCallingService.js", "t_4b3a37912d1c35d53d34"),m.subject,m.body,__dialogueText("managers/DeadMenCallingService.js", "t_d51200be04a8981aa40a")))
  );
  if (s.archiveCompared) items.unshift(mail('dead_men_access_enquiry',__dialogueText("managers/DeadMenCallingService.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingService.js", "t_ea0a5f2a48a1c60e4257"),
    __dialogueText("managers/DeadMenCallingService.js", "t_1b622de7071aa239a848")));
  if (s.accessInterviewCompleted) items.unshift(
    mail('dead_men_mercer_permission',__dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingService.js", "t_b8a3b7a2d28806ae3320"),
      __dialogueText("managers/DeadMenCallingService.js", "t_14fcb57e5e11864e9987")),
    mail(accessDocuments[0].id,__dialogueText("managers/DeadMenCallingService.js", "t_53cd15ea941a4c79ff66"),accessDocuments[0].subject,accessDocuments[0].body)
  );
  if (s.technicianCompleted) items.unshift(
    mail(ACCESS_REVIEW,__dialogueText("managers/DeadMenCallingService.js", "t_246d256c733195b4c2b3"),__dialogueText("managers/DeadMenCallingService.js", "t_1d7ff0c7396f8923a318"),reviewBody(ACCESS_REVIEW),__dialogueText("managers/DeadMenCallingService.js", "t_293734b661d5b28e8fb6")),
    ...accessDocuments.slice(1).map(m => mail(m.id,__dialogueText("managers/DeadMenCallingService.js", "t_c2328bf3eecc60ba3500"),m.subject,m.body,__dialogueText("managers/DeadMenCallingService.js", "t_2f653830c79ee956ddd8")))
  );
  if (s.accessReviewed) items.unshift(mail('dead_men_colin_lead',__dialogueText("managers/DeadMenCallingService.js", "t_c8bd0e9ce96dc602d59e"),__dialogueText("managers/DeadMenCallingService.js", "t_306de94cd45a61c6312f"),
    __dialogueText("managers/DeadMenCallingService.js", "t_243f0ef0467f1f3fbdc3")));
  return items;
}
function addNote(id,label,text,meta=__dialogueText("managers/DeadMenCallingService.js", "t_18a91583036632f97140"),color='yellow') {
  addPIEvidence(DEAD_MEN_QUEST,{id,label,text,metaText:meta,color});
}
function transcript(ls) { return ls.map(l => `${l.speaker}: ${l.text}`).join('\n\n'); }
export function syncDeadMenEvidence() {
  if (!getPIQuest(DEAD_MEN_QUEST)) return;
  const s = getDeadMenProgress();
  if (s.read.includes(INTRO)) {
    addNote('dead_men_client_contact',__dialogueText("managers/DeadMenCallingService.js", "t_e3683593d8ba71a5c369"),__dialogueText("managers/DeadMenCallingService.js", "t_c6f05b852c03bff491cb"),__dialogueText("managers/DeadMenCallingService.js", "t_ad3a5048cebc541efe9c"),'blue');
    completeObjectives(['read_client_email']);
  }
  const visible = [...recordings,...(s.interviewCompleted ? archive : []),...(s.accessInterviewCompleted ? accessDocuments.slice(0,1) : []),...(s.technicianCompleted ? accessDocuments.slice(1) : [])];
  for (const m of visible) if (s.read.includes(m.id)) addNote(m.id,m.subject,m.body,__dialogueText("managers/DeadMenCallingService.js", "t_fbf3a3b2d6dc65015f5f"));
  if (recordings.every(m => s.read.includes(m.id))) completeObjectives(['review_recordings']);
  if (s.interviewCompleted) {
    addNote('dead_men_client_interview',__dialogueText("managers/DeadMenCallingService.js", "t_cddac144afb4e33f97d6"),(deadMenTopicTranscript('margaret_initial') || transcript(interview)),__dialogueText("managers/DeadMenCallingService.js", "t_4e3c38678b2f03373d65"),'blue');
    addNote('dead_men_archive_lead',__dialogueText("managers/DeadMenCallingService.js", "t_558f94ceb2325e9f17c7"),__dialogueText("managers/DeadMenCallingService.js", "t_e1692ea9157212767971"),__dialogueText("managers/DeadMenCallingService.js", "t_edfd2f57a0ccaa1ce1ef"));
    completeObjectives(['contact_client']);
  }
  if (s.archiveCompared) {
    addNote('dead_men_archive_comparison',__dialogueText("managers/DeadMenCallingService.js", "t_6bf45c8c0ad8c2d9ea6d"),__dialogueText("managers/DeadMenCallingService.js", "t_a5789e7c1394aa13fd3c"),__dialogueText("managers/DeadMenCallingService.js", "t_43a6f8cd1aaab213b894"));
    addNote('dead_men_access_lead',__dialogueText("managers/DeadMenCallingService.js", "t_f7030484b69f309c6d8b"),__dialogueText("managers/DeadMenCallingService.js", "t_8083d44e2579dbe7029d"),__dialogueText("managers/DeadMenCallingService.js", "t_1b73d7bc29f0eb6944db"),'blue');
    completeObjectives(['compare_archive']);
  }
  if (s.accessInterviewCompleted) {
    addNote('dead_men_access_interview',__dialogueText("managers/DeadMenCallingService.js", "t_c8faaa00a513cc0e4339"),(deadMenTopicTranscript('margaret_access') || transcript(accessInterview)),__dialogueText("managers/DeadMenCallingService.js", "t_ab89f825bf761a296c65"),'blue');
    addNote('dead_men_mercer_contact',__dialogueText("managers/DeadMenCallingService.js", "t_8a7ff0de2b27eedb3405"),__dialogueText("managers/DeadMenCallingService.js", "t_18d39850ab375294573d"),__dialogueText("managers/DeadMenCallingService.js", "t_85ae921ea18762bcfd96"),'blue');
  }
  if (s.technicianCompleted) addNote('dead_men_technician_interview',__dialogueText("managers/DeadMenCallingService.js", "t_8568dacf255e90f8373d"),(deadMenTopicTranscript('leo_transfer') || transcript(technicianInterview)),__dialogueText("managers/DeadMenCallingService.js", "t_53b3c2a68cbbfcdecfc0"),'blue');
  if (s.accessReviewed) addNote('dead_men_access_result',__dialogueText("managers/DeadMenCallingService.js", "t_cebd2f5ed484f10f62fb"),__dialogueText("managers/DeadMenCallingService.js", "t_1678346d789e62323040"),__dialogueText("managers/DeadMenCallingService.js", "t_0c914ae923fd72cf82f6"));
}
function markRead(id) {
  if (!getDeadMenMail().some(m => m.id === id)) return;
  const s = getDeadMenProgress();
  if (!s.read.includes(id)) save({read:[...s.read,id]});
  syncDeadMenEvidence();
}
function checkAnswer(reviewId, questionId, index) {
  const spec = reviewSpec(reviewId), q = spec && currentQuestion(spec);
  if (!spec?.ready || spec.done || !q || q.id !== questionId) return {ok:false,message:__dialogueText("managers/DeadMenCallingService.js", "t_d47c34125e3369ca3f32")};
  if (!q.options[index]?.correct) return {ok:false,message:q.feedback};
  save({[spec.key]:[...getDeadMenProgress()[spec.key],q.id]});
  syncDeadMenEvidence();
  return {ok:true,message:currentQuestion(spec) ? __dialogueText("managers/DeadMenCallingService.js", "t_5016ad967c6a1a6662c0") : __dialogueText("managers/DeadMenCallingService.js", "t_fa83ffaad84134de4dcd")};
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
    originalPaged(content+__dialogueText("managers/DeadMenCallingService.js", "t_1344275fa1f473c7e1a9")+q.options[choice].label+(feedback ? '\n\n'+feedback : ''),x,y,w,Math.max(24,h-42));
    const yy=y+h-32;
    ui.drawing.button(x,yy,__dialogueText("managers/DeadMenCallingService.js", "t_e69aac4a34cce29af6bc"),() => {
      if (ui.app !== 'mail' || ui.selectedId !== id) return;
      choice=(choice+1)%q.options.length;feedback='';ui.bodyPage=0;ui.render();
    });
    ui.drawing.button(x+Math.max(150,Math.floor(w/2)),yy,__dialogueText("managers/DeadMenCallingService.js", "t_1bdb867eafc7fdd5df9b"),() => {
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
      ? {contact:MARGARET,lines:accessInterview,flag:'accessInterviewCompleted',message:__dialogueText("managers/DeadMenCallingService.js", "t_b2f40dfb3076d6f473b4")}
      : {contact:MARGARET,lines:interview,flag:'interviewCompleted',message:__dialogueText("managers/DeadMenCallingService.js", "t_fe5b32514403ba36c742")};
  }
  if (number === LEO.number && s.archiveCompared && s.accessInterviewCompleted) {
    return {contact:LEO,lines:technicianInterview,flag:'technicianCompleted',message:__dialogueText("managers/DeadMenCallingService.js", "t_cae621ee2d5047582720")};
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
    phone.cancelActivity();phone.state='ringing';phone.status=__dialogueText("managers/DeadMenCallingService.js", "t_f402468f7b8874bf7b48");phone.render();phone.startRing();
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

// OWL_AUDIO_BRIDGE_V1 — shares existing progress, validation and evidence.
export function getDeadMenAudioWorkspace() {
  const quest=getPIQuest(DEAD_MEN_QUEST);
  const available=Boolean(quest&&['active','completed'].includes(quest.status));
  const state=getDeadMenProgress();
  const spec=reviewSpec(REVIEW);
  const q=spec&&!spec.done?currentQuestion(spec):null;
  return {
    available,
    recent:available?clone(recordings):[],
    archive:available&&state.interviewCompleted?clone(archive):[],
    ready:available&&Boolean(spec?.ready),
    done:available&&Boolean(spec?.done),
    body:available?reviewBody(REVIEW):__dialogueText("managers/DeadMenCallingService.js", "t_320b71c87bf8d89f55f8"),
    question:q?{id:q.id,prompt:q.prompt,options:q.options.map(option=>({label:option.label}))}:null
  };
}
export function readDeadMenAudioSource(id) {
  const state=getDeadMenProgress();
  const sources=[...recordings,...(state.interviewCompleted?archive:[])];
  if(!sources.some(source=>source.id===id)||!getPIQuest(DEAD_MEN_QUEST))return false;
  markRead(id);
  return true;
}
export function answerDeadMenAudioComparison(questionId,index) {
  return checkAnswer(REVIEW,questionId,index);
}

// MARGARET_MAIL_EDIT_V1
