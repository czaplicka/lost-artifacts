import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
const providers=new Map();
export function registerQuestHintProvider(id,provider){providers.set(id,provider);}
export function getQuestHint(id,level=0){
 const n=Number(level),safe=Number.isFinite(n)?Math.min(2,Math.max(0,Math.floor(n))):0;
 return providers.get(id)?.(gameState,safe)||null;
}
export function nextQuestHint(id){
 const before=gameState.piQuestHints||{version:1,quests:{}},initial=getQuestHint(id,0);
 if(!initial)return null;
 const previous=before.quests?.[id];
 const level=previous?.stage===initial.stage?Math.min(2,(previous.level??-1)+1):0;
 const result=getQuestHint(id,level);if(!result)return null;
 gameState.piQuestHints={version:1,quests:{...(before.quests||{}),[id]:{stage:result.stage,level}}};requestAutosave();return result;
}
registerQuestHintProvider('pi_stolen_alibi',(s,level)=>{
 const q=s.piQuests?.quests?.pi_stolen_alibi;if(!q)return null;
 const mail=s.piBorrowedAlibi||{},read=mail.read||[];
 const known=s.piKeywordSearch?.cases?.borrowed_alibi?.known||[],flags=s.piPhoneInvestigations?.cases?.borrowed_alibi?.flags||[];
 const has=id=>known.includes(id),flag=id=>flags.includes(id);
 const stage=(id,lines,context=id)=>({stage:id,level,text:lines[level],context});
 if(q.status==='completed')return stage('closed',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_8c5aa5543b2b10d11392"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_07d95c4b56b06850df2b"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_c7feceec05e7cb1ea16c")]);
 if(q.status!=='active')return null;
 if(!mail.sent)return stage('contact',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_501a4cedd24c548d2b3a"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_673fe8b4eae4bb63f685"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_892d1244a496d1d431aa")
 ]);
 if(mail.replyReceived===false)return stage('waiting',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_b70a4f98d8d1f43f299a"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fae59b6ad162881ec516"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4e87ec64d8a20b8bdb85")]);
 if(!read.includes('alibi_arthur_reply'))return stage('read_client',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_3a46d0a5034f5545400d"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_6e764cf02ae0331da108"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_dab028cad122529af566")
 ]);
 if(['alibi_forward_nora','alibi_forward_simon','alibi_forward_evelyn'].some(id=>!read.includes(id)))return stage('forwards',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_3e7ee3544fb5f9ba1f20"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_0096b6a6f39e79ed5675"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_cdf993853db32010e97a")
 ]);
 if(!read.includes('alibi_arthur_attachment'))return stage('attachment_visible_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_94bdadf7971cf9f76b8d"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4c32bad877d320670868"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_1a6b6ebe36507eb28791")
 ]);
 if(!has('tuesday_package'))return stage('collect_footer_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fa3705b0cfb8e6252586"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_20be79c185ab60cf8f3c"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_8070988ee6cfcb24edc1")
 ]);
 if(!has('alibi_club')&&!has('dinner_package')&&!has('club_phone')&&!flag('club_pitch_heard')&&!flag('club_sample_received'))return stage('search_footer_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_139c628487825397a9e0"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_17210224dc4c14458fbb"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a25ebdcc1f58a137a063")
 ]);
 if(!flag('club_sample_received')){
  if(!has('dinner_package'))return stage('discover_product_v2',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_d5e929285387c180212f"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_9522dd54da655cc329d8"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_c89def2c2d30244d5afe")]);
  if(!has('club_phone'))return stage('discover_club_contact_v2',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a08bac9a8c6d95bd9720"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_dc33a6c85c454d6792fa"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_bee7006678038c9cefee")]);
  if(!flag('club_pitch_heard'))return stage('hear_product_v2',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_f043bbef7165eba4643f"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_8551e0d0bc4dc243b02a"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_c43c3cc3113c65821ab0")]);
  if(!has('sample'))return stage('collect_sample_offer_v2',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_cea29105b896bae814f7"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_26567fbc5730aaf6ff28"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_68964decfef429eabe18")]);
  return stage('request_sample_v2',[__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_d91babf29de7def35066"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a84facaeeeef545e478b"),__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_b1bfbb2dcc4fc975df06")]);
 }
 if(!read.includes('alibi_club_sample')||!has('sample_code'))return stage('read_sample',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_9ef2d3673e492fe809e0"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_85bc5ff792b98a95811b"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_929dc993017360b76f23")
 ]);
 if(!has('arthur_finch')||!has('consent'))return stage('collect_authorisation_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_ebe21714b1956ef41391"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fc24dc5263c68df0aa22"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_b0e89c834cb394533411")
 ]);
 if(!flag('receipt_received')){
  const request=s.piAlibiReceiptRequestV2;
  if(request?.status==='pending')return stage('receipt',[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4833366af76998c05966"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_11235fdb3e78fd44293e"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_c5d3519960146701e16f")
  ],'receipt:pending');
  if(request?.status==='needs_permission')return stage('receipt',[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_65e404e1a293101eee6a"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a9d823db1710bf9752de"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_e598979f06cc4c3ada29")
  ],'receipt:needs_permission');
  if(has('copper_email'))return stage('receipt',[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_f8452bcb6e0bfa1dc875"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_808be14281c6abc4c11e"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_bf69a8656a10fcd746d2")
  ],'receipt:email_known');
  return stage('receipt',[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_5b7618b7b68fea7a35f6"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_1d7fd038002ab1441898"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_dffbf9ac68b81342190f")
  ],'receipt:contact_needed');
 }
 if(!read.includes('alibi_copper_receipt'))return stage('read_receipt',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_03dcfeda6ebf8f3c4ed4"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_40d2f35a70a39cea28e2"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_f96dd4eb0b270faa52e3")
 ]);
 if(!flag('no_hot_food'))return stage('service',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_426ea035ce2ee2c1ff86"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4546cf7192c994ea7b98"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_dd47ab6c39bcc0f7a2d7")
 ]);
 for(const [person,name,phoneKey,admission,event]of[
  ['nora',__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4cca0264ed42816c466a"),'nora_phone','nora_admitted','pie_contest'],
  ['simon',__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_95df72b5037a3593588e"),'simon_phone','simon_admitted','board_tournament'],
  ['evelyn',__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_f693eba06ad2594e170c"),'evelyn_phone','evelyn_confronted',null]
 ]){
  if(!flag(admission)){
   if(!has(phoneKey))return stage(`contact_${person}_v2`,[
    `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_2c7a641a3aceb9b0e674")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_cdb4ee2aea69cc6a8333")}`,
    `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_8348b044f81087d6cd01")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_86f6660bad14b539e8bc")}`,
    `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fc9f7623b53e9cee7974")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_ea41d14b55c9fcdc328a")}`
   ]);
   return stage(`confront_${person}`,[
    __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_4e9038e5b095549cab0e"),
    `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_40b64173ab70e4d60218")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fba891229ddddb12c865")}`,
    `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_1f7133c21072a138cf98")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_fd92c6f1b3b31d78b224")}`
   ]);
  }
  if(event&&!has(event))return stage(`collect_${person}_event_v2`,[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_249aa7728f647c3fb57e"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_1dcaf762ae8388e4900b"),
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_f93380043d7f45adc357")
  ]);
  if(event&&!has(`${person}_verified`))return stage(`verify_${person}`,[
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_b079dbed2a813a5aa3d9"),
   `${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_ce27b58c33a79cf939c6")}${name}${__dialogueText("ui/pi-computer/QuestHintSystem.js", "t_9282e41f80fec291b210")}`,
   __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a23b42086baedab9b4a9")
  ]);
 }
 if(!has('records_breakin'))return stage('find_incident_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_80c4bc4ae64f73aa67dd"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_247392e7987d93016d2e"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_d44bdbf0455b01e7a562")
 ]);
 if(!flag('evelyn_slip'))return stage('slip',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_63d97d59b79a1a7422b7"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_13d39f2917df90b97ec6"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_02aafbd8ee3f4858824a")
 ]);
 if(!flag('company_incident_verified'))return stage('company',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_b9f4a2b9e84f3cdc97cc"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_6209db7333eb9603bd5a"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_da678984d5ad68e634a1")
 ]);
 if(!has('blue_folder'))return stage('collect_slip_v2',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_d1b01c8e93560411be5b"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_a22ae15dd80d3cecc864"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_7a259e9f63ed4f5540e6")
 ]);
 if(!flag('folder_detail_verified'))return stage('folder',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_8ff52c842787c1049353"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_12a2328d21a0b51fe23f"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_345e988db4a3c5d555e9")
 ]);
 return stage('report',[
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_7745cda9980fbf06deef"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_04814d665ba994a18e2d"),
  __dialogueText("ui/pi-computer/QuestHintSystem.js", "t_104746609913735eb47f")
 ]);
});
