import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
const ROOT='assets/side_quests/Post/';
export const POSTAL_EVIDENCE_ART={
  envelope:{key:'post_case_envelope',url:ROOT+'return_to_sender_envelope.webp'},
  card:{key:'post_case_card',url:ROOT+'return_to_sender_forwarding_card.webp'},
  notice:{key:'post_case_notice',url:ROOT+'return_to_sender_clock_repairs_notice.webp'},
  reply:{key:'post_case_reply',url:ROOT+'return_to_sender_reply.webp'},
  reward:{key:'post_case_reward',url:ROOT+'return_to_sender_delivered_card.webp'},
  restanteEmpty:{key:'post_restante_empty',url:ROOT+'post_office_poste_restante_empty.webp'}
};
export const POSTAL_DOCUMENTS={
  envelope:{title:__dialogueText("config/postOfficeEvidenceConfig.js", "t_1ef01f113fd70b63add0"),clue:'envelope',spots:[
    {id:'name',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_366a1dfc839518c8821b"),x:1019,y:455,w:600,h:170,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_eabd4d3e344a45ee775a")},
    {id:'trail',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_c8da9f3c26a178b36a2f"),x:621,y:726,w:625,h:410,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_df99a938eefdb062595c")},
    {id:'office',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_5bb8e6df9fb1e1a20825"),x:1426,y:787,w:440,h:220,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_0ae9c363a0fb92750d6d")}
  ]},
  card:{title:__dialogueText("config/postOfficeEvidenceConfig.js", "t_fd019ac1df02cabbb3d5"),clue:'card',overlay:{x:435,y:470,w:1030,h:250,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_0edbab1b83a135be5269")},spots:[
    {id:'authorisation',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_bdc15fa655c34163fd5a"),x:960,y:570,w:1030,h:250,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_6467d068a8ae0eb3a5d2")},
    {id:'signature',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_f1a73e2204a114077f98"),x:590,y:790,w:500,h:170,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_d1f069eca2a979ea9dfc")},
    {id:'watch',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_3a37e0ddefd6a3511516"),x:1320,y:790,w:330,h:210,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_0ad2982594f26f315e0a")}
  ]},
  notice:{title:__dialogueText("config/postOfficeEvidenceConfig.js", "t_07cbd586ea006e4d68c9"),clue:'notice',spots:[
    {id:'identity',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_5945ee29b74a2b7c209f"),x:960,y:540,w:820,h:230,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_b5676baf20e8fbf290aa")},
    {id:'contact',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_e2b87d735a400cafde9d"),x:960,y:780,w:800,h:210,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_2c534ebf9be375d022f3")}
  ]},
  reply:{title:__dialogueText("config/postOfficeEvidenceConfig.js", "t_31c268674d530bf94ffb"),overlay:{x:440,y:340,w:1020,h:400,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_146b805072c57dc23ea0")},spots:[
    {id:'message',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_399ca423dda84a43253f"),x:960,y:540,w:1050,h:430,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_9cb674a9a1d4a503ad23")},
    {id:'signature',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_bdac35c57e017ffcf08e"),x:1350,y:820,w:420,h:180,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_585abab678471e9e7994")}
  ]},
  reward:{title:__dialogueText("config/postOfficeEvidenceConfig.js", "t_60b9aa17c71df6426250"),spots:[
    {id:'card',label:__dialogueText("config/postOfficeEvidenceConfig.js", "t_982e6df090ccce717f2b"),x:960,y:540,w:1150,h:620,text:__dialogueText("config/postOfficeEvidenceConfig.js", "t_12c50791a65441110365")}
  ]}
};
