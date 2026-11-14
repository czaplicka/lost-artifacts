import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { thiefdokuService } from '../../systems/thiefdoku/ThiefdokuService.js';
export const CONTACTS=[
 {id:'commandant',name:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_2ebf7ac7d136abe1c153"),role:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_0d188313335da9e024d0"),initials:'CC',intro:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_d1a944e6bf75a0de1368")},
 {id:'secretary',name:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c27a23949db90ca713a9"),role:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c61ebbd45f999acc7bc2"),initials:'MF',intro:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_1c9897976c5448b854e0")},
 {id:'curator',name:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ca3dc6c894cfef756aea"),role:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_df1ecc8e96fbe33c6d4c"),initials:'EH',intro:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_41da5c51ef01b271ca64")},
 {id:'guard',name:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_d10c0b3dc28c4c7edae8"),role:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_755c7f36b06987837546"),initials:'AB',intro:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_65c14ad3d5b53afc1ecf")},
 {id:'informant',name:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_635fa36ce57160805157"),role:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_017191377c91528552d6"),initials:'??',intro:__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_b5af37d05487e3d26193")}
];
export const PROPOSAL=__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ad19fd9e13d97baddb97")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_03efde58462c05c301b9")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_8b5f5459c75445e8bca1")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_cc3dae6018cf7f641e2a");
export const NORMAL_REPLIES=[[__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_62051ad5594a82661dd6"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_dc29a3269c7489bf8119")],[__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_9e126353c939b0324cf5"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_072e1aa38f6bab2a8eee")],[__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_7487cd98f9b7a1db3ece"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_f5c14616031f2ec22944")],[__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c4dc542b511fd74f4016"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_868df35680e0712eed51")]];
export function normalise(value){return String(value||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
export function chiefReply(message){
 const q=normalise(message);
 if(/name appears to be classified|redacted|black bar/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_043c75b6dc028f78cd52");
 if(/not interested|no thanks|decline|refuse|maybe later/.test(q)||q===__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_9390298f3fb0c5b16049"))return thiefdokuService.isInstalled()
 ?__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_a769398cb866a2711b16")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_e1de4a60dfc75f89bd12")
 :__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_65253d48894b099f6bda")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_a11346f97fb5317f0163");
 if(/\baccept\b|\binstall\b|sign me up|i am in|im in/.test(q)||[__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_8a798890fe93817163b1"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_2689367b205c16ce32ed"),__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_6a581ee901185606598b"),'deal'].includes(q)){
  if(!thiefdokuService.install())return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_9f1fc751294e21de4fd1")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_5c2ca30d31b27c8d4678");
  return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_aed307a21ada2106782f")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_5649988f10c0d2b3aa21")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_dc4459fd129e180e5a5c")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c8679abe498aa476cd89")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_089a06fa0b66df5e317d");
 }
 if(/how does|how it|what exactly|what do i solve|rules/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_263c3f27ddfeb9bb6d63")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_8c3e92f49a1555d6799b")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_bd3877a67036f10f1d84")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_cb5c972bd9d023ce8433");
 if(/new case|today|next case|delivery/.test(q)){
  if(!thiefdokuService.isInstalled())return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_54f38ba3cbebf1a4f9e4")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_e15bed8e178a5e3aa590");
  return thiefdokuService.canIssueCase()?__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_f3e7419ea668f3437546")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_f13dc27d99ff5597559d")
  :__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_09ce040a2c6cf590675b")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_157cc88d708b33380821")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_98abd61ca36987219984");
 }
 if(/medal|reward|currency|payment/.test(q))return `${__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_03163e30e05240f711fc")}${thiefdokuService.getMedals()}${__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_d6bd5636ffce565f0c26")}`+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ab8d997df5c85d16dfaa")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_acf17970171a6127e73d");
 if(/who are you|real name|your name|really/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_4a5ae57f7171053e210f")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_1de1414e6751a2b80480");
 if(/thank/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_3ae6a6b27544e8d0b0eb");
 return thiefdokuService.isInstalled()?__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_19765cfd6977f01ef625"):__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_4be5011693e9f5d19deb")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c4f143e9514b59a96436");
}
export function normalReply(contact,message,conversation){
 const q=normalise(message);
 if(/\b(hello|hi|hey|good morning)\b/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c6ec396dfa4f318ea2fd");
 if(/where|alibi|last night|that night|yesterday/.test(q)){
  if(conversation.asked.includes('alibi'))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_dcf7d020b751f920caf7")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_fea3f023b5a3d6bbf991");
  if(contact.id==='guard')return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ddf4d26cf0d34ac83e09")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_f3e2e27ee4104930039d");
  if(contact.id==='curator')return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_bb689d7445d23ed525c9")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_7e84c4d9858c9ddbb866");
  return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_d13a98b3382d048c120d")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_b15fc9697433dc8ccf6e");
 }
 if(/artefact|artifact|relic|stolen/.test(q))return contact.id==='curator'?__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_e67a645080bc4eedea34")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_a243382b22b8df2f8fb6"):__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_6bc8d7d34caaf11f94d1")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ed278891cf021b62b493");
 if(/museum|crime scene|gallery/.test(q))return ['guard','curator'].includes(contact.id)?__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_74400eaed173d9bff3a2")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_348ed50cba7d8b887a33"):__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_f153b386d1a237dd73b3");
 if(/who|suspect|person|talk to/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_af867a007e73e66102ab")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_38f1878642fdfd19b631");
 if(/happened|tell me|explain|case/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_fa2e5b5c395368d5ae47")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_ebee195f99ae8fa95cb8");
 if(/thank/.test(q))return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_82c1089a498103643a55")+__dialogueText("ui/pi-computer/ComputerChatContent.js", "t_9c156b9b5a106f41189b");
 return __dialogueText("ui/pi-computer/ComputerChatContent.js", "t_c1fcc5465720b08c8411");
}
